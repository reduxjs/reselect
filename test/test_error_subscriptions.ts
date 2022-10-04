import chai from 'chai'
import { emitError, subscribe } from '../src/error_subscriptions'
import { createSelector, SelectorArray } from '../src/index'

const assert = chai.assert

describe('Error Subscription', () => {
  test('A subscriber should receive emitted signals', () => {
    let errorRecieved = false
    const onError = () => { errorRecieved = true }
    subscribe(onError)
    assert.equal(errorRecieved, false)
    emitError()
    assert.equal(errorRecieved, true)
  })
  test('A subscriber should stop receiving signals after unsubscribing', () => {
    let errorRecieved = false
    const onError = () => { errorRecieved = true }
    const subscription = subscribe(onError)
    assert.equal(errorRecieved, false)
    subscription()
    emitError()
    assert.equal(errorRecieved, false)
  })
  test('Unsubcriptions should not affect other subscriptions', () => {
    let errorRecieved = false
    let otherErrorReceived = false

    const onError = () => { errorRecieved = true }
    const onError2 = () => { otherErrorReceived = true }

    const unsubscribe = subscribe(onError)
    subscribe(onError2)

    assert.equal(errorRecieved, false)
    assert.equal(otherErrorReceived, false)

    unsubscribe()
    unsubscribe()
    unsubscribe()

    emitError()

    assert.equal(errorRecieved, false)
    assert.equal(otherErrorReceived, true)
  })
  test('The parameters emitted should be the paramaters received', () => {
    let parametersReceived
    let testArguments: IArguments = {
      0: 1,
      length: 1,
      callee: () => { },
      // required
      *[Symbol.iterator]() {
        for (let i = 0, len = this.length; i < len; i++) {
          yield this[i];
        }
      }
    };
    const paramsToSend: [Error, Function, IArguments, SelectorArray] = [new Error('test'), (a: number) => a * 2, testArguments, [(b: number) => b * 3]]
    subscribe((...params) => { parametersReceived = params })
    emitError(...paramsToSend)
    assert.deepEqual(parametersReceived, paramsToSend)
  })
  test('Integration Test: The subscriber should receive ' +
    'the error, the problematic combiner function, its parameters and its dependencies. ' +
    'The error shouldn\'t be swallowed.', () => {
      let parametersReceived
      subscribe((...params) => { parametersReceived = params })

      const state = { foo: 'foo', bar: 'bar' }
      const dependencies = [(state: { foo: any }) => state.foo, (state: { bar: any }) => state.bar]
      const badCombiner = () => { throw new Error('test') }
      const selector = createSelector(dependencies, badCombiner)
      var obj: IArguments = {
        0: 'foo',
        1: 'bar',
        length: 2,
        callee: () => { },
        *[Symbol.iterator]() {
          for (var i = 0, len = this.length; i < len; i++) {
            yield this[i];
          }
        }
      };
      try {
        selector(state)
      } catch (e) {
        if (parametersReceived) {
          assert.equal(parametersReceived[0], e);
          assert.equal(parametersReceived[1], badCombiner);
          assert.deepEqual(Array.from(parametersReceived[2]), ['foo', 'bar']);
          assert.deepEqual(parametersReceived[3], dependencies);
        }
      }
    })
})

