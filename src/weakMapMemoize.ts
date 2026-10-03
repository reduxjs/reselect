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
  o: null | WeakMap<Function | object, CacheNode<T>>
  /**
   * Primitive cache, a regular Map where primitive arguments are stored.
   */
  p: null | Map<string | number | null | void | symbol | boolean, CacheNode<T>>
  /**
   * Links, created only with `resultEqualityCheck`, to the previous version of
   * this node's object argument and to the raw value of a replaced result.
   */
  x: null | CacheNodeLinks<T>
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
  o: null | WeakMap<Function | object, CacheNode<T>>
  /**
   * Primitive cache, a regular `Map` where primitive arguments are stored.
   */
  p: null | Map<string | number | null | void | symbol | boolean, CacheNode<T>>
  /**
   * Links, created only with `resultEqualityCheck`, to the previous version of
   * this node's object argument and to the raw value of a replaced result.
   */
  x: null | CacheNodeLinks<T>
}

type CacheNode<T> = TerminatedCacheNode<T> | UnterminatedCacheNode<T>

const NO_RAW: unique symbol = Symbol('NO_RAW')

interface CacheNodeLinks<T> {
  /**
   * Before, a weak reference to the object-keyed sibling created before this
   * node under the same parent: the previous version of this argument.
   * Cleared once a newer sibling links to this node, so without native
   * `WeakRef` the {@linkcode StrongRef} fallback holds at most two versions.
   */
  b: null | WeakRef<CacheNode<T>>
  /**
   * Latest, a weak reference to the newest object-keyed child of this node.
   */
  l: null | WeakRef<CacheNode<T>>
  /**
   * Raw, the value `func` returned before result equality replaced it with an
   * earlier result. A caller's own cache can hand the same object back for
   * the next arguments, which then reuse `v` without comparing.
   */
  r: unknown
}

function createCacheNodeLinks<T>(): CacheNodeLinks<T> {
  return { b: null, l: null, r: NO_RAW }
}

type CacheKey =
  | Parameters<WeakMap<Function | object, unknown>['get']>[0]
  | Parameters<NonNullable<CacheNode<unknown>['p']>['get']>[0]

function createCacheNode<T>(): CacheNode<T> {
  return {
    s: UNTERMINATED,
    v: undefined,
    o: null,
    p: null,
    x: null
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
   * The result cached for the same arguments under the previous version of an
   * object argument is compared first, so interleaved calls such as
   * `(db, id)` for many IDs keep each ID's reference. The last result is
   * compared only by calls that find no such cached result.
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

const isObjectKey = (arg: CacheKey): arg is Function | object =>
  typeof arg === 'function' || (typeof arg === 'object' && arg !== null)

function child(node: CacheNode<unknown>, arg: CacheKey) {
  if (isObjectKey(arg)) {
    return node.o === null ? undefined : node.o.get(arg)
  }
  return node.p === null ? undefined : node.p.get(arg)
}

function walk(
  start: CacheNode<unknown> | undefined,
  args: CacheKey[],
  from: number
) {
  let node = start
  for (let i = from; node !== undefined && i < args.length; i++) {
    node = child(node, args[i])
  }
  return node
}

const deref = <T extends object>(ref: null | WeakRef<T>) =>
  ref === null ? undefined : ref.deref()

const UNMATCHED: unique symbol = Symbol('UNMATCHED')

/**
 * Links a new object-keyed node to the sibling created before it under the
 * same parent, and clears that sibling's own link: only the immediately
 * previous version stays reachable through the links.
 */
function linkPreviousVersion(
  parentNode: CacheNode<unknown>,
  node: CacheNode<unknown>
) {
  let parentLinks = parentNode.x
  if (parentLinks === null) {
    parentNode.x = parentLinks = createCacheNodeLinks()
  }
  const previousNode = deref(parentLinks.l)
  if (previousNode !== undefined && previousNode.x !== null) {
    previousNode.x.b = null
  }
  const links = createCacheNodeLinks<unknown>()
  links.b = parentLinks.l
  node.x = links
  parentLinks.l = /* @__PURE__ */ new Ref(node)
}

/**
 * Compares a computed result with the results cached for the same arguments
 * except one object argument, replaced by its previous version. Walks the
 * object arguments from the first up to the first one this call added to the
 * cache and returns the first equal cached result, {@linkcode UNMATCHED} when
 * candidates exist but none is equal, or `undefined` when there are none. The
 * previous generation of a bounded cache supplies the candidate when the
 * current tree has none.
 */
function findEqualBranchResult<Result>(
  rootNode: CacheNode<unknown>,
  previousRootNode: CacheNode<unknown> | null,
  args: CacheKey[],
  firstNew: number,
  result: Result,
  resultEqualityCheck: EqualityFn<Result>
): Result | typeof UNMATCHED | undefined {
  let found = false
  let node: CacheNode<unknown> | undefined = rootNode
  let previousNode = previousRootNode === null ? undefined : previousRootNode
  const last = Math.min(firstNew, args.length - 1)
  for (let i = 0; node !== undefined && i <= last; i++) {
    const arg = args[i]
    const ownNode = child(node, arg)
    const previousOwnNode =
      previousNode === undefined ? undefined : child(previousNode, arg)
    if (isObjectKey(arg)) {
      let candidate = walk(
        ownNode !== undefined && ownNode.x !== null
          ? deref(ownNode.x.b)
          : undefined,
        args,
        i + 1
      )
      if (candidate === undefined || candidate.s !== TERMINATED) {
        // The previous generation of a bounded cache, when this one has none
        const links =
          previousOwnNode !== undefined
            ? previousOwnNode.x
            : previousNode !== undefined
              ? previousNode.x
              : null
        if (links !== null) {
          candidate = walk(
            deref(previousOwnNode !== undefined ? links.b : links.l),
            args,
            i + 1
          )
        }
      }
      if (
        candidate !== undefined &&
        candidate.s === TERMINATED &&
        candidate.v != null
      ) {
        if (
          candidate.v === result ||
          (candidate.x !== null && candidate.x.r === result) ||
          resultEqualityCheck(candidate.v as Result, result)
        ) {
          return candidate.v as Result
        }
        found = true
      }
    }
    node = ownNode
    previousNode = previousOwnNode
  }
  return found ? UNMATCHED : undefined
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
    const rootNode = fnNode
    let cacheNode = rootNode
    const { length } = arguments
    let firstNew = length
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
          if (firstNew === length) {
            firstNew = i
          }
          if (resultEqualityCheck) {
            linkPreviousVersion(parentNode, cacheNode)
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
          cacheNode = createCacheNode()
          primitiveCache.set(arg, cacheNode)
          if (firstNew === length) {
            firstNew = i
          }
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
        if (prevCacheNode.x !== null && prevCacheNode.x.r !== NO_RAW) {
          if (promotedNode.x === null) {
            promotedNode.x = createCacheNodeLinks()
          }
          promotedNode.x.r = prevCacheNode.x.r
        }
        maybeFlipGenerations()
        return prevCacheNode.v
      }
    }

    const terminatedNode = cacheNode as unknown as TerminatedCacheNode<any>

    // Allow errors to propagate
    let result = func.apply(null, arguments as unknown as any[])
    resultsCount++

    if (resultEqualityCheck) {
      const rawResult = result
      let branchResult: ReturnType<Func> | typeof UNMATCHED | undefined
      // A `clearCache`, or two generation flips, inside `func` dropped the tree
      // this call wrote into, and with it every candidate.
      if (rootNode === fnNode || rootNode === prevNode) {
        // A copy, so that a cache hit never has to allocate `arguments`.
        const args: CacheKey[] = []
        for (let i = 0; i < length; i++) {
          args.push(arguments[i])
        }
        branchResult = findEqualBranchResult(
          rootNode,
          prevNode,
          args,
          firstNew,
          result,
          resultEqualityCheck
        )
      }

      if (branchResult === undefined) {
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
      } else {
        if (branchResult !== UNMATCHED) {
          result = branchResult

          resultsCount !== 0 && resultsCount--
        }
        // Arguments with a previous version never compare against the last
        // result, so none is kept for them: an older one would stay referenced.
        lastResult = undefined
      }

      if (result !== rawResult) {
        if (terminatedNode.x === null) {
          terminatedNode.x = createCacheNodeLinks()
        }
        terminatedNode.x.r = rawResult
      }
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
    lastResult = undefined
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
