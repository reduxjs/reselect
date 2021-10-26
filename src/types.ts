export type Selector<
  S = any,
  R = unknown,
  P extends never | readonly any[] = any[]
> = [P] extends [never] ? (state: S) => R : (state: S, ...params: P) => R

interface OutputSelectorFields<Combiner, Result> {
  resultFunc: Combiner
  memoizedResultFunc: Combiner
  lastResult: () => Result
  dependencies: SelectorArray
  recomputations: () => number
  resetRecomputations: () => number
}

export type OutputSelector<
  S extends SelectorArray,
  Result,
  Params extends readonly any[],
  Combiner
> = Selector<GetStateFromSelectors<S>, Result, Params> &
  OutputSelectorFields<Combiner, Result>

export type ParametricSelector<State, Props, Result> = Selector<
  State,
  Result,
  [Props, ...any]
>

export type OutputParametricSelector<State, Props, Result, Combiner> =
  ParametricSelector<State, Props, Result> &
    OutputSelectorFields<Combiner, Result>

export type SelectorArray = ReadonlyArray<Selector>

type GetStateFromSelector<S> = S extends Selector<infer State> ? State : never
export type GetStateFromSelectors<S extends SelectorArray> =
  // handle two elements at once so this type works for up to 30 selectors
  S extends [infer C1, infer C2, ...infer Other]
    ? Other extends [any]
      ? GetStateFromSelector<C1> &
          GetStateFromSelector<C2> &
          GetStateFromSelectors<Other>
      : GetStateFromSelector<C1> & GetStateFromSelector<C2>
    : S extends [infer Current, ...infer Other]
    ? Other extends [any]
      ? GetStateFromSelector<Current> & GetStateFromSelectors<Other>
      : GetStateFromSelector<Current>
    : S extends (infer Elem)[]
    ? GetStateFromSelector<Elem>
    : never

export type GetParamsFromSelector<S> = S extends Selector<any, any, infer P>
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

type SelectorReturnType<S> = S extends Selector ? ReturnType<S> : never

export type SelectorResultArray<
  Selectors extends SelectorArray,
  Rest extends SelectorArray = Selectors
> =
  // handle two elements at once so this type works for up to 29 selectors, not only up to 15
  Rest extends [infer S1, infer S2, ...infer Remaining]
    ? Remaining extends SelectorArray
      ? [
          SelectorReturnType<S1>,
          SelectorReturnType<S2>,
          ...SelectorResultArray<Selectors, Remaining>
        ]
      : [SelectorReturnType<S1>, SelectorReturnType<S2>]
    : Rest extends [infer S, ...infer Remaining]
    ? Remaining extends SelectorArray
      ? [SelectorReturnType<S>, ...SelectorResultArray<Selectors, Remaining>]
      : [SelectorReturnType<S>]
    : Rest extends ((...args: any) => infer S)[]
    ? S[]
    : []

export type EqualityFn = (a: any, b: any) => boolean
