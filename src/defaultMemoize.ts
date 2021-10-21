import type { EqualityFn } from './types'

// Cache implementation based on Erik Rasmussen's `lru-memoize`:
// https://github.com/erikras/lru-memoize

interface Entry {
  key: unknown
  value: unknown
}

interface Cache {
  get(key: unknown): unknown | undefined
  put(key: unknown, value: unknown): void
  getValues(): unknown[]
  clear(): void
}

function createSingletonCache(equals: EqualityFn): Cache {
  let entry: Entry | undefined
  return {
    get(key: unknown) {
      if (entry && equals(entry.key, key)) {
        return entry.value
      }
    },

    put(key: unknown, value: unknown) {
      entry = { key, value }
    },

    getValues() {
      return entry ? [entry.value] : []
    },

    clear() {
      entry = undefined
    }
  }
}

function createLruCache(maxSize: number, equals: EqualityFn): Cache {
  let entries: Entry[] = []

  function get(key: unknown) {
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

  function put(key: unknown, value: unknown) {
    if (!get(key)) {
      // TODO Is unshift slow?
      entries.unshift({ key, value })
      if (entries.length > maxSize) {
        entries.pop()
      }
    }
  }

  function getValues() {
    return entries.map(entry => entry.value)
  }

  function clear() {
    entries = []
  }

  return { get, put, getValues, clear }
}

export const defaultEqualityCheck: EqualityFn = (a, b): boolean => {
  return a === b
}

export function createCacheKeyComparator(equalityCheck: EqualityFn) {
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

// defaultMemoize now supports a configurable cache size with LRU behavior,
// and optional comparison of the result value with existing values
export function defaultMemoize<F extends (...args: any[]) => any>(
  func: F,
  equalityCheckOrOptions?: EqualityFn | DefaultMemoizeOptions
) {
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

  const cache =
    maxSize === 1
      ? createSingletonCache(comparator)
      : createLruCache(maxSize, comparator)

  // we reference arguments instead of spreading them for performance reasons
  function memoized() {
    let value = cache.get(arguments)
    if (value === undefined) {
      // @ts-ignore
      value = func.apply(null, arguments)

      if (resultEqualityCheck) {
        const existingValues = cache.getValues()
        const matchingValue = existingValues.find(ev =>
          resultEqualityCheck(ev, value)
        )

        if (matchingValue !== undefined) {
          return matchingValue
        }
      }

      cache.put(arguments, value)
    }
    return value
  }

  memoized.clearCache = () => cache.clear()

  return memoized as F & { clearCache: () => void }
}
