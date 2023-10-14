import { defaultMemoize } from './defaultMemoize'
import type {
  Combiner,
  CreateSelectorOptions,
  DropFirstParameter,
  ExtractMemoizerFields,
  OutputSelector,
  Selector,
  SelectorArray,
  StabilityCheck,
  UnknownMemoizer
} from './types'
import { assertIsFunction, ensureIsArray, getDependencies } from './utils'

/**
 * An instance of createSelector, customized with a given memoize implementation
 */
export interface CreateSelectorFunction<
  MemoizeFunction extends UnknownMemoizer,
  ArgsMemoizeFunction extends UnknownMemoizer = typeof defaultMemoize
> {
  /** Input selectors as separate inline arguments */
  <Selectors extends SelectorArray, Result>(
    ...items: [...selectors: Selectors, combiner: Combiner<Selectors, Result>]
  ): OutputSelector<Selectors, Result, MemoizeFunction, ArgsMemoizeFunction>

  /** Input selectors as separate inline arguments with memoizeOptions passed */
  <
    Selectors extends SelectorArray,
    Result,
    OverrideMemoizeFunction extends UnknownMemoizer = MemoizeFunction,
    OverrideArgsMemoizeFunction extends UnknownMemoizer = ArgsMemoizeFunction
  >(
    ...items: [
      ...selectors: Selectors,
      combiner: Combiner<Selectors, Result>,
      options: Partial<
        CreateSelectorOptions<
          MemoizeFunction,
          ArgsMemoizeFunction,
          OverrideMemoizeFunction,
          OverrideArgsMemoizeFunction
        >
      >
    ]
  ): OutputSelector<
    Selectors,
    Result,
    OverrideMemoizeFunction,
    OverrideArgsMemoizeFunction
  >

  /** Input selectors as a separate array */
  <
    Selectors extends SelectorArray,
    Result,
    OverrideMemoizeFunction extends UnknownMemoizer = MemoizeFunction,
    OverrideArgsMemoizeFunction extends UnknownMemoizer = ArgsMemoizeFunction
  >(
    selectors: [...Selectors],
    combiner: Combiner<Selectors, Result>,
    options?: Partial<
      CreateSelectorOptions<
        MemoizeFunction,
        ArgsMemoizeFunction,
        OverrideMemoizeFunction,
        OverrideArgsMemoizeFunction
      >
    >
  ): OutputSelector<
    Selectors,
    Result,
    OverrideMemoizeFunction,
    OverrideArgsMemoizeFunction
  >
}

let globalStabilityCheck: StabilityCheck = 'once'

/**
 * In development, an extra check is conducted on your input selectors.
 * It runs your input selectors an extra time with the same parameters, and warns in console if they return a different result (based on your `memoize` method).
 * @param enabled - Enable or disable `inputStabilityCheck` globally.
 */
export function setInputStabilityCheckEnabled(enabled: StabilityCheck) {
  globalStabilityCheck = enabled
}

/**
 * Can be used to make a customized version of `createSelector`.
 * @param options - An object containing the memoize function and other options for memoization. The `memoize` property is mandatory, the rest are optional.
 * @returns A customized `createSelector` function.
 * @example
 * ```
 * const customCreateSelector = createSelectorCreator({
  memoize: customMemoize, // Function to be used to memoize resultFunc
  memoizeOptions: [memoizeOption1, memoizeOption2], // Options passed to customMemoize as the second argument onwards
  argsMemoize: customArgsMemoize, // Function to be used to memoize the selector's arguments
  argsMemoizeOptions: [argsMemoizeOption1, argsMemoizeOption2] // Options passed to customArgsMemoize as the second argument onwards
  })

const customSelector = customCreateSelector(
  [inputSelector1, inputSelector2],
  resultFunc // resultFunc will be passed as the first argument to customMemoize
)

customSelector(
  ...args // Will be memoized by customArgsMemoize
)
 * ```
 * @template MemoizeFunction - A memoizer such as `defaultMemoize` that is used to memoize the `resultFunc`.
 * @template ArgsMemoizeFunction - A memoizer such as `defaultMemoize` that is used to memoize the selector's arguments. If none is explicitly provided, `defaultMemoize` will be used.
 */
export function createSelectorCreator<
  MemoizeFunction extends UnknownMemoizer,
  ArgsMemoizeFunction extends UnknownMemoizer = typeof defaultMemoize
>(
  options: CreateSelectorOptions<
    MemoizeFunction,
    typeof defaultMemoize,
    never,
    ArgsMemoizeFunction
  >
): CreateSelectorFunction<MemoizeFunction, ArgsMemoizeFunction>

/**
 * Can be used to make a customized version of `createSelector`.
 * @param memoize - A memoization function to replace `defaultMemoize`. It takes the selector's `resultFunc` as its first argument.
 * @param memoizeOptionsFromArgs - Zero or more configuration options to be passed to the memoize function. It is passed into The memoize function as the second argument onwards.
 * @returns A customized `createSelector` function.
 * @example
 * ```
 * const customCreateSelector = createSelectorCreator(
  customMemoize, // Function to be used to memoize resultFunc
  option1, // option1 will be passed as second argument to customMemoize
  option2, // option2 will be passed as third argument to customMemoize
  option3 // option3 will be passed as fourth argument to customMemoize
)

const customSelector = customCreateSelector(
  [inputSelector1, inputSelector2],
  resultFunc // resultFunc will be passed as the first argument to customMemoize
)
 * ```
 * @template MemoizeFunction - A memoizer such as `defaultMemoize` that accepts a function + some possible options.
 */
export function createSelectorCreator<MemoizeFunction extends UnknownMemoizer>(
  memoize: MemoizeFunction,
  ...memoizeOptionsFromArgs: DropFirstParameter<MemoizeFunction>
): CreateSelectorFunction<MemoizeFunction, typeof defaultMemoize>

/**
 * Can be used to make a customized version of `createSelector`.
 * @param memoizeOrOptions - A memoization function to replace `defaultMemoize`. It can also be an options object.
 * @param memoizeOptionsFromArgs - Zero or more configuration options to be passed to the memoize function.
 * The selector's `resultFunc` is passed as the first argument to `memoize` when `memoizeOrOptions` is a function,
 * and the `memoizeOptions` are passed as the second argument onwards.
 * @returns A customized `createSelector` function.
 * @template MemoizeFunction - A memoizer such as `defaultMemoize` that accepts a function + some possible options.
 * @template ArgsMemoizeFunction - The memoizer function used to memoize the arguments of the selector.
 * @template MemoizeOrOptions - A memoization function to replace `defaultMemoize`. It can also be an options object.
 */
export function createSelectorCreator<
  MemoizeFunction extends UnknownMemoizer,
  ArgsMemoizeFunction extends UnknownMemoizer,
  MemoizeOrOptions extends
    | MemoizeFunction
    | CreateSelectorOptions<MemoizeFunction, ArgsMemoizeFunction>
>(
  memoizeOrOptions: MemoizeOrOptions,
  ...memoizeOptionsFromArgs: MemoizeOrOptions extends CreateSelectorOptions<
    MemoizeFunction,
    ArgsMemoizeFunction
  >
    ? never
    : DropFirstParameter<MemoizeFunction>
) {
  const options: CreateSelectorOptions<MemoizeFunction, ArgsMemoizeFunction> =
    typeof memoizeOrOptions === 'function'
      ? {
          memoize: memoizeOrOptions as MemoizeFunction,
          memoizeOptions: memoizeOptionsFromArgs
        }
      : memoizeOrOptions

  const createSelector = <
    Selectors extends SelectorArray,
    Result,
    OverrideMemoizeFunction extends UnknownMemoizer = MemoizeFunction,
    OverrideArgsMemoizeFunction extends UnknownMemoizer = ArgsMemoizeFunction
  >(
    ...funcs: [
      ...selectors: [...Selectors],
      combiner: Combiner<Selectors, Result>,
      options?: Partial<
        CreateSelectorOptions<
          MemoizeFunction,
          ArgsMemoizeFunction,
          OverrideMemoizeFunction,
          OverrideArgsMemoizeFunction
        >
      >
    ]
  ) => {
    let recomputations = 0
    let lastResult: unknown

    // Due to the intricacies of rest params, we can't do an optional arg after `...funcs`.
    // So, start by declaring the default value here.
    // (And yes, the words 'memoize' and 'options' appear too many times in this next sequence.)
    let directlyPassedOptions: Partial<
      CreateSelectorOptions<
        MemoizeFunction,
        ArgsMemoizeFunction,
        OverrideMemoizeFunction,
        OverrideArgsMemoizeFunction
      >
    > = {}

    // Normally, the result func or "output selector" is the last arg
    let resultFunc = funcs.pop() as
      | Combiner<Selectors, Result>
      | Partial<
          CreateSelectorOptions<
            MemoizeFunction,
            ArgsMemoizeFunction,
            OverrideMemoizeFunction,
            OverrideArgsMemoizeFunction
          >
        >

    // If the result func is actually an _object_, assume it's our options object
    if (typeof resultFunc === 'object') {
      directlyPassedOptions = resultFunc
      // and pop the real result func off
      resultFunc = funcs.pop() as Combiner<Selectors, Result>
    }

    assertIsFunction(
      resultFunc,
      `createSelector expects an output function after the inputs, but received: [${typeof resultFunc}]`
    )

    // Determine which set of options we're using. Prefer options passed directly,
    // but fall back to options given to createSelectorCreator.
    const combinedOptions = { ...options, ...directlyPassedOptions }

    const {
      memoize,
      memoizeOptions = [],
      argsMemoize = defaultMemoize,
      argsMemoizeOptions = [],
      inputStabilityCheck = globalStabilityCheck
    } = combinedOptions

    // Simplifying assumption: it's unlikely that the first options arg of the provided memoizer
    // is an array. In most libs I've looked at, it's an equality function or options object.
    // Based on that, if `memoizeOptions` _is_ an array, we assume it's a full
    // user-provided array of options. Otherwise, it must be just the _first_ arg, and so
    // we wrap it in an array so we can apply it.
    const finalMemoizeOptions = ensureIsArray(memoizeOptions)
    const finalArgsMemoizeOptions = ensureIsArray(argsMemoizeOptions)
    const dependencies = getDependencies(funcs) as Selectors

    const memoizedResultFunc = memoize(function recomputationWrapper() {
      recomputations++
      // apply arguments instead of spreading for performance.
      // @ts-ignore
      return resultFunc!.apply(null, arguments)
    }, ...finalMemoizeOptions) as Combiner<Selectors, Result> &
      ExtractMemoizerFields<MemoizeFunction>

    const makeAnObject = memoize(() => ({}), ...finalMemoizeOptions)

    let firstRun = true

    // If a selector is called with the exact same arguments we don't need to traverse our dependencies again.
    // TODO This was changed to `memoize` in 4.0.0 ( #297 ), but I changed it back.
    // The original intent was to allow customizing things like skortchmark's
    // selector debugging setup.
    // But, there's multiple issues:
    // - We don't pass in `memoizeOptions`
    // Arguments change all the time, but input values change less often.
    // Most of the time shallow equality _is_ what we really want here.
    // TODO Rethink this change, or find a way to expose more options?
    const selector = argsMemoize(function dependenciesChecker() {
      /** Return values of input selectors which the `resultFunc` takes as arguments. */
      const params = []
      const { length } = dependencies

      for (let i = 0; i < length; i++) {
        // apply arguments instead of spreading and mutate a local list of params for performance.
        // @ts-ignore
        params.push(dependencies[i].apply(null, arguments))
      }

      if (
        process.env.NODE_ENV !== 'production' &&
        (inputStabilityCheck === 'always' ||
          (inputStabilityCheck === 'once' && firstRun))
      ) {
        const paramsCopy = []

        for (let i = 0; i < length; i++) {
          // make a second copy of the params, to check if we got the same results
          // @ts-ignore
          paramsCopy.push(dependencies[i].apply(null, arguments))
        }

        // if the memoize method thinks the parameters are equal, these *should* be the same reference
        const areParamsEqual =
          makeAnObject.apply(null, params) ===
          makeAnObject.apply(null, paramsCopy)
        if (!areParamsEqual) {
          // do we want to log more information about the selector?
          console.warn(
            'An input selector returned a different result when passed same arguments.' +
              '\nThis means your output selector will likely run more frequently than intended.' +
              '\nAvoid returning a new reference inside your input selector, e.g.' +
              '\n`createSelector([(arg1, arg2) => ({ arg1, arg2 })],(arg1, arg2) => {})`',
            {
              arguments,
              firstInputs: params,
              secondInputs: paramsCopy
            }
          )
        }

        if (firstRun) firstRun = false
      }

      // apply arguments instead of spreading for performance.
      // @ts-ignore
      lastResult = memoizedResultFunc.apply(null, params)

      return lastResult
    }, ...finalArgsMemoizeOptions)

    return Object.assign(selector, {
      resultFunc,
      memoizedResultFunc,
      dependencies,
      lastResult: () => lastResult,
      recomputations: () => recomputations,
      resetRecomputations: () => (recomputations = 0),
      memoize,
      argsMemoize
    })
  }
  return createSelector as unknown as CreateSelectorFunction<
    MemoizeFunction,
    ArgsMemoizeFunction
  >
}

export const createSelector =
  /* #__PURE__ */ createSelectorCreator(defaultMemoize)
