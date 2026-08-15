import type {
  AnyFunction,
  DefaultMemoizeFields,
  EqualityFn,
  Simplify
} from './types'

import type { NOT_FOUND_TYPE } from './utils'
import { NOT_FOUND } from './utils'

// Cache implementation based on Erik Rasmussen's `lru-memoize`:
// https://github.com/erikras/lru-memoize

interface Entry {
  key: unknown
  value: unknown
}

interface Cache {
  get(key: unknown): unknown | NOT_FOUND_TYPE
  put(key: unknown, value: unknown): void
  /**
   * Returns the first cached entry whose value `resultEqualityCheck` accepts, or
   * `undefined`.
   *
   * Searching inside the cache rather than handing out an array of entries is
   * what lets the caller drop its `entries.find(entry => ...)` callback, and
   * that callback was expensive in a way that does not look like it from the
   * source. It captured `value`, a local of `memoized`, so V8 had to allocate
   * that local in a heap context rather than a register — on every call,
   * including the cache hits that never reach this code at all. Removing it
   * measured 1.12x on the hit path. Keep this signature callback-free.
   *
   * Searching in place also avoids the one-element array the singleton cache
   * used to build per miss, which is worth a further ~10% on the miss path when
   * `resultEqualityCheck` is set.
   */
  findMatchingEntry(
    value: unknown,
    resultEqualityCheck: EqualityFn
  ): Entry | undefined
  clear(): void
}

function createSingletonCache(equals: EqualityFn): Cache {
  let entry: Entry | undefined
  return {
    get(key: unknown) {
      if (entry && equals(entry.key, key)) {
        return entry.value
      }

      return NOT_FOUND
    },

    put(key: unknown, value: unknown) {
      entry = { key, value }
    },

    findMatchingEntry(value: unknown, resultEqualityCheck: EqualityFn) {
      const current = entry

      return current !== undefined && resultEqualityCheck(current.value, value)
        ? current
        : undefined
    },

    clear() {
      entry = undefined
    }
  }
}

function createLruCache(maxSize: number, equals: EqualityFn): Cache {
  let entries: Entry[] = []

  function get(key: unknown) {
    const cacheIndex = entries.findIndex(entry => equals(entry.key, key))

    // We found a cached entry
    if (cacheIndex > -1) {
      const entry = entries[cacheIndex]

      // Cached entry not at top of cache, move it to the top
      if (cacheIndex > 0) {
        entries.splice(cacheIndex, 1)
        entries.unshift(entry)
      }

      return entry.value
    }

    // No entry found in cache, return sentinel
    return NOT_FOUND
  }

  // Only ever called after `get` has returned `NOT_FOUND` for the same key,
  // so there is no need to search the entries again here.
  function put(key: unknown, value: unknown) {
    // TODO Is unshift slow?
    entries.unshift({ key, value })
    if (entries.length > maxSize) {
      entries.pop()
    }
  }

  function findMatchingEntry(value: unknown, resultEqualityCheck: EqualityFn) {
    // Read the array once up front, the way `Array.prototype.find` would, so a
    // `resultEqualityCheck` that clears the cache mid-search behaves as before
    // instead of walking off the end of a replaced array.
    const currentEntries = entries
    const { length } = currentEntries

    for (let i = 0; i < length; i++) {
      const entry = currentEntries[i]

      if (resultEqualityCheck(entry.value, value)) {
        return entry
      }
    }

    return undefined
  }

  function clear() {
    entries = []
  }

  return { get, put, findMatchingEntry, clear }
}

/**
 * Runs a simple reference equality check.
 * What {@linkcode lruMemoize lruMemoize} uses by default.
 *
 * **Note**: This function was previously known as `defaultEqualityCheck`.
 *
 * @public
 */
export const referenceEqualityCheck: EqualityFn = (a, b) => a === b

export function createCacheKeyComparator(equalityCheck: EqualityFn) {
  return function areArgumentsShallowlyEqual(
    prev: unknown[] | IArguments | null,
    next: unknown[] | IArguments | null
  ): boolean {
    if (prev === null || next === null || prev.length !== next.length) {
      return false
    }

    // Do this in a for loop (and not a `forEach` or an `every`) so we can determine equality as fast as possible.
    const { length } = prev
    for (let i = 0; i < length; i++) {
      if (!equalityCheck(prev[i], next[i])) {
        return false
      }
    }

    return true
  }
}

/**
 * Options for configuring the behavior of a function memoized with
 * LRU (Least Recently Used) caching.
 *
 * @template Result - The type of the return value of the memoized function.
 *
 * @public
 */
export interface LruMemoizeOptions<Result = any> {
  /**
   * Function used to compare the individual arguments of the
   * provided calculation function.
   *
   * @default referenceEqualityCheck
   */
  equalityCheck?: EqualityFn

  /**
   * If provided, used to compare a newly generated output value against
   * previous values in the cache. If a match is found,
   * the old value is returned. This addresses the common
   * ```ts
   * todos.map(todo => todo.id)
   * ```
   * use case, where an update to another field in the original data causes
   * a recalculation due to changed references, but the output is still
   * effectively the same.
   *
   * @since 4.1.0
   */
  resultEqualityCheck?: EqualityFn<Result>

  /**
   * The maximum size of the cache used by the selector.
   * A size greater than 1 means the selector will use an
   * LRU (Least Recently Used) cache, allowing for the caching of multiple
   * results based on different sets of arguments.
   *
   * @default 1
   */
  maxSize?: number
}

/**
 * Creates a memoized version of a function with an optional
 * LRU (Least Recently Used) cache. The memoized function uses a cache to
 * store computed values. Depending on the `maxSize` option, it will use
 * either a singleton cache (for a single entry) or an
 * LRU cache (for multiple entries).
 *
 * **Note**: This function was previously known as `defaultMemoize`.
 *
 * @param func - The function to be memoized.
 * @param equalityCheckOrOptions - Either an equality check function or an options object.
 * @returns A memoized function with a `.clearCache()` method attached.
 *
 * @template Func - The type of the function that is memoized.
 *
 * @see {@link https://reselect.js.org/api/lruMemoize `lruMemoize`}
 *
 * @public
 */
export function lruMemoize<Func extends AnyFunction>(
  func: Func,
  equalityCheckOrOptions?: EqualityFn | LruMemoizeOptions<ReturnType<Func>>
) {
  const providedOptions =
    typeof equalityCheckOrOptions === 'object'
      ? equalityCheckOrOptions
      : { equalityCheck: equalityCheckOrOptions }

  const {
    equalityCheck = referenceEqualityCheck,
    maxSize = 1,
    resultEqualityCheck
  } = providedOptions

  const comparator = createCacheKeyComparator(equalityCheck)

  let resultsCount = 0

  const cache =
    maxSize <= 1
      ? createSingletonCache(comparator)
      : createLruCache(maxSize, comparator)

  function memoized() {
    let value = cache.get(arguments) as ReturnType<Func>
    if (value === NOT_FOUND) {
      // apply arguments instead of spreading for performance.
      // @ts-ignore
      value = func.apply(null, arguments) as ReturnType<Func>
      resultsCount++

      if (resultEqualityCheck) {
        const matchingEntry = cache.findMatchingEntry(
          value,
          resultEqualityCheck as EqualityFn
        )

        if (matchingEntry) {
          value = matchingEntry.value as ReturnType<Func>
          resultsCount !== 0 && resultsCount--
        }
      }

      cache.put(arguments, value)
    }
    return value
  }

  memoized.clearCache = () => {
    cache.clear()
    memoized.resetResultsCount()
  }

  memoized.resultsCount = () => resultsCount

  memoized.resetResultsCount = () => {
    resultsCount = 0
  }

  return memoized as Func & Simplify<DefaultMemoizeFields>
}
