// Type definitions for reselect v2.0.2
// Project: https://github.com/rackt/reselect
// Definitions by: Frank Wallis <https://github.com/frankwallis>
// Definitions: https://github.com/borisyankov/DefinitelyTyped

declare namespace Reselect {

    interface Combiner1<T1, TOutput> {
      (arg1: T1): TOutput;
    }

    interface Combiner2<T1, T2, TOutput> {
      (arg1: T1, arg2: T2): TOutput;
    }

    interface Combiner3<T1, T2, T3, TOutput> {
      (arg1: T1, arg2: T2, arg3: T3): TOutput;
    }

    interface Combiner4<T1, T2, T3, T4, TOutput> {
      (arg1: T1, arg2: T2, arg3: T3, arg4: T4): TOutput;
    }

    interface Combiner5<T1, T2, T3, T4, T5, TOutput> {
      (arg1: T1, arg2: T2, arg3: T3, arg4: T4, arg5: T5): TOutput;
    }

    interface Combiner6<T1, T2, T3, T4, T5, T6, TOutput> {
      (arg1: T1, arg2: T2, arg3: T3, arg4: T4, arg5: T5, arg6: T6): TOutput;
    }

    interface Combiner7<T1, T2, T3, T4, T5, T6, T7, TOutput> {
      (arg1: T1, arg2: T2, arg3: T3, arg4: T4, arg5: T5, arg6: T6, arg7: T7): TOutput;
    }

    interface Combiner8<T1, T2, T3, T4, T5, T6, T7, T8, TOutput> {
      (arg1: T1, arg2: T2, arg3: T3, arg4: T4, arg5: T5, arg6: T6, arg7: T7, arg8: T8): TOutput;
    }

    interface Combiner9<T1, T2, T3, T4, T5, T6, T7, T8, T9, TOutput> {
      (arg1: T1, arg2: T2, arg3: T3, arg4: T4, arg5: T5, arg6: T6, arg7: T7, arg8: T8, arg9: T9): TOutput;
    }

    interface Combiner10<T1, T2, T3, T4, T5, T6, T7, T8, T9, T10, TOutput> {
      (arg1: T1, arg2: T2, arg3: T3, arg4: T4, arg5: T5, arg6: T6, arg7: T7, arg8: T8, arg9: T9, arg10: T10): TOutput;
    }

    interface Combiner11<T1, T2, T3, T4, T5, T6, T7, T8, T9, T10, T11, TOutput> {
      (arg1: T1, arg2: T2, arg3: T3, arg4: T4, arg5: T5, arg6: T6, arg7: T7, arg8: T8, arg9: T9, arg10: T10, arg11: T11): TOutput;
    }

    interface Combiner12<T1, T2, T3, T4, T5, T6, T7, T8, T9, T10, T11, T12, TOutput> {
      (arg1: T1, arg2: T2, arg3: T3, arg4: T4, arg5: T5, arg6: T6, arg7: T7, arg8: T8, arg9: T9, arg10: T10, arg11: T11, arg12: T12): TOutput;
    }

    interface Combiner13<T1, T2, T3, T4, T5, T6, T7, T8, T9, T10, T11, T12, T13, TOutput> {
      (arg1: T1, arg2: T2, arg3: T3, arg4: T4, arg5: T5, arg6: T6, arg7: T7, arg8: T8, arg9: T9, arg10: T10, arg11: T11, arg12: T12, arg: T13): TOutput;
    }

    interface Combiner14<T1, T2, T3, T4, T5, T6, T7, T8, T9, T10, T11, T12, T13, T14, TOutput> {
      (arg1: T1, arg2: T2, arg3: T3, arg4: T4, arg5: T5, arg6: T6, arg7: T7, arg8: T8, arg9: T9, arg10: T10, arg11: T11, arg12: T12, arg: T13, arg14: T14): TOutput;
    }

    interface Selector<TInput, TOutput> {
      (state: TInput, props?: any): TOutput;
    }

    interface OutputSelector<TInput, TOutput, TCombiner> {
      (state: TInput, props?: any): TOutput;
      resultFunc?: TCombiner;
    }

    function createSelector<TInput, TOutput, T1>(selector1: Selector<TInput, T1>, combiner: Combiner1<T1, TOutput>): OutputSelector<TInput, TOutput, Combiner1<T1, TOutput>>;
    function createSelector<TInput, TOutput, T1, T2>(selector1: Selector<TInput, T1>, selector2: Selector<TInput, T2>, combiner: Combiner2<T1, T2, TOutput>): OutputSelector<TInput, TOutput, Combiner2<T1, T2, TOutput>>;
    function createSelector<TInput, TOutput, T1, T2, T3>(selector1: Selector<TInput, T1>, selector2: Selector<TInput, T2>, selector3: Selector<TInput, T3>, combiner: Combiner3<T1, T2, T3, TOutput>): OutputSelector<TInput, TOutput, Combiner3<T1, T2, T3, TOutput>>;
    function createSelector<TInput, TOutput, T1, T2, T3, T4>(selector1: Selector<TInput, T1>, selector2: Selector<TInput, T2>, selector3: Selector<TInput, T3>, selector4: Selector<TInput, T4>, combiner: Combiner4<T1, T2, T3, T4, TOutput>): OutputSelector<TInput, TOutput, Combiner4<T1, T2, T3, T4, TOutput>>;
    function createSelector<TInput, TOutput, T1, T2, T3, T4, T5>(selector1: Selector<TInput, T1>, selector2: Selector<TInput, T2>, selector3: Selector<TInput, T3>, selector4: Selector<TInput, T4>, selector5: Selector<TInput, T5>, combiner: Combiner5<T1, T2, T3, T4, T5, TOutput>): OutputSelector<TInput, TOutput, Combiner5<T1, T2, T3, T4, T5, TOutput>>;
    function createSelector<TInput, TOutput, T1, T2, T3, T4, T5, T6>(selector1: Selector<TInput, T1>, selector2: Selector<TInput, T2>, selector3: Selector<TInput, T3>, selector4: Selector<TInput, T4>, selector5: Selector<TInput, T5>, selector6: Selector<TInput, T6>, combiner: Combiner6<T1, T2, T3, T4, T5, T6, TOutput>): OutputSelector<TInput, TOutput, Combiner6<T1, T2, T3, T4, T5, T6, TOutput>>;
    function createSelector<TInput, TOutput, T1, T2, T3, T4, T5, T6, T7>(selector1: Selector<TInput, T1>, selector2: Selector<TInput, T2>, selector3: Selector<TInput, T3>, selector4: Selector<TInput, T4>, selector5: Selector<TInput, T5>, selector6: Selector<TInput, T6>, selector7: Selector<TInput, T7>, combiner: Combiner7<T1, T2, T3, T4, T5, T6, T7, TOutput>): OutputSelector<TInput, TOutput, Combiner7<T1, T2, T3, T4, T5, T6, T7, TOutput>>;
    function createSelector<TInput, TOutput, T1, T2, T3, T4, T5, T6, T7, T8>(selector1: Selector<TInput, T1>, selector2: Selector<TInput, T2>, selector3: Selector<TInput, T3>, selector4: Selector<TInput, T4>, selector5: Selector<TInput, T5>, selector6: Selector<TInput, T6>, selector7: Selector<TInput, T7>, selector8: Selector<TInput, T8>, combiner: Combiner8<T1, T2, T3, T4, T5, T6, T7, T8, TOutput>): OutputSelector<TInput, TOutput, Combiner8<T1, T2, T3, T4, T5, T6, T7, T8, TOutput>>;
    function createSelector<TInput, TOutput, T1, T2, T3, T4, T5, T6, T7, T8, T9>(selector1: Selector<TInput, T1>, selector2: Selector<TInput, T2>, selector3: Selector<TInput, T3>, selector4: Selector<TInput, T4>, selector5: Selector<TInput, T5>, selector6: Selector<TInput, T6>, selector7: Selector<TInput, T7>, selector8: Selector<TInput, T8>, selector9: Selector<TInput, T9>, combiner: Combiner9<T1, T2, T3, T4, T5, T6, T7, T8, T9, TOutput>): OutputSelector<TInput, TOutput, Combiner9<T1, T2, T3, T4, T5, T6, T7, T8, T9, TOutput>>;
    function createSelector<TInput, TOutput, T1, T2, T3, T4, T5, T6, T7, T8, T9, T10>(selector1: Selector<TInput, T1>, selector2: Selector<TInput, T2>, selector3: Selector<TInput, T3>, selector4: Selector<TInput, T4>, selector5: Selector<TInput, T5>, selector6: Selector<TInput, T6>, selector7: Selector<TInput, T7>, selector8: Selector<TInput, T8>, selector9: Selector<TInput, T9>, selector10: Selector<TInput, T10>, combiner: Combiner10<T1, T2, T3, T4, T5, T6, T7, T8, T9, T10, TOutput>): OutputSelector<TInput, TOutput, Combiner10<T1, T2, T3, T4, T5, T6, T7, T8, T9, T10, TOutput>>;
    function createSelector<TInput, TOutput, T1, T2, T3, T4, T5, T6, T7, T8, T9, T10, T11>(selector1: Selector<TInput, T1>, selector2: Selector<TInput, T2>, selector3: Selector<TInput, T3>, selector4: Selector<TInput, T4>, selector5: Selector<TInput, T5>, selector6: Selector<TInput, T6>, selector7: Selector<TInput, T7>, selector8: Selector<TInput, T8>, selector9: Selector<TInput, T9>, selector10: Selector<TInput, T10>, selector11: Selector<TInput, T11>, combiner: Combiner11<T1, T2, T3, T4, T5, T6, T7, T8, T9, T10, T11, TOutput>): OutputSelector<TInput, TOutput, Combiner11<T1, T2, T3, T4, T5, T6, T7, T8, T9, T10, T11, TOutput>>;
    function createSelector<TInput, TOutput, T1, T2, T3, T4, T5, T6, T7, T8, T9, T10, T11, T12>(selector1: Selector<TInput, T1>, selector2: Selector<TInput, T2>, selector3: Selector<TInput, T3>, selector4: Selector<TInput, T4>, selector5: Selector<TInput, T5>, selector6: Selector<TInput, T6>, selector7: Selector<TInput, T7>, selector8: Selector<TInput, T8>, selector9: Selector<TInput, T9>, selector10: Selector<TInput, T10>, selector11: Selector<TInput, T11>, selector12: Selector<TInput, T12>, combiner: Combiner12<T1, T2, T3, T4, T5, T6, T7, T8, T9, T10, T11, T12, TOutput>): OutputSelector<TInput, TOutput, Combiner12<T1, T2, T3, T4, T5, T6, T7, T8, T9, T10, T11, T12, TOutput>>;
    function createSelector<TInput, TOutput, T1, T2, T3, T4, T5, T6, T7, T8, T9, T10, T11, T12, T13>(selector1: Selector<TInput, T1>, selector2: Selector<TInput, T2>, selector3: Selector<TInput, T3>, selector4: Selector<TInput, T4>, selector5: Selector<TInput, T5>, selector6: Selector<TInput, T6>, selector7: Selector<TInput, T7>, selector8: Selector<TInput, T8>, selector9: Selector<TInput, T9>, selector10: Selector<TInput, T10>, selector11: Selector<TInput, T11>, selector12: Selector<TInput, T12>, selector13: Selector<TInput, T13>, combiner: Combiner13<T1, T2, T3, T4, T5, T6, T7, T8, T9, T10, T11, T12, T13, TOutput>): OutputSelector<TInput, TOutput, Combiner13<T1, T2, T3, T4, T5, T6, T7, T8, T9, T10, T11, T12, T13, TOutput>>;
    function createSelector<TInput, TOutput, T1, T2, T3, T4, T5, T6, T7, T8, T9, T10, T11, T12, T13, T14>(selector1: Selector<TInput, T1>, selector2: Selector<TInput, T2>, selector3: Selector<TInput, T3>, selector4: Selector<TInput, T4>, selector5: Selector<TInput, T5>, selector6: Selector<TInput, T6>, selector7: Selector<TInput, T7>, selector8: Selector<TInput, T8>, selector9: Selector<TInput, T9>, selector10: Selector<TInput, T10>, selector11: Selector<TInput, T11>, selector12: Selector<TInput, T12>, selector13: Selector<TInput, T13>, selector14: Selector<TInput, T14>, combiner: Combiner14<T1, T2, T3, T4, T5, T6, T7, T8, T9, T10, T11, T12, T13, T14, TOutput>): OutputSelector<TInput, TOutput, Combiner14<T1, T2, T3, T4, T5, T6, T7, T8, T9, T10, T11, T12, T13, T14, TOutput>>;

    function createStructuredSelector(inputSelectors: any, selectorCreator?: any): any;

    type EqualityChecker = <T>(arg1: T, arg2: T) => boolean;
    type Memoizer = <TFunc extends Function>(func: TFunc, equalityCheck?: EqualityChecker) => TFunc;

    const defaultMemoize: Memoizer;
    function createSelectorCreator(memoize: Memoizer, ...memoizeOptions: any[]): any;
}

export = Reselect;
