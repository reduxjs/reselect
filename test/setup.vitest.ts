import { isMemoizedSelector } from './testUtils'

/**
 * Repeatedly triggers garbage collection and yields to the event loop so that
 * finalizers/`WeakRef`s have a chance to observe collection. Requires the test
 * process to be started with `node --expose-gc` (see the `test` npm script).
 */
const waitForGarbageCollection = async () => {
  if (typeof globalThis.gc !== 'function') {
    throw new Error(
      'These tests require garbage collection access. Run vitest via `node --expose-gc`.'
    )
  }
  for (let i = 0; i < 10; i++) {
    globalThis.gc()
    // Let the microtask/macrotask queue flush between GC passes.
    await new Promise(resolve => setTimeout(resolve, 0))
  }
}

expect.extend({
  toBeMemoizedSelector(received) {
    const { isNot } = this

    return {
      pass: isMemoizedSelector(received),
      message: () => `${received} is${isNot ? '' : ' not'} a memoized selector`
    }
  },

  /**
   * Asserts that the value held by a `WeakRef` has (or has not, when negated)
   * been garbage collected. Modeled after Apollo Client's matcher of the same
   * name.
   */
  async toBeGarbageCollected(received: WeakRef<any>) {
    const { isNot } = this
    await waitForGarbageCollection()
    const pass = received.deref() === undefined
    return {
      pass,
      message: () =>
        `expected referenced value to${
          isNot ? ' not' : ''
        } have been garbage collected`
    }
  }
})
