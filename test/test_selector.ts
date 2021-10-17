// TODO: Add test for React Redux connect function

import chai from 'chai'
import {  createSelector, createSelectorCreator, defaultMemoize, createStructuredSelector  } from '../src/index'
import {  default as lodashMemoize  } from 'lodash.memoize'

const assert = chai.assert

// Construct 1E6 states for perf test outside of the perf test so as to not change the execute time of the test function
const numOfStates = 1000000
const states = []

for (let i = 0; i < numOfStates; i++) {
  states.push({ a: 1, b: 2 })
}

suite('selector', () => {
  test('basic selector', () => {
    const selector = createSelector(
      state => state.a,
      a => a
    )
    const firstState = { a: 1 }
    const firstStateNewPointer = { a: 1 }
    const secondState = { a: 2 }

    assert.equal(selector(firstState), 1)
    assert.equal(selector(firstState), 1)
    assert.equal(selector.recomputations(), 1)
    assert.equal(selector(firstStateNewPointer), 1)
    assert.equal(selector.recomputations(), 1)
    assert.equal(selector(secondState), 2)
    assert.equal(selector.recomputations(), 2)
  })
  test('don\'t pass extra parameters to inputSelector when only called with the state', () => {
    const selector = createSelector(
      (...params) => params.length,
      a => a
    )
    assert.equal(selector({}), 1)
  })
  test('basic selector multiple keys', () => {
    const selector = createSelector(
      state => state.a,
      state => state.b,
      (a, b) => a + b
    )
    const state1 = { a: 1, b: 2 }
    assert.equal(selector(state1), 3)
    assert.equal(selector(state1), 3)
    assert.equal(selector.recomputations(), 1)
    const state2 = { a: 3, b: 2 }
    assert.equal(selector(state2), 5)
    assert.equal(selector(state2), 5)
    assert.equal(selector.recomputations(), 2)
  })
  test('basic selector invalid input selector', () => {
    assert.throw(() => createSelector(
      state => state.a,
      'not a function',
      (a, b) => a + b
    ), /input-selectors to be functions.*function, string/)
  })
  test('basic selector cache hit performance', () => {
    if (process.env.COVERAGE) {
      return // don't run performance tests for coverage
    }

    const selector = createSelector(
      state => state.a,
      state => state.b,
      (a, b) => a + b
    )
    const state1 = { a: 1, b: 2 }

    const start = new Date()
    for (let i = 0; i < 1000000; i++) {
      selector(state1)
    }
    const totalTime = new Date() - start

    assert.equal(selector(state1), 3)
    assert.equal(selector.recomputations(), 1)
    assert.isBelow(
      totalTime,
      1000,
      'Expected a million calls to a selector with the same arguments to take less than 1 second'
    )
  })
  test('basic selector cache hit performance for state changes but shallowly equal selector args', () => {
    if (process.env.COVERAGE) {
      return // don't run performance tests for coverage
    }

    const selector = createSelector(
      state => state.a,
      state => state.b,
      (a, b) => a + b
    )

    const start = new Date()
    for (let i = 0; i < numOfStates; i++) {
      selector(states[i])
    }
    const totalTime = new Date() - start

    assert.equal(selector(states[0]), 3)
    assert.equal(selector.recomputations(), 1)
    assert.isBelow(
      totalTime,
      1000,
      'Expected a million calls to a selector with the same arguments to take less than 1 second'
    )
  })
  test('memoized composite arguments', () => {
    const selector = createSelector(
      state => state.sub,
        sub => sub
    )
    const state1 = {  sub: {  a: 1  }  }
    assert.deepEqual(selector(state1), {  a: 1  })
    assert.deepEqual(selector(state1), {  a: 1  })
    assert.equal(selector.recomputations(), 1)
    const state2 = {  sub: {  a: 2  }  }
    assert.deepEqual(selector(state2), {  a: 2  })
    assert.equal(selector.recomputations(), 2)
  })
  test('first argument can be an array', () => {
    const selector = createSelector(
      [ state => state.a, state => state.b ],
      (a, b) => {
        return a + b
      }
    )
    assert.equal(selector({ a: 1, b: 2 }), 3)
    assert.equal(selector({ a: 1, b: 2 }), 3)
    assert.equal(selector.recomputations(), 1)
    assert.equal(selector({ a: 3, b: 2 }), 5)
    assert.equal(selector.recomputations(), 2)
  })
  test('can accept props', () => {
    let called = 0
    const selector = createSelector(
      state => state.a,
      state => state.b,
      (state, props) => props.c,
      (a, b, c) => {
        called++
        return a + b + c
      }
    )
    assert.equal(selector({ a: 1, b: 2 }, { c: 100 }), 103)
  })
  test('recomputes result after exception', () => {
    let called = 0
    const selector = createSelector(
      state => state.a,
      () => {
        called++
        throw Error('test error')
      }
    )
    assert.throw(() => selector({ a: 1 }), 'test error')
    assert.throw(() => selector({ a: 1 }), 'test error')
    assert.equal(called, 2)
  })
  test('memoizes previous result before exception', () => {
    let called = 0
    const selector = createSelector(
      state => state.a,
      a => {
        called++
        if (a > 1) throw Error('test error')
        return a
      }
    )
    const state1 = { a: 1 }
    const state2 = { a: 2 }
    assert.equal(selector(state1), 1)
    assert.throw(() => selector(state2), 'test error')
    assert.equal(selector(state1), 1)
    assert.equal(called, 2)
  })
  test('chained selector', () => {
    const selector1 = createSelector(
      state => state.sub,
      sub => sub
    )
    const selector2 = createSelector(
      selector1,
      sub => sub.value
    )
    const state1 = { sub: {  value: 1 } }
    assert.equal(selector2(state1), 1)
    assert.equal(selector2(state1), 1)
    assert.equal(selector2.recomputations(), 1)
    const state2 = { sub: {  value: 2 } }
    assert.equal(selector2(state2), 2)
    assert.equal(selector2.recomputations(), 2)
  })
  test('chained selector with props', () => {
    const selector1 = createSelector(
      state => state.sub,
      (state, props) => props.x,
      (sub, x) => ({ sub, x })
    )
    const selector2 = createSelector(
      selector1,
      (state, props) => props.y,
      (param, y) => param.sub.value + param.x + y
    )
    const state1 = { sub: {  value: 1 } }
    assert.equal(selector2(state1, { x: 100, y: 200 }), 301)
    assert.equal(selector2(state1, { x: 100, y: 200 }), 301)
    assert.equal(selector2.recomputations(), 1)
    const state2 = { sub: {  value: 2 } }
    assert.equal(selector2(state2, { x: 100, y: 201 }), 303)
    assert.equal(selector2.recomputations(), 2)
  })
  test('chained selector with variadic args', () => {
    const selector1 = createSelector(
      state => state.sub,
      (state, props, another) => props.x + another,
      (sub, x) => ({ sub, x })
    )
    const selector2 = createSelector(
      selector1,
      (state, props) => props.y,
      (param, y) => param.sub.value + param.x + y
    )
    const state1 = { sub: {  value: 1 } }
    assert.equal(selector2(state1, { x: 100, y: 200 }, 100), 401)
    assert.equal(selector2(state1, { x: 100, y: 200 }, 100), 401)
    assert.equal(selector2.recomputations(), 1)
    const state2 = { sub: {  value: 2 } }
    assert.equal(selector2(state2, { x: 100, y: 201 }, 200), 503)
    assert.equal(selector2.recomputations(), 2)
  })
  test('override valueEquals', () => {
    // a rather absurd equals operation we can verify in tests
    const createOverridenSelector = createSelectorCreator(
      defaultMemoize,
      (a, b) => typeof a === typeof b
    )
    const selector = createOverridenSelector(
      state => state.a,
      a => a
    )
    assert.equal(selector({ a: 1 }), 1)
    assert.equal(selector({ a: 2 }), 1) // yes, really true
    assert.equal(selector.recomputations(), 1)
    assert.equal(selector({ a: 'A' }), 'A')
    assert.equal(selector.recomputations(), 2)
  })
  test('custom memoize', () => {
    const hashFn = (...args) => args.reduce((acc, val) => acc + '-' + JSON.stringify(val))
    const customSelectorCreator = createSelectorCreator(
      lodashMemoize,
      hashFn
    )
    const selector = customSelectorCreator(
      state => state.a,
      state => state.b,
      (a, b) => a + b
    )
    assert.equal(selector({ a: 1, b: 2 }), 3)
    assert.equal(selector({ a: 1, b: 2 }), 3)
    assert.equal(selector.recomputations(), 1)
    assert.equal(selector({ a: 1, b: 3 }), 4)
    assert.equal(selector.recomputations(), 2)
    assert.equal(selector({ a: 1, b: 3 }), 4)
    assert.equal(selector.recomputations(), 2)
    assert.equal(selector({ a: 2, b: 3 }), 5)
    assert.equal(selector.recomputations(), 3)
    // TODO: Check correct memoize function was called
  })
  test('exported memoize', () => {
    let called = 0
    const memoized = defaultMemoize(state => {
      called++
      return state.a
    })

    const o1 = { a: 1 }
    const o2 = { a: 2 }
    assert.equal(memoized(o1), 1)
    assert.equal(memoized(o1), 1)
    assert.equal(called, 1)
    assert.equal(memoized(o2), 2)
    assert.equal(called, 2)
  })
  test('exported memoize with multiple arguments', () => {
    const memoized = defaultMemoize((...args) => args.reduce((sum, value) => sum + value, 0))
    assert.equal(memoized(1, 2), 3)
    assert.equal(memoized(1), 1)
  })
  test('exported memoize with valueEquals override', () => {
    // a rather absurd equals operation we can verify in tests
    let called = 0
    const valueEquals = (a, b) => typeof a === typeof b
    const memoized = defaultMemoize(
      a => {
        called++
        return a
      },
      valueEquals
    )
    assert.equal(memoized(1), 1)
    assert.equal(memoized(2), 1) // yes, really true
    assert.equal(called, 1)
    assert.equal(memoized('A'), 'A')
    assert.equal(called, 2)
  })
  test('exported memoize passes correct objects to equalityCheck', () => {
    let fallthroughs = 0
    function shallowEqual(newVal, oldVal) {
      if (newVal === oldVal) return true

      fallthroughs += 1 // code below is expensive and should be bypassed when possible

      let countA = 0
      let countB = 0
      for (let key in newVal) {
        if (Object.hasOwnProperty.call(newVal, key) && newVal[key] !== oldVal[key]) return false
        countA++
      }
      for (let key in oldVal) {
        if (Object.hasOwnProperty.call(oldVal, key)) countB++
      }
      return countA === countB
    }

    const someObject = { foo: 'bar' }
    const anotherObject = { foo: 'bar' }
    const memoized = defaultMemoize(a => a, shallowEqual)

    // the first call to `memoized` doesn't hit because `defaultMemoize.lastArgs` is uninitialized
    // and so `equalityCheck` is never called
    memoized(someObject)
    assert.equal(fallthroughs, 0, 'first call does not shallow compare')

    // the next call, with a different object reference, does fall through
    memoized(anotherObject)
    assert.equal(fallthroughs, 1, 'call with different object does shallow compare')

    // the third call does not fall through because `defaultMemoize` passes `anotherObject` as
    // both the `newVal` and `oldVal` params. This allows `shallowEqual` to be much more performant
    // than if it had passed `someObject` as `oldVal`, even though `someObject` and `anotherObject`
    // are shallowly equal
    memoized(anotherObject)
    assert.equal(fallthroughs, 1, 'call with same object as previous call does not shallow compare')
  })
  test('structured selector', () => {
    const selector = createStructuredSelector({
      x: state => state.a,
      y: state => state.b
    })
    const firstResult = selector({ a: 1, b: 2 })
    assert.deepEqual(firstResult, { x: 1, y: 2 })
    assert.strictEqual(selector({ a: 1, b: 2 }), firstResult)
    const secondResult = selector({ a: 2, b: 2 })
    assert.deepEqual(secondResult, { x: 2, y: 2 })
    assert.strictEqual(selector({ a: 2, b: 2 }), secondResult)
  })
  test('structured selector with invalid arguments', () => {
    assert.throw(() => createStructuredSelector(
      state => state.a,
      state => state.b
    ), /expects first argument to be an object.*function/)
    assert.throw(() => createStructuredSelector({
      a: state => state.b,
      c: 'd'
    }), /input-selectors to be functions.*function, string/)
  })
  test('structured selector with custom selector creator', () => {
    const customSelectorCreator = createSelectorCreator(
      defaultMemoize,
      (a, b) => a === b
    )
    const selector = createStructuredSelector({
      x: state => state.a,
      y: state => state.b
    }, customSelectorCreator)
    const firstResult = selector({ a: 1, b: 2 })
    assert.deepEqual(firstResult, { x: 1, y: 2 })
    assert.strictEqual(selector({ a: 1, b: 2 }), firstResult)
    assert.deepEqual(selector({ a: 2, b: 2 }), { x: 2, y: 2 })
  })
  test('resetRecomputations', () => {
    const selector = createSelector(
      state => state.a,
      a => a
    )
    assert.equal(selector({ a: 1 }), 1)
    assert.equal(selector({ a: 1 }), 1)
    assert.equal(selector.recomputations(), 1)
    assert.equal(selector({ a: 2 }), 2)
    assert.equal(selector.recomputations(), 2)

    selector.resetRecomputations()
    assert.equal(selector.recomputations(), 0)

    assert.equal(selector({ a: 1 }), 1)
    assert.equal(selector({ a: 1 }), 1)
    assert.equal(selector.recomputations(), 1)
    assert.equal(selector({ a: 2 }), 2)
    assert.equal(selector.recomputations(), 2)
  })
  test('export last function as resultFunc', () => {
    const lastFunction = () => {}
    const selector = createSelector(
      state => state.a,
      lastFunction
    )
    assert.equal(selector.resultFunc, lastFunction)
  })
  test('export dependencies as dependencies', () => {
    const dependency1 = (state) => { state.a }
    const dependency2 = (state) => { state.a }

    const selector = createSelector(
      dependency1,
      dependency2,
      () => {}
    )
    assert.deepEqual(selector.dependencies, [
      dependency1,
      dependency2
    ])
  })
})
