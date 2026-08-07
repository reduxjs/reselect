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
 */

/* 1 input, 1 argument — the common shape. Every caller within a tick passes the
 * same state, so `argsMemoize` hits on all but the tick's first call. */

const oneInput = {
  name: '1 input, (state)',
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
  arity: 2,
  create: ({ createSelector }, count) =>
    createSelector([selectEntity], entity => {
      count()
      return project(entity)
    })
}

const parametricLruArgs = {
  name: '  same, lru argsMemoize',
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

const shapes = [
  oneInput,
  threeInputs,
  threeInputsParametric,
  sixInputs,
  parametric,
  parametricLruArgs,
  nested
]

/* Floors. Not proposals — no introspection, no configurable memoization, no
 * argument-level cache. They are the budget a rewrite has. */

/** One reference compare, for the slice shape. */
function createSliceFloor() {
  let recomputations = 0
  let lastEntities
  let lastResult

  return {
    name: 'floor: slice (hand-written)',
    variant: '',
    run: state => {
      const entities = state.entities

      if (entities !== lastEntities) {
        lastEntities = entities
        recomputations += 1
        lastResult = entities[0]
      }

      return lastResult
    },
    recomputations: () => recomputations
  }
}

/**
 * One map lookup and one reference compare, for the parametric shape. Keyed per
 * id on purpose: a single `lastEntity` slot would be faster still and also wrong,
 * since consecutive calls carry different props, so it would miss every time and
 * recompute 200x more often — which is what the recomputation column caught.
 */
function createParametricFloor() {
  let recomputations = 0
  const cache = new Map()

  return {
    name: 'floor: parametric (hand-written)',
    variant: '',
    run: (state, props) => {
      const entity = state.entities[props.id]

      let record = cache.get(props.id)

      if (record === undefined) {
        record = { entity: undefined, result: undefined }
        cache.set(props.id, record)
      } else if (record.entity === entity) {
        return record.result
      }

      recomputations += 1
      record.entity = entity
      record.result = project(entity)

      return record.result
    },
    recomputations: () => recomputations
  }
}

const implementations = [
  { variant: 'base', module: base },
  { variant: 'current', module: current }
]

/**
 * One factory per (shape, implementation) pair, plus the floors. Shape-major, so
 * a pair sits on adjacent rows and is measured back to back within each round.
 */
export const cases = [
  ...shapes.flatMap(shape =>
    implementations.map(({ variant, module }) => () => {
      let recomputations = 0
      const selector = shape.create(module, () => {
        recomputations += 1
      })

      return {
        name: shape.name,
        variant,
        run:
          shape.arity === 1
            ? state => selector(state)
            : (state, props) => selector(state, props),
        recomputations: () => recomputations
      }
    })
  ),
  createSliceFloor,
  createParametricFloor
]

/**
 * Cases whose input is a single entity rather than a whole slice, so they
 * recompute once per *changed entity* per tick instead of once per tick.
 */
export const perEntityCases = new Set([
  threeInputsParametric.name,
  sixInputs.name,
  parametric.name,
  parametricLruArgs.name,
  'floor: parametric (hand-written)'
])
