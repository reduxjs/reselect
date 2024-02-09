import lodashMemoize from 'lodash/memoize'
import memoizeOne from 'memoize-one'
import microMemoize from 'micro-memoize'
import {
  createSelectorCreator,
  lruMemoize,
  unstable_autotrackMemoize as autotrackMemoize,
  weakMapMemoize
} from 'reselect'
import { describe, test } from 'vitest'

// Test for exporting declaration of created selector creator
export const testExportStructured = createSelectorCreator(
  lruMemoize,
  (a, b) => typeof a === typeof b
)

interface RootState {
  todos: { id: number; completed: boolean }[]
  alerts: { id: number; read: boolean }[]
}

const state: RootState = {
  todos: [
    { id: 0, completed: false },
    { id: 1, completed: true }
  ],
  alerts: [
    { id: 0, read: false },
    { id: 1, read: true }
  ]
}

describe('type tests', () => {
  test('options object as argument', () => {
    const createSelectorDefault = createSelectorCreator({
      memoize: lruMemoize
    })
    const createSelectorWeakMap = createSelectorCreator({
      memoize: weakMapMemoize
    })
    const createSelectorAutotrack = createSelectorCreator({
      memoize: autotrackMemoize
    })
    const createSelectorMicro = createSelectorCreator({
      memoize: microMemoize
    })
    const createSelectorOne = createSelectorCreator({
      memoize: memoizeOne
    })
    const createSelectorLodash = createSelectorCreator({
      memoize: lodashMemoize
    })
  })

  test('memoize function as argument', () => {
    const createSelectorDefault = createSelectorCreator(lruMemoize)
    const createSelectorWeakMap = createSelectorCreator(weakMapMemoize)
    const createSelectorAutotrack = createSelectorCreator(autotrackMemoize)
    const createSelectorMicro = createSelectorCreator(microMemoize)
    const createSelectorOne = createSelectorCreator(memoizeOne)
    const createSelectorLodash = createSelectorCreator(lodashMemoize)
  })

  test('createSelectorCreator', () => {
    const defaultCreateSelector = createSelectorCreator(lruMemoize)

    const selector = defaultCreateSelector(
      (state: { foo: string }) => state.foo,
      foo => foo
    )
    const value: string = selector({ foo: 'fizz' })

    // @ts-expect-error
    selector({ foo: 'fizz' }, { bar: 42 })

    // clearCache should exist because of lruMemoize
    selector.clearCache()

    const parametric = defaultCreateSelector(
      (state: { foo: string }) => state.foo,
      (state: { foo: string }, props: { bar: number }) => props.bar,
      (foo, bar) => ({ foo, bar })
    )

    // @ts-expect-error
    parametric({ foo: 'fizz' })

    const ret = parametric({ foo: 'fizz' }, { bar: 42 })
    const foo: string = ret.foo
    const bar: number = ret.bar

    // @ts-expect-error
    createSelectorCreator(lruMemoize, 1)

    createSelectorCreator(lruMemoize, <T>(a: T, b: T) => {
      return `${a}` === `${b}`
    })
  })

  test('custom memoization option types', () => {
    const customMemoize = (
      f: (...args: any[]) => any,
      a: string,
      b: number,
      c: boolean
    ) => {
      return f
    }

    const customSelectorCreatorCustomMemoizeWorking = createSelectorCreator(
      customMemoize,
      'a',
      42,
      true
    )

    // @ts-expect-error
    const customSelectorCreatorCustomMemoizeMissingArg = createSelectorCreator(
      customMemoize,
      'a',
      true
    )
  })
})
