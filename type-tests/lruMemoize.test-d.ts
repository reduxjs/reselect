import { lruMemoize } from 'reselect'

describe('type tests', () => {
  test('lruMemoize', () => {
    const func = (a: string) => +a

    const memoized = lruMemoize(func)

    const ret0: number = memoized('42')
    // @ts-expect-error
    const ret1: string = memoized('42')

    const memoized2 = lruMemoize(
      (str: string, arr: string[]): { str: string; arr: string[] } => ({
        str,
        arr
      }),
      <T>(a: T, b: T) => {
        return `${a}` === `${b}`
      }
    )

    const ret2 = memoized2('', ['1', '2'])
    const str: string = ret2.str
    const arr: string[] = ret2.arr
  })
})
