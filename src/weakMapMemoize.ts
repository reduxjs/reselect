// Original source:
// - https://github.com/facebook/react/blob/0b974418c9a56f6c560298560265dcf4b65784bc/packages/react/src/ReactCache.js

import type { AnyFunction } from './types'

const UNTERMINATED = 0
const TERMINATED = 1

interface UnterminatedCacheNode<T> {
  s: 0
  v: void
  o: null | WeakMap<Function | Object, CacheNode<T>>
  p: null | Map<string | number | null | void | symbol | boolean, CacheNode<T>>
}

interface TerminatedCacheNode<T> {
  s: 1
  v: T
  o: null | WeakMap<Function | Object, CacheNode<T>>
  p: null | Map<string | number | null | void | symbol | boolean, CacheNode<T>>
}

type CacheNode<T> = TerminatedCacheNode<T> | UnterminatedCacheNode<T>

function createCacheNode<T>(): CacheNode<T> {
  return {
    s: UNTERMINATED, // status, represents whether the cached computation returned a value or threw an error
    v: undefined, // value, either the cached result or an error, depending on s
    o: null, // object cache, a WeakMap where non-primitive arguments are stored
    p: null // primitive cache, a regular Map where primitive arguments are stored.
  }
}

/**
 * Creates a tree of `WeakMap`-based cache nodes based on the identity of the
 * arguments it's been called with (in this case, the extracted values from your input selectors).
 * This allows `weakmapMemoize` to have an effectively infinite cache size.
 * Cache results will be kept in memory as long as references to the arguments still exist,
 * and then cleared out as the arguments are garbage-collected.
 *
 * __Design Tradeoffs for `weakmapMemoize`:__
 * - Pros:
 *   - It has an effectively infinite cache size, but you have no control over
 *   how long values are kept in cache as it's based on garbage collection and `WeakMap`s.
 * - Cons:
 *   - There's currently no way to alter the argument comparisons.
 *   They're based on strict reference equality.
 *   - It's roughly the same speed as `defaultMemoize`, although likely a fraction slower.
 *
 * __Use Cases for `weakmapMemoize`:__
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
 * const selectTodoById = createSelector(
 *   [
 *     (state: RootState) => state.todos,
 *     (state: RootState, id: number) => id
 *   ],
 *   (todos) => todos[id],
 *   { memoize: weakMapMemoize }
 * )
 * ```
 *
 * @example
 * <caption>Using `createSelectorCreator`</caption>
 * ```ts
 * import { createSelectorCreator, weakMapMemoize } from 'reselect'
 *
 * const createSelectorWeakmap = createSelectorCreator(weakMapMemoize)
 *
 * const selectTodoById = createSelectorWeakmap(
 *   [
 *     (state: RootState) => state.todos,
 *     (state: RootState, id: number) => id
 *   ],
 *   (todos) => todos[id]
 * )
 * ```
 *
 * @template Func - The type of the function that is memoized.
 *
 * @since 5.0.0
 * @public
 * @experimental
 */
export function weakMapMemoize<Func extends AnyFunction>(func: Func) {
  // we reference arguments instead of spreading them for performance reasons

  let fnNode = createCacheNode()

  function memoized() {
    let cacheNode = fnNode

    for (let i = 0, l = arguments.length; i < l; i++) {
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
        } else {
          cacheNode = primitiveNode
        }
      }
    }
    if (cacheNode.s === TERMINATED) {
      return cacheNode.v
    }
    // Allow errors to propagate
    const result = func.apply(null, arguments as unknown as any[])
    const terminatedNode = cacheNode as unknown as TerminatedCacheNode<any>
    terminatedNode.s = TERMINATED
    terminatedNode.v = result
    return result
  }

  memoized.clearCache = () => {
    fnNode = createCacheNode()
  }

  return memoized as Func & { clearCache: () => void }
}
