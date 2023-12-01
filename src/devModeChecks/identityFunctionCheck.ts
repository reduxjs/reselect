import type { AnyFunction } from '../types'

/**
 * Runs a check to determine if the given result function behaves as an
 * identity function. An identity function is one that returns its
 * input unchanged, for example, `x => x`. This check helps ensure
 * efficient memoization and prevent unnecessary re-renders by encouraging
 * proper use of transformation logic in result functions and
 * extraction logic in input selectors.
 *
 * @param resultFunc - The result function to be checked.
 */
export const runIdentityFunctionCheck = (resultFunc: AnyFunction) => {
  let isInputSameAsOutput = false
  try {
    const emptyObject = {}
    if (resultFunc(emptyObject) === emptyObject) isInputSameAsOutput = true
  } catch {
    // Do nothing
  }
  if (isInputSameAsOutput) {
    console.warn(
      'The result function returned its own inputs without modification. e.g' +
        '\n`createSelector([state => state.todos], todos => todos)`' +
        '\nThis could lead to inefficient memoization and unnecessary re-renders.' +
        '\nEnsure transformation logic is in the result function, and extraction logic is in the input selectors.'
    )
  }
}