import type {
  Selector,
  GetParamsFromSelectors,
  OutputSelector,
  EqualityFn,
  SelectorArray,
  SelectorResultArray
} from './types'

export type {
  Selector,
  GetParamsFromSelectors,
  OutputSelector,
  EqualityFn,
  SelectorArray,
  SelectorResultArray,
  ParametricSelector
} from './types'

export const defaultEqualityCheck: EqualityFn = (a, b): boolean => {
  return a === b
}

function areArgumentsShallowlyEqual(
  equalityCheck: EqualityFn,
  prev: unknown[] | IArguments | null,
  next: unknown[] | IArguments | null
): boolean {
  if (prev === null || next === null || prev.length !== next.length) {
    return false
  }

  // Do this in a for loop (and not a `forEach` or an `every`) so we can determine equality as fast as possible.
  const length = prev.length
  for (let i = 0; i < length; i++) {
    if (!equalityCheck(prev[i], next[i])) {
      return false
    }
  }

  return true
}

export function defaultMemoize<F extends (...args: any[]) => any>(
  func: F,
  equalityCheck: EqualityFn = defaultEqualityCheck
): F {
  let lastArgs: any = null
  let lastResult: any = null
  // we reference arguments instead of spreading them for performance reasons
  return function () {
    if (!areArgumentsShallowlyEqual(equalityCheck, lastArgs, arguments)) {
      // apply arguments instead of spreading for performance.
      // @ts-ignore
      lastResult = func.apply(null, arguments)
    }

    lastArgs = arguments
    return lastResult
  } as F
}

function getDependencies(funcs: unknown[]) {
  const dependencies = Array.isArray(funcs[0]) ? funcs[0] : funcs

  if (!dependencies.every(dep => typeof dep === 'function')) {
    const dependencyTypes = dependencies.map(dep => typeof dep).join(', ')
    throw new Error(
      'Selector creators expect all input-selectors to be functions, ' +
        `instead received the following types: [${dependencyTypes}]`
    )
  }

  return dependencies as SelectorArray
}

type DropFirst<T extends unknown[]> = T extends [unknown, ...infer U]
  ? U
  : never

export function createSelectorCreator<
  F extends (...args: unknown[]) => unknown,
  MemoizeFunction extends (func: F, ...options: any[]) => F,
  MemoizerOptions extends unknown[] = DropFirst<Parameters<MemoizeFunction>>
>(
  memoize: MemoizeFunction,
  ...memoizeOptionsFromArgs: DropFirst<Parameters<MemoizeFunction>>
) {
  // (memoize: MemoizeFunction, ...memoizeOptions: MemoizerOptions) {
  const createSelector = (...funcs: Function[]) => {
    let recomputations = 0

    // Due to the intricacies of rest params, we can't do an optional arg after `...funcs`.
    // So, start by declaring the default value here.
    // (And yes, the words 'memoize' and 'options' appear too many times in this next sequence.)
    let directlyPassedOptions: CreateSelectorOptions<MemoizerOptions> = {
      memoizerOptions: undefined
    }

    // Normally, the result func or "output selector" is the last arg
    let resultFunc = funcs.pop()

    // If the result func is actually an _object_, assume it's our options object
    if (typeof resultFunc === 'object') {
      directlyPassedOptions = resultFunc as any
      // and pop the real result func off
      resultFunc = funcs.pop()
    }

    // Determine which set of options we're using. Prefer options passed directly,
    // but fall back to options given to createSelectorCreator.
    const { memoizerOptions = memoizeOptionsFromArgs } = directlyPassedOptions

    // Simplifying assumption: it's unlikely that the first options arg of the provided memoizer
    // is an array. In most libs I've looked at, it's an equality function or options object.
    // Based on that, if `memoizerOptions` _is_ an array, we assume it's a full
    // user-provided array of options. Otherwise, it must be just the _first_ arg, and so
    // we wrap it in an array so we can apply it.
    const finalMemoizerOptions = Array.isArray(memoizerOptions)
      ? memoizerOptions
      : ([memoizerOptions] as MemoizerOptions)

    const dependencies = getDependencies(funcs)

    // @ts-ignore
    const memoizedResultFunc = memoize(function () {
      recomputations++
      // apply arguments instead of spreading for performance.
      return resultFunc!.apply(null, arguments)
    }, ...finalMemoizerOptions)

    // If a selector is called with the exact same arguments we don't need to traverse our dependencies again.
    // @ts-ignore
    const selector: OutputSelector<any, any, any, any> = memoize(function () {
      const params = []
      const length = dependencies.length

      for (let i = 0; i < length; i++) {
        // apply arguments instead of spreading and mutate a local list of params for performance.
        // @ts-ignore
        params.push(dependencies[i].apply(null, arguments))
      }

      // apply arguments instead of spreading for performance.
      return memoizedResultFunc.apply(null, params)
    })

    selector.resultFunc = resultFunc
    selector.dependencies = dependencies
    selector.recomputations = () => recomputations
    selector.resetRecomputations = () => (recomputations = 0)
    return selector
  }
  // @ts-ignore
  return createSelector as CreateSelectorFunction<MemoizerOptions>
}

interface CreateSelectorOptions<MemoizerOptions extends unknown[]> {
  memoizerOptions: MemoizerOptions[0] | MemoizerOptions
}

interface CreateSelectorFunction<
  MemoizerOptions extends unknown[] = unknown[]
> {
  // Input selectors as separate inline arguments
  <Selectors extends SelectorArray, Result>(
    ...items:
      | [...Selectors, (...args: SelectorResultArray<Selectors>) => Result]
      | [
          ...Selectors,
          (...args: SelectorResultArray<Selectors>) => Result,
          CreateSelectorOptions<MemoizerOptions>
        ]
  ): OutputSelector<
    Selectors,
    Result,
    GetParamsFromSelectors<Selectors>,
    (...args: SelectorResultArray<Selectors>) => Result
  >

  // Input selectors as a separate array
  <Selectors extends SelectorArray, Result>(
    selectors: [...Selectors],
    combiner: (...args: SelectorResultArray<Selectors>) => Result,
    options?: CreateSelectorOptions<MemoizerOptions>
  ): OutputSelector<
    Selectors,
    Result,
    GetParamsFromSelectors<Selectors>,
    (...args: SelectorResultArray<Selectors>) => Result
  >
}

export const createSelector =
  /* #__PURE__ */ createSelectorCreator(defaultMemoize)

type SelectorsObject = { [key: string]: (...args: any[]) => any }

export interface StructuredSelectorCreator {
  <SelectorMap extends SelectorsObject>(
    selectorMap: SelectorMap,
    selectorCreator?: CreateSelectorFunction<any>
  ): (
    state: SelectorMap[keyof SelectorMap] extends (
      state: infer State
    ) => unknown
      ? State
      : never
  ) => {
    [Key in keyof SelectorMap]: ReturnType<SelectorMap[Key]>
  }

  <State, Result = State>(
    selectors: { [K in keyof Result]: Selector<State, Result[K], never> },
    selectorCreator?: CreateSelectorFunction<any>
  ): Selector<State, Result, never>
}

// Manual definition of state and output arguments
export const createStructuredSelector: StructuredSelectorCreator = (
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
  return selectorCreator(
    // @ts-ignore
    objectKeys.map(key => selectors[key]),
    (...values: any[]) => {
      return values.reduce((composition, value, index) => {
        composition[objectKeys[index]] = value
        return composition
      }, {})
    }
  )
}
