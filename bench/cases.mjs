import * as base from './.build/reselect-base.mjs'
import * as current from './.build/reselect.mjs'
import { project } from './workload.mjs'

/**
 * The shapes a `createSelector` call actually takes, plus the floor each could
 * reach.
 *
 * Each shape is defined once against an injected `reselect` module and
 * instantiated twice, so baseline and working tree are interleaved round by
 * round. Every case exposes `run(state, props)` and a `recomputations()` counter
 * — a variant that looks fast because it silently skips work would otherwise read
 * as a win, and the count is the only thing that rules that out.
 *
 * Two kinds of case:
 *
 *   - `tick` replays the immutable-update workload in `workload.mjs`. This is the
 *     realistic shape, and the clock covers the state-producing step too (see
 *     `run.mjs` for why).
 *   - `micro` calls one memoized function in a bare loop with no state
 *     production. A change worth 1-2 ns inside `weakMapMemoize` is a rounding
 *     error once a 25 ns selector call and a `applyTick` share the measurement,
 *     so the tick cases cannot see it at all. These can, at the cost of measuring
 *     something no application does verbatim.
 *
 * `expected(ticks, config)` returns the recomputation count the case must report.
 * It is a function of the tick count because the harness calibrates that per case
 * rather than fixing it globally.
 */

/* 1 input, 1 argument — the common shape. Every caller within a tick passes the
 * same state, so `argsMemoize` hits on all but the tick's first call. */

/** Once for the priming pass, then once per tick. */
const oncePerTick = ticks => 1 + ticks

/** Once per priming call, then once per changed entity per tick. */
const oncePerChangedEntity = (ticks, config) =>
  config.callsPerTick + ticks * config.changedPerTick

const oneInput = {
  name: '1 input, (state)',
  kind: 'tick',
  expected: oncePerTick,
  // Arity matters as much as the selector: `argsMemoize` keys on the whole
  // argument list, so passing a slice selector a per-call props object turns
  // every hit into a miss. It moved this case from 9 ns to 141 ns when the
  // harness got it wrong.
  arity: 1,
  create: ({ createSelector }, count) =>
    // Returns a member rather than the input itself. `entities => entities` is an
    // identity result function, which `identityFunctionCheck` both warns about
    // and calls a second time to confirm — so in a dev-mode run it would have
    // corrupted this case's recomputation count.
    createSelector([state => state.entities], entities => {
      count()
      return entities[0]
    })
}

/* 3 input selectors — a selector composing a few slices. */

const threeInputs = {
  name: '3 inputs, (state)',
  kind: 'tick',
  expected: oncePerTick,
  arity: 1,
  create: ({ createSelector }, count) =>
    createSelector(
      [state => state.entities, state => state.ids, state => state.unrelated],
      (entities, ids, unrelated) => {
        count()
        return { entities, ids, unrelated }
      }
    )
}

/* Parametric: (state, props) — the miss path. The argument list holds a state
 * replaced every tick and a props object that differs on every call within one,
 * so no call ever hits `argsMemoize` and each allocates a cache node to record
 * the miss. Memoization on input *values* still hits, which is why the
 * recomputation count stays at one per changed entity per tick. */

const selectEntity = (state, props) => state.entities[props.id]

const parametric = {
  name: '1 input, (state, props)',
  kind: 'tick',
  expected: oncePerChangedEntity,
  arity: 2,
  create: ({ createSelector }, count) =>
    createSelector([selectEntity], entity => {
      count()
      return project(entity)
    })
}

const parametricLruArgs = {
  name: '  same, lru argsMemoize',
  kind: 'tick',
  expected: oncePerChangedEntity,
  arity: 2,
  create: ({ createSelector, lruMemoize }, count) =>
    createSelector(
      [selectEntity],
      entity => {
        count()
        return project(entity)
      },
      { argsMemoize: lruMemoize }
    )
}

/* Nested: output selectors used as another selector's inputs, which is how any
 * non-trivial selector graph is built. */

const nested = {
  name: 'nested (2 output selectors)',
  kind: 'tick',
  expected: oncePerTick,
  arity: 1,
  create: ({ createSelector }, count) => {
    // Wrapped rather than returned as-is. `entities => entities` is an identity
    // result function, which `identityFunctionCheck` warns about and calls a
    // second time. Returning a *member* instead fixes that but breaks the case
    // differently: `entities[0]` changes only once every 20 ticks, so the outer
    // selector recomputed 51 times instead of once per tick and stopped measuring
    // the shape it is here for. Wrapping keeps the result fresh every tick.
    const selectEntities = createSelector(
      [state => state.entities],
      entities => ({ entities })
    )
    const selectIds = createSelector([state => state.ids], ids => ({ ids }))

    return createSelector([selectEntities, selectIds], (entities, ids) => {
      count()
      return { entities, ids }
    })
  }
}

/**
 * Three input selectors, parametric. The slice shapes above hit `argsMemoize`, so
 * they never reach the code that gathers input selector results — without this
 * case, gathering more than one of them would go unmeasured.
 */
const threeInputsParametric = {
  name: '3 inputs, (state, props)',
  kind: 'tick',
  expected: oncePerChangedEntity,
  arity: 2,
  create: ({ createSelector }, count) =>
    createSelector(
      [selectEntity, (state, props) => props.id, state => state.ids],
      entity => {
        count()
        return project(entity)
      }
    )
}

/** Six input selectors, parametric — enough that gathering them dominates. */
const sixInputs = {
  name: '6 inputs, (state, props)',
  kind: 'tick',
  expected: oncePerChangedEntity,
  arity: 2,
  create: ({ createSelector }, count) =>
    createSelector(
      [
        selectEntity,
        (state, props) => props.id,
        state => state.ids,
        state => state.unrelated,
        (state, props) => state.entities[props.id].value,
        (state, props) => state.entities[props.id].label
      ],
      entity => {
        count()
        return project(entity)
      }
    )
}

/**
 * Memoizers called directly, with no selector and no state production around
 * them.
 *
 * `createSelector` calls its `argsMemoize` and its `memoize` once each per call,
 * so a change inside one of them is at most a few nanoseconds of a call that
 * costs 25 ns on the cheap shapes and several hundred on the parametric ones —
 * under the harness's own noise floor either way. Measuring the memoized function
 * on its own is the only way to put a number on that class of change.
 *
 * These are deliberately not proposals about what to optimise. A win here is only
 * worth having if it survives into one of the shapes above.
 */

/** Hit path, one object argument: one WeakMap lookup and one terminated check. */
const microWeakMapHitOneArg = {
  name: 'micro: weakMapMemoize hit (1 arg)',
  kind: 'micro',
  // Every call passes the same argument, so exactly one call ever computes.
  expected: () => 1,
  create: ({ weakMapMemoize }, count) => {
    const arg = { value: 1 }
    const memoized = weakMapMemoize(input => {
      count()
      return input.value
    })

    return () => memoized(arg)
  }
}

/**
 * Hit path, two object arguments — the depth a `(state, props)` selector walks.
 * One WeakMap lookup per argument, so this is where a per-argument change shows
 * up at twice the size.
 */
const microWeakMapHitTwoArgs = {
  name: 'micro: weakMapMemoize hit (2 args)',
  kind: 'micro',
  expected: () => 1,
  create: ({ weakMapMemoize }, count) => {
    const first = { value: 1 }
    const second = { value: 2 }
    const memoized = weakMapMemoize((a, b) => {
      count()
      return a.value + b.value
    })

    return () => memoized(first, second)
  }
}

/** Hit path, `lruMemoize` at its default `maxSize` of 1: one equality compare. */
const microLruHit = {
  name: 'micro: lruMemoize hit (1 arg)',
  kind: 'micro',
  expected: () => 1,
  create: ({ lruMemoize }, count) => {
    const arg = { value: 1 }
    const memoized = lruMemoize(input => {
      count()
      return input.value
    })

    return () => memoized(arg)
  }
}

/**
 * Miss path with eviction: twice as many distinct arguments as the cache holds,
 * so every call misses, and every miss both inserts and evicts. This is the path
 * that reallocates the entries array, and nothing else in this file reaches it
 * often enough to price it.
 *
 * The rotating index costs an increment and a compare per call, paid identically
 * by both variants.
 */
const microLruMissEvict = {
  name: 'micro: lruMemoize miss+evict (maxSize 10)',
  kind: 'micro',
  // Nothing ever hits, so every call computes — the priming pass included.
  expected: (ticks, config) =>
    config.callsPerTick + ticks * config.callsPerTick,
  create: ({ lruMemoize }, count) => {
    const args = Array.from({ length: 20 }, (_, value) => ({ value }))
    const memoized = lruMemoize(
      input => {
        count()
        return input.value
      },
      { maxSize: 10 }
    )
    let index = 0

    return () => {
      index = index === 19 ? 0 : index + 1
      return memoized(args[index])
    }
  }
}

/**
 * Hit path, three arguments. `lruMemoize` compares the argument lists element by
 * element, so per-argument work in the comparator shows up here at three times
 * the size it does in the one-argument case. A change that moves this case but
 * not `micro: lruMemoize hit (1 arg)` is per-argument; one that moves both by the
 * same amount is per-call.
 */
const microLruHitThreeArgs = {
  name: 'micro: lruMemoize hit (3 args)',
  kind: 'micro',
  expected: () => 1,
  create: ({ lruMemoize }, count) => {
    const first = { value: 1 }
    const second = { value: 2 }
    const third = { value: 3 }
    const memoized = lruMemoize((a, b, c) => {
      count()
      return a.value + b.value + c.value
    })

    return () => memoized(first, second, third)
  }
}

/**
 * Miss path with `resultEqualityCheck`, at the default `maxSize` of 1.
 *
 * `resultEqualityCheck` is the only thing that reads the cache's entries, and it
 * reads them once per miss. The result function is deliberately trivial so the
 * measurement is the bookkeeping rather than the payload — the realistic version
 * below covers the other half of the question.
 *
 * Every call passes a fresh argument, so the argument cache never hits, and the
 * result is always the same primitive, so `resultEqualityCheck` always matches
 * and the dedupe branch is always taken.
 */
const microLruResultEqualitySingleton = {
  name: 'micro: lruMemoize miss + resultEqualityCheck',
  kind: 'micro',
  // The argument cache never hits, so `func` runs on every call, priming
  // included. `resultsCount` is deduped back down but `count()` is not.
  expected: (ticks, config) =>
    config.callsPerTick + ticks * config.callsPerTick,
  create: ({ lruMemoize }, count) => {
    const args = Array.from({ length: 20 }, (_, value) => ({ value }))
    const memoized = lruMemoize(
      () => {
        count()
        return 1
      },
      { resultEqualityCheck: (previous, next) => previous === next }
    )
    let index = 0

    return () => {
      index = index === 19 ? 0 : index + 1
      return memoized(args[index])
    }
  }
}

/**
 * The same path at `maxSize: 10`, which uses the LRU cache rather than the
 * singleton one. The two caches reach the entries differently, so a change to
 * that code can help one and not the other.
 */
const microLruResultEqualityLru = {
  name: '  same, maxSize 10',
  kind: 'micro',
  expected: (ticks, config) =>
    config.callsPerTick + ticks * config.callsPerTick,
  create: ({ lruMemoize }, count) => {
    const args = Array.from({ length: 20 }, (_, value) => ({ value }))
    const memoized = lruMemoize(
      () => {
        count()
        return 1
      },
      {
        maxSize: 10,
        resultEqualityCheck: (previous, next) => previous === next
      }
    )
    let index = 0

    return () => {
      index = index === 19 ? 0 : index + 1
      return memoized(args[index])
    }
  }
}

/**
 * The realistic shape `resultEqualityCheck` exists for: a result function that
 * rebuilds an array of ids, and a shallow compare that recognises the rebuild as
 * unchanged. The payload dominates here, which is the point — it is the control
 * on the two cases above, which deliberately have no payload at all. A change
 * that moves those but not this one is real and does not matter.
 */
const microLruResultEqualityRealistic = {
  name: '  same, array payload',
  kind: 'micro',
  expected: (ticks, config) =>
    config.callsPerTick + ticks * config.callsPerTick,
  create: ({ lruMemoize }, count) => {
    const args = Array.from({ length: 20 }, (_, value) => ({ value }))
    const todos = Array.from({ length: 20 }, (_, id) => ({ id }))
    const memoized = lruMemoize(
      () => {
        count()
        return todos.map(todo => todo.id)
      },
      {
        resultEqualityCheck: (previous, next) => {
          if (previous.length !== next.length) return false
          for (let i = 0; i < previous.length; i += 1) {
            if (previous[i] !== next[i]) return false
          }
          return true
        }
      }
    )
    let index = 0

    return () => {
      index = index === 19 ? 0 : index + 1
      return memoized(args[index])
    }
  }
}

/**
 * `weakMapMemoize` filling its cache rather than reading it. Every call passes a
 * freshly allocated argument, so every call walks the node tree, allocates a
 * cache node and writes it into a `WeakMap`.
 *
 * The cache is cleared once every `callsPerTick` calls. Without that it would
 * grow without bound across a round — `weakMapMemoize` evicts nothing by default
 * — and a case whose retained set grows for the length of the round measures the
 * collector more than it measures the fill. Clearing costs one assignment,
 * amortised over a thousand calls, and both variants pay it identically.
 */
const microWeakMapFill = {
  name: 'micro: weakMapMemoize miss+fill',
  kind: 'micro',
  expected: (ticks, config) =>
    config.callsPerTick + ticks * config.callsPerTick,
  create: ({ weakMapMemoize }, count) => {
    const memoized = weakMapMemoize(input => {
      count()
      return input.value
    })
    let sinceClear = 0

    return () => {
      if (sinceClear === 1000) {
        memoized.clearCache()
        sinceClear = 0
      }
      sinceClear += 1

      return memoized({ value: sinceClear })
    }
  }
}

const shapes = [
  oneInput,
  threeInputs,
  threeInputsParametric,
  sixInputs,
  parametric,
  parametricLruArgs,
  nested,
  microWeakMapHitOneArg,
  microWeakMapHitTwoArgs,
  microWeakMapFill,
  microLruHit,
  microLruHitThreeArgs,
  microLruMissEvict,
  microLruResultEqualitySingleton,
  microLruResultEqualityLru,
  microLruResultEqualityRealistic
]

/* Floors. Not proposals — no introspection, no configurable memoization, no
 * argument-level cache. They are the budget a rewrite has.
 *
 * They also serve as controls: they contain no `reselect` code at all, so a run
 * where a floor moves has moved for reasons that have nothing to do with the
 * change under test. */

/** One reference compare, for the slice shape. */
const sliceFloor = {
  name: 'floor: slice (hand-written)',
  kind: 'tick',
  expected: oncePerTick,
  arity: 1,
  createRaw: count => {
    let lastEntities
    let lastResult

    return state => {
      const entities = state.entities

      if (entities !== lastEntities) {
        lastEntities = entities
        count()
        lastResult = entities[0]
      }

      return lastResult
    }
  }
}

/**
 * One map lookup and one reference compare, for the parametric shape. Keyed per
 * id on purpose: a single `lastEntity` slot would be faster still and also wrong,
 * since consecutive calls carry different props, so it would miss every time and
 * recompute 200x more often — which is what the recomputation column caught.
 */
const parametricFloor = {
  name: 'floor: parametric (hand-written)',
  kind: 'tick',
  expected: oncePerChangedEntity,
  arity: 2,
  createRaw: count => {
    const cache = new Map()

    return (state, props) => {
      const entity = state.entities[props.id]

      let record = cache.get(props.id)

      if (record === undefined) {
        record = { entity: undefined, result: undefined }
        cache.set(props.id, record)
      } else if (record.entity === entity) {
        return record.result
      }

      count()
      record.entity = entity
      record.result = project(entity)

      return record.result
    }
  }
}

/**
 * A plain call through a closure, for the micro cases. Anything measured above
 * this is what memoization costs; this is what it is compared against.
 */
const microFloor = {
  name: 'floor: direct call (hand-written)',
  kind: 'micro',
  expected: (ticks, config) =>
    config.callsPerTick + ticks * config.callsPerTick,
  createRaw: count => {
    const arg = { value: 1 }
    const compute = input => {
      count()
      return input.value
    }

    return () => compute(arg)
  }
}

const floors = [sliceFloor, parametricFloor, microFloor]

const implementations = [
  { variant: 'base', module: base },
  { variant: 'current', module: current }
]

const wrap = (shape, run, recomputations, variant) => ({
  name: shape.name,
  kind: shape.kind,
  variant,
  expected: shape.expected,
  run,
  recomputations
})

/**
 * One descriptor per (shape, implementation) pair, plus the floors. Shape-major,
 * so a pair sits on adjacent rows and is measured back to back within each round.
 *
 * `instantiate()` builds a fresh selector and a fresh counter; the harness calls
 * it once per round so no round inherits the previous round's cache.
 */
export const cases = [
  ...shapes.flatMap(shape =>
    implementations.map(({ variant, module }) => ({
      name: shape.name,
      kind: shape.kind,
      variant,
      expected: shape.expected,
      instantiate: () => {
        let recomputations = 0
        const selector = shape.create(module, () => {
          recomputations += 1
        })

        const run =
          shape.kind === 'micro'
            ? selector
            : shape.arity === 1
            ? state => selector(state)
            : (state, props) => selector(state, props)

        return wrap(shape, run, () => recomputations, variant)
      }
    }))
  ),
  // The floors run as a base/current pair of the *same* hand-written function, so
  // they go through the identical comparison machinery every other case does
  // while being guaranteed to have no difference to find. Anything but "within
  // noise" from a floor is the harness reporting a difference that cannot exist,
  // which condemns every other number in that run.
  ...floors.flatMap(shape =>
    ['base', 'current'].map(variant => ({
      name: shape.name,
      kind: shape.kind,
      variant,
      isControl: true,
      expected: shape.expected,
      instantiate: () => {
        let recomputations = 0
        const run = shape.createRaw(() => {
          recomputations += 1
        })

        return wrap(shape, run, () => recomputations, variant)
      }
    }))
  )
]
