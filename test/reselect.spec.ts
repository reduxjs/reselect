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
  test('passing memoize directly to createSelector', () => {
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
      {
        argsMemoize: defaultMemoize,
        argsMemoizeOptions: {
          equalityCheck: (a, b) => a === b,
          resultEqualityCheck: (a, b) => a === b
        }
      }
    )
    // const selectorDefaultParametric = createSelector(
    //   (state: State, id: number) => id,
    //   (state: State) => state.todos,
    //   (id, todos) => todos.filter(t => t.id === id),
    //   {
    //     argsMemoize: defaultMemoize,
    //     inputStabilityCheck: 'never',
    //     memoize: defaultMemoize,
    //     memoizeOptions: {
    //       equalityCheck: (a, b) => {
    //         console.log(
    //           'memoize equalityCheck run',
    //           { prev: a },
    //           '\n',
    //           { curr: b },
    //           a === b
    //         )
    //         return a === b
    //       },
    //       resultEqualityCheck: (a, b) => {
    //         console.log(
    //           'memoize resultEqualityCheck run',
    //           { prev: a },
    //           '\n',
    //           { curr: b },
    //           a === b
    //         )
    //         return a === b
    //       }
    //     },
    //     argsMemoizeOptions: {
    //       equalityCheck: (a, b) => {
    //         console.log(
    //           'argsMemoize equalityCheck run',
    //           { prev: a },
    //           '\n',
    //           { curr: b },
    //           a === b
    //         )
    //         return a === b
    //       },
    //       resultEqualityCheck: (a, b) => {
    //         console.log(
    //           'argsMemoize resultEqualityCheck run',
    //           { prev: a },
    //           '\n',
    //           { curr: b },
    //           a === b
    //         )
    //         return a === b
    //       }
    //     }
    //   }
    // )
    // selectorDefaultParametric(state, 0)
    // selectorDefaultParametric(state, 1)
    // selectorDefaultParametric(state, 1)
    // selectorDefaultParametric(
    //   {
    //     todos: [
    //       { id: 0, completed: false },
    //       { id: 1, completed: false }
    //     ]
    //   },
    //   1
    // )
    // selectorDefaultParametric(
    //   {
    //     todos: [
    //       { id: 0, completed: false },
    //       { id: 1, completed: false }
    //     ]
    //   },
    //   0
    // )
    // selectorDefaultParametric(
    //   {
    //     todos: [
    //       { id: 0, completed: false },
    //       { id: 1, completed: false }
    //     ]
    //   },
    //   0
    // )
    const createSelectorDefaultObj = createSelectorCreator({
      memoize: defaultMemoize
    })
    const createSelectorDefaultFunc = createSelectorCreator(defaultMemoize)
    const createSelectorMicroObj = createSelectorCreator({
      memoize: microMemoize
    })
    const createSelectorMicroFunc = createSelectorCreator(microMemoize)
    const createSelectorMicroObjWithArgsMemoize = createSelectorCreator({
      memoize: microMemoize,
      argsMemoize: microMemoize,
      memoizeOptions: { isEqual: (a, b) => a === b },
      argsMemoizeOptions: { isEqual: (a, b) => a === b }
    })
    const createSelectorLodashFunc = createSelectorCreator(lodashMemoize)
    const selectorLodashFunc = createSelectorLodashFunc(
      (state: State) => state.todos,
      todos => todos.map(t => t.id)
    )
    const selectorDefaultObj = createSelectorDefaultObj(
      (state: State) => state.todos,
      todos => todos.map(t => t.id)
    )

    // @ts-expect-error
    expect(selectorDefaultObj.fn).toBeUndefined()
    // @ts-expect-error
    expect(selectorDefaultObj.cache).toBeUndefined()
    // @ts-expect-error
    expect(selectorDefaultObj.isMemoized).toBeUndefined()
    // @ts-expect-error
    expect(selectorDefaultObj.options).toBeUndefined()
    expect(selectorDefaultObj.lastResult).toBeDefined()
    expect(selectorDefaultObj.recomputations).toBeDefined()
    expect(selectorDefaultObj.dependencies).toBeDefined()
    expect(selectorDefaultObj.resetRecomputations).toBeDefined()
    expect(selectorDefaultObj.resultFunc).toBeDefined()
    expect(selectorDefaultObj.clearCache).toBeDefined()
    expect(selectorDefaultObj.memoizedResultFunc).toBeDefined()
    // @ts-expect-error
    expect(selectorDefaultObj.memoizedResultFunc.cache).toBeUndefined()
    expect(selectorDefaultObj.memoizedResultFunc.clearCache).toBeDefined()
    const selectorDefaultFunc = createSelectorDefaultFunc(
      (state: State) => state.todos,
      todos => todos.map(t => t.id)
    )
    // @ts-expect-error
    expect(selectorDefaultFunc.fn).toBeUndefined()
    // @ts-expect-error
    expect(selectorDefaultFunc.cache).toBeUndefined()
    // @ts-expect-error
    expect(selectorDefaultFunc.isMemoized).toBeUndefined()
    // @ts-expect-error
    expect(selectorDefaultFunc.options).toBeUndefined()
    expect(selectorDefaultFunc.lastResult).toBeDefined()
    expect(selectorDefaultFunc.recomputations).toBeDefined()
    expect(selectorDefaultFunc.dependencies).toBeDefined()
    expect(selectorDefaultFunc.resetRecomputations).toBeDefined()
    expect(selectorDefaultFunc.resultFunc).toBeDefined()
    expect(selectorDefaultFunc.clearCache).toBeDefined()
    expect(selectorDefaultFunc.memoizedResultFunc).toBeDefined()
    // @ts-expect-error
    expect(selectorDefaultFunc.memoizedResultFunc.cache).toBeUndefined()
    expect(selectorDefaultFunc.memoizedResultFunc.clearCache).toBeDefined()
    const selectorMicroFunc = createSelectorMicroFunc(
      (state: State) => state.todos,
      todos => todos.map(t => t.id)
    )
    const selectorMicroObj = createSelectorMicroObj(
      (state: State) => state.todos,
      todos => todos.map(t => t.id)
    )
    selectorMicroObj(state)
    // @ts-expect-error
    expect(selectorMicroObj.fn).toBeUndefined()
    // @ts-expect-error
    expect(selectorMicroObj.cache).toBeUndefined()
    // @ts-expect-error
    expect(selectorMicroObj.isMemoized).toBeUndefined()
    // @ts-expect-error
    expect(selectorMicroObj.options).toBeUndefined()
    expect(selectorMicroObj.lastResult).toBeDefined()
    expect(selectorMicroObj.recomputations).toBeDefined()
    expect(selectorMicroObj.dependencies).toBeDefined()
    expect(selectorMicroObj.resetRecomputations).toBeDefined()
    expect(selectorMicroObj.resultFunc).toBeDefined()
    expect(selectorMicroObj.clearCache).toBeDefined()
    expect(selectorMicroObj.memoizedResultFunc).toBeDefined()
    expect(selectorMicroObj.memoizedResultFunc.cache).toBeDefined()
    // @ts-expect-error
    expect(selectorMicroObj.memoizedResultFunc.clearCache).toBeUndefined()
    // @ts-expect-error
    expect(selectorMicroFunc.fn).toBeUndefined()
    // @ts-expect-error
    expect(selectorMicroFunc.cache).toBeUndefined()
    // @ts-expect-error
    expect(selectorMicroFunc.isMemoized).toBeUndefined()
    // @ts-expect-error
    expect(selectorMicroFunc.options).toBeUndefined()
    expect(selectorMicroFunc.lastResult).toBeDefined()
    expect(selectorMicroFunc.recomputations).toBeDefined()
    expect(selectorMicroFunc.dependencies).toBeDefined()
    expect(selectorMicroFunc.resetRecomputations).toBeDefined()
    expect(selectorMicroFunc.resultFunc).toBeDefined()
    expect(selectorMicroFunc.clearCache).toBeDefined()
    expect(selectorMicroFunc.memoizedResultFunc).toBeDefined()
    expect(selectorMicroFunc.memoizedResultFunc.cache).toBeDefined()
    // @ts-expect-error
    expect(selectorMicroFunc.memoizedResultFunc.clearCache).toBeUndefined()
    // `memoizeOptions` should match params of `microMemoize`
    const selectorMicroObj1 = createSelectorMicroObj(
      (state: State) => state.todos,
      todos => todos.map(t => t.id),
      { memoizeOptions: { isEqual: (a, b) => a === b } }
    )
    // @ts-expect-error
    expect(selectorMicroObj1.fn).toBeUndefined()
    // @ts-expect-error
    expect(selectorMicroObj1.cache).toBeUndefined()
    // @ts-expect-error
    expect(selectorMicroObj1.isMemoized).toBeUndefined()
    // @ts-expect-error
    expect(selectorMicroObj1.options).toBeUndefined()
    expect(selectorMicroObj1.lastResult).toBeDefined()
    expect(selectorMicroObj1.recomputations).toBeDefined()
    expect(selectorMicroObj1.dependencies).toBeDefined()
    expect(selectorMicroObj1.resetRecomputations).toBeDefined()
    expect(selectorMicroObj1.resultFunc).toBeDefined()
    // Because `argsMemoize` is `defaultMemoize`.
    expect(selectorMicroObj1.clearCache).toBeDefined()
    expect(selectorMicroObj1.memoizedResultFunc).toBeDefined()
    // This is undefined because `memoize` is set to `microMemoize`.
    // @ts-expect-error
    expect(selectorMicroObj1.memoizedResultFunc.clearCache).toBeUndefined()
    expect(selectorMicroObj1.memoizedResultFunc.cache).toBeDefined()
    expect(selectorMicroObj1.memoizedResultFunc.fn).toBeDefined()
    expect(selectorMicroObj1.memoizedResultFunc.isMemoized).toBeDefined()
    expect(selectorMicroObj1.memoizedResultFunc.options).toBeDefined()
    // memoizeOptions should match params of defaultMemoize
    const selectorMicroObj2 = createSelectorMicroObj(
      (state: State) => state.todos,
      todos => todos.map(t => t.id),
      { memoize: defaultMemoize }
    )
    const selectorMicroObj3 = createSelectorMicroObj(
      (state: State) => state.todos,
      todos => todos.map(t => t.id),
      {
        memoize: defaultMemoize,
        memoizeOptions: { equalityCheck: (a: any, b: any) => a === b },
        argsMemoize: microMemoize,
        argsMemoizeOptions: { isEqual: (a, b) => a === b }
      }
    )
    expect(selectorMicroObj3(state)).toBeDefined()
    // @ts-expect-error
    expect(selectorMicroObj2.fn).toBeUndefined()
    // @ts-expect-error
    expect(selectorMicroObj2.cache).toBeUndefined()
    // @ts-expect-error
    expect(selectorMicroObj2.isMemoized).toBeUndefined()
    // @ts-expect-error
    expect(selectorMicroObj2.options).toBeUndefined()
    expect(selectorMicroObj2.lastResult).toBeDefined()
    expect(selectorMicroObj2.recomputations).toBeDefined()
    expect(selectorMicroObj2.dependencies).toBeDefined()
    expect(selectorMicroObj2.resetRecomputations).toBeDefined()
    expect(selectorMicroObj2.resultFunc).toBeDefined()
    // Because argsMemoize is defaultMemoize
    expect(selectorMicroObj2.clearCache).toBeDefined()
    expect(selectorMicroObj2.memoizedResultFunc).toBeDefined()
    // @ts-expect-error
    expect(selectorMicroObj2.memoizedResultFunc.cache).toBeUndefined()
    // Because memoize is
    expect(selectorMicroObj2.memoizedResultFunc.clearCache).toBeDefined()
    selectorMicroObj2(state)
    expect(selectorMicroObj3.fn).toBeDefined()
    expect(selectorMicroObj3.cache).toBeDefined()
    expect(selectorMicroObj3.isMemoized).toBeDefined()
    expect(selectorMicroObj3.options).toBeDefined()
    expect(selectorMicroObj3.lastResult).toBeDefined()
    expect(selectorMicroObj3.recomputations).toBeDefined()
    expect(selectorMicroObj3.dependencies).toBeDefined()
    expect(selectorMicroObj3.resetRecomputations).toBeDefined()
    expect(selectorMicroObj3.resultFunc).toBeDefined()
    // @ts-expect-error
    expect(selectorMicroObj3.clearCache).toBeUndefined()
    expect(selectorMicroObj3.memoizedResultFunc).toBeDefined()
    // @ts-expect-error
    expect(selectorMicroObj3.memoizedResultFunc.cache).toBeUndefined()
    expect(selectorMicroObj3.memoizedResultFunc.clearCache).toBeDefined()
    const selectorLodashObjWithArgsMemoize =
      createSelectorMicroObjWithArgsMemoize(
        (state: State) => state.todos,
        todos => todos.map(t => t.id)
      )

    expect(selectorLodashObjWithArgsMemoize.fn).toBeDefined()
    expect(selectorLodashObjWithArgsMemoize.cache).toBeDefined()
    expect(selectorLodashObjWithArgsMemoize.isMemoized).toBeDefined()
    expect(selectorLodashObjWithArgsMemoize.options).toBeDefined()
    expect(selectorLodashObjWithArgsMemoize.lastResult).toBeDefined()
    expect(selectorLodashObjWithArgsMemoize.recomputations).toBeDefined()
    expect(selectorLodashObjWithArgsMemoize.dependencies).toBeDefined()
    expect(selectorLodashObjWithArgsMemoize.resetRecomputations).toBeDefined()
    expect(selectorLodashObjWithArgsMemoize.resultFunc).toBeDefined()
    expect(selectorLodashObjWithArgsMemoize.memoizedResultFunc).toBeDefined()
    expect(
      selectorLodashObjWithArgsMemoize.memoizedResultFunc.cache
    ).toBeDefined()
    expect(selectorLodashObjWithArgsMemoize.memoizedResultFunc.fn).toBeDefined()
    expect(
      selectorLodashObjWithArgsMemoize.memoizedResultFunc.isMemoized
    ).toBeDefined()
    expect(
      selectorLodashObjWithArgsMemoize.memoizedResultFunc.options
    ).toBeDefined()

    expect(selectorMicroObj.lastResult).toBeDefined()
    expect(selectorMicroObj.recomputations).toBeDefined()
    expect(selectorMicroObj.dependencies).toBeDefined()
    expect(selectorMicroObj.resetRecomputations).toBeDefined()
    expect(selectorMicroObj.resultFunc).toBeDefined()
    expect(selectorMicroObj.memoizedResultFunc.cache).toBeDefined()
    // @ts-expect-error
    expect(selectorMicroObj.cache).toBeUndefined()
    expect(selectorMicroObj.clearCache).toBeDefined()

    // @ts-expect-error
    expect(selectorMicroObj.cache).toBeUndefined()
    // @ts-expect-error
    expect(selectorLodashObjWithArgsMemoize.clearCache).toBeUndefined()
    expect(selectorLodashObjWithArgsMemoize.cache).toBeDefined()
    expect(selectorLodashFunc.clearCache).toBeDefined()
    // @ts-expect-error
    expect(selectorLodashFunc.cache).toBeUndefined()
    const selectorAutotrack = createSelector(
      (state: State) => state.todos,
      todos => todos.map(t => t.id),
      { memoize: autotrackMemoize }
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

  test('passing argsMemoize directly to createSelector', () => {
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
    const otherCreateSelector = createSelectorCreator({
      memoize: microMemoize,
      argsMemoize: microMemoize
    })
    // Overriding back to default
    const selectorDefault = otherCreateSelector(
      (state: State) => state.todos,
      todos => todos.map(t => t.id),
      {
        memoize: defaultMemoize,
        argsMemoize: defaultMemoize,
        argsMemoizeOptions: {
          equalityCheck: (a, b) => a === b,
          resultEqualityCheck: (a, b) => a === b
        },
        memoizeOptions: {
          equalityCheck: (a, b) => a === b,
          resultEqualityCheck: (a, b) => a === b
        }
      }
    )
    const selectorAutotrack = createSelector(
      (state: State) => state.todos,
      todos => todos.map(t => t.id)
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
    selectorDefault(state)
    selectorDefault(state)
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
        { id: 0, completed: true },
        { id: 1, completed: true }
      ]
    })
    const autotrackSelectorLastResult2 = selectorAutotrack.lastResult()
    expect(selectorDefault.recomputations()).toBe(4)
    expect(selectorAutotrack.recomputations()).toBe(3)
    expect(autotrackSelectorLastResult1).not.toBe(autotrackSelectorLastResult2)
    expect(defaultSelectorLastResult1).not.toBe(defaultSelectorLastResult2)
    expect(defaultSelectorLastResult1).toStrictEqual(defaultSelectorLastResult2)
  })

  test('passing argsMemoize to createSelectorCreator', () => {
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
    const createSelectorMicroMemoize = createSelectorCreator({
      memoize: microMemoize,
      memoizeOptions: { isEqual: (a, b) => a === b },
      argsMemoize: microMemoize,
      argsMemoizeOptions: { isEqual: (a, b) => a === b }
    })
    const selectorMicroMemoize = createSelectorMicroMemoize(
      (state: State) => state.todos,
      todos => todos.map(t => t.id)
    )
    expect(selectorMicroMemoize(state)).toBeDefined()
    // Checking existence of fields related to `argsMemoize`
    expect(selectorMicroMemoize.cache).toBeDefined()
    expect(selectorMicroMemoize.fn).toBeDefined()
    expect(selectorMicroMemoize.isMemoized).toBeDefined()
    expect(selectorMicroMemoize.options).toBeDefined()
    // @ts-expect-error
    expect(selectorMicroMemoize.clearCache).toBeUndefined()
    // Checking existence of fields related to `memoize`
    expect(selectorMicroMemoize.memoizedResultFunc.cache).toBeDefined()
    expect(selectorMicroMemoize.memoizedResultFunc.fn).toBeDefined()
    expect(selectorMicroMemoize.memoizedResultFunc.isMemoized).toBeDefined()
    expect(selectorMicroMemoize.memoizedResultFunc.options).toBeDefined()
    // @ts-expect-error
    expect(selectorMicroMemoize.memoizedResultFunc.clearCache).toBeUndefined()
    expect(selectorMicroMemoize.memoizedResultFunc).toBeDefined()
    // Checking existence of fields related to the actual memoized selector
    expect(selectorMicroMemoize.dependencies).toBeDefined()
    expect(selectorMicroMemoize.lastResult()).toBeDefined()
    expect(
      selectorMicroMemoize.memoizedResultFunc([{ id: 0, completed: true }])
    ).toBeDefined()
    expect(selectorMicroMemoize.recomputations()).toBeDefined()
    expect(selectorMicroMemoize.resetRecomputations()).toBeDefined()
    expect(selectorMicroMemoize.resultFunc).toBeDefined()
    expect(
      selectorMicroMemoize.resultFunc([{ id: 0, completed: true }])
    ).toBeDefined()

    // Checking to see if types dynamically change if memoize or argsMemoize or overridden inside `createSelector`
    const selectorMicroMemoizeOverridden = createSelectorMicroMemoize(
      (state: State) => state.todos,
      todos => todos.map(t => t.id),
      {
        memoize: defaultMemoize,
        argsMemoize: defaultMemoize,
        memoizeOptions: { equalityCheck: (a, b) => a === b, maxSize: 2 },
        argsMemoizeOptions: { equalityCheck: (a, b) => a === b, maxSize: 3 }
      }
    )
    expect(selectorMicroMemoizeOverridden(state)).toBeDefined()
    // Checking existence of fields related to `argsMemoize`
    expect(selectorMicroMemoizeOverridden.clearCache).toBeDefined()
    // @ts-expect-error
    expect(selectorMicroMemoizeOverridden.cache).toBeUndefined()
    // @ts-expect-error
    expect(selectorMicroMemoizeOverridden.fn).toBeUndefined()
    // @ts-expect-error
    expect(selectorMicroMemoizeOverridden.isMemoized).toBeUndefined()
    // @ts-expect-error
    expect(selectorMicroMemoizeOverridden.options).toBeUndefined()
    // Checking existence of fields related to `memoize`
    expect(
      selectorMicroMemoizeOverridden.memoizedResultFunc.clearCache
    ).toBeDefined()
    expect(
      // @ts-expect-error
      selectorMicroMemoizeOverridden.memoizedResultFunc.cache
    ).toBeUndefined()
    // @ts-expect-error
    expect(selectorMicroMemoizeOverridden.memoizedResultFunc.fn).toBeUndefined()
    expect(
      // @ts-expect-error
      selectorMicroMemoizeOverridden.memoizedResultFunc.isMemoized
    ).toBeUndefined()
    expect(
      // @ts-expect-error
      selectorMicroMemoizeOverridden.memoizedResultFunc.options
    ).toBeUndefined()
    // Checking existence of fields related to the actual memoized selector
    expect(selectorMicroMemoizeOverridden.dependencies).toBeDefined()
    expect(selectorMicroMemoizeOverridden.lastResult()).toBeDefined()
    expect(
      selectorMicroMemoizeOverridden.memoizedResultFunc([
        { id: 0, completed: true }
      ])
    ).toBeDefined()
    expect(selectorMicroMemoizeOverridden.memoizedResultFunc).toBeDefined()
    expect(selectorMicroMemoizeOverridden.recomputations()).toBeDefined()
    expect(selectorMicroMemoizeOverridden.resetRecomputations()).toBeDefined()
    expect(selectorMicroMemoizeOverridden.resultFunc).toBeDefined()
    expect(
      selectorMicroMemoizeOverridden.resultFunc([{ id: 0, completed: true }])
    ).toBeDefined()

    const selectorMicroMemoizeOverrideArgsMemoizeOnly =
      createSelectorMicroMemoize(
        (state: State) => state.todos,
        todos => todos.map(t => t.id),
        {
          argsMemoize: defaultMemoize,
          argsMemoizeOptions: { resultEqualityCheck: (a, b) => a === b }
        }
      )
    expect(selectorMicroMemoizeOverrideArgsMemoizeOnly(state)).toBeDefined()
    // Checking existence of fields related to `argsMemoize`
    expect(selectorMicroMemoizeOverrideArgsMemoizeOnly.clearCache).toBeDefined()
    // @ts-expect-error
    expect(selectorMicroMemoizeOverrideArgsMemoizeOnly.cache).toBeUndefined()
    // @ts-expect-error
    expect(selectorMicroMemoizeOverrideArgsMemoizeOnly.fn).toBeUndefined()
    expect(
      // @ts-expect-error
      selectorMicroMemoizeOverrideArgsMemoizeOnly.isMemoized
    ).toBeUndefined()
    // @ts-expect-error
    expect(selectorMicroMemoizeOverrideArgsMemoizeOnly.options).toBeUndefined()
    expect(
      // Checking existence of fields related to `memoize`
      // @ts-expect-error Note that since we did not override `memoize` in the options object,
      // memoizedResultFunc.clearCache becomes an invalid field access, and we get `cache`, `fn`, `isMemoized` and `options` instead.
      selectorMicroMemoizeOverrideArgsMemoizeOnly.memoizedResultFunc.clearCache
    ).toBeUndefined()
    expect(
      selectorMicroMemoizeOverrideArgsMemoizeOnly.memoizedResultFunc.cache
    ).toBeDefined()
    expect(
      selectorMicroMemoizeOverrideArgsMemoizeOnly.memoizedResultFunc.fn
    ).toBeDefined()
    expect(
      selectorMicroMemoizeOverrideArgsMemoizeOnly.memoizedResultFunc.isMemoized
    ).toBeDefined()
    expect(
      selectorMicroMemoizeOverrideArgsMemoizeOnly.memoizedResultFunc.options
    ).toBeDefined()
    // Checking existence of fields related to the actual memoized selector
    expect(
      selectorMicroMemoizeOverrideArgsMemoizeOnly.dependencies
    ).toBeDefined()
    expect(
      selectorMicroMemoizeOverrideArgsMemoizeOnly.lastResult()
    ).toBeDefined()
    expect(
      selectorMicroMemoizeOverrideArgsMemoizeOnly.memoizedResultFunc([
        { id: 0, completed: true }
      ])
    ).toBeDefined()
    expect(
      selectorMicroMemoizeOverrideArgsMemoizeOnly.memoizedResultFunc
    ).toBeDefined()
    expect(
      selectorMicroMemoizeOverrideArgsMemoizeOnly.recomputations()
    ).toBeDefined()
    expect(
      selectorMicroMemoizeOverrideArgsMemoizeOnly.resetRecomputations()
    ).toBeDefined()
    expect(selectorMicroMemoizeOverrideArgsMemoizeOnly.resultFunc).toBeDefined()
    expect(
      selectorMicroMemoizeOverrideArgsMemoizeOnly.resultFunc([
        { id: 0, completed: true }
      ])
    ).toBeDefined()

    const selectorMicroMemoizeOverrideMemoizeOnly = createSelectorMicroMemoize(
      (state: State) => state.todos,
      todos => todos.map(t => t.id),
      {
        memoize: defaultMemoize,
        memoizeOptions: { resultEqualityCheck: (a, b) => a === b }
      }
    )
    expect(selectorMicroMemoizeOverrideMemoizeOnly(state)).toBeDefined()
    // Checking existence of fields related to `argsMemoize`
    // @ts-expect-error Note that since we did not override `argsMemoize` in the options object,
    // selector.clearCache becomes an invalid field access, and we get `cache`, `fn`, `isMemoized` and `options` instead.
    expect(selectorMicroMemoizeOverrideMemoizeOnly.clearCache).toBeUndefined()
    expect(selectorMicroMemoizeOverrideMemoizeOnly.cache).toBeDefined()
    expect(selectorMicroMemoizeOverrideMemoizeOnly.fn).toBeDefined()
    expect(selectorMicroMemoizeOverrideMemoizeOnly.isMemoized).toBeDefined()
    expect(selectorMicroMemoizeOverrideMemoizeOnly.options).toBeDefined()
    // Checking existence of fields related to `memoize`
    expect(
      // @ts-expect-error
      selectorMicroMemoizeOverrideMemoizeOnly.memoizedResultFunc.cache
    ).toBeUndefined()
    expect(
      // @ts-expect-error
      selectorMicroMemoizeOverrideMemoizeOnly.memoizedResultFunc.fn
    ).toBeUndefined()
    expect(
      // @ts-expect-error
      selectorMicroMemoizeOverrideMemoizeOnly.memoizedResultFunc.isMemoized
    ).toBeUndefined()
    expect(
      // @ts-expect-error
      selectorMicroMemoizeOverrideMemoizeOnly.memoizedResultFunc.options
    ).toBeUndefined()
    expect(
      selectorMicroMemoizeOverrideMemoizeOnly.memoizedResultFunc.clearCache
    ).toBeDefined()
    // Checking existence of fields related to the actual memoized selector
    expect(selectorMicroMemoizeOverrideMemoizeOnly.dependencies).toBeDefined()
    expect(selectorMicroMemoizeOverrideMemoizeOnly.lastResult()).toBeDefined()
    expect(
      selectorMicroMemoizeOverrideMemoizeOnly.memoizedResultFunc([
        { id: 0, completed: true }
      ])
    ).toBeDefined()
    expect(
      selectorMicroMemoizeOverrideMemoizeOnly.memoizedResultFunc
    ).toBeDefined()
    expect(
      selectorMicroMemoizeOverrideMemoizeOnly.recomputations()
    ).toBeDefined()
    expect(
      selectorMicroMemoizeOverrideMemoizeOnly.resetRecomputations()
    ).toBeDefined()
    expect(selectorMicroMemoizeOverrideMemoizeOnly.resultFunc).toBeDefined()
    expect(
      selectorMicroMemoizeOverrideMemoizeOnly.resultFunc([
        { id: 0, completed: true }
      ])
    ).toBeDefined()
    // If we don't pass in `argsMemoize`, the type for `argsMemoizeOptions` falls back to the options parameter of `defaultMemoize`.
    const createSelectorMicroMemoizeArgsMemoizeOptionsFallbackToDefault =
      createSelectorCreator({
        memoize: microMemoize,
        memoizeOptions: { isPromise: false },
        argsMemoizeOptions: { resultEqualityCheck: (a, b) => a === b }
      })
    const selectorMicroMemoizeArgsMemoizeOptionsFallbackToDefault =
      createSelectorMicroMemoizeArgsMemoizeOptionsFallbackToDefault(
        (state: State) => state.todos,
        todos => todos.map(t => t.id)
      )
    expect(
      selectorMicroMemoizeArgsMemoizeOptionsFallbackToDefault(state)
    ).toBeDefined()
    expect(
      selectorMicroMemoizeArgsMemoizeOptionsFallbackToDefault.clearCache
    ).toBeDefined()
    expect(
      // @ts-expect-error
      selectorMicroMemoizeArgsMemoizeOptionsFallbackToDefault.cache
    ).toBeUndefined()
    expect(
      // @ts-expect-error
      selectorMicroMemoizeArgsMemoizeOptionsFallbackToDefault.fn
    ).toBeUndefined()
    expect(
      // @ts-expect-error
      selectorMicroMemoizeArgsMemoizeOptionsFallbackToDefault.isMemoized
    ).toBeUndefined()
    expect(
      // @ts-expect-error
      selectorMicroMemoizeArgsMemoizeOptionsFallbackToDefault.options
    ).toBeUndefined()
    // Checking existence of fields related to `memoize`
    expect(
      selectorMicroMemoizeArgsMemoizeOptionsFallbackToDefault.memoizedResultFunc
        .cache
    ).toBeDefined()
    expect(
      selectorMicroMemoizeArgsMemoizeOptionsFallbackToDefault.memoizedResultFunc
        .fn
    ).toBeDefined()
    expect(
      selectorMicroMemoizeArgsMemoizeOptionsFallbackToDefault.memoizedResultFunc
        .isMemoized
    ).toBeDefined()
    expect(
      selectorMicroMemoizeArgsMemoizeOptionsFallbackToDefault.memoizedResultFunc
        .options
    ).toBeDefined()
    expect(
      selectorMicroMemoizeArgsMemoizeOptionsFallbackToDefault.dependencies
    ).toBeDefined()
    expect(
      selectorMicroMemoizeArgsMemoizeOptionsFallbackToDefault.lastResult()
    ).toBeDefined()
    expect(
      selectorMicroMemoizeArgsMemoizeOptionsFallbackToDefault.memoizedResultFunc(
        [{ id: 0, completed: true }]
      )
    ).toBeDefined()
    expect(
      selectorMicroMemoizeArgsMemoizeOptionsFallbackToDefault.memoizedResultFunc
    ).toBeDefined()
    expect(
      selectorMicroMemoizeArgsMemoizeOptionsFallbackToDefault.recomputations()
    ).toBeDefined()
    expect(
      selectorMicroMemoizeArgsMemoizeOptionsFallbackToDefault.resetRecomputations()
    ).toBeDefined()
    expect(
      selectorMicroMemoizeArgsMemoizeOptionsFallbackToDefault.resultFunc
    ).toBeDefined()
    expect(
      selectorMicroMemoizeArgsMemoizeOptionsFallbackToDefault.resultFunc([
        { id: 0, completed: true }
      ])
    ).toBeDefined()
  })

  test('passing argsMemoize directly to createSelector', () => {
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
    // original options untouched.
    const selectorOriginal = createSelector(
      (state: State) => state.todos,
      todos => todos.map(t => t.id)
    )
    selectorOriginal(state)
    // Call with new reference to force the selector to re-run
    selectorOriginal({
      todos: [
        { id: 0, completed: false },
        { id: 1, completed: false }
      ]
    })
    selectorOriginal({
      todos: [
        { id: 0, completed: false },
        { id: 1, completed: false }
      ]
    })
    // Override `argsMemoize` with `autotrackMemoize`
    const selectorOverrideArgsMemoize = createSelector(
      (state: State) => state.todos,
      todos => todos.map(t => t.id),
      {
        memoize: defaultMemoize,
        memoizeOptions: { equalityCheck: (a, b) => a === b },
        // WARNING!! This is just for testing purposes, do not use `autotrackMemoize` to memoize the arguments,
        // it can return false positives, since it's not tracking a nested field.
        argsMemoize: autotrackMemoize
      }
    )
    selectorOverrideArgsMemoize(state)
    // Call with new reference to force the selector to re-run
    selectorOverrideArgsMemoize({
      todos: [
        { id: 0, completed: false },
        { id: 1, completed: false }
      ]
    })
    selectorOverrideArgsMemoize({
      todos: [
        { id: 0, completed: false },
        { id: 1, completed: false }
      ]
    })
    expect(selectorOverrideArgsMemoize.recomputations()).toBe(1)
    expect(selectorOriginal.recomputations()).toBe(3)
  })
})
