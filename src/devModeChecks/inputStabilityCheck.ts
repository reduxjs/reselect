import type { CreateSelectorOptions, UnknownMemoizer } from '../types'

/**
 * Removes `resultEqualityCheck` from a memoize options object, if present.
 *
 * The stability check memoizes a probe function that returns a new empty object
 * on every call. A `resultEqualityCheck` has no bearing on whether the memoizer
 * considers the *arguments* equal, but leaving it in place means the user's
 * function is called with those empty probe objects, and a value-based check
 * such as `shallowEqual` would report them as equal and suppress the warning.
 *
 * @internal
 */
const withoutResultEqualityCheck = (option: unknown) => {
  if (
    option === null ||
    typeof option !== 'object' ||
    !('resultEqualityCheck' in option)
  ) {
    return option
  }
  const optionCopy: { resultEqualityCheck?: unknown } = { ...option }
  delete optionCopy.resultEqualityCheck
  return optionCopy
}

/**
 * Runs a stability check to ensure the input selector results remain stable
 * when provided with the same arguments. This function is designed to detect
 * changes in the output of input selectors, which can impact the performance of memoized selectors.
 *
 * @param inputSelectorResultsObject - An object containing two arrays: `inputSelectorResults` and `inputSelectorResultsCopy`, representing the results of input selectors.
 * @param options - Options object consisting of a `memoize` function and a `memoizeOptions` object.
 * @param inputSelectorArgs - List of arguments being passed to the input selectors.
 *
 * @see {@link https://reselect.js.org/api/development-only-checks#inputstabilitycheck `inputStabilityCheck`}
 *
 * @since 5.0.0
 * @internal
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
  const probeMemoizeOptions: unknown[] = []
  const { length } = memoizeOptions
  for (let i = 0; i < length; i++) {
    probeMemoizeOptions.push(withoutResultEqualityCheck(memoizeOptions[i]))
  }
  const createAnEmptyObject = memoize(() => ({}), ...probeMemoizeOptions)
  // if the memoize method thinks the parameters are equal, these *should* be the same reference
  const areInputSelectorResultsEqual =
    createAnEmptyObject.apply(null, inputSelectorResults) ===
    createAnEmptyObject.apply(null, inputSelectorResultsCopy)
  if (!areInputSelectorResultsEqual) {
    let stack: string | undefined = undefined
    try {
      throw new Error()
    } catch (e) {
      // eslint-disable-next-line @typescript-eslint/no-extra-semi, no-extra-semi
      ;({ stack } = e as Error)
    }
    console.warn(
      'An input selector returned a different result when passed same arguments.' +
        '\nThis means your output selector will likely run more frequently than intended.' +
        '\nAvoid returning a new reference inside your input selector, e.g.' +
        '\n`createSelector([state => state.todos.map(todo => todo.id)], todoIds => todoIds.length)`',
      {
        arguments: inputSelectorArgs,
        firstInputs: inputSelectorResults,
        secondInputs: inputSelectorResultsCopy,
        stack
      }
    )
  }
}
