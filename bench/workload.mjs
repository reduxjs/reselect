/**
 * The workload every case replays. What decides `createSelector`'s cost in a real
 * application is that the state object's identity changes on every write, so
 * `argsMemoize` misses; that only a small fraction of the data changes, so
 * `memoize` (keyed on input selector *results*) hits; and that selectors run once
 * per subscriber per tick, so per-call overhead is multiplied rather than
 * amortized. The interesting number is therefore not "how fast is a cache hit"
 * but "what does a call cost when the result is already correct".
 */

const ENTITY_COUNT = 1000
const CHANGED_PER_TICK = 50

export const config = {
  entities: ENTITY_COUNT,
  changedPerTick: CHANGED_PER_TICK,
  /** Selector calls per tick — one per subscribed entity, as a mounted list would be. */
  callsPerTick: ENTITY_COUNT
}

export function createInitialState() {
  const entities = {}
  const ids = new Array(ENTITY_COUNT)

  for (let id = 0; id < ENTITY_COUNT; id += 1) {
    entities[id] = { id, value: id, label: 'e' + id }
    ids[id] = id
  }

  return { entities, ids, unrelated: { counter: 0 } }
}

/**
 * One write: a new state object and new objects for the changed entities only,
 * every other entity keeping its identity. This is what an immutable reducer
 * produces, and it is what makes memoization on input values worth anything.
 */
export function applyTick(state, tick) {
  const entities = { ...state.entities }

  for (let i = 0; i < CHANGED_PER_TICK; i += 1) {
    const id = (tick * CHANGED_PER_TICK + i) % ENTITY_COUNT
    const previous = entities[id]
    entities[id] = { id, value: previous.value + 1, label: previous.label }
  }

  return { entities, ids: state.ids, unrelated: state.unrelated }
}

/**
 * The derivation under memoization. Cheap on purpose: this benchmark prices the
 * machinery around it, and an expensive combiner would mask exactly that.
 */
export function project(entity) {
  return { id: entity.id, text: entity.label + ':' + entity.value }
}

/** Props are allocated once and reused, as a mounted component's would be. */
export function createProps() {
  const props = new Array(ENTITY_COUNT)

  for (let id = 0; id < ENTITY_COUNT; id += 1) {
    props[id] = { id }
  }

  return props
}
