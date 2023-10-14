import type {
  CreateSelectorOptions,
  Selector,
  SelectorArray,
  UnknownMemoizer
} from './types'

export function assertIsFunction<Func extends Function>(
  func: unknown,
  msg = `expected a function, instead received ${typeof func}`
): asserts func is Func {
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
/**
 * @param dependencies - The array of dependencies / "input selectors"
 * @param args - The array of arguments being passed to the input selectors
 * @returns - An array of input selector results.
 */
export function collectInputSelectorResults(
  dependencies: SelectorArray,
  args: unknown[] | IArguments
) {
  const inputSelectorResults = []
  const { length } = dependencies
  for (let i = 0; i < length; i++) {
    // @ts-ignore
    // apply arguments instead of spreading and mutate a local list of params for performance.
    inputSelectorResults.push(dependencies[i].apply(null, args))
  }
  return inputSelectorResults
}

/**
 * @param inputSelectorResults - Original array of input selector results.
 * @param dependencies - Array of input selectors.
 * @param options - Options object consisting of a `memoize` function and `memoizeOptions` object.
 * @param args - List of arguments being passed to the input selectors.
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
  args: unknown[] | IArguments
) {
  const { memoize, memoizeOptions } = options
  const { inputSelectorResults, inputSelectorResultsCopy } =
    inputSelectorResultsObject
  const makeAnObject = memoize(() => ({}), ...memoizeOptions)
  // if the memoize method thinks the parameters are equal, these *should* be the same reference
  const areInputSelectorResultsEqual =
    makeAnObject.apply(null, inputSelectorResults) ===
    makeAnObject.apply(null, inputSelectorResultsCopy)
  if (!areInputSelectorResultsEqual) {
    // do we want to log more information about the selector?
    console.warn(
      'An input selector returned a different result when passed same arguments.' +
        '\nThis means your output selector will likely run more frequently than intended.' +
        '\nAvoid returning a new reference inside your input selector, e.g.' +
        '\n`createSelector([(arg1, arg2) => ({ arg1, arg2 })],(arg1, arg2) => {})`',
      {
        arguments: args,
        firstInputs: inputSelectorResults,
        secondInputs: inputSelectorResultsCopy
      }
    )
  }
}
