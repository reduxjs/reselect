import type { List, Any, Misc, Object } from 'ts-toolbelt'

/** A standard selector function, which takes three generic type arguments:
 * @param State The first value, often a Redux root state object
 * @param Result The final result returned by the selector
 * @param Params All additional arguments passed into the selector
 */
export type Selector<
  // The state can be anything
  State = any,
  // The result will be inferred
  Result = unknown,
  // There are either 0 params, or N params
  Params extends never | readonly any[] = any[]
  // If there are 0 params, type the function as just State in, Result out.
  // Otherwise, type it as State + Params in, Result out.
> = [Params] extends [never]
  ? (state: State) => Result
  : (state: State, ...params: Params) => Result
// > = (...params: Params) => Result

/** Selectors generated by Reselect have several additional fields attached: */
interface OutputSelectorFields<Combiner, Result> {
  /** The final function passed to `createSelector` */
  resultFunc: Combiner
  /** The same function, memoized */
  memoizedResultFunc: Combiner
  /** Returns the last result calculated by the selector */
  lastResult: () => Result
  /** An array of the input selectors */
  dependencies: SelectorArray
  /** Counts the number of times the output has been recalculated */
  recomputations: () => number
  /** Resets the count of recomputations count to 0 */
  resetRecomputations: () => number
}

/** Represents the actual selectors generated by `createSelector`.
 * The selector is:
 * - "a function that takes this state + params and returns a result"
 * - plus the attached additional fields
 */
export type OutputSelector<
  S extends SelectorArray,
  Result,
  Combiner,
  Params extends readonly any[] = never // MergeParameters<S>
> = Selector<GetStateFromSelectors<S>, Result, Params> &
  OutputSelectorFields<Combiner, Result>

/** A selector that is assumed to have one additional argument, such as
 * the props from a React component
 */
export type ParametricSelector<State, Props, Result> = Selector<
  State,
  Result,
  [Props, ...any]
>

/** A generated selector that is assumed to have one additional argument */
export type OutputParametricSelector<State, Props, Result, Combiner> =
  ParametricSelector<State, Props, Result> &
    OutputSelectorFields<Combiner, Result>

/** An array of input selectors */
export type SelectorArray = ReadonlyArray<Selector>

export type GetStateFromSelectors<S extends SelectorArray> = // Head<
  MergeParameters<S>[0]
// >

type EmptyObject = {
  [K in any]: never
}

export type Tail42<A> = A extends [any, ...infer Rest] ? Rest : never

export type GetParamsFromSelectors<
  S extends SelectorArray,
  RemainingItems extends readonly unknown[] = Tail42<MergeParameters<S>>
  // >
  // This seems to default to an array containing an empty object, which is
  // not meaningful and causes problems with the `Selector/OutputSelector` types.
  // Force it to have a meaningful value, or cancel it out.
> = RemainingItems extends [EmptyObject] ? never : RemainingItems

export type UnknownFunction = (...args: any[]) => any

export type ExtractParams<T extends readonly UnknownFunction[]> = {
  [index in keyof T]: T[index] extends T[number] ? Parameters<T[index]> : never
}

export type ExtractReturnType<T extends readonly UnknownFunction[]> = {
  [index in keyof T]: T[index] extends T[number] ? ReturnType<T[index]> : never
}

type ExtractArray<A extends unknown[], T extends { [key: number]: any }> = {
  [index in keyof T & keyof A]: T[index] extends T[number] ? T[index] : never
}

export type ExpandItems<T extends readonly unknown[]> = {
  [index in keyof T]: T[index] extends T[number]
    ? Any.Compute<T[index], 'deep'>
    : never
}

export type Head<T extends any[]> = T extends [any, ...any[]] ? T[0] : never
export type Tail<T extends any[]> = ((...t: T) => any) extends (
  _: any,
  ...tail: infer U
) => any
  ? U
  : []

type AllArrayKeys<A extends readonly any[]> = A extends any
  ? {
      [K in keyof A]: K
    }[number]
  : never

type Mapped<A extends readonly any[]> = AllArrayKeys<A> extends infer Keys
  ? A extends any
    ? {
        [K in Keys & (string | number)]: K extends keyof A ? A[K] : unknown
      }
    : never
  : never

type Id<T> = { [K in keyof T]: T[K] } & {}

/*
export type UnionToIntersection<U> = (
  U extends any ? (k: U) => void : never
) extends (k: infer I) => void
  ? I
  : never
*/
export type UnionToIntersection<Union> = (
  // `extends unknown` is always going to be the case and is used to convert the
  // `Union` into a [distributive conditional
  // type](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-2-8.html#distributive-conditional-types).
  Union extends unknown
    ? // The union type is used as the only argument to a function since the union
      // of function arguments is an intersection.
      (distributedUnion: Union) => void
    : // This won't happen.
      never
      // Infer the `Intersection` type since TypeScript represents the positional
      // arguments of unions of functions as an intersection of the union.
) extends (mergedIntersection: infer Intersection) => void
  ? Intersection
  : never

export type IntersectArrays<T extends readonly any[]> = Id<
  UnionToIntersection<Mapped<T>>
>

type RemoveNames<T extends readonly any[]> = [any, ...T] extends [
  any,
  ...infer U
]
  ? U
  : never

export type Has<U, U1> = [U1] extends [U] ? 1 : 0

export type List<A = any> = ReadonlyArray<A>

export type Longest<L extends List, L1 extends List> = L extends unknown
  ? L1 extends unknown
    ? { 0: L1; 1: L }[Has<keyof L, keyof L1>]
    : never
  : never

export type LongestArray<S> = S extends [any[], any[]]
  ? Longest<S[0], S[1]>
  : S extends [any[], any[], ...infer Rest]
  ? Longest<Longest<S[0], S[1]>, LongestArray<Rest>>
  : S extends [any[]]
  ? S[0]
  : never

type Props = { bar: number }

type Intersectioned<T extends unknown[]> = {
  [index in keyof T]: T[index] extends T[number]
    ? UnionToIntersection<[T[index]]>
    : never
}

export type Cast<T, P, D extends P = P> = T extends P ? T : D

type IndexedLookup<A extends readonly any[], K extends AllArrayKeys<A>> = A[K]

export type MergeParameters<
  T extends readonly UnknownFunction[],
  ParamsArrays extends readonly any[][] = ExtractParams<T>,
  LongestParamsArray extends readonly any[] = LongestArray<ParamsArrays>,
  PAN extends readonly any[] = ParamsArrays[number]
> = ExpandItems<
  RemoveNames<{
    [index in keyof LongestParamsArray]: LongestParamsArray[index] extends LongestParamsArray[number]
      ? UnionToIntersection<NonNullable<PAN[index & AllArrayKeys<PAN>]>>
      : never
  }>
>

// export type MergeParameters<T extends readonly UnknownFunction[]> = ExpandItems<
//   // RemoveNames<List.MergeAll<[], ExtractParams<T>, 'deep', Misc.BuiltIn>>
//   Object.ListOf<IntersectArrays<List.UnionOf<ExtractParams<T>>>>

//   // ExpandItems<
// >

export type SelectorResultArray<Selectors extends SelectorArray> =
  ExtractReturnType<Selectors>

/** A standard function returning true if two values are considered equal */
export type EqualityFn = (a: any, b: any) => boolean

/** Utility type to infer the type of "all params of a function except the first", so we can determine what arguments a memoize function accepts */
export type DropFirst<T extends unknown[]> = T extends [unknown, ...infer U]
  ? U
  : never
