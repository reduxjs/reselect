/**
 * Bundles two copies of `src` for the benchmark: the working tree, and a git ref
 * to compare it against. Both load into the same process, so each case meets its
 * baseline under the same JIT state, heap, and CPU conditions — measuring them in
 * separate processes credited a 10% swing to a commit that had not touched the
 * code, caught only because the untouched floor case moved by the same amount.
 *
 * The baseline comes from a detached worktree rather than a stash, so an
 * interrupted run cannot leave the working tree modified. `src` imports nothing
 * outside itself, so that worktree needs no install.
 *
 * `NODE_ENV` is substituted at build time: the dev-mode checks sit in the hot
 * path, and leaving them in would price a branch no shipped call takes.
 *
 * Usage:
 *   node bench/build.mjs [--baseline=<ref>] [--dev] [--no-minify]
 */
import { execFileSync } from 'node:child_process'
import { existsSync, rmSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { rolldown } from 'rolldown'

// `fileURLToPath`, not `URL#pathname` — the latter is not a valid filesystem path
// on every platform.
const resolve = specifier => fileURLToPath(new URL(specifier, import.meta.url))

const BASELINE_REF =
  process.argv.find(arg => arg.startsWith('--baseline='))?.slice(11) ?? 'HEAD'

// `--dev` keeps the dev-mode checks in. They sit inside the hot path, so what
// they cost per call once they have stopped reporting anything is worth knowing
// on its own — a production build compiles them out and cannot show it.
const NODE_ENV = process.argv.includes('--dev') ? 'development' : 'production'

// Minified by default, because that is the shape the published production builds
// ship in and an unminified bundle is measurably not the same program: with
// esbuild, substituting `NODE_ENV` folded the dev-mode guard to `if (false)` but
// left the whole block in the bundle text, keeping every function it referenced
// alive. Turn it off with `--no-minify` when profiling, where the function names
// are the point.
const MINIFY = !process.argv.includes('--no-minify')

const BUILD_DIR = resolve('./.build')
const BASE_WORKTREE = resolve('./.build/base')

const git = (...args) =>
  execFileSync('git', args, { cwd: resolve('..'), encoding: 'utf8' }).trim()

async function bundle(entry, outfile) {
  const built = await rolldown({
    input: entry,
    platform: 'node',
    // `transform.define`, not a top-level `define` — rolldown accepts the latter
    // silently as an unknown key and substitutes nothing, which produces a
    // bundle that still branches on `process.env.NODE_ENV` at run time.
    transform: { define: { 'process.env.NODE_ENV': JSON.stringify(NODE_ENV) } }
  })

  await built.write({
    file: outfile,
    format: 'esm',
    minify: MINIFY,
    // Cheap, and `--enable-source-maps` needs it to report a useful stack out of
    // a minified bundle.
    sourcemap: true
  })

  await built.close()
}

function prepareBaselineWorktree() {
  if (existsSync(BASE_WORKTREE)) {
    // `git worktree remove` refuses if the previous run left it dirty, and a
    // stale baseline is worse than a slow rebuild.
    try {
      git('worktree', 'remove', '--force', BASE_WORKTREE)
    } catch {
      rmSync(BASE_WORKTREE, { recursive: true, force: true })
      git('worktree', 'prune')
    }
  }

  git('worktree', 'add', '--detach', '--quiet', BASE_WORKTREE, BASELINE_REF)
}

prepareBaselineWorktree()

const baselineSha = git('rev-parse', '--short', BASELINE_REF)

// Sequential, not concurrent: rolldown does its work on a native thread pool, so
// running both at once gains little, and a shared pool made the failure output of
// whichever bundle broke impossible to attribute.
await bundle(resolve('../src/index.ts'), `${BUILD_DIR}/reselect.mjs`)
await bundle(`${BASE_WORKTREE}/src/index.ts`, `${BUILD_DIR}/reselect-base.mjs`)

// The worktree is only needed until rolldown has read it.
git('worktree', 'remove', '--force', BASE_WORKTREE)

// Recorded so the run reports what it measured. A dev-mode run otherwise looks
// exactly like a production one in the output, and the two are not comparable.
writeFileSync(
  `${BUILD_DIR}/meta.json`,
  JSON.stringify({
    nodeEnv: NODE_ENV,
    minified: MINIFY,
    baselineRef: BASELINE_REF,
    baselineSha
  })
)
