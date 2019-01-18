export as namespace Reselect;

export type Selector<S, R> = (state: S) => R;

export type OutputSelector<S, R, C, D> = Selector<S, R> & {
  resultFunc: C;
  dependencies: D;
  recomputations: () => number;
  resetRecomputations: () => number;
};

export type ParametricSelector<S, P, R> = (
  state: S,
  props: P,
  ...args: any[]
) => R;

export type OutputParametricSelector<S, P, R, C, D> = ParametricSelector<
  S,
  P,
  R
> & {
  resultFunc: C;
  dependencies: D;
  recomputations: () => number;
  resetRecomputations: () => number;
};

export function createSelector<S1, R1, T>(
  selector1: Selector<S1, R1>,
  combiner: (res1: R1) => T
): OutputSelector<S1, T, (res1: R1) => T, [Selector<S1, R1>]>;

export function createSelector<S1, R1, T>(
  selectors: [Selector<S1, R1>],
  combiner: (res1: R1) => T
): OutputSelector<S1, T, (res1: R1) => T, [Selector<S1, R1>]>;

export function createSelector<S1, P1, R1, T>(
  selector1: ParametricSelector<S1, P1, R1>,
  combiner: (res1: R1) => T
): OutputParametricSelector<
  S1,
  P1,
  T,
  (res1: R1) => T,
  [ParametricSelector<S1, P1, R1>]
>;

export function createSelector<S1, P1, R1, T>(
  selectors: [ParametricSelector<S1, P1, R1>],
  combiner: (res1: R1) => T
): OutputParametricSelector<
  S1,
  P1,
  T,
  (res1: R1) => T,
  [ParametricSelector<S1, P1, R1>]
>;

/* any number of uniform selectors */
export function createSelector<S, R, T>(
  selectors: Selector<S, R>[],
  combiner: (...res: R[]) => T
): OutputSelector<S, T, (...res: R[]) => T, Selector<S, R>[]>;
export function createSelector<S, P, R, T>(
  selectors: ParametricSelector<S, P, R>[],
  combiner: (...res: R[]) => T
): OutputParametricSelector<
  S,
  P,
  T,
  (...res: R[]) => T,
  ParametricSelector<S, P, R>[]
>;

export function defaultMemoize<F extends Function>(
  func: F,
  equalityCheck?: <T>(a: T, b: T, index: number) => boolean
): F;

export function createSelectorCreator(
  memoize: <F extends Function>(func: F) => F
): typeof createSelector;

export function createSelectorCreator<O1>(
  memoize: <F extends Function>(func: F, option1: O1) => F,
  option1: O1
): typeof createSelector;

export function createSelectorCreator<O1, O2>(
  memoize: <F extends Function>(func: F, option1: O1, option2: O2) => F,
  option1: O1,
  option2: O2
): typeof createSelector;

export function createSelectorCreator<O1, O2, O3>(
  memoize: <F extends Function>(
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
): typeof createSelector;

export function createStructuredSelector<S, T>(
  selectors: { [K in keyof T]: Selector<S, T[K]> },
  selectorCreator?: typeof createSelector
): Selector<S, T>;

export function createStructuredSelector<S, P, T>(
  selectors: { [K in keyof T]: ParametricSelector<S, P, T[K]> },
  selectorCreator?: typeof createSelector
): ParametricSelector<S, P, T>;
