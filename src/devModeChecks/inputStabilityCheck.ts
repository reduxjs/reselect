import type { CreateSelectorOptions, UnknownMemoizer } from '@internal/types'

/**
 * Runs a stability check to ensure the input selector results remain stable
 * when provided with the same arguments. This function is designed to detect
 * changes in the output of input selectors, which can impact the performance of memoized selectors.
 *
 * @param inputSelectorResultsObject - An object containing two arrays: `inputSelectorResults` and `inputSelectorResultsCopy`, representing the results of input selectors.
 * @param options - Options object consisting of a `memoize` function and a `memoizeOptions` object.
 * @param inputSelectorArgs - List of arguments being passed to the input selectors.
 */
export const runInputStabilityCheck = (
  inputSelectorResultsObject: {
    inputSelectorResults: unknown[]
    inputSelectorResultsCopy: unknown[]
  },
  options: Required<
    Pick<
      CreateSelectorOptions<UnknownMemoizer, UnknownMemoizer>,
      'memoize' | 'memoizeOptions'
    >
  >,
  inputSelectorArgs: unknown[] | IArguments
) => {
  const { memoize, memoizeOptions } = options
  const { inputSelectorResults, inputSelectorResultsCopy } =
    inputSelectorResultsObject
  const createAnEmptyObject = memoize(() => ({}), ...memoizeOptions)
  // if the memoize method thinks the parameters are equal, these *should* be the same reference
  const areInputSelectorResultsEqual =
    createAnEmptyObject.apply(null, inputSelectorResults) ===
    createAnEmptyObject.apply(null, inputSelectorResultsCopy)
  if (!areInputSelectorResultsEqual) {
    // do we want to log more information about the selector?
    console.warn(
      'An input selector returned a different result when passed same arguments.' +
        '\nThis means your output selector will likely run more frequently than intended.' +
        '\nAvoid returning a new reference inside your input selector, e.g.' +
        '\n`createSelector([(arg1, arg2) => ({ arg1, arg2 })],(arg1, arg2) => {})`',
      {
        arguments: inputSelectorArgs,
        firstInputs: inputSelectorResults,
        secondInputs: inputSelectorResultsCopy
      }
    )
  }
}
