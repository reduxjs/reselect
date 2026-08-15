import {
  createSelector,
  lruMemoize,
  setGlobalDevModeChecks,
  weakMapMemoize
} from 'reselect'

/**
 * Companion to `weakMapMemoize.memory.spec.ts` for
 * https://github.com/reduxjs/reselect/issues/635
 *
 * Where the benchmarks report timings, which vary from machine to machine,
 * these tests pin down the number of cache nodes a call allocates. That number
 * follows from the shape of the cache tree, so it is the same everywhere.
 *
 * `weakMapMemoize` stores each argument at its own level of the tree, so a
 * cache miss allocates one node per argument, and `createSelector` builds two
 * of these trees: one for the arguments the output selector was called with
 * (`argsMemoize`) and one for the values the input selectors extracted
 * (`memoize`).
 */

interface AllocationCounts {
  /** `Map` instances constructed, i.e. levels of the tree holding primitives. */
  maps: number
  /** `WeakMap` instances constructed, i.e. levels holding objects. */
  weakMaps: number
  /**
   * Entries stored across all of those maps. Every one of them is a freshly
   * created cache node, so this doubles as the number of nodes allocated.
   */
  cacheNodes: number
}

/**
 * Counts the maps and cache nodes allocated while `run` executes, by swapping
 * in counting subclasses of `Map` and `WeakMap`. `weakMapMemoize` constructs
 * both lazily through the global bindings, so this observes it without
 * changing its behavior.
 */
const measureAllocations = (run: () => void) => {
  const counts: AllocationCounts = { maps: 0, weakMaps: 0, cacheNodes: 0 }

  const OriginalMap = globalThis.Map
  const OriginalWeakMap = globalThis.WeakMap

  class CountingMap<K, V> extends OriginalMap<K, V> {
    constructor(entries?: readonly (readonly [K, V])[] | null) {
      super(entries)
      counts.maps++
    }
    set(key: K, value: V) {
      counts.cacheNodes++
      return super.set(key, value)
    }
  }

  class CountingWeakMap<K extends WeakKey, V> extends OriginalWeakMap<K, V> {
    constructor(entries?: readonly (readonly [K, V])[] | null) {
      super(entries)
      counts.weakMaps++
    }
    set(key: K, value: V) {
      counts.cacheNodes++
      return super.set(key, value)
    }
  }

  globalThis.Map = CountingMap as unknown as MapConstructor
  globalThis.WeakMap = CountingWeakMap as unknown as WeakMapConstructor

  try {
    run()
  } finally {
    globalThis.Map = OriginalMap
    globalThis.WeakMap = OriginalWeakMap
  }

  return counts
}

interface TestState {
  todos: { id: number }[]
}

const state: TestState = { todos: [{ id: 0 }, { id: 1 }] }

const selectTodos = (state: TestState) => state.todos
const selectId = (state: TestState, id: number) => id

const createParametricSelector = () =>
  createSelector([selectTodos, selectId], (todos, id) => todos.length + id)

const createLruParametricSelector = () =>
  createSelector([selectTodos, selectId], (todos, id) => todos.length + id, {
    memoize: lruMemoize,
    argsMemoize: lruMemoize
  })

describe('what a weakMapMemoize cache miss allocates', () => {
  const CALLS = 1_000

  // The development-only checks call the input selectors and the result
  // function some extra times on a selector's first call, which shows up as a
  // couple of extra nodes. Turning them off keeps these counts exact.
  beforeAll(() => {
    setGlobalDevModeChecks({
      inputStabilityCheck: 'never',
      identityFunctionCheck: 'never'
    })
  })

  afterAll(() => {
    setGlobalDevModeChecks({
      inputStabilityCheck: 'once',
      identityFunctionCheck: 'once'
    })
  })

  const nodesForCalls = (calls: number) =>
    measureAllocations(() => {
      const selector = createParametricSelector()
      for (let i = 0; i < calls; i++) {
        selector(state, i)
      }
    })

  test('allocates two cache nodes per unique argument', () => {
    const counts = nodesForCalls(CALLS)

    // One `WeakMap` per tree, holding the single object argument (the state
    // for `argsMemoize`, the todos array for `memoize`), and one `Map` per
    // tree, holding the id.
    expect(counts.weakMaps).toBe(2)
    expect(counts.maps).toBe(2)

    // Two nodes for every distinct id - one in each tree - plus the two nodes
    // the object arguments are stored under.
    expect(counts.cacheNodes).toBe(CALLS * 2 + 2)
  })

  test('the number of nodes grows linearly with the number of distinct arguments', () => {
    const single = nodesForCalls(CALLS).cacheNodes
    const double = nodesForCalls(CALLS * 2).cacheNodes
    const quadruple = nodesForCalls(CALLS * 4).cacheNodes

    // Two more nodes for every additional distinct argument. Nothing is
    // evicted along the way.
    expect(double - single).toBe(CALLS * 2)
    expect(quadruple - double).toBe(CALLS * 2 * 2)
  })

  test('a cache hit allocates nothing', () => {
    const selector = createParametricSelector()
    selector(state, 0)

    const counts = measureAllocations(() => {
      for (let i = 0; i < CALLS; i++) {
        selector(state, 0)
      }
    })

    expect(counts).toEqual({ maps: 0, weakMaps: 0, cacheNodes: 0 })
  })

  test('lruMemoize allocates no maps, since it caches in an array', () => {
    const counts = measureAllocations(() => {
      const selector = createLruParametricSelector()
      for (let i = 0; i < CALLS; i++) {
        selector(state, i)
      }
    })

    expect(counts).toEqual({ maps: 0, weakMaps: 0, cacheNodes: 0 })
  })

  test('every argument adds another level to the tree', () => {
    const counts = measureAllocations(() => {
      const memoized = weakMapMemoize(
        (array: number[], from: number, to: number) => array.slice(from, to)
      )
      const array = [1, 2, 3, 4, 5]
      memoized(array, 0, 1)
    })

    // One `WeakMap` for the array, one `Map` per primitive argument.
    expect(counts.weakMaps).toBe(1)
    expect(counts.maps).toBe(2)
    expect(counts.cacheNodes).toBe(3)
  })
})
