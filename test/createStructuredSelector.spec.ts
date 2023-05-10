import {
  createSelectorCreator,
  defaultMemoize,
  createStructuredSelector
} from 'reselect'

interface StateAB {
  a: number
  b: number
}

describe('createStructureSelector', () => {
  test('structured selector', () => {
    const selector = createStructuredSelector({
      x: (state: StateAB) => state.a,
      y: (state: StateAB) => state.b
    })
    const firstResult = selector({ a: 1, b: 2 })
    expect(firstResult).toEqual({ x: 1, y: 2 })
    expect(selector({ a: 1, b: 2 })).toBe(firstResult)
    const secondResult = selector({ a: 2, b: 2 })
    expect(secondResult).toEqual({ x: 2, y: 2 })
    expect(selector({ a: 2, b: 2 })).toBe(secondResult)
  })

  test('structured selector with invalid arguments', () => {
    expect(() =>
      // @ts-expect-error
      createStructuredSelector(
        (state: StateAB) => state.a,
        (state: StateAB) => state.b
      )
    ).toThrow(/expects first argument to be an object.*function/)
    expect(() =>
      createStructuredSelector({
        a: state => state.b,
        // @ts-expect-error
        c: 'd'
      })
    ).toThrow(
      'createSelector expects all input-selectors to be functions, but received the following types: [function a(), string]'
    )
  })

  test('structured selector with custom selector creator', () => {
    const customSelectorCreator = createSelectorCreator(
      defaultMemoize,
      (a, b) => a === b
    )
    const selector = createStructuredSelector(
      {
        x: (state: StateAB) => state.a,
        y: (state: StateAB) => state.b
      },
      customSelectorCreator
    )
    const firstResult = selector({ a: 1, b: 2 })
    expect(firstResult).toEqual({ x: 1, y: 2 })
    expect(selector({ a: 1, b: 2 })).toBe(firstResult)
    expect(selector({ a: 2, b: 2 })).toEqual({ x: 2, y: 2 })
  })
})
