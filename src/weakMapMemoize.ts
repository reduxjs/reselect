// Original source:
// - https://github.com/facebook/react/blob/0b974418c9a56f6c560298560265dcf4b65784bc/packages/react/src/ReactCache.js

import type {
  AnyFunction,
  DefaultMemoizeFields,
  EqualityFn,
  Simplify
} from './types'

class StrongRef<T> {
  constructor(private value: T) {}
  deref() {
    return this.value
  }
}

/**
 * @returns The {@linkcode StrongRef} if {@linkcode WeakRef} is not available.
 *
 * @since 5.1.2
 * @internal
 */
const getWeakRef = () =>
  typeof WeakRef === 'undefined'
    ? (StrongRef as unknown as typeof WeakRef)
    : WeakRef

const Ref = /* @__PURE__ */ getWeakRef()

const UNTERMINATED = 0
const TERMINATED = 1

/**
 * Fields shared by every cache node, regardless of termination status. The
 * back-references (`parent`/`map`/`key`) and LRU links (`lru`/`mru`) are only
 * used when a `maxSize` is configured, so that terminated nodes can be evicted
 * and their now-empty ancestors pruned out of the strong primitive `Map`s.
 */
interface CacheNodeBase<T> {
  /**
   * Object cache, a `WeakMap` where non-primitive arguments are stored.
   */
  o: null | WeakMap<Function | object, CacheNode<T>>
  /**
   * Primitive cache, a regular `Map` where primitive arguments are stored.
   */
  p: null | Map<string | number | null | void | symbol | boolean, CacheNode<T>>
  /**
   * The parent cache node, or `null` for the root node.
   */
  parent: CacheNode<T> | null
  /**
   * The `Map`/`WeakMap` in {@linkcode parent} that holds this node.
   */
  map:
    | Map<any, CacheNode<T>>
    | WeakMap<Function | object, CacheNode<T>>
    | null
  /**
   * The key under which this node is stored in {@linkcode map}.
   */
  key: any
  /**
   * Previous (less recently used) node in the LRU list, or `null`.
   */
  lru: CacheNode<T> | null
  /**
   * Next (more recently used) node in the LRU list, or `null`.
   */
  mru: CacheNode<T> | null
}

interface UnterminatedCacheNode<T> extends CacheNodeBase<T> {
  /**
   * Status, represents whether the cached computation returned a value or threw an error.
   */
  s: 0
  /**
   * Value, either the cached result or an error, depending on status.
   */
  v: void
}

interface TerminatedCacheNode<T> extends CacheNodeBase<T> {
  /**
   * Status, represents whether the cached computation returned a value or threw an error.
   */
  s: 1
  /**
   * Value, either the cached result or an error, depending on status.
   */
  v: T
}

type CacheNode<T> = TerminatedCacheNode<T> | UnterminatedCacheNode<T>

function createCacheNode<T>(): CacheNode<T> {
  return {
    s: UNTERMINATED,
    v: undefined,
    o: null,
    p: null,
    parent: null,
    map: null,
    key: undefined,
    lru: null,
    mru: null
  }
}

/**
 * Configuration options for a memoization function utilizing `WeakMap` for
 * its caching mechanism.
 *
 * @template Result - The type of the return value of the memoized function.
 *
 * @since 5.0.0
 * @public
 */
export interface WeakMapMemoizeOptions<Result = any> {
  /**
   * If provided, used to compare a newly generated output value against previous values in the cache.
   * If a match is found, the old value is returned. This addresses the common
   * ```ts
   * todos.map(todo => todo.id)
   * ```
   * use case, where an update to another field in the original data causes a recalculation
   * due to changed references, but the output is still effectively the same.
   *
   * @since 5.0.0
   */
  resultEqualityCheck?: EqualityFn<Result>

  /**
   * The maximum number of results to keep in the cache at once.
   *
   * By default `weakMapMemoize` has an effectively infinite cache size: results
   * are kept alive for as long as the arguments used to compute them remain
   * reachable. This is ideal when the arguments are objects that get garbage
   * collected (such as the Redux state), but can behave like a memory leak when
   * a long-lived object argument is combined with ever-changing primitive
   * arguments — every result computed for every primitive combination is
   * retained for the lifetime of that object.
   *
   * Providing a `maxSize` caps the number of cached results using a least-
   * recently-used (LRU) policy. Once the limit is exceeded, the least recently
   * used result is evicted and any now-empty `Map` branches holding primitive
   * arguments are pruned, allowing those results to be garbage collected.
   *
   * Must be a positive integer. When omitted, the cache size is unbounded.
   *
   * @see {@link https://github.com/reduxjs/reselect/issues/635}
   *
   * @since 5.2.1
   */
  maxSize?: number
}

/**
 * Derefences the argument if it is a Ref. Else if it is a value already, return it.
 *
 * @param r - the object to maybe deref
 * @returns The derefenced value if the argument is a Ref, else the argument value itself.
 */
function maybeDeref(r: any) {
  if (r instanceof Ref) {
    return r.deref()
  }

  return r
}

/**
 * Creates a tree of `WeakMap`-based cache nodes based on the identity of the
 * arguments it's been called with (in this case, the extracted values from your input selectors).
 * This allows `weakMapMemoize` to have an effectively infinite cache size.
 * Cache results will be kept in memory as long as references to the arguments still exist,
 * and then cleared out as the arguments are garbage-collected.
 *
 * __Design Tradeoffs for `weakMapMemoize`:__
 * - Pros:
 *   - It has an effectively infinite cache size, but you have no control over
 *   how long values are kept in cache as it's based on garbage collection and `WeakMap`s.
 * - Cons:
 *   - There's currently no way to alter the argument comparisons.
 *   They're based on strict reference equality.
 *   - It's roughly the same speed as `lruMemoize`, although likely a fraction slower.
 *
 * __Use Cases for `weakMapMemoize`:__
 * - This memoizer is likely best used for cases where you need to call the
 * same selector instance with many different arguments, such as a single
 * selector instance that is used in a list item component and called with
 * item IDs like:
 *   ```ts
 *   useSelector(state => selectSomeData(state, props.category))
 *   ```
 * @param func - The function to be memoized.
 * @returns A memoized function with a `.clearCache()` method attached.
 *
 * @example
 * <caption>Using `createSelector`</caption>
 * ```ts
 * import { createSelector, weakMapMemoize } from 'reselect'
 *
 * interface RootState {
 *   items: { id: number; category: string; name: string }[]
 * }
 *
 * const selectItemsByCategory = createSelector(
 *   [
 *     (state: RootState) => state.items,
 *     (state: RootState, category: string) => category
 *   ],
 *   (items, category) => items.filter(item => item.category === category),
 *   {
 *     memoize: weakMapMemoize,
 *     argsMemoize: weakMapMemoize
 *   }
 * )
 * ```
 *
 * @example
 * <caption>Using `createSelectorCreator`</caption>
 * ```ts
 * import { createSelectorCreator, weakMapMemoize } from 'reselect'
 *
 * const createSelectorWeakMap = createSelectorCreator({ memoize: weakMapMemoize, argsMemoize: weakMapMemoize })
 *
 * const selectItemsByCategory = createSelectorWeakMap(
 *   [
 *     (state: RootState) => state.items,
 *     (state: RootState, category: string) => category
 *   ],
 *   (items, category) => items.filter(item => item.category === category)
 * )
 * ```
 *
 * @template Func - The type of the function that is memoized.
 *
 * @see {@link https://reselect.js.org/api/weakMapMemoize `weakMapMemoize`}
 *
 * @since 5.0.0
 * @public
 * @experimental
 */
export function weakMapMemoize<Func extends AnyFunction>(
  func: Func,
  options: WeakMapMemoizeOptions<ReturnType<Func>> = {}
) {
  let fnNode = createCacheNode()
  const { resultEqualityCheck, maxSize } = options

  const useLru = maxSize !== undefined
  if (useLru && (!Number.isInteger(maxSize) || maxSize < 1)) {
    throw new TypeError(
      `the \`maxSize\` option for weakMapMemoize must be a positive integer, but received: ${maxSize}`
    )
  }

  // Doubly linked LRU list of terminated cache nodes. `lruMost` is the most
  // recently used node, `lruLeast` the least recently used (eviction target).
  let lruMost: CacheNode<any> | null = null
  let lruLeast: CacheNode<any> | null = null
  let cacheSize = 0

  const lruDetach = (node: CacheNode<any>) => {
    const { lru, mru } = node
    if (lru !== null) lru.mru = mru
    else lruLeast = mru
    if (mru !== null) mru.lru = lru
    else lruMost = lru
    node.lru = node.mru = null
  }

  const lruPromote = (node: CacheNode<any>) => {
    if (node === lruMost) return
    if (node.lru !== null || node.mru !== null || node === lruLeast) {
      lruDetach(node)
    }
    node.lru = lruMost
    node.mru = null
    if (lruMost !== null) lruMost.mru = node
    lruMost = node
    if (lruLeast === null) lruLeast = node
  }

  /**
   * Removes a terminated node from the cache tree and prunes any ancestors that
   * are left holding nothing, so the strong primitive `Map`s can't grow forever.
   */
  const evict = (node: CacheNode<any>) => {
    let current: CacheNode<any> | null = node
    while (current !== null && current.map !== null) {
      current.map.delete(current.key)
      const parent: CacheNode<any> | null = current.parent
      if (
        parent === null ||
        parent.s === TERMINATED || // still caches a value of its own
        parent.o !== null || // still has object-keyed children (a `WeakMap`)
        (parent.p !== null && parent.p.size > 0) // still has primitive children
      ) {
        break
      }
      current = parent
    }
  }

  let lastResult: WeakRef<object> | undefined

  let resultsCount = 0

  function memoized() {
    let cacheNode = fnNode
    const { length } = arguments
    for (let i = 0, l = length; i < l; i++) {
      const arg = arguments[i]
      if (
        typeof arg === 'function' ||
        (typeof arg === 'object' && arg !== null)
      ) {
        // Objects go into a WeakMap
        let objectCache = cacheNode.o
        if (objectCache === null) {
          cacheNode.o = objectCache = new WeakMap()
        }
        const objectNode = objectCache.get(arg)
        if (objectNode === undefined) {
          const parentNode = cacheNode
          cacheNode = createCacheNode()
          objectCache.set(arg, cacheNode)
          if (useLru) {
            cacheNode.parent = parentNode
            cacheNode.map = objectCache
            cacheNode.key = arg
          }
        } else {
          cacheNode = objectNode
        }
      } else {
        // Primitives go into a regular Map
        let primitiveCache = cacheNode.p
        if (primitiveCache === null) {
          cacheNode.p = primitiveCache = new Map()
        }
        const primitiveNode = primitiveCache.get(arg)
        if (primitiveNode === undefined) {
          const parentNode = cacheNode
          cacheNode = createCacheNode()
          primitiveCache.set(arg, cacheNode)
          if (useLru) {
            cacheNode.parent = parentNode
            cacheNode.map = primitiveCache
            cacheNode.key = arg
          }
        } else {
          cacheNode = primitiveNode
        }
      }
    }

    // Return here rather than falling through to the writes below. Both would be
    // no-ops — `s` is already `TERMINATED` and `v` already holds this result —
    // but `v` stores a pointer, so re-storing it costs a GC write barrier on a
    // call that had nothing to record.
    if (cacheNode.s === TERMINATED) {
      // Mark this result as most recently used so it survives eviction longest.
      if (useLru) lruPromote(cacheNode)
      return cacheNode.v
    }

    const terminatedNode = cacheNode as unknown as TerminatedCacheNode<any>

    // Allow errors to propagate
    let result = func.apply(null, arguments as unknown as any[])
    resultsCount++

    if (resultEqualityCheck) {
      // Deref lastResult if it is a Ref
      const lastResultValue = maybeDeref(lastResult)

      if (
        lastResultValue != null &&
        resultEqualityCheck(lastResultValue as ReturnType<Func>, result)
      ) {
        result = lastResultValue

        if (resultsCount !== 0) resultsCount--
      }

      const needsWeakRef =
        (typeof result === 'object' && result !== null) ||
        typeof result === 'function'

      lastResult = needsWeakRef ? /* @__PURE__ */ new Ref(result) : result
    }

    terminatedNode.s = TERMINATED
    terminatedNode.v = result

    // Reaching here means the node was unterminated above, so this is always a
    // brand new cache entry.
    if (useLru) {
      // A brand new result was cached: track it as most recently used and
      // evict the least recently used result once we're over `maxSize`.
      lruPromote(terminatedNode)
      cacheSize++
      if (cacheSize > (maxSize as number)) {
        const toEvict = lruLeast!
        lruDetach(toEvict)
        cacheSize--
        evict(toEvict)
      }
    }

    return result
  }

  memoized.clearCache = () => {
    fnNode = createCacheNode()
    lruMost = lruLeast = null
    cacheSize = 0
    memoized.resetResultsCount()
  }

  memoized.resultsCount = () => resultsCount

  memoized.resetResultsCount = () => {
    resultsCount = 0
  }

  return memoized as Func & Simplify<DefaultMemoizeFields>
}
