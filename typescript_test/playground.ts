import { createSelector } from '../src'

// import type { List, Any } from 'ts-toolbelt'

import type {
  OutputSelector,
  Selector,
  GetParamsFromSelectors,
  GetStateFromSelectors,
  SelectorResultArray,
  ExtractParams,
  UnionToIntersection,
  ExpandItems,
  UnknownFunction,
  MergeParameters,
  LongestArray,
  IntersectArrays,
  Head,
  Tail42
} from '../src/types'

interface StateA {
  a: number
}

const input1a = (
  _: StateA,
  { testNumber }: { testNumber: number },
  c: number,
  d: string
) => testNumber

const input1b = (
  _: StateA,
  { testString }: { testString: string },
  c: number
) => testString

const input1c = (
  _: StateA,
  { testBoolean }: { testBoolean: boolean },
  c: number,
  d: string
) => testBoolean

const input1d = (_: StateA, { testString2 }: { testString2: string }) =>
  testString2

const testSelector = createSelector(
  input1a,
  input1b,
  input1c,
  input1d,
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

type Selectors = [
  typeof input1a,
  typeof input1b,
  typeof input1c,
  typeof input1d
]

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

export type List<A = any> = Array<A>

export type Longest<L extends List, L1 extends List> = L extends unknown
  ? L1 extends unknown
    ? { 0: L1; 1: L }[Has<keyof L, keyof L1>]
    : 99
  : 123

type l2 = Longest<Params1[0], Params1[1]>

// export type LongestArray<S extends any[][]> = S extends [any[], any[]]
//   ? Longest<S[0], S[1]>
//   : S extends [any[], any[], ...infer Rest]
//   ? Longest<Longest<S[0], S[1]>, LongestArray<Rest>>
//   : S extends [any[]]
//   ? S[0]
//   : 42
export type LongestArray<S extends any[][]> = S extends [
  any[],
  any[],
  ...infer Rest
]
  ? Rest extends [readonly any[]]
    ? Longest<S[0], Longest<S[1], Rest>>
    : Longest<S[0], S[1]>
  : S extends [any, ...infer Rest]
  ? Rest extends [any[]]
    ? Longest<S[0], Rest>
    : S[0]
  : S extends []
  ? 42
  : 99

type l3 = LongestArray<Params1>

export type MergeParameters3<
  T extends readonly UnknownFunction[],
  ParamsArrays extends readonly any[][] = ExtractParams<T>,
  LongestParamsArray extends readonly any[] = LongestArray<ParamsArrays>,
  PAN extends readonly any[] = ParamsArrays[number]
  // > = PAN
> = {
  [index in keyof LongestParamsArray]: LongestParamsArray[index] extends LongestParamsArray[number]
    ? // @ts-ignore
      UnionToIntersection<PAN[index]>
    : never
}

type mp3 = MergeParameters3<Selectors>
type mp4 = MergeParameters<Selectors>

type hmp3 = Head<mp3>

type h1 = Has<Params1[number], '3'>

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

// export type MergeParameters2<T extends readonly UnknownFunction[]> =
//   ExpandItems<RemoveNames<List.MergeAll<[], ExtractParams<T>, 'deep'>>>
// type Zipped<A extends any[][],

type mp1a = MergeParameters<Selectors>

const input2a = (state: StateSub) => state.sub
const input2b = (state: StateSub, props: { x: number; y: number }) => props.x

type Selectors2 = [typeof input2a, typeof input2b]

type mp2a = MergeParameters<Selectors2>
type mp2b = MergeParameters3<Selectors2>

const input3a = (state: { foo: string }) => state.foo
const input3b = (state: { baz: number }, props: { bar: number }) => props.bar

type Selectors3 = [typeof input3a, typeof input3b]
type s3r = SelectorResultArray<Selectors3>
const combiner3 = (foo: string, bar: number) => ({ foo, baz: bar })

type mp3a = MergeParameters<Selectors3>
type mp3aa = Tail42<mp3a>
type mp3s = GetStateFromSelectors<Selectors3>
type mp3p = GetParamsFromSelectors<Selectors3>

const newSelector = ((state, props) => {
  return combiner3(state.foo, props.bar)
}) as Selector<
  GetStateFromSelectors<Selectors3>,
  ReturnType<typeof combiner3>,
  mp3p
>

// OutputSelector<
//   Selectors3,
//   ReturnType<typeof combiner3>,
//   typeof combiner3,
//   mp3p
// >

newSelector()

// const selector2 = createSelector(
//   selector1,
//   (state: StateSub, props: { x: number; y: number }) => props.y,
//   (param, y) => param.sub.a + param.x + y
// )

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

function testParametricSelector() {
  /*
    const selector: OutputSelector<[(state: State) => string, (state: State, props: Props) => number], {
    foo: string;
    bar: number;
}, (args_0: string, args_1: number) => {
    foo: string;
    bar: number;
}, never>


const selector: OutputSelector<[(state: State) => string, (state: State, props: Props) => number], {
    foo: string;
    bar: number;
}, (args_0: string, args_1: number) => {
    foo: string;
    bar: number;
}, GetParamsFromSelectors<[(state: State) => string, (state: State, props: Props) => number]>>
*/
  type State = { foo: string }
  type Props = { bar: number }

  // allows heterogeneous parameter type selectors

  const i1 = (state: State) => state.foo
  const i2 = (state: State, props: Props) => props.bar
  const c1 = (foo: string, bar: number) => ({ foo, bar })

  type Selectors = [typeof i1, typeof i2]

  type extracted = ExtractParams<Selectors>
  type params = MergeParameters<Selectors>
  type s = GetStateFromSelectors<Selectors>
  type p = GetParamsFromSelectors<Selectors>
  type ParamsArrays = ExtractParams<Selectors>
  type LongestParamsArray = LongestArray<ParamsArrays>
  type PAN = ParamsArrays[number]
  type pan1 = PAN[1]
  type mapped = {
    [index in keyof LongestParamsArray]: LongestParamsArray[index] extends LongestParamsArray[number]
      ? UnionToIntersection<PAN[1]>
      : never
  }
  type mp3p = MergeParameters3<Selectors>
  type c = typeof c1

  type u1 = UnionToIntersection<
    [
      | {
          bar: number
        }
      | undefined
    ]
  >
  type u2 = UnionToIntersection<
    [
      props:
        | {
            bar: number
          }
        | undefined
    ]
  >

  const newSelector = ((state, props) => {
    return c1(state.foo, props.bar)
  }) as OutputSelector<Selectors, ReturnType<c>, c, p>

  newSelector({ foo: 'fizz' }, { bar: 42 })
}

{
  type State = { foo: string }
  type Props = { bar: number }

  // allows heterogeneous parameter type selectors

  const i1 = (state: State) => state.foo
  const i2 = (state: State, props: Props) => props.bar
  const c1 = (foo: string, bar: number) => ({ foo, bar })

  type Selectors = [
    typeof i1,
    typeof i1,
    typeof i1,
    typeof i1,
    typeof i1,
    typeof i1,
    typeof i1,
    typeof i2
  ]

  type extracted = ExtractParams<Selectors>
  type params = MergeParameters<Selectors>
  type s = GetStateFromSelectors<Selectors>
  type p = GetParamsFromSelectors<Selectors>
  type ParamsArrays = ExtractParams<Selectors>
  type LongestParamsArray = LongestArray<ParamsArrays>
  type PAN = ParamsArrays[number]
  type pan1 = PAN[1]
  type mapped = {
    [index in keyof LongestParamsArray]: LongestParamsArray[index] extends LongestParamsArray[number]
      ? UnionToIntersection<PAN[1]>
      : never
  }
  type mp3p = MergeParameters3<Selectors>
}
