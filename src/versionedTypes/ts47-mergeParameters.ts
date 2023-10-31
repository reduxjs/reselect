// This entire implementation courtesy of Anders Hjelsberg:
// https://github.com/microsoft/TypeScript/pull/50831#issuecomment-1253830522

import type { AnyFunction } from '@internal/types'

/**
 * @internal
 */
type LongestTuple<T extends readonly unknown[][]> = T extends [
  infer U extends unknown[]
]
  ? U
  : T extends [infer U, ...infer R extends unknown[][]]
  ? MostProperties<U, LongestTuple<R>>
  : never

/**
 * @internal
 */
type MostProperties<T, U> = keyof U extends keyof T ? T : U

/**
 * @internal
 */
type ElementAt<T extends unknown[], N extends keyof any> = N extends keyof T
  ? T[N]
  : unknown

/**
 * @internal
 */
type ElementsAt<T extends readonly unknown[][], N extends keyof any> = {
  [K in keyof T]: ElementAt<T[K], N>
}

/**
 * @internal
 */
type Intersect<T extends readonly unknown[]> = T extends []
  ? unknown
  : T extends [infer H, ...infer T]
  ? H & Intersect<T>
  : T[number]

/**
 * @internal
 */
type MergeTuples<
  T extends readonly unknown[][],
  L extends unknown[] = LongestTuple<T>
> = {
  [K in keyof L]: Intersect<ElementsAt<T, K>>
}

/**
 * @internal
 */
type ExtractParameters<T extends readonly AnyFunction[]> = {
  [K in keyof T]: Parameters<T[K]>
}

/**
 * @internal
 */
export type MergeParameters<T extends readonly AnyFunction[]> =
  '0' extends keyof T
    ? MergeTuples<ExtractParameters<T>>
    : Parameters<T[number]>
