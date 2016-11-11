import chai from 'chai'
import { emitError, subscribe } from '../src/error_subscriptions'
import { createSelector } from '../src/index'

const assert = chai.assert

suite('Error Subscription', () => {
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
    const paramsToSend = [ new Error('test'), a => a * 2, [ 1 ], [ b => b * 3 ] ]
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
    const dependencies = [ state => state.foo, state => state.bar ]
    const badCombiner = () => { throw new Error('test') }
    const selector = createSelector(dependencies, badCombiner)

    try {
      selector(state)
    } catch (e) {
      assert.deepEqual(
        parametersReceived,
        [ e, badCombiner, [ 'foo', 'bar' ], dependencies ]
      )
    }
  })
})

