// TODO: Add test for React Redux connect function

import lodashMemoize from 'lodash/memoize'
import microMemoize from 'micro-memoize'
import {
  autotrackMemoize,
  createSelector,
  createSelectorCreator,
  defaultMemoize
} from 'reselect'

// Construct 1E6 states for perf test outside of the perf test so as to not change the execute time of the test function
const numOfStates = 1000000
interface StateA {
  a: number
}

interface StateAB {
  a: number
  b: number
}

interface StateSub {
  sub: {
    a: number
  }
}

const states: StateAB[] = []

for (let i = 0; i < numOfStates; i++) {
  states.push({ a: 1, b: 2 })
}

describe('Basic selector behavior', () => {
  test('basic selector', () => {
    const selector = createSelector(
      (state: StateA) => state.a,
      a => a
    )
    const firstState = { a: 1 }
    const firstStateNewPointer = { a: 1 }
    const secondState = { a: 2 }

    expect(selector(firstState)).toBe(1)
    expect(selector(firstState)).toBe(1)
    expect(selector.recomputations()).toBe(1)
    expect(selector(firstStateNewPointer)).toBe(1)
    expect(selector.recomputations()).toBe(1)
    expect(selector(secondState)).toBe(2)
    expect(selector.recomputations()).toBe(2)
  })

  test("don't pass extra parameters to inputSelector when only called with the state", () => {
    const selector = createSelector(
      (...params: any[]) => params.length,
      a => a
    )
    expect(selector({})).toBe(1)
  })

  test('basic selector multiple keys', () => {
    const selector = createSelector(
      (state: StateAB) => state.a,
      (state: StateAB) => state.b,
      (a, b) => a + b
    )
    const state1 = { a: 1, b: 2 }
    expect(selector(state1)).toBe(3)
    expect(selector(state1)).toBe(3)
    expect(selector.recomputations()).toBe(1)
    const state2 = { a: 3, b: 2 }
    expect(selector(state2)).toBe(5)
    expect(selector(state2)).toBe(5)
    expect(selector.recomputations()).toBe(2)
  })

  test('basic selector invalid input selector', () => {
    expect(() =>
      createSelector(
        // @ts-ignore
        (state: StateAB) => state.a,
        function input2(state: StateAB) {
          return state.b
        },
        'not a function',
        (a: any, b: any) => a + b
      )
    ).toThrow(
      'createSelector expects all input-selectors to be functions, but received the following types: [function unnamed(), function input2(), string]'
    )

    expect(() =>
      // @ts-ignore
      createSelector((state: StateAB) => state.a, 'not a function')
    ).toThrow(
      'createSelector expects an output function after the inputs, but received: [string]'
    )
  })

  describe('performance checks', () => {
    const originalEnv = process.env.NODE_ENV

    beforeAll(() => {
      process.env.NODE_ENV = 'production'
    })
    afterAll(() => {
      process.env.NODE_NV = originalEnv
    })

    test('basic selector cache hit performance', () => {
      if (process.env.COVERAGE) {
        return // don't run performance tests for coverage
      }

      const selector = createSelector(
        (state: StateAB) => state.a,
        (state: StateAB) => state.b,
        (a, b) => a + b
      )
      const state1 = { a: 1, b: 2 }

      const start = performance.now()
      for (let i = 0; i < 1000000; i++) {
        selector(state1)
      }
      const totalTime = performance.now() - start

      expect(selector(state1)).toBe(3)
      expect(selector.recomputations()).toBe(1)
      // Expected a million calls to a selector with the same arguments to take less than 1 second
      expect(totalTime).toBeLessThan(1000)
    })

    test('basic selector cache hit performance for state changes but shallowly equal selector args', () => {
      if (process.env.COVERAGE) {
        return // don't run performance tests for coverage
      }

      const selector = createSelector(
        (state: StateAB) => state.a,
        (state: StateAB) => state.b,
        (a, b) => a + b
      )

      const start = new Date()
      for (let i = 0; i < numOfStates; i++) {
        selector(states[i])
      }
      const totalTime = new Date().getTime() - start.getTime()

      expect(selector(states[0])).toBe(3)
      expect(selector.recomputations()).toBe(1)

      // Expected a million calls to a selector with the same arguments to take less than 1 second
      expect(totalTime).toBeLessThan(1000)
    })
  })
  test('memoized composite arguments', () => {
    const selector = createSelector(
      (state: StateSub) => state.sub,
      sub => sub
    )
    const state1 = { sub: { a: 1 } }
    expect(selector(state1)).toEqual({ a: 1 })
    expect(selector(state1)).toEqual({ a: 1 })
    expect(selector.recomputations()).toBe(1)
    const state2 = { sub: { a: 2 } }
    expect(selector(state2)).toEqual({ a: 2 })
    expect(selector.recomputations()).toBe(2)
  })

  test('first argument can be an array', () => {
    const selector = createSelector(
      [state => state.a, state => state.b],
      (a, b) => {
        return a + b
      }
    )
    expect(selector({ a: 1, b: 2 })).toBe(3)
    expect(selector({ a: 1, b: 2 })).toBe(3)
    expect(selector.recomputations()).toBe(1)
    expect(selector({ a: 3, b: 2 })).toBe(5)
    expect(selector.recomputations()).toBe(2)
  })

  test('can accept props', () => {
    let called = 0
    const selector = createSelector(
      (state: StateAB) => state.a,
      (state: StateAB) => state.b,
      (state: StateAB, props: { c: number }) => props.c,
      (a, b, c) => {
        called++
        return a + b + c
      }
    )
    expect(selector({ a: 1, b: 2 }, { c: 100 })).toBe(103)
  })

  test('recomputes result after exception', () => {
    let called = 0
    const selector = createSelector(
      (state: StateA) => state.a,
      () => {
        called++
        throw Error('test error')
      }
    )
    expect(() => selector({ a: 1 })).toThrow('test error')
    expect(() => selector({ a: 1 })).toThrow('test error')
    expect(called).toBe(2)
  })

  test('memoizes previous result before exception', () => {
    let called = 0
    const selector = createSelector(
      (state: StateA) => state.a,
      a => {
        called++
        if (a > 1) throw Error('test error')
        return a
      }
    )
    const state1 = { a: 1 }
    const state2 = { a: 2 }
    expect(selector(state1)).toBe(1)
    expect(() => selector(state2)).toThrow('test error')
    expect(selector(state1)).toBe(1)
    expect(called).toBe(2)
  })
})

describe('Combining selectors', () => {
  test('chained selector', () => {
    const selector1 = createSelector(
      (state: StateSub) => state.sub,
      sub => sub
    )
    const selector2 = createSelector(selector1, sub => sub.a)
    const state1 = { sub: { a: 1 } }
    expect(selector2(state1)).toBe(1)
    expect(selector2(state1)).toBe(1)
    expect(selector2.recomputations()).toBe(1)
    const state2 = { sub: { a: 2 } }
    expect(selector2(state2)).toBe(2)
    expect(selector2.recomputations()).toBe(2)
  })

  test('chained selector with props', () => {
    const selector1 = createSelector(
      (state: StateSub) => state.sub,
      (state: StateSub, props: { x: number; y: number }) => props.x,
      (sub, x) => ({ sub, x })
    )
    const selector2 = createSelector(
      selector1,
      (state: StateSub, props: { x: number; y: number }) => props.y,
      (param, y) => param.sub.a + param.x + y
    )
    const state1 = { sub: { a: 1 } }
    expect(selector2(state1, { x: 100, y: 200 })).toBe(301)
    expect(selector2(state1, { x: 100, y: 200 })).toBe(301)
    expect(selector2.recomputations()).toBe(1)
    const state2 = { sub: { a: 2 } }
    expect(selector2(state2, { x: 100, y: 201 })).toBe(303)
    expect(selector2.recomputations()).toBe(2)
  })

  test('chained selector with variadic args', () => {
    const selector1 = createSelector(
      (state: StateSub) => state.sub,
      (state: StateSub, props: { x: number; y: number }, another: number) =>
        props.x + another,
      (sub, x) => ({ sub, x })
    )
    const selector2 = createSelector(
      selector1,
      (state: StateSub, props: { x: number; y: number }) => props.y,
      (param, y) => param.sub.a + param.x + y
    )
    const state1 = { sub: { a: 1 } }
    expect(selector2(state1, { x: 100, y: 200 }, 100)).toBe(401)
    expect(selector2(state1, { x: 100, y: 200 }, 100)).toBe(401)
    expect(selector2.recomputations()).toBe(1)
    const state2 = { sub: { a: 2 } }
    expect(selector2(state2, { x: 100, y: 201 }, 200)).toBe(503)
    expect(selector2.recomputations()).toBe(2)
  })

  test('override valueEquals', () => {
    // a rather absurd equals operation we can verify in tests
    const createOverridenSelector = createSelectorCreator(
      defaultMemoize,
      (a, b) => typeof a === typeof b
    )
    const selector = createOverridenSelector(
      (state: StateA) => state.a,
      a => a
    )
    expect(selector({ a: 1 })).toBe(1)
    expect(selector({ a: 2 })).toBe(1) // yes, really true
    expect(selector.recomputations()).toBe(1)
    // @ts-expect-error
    expect(selector({ a: 'A' })).toBe('A')
    expect(selector.recomputations()).toBe(2)
  })
})

describe('Customizing selectors', () => {
  test('custom memoize', () => {
    const hashFn = (...args: any[]) =>
      args.reduce((acc, val) => acc + '-' + JSON.stringify(val))
    const customSelectorCreator = createSelectorCreator(lodashMemoize, hashFn)
    const selector = customSelectorCreator(
      (state: StateAB) => state.a,
      (state: StateAB) => state.b,
      (a, b) => a + b
    )
    expect(selector({ a: 1, b: 2 })).toBe(3)
    expect(selector({ a: 1, b: 2 })).toBe(3)
    expect(selector.recomputations()).toBe(1)
    expect(selector({ a: 1, b: 3 })).toBe(4)
    expect(selector.recomputations()).toBe(2)
    expect(selector({ a: 1, b: 3 })).toBe(4)
    expect(selector.recomputations()).toBe(2)
    expect(selector({ a: 2, b: 3 })).toBe(5)
    expect(selector.recomputations()).toBe(3)
    // TODO: Check correct memoize function was called
  })

  test('createSelector accepts direct memoizer arguments', () => {
    let memoizer1Calls = 0
    let memoizer2Calls = 0
    let memoizer3Calls = 0

    const defaultMemoizeAcceptsFirstArgDirectly = createSelector(
      (state: StateAB) => state.a,
      (state: StateAB) => state.b,
      (a, b) => a + b,
      {
        memoizeOptions: (a, b) => {
          memoizer1Calls++
          return a === b
        }
      }
    )

    defaultMemoizeAcceptsFirstArgDirectly({ a: 1, b: 2 })
    defaultMemoizeAcceptsFirstArgDirectly({ a: 1, b: 3 })

    expect(memoizer1Calls).toBeGreaterThan(0)

    const defaultMemoizeAcceptsArgsAsArray = createSelector(
      (state: StateAB) => state.a,
      (state: StateAB) => state.b,
      (a, b) => a + b,
      {
        memoizeOptions: [
          (a, b) => {
            memoizer2Calls++
            return a === b
          }
        ]
      }
    )

    defaultMemoizeAcceptsArgsAsArray({ a: 1, b: 2 })
    defaultMemoizeAcceptsArgsAsArray({ a: 1, b: 3 })

    expect(memoizer2Calls).toBeGreaterThan(0)

    const createSelectorWithSeparateArg = createSelectorCreator(
      defaultMemoize,
      (a, b) => {
        memoizer3Calls++
        return a === b
      }
    )

    const defaultMemoizeAcceptsArgFromCSC = createSelectorWithSeparateArg(
      (state: StateAB) => state.a,
      (state: StateAB) => state.b,
      (a, b) => a + b
    )

    defaultMemoizeAcceptsArgFromCSC({ a: 1, b: 2 })
    defaultMemoizeAcceptsArgFromCSC({ a: 1, b: 3 })

    expect(memoizer3Calls).toBeGreaterThan(0)
  })
  test('passing memoizeMethod directly to createSelector', () => {
    interface State {
      todos: {
        id: number
        completed: boolean
      }[]
    }
    const state: State = {
      todos: [
        { id: 0, completed: false },
        { id: 1, completed: false }
      ]
    }
    const selectorDefault = createSelector(
      (state: State) => state.todos,
      todos => todos.map(t => t.id)
    )
    const selectorAutotrack = createSelector(
      (state: State) => state.todos,
      todos => todos.map(t => t.id),
      { memoizeMethod: autotrackMemoize }
    )
    const keys = [
      'resultFunc',
      'memoizedResultFunc',
      'dependencies',
      'lastResult',
      'recomputations',
      'resetRecomputations',
      'clearCache'
    ]
    expect(selectorDefault).to.include.all.keys(keys)
    expect(selectorAutotrack).to.include.all.keys(keys)
    expect(selectorDefault.lastResult()).toBeUndefined()
    expect(selectorAutotrack.lastResult()).toBeUndefined()
    expect(selectorDefault.recomputations()).toBe(0)
    expect(selectorAutotrack.recomputations()).toBe(0)
    expect(selectorDefault(state)).toStrictEqual([0, 1])
    expect(selectorAutotrack(state)).toStrictEqual([0, 1])
    expect(selectorDefault.recomputations()).toBe(1)
    expect(selectorAutotrack.recomputations()).toBe(1)
    selectorDefault({
      todos: [
        { id: 0, completed: false },
        { id: 1, completed: false }
      ]
    })
    const defaultSelectorLastResult1 = selectorDefault.lastResult()
    selectorDefault({
      todos: [
        { id: 0, completed: true },
        { id: 1, completed: true }
      ]
    })
    const defaultSelectorLastResult2 = selectorDefault.lastResult()
    selectorAutotrack({
      todos: [
        { id: 0, completed: false },
        { id: 1, completed: false }
      ]
    })
    const autotrackSelectorLastResult1 = selectorAutotrack.lastResult()
    selectorAutotrack({
      todos: [
        { id: 0, completed: true }, // flipping completed flag does not cause the autotrack memoizer to re-run.
        { id: 1, completed: true }
      ]
    })
    const autotrackSelectorLastResult2 = selectorAutotrack.lastResult()
    expect(selectorDefault.recomputations()).toBe(3)
    expect(selectorAutotrack.recomputations()).toBe(1)
    expect(autotrackSelectorLastResult1).toBe(autotrackSelectorLastResult2)
    expect(defaultSelectorLastResult1).not.toBe(defaultSelectorLastResult2) // Default memoize does not preserve referential equality but autotrack does.
    expect(defaultSelectorLastResult1).toStrictEqual(defaultSelectorLastResult2)
  })

  test('args memoize', () => {
    interface State {
      todos: {
        id: number
        completed: boolean
      }[]
    }
    const state: State = {
      todos: [
        { id: 0, completed: false },
        { id: 1, completed: false }
      ]
    }
    const selectorDefault = createSelector(
      (state: State) => state.todos,
      todos => todos.map(t => t.id),
      { argsMemoizeOptions: { maxSize: 2 }, argsMemoizeMethod: defaultMemoize }
    )
    const selectorAutotrack = createSelector(
      (state: State) => state.todos,
      todos => todos.map(t => t.id),
      {}
    )
    const createSelectorFunc = createSelectorCreator(microMemoize)
    const createSelectorObj = createSelectorCreator({
      memoizeMethod: defaultMemoize,
      argsMemoizeMethod: defaultMemoize,
      memoizeOptions: { maxSize: 2 },
      argsMemoizeOptions: { maxSize: 2 }
    })
    const selectorFunc = createSelectorFunc(
      (state: State) => state.todos,
      todos => todos.map(t => t.id),
      {
        memoizeMethod: defaultMemoize,
        memoizeOptions: { maxSize: 2 },
        argsMemoizeMethod: defaultMemoize,
        argsMemoizeOptions: { maxSize: 2 }
      }
    )
    const selectorObj = createSelectorObj(
      (state: State) => state.todos,
      todos => todos.map(t => t.id),
      {
        memoizeMethod: defaultMemoize,
        memoizeOptions: { maxSize: 2 },
        argsMemoizeMethod: defaultMemoize,
        argsMemoizeOptions: { maxSize: 2 }
      }
    )
    expect(selectorDefault({ ...state })).toStrictEqual([0, 1])
    expect(selectorAutotrack({ ...state })).toStrictEqual([0, 1])
    expect(selectorDefault.recomputations()).toBe(1)
    expect(selectorAutotrack.recomputations()).toBe(1)
    selectorDefault({
      todos: [
        { id: 0, completed: false },
        { id: 1, completed: false }
      ]
    })
    const defaultSelectorLastResult1 = selectorDefault.lastResult()
    selectorDefault({
      todos: [
        { id: 0, completed: true },
        { id: 1, completed: true }
      ]
    })
    const defaultSelectorLastResult2 = selectorDefault.lastResult()
    selectorAutotrack({
      todos: [
        { id: 0, completed: false },
        { id: 1, completed: false }
      ]
    })
    const autotrackSelectorLastResult1 = selectorAutotrack.lastResult()
    selectorAutotrack({
      todos: [
        { id: 0, completed: true }, // flipping completed flag does not cause the autotrack memoizer to re-run.
        { id: 1, completed: true }
      ]
    })
    const autotrackSelectorLastResult2 = selectorAutotrack.lastResult()
    expect(selectorDefault.recomputations()).toBe(3)
    expect(selectorAutotrack.recomputations()).toBe(1)
    expect(autotrackSelectorLastResult1).toBe(autotrackSelectorLastResult2)
    expect(defaultSelectorLastResult1).not.toBe(defaultSelectorLastResult2) // Default memoize does not preserve referential equality but autotrack does.
    expect(defaultSelectorLastResult1).toStrictEqual(defaultSelectorLastResult2)
  })
})
