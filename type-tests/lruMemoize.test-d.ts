import { groupBy, isEqual } from 'lodash'
import {
  createSelectorCreator,
  lruMemoize,
  referenceEqualityCheck
} from 'reselect'

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

  test('issue #384', () => {
    // https://github.com/reduxjs/reselect/issues/384

    function multiArgMemoize<F extends (...args: any[]) => any>(
      func: F,
      a: number,
      b: string,
      equalityCheck = referenceEqualityCheck
    ): F {
      // @ts-ignore
      return () => {}
    }

    interface Transaction {
      transactionId: string
    }

    const toId = (transaction: Transaction) => transaction.transactionId
    const transactionsIds = (transactions: Transaction[]) =>
      transactions.map(toId)
    const collectionsEqual = (ts1: Transaction[], ts2: Transaction[]) =>
      isEqual(transactionsIds(ts1), transactionsIds(ts2))

    const createTransactionsSelector = createSelectorCreator(
      lruMemoize,
      collectionsEqual
    )

    const createMultiMemoizeArgSelector = createSelectorCreator(
      multiArgMemoize,
      42,
      'abcd',
      referenceEqualityCheck
    )

    const select = createMultiMemoizeArgSelector(
      (state: { foo: string }) => state.foo,
      foo => `${foo}!`
    )
    // error is not applicable anymore
    select.clearCache()

    const createMultiMemoizeArgSelector2 = createSelectorCreator(
      multiArgMemoize,
      42,
      // @ts-expect-error
      referenceEqualityCheck
    )

    const groupTransactionsByLabel = lruMemoize(
      (transactions: Transaction[]) =>
        groupBy(transactions, item => item.transactionId),
      collectionsEqual
    )
  })
})
