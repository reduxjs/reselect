export type IsEqual<A, B> = (<G>() => G extends A ? 1 : 2) extends <
  G
>() => G extends B ? 1 : 2
  ? true
  : false
