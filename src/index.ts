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

export function createSelectorCreator(
  memoize: <F extends (...args: any[]) => any>(func: F) => F
): CreateSelectorFunction

export function createSelectorCreator<O1>(
  memoize: <F extends (...args: any[]) => any>(func: F, option1: O1) => F,
  option1: O1
): CreateSelectorFunction

export function createSelectorCreator<O1, O2>(
  memoize: <F extends (...args: any[]) => any>(
    func: F,
    option1: O1,
    option2: O2
  ) => F,
  option1: O1,
  option2: O2
): CreateSelectorFunction

export function createSelectorCreator<O1, O2, O3>(
  memoize: <F extends (...args: any[]) => any>(
    func: F,
    option1: O1,
    option2: O2,
    option3: O3,
    ...rest: any[]
  ) => F,
  option1: O1,
  option2: O2,
  option3: O3,
  ...rest: any[]
): CreateSelectorFunction

export function createSelectorCreator<F extends (...args: any[]) => any>(
  memoize: (func: F, ...options: any[]) => F,
  ...memoizeOptions: any[]
): typeof createSelector {
  // @ts-ignore
  return (...funcs: Function[]) => {
    let recomputations = 0
    const resultFunc = funcs.pop()
    const dependencies = getDependencies(funcs)

    // @ts-ignore
    const memoizedResultFunc = memoize(function () {
      recomputations++
      // apply arguments instead of spreading for performance.
      return resultFunc!.apply(null, arguments)
      // @ts-ignore
    }, ...memoizeOptions)

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
}

interface CreateSelectorFunction {
  <Selectors extends SelectorArray, Result>(
    ...items: [
      ...Selectors,
      (...args: SelectorResultArray<Selectors>) => Result
    ]
  ): OutputSelector<
    Selectors,
    Result,
    GetParamsFromSelectors<Selectors>,
    (...args: SelectorResultArray<Selectors>) => Result
  >

  <Selectors extends SelectorArray, Result>(
    selectors: [...Selectors],
    combiner: (...args: SelectorResultArray<Selectors>) => Result
  ): OutputSelector<
    Selectors,
    Result,
    GetParamsFromSelectors<Selectors>,
    (...args: SelectorResultArray<Selectors>) => Result
  >
}

export const createSelector: CreateSelectorFunction =
  /* #__PURE__ */ createSelectorCreator(defaultMemoize)

type SelectorsObject = { [key: string]: (...args: any[]) => any }

export interface StructuredSelectorCreator {
  <SelectorMap extends SelectorsObject>(
    selectorMap: SelectorMap,
    selectorCreator?: CreateSelectorFunction
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
    selectorCreator?: CreateSelectorFunction
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
