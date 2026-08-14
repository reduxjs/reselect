/**
 * Per-call cost of `createSelector`, measured against a baseline git ref in the
 * same process. Run with `yarn bench:hot-path`.
 *
 * A regression harness, not a comparison suite — `test/benchmarks/*` already
 * compares memoizers through tinybench, which is the right tool for "which of
 * these is faster" and the wrong one for "did this commit cost 6%". Resolving
 * single-digit percentages on a few-hundred-nanosecond call needs:
 *
 *   - both variants in one process, measured back to back. Comparing across
 *     processes credited a 10% swing to a commit that had not touched the code.
 *   - rounds interleaved across cases, so a machine that slows down partway
 *     through slows every case rather than one.
 *   - each case's round scaled to a comparable wall time (see `calibrate`).
 *     Measured noise tracked round *duration* and nothing else: at a fixed tick
 *     count the cheap cases ran 25 ms rounds and reported +-4-9% on identical
 *     code, while the parametric cases ran 500 ms rounds and reported +-1-2%.
 *   - each pair measured in both orders, so whatever penalty second place
 *     carries is not always paid by the same variant.
 *   - the minimum of many rounds, not the mean, gated against a measured noise
 *     floor (see `measureAll`).
 *   - the whole measurement repeated in fresh processes (see `--repeat`). A
 *     process can settle into a different JIT regime for one of the two bundles
 *     and stay there: one real run reported a change at 1.62x, four times its
 *     true size, and no statistic computed inside that process could tell,
 *     because every round in it agreed. Only another process disagrees.
 *   - a fixed script of ticks, so recomputation counts are reproducible and a
 *     variant that silently skips work cannot read as a win.
 *
 * No allocation column: a `heapUsed` delta reports what the collector had not
 * got round to freeing, and on a change that removed two allocations per call it
 * can go *up*. Allocation is paid in the time column instead, which is where a
 * caller feels it too.
 *
 * Usage:
 *   node --expose-gc bench/run.mjs [--repeat=N] [--rounds=N] [--target-ms=N]
 *                                  [--filter=<substring>]
 */
import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { cases } from './cases.mjs'
import {
  applyTick,
  config,
  createInitialState,
  createProps
} from './workload.mjs'

const meta = JSON.parse(
  readFileSync(new URL('./.build/meta.json', import.meta.url), 'utf8')
)

const flag = (name, fallback) => {
  const found = process.argv.find(arg => arg.startsWith(`--${name}=`))
  return found === undefined ? fallback : found.slice(name.length + 3)
}
const numericFlag = (name, fallback) => Number(flag(name, fallback))

/**
 * Fresh processes, not more rounds in this one. Rounds inside a process share its
 * JIT state, so they agree with each other whether or not they are right.
 */
const REPEAT = numericFlag('repeat', 3)
/** Enough rounds that the minimum is a settled floor rather than the luckiest of a handful. */
const ROUNDS = numericFlag('rounds', 10)
const WARMUP_ROUNDS = 2
/**
 * Each round is scaled to land near this. Above roughly 200 ms a round absorbs a
 * scheduler quantum (~15 ms on Windows) without much trace; at 25 ms it cannot,
 * which is the whole reason the cheap cases used to be unmeasurable.
 */
const TARGET_ROUND_MS = numericFlag('target-ms', 300)
const FILTER = flag('filter', '')
/**
 * Diagnostics. `--ticks=N` fixes the tick count for every case and skips
 * calibration; `--alternate=0` runs every round in one order. Both exist because
 * an A/A check — the same commit on both sides — is the only way to tell a
 * harness bug from a result, and when one shows up these are how you find which
 * part of the harness caused it.
 */
const FIXED_TICKS = Number(flag('ticks', 0))
const ALTERNATE = flag('alternate', '1') !== '0'
const DUMP_ROUNDS = process.argv.includes('--dump-rounds')

/** A difference below this is reported as noise even if the spreads are tight. */
const NOISE_FLOOR = 0.02
/** Runs whose reported changes differ by more than this are not one measurement. */
const RUN_DISAGREEMENT = 0.05

const CALIBRATION_TICKS = 100
const MIN_TICKS = 20
const MAX_TICKS = 500_000

/**
 * Which cases get reported. Every case still *runs* every round — see
 * `KEEPALIVE_TICKS`.
 *
 * The floors are always reported: they are the controls, and a run without them
 * has nothing to compare its own noise against.
 */
const isSelected = descriptor =>
  !FILTER || descriptor.isControl || descriptor.name.includes(FILTER)

const selected = cases.filter(isSelected)

/**
 * Cases that are not being reported still run, at a token tick count, because
 * the number of distinct cases sharing the timed loop changes what the timed loop
 * costs.
 *
 * `runRound` calls `instance.run(state, props[call])`, and `run` is a different
 * closure for every case. With a dozen of them that call site is megamorphic and
 * no case gets inlined. Narrow the set to a single shape — two closures — and V8
 * inlines one of them into the loop and leaves the other to a polymorphic stub.
 * Filtering to one shape therefore reported the same commit as 1.40x faster than
 * itself, consistently, with a 3% spread, on byte-identical bundles: whichever
 * variant lost the inlining ran 40% slower. The full set reported the same pair
 * at -0.9%.
 *
 * Twenty ticks is plenty. What matters is that the call site keeps seeing every
 * case, not how long it spends in any of them.
 *
 * This makes a filtered run's *comparison* trustworthy, not its absolute ns/call.
 * A filtered run still allocates far less overall, so the reported case runs
 * against a quieter heap: `1 input, (state, props)` reads about 225 ns filtered
 * and about 330 ns unfiltered. Both variants shift together, so the pair is still
 * a fair comparison, but do not quote a filtered ns/call next to an unfiltered
 * one.
 */
const KEEPALIVE_TICKS = 20

function collectGarbage() {
  if (typeof globalThis.gc === 'function') {
    // Twice: the first pass can resurrect objects held by finalizers, and the
    // second gives a settled floor to measure from.
    globalThis.gc()
    globalThis.gc()
    return true
  }
  return false
}

/** One round: build a fresh case, replay the script, return time and recomputations. */
function runRound(descriptor, props, ticks) {
  const instance = descriptor.instantiate()
  let state = createInitialState()

  // Prime the cache so the round measures steady state rather than N misses.
  for (let call = 0; call < config.callsPerTick; call += 1) {
    instance.run(state, props[call])
  }

  collectGarbage()

  // The clock covers the whole loop, `applyTick` included. Excluding it looks
  // right — it costs about as much per tick as the calls that follow, so it
  // halves every difference reported here — but it reported one case 22% *slower*
  // that the same code had just measured 5% faster. Collection pauses land
  // wherever the allocation threshold is crossed, so stopping the clock lets
  // whichever variant allocates more pay for its garbage off the clock. Timing
  // everything charges each variant for the collections it caused, and merely
  // dilutes differences rather than inventing them.
  //
  // The micro cases have no state to produce and allocate nothing per call, so
  // neither half of that argument applies to them and their loop is bare.
  const startedAt = performance.now()

  if (descriptor.kind === 'micro') {
    for (let tick = 0; tick < ticks; tick += 1) {
      for (let call = 0; call < config.callsPerTick; call += 1) {
        instance.run(state, props[call])
      }
    }
  } else {
    for (let tick = 0; tick < ticks; tick += 1) {
      state = applyTick(state, tick)

      for (let call = 0; call < config.callsPerTick; call += 1) {
        instance.run(state, props[call])
      }
    }
  }

  const elapsed = performance.now() - startedAt

  return { elapsed, recomputations: instance.recomputations() }
}

const clamp = value => Math.min(MAX_TICKS, Math.max(MIN_TICKS, value))

/**
 * Picks a tick count per case so every round takes about `TARGET_ROUND_MS`.
 *
 * A single global tick count cannot work: the cases here span 25 ns to 700 ns per
 * call, so the same count produces rounds 30x apart in duration, and the short
 * ones are dominated by whatever else the machine did during them.
 *
 * Two stages, because a first estimate taken from a cold case is wrong by roughly
 * the factor the optimising compiler is about to win: the pilot rounds run
 * unoptimised, so scaling straight off them under-counts by 5-10x. The second
 * stage re-scales from a round at the estimated count, by which point the case is
 * warm.
 *
 * Calibrated per case *name*, and both variants of a shape get the baseline's
 * count, so a pair always does identical work.
 *
 * Every case is calibrated, including the variants whose result is discarded.
 * Calibrating only one of a pair is not a saving, it is a bias: the calibrated
 * variant reaches the measured rounds having run five rounds the other has not,
 * and it measured 30-40% SLOWER for it, with a half-percent spread, on bundles
 * that were byte-identical. Whichever variant was listed first took the penalty,
 * which is how it was caught. Doing the work for both sides costs a few seconds
 * and removes the effect.
 */
function calibrate(props) {
  const measured = new Map()

  if (FIXED_TICKS > 0) {
    return new Map(cases.map(({ name }) => [name, FIXED_TICKS]))
  }

  for (const descriptor of cases) {
    if (!isSelected(descriptor)) {
      measured.set(descriptor, KEEPALIVE_TICKS)
      continue
    }

    let pilot = Infinity
    // The first two are thrown away; they are what teaches the optimiser.
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const { elapsed } = runRound(descriptor, props, CALIBRATION_TICKS)
      if (attempt >= 2) pilot = Math.min(pilot, elapsed)
    }

    const estimate = clamp(
      Math.round(CALIBRATION_TICKS * (TARGET_ROUND_MS / Math.max(pilot, 0.01)))
    )
    const { elapsed } = runRound(descriptor, props, estimate)

    measured.set(
      descriptor,
      clamp(Math.round(estimate * (TARGET_ROUND_MS / Math.max(elapsed, 0.01))))
    )
  }

  // One count per name, taken from the baseline variant. Letting each variant use
  // its own would hand a faster variant a shorter round and compare the two
  // minima as though they had done the same work.
  const ticksByName = new Map()

  for (const descriptor of cases) {
    if (descriptor.variant === 'current' && ticksByName.has(descriptor.name)) {
      continue
    }

    ticksByName.set(descriptor.name, measured.get(descriptor))
  }

  return ticksByName
}

/**
 * Round order. Cases are shape-major, so a shape's two variants sit on adjacent
 * indices; every other round runs each such group backwards. Whatever the second
 * position in a group costs — a colder cache, a collection triggered by the case
 * before it — both variants then pay it half the time instead of one paying it
 * always.
 */
function roundOrder(round) {
  const groups = new Map()

  for (let index = 0; index < cases.length; index += 1) {
    const { name } = cases[index]
    if (!groups.has(name)) groups.set(name, [])
    groups.get(name).push(index)
  }

  return [...groups.values()].flatMap(indices =>
    !ALTERNATE || round % 2 === 0 ? indices : [...indices].reverse()
  )
}

const median = values => {
  const sorted = [...values].sort((a, b) => a - b)
  const middle = sorted.length >> 1
  return sorted.length % 2 === 1
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2
}

function measureAll(props, ticksByName) {
  const samples = cases.map(() => [])
  const recomputations = cases.map(() => 0)

  for (let round = 0; round < WARMUP_ROUNDS + ROUNDS; round += 1) {
    for (const index of roundOrder(round)) {
      const descriptor = cases[index]
      const { elapsed, recomputations: count } = runRound(
        descriptor,
        props,
        ticksByName.get(descriptor.name)
      )

      if (round >= WARMUP_ROUNDS) {
        samples[index].push(elapsed)
        recomputations[index] = count
      }
    }
  }

  const results = cases.map((descriptor, index) => {
    const rounds = samples[index]
    const ticks = ticksByName.get(descriptor.name)
    const min = Math.min(...rounds)

    // How reproducible is the minimum itself? The spread across all rounds is the
    // wrong gate for a min-of-N statistic — it is set by the slowest round, the
    // very sample the minimum exists to discard, and at 15 rounds it read 8-27%
    // here, burying every difference worth reporting. Splitting the rounds into
    // two halves and taking the gap between their minima measures how much this
    // case's minimum moves for reasons unrelated to the code.
    const halfA = rounds.filter((_, position) => position % 2 === 0)
    const halfB = rounds.filter((_, position) => position % 2 === 1)

    if (DUMP_ROUNDS) {
      console.error(
        `${descriptor.name} [${descriptor.variant || 'floor'}] ` +
          rounds.map(value => value.toFixed(1)).join(' ')
      )
    }

    return {
      name: descriptor.name,
      kind: descriptor.kind,
      variant: descriptor.variant,
      isControl: Boolean(descriptor.isControl),
      ticks,
      minMs: min,
      medianMs: median(rounds),
      minNoise: Math.abs(Math.min(...halfA) - Math.min(...halfB)) / min,
      nsPerCall: (min * 1e6) / (ticks * config.callsPerTick),
      recomputations: recomputations[index],
      expected: descriptor.expected(ticks, config)
    }
  })

  return results.filter((_, index) => isSelected(cases[index]))
}

const pad = (value, width) => String(value).padStart(width)
const padRight = (value, width) => String(value).padEnd(width)
const percent = (value, width = 6) => pad((value * 100).toFixed(1) + '%', width)

const pairOf = (results, result) =>
  result.variant === 'current'
    ? results.find(
        other => other.name === result.name && other.variant === 'base'
      )
    : undefined

/* ---------------------------------------------------------------- child mode */

function measureOnce() {
  const exposedGc = collectGarbage()
  const props = createProps()

  if (!exposedGc) {
    console.error(
      'WARNING: run with --expose-gc, rounds start from an uncontrolled heap'
    )
  }

  if (FILTER) {
    console.error(
      `filter ${JSON.stringify(FILTER)}: reporting ${selected.length} of ` +
        `${cases.length} cases; the rest still run at ${KEEPALIVE_TICKS} ticks`
    )
  }

  const ticksByName = calibrate(props)
  const results = measureAll(props, ticksByName)

  console.error('')
  console.error(
    `${padRight('case', 40)} ${padRight('variant', 8)} ${pad('ticks', 7)} ` +
      `${pad('min ms', 8)} ${pad('ns/call', 8)} ${pad('min +-', 7)}   change`
  )

  for (const result of results) {
    const baseline = pairOf(results, result)
    const change = baseline
      ? (result.minMs - baseline.minMs) / baseline.minMs
      : undefined

    console.error(
      `${padRight(result.name, 40)} ${padRight(result.variant, 8)} ` +
        `${pad(result.ticks, 7)} ${pad(result.minMs.toFixed(1), 8)} ` +
        `${pad(result.nsPerCall.toFixed(1), 8)} ${percent(
          result.minNoise,
          7
        )}   ` +
        (change === undefined ? '' : percent(change)) +
        (result.recomputations === result.expected
          ? ''
          : `  RECOMPUTES ${result.recomputations.toLocaleString('en-US')}` +
            ` != ${result.expected.toLocaleString('en-US')}`)
    )
  }

  process.stdout.write(`\n__BENCH_JSON__${JSON.stringify(results)}\n`)
}

/* --------------------------------------------------------------- parent mode */

function spawnChildren() {
  const self = fileURLToPath(import.meta.url)
  const passthrough = process.argv
    .slice(2)
    .filter(arg => !arg.startsWith('--repeat='))
  const runs = []

  for (let index = 0; index < REPEAT; index += 1) {
    console.log(`\n=== run ${index + 1} of ${REPEAT} ===`)

    const child = spawnSync(
      process.execPath,
      [...process.execArgv, self, '--child', ...passthrough],
      { encoding: 'utf8', stdio: ['inherit', 'pipe', 'inherit'] }
    )

    if (child.status !== 0) {
      console.error(`run ${index + 1} exited with status ${child.status}`)
      process.exitCode = 1
      return runs
    }

    const marker = child.stdout.indexOf('__BENCH_JSON__')

    if (marker === -1) {
      console.error(`run ${index + 1} produced no results`)
      process.exitCode = 1
      return runs
    }

    runs.push(JSON.parse(child.stdout.slice(marker + '__BENCH_JSON__'.length)))
  }

  return runs
}

/**
 * A change is a result only if every run agrees on its direction and every run
 * puts it clear of that run's own noise floor. That is the rule the three-run
 * manual procedure applied by hand, and it is the only thing that caught the run
 * whose JIT regime differed: within that run the change was consistent across all
 * rounds and four times its true size.
 */
function verdict(changes, thresholds) {
  const significant = changes.map(
    (change, index) => Math.abs(change) > thresholds[index]
  )
  const positive = changes.filter(change => change > 0).length
  const sameSign = positive === 0 || positive === changes.length
  const spread = Math.max(...changes) - Math.min(...changes)

  if (!sameSign) return 'no result (runs disagree on direction)'
  if (!significant.every(Boolean)) {
    return significant.some(Boolean)
      ? 'unconfirmed (not clear of noise in every run)'
      : 'within noise'
  }

  const mean =
    changes.reduce((total, change) => total + change, 0) / changes.length
  const faster = mean < 0
  const ratio = faster ? 1 / (1 + mean) : 1 + mean

  return (
    `${ratio.toFixed(2)}x ${faster ? 'faster' : 'SLOWER'}` +
    (spread > RUN_DISAGREEMENT
      ? `  (runs spread ${(spread * 100).toFixed(
          1
        )} points — treat as approximate)`
      : '')
  )
}

function report(runs) {
  const [first] = runs

  console.log(
    `\nbaseline: ${meta.baselineRef} (${meta.baselineSha})   ` +
      `NODE_ENV: ${meta.nodeEnv}   ` +
      `${meta.minified ? 'minified' : 'not minified'}` +
      (meta.nodeEnv === 'production'
        ? ''
        : '   <- dev-mode checks are in the hot path')
  )
  console.log(
    `${config.callsPerTick.toLocaleString('en-US')} calls per tick, ` +
      `${config.changedPerTick} of ${config.entities} entities change per tick, ` +
      `ticks per case calibrated to ~${TARGET_ROUND_MS} ms per round, ` +
      `min of ${ROUNDS} rounds, ${runs.length} independent runs`
  )

  console.log('')
  console.log(
    `${padRight('case', 40)} ${pad('base ns', 8)} ${pad('curr ns', 8)}   ` +
      `${padRight('per-run change', 8 * runs.length)}  verdict`
  )

  for (const result of first) {
    if (result.variant !== 'current' || result.isControl) continue

    const changes = []
    const thresholds = []

    for (const run of runs) {
      const currentResult = run.find(
        other => other.name === result.name && other.variant === 'current'
      )
      const baseResult = run.find(
        other => other.name === result.name && other.variant === 'base'
      )

      changes.push((currentResult.minMs - baseResult.minMs) / baseResult.minMs)
      thresholds.push(
        Math.max(currentResult.minNoise + baseResult.minNoise, NOISE_FLOOR)
      )
    }

    const baseline = pairOf(first, result)

    console.log(
      `${padRight(result.name, 40)} ${pad(baseline.nsPerCall.toFixed(1), 8)} ` +
        `${pad(result.nsPerCall.toFixed(1), 8)}   ` +
        `${padRight(
          changes.map(change => percent(change, 7)).join(''),
          8 * runs.length
        )}  ` +
        verdict(changes, thresholds)
    )
  }

  reportControls(runs)
  reportRecomputations(runs)
}

/**
 * The floors contain no `reselect` code, so nothing under test can move them. How
 * much they moved between runs is therefore this machine's contribution, measured
 * rather than assumed, and it is the number to compare any claim above against.
 */
function reportControls(runs) {
  const floors = runs[0].filter(
    result => result.isControl && result.variant === 'current'
  )

  const measured = floors.map(floor => {
    const changes = runs.map(run => {
      const current = run.find(
        other => other.name === floor.name && other.variant === 'current'
      )
      const base = run.find(
        other => other.name === floor.name && other.variant === 'base'
      )
      return (current.minMs - base.minMs) / base.minMs
    })

    const drift = runs.map(
      run =>
        run.find(other => other.name === floor.name && other.variant === 'base')
          .nsPerCall
    )

    return {
      name: floor.name,
      changes,
      worst: Math.max(...changes.map(Math.abs)),
      drift: (Math.max(...drift) - Math.min(...drift)) / Math.min(...drift)
    }
  })

  const falsePositives = measured.filter(entry => entry.worst > NOISE_FLOOR)
  const worst = Math.max(...measured.map(entry => entry.worst))
  const worstDrift = Math.max(...measured.map(entry => entry.drift))

  console.log(
    '\nControls (the same hand-written function compared against itself, ' +
      'so every one of these is zero in principle):'
  )

  for (const entry of measured) {
    console.log(
      `  ${padRight(entry.name, 40)} ` +
        entry.changes.map(change => percent(change)).join(' ')
    )
  }

  console.log(
    `  Worst control reading ${(worst * 100).toFixed(1)}%. ` +
      'A paired claim near or below that size is the harness, not the code.'
  )

  console.log(
    `  Between-run drift of the same control was ${(worstDrift * 100).toFixed(
      1
    )}%, which is what pairing inside one run exists to cancel.`
  )

  if (falsePositives.length > 0) {
    console.log(
      `  WARNING: ${falsePositives.length} control(s) read above the ` +
        `${(NOISE_FLOOR * 100).toFixed(
          0
        )}% floor. This run found a difference ` +
        'between identical code, so treat every result above as unproven.'
    )
  }
}

/**
 * Recomputation counts, checked per case against what its script must produce.
 * Same work, or the times do not compare — a variant that skipped a recomputation
 * would otherwise read as the fastest thing here.
 */
function reportRecomputations(runs) {
  const wrong = runs.flatMap((run, index) =>
    run
      .filter(result => result.recomputations !== result.expected)
      .map(result => ({ run: index + 1, ...result }))
  )

  if (wrong.length === 0) {
    console.log(
      '\nRecomputations are as expected for every case in every run, ' +
        'so the times compare.'
    )
    return
  }

  console.log('')
  for (const result of wrong) {
    console.log(
      `WARNING: run ${result.run}, ${result.name.trim()} (${
        result.variant || 'floor'
      }) recomputed ${result.recomputations.toLocaleString('en-US')} times, ` +
        `expected ${result.expected.toLocaleString('en-US')} — ` +
        `its time is not comparable`
    )
  }
  process.exitCode = 1
}

if (process.argv.includes('--child')) {
  measureOnce()
} else {
  const runs = spawnChildren()
  if (runs.length === REPEAT) report(runs)
}
