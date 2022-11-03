// This entire implementation courtesy of Anders Hjelsberg:
// https://github.com/microsoft/TypeScript/pull/50831#issuecomment-1253830522

type UnknownFunction = (...args: any[]) => any

type LongestTuple<T extends readonly unknown[][]> = T extends [
  infer U extends unknown[]
]
  ? U
  : T extends [infer U, ...infer R extends unknown[][]]
  ? MostProperties<U, LongestTuple<R>>
  : never

type MostProperties<T, U> = keyof U extends keyof T ? T : U

type ElementAt<T extends unknown[], N extends keyof any> = N extends keyof T
  ? T[N]
  : unknown

type ElementsAt<T extends readonly unknown[][], N extends keyof any> = {
  [K in keyof T]: ElementAt<T[K], N>
}

type Intersect<T extends readonly unknown[]> = T extends []
  ? unknown
  : T extends [infer H, ...infer T]
  ? H & Intersect<T>
  : T[number]

type MergeTuples<
  T extends readonly unknown[][],
  L extends unknown[] = LongestTuple<T>
> = {
  [K in keyof L]: Intersect<ElementsAt<T, K>>
}

type ExtractParameters<T extends readonly UnknownFunction[]> = {
  [K in keyof T]: Parameters<T[K]>
}

export type MergeParameters<T extends readonly UnknownFunction[]> =
  '0' extends keyof T
    ? MergeTuples<ExtractParameters<T>>
    : Parameters<T[number]>
