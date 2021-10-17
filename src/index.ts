export type Selector<
  S = any,
  R = unknown,
  P extends never | readonly any[] = any[]
> = [P] extends [never] ? (state: S) => R : (state: S, ...params: P) => R
export type ParametricSelector<S, P, R> = Selector<S, R, [P, ...any]>
export type OutputSelector<
  S extends SelectorArray,
  Result,
  Params extends readonly any[],
  Combiner
> = Selector<GetStateFromSelectors<S>, Result, Params> & {
  resultFunc: Combiner
  dependencies: SelectorArray
  recomputations: () => number
  resetRecomputations: () => number
}

type SelectorArray = ReadonlyArray<Selector>

type GetStateFromSelector<S> = S extends Selector<infer State> ? State : never
type GetStateFromSelectors<S extends SelectorArray> = S extends [
  infer Current,
  ...infer Other
]
  ? Current extends Selector
    ? Other extends SelectorArray
      ? GetStateFromSelector<Current> | GetStateFromSelectors<Other>
      : GetStateFromSelector<Current>
    : never
  : S extends (infer Elem)[]
  ? GetStateFromSelector<Elem>
  : never

type GetParamsFromSelector<S> = S extends Selector<any, any, infer P>
  ? P extends []
    ? never
    : P
  : never
export type GetParamsFromSelectors<S, Found = never> = S extends SelectorArray
  ? S extends (infer s)[]
    ? GetParamsFromSelector<s>
    : S extends [infer Current, ...infer Rest]
    ? GetParamsFromSelector<Current> extends []
      ? GetParamsFromSelectors<Rest, Found>
      : GetParamsFromSelector<Current>
    : S
  : Found

type SelectorResultArray<
  Selectors extends SelectorArray,
  Rest extends SelectorArray = Selectors
> = Rest extends [infer S, ...infer Remaining]
  ? S extends Selector
    ? Remaining extends SelectorArray
      ? [ReturnType<S>, ...SelectorResultArray<Selectors, Remaining>]
      : [ReturnType<S>]
    : []
  : Rest extends ((...args: any) => infer S)[]
  ? S[]
  : []

export type EqualityFn = (a: any, b: any) => boolean

export const defaultEqualityCheck: EqualityFn = (a, b) => {
  return a === b
}

function areArgumentsShallowlyEqual(
  equalityCheck: EqualityFn,
  prev: unknown[] | IArguments | null,
  next: unknown[] | IArguments | null
) {
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
/*
export function createSelectorCreator(
  memoize: <F extends (...args: any[]) => any>(func: F) => F
): typeof createSelector


export function createSelectorCreator<T>(
  memoize: typeof defaultMemoize,
  equalityCheck: EqualityFn
): typeof createSelector
*/

/*
export function createSelectorCreator<O1>(
  memoize: <F extends (...args: any[]) => any>(func: F, option1: O1) => F,
  option1: O1
): typeof createSelector

export function createSelectorCreator<O1, O2>(
  memoize: <F extends (...args: any[]) => any>(
    func: F,
    option1: O1,
    option2: O2
  ) => F,
  option1: O1,
  option2: O2
): typeof createSelector

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
): typeof createSelector

*/

interface CreateSelectorCreator {
  (
    memoize: <F extends (...args: any[]) => any>(func: F) => F
  ): CreateSelectorFunction

  <O1>(
    memoize: <F extends (...args: any[]) => any>(func: F, option1: O1) => F,
    option1: O1
  ): CreateSelectorFunction

  <O1, O2>(
    memoize: <F extends (...args: any[]) => any>(
      func: F,
      option1: O1,
      option2: O2
    ) => F,
    option1: O1,
    option2: O2
  ): CreateSelectorFunction
}

export function createSelectorCreator<F extends (...args: any[]) => any>(
  memoize: (func: F) => F,
  ...memoizeOptions: Parameters<F>
): typeof createSelector {
  // @ts-ignore
  return (...funcs: Function[]) => {
    let recomputations = 0
    const resultFunc = funcs.pop()
    const dependencies = getDependencies(funcs)

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

/*
type CreateSelectorInline = <Selectors extends SelectorArray, Result>(
  ...items: [...Selectors, (...args: SelectorResultArray<Selectors>) => Result]
) => OutputSelector<
  Selectors,
  Result,
  GetParamsFromSelectors<Selectors>,
  (...args: SelectorResultArray<Selectors>) => Result
>

type CreateSelectorArray = <Selectors extends SelectorArray, Result>(
  selectors: [...Selectors],
  combiner: (...args: SelectorResultArray<Selectors>) => Result
) => OutputSelector<
  Selectors,
  Result,
  GetParamsFromSelectors<Selectors>,
  (...args: SelectorResultArray<Selectors>) => Result
>

type CreateSelectorFunction = CreateSelectorInline | CreateSelectorArray
*/

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
