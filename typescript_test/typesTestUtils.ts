export function expectType<T>(t: T): T {
  return t
}

export declare type IsAny<T, True, False = never> = true | false extends (
  T extends never ? true : false
)
  ? True
  : False

export declare type IsUnknown<T, True, False = never> = unknown extends T
  ? IsAny<T, False, True>
  : False

type Equals<T, U> = IsAny<
  T,
  never,
  IsAny<U, never, [T] extends [U] ? ([U] extends [T] ? any : never) : never>
>

export function expectExactType<T>(t: T) {
  return <U extends Equals<T, U>>(u: U) => {}
}
