import type {
  DropFirst,
  ExtractMemoizerFields,
  GetParamsFromSelectors,
  Head,
  MemoizeOptsFromParams,
  MergeParameters,
  ObjValueTuple,
  OutputSelector,
  Selector,
  SelectorArray,
  SelectorResultArray,
  Tail,
  UnknownMemoizer
} from './types'

export type {
  EqualityFn,
  GetParamsFromSelectors,
  GetStateFromSelectors,
  OutputParametricSelector,
  OutputSelector,
  OutputSelectorFields,
  ParametricSelector,
  Selector,
  SelectorArray,
  SelectorResultArray
} from './types'

import type { DefaultMemoizeOptions } from './defaultMemoize'
import { defaultEqualityCheck, defaultMemoize } from './defaultMemoize'

export { autotrackMemoize } from './autotrackMemoize/autotrackMemoize'
export { weakMapMemoize } from './weakMapMemoize'

export { defaultEqualityCheck, defaultMemoize }

export type { DefaultMemoizeOptions }

type StabilityCheck = 'always' | 'once' | 'never'

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
 * Extracts the "dependencies" / "input selectors" as an array.
 * @param funcs - An array of dependencies
 * @returns An array of selectors.
 */
function getDependencies(funcs: unknown[]) {
  const dependencies = Array.isArray(funcs[0]) ? funcs[0] : funcs

  if (!dependencies.every(dep => typeof dep === 'function')) {
    const dependencyTypes = dependencies
      .map(dep =>
        typeof dep === 'function'
          ? `function ${dep.name || 'unnamed'}()`
          : typeof dep
      )
      .join(', ')

    throw new Error(
      `createSelector expects all input-selectors to be functions, but received the following types: [${dependencyTypes}]`
    )
  }

  return dependencies as SelectorArray
}

/**
 * Can be used to make a customized version of `createSelector`.
 * @param memoizeOptions - An object containing the memoize function and other options for memoization.
 * @param memoizeOptions.memoize - A memoization function that accepts the result function and memoize options.
 * @returns A customized `createSelector` function.
 */
export function createSelectorCreator<
  MemoizeFunction extends UnknownMemoizer,
  ArgsMemoizeFunction extends UnknownMemoizer = typeof defaultMemoize
  // FIXME: unify or intersect this type parameter with `CreateSelectorOptions` to maintain a source of truth.
>(memoizeOptions: {
  inputStabilityCheck?: StabilityCheck
  memoize: MemoizeFunction
  memoizeOptions?: MemoizeOptsFromParams<MemoizeFunction>
  argsMemoize?: [ArgsMemoizeFunction] extends [never]
    ? typeof defaultMemoize
    : ArgsMemoizeFunction
  argsMemoizeOptions?: [ArgsMemoizeFunction] extends [never]
    ? MemoizeOptsFromParams<typeof defaultMemoize>
    : MemoizeOptsFromParams<ArgsMemoizeFunction>
}): CreateSelectorFunction<MemoizeFunction, ArgsMemoizeFunction>

/**
 * Can be used to make a customized version of `createSelector`.
 * @param memoize - A memoization function to replace `defaultMemoize`.
 * @param memoizeOptionsFromArgs - Zero or more configuration options to be passed to the memoize function.
 * The selectors `resultFunc` is passed as the first argument to `memoize` and the `memoizeOptions` are passed as the second argument onwards:
 * @returns A customized `createSelector` function.
 * @example
 * ```
 * const customSelectorCreator = createSelectorCreator(
  customMemoize, // function to be used to memoize resultFunc
  option1, // option1 will be passed as second argument to customMemoize
  option2, // option2 will be passed as third argument to customMemoize
  option3 // option3 will be passed as fourth argument to customMemoize
)

const customSelector = customSelectorCreator(
  input1,
  input2,
  resultFunc // resultFunc will be passed as first argument to customMemoize
)
 * ```
 * @template MemoizeFunction - A memoizer such as `defaultMemoize` that accepts a function + some possible options.
 * @template ArgsMemoizeFunction - The memoizer function used to memoize the arguments of the selector.
 */
export function createSelectorCreator<MemoizeFunction extends UnknownMemoizer>(
  memoize: MemoizeFunction,
  ...memoizeOptionsFromArgs: DropFirst<Parameters<MemoizeFunction>>
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
    | (CreateSelectorOptions<MemoizeFunction, ArgsMemoizeFunction> & {
        memoize: MemoizeFunction
      })
>(
  memoizeOrOptions: MemoizeOrOptions,
  ...memoizeOptionsFromArgs: MemoizeOrOptions extends {
    memoize: MemoizeFunction
  }
    ? []
    : DropFirst<Parameters<MemoizeFunction>>
) {
  // TODO: Might change to if statement.
  const defaultOptions: CreateSelectorOptions<
    MemoizeFunction,
    ArgsMemoizeFunction
  > & { memoize: MemoizeFunction } =
    typeof memoizeOrOptions === 'function'
      ? {
          memoize: memoizeOrOptions as MemoizeFunction,
          memoizeOptions: memoizeOptionsFromArgs
        }
      : memoizeOrOptions

  const createSelector = (...funcs: Function[]) => {
    let recomputations = 0
    let lastResult: unknown

    // Due to the intricacies of rest params, we can't do an optional arg after `...funcs`.
    // So, start by declaring the default value here.
    // (And yes, the words 'memoize' and 'options' appear too many times in this next sequence.)
    let directlyPassedOptions: CreateSelectorOptions<
      MemoizeFunction,
      ArgsMemoizeFunction
    > = {}

    // Normally, the result func or "output selector" is the last arg
    let resultFunc = funcs.pop()

    // If the result func is actually an _object_, assume it's our options object
    if (typeof resultFunc === 'object') {
      directlyPassedOptions = resultFunc
      // and pop the real result func off
      resultFunc = funcs.pop()
    }

    if (typeof resultFunc !== 'function') {
      throw new Error(
        `createSelector expects an output function after the inputs, but received: [${typeof resultFunc}]`
      )
    }

    // Determine which set of options we're using. Prefer options passed directly,
    // but fall back to options given to createSelectorCreator.
    const combinedOptions = { ...defaultOptions, ...directlyPassedOptions }

    const {
      memoize = defaultMemoize,
      memoizeOptions = [],
      argsMemoize = defaultMemoize,
      argsMemoizeOptions = [],
      inputStabilityCheck
    } = combinedOptions

    // Simplifying assumption: it's unlikely that the first options arg of the provided memoizer
    // is an array. In most libs I've looked at, it's an equality function or options object.
    // Based on that, if `memoizeOptions` _is_ an array, we assume it's a full
    // user-provided array of options. Otherwise, it must be just the _first_ arg, and so
    // we wrap it in an array so we can apply it.
    const finalMemoizeOptions = Array.isArray(memoizeOptions)
      ? memoizeOptions
      : [memoizeOptions]

    const finalArgsMemoizeOptions = Array.isArray(argsMemoizeOptions)
      ? argsMemoizeOptions
      : [argsMemoizeOptions]

    const dependencies = getDependencies(funcs)

    const memoizedResultFunc = memoize(function recomputationWrapper() {
      recomputations++
      // apply arguments instead of spreading for performance.
      return resultFunc!.apply(null, arguments)
    }, ...finalMemoizeOptions)

    // @ts-ignore
    const makeAnObject: (...args: unknown[]) => object = memoize(
      // @ts-ignore
      () => ({}),
      ...finalMemoizeOptions
    )

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
      const params = []
      const { length } = dependencies

      for (let i = 0; i < length; i++) {
        // apply arguments instead of spreading and mutate a local list of params for performance.
        // @ts-ignore
        params.push(dependencies[i].apply(null, arguments))
      }

      const finalStabilityCheck = inputStabilityCheck ?? globalStabilityCheck

      if (
        process.env.NODE_ENV !== 'production' &&
        (finalStabilityCheck === 'always' ||
          (finalStabilityCheck === 'once' && firstRun))
      ) {
        const paramsCopy = []

        for (let i = 0; i < length; i++) {
          // make a second copy of the params, to check if we got the same results
          // @ts-ignore
          paramsCopy.push(dependencies[i].apply(null, arguments))
        }

        // if the memoize method thinks the parameters are equal, these *should* be the same reference
        const equal =
          makeAnObject.apply(null, params) ===
          makeAnObject.apply(null, paramsCopy)
        if (!equal) {
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
      lastResult = memoizedResultFunc.apply(null, params)

      return lastResult
    }, ...finalArgsMemoizeOptions)

    Object.assign(selector, {
      resultFunc,
      memoizedResultFunc,
      dependencies,
      lastResult: () => lastResult,
      recomputations: () => recomputations,
      resetRecomputations: () => (recomputations = 0)
    })

    return selector
  }
  // @ts-ignore
  return createSelector as CreateSelectorFunction<
    MemoizeFunction,
    ArgsMemoizeFunction
  >
}

export interface CreateSelectorOptions<
  MemoizeFunction extends UnknownMemoizer,
  ArgsMemoizeFunction extends UnknownMemoizer,
  OverrideMemoizeFunction extends UnknownMemoizer = MemoizeFunction,
  OverrideArgsMemoizeFunction extends UnknownMemoizer = ArgsMemoizeFunction
> {
  inputStabilityCheck?: StabilityCheck
  /** A function that accepts another function and returns it. This function is used to memoize `resultFunc`
   * @example
   * ```
   * const state = {
      todos: [
        { id: 0, completed: false },
        { id: 1, completed: false }
      ]
    }
    const selectTodoIds = createSelector(
      state => state.todos,
      todos => todos.map(t => t.id),
      {
        memoize: defaultMemoize, // function to be used to memoize `resultFunc`
        memoizeOptions: { // These options will be passed as an argument to `memoize`
          maxSize: 2,
          equalityCheck: (a, b) => a === b,
          resultEqualityCheck: (a, b) => a === b
        }
      }
    )
    const todoIds = selectTodoIds(state) // `argsMemoize` is used to memoize the arguments passed to the selector, in this case that would be `state`.
   * ```
  */
  memoize?: [OverrideMemoizeFunction] extends [never] // If `memoize` is not provided inside the options object, fallback to `MemoizeFunction`.
    ? MemoizeFunction
    : OverrideMemoizeFunction
  /** The memoizer function used to memoize the arguments of the selector.
   * @example
   * ```
   * const state = {
      todos: [
        { id: 0, completed: false },
        { id: 1, completed: false }
      ]
    }
    const selectTodoIds = createSelector(
      state => state.todos,
      todos => todos.map(t => t.id),
      {
        argsMemoize: defaultMemoize, // function to be used to memoize arguments passed to the selector.
        argsMemoizeOptions: { // These options will be passed as arguments to `argsMemoize`
          maxSize: 2,
          equalityCheck: (a, b) => a === b,
          resultEqualityCheck: (a, b) => a === b
        }
      }
    )
    const todoIds = selectTodoIds(state) // `argsMemoize` is used to memoize the arguments passed to the selector, in this case that would be `state`.
   * ```
   */
  argsMemoize?: [OverrideArgsMemoizeFunction] extends [never]
    ? ArgsMemoizeFunction
    : OverrideArgsMemoizeFunction
  memoizeOptions?: [OverrideMemoizeFunction] extends [never] // Should dynamically change to the options argument of `memoize`.
    ? MemoizeOptsFromParams<MemoizeFunction>
    : MemoizeOptsFromParams<OverrideMemoizeFunction>
  argsMemoizeOptions?: [OverrideArgsMemoizeFunction] extends [never]
    ? MemoizeOptsFromParams<ArgsMemoizeFunction>
    : MemoizeOptsFromParams<OverrideArgsMemoizeFunction>
}

/**
 * An instance of createSelector, customized with a given memoize implementation
 */
export interface CreateSelectorFunction<
  MemoizeFunction extends UnknownMemoizer,
  ArgsMemoizeFunction extends UnknownMemoizer = typeof defaultMemoize
> {
  /** Input selectors as separate inline arguments */
  <Selectors extends SelectorArray, Result>(
    ...items: [
      ...Selectors,
      (...args: SelectorResultArray<Selectors>) => Result
    ]
  ): OutputSelector<
    Selectors,
    Result,
    (...args: SelectorResultArray<Selectors>) => Result,
    GetParamsFromSelectors<Selectors>,
    ExtractMemoizerFields<MemoizeFunction>
  > &
    ExtractMemoizerFields<ArgsMemoizeFunction>

  /** Input selectors as separate inline arguments with memoizeOptions passed */
  <
    Selectors extends SelectorArray,
    Result,
    OverrideMemoizeFunction extends UnknownMemoizer = MemoizeFunction,
    OverrideArgsMemoizeFunction extends UnknownMemoizer = ArgsMemoizeFunction
  >(
    ...items: [
      ...Selectors,
      (...args: SelectorResultArray<Selectors>) => Result,
      CreateSelectorOptions<
        MemoizeFunction,
        ArgsMemoizeFunction,
        OverrideMemoizeFunction,
        OverrideArgsMemoizeFunction
      >
    ]
  ): OutputSelector<
    Selectors,
    Result,
    (...args: SelectorResultArray<Selectors>) => Result,
    GetParamsFromSelectors<Selectors>,
    ExtractMemoizerFields<OverrideMemoizeFunction>
  > &
    ExtractMemoizerFields<OverrideArgsMemoizeFunction>

  /** Input selectors as a separate array */
  <
    Selectors extends SelectorArray,
    Result,
    OverrideMemoizeFunction extends UnknownMemoizer = MemoizeFunction,
    OverrideArgsMemoizeFunction extends UnknownMemoizer = ArgsMemoizeFunction
  >(
    selectors: [...Selectors],
    combiner: (...args: SelectorResultArray<Selectors>) => Result,
    options?: CreateSelectorOptions<
      MemoizeFunction,
      ArgsMemoizeFunction,
      OverrideMemoizeFunction,
      OverrideArgsMemoizeFunction
    >
  ): OutputSelector<
    Selectors,
    Result,
    (...args: SelectorResultArray<Selectors>) => Result,
    GetParamsFromSelectors<Selectors>,
    ExtractMemoizerFields<OverrideMemoizeFunction>
  > &
    ExtractMemoizerFields<OverrideArgsMemoizeFunction>
}

export const createSelector =
  /* #__PURE__ */ createSelectorCreator(defaultMemoize)

type SelectorsObject = { [key: string]: (...args: any[]) => any }

export interface StructuredSelectorCreator {
  <
    SelectorMap extends SelectorsObject,
    SelectorParams = MergeParameters<ObjValueTuple<SelectorMap>>
  >(
    selectorMap: SelectorMap,
    selectorCreator?: CreateSelectorFunction<any, any>
  ): (
    // Accept an arbitrary number of parameters for all selectors
    // The annoying head/tail bit here is because TS isn't convinced that
    // the `SelectorParams` type is really an array, so we launder things.
    // Plus it matches common usage anyway.
    state: Head<SelectorParams>,
    ...params: Tail<SelectorParams>
  ) => {
    [Key in keyof SelectorMap]: ReturnType<SelectorMap[Key]>
  }

  <State, Result = State>(
    selectors: { [K in keyof Result]: Selector<State, Result[K], never> },
    selectorCreator?: CreateSelectorFunction<any, any>
  ): Selector<State, Result, never>
}

// Manual definition of state and output arguments
export const createStructuredSelector = ((
  selectors: SelectorsObject,
  selectorCreator = createSelector
) => {
  if (typeof selectors !== 'object') {
    throw new Error(
      'createStructuredSelector expects first argument to be an object ' +
        `where each property is a selector, instead received a ${typeof selectors}`
    )
  }
  const objectKeys = Object.keys(selectors)
  const resultSelector = selectorCreator(
    // @ts-ignore
    objectKeys.map(key => selectors[key]),
    (...values: any[]) => {
      return values.reduce((composition, value, index) => {
        composition[objectKeys[index]] = value
        return composition
      }, {})
    }
  )
  return resultSelector
}) as unknown as StructuredSelectorCreator
