import type { Selector, SelectorArray } from './types'

export function assertIsFunction(
  func: unknown,
  msg = `expected to receive a function, instead received ${typeof func}`
): asserts func is Function {
  if (typeof func !== 'function') {
    throw new TypeError(msg)
  }
}

export const ensureIsArray = <T>(item: T | T[]) => {
  return Array.isArray(item) ? item : [item]
}

/**
 * Extracts the "dependencies" / "input selectors" as an array.
 * @param funcs - An array of dependencies
 * @returns An array of selectors.
 */
export function getDependencies(funcs: unknown[]) {
  const dependencies = Array.isArray(funcs[0]) ? funcs[0] : funcs

  if (
    !dependencies.every((dep): dep is Selector => typeof dep === 'function')
  ) {
    const dependencyTypes = dependencies
      .map(dep =>
        typeof dep === 'function'
          ? `function ${dep.name || 'unnamed'}()`
          : typeof dep
      )
      .join(', ')

    throw new TypeError(
      `createSelector expects all input-selectors to be functions, but received the following types: [${dependencyTypes}]`
    )
  }

  return dependencies as SelectorArray
}
