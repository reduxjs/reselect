// Original source:
// - https://github.com/facebook/react/blob/0b974418c9a56f6c560298560265dcf4b65784bc/packages/react/src/ReactCache.js

import {
  CACHE_SIZE_CHECK_THRESHOLD,
  runCacheSizeCheck
} from './devModeChecks/cacheSizeCheck'
import { globalDevModeChecks } from './devModeChecks/setGlobalDevModeChecks'
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

interface UnterminatedCacheNode<T> {
  /**
   * Status, represents whether the cached computation returned a value or threw an error.
   */
  s: 0
  /**
   * Value, either the cached result or an error, depending on status.
   */
  v: void
  /**
   * Object cache, a `WeakMap` where non-primitive arguments are stored.
   */
  o: null | WeakMap<Function | Object, CacheNode<T>>
  /**
   * Primitive cache, a regular Map where primitive arguments are stored.
   */
  p: null | Map<string | number | null | void | symbol | boolean, CacheNode<T>>
}

interface TerminatedCacheNode<T> {
  /**
   * Status, represents whether the cached computation returned a value or threw an error.
   */
  s: 1
  /**
   * Value, either the cached result or an error, depending on status.
   */
  v: T
  /**
   * Object cache, a `WeakMap` where non-primitive arguments are stored.
   */
  o: null | WeakMap<Function | Object, CacheNode<T>>
  /**
   * Primitive cache, a regular `Map` where primitive arguments are stored.
   */
  p: null | Map<string | number | null | void | symbol | boolean, CacheNode<T>>
}

type CacheNode<T> = TerminatedCacheNode<T> | UnterminatedCacheNode<T>

function createCacheNode<T>(): CacheNode<T> {
  return {
    s: UNTERMINATED,
    v: undefined,
    o: null,
    p: null
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
   * Bounds how many results are retained for primitive arguments. By default
   * the cache grows without limit: object arguments are held in `WeakMap`s
   * and released by garbage collection, but primitive arguments are held in
   * regular `Map`s and are retained until {@linkcode DefaultMemoizeFields.clearCache clearCache}
   * is called. A selector that keeps seeing new primitive values (IDs,
   * pagination offsets, timestamps) therefore grows without bound.
   *
   * The bound is generational, not an LRU: after `maxSize` results have been
   * cached, the entire cache becomes the "previous generation" and a fresh
   * cache becomes current. Lookups that miss the current cache probe the
   * previous one, and a hit there is copied forward so it survives the next
   * generation change. When the generation changes again, the previous cache
   * is dropped wholesale. In practice this means:
   * - total retention is bounded at roughly `2 * maxSize` results
   * - a result that keeps getting used stays cached indefinitely
   * - a result that goes unused for a full generation is dropped with it,
   *   in one batch, rather than entry by entry
   *
   * Must be a positive integer. There is no cost to the memoized function
   * when this option is not passed.
   *
   * Note that to bound a selector created by `createSelector`, `maxSize`
   * needs to be passed in both `memoizeOptions` and `argsMemoizeOptions` —
   * the arguments cache and the results cache are separate `weakMapMemoize`
   * instances.
   *
   * @since 5.3.0
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
 *   - It has an effectively infinite cache size by default, but you have no control over
 *   how long values are kept in cache as it's based on garbage collection and `WeakMap`s.
 *   Results cached for primitive arguments are retained until `clearCache` is called;
 *   the {@linkcode WeakMapMemoizeOptions.maxSize maxSize} option bounds that growth.
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

  // Generational bounding for `maxSize`: `prevNode` holds the demoted cache
  // tree, `insertionCount` counts primitive-Map insertions into the current
  // tree. Reaching `maxSize` flips generations at the end of that call.
  const useGenerations = maxSize !== undefined
  if (useGenerations && (!Number.isInteger(maxSize) || maxSize < 1)) {
    throw new TypeError(
      `maxSize must be a positive integer, received: ${maxSize}`
    )
  }
  let prevNode: CacheNode<any> | null = null
  let insertionCount = 0

  let lastResult: WeakRef<object> | undefined

  let resultsCount = 0

  let hasWarnedAboutCacheSize = false

  // Flip generations at the end of a call that cached something, never during
  // a walk, so a flip can never happen while pointers into the tree being
  // demoted are still live. The hit path never reaches this.
  function maybeFlipGenerations() {
    if (insertionCount >= (maxSize as number)) {
      prevNode = fnNode
      fnNode = createCacheNode()
      insertionCount = 0
    }
  }

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
          cacheNode = createCacheNode()
          objectCache.set(arg, cacheNode)
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
          cacheNode = createCacheNode()
          primitiveCache.set(arg, cacheNode)
          insertionCount++

          if (process.env.NODE_ENV !== 'production') {
            // A single primitive `Map` growing past the threshold means this
            // function keeps seeing new primitive values in the same argument
            // position, which is the unbounded-growth pattern from #635. The
            // size of one `Map` is checked rather than a total across the
            // tree: `Map`s nested under an object argument's `WeakMap` node
            // are released when that object is collected, so a total would
            // keep phantom counts for entries that are already gone and warn
            // about usage that is actually healthy.
            if (primitiveCache.size > CACHE_SIZE_CHECK_THRESHOLD) {
              const { cacheSizeCheck } = globalDevModeChecks
              if (
                cacheSizeCheck === 'always' ||
                (cacheSizeCheck === 'once' && !hasWarnedAboutCacheSize)
              ) {
                hasWarnedAboutCacheSize = true
                runCacheSizeCheck(primitiveCache.size, func.name)
              }
            }
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
      return cacheNode.v
    }

    // The current tree has no result, but the previous generation might.
    // This probe only runs on a miss, so the hit path above is untouched.
    // A hit here is copied forward into the current node so it survives the
    // next flip, and returned without recomputing.
    if (prevNode !== null) {
      let prevCacheNode: CacheNode<any> | null = prevNode
      for (let i = 0, l = length; i < l; i++) {
        const arg = arguments[i]
        let next: CacheNode<any> | undefined
        if (
          typeof arg === 'function' ||
          (typeof arg === 'object' && arg !== null)
        ) {
          const prevObjectCache: CacheNode<any>['o'] = prevCacheNode.o
          next = prevObjectCache !== null ? prevObjectCache.get(arg) : undefined
        } else {
          const prevPrimitiveCache: CacheNode<any>['p'] = prevCacheNode.p
          next =
            prevPrimitiveCache !== null
              ? prevPrimitiveCache.get(arg)
              : undefined
        }
        if (next === undefined) {
          prevCacheNode = null
          break
        }
        prevCacheNode = next
      }
      if (prevCacheNode !== null && prevCacheNode.s === TERMINATED) {
        const promotedNode = cacheNode as unknown as TerminatedCacheNode<any>
        promotedNode.s = TERMINATED
        promotedNode.v = prevCacheNode.v
        maybeFlipGenerations()
        return prevCacheNode.v
      }
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

        resultsCount !== 0 && resultsCount--
      }

      const needsWeakRef =
        (typeof result === 'object' && result !== null) ||
        typeof result === 'function'

      lastResult = needsWeakRef ? /* @__PURE__ */ new Ref(result) : result
    }

    terminatedNode.s = TERMINATED
    terminatedNode.v = result
    if (useGenerations) {
      maybeFlipGenerations()
    }
    return result
  }

  memoized.clearCache = () => {
    fnNode = createCacheNode()
    prevNode = null
    insertionCount = 0
    memoized.resetResultsCount()
    if (process.env.NODE_ENV !== 'production') {
      hasWarnedAboutCacheSize = false
    }
  }

  memoized.resultsCount = () => resultsCount

  memoized.resetResultsCount = () => {
    resultsCount = 0
  }

  return memoized as Func & Simplify<DefaultMemoizeFields>
}
