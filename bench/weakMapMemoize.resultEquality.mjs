/**
 * Result equality across immutable versions, against a baseline git ref in the
 * same process. Build both bundles first:
 *
 *   node bench/build.mjs --baseline=<ref>
 *   node --expose-gc bench/weakMapMemoize.resultEquality.mjs
 *
 * Every version is read in its own job, as a store update would be: a
 * `WeakRef` keeps its target alive until the job ends, so one synchronous loop
 * over all versions would price retention no application sees. Only the reads
 * are timed.
 */
import { strict as assert } from 'node:assert'
import { setImmediate } from 'node:timers/promises'
import { weakMapMemoize as baseline } from './.build/reselect-base.mjs'
import { weakMapMemoize as current } from './.build/reselect.mjs'

const ids = Array.from({ length: 64 }, (_, id) => id)
const rounds = 7

async function measure(memoize, scenario) {
  let comparisons = 0
  let computations = 0
  const memoized = memoize(
    (db, id) => {
      computations++
      return Array.from(
        { length: scenario.width },
        (_, index) => db.values[id] + index
      )
    },
    {
      resultEqualityCheck(previous, next) {
        comparisons++
        return (
          previous.length === next.length &&
          previous.every((value, index) => value === next[index])
        )
      }
    }
  )
  const databases = Array.from(
    { length: scenario.updates + 1 },
    (_, version) => ({
      values: scenario.changing
        ? ids.map(id => id + version * ids.length)
        : ids,
      version
    })
  )
  const previous = ids.map(id => memoized(databases[0], id))
  comparisons = 0
  computations = 0
  let reused = 0
  let checksum = 0
  let ms = 0

  if (scenario.hits) {
    const started = performance.now()
    for (let index = 0; index < scenario.hits; index++) {
      checksum += memoized(databases[0], index % ids.length)[0]
    }
    ms = performance.now() - started
  } else {
    for (let version = 1; version < databases.length; version++) {
      await setImmediate()
      const started = performance.now()
      for (const id of ids) {
        const result = memoized(databases[version], id)
        reused += result === previous[id] ? 1 : 0
        previous[id] = result
        checksum += result[0]
      }
      ms += performance.now() - started
    }
  }

  assert.equal(computations, scenario.hits ? 0 : scenario.updates * ids.length)
  assert.equal(
    checksum,
    scenario.hits
      ? (scenario.hits / ids.length) * 2016
      : scenario.updates * 2016 +
          (scenario.changing
            ? (ids.length ** 2 * scenario.updates * (scenario.updates + 1)) / 2
            : 0)
  )
  assert.equal(memoized(databases[0], 0)[0], 0)
  return { ms, reused, comparisons, computations }
}

const scenarios = [
  { name: 'exact hits with equality', width: 1, hits: 2_048_000, updates: 0 },
  { name: '64 keys, one-element results', width: 1, updates: 512 },
  { name: '64 keys, 64-element results', width: 64, updates: 512 },
  {
    name: '64 keys, one-element results, no match',
    width: 1,
    updates: 512,
    changing: true
  }
]

const samples = new Map(
  scenarios.map(scenario => [scenario.name, { baseline: [], current: [] }])
)

for (let round = -2; round < rounds; round++) {
  for (const scenario of scenarios) {
    const variants =
      round % 2 === 0
        ? [
            ['baseline', baseline],
            ['current', current]
          ]
        : [
            ['current', current],
            ['baseline', baseline]
          ]
    for (const [variant, memoize] of variants) {
      await setImmediate()
      globalThis.gc?.()
      const result = await measure(memoize, scenario)
      if (round >= 0) {
        samples.get(scenario.name)[variant].push(result)
      }
    }
  }
}

const statistics = values => {
  const sorted = values.toSorted((a, b) => a - b)
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length
  return {
    min: sorted[0],
    max: sorted.at(-1),
    median: sorted[Math.floor(sorted.length / 2)],
    mean,
    deviation: Math.sqrt(
      values.reduce((sum, value) => sum + (value - mean) ** 2, 0) /
        values.length
    )
  }
}

for (const scenario of scenarios) {
  const results = samples.get(scenario.name)
  const report = { scenario: scenario.name, rounds }
  for (const variant of ['baseline', 'current']) {
    report[variant] = {
      milliseconds: statistics(results[variant].map(result => result.ms)),
      reused: results[variant].map(result => result.reused),
      comparisons: results[variant].map(result => result.comparisons),
      computations: results[variant].map(result => result.computations)
    }
  }
  console.log(JSON.stringify(report))
}
