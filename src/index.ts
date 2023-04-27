import type {
  Selector,
  GetParamsFromSelectors,
  OutputSelector,
  SelectorArray,
  SelectorResultArray,
  DropFirst,
  MergeParameters,
  Expand,
  ObjValueTuple,
  Head,
  Tail
} from './types'

export type {
  Selector,
  GetParamsFromSelectors,
  GetStateFromSelectors,
  OutputSelector,
  EqualityFn,
  SelectorArray,
  SelectorResultArray,
  ParametricSelector,
  OutputParametricSelector,
  OutputSelectorFields
} from './types'

import {
  defaultMemoize,
  defaultEqualityCheck,
  DefaultMemoizeOptions
} from './defaultMemoize'

export { defaultMemoize, defaultEqualityCheck }

export type { DefaultMemoizeOptions }

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

export interface CreateSelectorOptions2<
  /** Selectors will eventually accept some function to be memoized */
  F extends (...args: unknown[]) => unknown,
  MemoizeFunction extends (func: F, ...options: any[]) => F,
  ArgsMemoizeFunction extends (
    func: F,
    ...options: any[]
  ) => F = typeof defaultMemoize,
  /** The additional options arguments to the memoizer */
  MemoizeOptions extends unknown[] = DropFirst<Parameters<MemoizeFunction>>,
  ArgsMemoizeOptions extends unknown[] = DropFirst<
    Parameters<ArgsMemoizeFunction>
  >
> {
  memoize?: MemoizeFunction
  memoizeOptions?: MemoizeOptions[0] | MemoizeOptions
  argsMemoize?: ArgsMemoizeFunction
  argsMemoizeOptions?: ArgsMemoizeOptions[0] | ArgsMemoizeOptions
}

// Legacy overload: `memoizeFunction` first
export function createSelectorCreator<
  /** Selectors will eventually accept some function to be memoized */
  F extends (...args: unknown[]) => unknown,
  /** A memoizer such as defaultMemoize that accepts a function + some possible options */
  MemoizeFunction extends (func: F, ...options: any[]) => F,
  /** The additional options arguments to the memoizer */
  MemoizeOptions extends unknown[] = DropFirst<Parameters<MemoizeFunction>>
>(
  memoize: MemoizeFunction,
  ...memoizeOptionsFromArgs: DropFirst<Parameters<MemoizeFunction>>
): CreateSelectorFunction<F, MemoizeFunction, typeof defaultMemoize>

export function createSelectorCreator<
  /** Selectors will eventually accept some function to be memoized */
  F extends (...args: unknown[]) => unknown,
  MemoizeFunction extends (func: F, ...options: any[]) => F,
  ArgsMemoizeFunction extends (
    func: F,
    ...options: any[]
  ) => F = typeof defaultMemoize,
  /** The additional options arguments to the memoizer */
  MemoizeOptions extends unknown[] = DropFirst<Parameters<MemoizeFunction>>,
  ArgsMemoizeOptions extends unknown[] = DropFirst<
    Parameters<ArgsMemoizeFunction>
  >
>(
  creatorOptions: CreateSelectorOptions2<
    F,
    MemoizeFunction,
    ArgsMemoizeFunction
  >
): CreateSelectorFunction<F, MemoizeFunction, ArgsMemoizeFunction>

export function createSelectorCreator<
  F extends (...args: unknown[]) => unknown,
  MemoizeFunction extends (func: F, ...options: any[]) => F,
  ArgsMemoizeFunction extends (func: F, ...options: any[]) => F,
  /** The additional options arguments to the memoizer */
  MemoizeOptions extends unknown[] = DropFirst<Parameters<MemoizeFunction>>,
  ArgsMemoizeOptions extends unknown[] = DropFirst<
    Parameters<ArgsMemoizeFunction>
  >
>(
  memoizeOrOptions: MemoizeFunction | CreateSelectorOptions2<any, any, any>,
  ...memoizeOptionsFromArgs: unknown[]
) {
  let createSelectorCreatorOptions: CreateSelectorOptions2<
    F,
    MemoizeFunction,
    any
  > = {
    memoize: defaultMemoize as MemoizeFunction,
    argsMemoize: defaultMemoize
  }
  if (typeof memoizeOrOptions === 'function') {
    createSelectorCreatorOptions = {
      ...createSelectorCreatorOptions,
      memoize: memoizeOrOptions,
      memoizeOptions: memoizeOptionsFromArgs
    }
  } else {
    createSelectorCreatorOptions = {
      ...createSelectorCreatorOptions,
      ...memoizeOrOptions
    }
  }

  const createSelector = (...funcs: Function[]) => {
    let recomputations = 0
    let lastResult: unknown

    // Due to the intricacies of rest params, we can't do an optional arg after `...funcs`.
    // So, start by declaring the default value here.
    // (And yes, the words 'memoize' and 'options' appear too many times in this next sequence.)
    let directlyPassedOptions: Partial<CreateSelectorOptions2<any, any, any>> =
      {}

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
    const combinedOptions = {
      ...createSelectorCreatorOptions,
      ...directlyPassedOptions
    }

    const {
      memoize,
      memoizeOptions = [],
      argsMemoize,
      argsMemoizeOptions = []
    } = combinedOptions

    // console.log('Options: ', { directlyPassedOptions, memoizeOptionsFromArgs })

    // console.log('Selector options: ', createSelectorOptions)
    const finalMemoizeOptions = ([] as unknown as MemoizeOptions).concat(
      memoizeOptions
    )

    const finalArgsMemoizeOptions = (
      [] as unknown as ArgsMemoizeOptions
    ).concat(argsMemoizeOptions)

    // Simplifying assumption: it's unlikely that the first options arg of the provided memoizer
    // is an array. In most libs I've looked at, it's an equality function or options object.
    // Based on that, if `memoizeOptions` _is_ an array, we assume it's a full
    // user-provided array of options. Otherwise, it must be just the _first_ arg, and so
    // we wrap it in an array so we can apply it.
    // const finalMemoizeOptions = Array.isArray(memoizeOptions)
    //   ? memoizeOptions
    //   : ([memoizeOptions] as MemoizeOptions)

    const dependencies = getDependencies(funcs)

    const memoizedResultFunc = memoize(
      function recomputationWrapper() {
        recomputations++

        // console.log('Recalculating results', { recomputations }, [...arguments])
        // apply arguments instead of spreading for performance.
        return resultFunc!.apply(null, arguments)
      } as F,
      ...finalMemoizeOptions
    )

    // If a selector is called with the exact same arguments we don't need to traverse our dependencies again.
    const selector = argsMemoize(
      function dependenciesChecker() {
        // console.log('Recalculating inputs', [...arguments])
        const params = []
        const length = dependencies.length

        for (let i = 0; i < length; i++) {
          // apply arguments instead of spreading and mutate a local list of params for performance.
          // @ts-ignore
          params.push(dependencies[i].apply(null, arguments))
        }

        // apply arguments instead of spreading for performance.
        lastResult = memoizedResultFunc.apply(null, params)
        return lastResult
      } as F,
      ...finalArgsMemoizeOptions
    )

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
    F,
    MemoizeFunction,
    ArgsMemoizeFunction
  >
}

export interface CreateSelectorOptions<MemoizeOptions extends unknown[]> {
  memoizeOptions: MemoizeOptions[0] | MemoizeOptions
}

/**
 * An instance of createSelector, customized with a given memoize implementation
 */
export interface CreateSelectorFunction<
  F extends (...args: unknown[]) => unknown,
  MemoizeFunction extends (func: F, ...options: any[]) => F,
  ArgsMemoizeFunction extends (func: F, ...options: any[]) => F,
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
  <Selectors extends SelectorArray, Result>(
    ...items: [
      ...Selectors,
      (...args: SelectorResultArray<Selectors>) => Result,
      CreateSelectorOptions2<F, MemoizeFunction, ArgsMemoizeFunction>
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
  <Selectors extends SelectorArray, Result>(
    selectors: [...Selectors],
    combiner: (...args: SelectorResultArray<Selectors>) => Result,
    options?: CreateSelectorOptions<MemoizeOptions>
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
