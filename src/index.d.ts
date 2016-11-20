export type Selector<S, R> = (state: S) => R;

export type ParametricSelector<S, P, R> = (state: S, props: P) => R;


/* one selector */
export function createSelector<S, R1, T>(
  selector: Selector<S, R1>,
  combiner: (res: R1) => T,
): Selector<S, T>;
export function createSelector<S, P, R1, T>(
  selector: ParametricSelector<S, P, R1>,
  combiner: (res: R1) => T,
): ParametricSelector<S, P, T>;

/* two selectors */
export function createSelector<S, R1, R2, T>(
  selector1: Selector<S, R1>,
  selector2: Selector<S, R2>,
  combiner: (res1: R1, res2: R2) => T,
): Selector<S, T>;
export function createSelector<S, P, R1, R2, T>(
  selector1: ParametricSelector<S, P, R1>,
  selector2: ParametricSelector<S, P, R2>,
  combiner: (res1: R1, res2: R2) => T,
): ParametricSelector<S, P, T>;

/* three selectors */
export function createSelector<S, R1, R2, R3, T>(
  selector1: Selector<S, R1>,
  selector2: Selector<S, R2>,
  selector3: Selector<S, R3>,
  combiner: (res1: R1, res2: R2, res3: R3) => T,
): Selector<S, T>;
export function createSelector<S, P, R1, R2, R3, T>(
  selector1: ParametricSelector<S, P, R1>,
  selector2: ParametricSelector<S, P, R2>,
  selector3: ParametricSelector<S, P, R3>,
  combiner: (res1: R1, res2: R2, res3: R3) => T,
): ParametricSelector<S, P, T>;

/* four selectors */
export function createSelector<S, R1, R2, R3, R4, T>(
  selector1: Selector<S, R1>,
  selector2: Selector<S, R2>,
  selector3: Selector<S, R3>,
  selector4: Selector<S, R4>,
  combiner: (res1: R1, res2: R2, res3: R3, res4: R4) => T,
): Selector<S, T>;
export function createSelector<S, P, R1, R2, R3, R4, T>(
  selector1: ParametricSelector<S, P, R1>,
  selector2: ParametricSelector<S, P, R2>,
  selector3: ParametricSelector<S, P, R3>,
  selector4: ParametricSelector<S, P, R4>,
  combiner: (res1: R1, res2: R2, res3: R3, res4: R4) => T,
): ParametricSelector<S, P, T>;

/* five selectors */
export function createSelector<S, R1, R2, R3, R4, R5, T>(
  selector1: Selector<S, R1>,
  selector2: Selector<S, R2>,
  selector3: Selector<S, R3>,
  selector4: Selector<S, R4>,
  selector5: Selector<S, R5>,
  combiner: (res1: R1, res2: R2, res3: R3, res4: R4, res5: R5) => T,
): Selector<S, T>;
export function createSelector<S, P, R1, R2, R3, R4, R5, T>(
  selector1: ParametricSelector<S, P, R1>,
  selector2: ParametricSelector<S, P, R2>,
  selector3: ParametricSelector<S, P, R3>,
  selector4: ParametricSelector<S, P, R4>,
  selector5: ParametricSelector<S, P, R5>,
  combiner: (res1: R1, res2: R2, res3: R3, res4: R4, res5: R5) => T,
): ParametricSelector<S, P, T>;

/* six selectors */
export function createSelector<S, R1, R2, R3, R4, R5, R6, T>(
  selector1: Selector<S, R1>,
  selector2: Selector<S, R2>,
  selector3: Selector<S, R3>,
  selector4: Selector<S, R4>,
  selector5: Selector<S, R5>,
  selector6: Selector<S, R6>,
  combiner: (res1: R1, res2: R2, res3: R3, res4: R4, res5: R5, res6: R6) => T,
): Selector<S, T>;
export function createSelector<S, P, R1, R2, R3, R4, R5, R6, T>(
  selector1: ParametricSelector<S, P, R1>,
  selector2: ParametricSelector<S, P, R2>,
  selector3: ParametricSelector<S, P, R3>,
  selector4: ParametricSelector<S, P, R4>,
  selector5: ParametricSelector<S, P, R5>,
  selector6: ParametricSelector<S, P, R6>,
  combiner: (res1: R1, res2: R2, res3: R3, res4: R4, res5: R5, res6: R6) => T,
): ParametricSelector<S, P, T>;

/* seven selectors */
export function createSelector<S, R1, R2, R3, R4, R5, R6, R7, T>(
  selector1: Selector<S, R1>,
  selector2: Selector<S, R2>,
  selector3: Selector<S, R3>,
  selector4: Selector<S, R4>,
  selector5: Selector<S, R5>,
  selector6: Selector<S, R6>,
  selector7: Selector<S, R7>,
  combiner: (res1: R1, res2: R2, res3: R3, res4: R4, res5: R5, res6: R6,
             res7: R7) => T,
): Selector<S, T>;
export function createSelector<S, P, R1, R2, R3, R4, R5, R6, R7, T>(
  selector1: ParametricSelector<S, P, R1>,
  selector2: ParametricSelector<S, P, R2>,
  selector3: ParametricSelector<S, P, R3>,
  selector4: ParametricSelector<S, P, R4>,
  selector5: ParametricSelector<S, P, R5>,
  selector6: ParametricSelector<S, P, R6>,
  selector7: ParametricSelector<S, P, R7>,
  combiner: (res1: R1, res2: R2, res3: R3, res4: R4, res5: R5, res6: R6,
             res7: R7) => T,
): ParametricSelector<S, P, T>;

/* eight selectors */
export function createSelector<S, R1, R2, R3, R4, R5, R6, R7, R8, T>(
  selector1: Selector<S, R1>,
  selector2: Selector<S, R2>,
  selector3: Selector<S, R3>,
  selector4: Selector<S, R4>,
  selector5: Selector<S, R5>,
  selector6: Selector<S, R6>,
  selector7: Selector<S, R7>,
  selector8: Selector<S, R8>,
  combiner: (res1: R1, res2: R2, res3: R3, res4: R4, res5: R5, res6: R6,
             res7: R7, res8: R8) => T,
): Selector<S, T>;
export function createSelector<S, P, R1, R2, R3, R4, R5, R6, R7, R8, T>(
  selector1: ParametricSelector<S, P, R1>,
  selector2: ParametricSelector<S, P, R2>,
  selector3: ParametricSelector<S, P, R3>,
  selector4: ParametricSelector<S, P, R4>,
  selector5: ParametricSelector<S, P, R5>,
  selector6: ParametricSelector<S, P, R6>,
  selector7: ParametricSelector<S, P, R7>,
  selector8: ParametricSelector<S, P, R8>,
  combiner: (res1: R1, res2: R2, res3: R3, res4: R4, res5: R5, res6: R6,
             res7: R7, res8: R8) => T,
): ParametricSelector<S, P, T>;

/* rest */
export function createSelector<S, T>(
  selector1: Selector<S, any>,
  selector2: Selector<S, any>,
  selector3: Selector<S, any>,
  selector4: Selector<S, any>,
  selector5: Selector<S, any>,
  selector6: Selector<S, any>,
  selector7: Selector<S, any>,
  selector8: Selector<S, any>,
  ...rest: Function[],
): Selector<S, T>;
export function createSelector<S, P, T>(
  selector1: ParametricSelector<S, P, any>,
  selector2: ParametricSelector<S, P, any>,
  selector3: ParametricSelector<S, P, any>,
  selector4: ParametricSelector<S, P, any>,
  selector5: ParametricSelector<S, P, any>,
  selector6: ParametricSelector<S, P, any>,
  selector7: ParametricSelector<S, P, any>,
  selector8: ParametricSelector<S, P, any>,
  ...rest: Function[],
): ParametricSelector<S, P, T>;

/* array argument */

/* one selector */
export function createSelector<S, R1, T>(
  selectors: [Selector<S, R1>],
  combiner: (res: R1) => T,
): Selector<S, T>;
export function createSelector<S, P, R1, T>(
  selectors: [ParametricSelector<S, P, R1>],
  combiner: (res: R1) => T,
): ParametricSelector<S, P, T>;

/* two selectors */
export function createSelector<S, R1, R2, T>(
  selectors: [Selector<S, R1>,
              Selector<S, R2>],
  combiner: (res1: R1, res2: R2) => T,
): Selector<S, T>;
export function createSelector<S, P, R1, R2, T>(
  selectors: [ParametricSelector<S, P, R1>,
              ParametricSelector<S, P, R2>],
  combiner: (res1: R1, res2: R2) => T,
): ParametricSelector<S, P, T>;

/* three selectors */
export function createSelector<S, R1, R2, R3, T>(
  selectors: [Selector<S, R1>,
              Selector<S, R2>,
              Selector<S, R3>],
  combiner: (res1: R1, res2: R2, res3: R3) => T,
): Selector<S, T>;
export function createSelector<S, P, R1, R2, R3, T>(
  selectors: [ParametricSelector<S, P, R1>,
              ParametricSelector<S, P, R2>,
              ParametricSelector<S, P, R3>],
  combiner: (res1: R1, res2: R2, res3: R3) => T,
): ParametricSelector<S, P, T>;

/* four selectors */
export function createSelector<S, R1, R2, R3, R4, T>(
  selectors: [Selector<S, R1>,
              Selector<S, R2>,
              Selector<S, R3>,
              Selector<S, R4>],
  combiner: (res1: R1, res2: R2, res3: R3, res4: R4) => T,
): Selector<S, T>;
export function createSelector<S, P, R1, R2, R3, R4, T>(
  selectors: [ParametricSelector<S, P, R1>,
              ParametricSelector<S, P, R2>,
              ParametricSelector<S, P, R3>,
              ParametricSelector<S, P, R4>],
  combiner: (res1: R1, res2: R2, res3: R3, res4: R4) => T,
): ParametricSelector<S, P, T>;

/* five selectors */
export function createSelector<S, R1, R2, R3, R4, R5, T>(
  selectors: [Selector<S, R1>,
              Selector<S, R2>,
              Selector<S, R3>,
              Selector<S, R4>,
              Selector<S, R5>],
  combiner: (res1: R1, res2: R2, res3: R3, res4: R4, res5: R5) => T,
): Selector<S, T>;
export function createSelector<S, P, R1, R2, R3, R4, R5, T>(
  selectors: [ParametricSelector<S, P, R1>,
              ParametricSelector<S, P, R2>,
              ParametricSelector<S, P, R3>,
              ParametricSelector<S, P, R4>,
              ParametricSelector<S, P, R5>],
  combiner: (res1: R1, res2: R2, res3: R3, res4: R4, res5: R5) => T,
): ParametricSelector<S, P, T>;

/* six selectors */
export function createSelector<S, R1, R2, R3, R4, R5, R6, T>(
  selectors: [Selector<S, R1>,
              Selector<S, R2>,
              Selector<S, R3>,
              Selector<S, R4>,
              Selector<S, R5>,
              Selector<S, R6>],
  combiner: (res1: R1, res2: R2, res3: R3, res4: R4, res5: R5, res6: R6) => T,
): Selector<S, T>;
export function createSelector<S, P, R1, R2, R3, R4, R5, R6, T>(
  selectors: [ParametricSelector<S, P, R1>,
              ParametricSelector<S, P, R2>,
              ParametricSelector<S, P, R3>,
              ParametricSelector<S, P, R4>,
              ParametricSelector<S, P, R5>,
              ParametricSelector<S, P, R6>],
  combiner: (res1: R1, res2: R2, res3: R3, res4: R4, res5: R5, res6: R6) => T,
): ParametricSelector<S, P, T>;

/* seven selectors */
export function createSelector<S, R1, R2, R3, R4, R5, R6, R7, T>(
  selectors: [Selector<S, R1>,
              Selector<S, R2>,
              Selector<S, R3>,
              Selector<S, R4>,
              Selector<S, R5>,
              Selector<S, R6>,
              Selector<S, R7>],
  combiner: (res1: R1, res2: R2, res3: R3, res4: R4, res5: R5, res6: R6,
             res7: R7) => T,
): Selector<S, T>;
export function createSelector<S, P, R1, R2, R3, R4, R5, R6, R7, T>(
  selectors: [ParametricSelector<S, P, R1>,
              ParametricSelector<S, P, R2>,
              ParametricSelector<S, P, R3>,
              ParametricSelector<S, P, R4>,
              ParametricSelector<S, P, R5>,
              ParametricSelector<S, P, R6>,
              ParametricSelector<S, P, R7>],
  combiner: (res1: R1, res2: R2, res3: R3, res4: R4, res5: R5, res6: R6,
             res7: R7) => T,
): ParametricSelector<S, P, T>;

/* eight and more selectors */
export function createSelector<S, R1, R2, R3, R4, R5, R6, R7, R8, SS extends [
  Selector<S, R1>,
  Selector<S, R2>,
  Selector<S, R3>,
  Selector<S, R4>,
  Selector<S, R5>,
  Selector<S, R6>,
  Selector<S, R7>,
  Selector<S, R8>
] & {[index: number]: Selector<S, any>}, T>(
  selectors: SS,
  combiner: (res1: R1, res2: R2, res3: R3, res4: R4, res5: R5, res6: R6,
             res7: R7, res8: R8, ...rest: any[]) => T,
): Selector<S, T>;
export function createSelector<S, P, R1, R2, R3, R4, R5, R6, R7, R8, SS extends [
  ParametricSelector<S, P, R1>,
  ParametricSelector<S, P, R2>,
  ParametricSelector<S, P, R3>,
  ParametricSelector<S, P, R4>,
  ParametricSelector<S, P, R5>,
  ParametricSelector<S, P, R6>,
  ParametricSelector<S, P, R7>,
  ParametricSelector<S, P, R8>
] & {[index: number]: ParametricSelector<S, P, any>}, T>(
  selectors: SS,
  combiner: (res1: R1, res2: R2, res3: R3, res4: R4, res5: R5, res6: R6,
             res7: R7, res8: R8, ...rest: any[]) => T,
): ParametricSelector<S, P, T>;


export function defaultMemoize<F extends Function>(
  func: F, equalityCheck?: <T>(a: T, b: T, index: number) => boolean,
): F;


export function createSelectorCreator(
  memoize: <F extends Function>(func: F) => F,
): typeof createSelector;

export function createSelectorCreator<O1>(
  memoize: <F extends Function>(func: F,
                                option1: O1) => F,
  option1: O1,
): typeof createSelector;

export function createSelectorCreator<O1, O2>(
  memoize: <F extends Function>(func: F,
                                option1: O1,
                                option2: O2) => F,
  option1: O1,
  option2: O2,
): typeof createSelector;

export function createSelectorCreator<O1, O2, O3>(
  memoize: <F extends Function>(func: F,
                                option1: O1,
                                option2: O2,
                                option3: O3,
                                ...rest: any[]) => F,
  option1: O1,
  option2: O2,
  option3: O3,
  ...rest: any[],
): typeof createSelector;


export function createStructuredSelector<S, T>(
  selectors: {[key: string]: Selector<S, any>},
  selectorCreator?: typeof createSelector,
): Selector<S, T>;
export function createStructuredSelector<S, P, T>(
  selectors: {[key: string]: ParametricSelector<S, P, any>},
  selectorCreator?: typeof createSelector,
): ParametricSelector<S, P, T>;

// todo: for TypeScript 2.1:
// export function createStructuredSelector<S, T>(
//   selectors: {[K in keyof T]: Selector<S, T[K]>},
//   selectorCreator?: typeof createSelector,
// ): Selector<S, T>;
// export function createStructuredSelector<S, P, T>(
//   selectors: {[K in keyof T]: ParametricSelector<S, P, T[K]>},
//   selectorCreator?: typeof createSelector,
// ): ParametricSelector<S, P, T>;
