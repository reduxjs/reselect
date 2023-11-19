import type {
  CreateSelectorOptions,
  Selector,
  SelectorArray,
  StabilityCheckFrequency,
  UnknownMemoizer
} from './types'

/**
 * Assert that the provided value is a function. If the assertion fails,
 * a `TypeError` is thrown with an optional custom error message.
 *
 * @param func - The value to be checked.
 * @param  errorMessage - An optional custom error message to use if the assertion fails.
 * @throws A `TypeError` if the assertion fails.
 */
export function assertIsFunction<FunctionType extends Function>(
  func: unknown,
  errorMessage = `expected a function, instead received ${typeof func}`
): asserts func is FunctionType {
  if (typeof func !== 'function') {
    throw new TypeError(errorMessage)
  }
}

/**
 * Assert that the provided value is an object. If the assertion fails,
 * a `TypeError` is thrown with an optional custom error message.
 *
 * @param object - The value to be checked.
 * @param  errorMessage - An optional custom error message to use if the assertion fails.
 * @throws A `TypeError` if the assertion fails.
 */
export function assertIsObject<ObjectType extends Record<string, unknown>>(
  object: unknown,
  errorMessage = `expected an object, instead received ${typeof object}`
): asserts object is ObjectType {
  if (typeof object !== 'object') {
    throw new TypeError(errorMessage)
  }
}

/**
 * Assert that the provided array is an array of functions. If the assertion fails,
 * a `TypeError` is thrown with an optional custom error message.
 *
 * @param array - The array to be checked.
 * @param  errorMessage - An optional custom error message to use if the assertion fails.
 * @throws A `TypeError` if the assertion fails.
 */
export function assertIsArrayOfFunctions<FunctionType extends Function>(
  array: unknown[],
  errorMessage = `expected all items to be functions, instead received the following types: `
): asserts array is FunctionType[] {
  if (
    !array.every((item): item is FunctionType => typeof item === 'function')
  ) {
    const itemTypes = array
      .map(item =>
        typeof item === 'function'
          ? `function ${item.name || 'unnamed'}()`
          : typeof item
      )
      .join(', ')
    throw new TypeError(`${errorMessage}[${itemTypes}]`)
  }
}

/**
 * Ensure that the input is an array. If it's already an array, it's returned as is.
 * If it's not an array, it will be wrapped in a new array.
 *
 * @param item - The item to be checked.
 * @returns An array containing the input item. If the input is already an array, it's returned without modification.
 */
export const ensureIsArray = <T>(item: T | T[]) => {
  return Array.isArray(item) ? item : [item]
}

/**
 * Extracts the "dependencies" / "input selectors" from the arguments of `createSelector`.
 *
 * @param createSelectorArgs - Arguments passed to `createSelector` as an array.
 * @returns An array of "input selectors" / "dependencies".
 * @throws A `TypeError` if any of the input selectors is not function.
 */
export function getDependencies(createSelectorArgs: unknown[]) {
  const dependencies = Array.isArray(createSelectorArgs[0])
    ? createSelectorArgs[0]
    : createSelectorArgs

  assertIsArrayOfFunctions<Selector>(
    dependencies,
    `createSelector expects all input-selectors to be functions, but received the following types: `
  )

  return dependencies as SelectorArray
}

/**
 * Runs each input selector and returns their collective results as an array.
 *
 * @param dependencies - An array of "dependencies" or "input selectors".
 * @param inputSelectorArgs - An array of arguments being passed to the input selectors.
 * @returns An array of input selector results.
 */
export function collectInputSelectorResults(
  dependencies: SelectorArray,
  inputSelectorArgs: unknown[] | IArguments
) {
  const inputSelectorResults = []
  const { length } = dependencies
  for (let i = 0; i < length; i++) {
    // @ts-ignore
    // apply arguments instead of spreading and mutate a local list of params for performance.
    inputSelectorResults.push(dependencies[i].apply(null, inputSelectorArgs))
  }
  return inputSelectorResults
}

/**
 * Run a stability check to ensure the input selector results remain stable
 * when provided with the same arguments. This function is designed to detect
 * changes in the output of input selectors, which can impact the performance of memoized selectors.
 *
 * @param inputSelectorResultsObject - An object containing two arrays: `inputSelectorResults` and `inputSelectorResultsCopy`, representing the results of input selectors.
 * @param options - Options object consisting of a `memoize` function and a `memoizeOptions` object.
 * @param inputSelectorArgs - List of arguments being passed to the input selectors.
 */
export function runStabilityCheck(
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
) {
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

/**
 * Determines if the input stability check should run.
 *
 * @param inputStabilityCheck - The frequency of the input stability check.
 * @param firstRun - Indicates whether it is the first time the selector has run.
 * @returns true if the input stability check should run, otherwise false.
 */
export const shouldRunInputStabilityCheck = (
  inputStabilityCheck: StabilityCheckFrequency,
  firstRun: boolean
) => {
  return (
    inputStabilityCheck === 'always' ||
    (inputStabilityCheck === 'once' && firstRun)
  )
}
