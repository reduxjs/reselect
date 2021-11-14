import { createSelector } from '../src'

// import type { List, Any } from 'ts-toolbelt'

import type {
  GetParamsFromSelectors,
  ExtractParams,
  UnionToIntersection,
  ExpandItems,
  UnknownFunction,
  MergeParameters,
  IntersectArrays,
  Head,
  Tail
} from '../src/types'

interface StateA {
  a: number
}

const input1 = (
  _: StateA,
  { testNumber }: { testNumber: number },
  c: number,
  d: string
) => testNumber

const input2 = (_: StateA, { testString }: { testString: string }, c: number) =>
  testString

const input3 = (
  _: StateA,
  { testBoolean }: { testBoolean: boolean },
  c: number,
  d: string
) => testBoolean

const input4 = (_: StateA, { testString2 }: { testString2: string }) =>
  testString2

const testSelector = createSelector(
  input1,
  input2,
  input3,
  input4,
  (testNumber, testString, testBoolean) => testNumber + testString
)

interface StateSub {
  sub: {
    a: number
  }
}

type Exact<A, B> = (<T>() => T extends A ? 1 : 0) extends <T>() => T extends B
  ? 1
  : 0
  ? A extends B
    ? B extends A
      ? unknown
      : never
    : never
  : never

type Selectors = [typeof input1, typeof input2, typeof input3, typeof input4]

type Params1 = ExtractParams<Selectors>

// export type Dec = {
//   [i: number]: number
//   0: -1
//   1: 0
//   2: 1
//   3: 2
//   4: 3
//   5: 4
//   6: 5
//   7: 6
//   8: 7
//   9: 8
// }
// export type Matches<V, T> = V extends T ? 1 : '0'
// export type Bool = 0|1;
// export type If<Cond extends Bool, Then, Else> = { 1: Then, 0: Else }[Cond];

// export type Gt<A extends number, B extends number> = {
//   1: 0
//   0: B extends 0 ? 1 : Gt<Dec[A], Dec[B]>
// }[Matches<A, 0>]

// export type Max<A extends number, B extends number> = If<Gt<A, B>, A, B>
/*
type List<T> = ArrayLike<T>

export type TupleHasIndex<Arr extends List<any>, I extends number> = ({
  [K in keyof Arr]: '1'
} & Array<'0'>)[I]

type numbers = [3, 9, 7, 2, 4, 12]

type thi1 = TupleHasIndex<Params1[0], 3>

type tl5 = Params1[number]['length']

export type CreateTuple<L extends number, T = any> = Device<[], L, T>

type Device<R extends any[], L extends number, T> = R['length'] extends L
  ? R
  : Device<[T, ...R], L, T>

type tuple1 = CreateTuple<tl5>
*/

export type Has<U, U1> = [U1] extends [U] ? 1 : 0

export type List<A = any> = ReadonlyArray<A>

export type Longest<L extends List, L1 extends List> = L extends unknown
  ? L1 extends unknown
    ? { 0: L1; 1: L }[Has<keyof L, keyof L1>]
    : never
  : never

type l2 = Longest<Params1[0], Params1[1]>

export type LongestArray<S> = S extends [any[], any[]]
  ? Longest<S[0], S[1]>
  : S extends [any[], any[], ...infer Rest]
  ? Longest<Longest<S[0], S[1]>, LongestArray<Rest & any[][]>>
  : S extends [any[]]
  ? S[0]
  : never

type l3 = LongestArray<Params1>

export type MergeParameters3<
  T extends readonly UnknownFunction[],
  ParamsArrays = ExtractParams<T>,
  LongestParamsArray extends any[][] = LongestArray<ParamsArrays>
> = {
  // @ts-ignore
  [index in keyof LongestParamsArray]: UnionToIntersection<
    ParamsArrays[number][index]
  >
}

type mp3 = MergeParameters3<Selectors>

type i0 = Params1[number][0]
type i1 = Params1[number][1]
type i2 = Params1[number][2]
type i3 = Params1[number][3]

type KeysToValues<T, Keys extends (keyof T)[]> = {
  [Index in keyof Keys]: Keys[Index] extends keyof T ? T[Keys[Index]] : never
}

type TupleLengths2<A extends any[][]> = {
  [index in keyof A]: A[index] extends A[number] ? A[index]['length'] : never
}

type tl2 = TupleLengths2<Params1>

type TupleLengths<T extends number extends T['length'] ? [] : any[]> =
  T['length']

type l1 = TupleLengths<Params1[number]>
type RemoveNames<T extends readonly any[]> = [any, ...T] extends [
  any,
  ...infer U
]
  ? U
  : never

export type MergeParameters2<T extends readonly UnknownFunction[]> =
  ExpandItems<RemoveNames<List.MergeAll<[], ExtractParams<T>, 'deep'>>>
// type Zipped<A extends any[][],

type mp1a = MergeParameters<Selectors>

type mp1b = MergeParameters2<Selectors>

const input5 = (state: StateSub) => state.sub
const input6 = (state: StateSub, props: { x: number; y: number }) => props.x

type Selectors2 = [typeof input5, typeof input6]

type mp2a = MergeParameters<Selectors2>
type mp2b = MergeParameters2<Selectors2>

const selector2 = createSelector(
  selector1,
  (state: StateSub, props: { x: number; y: number }) => props.y,
  (param, y) => param.sub.a + param.x + y
)

/*
export type Head<T extends any[], D = never> = T extends [infer X, ...any[]]
  ? X
  : D
export type Tail<T extends any[]> = ((...x: T) => void) extends (
  x: any,
  ...xs: infer XS
) => void
  ? XS
  : never
export type Last<T extends any[], D = never> = {
  0: D
  1: Head<T>
  2: Last<Tail<T>>
}[T extends [] ? 0 : T extends [any] ? 1 : 2]
export type Cons<X, XS extends any[]> = ((h: X, ...args: XS) => void) extends (
  ...args: infer R
) => void
  ? R
  : []
export type Reverse<L extends any[], X extends any[] = []> = {
  0: X
  1: Reverse<Tail<L>, Cons<Head<L>, X>>
}[L extends [] ? 0 : 1]
export type Concat<A extends any[], B extends any[], R extends any[] = []> = {
  0: Reverse<R>
  1: Concat<Tail<A>, B, Cons<Head<A>, R>>
  2: Concat<A, Tail<B>, Cons<Head<B>, R>>
}[A extends [] ? (B extends [] ? 0 : 2) : 1]
export type Zip<A extends any[], B extends any[], R extends any[] = []> = {
  0: Reverse<R>
  1: Zip<Tail<A>, Tail<B>, Cons<[Head<A>, Head<B>], R>>
}[A extends [] ? 0 : B extends [] ? 0 : 1]


type zp1 = Zip<Params1[0], Params1[1]>
type zp2 = Zip<zp1, Params1[3]>
type flattened = {
  [key in keyof zp2] : 
}
*/
