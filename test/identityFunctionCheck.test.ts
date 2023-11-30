import { createSelector, setGlobalDevModeChecks } from 'reselect'
import type { LocalTestContext, RootState } from './testUtils'
import { localTest } from './testUtils'

describe<LocalTestContext>('identityFunctionCheck', () => {
  const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
  const identityFunction = vi.fn(<T>(state: T) => state)
  const badSelector = createSelector(
    [(state: RootState) => state],
    identityFunction
  )

  afterEach(() => {
    consoleSpy.mockClear()
    identityFunction.mockClear()
    badSelector.clearCache()
    badSelector.memoizedResultFunc.clearCache()
  })
  afterAll(() => {
    consoleSpy.mockRestore()
  })
  localTest(
    'calls the result function twice, and warns to console if result is the same as argument',
    ({ state }) => {
      const goodSelector = createSelector(
        [(state: RootState) => state],
        state => state.todos
      )

      expect(goodSelector(state)).toBe(state.todos)

      expect(consoleSpy).not.toHaveBeenCalled()

      expect(badSelector(state)).toBe(state)

      expect(identityFunction).toHaveBeenCalledTimes(2)

      expect(consoleSpy).toHaveBeenCalledOnce()
    }
  )

  localTest('disables check if global setting is set to never', ({ state }) => {
    setGlobalDevModeChecks({ identityFunctionCheck: 'never' })

    expect(badSelector(state)).toBe(state)

    expect(identityFunction).toHaveBeenCalledOnce()

    expect(consoleSpy).not.toHaveBeenCalled()

    setGlobalDevModeChecks({ identityFunctionCheck: 'once' })
  })

  localTest(
    'disables check if specified in the selector options',
    ({ state }) => {
      const badSelector = createSelector(
        [(state: RootState) => state],
        identityFunction,
        { devModeChecks: { identityFunctionCheck: 'never' } }
      )

      expect(badSelector(state)).toBe(state)

      expect(identityFunction).toHaveBeenCalledOnce()

      expect(consoleSpy).not.toHaveBeenCalled()
    }
  )

  localTest('disables check in production', ({ state }) => {
    const originalEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'production'

    expect(badSelector(state)).toBe(state)

    expect(identityFunction).toHaveBeenCalledOnce()

    expect(consoleSpy).not.toHaveBeenCalled()

    process.env.NODE_ENV = originalEnv
  })

  localTest('allows running the check only once', ({ state }) => {
    const badSelector = createSelector(
      [(state: RootState) => state],
      identityFunction,
      { devModeChecks: { identityFunctionCheck: 'once' } }
    )
    expect(badSelector(state)).toBe(state)

    expect(identityFunction).toHaveBeenCalledTimes(2)

    expect(consoleSpy).toHaveBeenCalledOnce()

    const newState = { ...state }

    expect(badSelector(newState)).toBe(newState)

    expect(identityFunction).toHaveBeenCalledTimes(3)

    expect(consoleSpy).toHaveBeenCalledOnce()
  })

  localTest('allows always running the check', () => {
    const badSelector = createSelector([state => state], identityFunction, {
      devModeChecks: { identityFunctionCheck: 'always' }
    })

    const state = {}

    expect(badSelector(state)).toBe(state)

    expect(identityFunction).toHaveBeenCalledTimes(2)

    expect(consoleSpy).toHaveBeenCalledOnce()

    expect(badSelector({ ...state })).toStrictEqual(state)

    expect(identityFunction).toHaveBeenCalledTimes(4)

    expect(consoleSpy).toHaveBeenCalledTimes(2)

    expect(badSelector(state)).toBe(state)

    expect(identityFunction).toHaveBeenCalledTimes(4)

    expect(consoleSpy).toHaveBeenCalledTimes(2)
  })

  localTest('runs once when devModeChecks is an empty object', ({ state }) => {
    const badSelector = createSelector(
      [(state: RootState) => state],
      identityFunction,
      { devModeChecks: {} }
    )
    expect(badSelector(state)).toBe(state)

    expect(identityFunction).toHaveBeenCalledTimes(2)

    expect(consoleSpy).toHaveBeenCalledOnce()

    const newState = { ...state }

    expect(badSelector(newState)).toBe(newState)

    expect(identityFunction).toHaveBeenCalledTimes(3)

    expect(consoleSpy).toHaveBeenCalledOnce()
  })

  localTest('uses the memoize provided', ({ state }) => {
    const badSelector = createSelector(
      [(state: RootState) => state.todos],
      identityFunction
    )
    expect(badSelector(state)).toBe(state.todos)

    expect(identityFunction).toHaveBeenCalledTimes(2)

    expect(consoleSpy).toHaveBeenCalledOnce()

    expect(badSelector({ ...state })).not.toBe(state)

    expect(consoleSpy).toHaveBeenCalledOnce()
  })
})
