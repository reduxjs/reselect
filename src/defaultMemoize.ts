import type { EqualityFn } from './types'

export const defaultEqualityCheck: EqualityFn = (a, b): boolean => {
  return a === b
}

function areArgumentsShallowlyEqual(
  equalityCheck: EqualityFn,
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

export interface DefaultMemoizeOptions {
  equalityCheck?: EqualityFn
}

// defaultMemoize now supports a configurable cache size and comparison of the result value.
// Updated behavior based on the `betterMemoize` function from
export function defaultMemoize<F extends (...args: any[]) => any>(
  func: F,
  equalityCheckOrOptions?: EqualityFn | DefaultMemoizeOptions
): F {
  let lastArgs: any = null
  let lastResult: any = null

  const providedOptions =
    typeof equalityCheckOrOptions === 'object'
      ? equalityCheckOrOptions
      : { equalityCheck: equalityCheckOrOptions }

  const { equalityCheck = defaultEqualityCheck } = providedOptions

  // we reference arguments instead of spreading them for performance reasons
  return function () {
    if (!areArgumentsShallowlyEqual(equalityCheck, lastArgs, arguments)) {
      // apply arguments instead of spreading for performance.
      // @ts-ignore
      lastResult = func.apply(null, arguments)
    }

    lastArgs = arguments
    return lastResult
  } as F
}
