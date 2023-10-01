import type {
  DropFirst,
  Expand,
  GetParamsFromSelectors,
  Head,
  MergeParameters,
  ObjValueTuple,
  OutputSelector,
  Selector,
  SelectorArray,
  SelectorResultArray,
  Tail
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

import {
  DefaultMemoizeOptions,
  defaultEqualityCheck,
  defaultMemoize
} from './defaultMemoize'

export { autotrackMemoize } from './autotrackMemoize/autotrackMemoize'
export { weakMapMemoize } from './weakMapMemoize'

export { defaultEqualityCheck, defaultMemoize }

export type { DefaultMemoizeOptions }

type StabilityCheck = 'always' | 'once' | 'never'

let globalStabilityCheck: StabilityCheck = 'once'

export function setInputStabilityCheckEnabled(enabled: StabilityCheck) {
  globalStabilityCheck = enabled
}

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

type SetRequired<
  BaseType,
  Keys extends keyof BaseType
> = BaseType extends unknown
  ? Omit<BaseType, Keys> & Required<Pick<BaseType, Keys>>
  : never

type UnknownFunction = (...args: unknown[]) => unknown
type AnyFunction = (...args: any[]) => any
type UnknownMemoizer<F extends UnknownFunction = UnknownFunction> = (
  func: F,
  ...options: any[]
) => F

type AnyMemoizer = <Func extends UnknownFunction>(
  func: Func,
  ...options: any[]
) => Func

type RestParams<F extends AnyFunction> =
  | DropFirst<Parameters<F>>
  | DropFirst<Parameters<F>>[0]

type GetMemoizeOptions<
  // F extends UnknownFunction,
  MemoizeFunction extends AnyMemoizer,
  ArgsMemoizeMethod extends AnyMemoizer = never
> = {
  memoizeMethod: MemoizeFunction
  memoizeOptions?: RestParams<MemoizeFunction>
  inputStabilityCheck?: StabilityCheck
  argsMemoizeMethod?: [ArgsMemoizeMethod] extends [never]
    ? AnyMemoizer
    : ArgsMemoizeMethod
  argsMemoizeOptions?: [ArgsMemoizeMethod] extends [never]
    ? RestParams<typeof defaultMemoize>
    : RestParams<ArgsMemoizeMethod>
}

export function createSelectorCreator<
  // F extends UnknownFunction,
  MemoizeFunction extends AnyMemoizer,
  MemoizeOptions extends unknown[] = DropFirst<Parameters<MemoizeFunction>>,
  ArgsMemoizeMethod extends AnyMemoizer = never
>(
  memoizeOptions: GetMemoizeOptions<MemoizeFunction, ArgsMemoizeMethod>
): CreateSelectorFunction<
  // Parameters<MemoizeFunction>[0],
  MemoizeFunction,
  MemoizeOptions
>

export function createSelectorCreator<
  // F extends UnknownFunction,
  MemoizeFunction extends UnknownMemoizer,
  MemoizeOptions extends unknown[] = DropFirst<Parameters<MemoizeFunction>>
>(
  memoize: MemoizeFunction,
  ...memoizeOptionsFromArgs: DropFirst<Parameters<MemoizeFunction>>
): CreateSelectorFunction<
  // Parameters<MemoizeFunction>[0],
  MemoizeFunction,
  MemoizeOptions
>

export function createSelectorCreator<
  /** Selectors will eventually accept some function to be memoized */
  // F extends UnknownFunction,
  /** A memoizer such as defaultMemoize that accepts a function + some possible options */
  MemoizeFunction extends AnyMemoizer,
  /** The additional options arguments to the memoizer */
  MemoizeOptions extends unknown[] = DropFirst<Parameters<MemoizeFunction>>,
  ArgsMemoizeMethod extends AnyMemoizer = never
>(
  memoizeOrOptions:
    | MemoizeFunction
    | GetMemoizeOptions<MemoizeFunction, ArgsMemoizeMethod>,
  ...memoizeOptionsFromArgs: MemoizeOptions
) {
  const createSelector = (...funcs: Function[]) => {
    let recomputations = 0
    let lastResult: unknown

    // Due to the intricacies of rest params, we can't do an optional arg after `...funcs`.
    // So, start by declaring the default value here.
    // (And yes, the words 'memoize' and 'options' appear too many times in this next sequence.)
    let directlyPassedOptions: CreateSelectorOptions<MemoizeOptions> = {}

    // Normally, the result func or "output selector" is the last arg
    let resultFunc = funcs.pop()

    // If the result func is actually an _object_, assume it's our options object
    if (typeof resultFunc === 'object') {
      directlyPassedOptions = resultFunc as any
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
    const {
      memoizeOptions = typeof memoizeOrOptions === 'function'
        ? memoizeOptionsFromArgs
        : memoizeOrOptions.memoizeOptions,
      inputStabilityCheck,
      memoizeMethod = typeof memoizeOrOptions === 'function'
        ? memoizeOrOptions
        : memoizeOrOptions.memoizeMethod,
      argsMemoizeMethod = typeof memoizeOrOptions === 'function'
        ? defaultMemoize
        : memoizeOrOptions?.argsMemoizeMethod ?? defaultMemoize
    } = directlyPassedOptions

    // Simplifying assumption: it's unlikely that the first options arg of the provided memoizer
    // is an array. In most libs I've looked at, it's an equality function or options object.
    // Based on that, if `memoizeOptions` _is_ an array, we assume it's a full
    // user-provided array of options. Otherwise, it must be just the _first_ arg, and so
    // we wrap it in an array so we can apply it.
    const finalMemoizeOptions = Array.isArray(memoizeOptions)
      ? memoizeOptions
      : ([memoizeOptions] as MemoizeOptions)

    const dependencies = getDependencies(funcs)

    const memoizedResultFunc = memoizeMethod(function recomputationWrapper() {
      recomputations++
      // apply arguments instead of spreading for performance.
      return resultFunc!.apply(null, arguments)
    }, ...finalMemoizeOptions)

    // @ts-ignore
    const makeAnObject: (...args: unknown[]) => object = memoizeMethod(
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
    const selector = argsMemoizeMethod(function dependenciesChecker() {
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
    })

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
    // Parameters<MemoizeFunction>[0],
    MemoizeFunction,
    MemoizeOptions
  >
}

export type CreateSelectorOptions<
  MemoizeOptions extends unknown[],
  MemoizeFunction extends AnyMemoizer = never,
  ArgsMemoizeFunction extends AnyMemoizer = never
> = {
  inputStabilityCheck?: StabilityCheck
  /** A function that takes another function and returns it. */
  memoizeMethod?: [MemoizeFunction] extends [never]
    ? UnknownMemoizer
    : MemoizeFunction
  argsMemoizeMethod?: [ArgsMemoizeFunction] extends [never]
    ? UnknownMemoizer
    : ArgsMemoizeFunction
  memoizeOptions?: [MemoizeFunction] extends [never]
    ? MemoizeOptions[0] | MemoizeOptions
    : RestParams<MemoizeFunction>
  argsMemoizeOptions?: [ArgsMemoizeFunction] extends [never]
    ? RestParams<typeof defaultMemoize>
    : RestParams<ArgsMemoizeFunction>
}

/**
 * An instance of createSelector, customized with a given memoize implementation
 */
export interface CreateSelectorFunction<
  // F extends UnknownFunction,
  MemoizeFunction extends UnknownMemoizer,
  MemoizeOptions extends unknown[] = DropFirst<Parameters<MemoizeFunction>>,
  Keys = Expand<
    Pick<ReturnType<MemoizeFunction>, keyof ReturnType<MemoizeFunction>>
  >
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
    Keys
  > &
    Keys

  /** Input selectors as separate inline arguments with memoizeOptions passed */
  <
    Selectors extends SelectorArray,
    Result,
    MemoizeMethod extends AnyMemoizer = never,
    ArgsMemoizeMethod extends AnyMemoizer = never
  >(
    ...items: [
      ...Selectors,
      (...args: SelectorResultArray<Selectors>) => Result,
      CreateSelectorOptions<MemoizeOptions, MemoizeMethod, ArgsMemoizeMethod>
    ]
  ): OutputSelector<
    Selectors,
    Result,
    (...args: SelectorResultArray<Selectors>) => Result,
    GetParamsFromSelectors<Selectors>,
    Keys
  > &
    Keys

  /** Input selectors as a separate array */
  <
    Selectors extends SelectorArray,
    Result,
    MemoizeMethod extends AnyMemoizer = never,
    ArgsMemoizeMethod extends AnyMemoizer = never
  >(
    selectors: [...Selectors],
    combiner: (...args: SelectorResultArray<Selectors>) => Result,
    options?: CreateSelectorOptions<
      MemoizeOptions,
      MemoizeMethod,
      ArgsMemoizeMethod
    >
  ): OutputSelector<
    Selectors,
    Result,
    (...args: SelectorResultArray<Selectors>) => Result,
    GetParamsFromSelectors<Selectors>,
    Keys
  > &
    Keys
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
    selectorCreator?: CreateSelectorFunction<any, any, any>
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
    selectorCreator?: CreateSelectorFunction<any, any, any>
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
