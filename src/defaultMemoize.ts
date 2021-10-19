import type { EqualityFn } from './types'

// Cache implementation based on Erik Rasmussen's `lru-memoize`:
// https://github.com/erikras/lru-memoize

interface Entry {
  key: any
  value: any
}

interface Cache {
  get(key: any): Entry | undefined
  put(key: any, value: any): void
}

function createSingletonCache(equals: EqualityFn): Cache {
  let entry: Entry
  return {
    get(key: any) {
      if (entry && equals(entry.key, key)) {
        return entry.value
      }
    },

    put(key: any, value: any) {
      entry = { key, value }
    }
  }
}

function createLruCache(maxSize: number, equals: EqualityFn): Cache {
  const entries: Entry[] = []

  function get(key: any) {
    const cacheIndex = entries.findIndex(entry => equals(key, entry.key))

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

    // No entry found in cache, return null
    return undefined
  }

  function put(key: any, value: any) {
    if (!get(key)) {
      // TODO Is unshift slow?
      entries.unshift({ key, value })
      if (entries.length > maxSize) {
        entries.pop()
      }
    }
  }

  return { get, put }
}

export const defaultEqualityCheck: EqualityFn = (a, b): boolean => {
  return a === b
}

function createCacheKeyComparator(equalityCheck: EqualityFn) {
  return function areArgumentsShallowlyEqual(
    prev: unknown[] | IArguments | null,
    next: unknown[] | IArguments | null
  ): boolean {
    if (prev === null || next === null || prev.length !== next.length) {
      return false
    }

    // Do this in a for loop (and not a `forEach` or an `every`) so we can determine equality as fast as possible.
    const length = prev.length
    for (let i = 0; i < length; i++) {
      if (!equalityCheck(prev[i], next[i])) {
        return false
      }
    }

    return true
  }
}

export interface DefaultMemoizeOptions {
  equalityCheck?: EqualityFn
  resultEqualityCheck?: EqualityFn
  maxSize?: number
}

// defaultMemoize now supports a configurable cache size and comparison of the result value.
// Updated behavior based on the `betterMemoize` function from
export function defaultMemoize<F extends (...args: any[]) => any>(
  func: F,
  equalityCheckOrOptions?: EqualityFn | DefaultMemoizeOptions
): F {
  const providedOptions =
    typeof equalityCheckOrOptions === 'object'
      ? equalityCheckOrOptions
      : { equalityCheck: equalityCheckOrOptions }

  const {
    equalityCheck = defaultEqualityCheck,
    maxSize = 1,
    resultEqualityCheck
  } = providedOptions

  const comparator = createCacheKeyComparator(equalityCheck)
  let resultComparator = resultEqualityCheck
    ? createCacheKeyComparator(resultEqualityCheck)
    : undefined

  const cache =
    maxSize === 1
      ? createSingletonCache(comparator)
      : createLruCache(maxSize, comparator)

  // we reference arguments instead of spreading them for performance reasons
  return function () {
    let value = cache.get(arguments)
    if (value === undefined) {
      // @ts-ignore
      value = func.apply(null, arguments)
      cache.put(arguments, value)
    }
    return value
  } as F
}
