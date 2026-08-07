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
 *   - the minimum of many rounds, not the mean, gated against a measured noise
 *     floor (see `measureAll`).
 *   - a fixed script of ticks, so recomputation counts are reproducible and a
 *     variant that silently skips work cannot read as a win.
 *
 * No allocation column: a `heapUsed` delta reports what the collector had not
 * got round to freeing, and on a change that removed two allocations per call it
 * can go *up*. Allocation is paid in the time column instead, which is where a
 * caller feels it too.
 */
import { readFileSync } from 'node:fs'
import { cases, perEntityCases } from './cases.mjs'
import {
  applyTick,
  config,
  createInitialState,
  createProps
} from './workload.mjs'

const meta = JSON.parse(
  readFileSync(new URL('./.build/meta.json', import.meta.url), 'utf8')
)

// Enough ticks that the cheapest case still takes tens of milliseconds per
// round. At 200 the slice cases landed at 1.9 ms with a 63% spread between
// rounds, which cannot resolve the differences this harness exists to measure.
const TICKS = 1000
// Enough rounds that the minimum is a settled floor rather than the luckiest of
// a handful. At 7 the per-round spread sat at 9-17%, which swallowed every
// difference worth reporting.
const ROUNDS = 15
const WARMUP_ROUNDS = 2

const CALLS_PER_ROUND = TICKS * config.callsPerTick

/** A difference below this is reported as noise even if the spreads are tight. */
const NOISE_FLOOR = 0.02

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
function runRound(createCase, props) {
  const instance = createCase()
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
  const startedAt = performance.now()

  for (let tick = 0; tick < TICKS; tick += 1) {
    state = applyTick(state, tick)

    for (let call = 0; call < config.callsPerTick; call += 1) {
      instance.run(state, props[call])
    }
  }

  const elapsed = performance.now() - startedAt

  return { elapsed, recomputations: instance.recomputations() }
}

function measureAll(props) {
  const samples = cases.map(() => [])
  let recomputations = cases.map(() => 0)

  for (let round = 0; round < WARMUP_ROUNDS + ROUNDS; round += 1) {
    for (let i = 0; i < cases.length; i += 1) {
      const { elapsed, recomputations: count } = runRound(cases[i], props)

      if (round >= WARMUP_ROUNDS) {
        samples[i].push(elapsed)
        recomputations[i] = count
      }
    }
  }

  return cases.map((createCase, i) => {
    const rounds = samples[i]
    const min = Math.min(...rounds)
    const identity = createCase()

    // How reproducible is the minimum itself? The spread across all rounds is the
    // wrong gate for a min-of-N statistic — it is set by the slowest round, the
    // very sample the minimum exists to discard, and at 15 rounds it read 8-27%
    // here, burying every difference worth reporting. Splitting the rounds into
    // two halves and taking the gap between their minima measures how much this
    // case's minimum moves for reasons unrelated to the code.
    const halfA = rounds.filter((_, index) => index % 2 === 0)
    const halfB = rounds.filter((_, index) => index % 2 === 1)
    const minNoise = Math.abs(Math.min(...halfA) - Math.min(...halfB)) / min

    return {
      name: identity.name,
      variant: identity.variant,
      minMs: min,
      minNoise,
      nsPerCall: (min * 1e6) / CALLS_PER_ROUND,
      recomputations: recomputations[i]
    }
  })
}

const pad = (value, width) => String(value).padStart(width)
const padRight = (value, width) => String(value).padEnd(width)

function formatDelta(current, baseline) {
  const change = (current.minMs - baseline.minMs) / baseline.minMs
  // Both minima wobble, so the difference has to clear both wobbles combined.
  const threshold = Math.max(current.minNoise + baseline.minNoise, NOISE_FLOOR)

  if (Math.abs(change) <= threshold) {
    return `${pad((change * 100).toFixed(1) + '%', 7)}  within noise (+-${(
      threshold * 100
    ).toFixed(1)}%)`
  }

  const faster = change < 0
  const ratio = faster
    ? baseline.minMs / current.minMs
    : current.minMs / baseline.minMs

  return (
    `${pad((change * 100).toFixed(1) + '%', 7)}  ` +
    `${ratio.toFixed(2)}x ${faster ? 'faster' : 'SLOWER'}`
  )
}

function main() {
  const exposedGc = collectGarbage()
  const props = createProps()

  console.log(
    `\nbaseline: ${meta.baselineRef} (${meta.baselineSha})   ` +
      `NODE_ENV: ${meta.nodeEnv}` +
      (meta.nodeEnv === 'production'
        ? ''
        : '   <- dev-mode checks are in the hot path')
  )

  console.log(
    `\ncreateSelector hot path — ${config.callsPerTick.toLocaleString(
      'en-US'
    )} calls x ` +
      `${TICKS} ticks = ${CALLS_PER_ROUND.toLocaleString(
        'en-US'
      )} calls per round, ` +
      `${config.changedPerTick} of ${config.entities} entities change per tick, ` +
      `min of ${ROUNDS} interleaved rounds`
  )

  if (!exposedGc) {
    console.log(
      'WARNING: run with --expose-gc, rounds start from an uncontrolled heap'
    )
  }

  const results = measureAll(props)

  console.log('')
  console.log(
    `${padRight('case', 32)} ${padRight('variant', 8)} ${pad('min ms', 8)} ` +
      `${pad('ns/call', 8)} ${pad('min +-', 7)} ${pad(
        'recomputes',
        11
      )}   change`
  )

  for (const result of results) {
    const baseline =
      result.variant === 'current'
        ? results.find(
            other => other.name === result.name && other.variant === 'base'
          )
        : undefined

    console.log(
      `${padRight(result.name, 32)} ${padRight(result.variant, 8)} ` +
        `${pad(result.minMs.toFixed(1), 8)} ${pad(
          result.nsPerCall.toFixed(1),
          8
        )} ` +
        `${pad((result.minNoise * 100).toFixed(1) + '%', 7)} ` +
        `${pad(result.recomputations.toLocaleString('en-US'), 11)}   ` +
        (baseline ? formatDelta(result, baseline) : '')
    )
  }

  // Both figures include the priming pass, which runs before the timed region:
  // a slice case recomputes once there, a per-entity case once per entity.
  const perTick = 1 + TICKS
  const perEntity = config.callsPerTick + TICKS * config.changedPerTick

  const unexpected = results.filter(
    result =>
      result.recomputations !==
      (perEntityCases.has(result.name) ? perEntity : perTick)
  )

  if (unexpected.length === 0) {
    console.log(
      `\nRecomputations are as expected everywhere: ${perTick.toLocaleString(
        'en-US'
      )} ` +
        `for a case whose input is a whole slice, ${perEntity.toLocaleString(
          'en-US'
        )} ` +
        `for a case whose input is one entity. Same work, so the times compare.`
    )
    return
  }

  console.log('')
  for (const result of unexpected) {
    const expected = perEntityCases.has(result.name) ? perEntity : perTick
    console.log(
      `WARNING: ${result.name.trim()} (${
        result.variant || 'floor'
      }) recomputed ` +
        `${result.recomputations.toLocaleString('en-US')} times, expected ` +
        `${expected.toLocaleString('en-US')} — its time is not comparable`
    )
  }
  process.exitCode = 1
}

main()
