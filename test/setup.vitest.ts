import { isMemoizedSelector } from './testUtils'

/**
 * The function `--expose-gc` installs. The options object is V8's: an `async`
 * execution runs the collection from a task with an empty JS stack, so values
 * that are only reachable from stale stack slots or interpreter registers of
 * the calling frames do not get conservatively retained. A plain synchronous
 * `gc()` call scans the caller's stack and can keep an otherwise-dead value
 * alive indefinitely, which makes tests built on it dependent on unrelated
 * code layout.
 */
type ExposedGc = (options?: {
  type?: 'major' | 'minor'
  execution?: 'sync' | 'async'
}) => void | Promise<void>

/**
 * Repeatedly triggers garbage collection from an empty stack, stopping early
 * once the given ref has been cleared. Requires the test process to be started
 * with `node --expose-gc` (the `test` npm script already does this). Tests
 * using the matcher should be gated with `test.skipIf(!globalThis.gc)`.
 */
const waitForGarbageCollection = async (ref: WeakRef<object>) => {
  const gc = globalThis.gc as ExposedGc | undefined
  if (typeof gc !== 'function') {
    throw new Error(
      'toBeGarbageCollected requires garbage collection access. ' +
        'Run vitest via `node --expose-gc`, or gate the test with `test.skipIf(!globalThis.gc)`.'
    )
  }
  for (let i = 0; i < 10 && ref.deref() !== undefined; i++) {
    await gc({ type: 'major', execution: 'async' })
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
  async toBeGarbageCollected(received: WeakRef<object>) {
    const { isNot } = this
    await waitForGarbageCollection(received)
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
