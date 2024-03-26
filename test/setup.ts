import { isMemoizedSelector } from './testUtils'

declare global {
  namespace jest {
    interface Matchers<R> {
      toBeMemoizedSelector(): R
    }
  }
}

expect.extend({
  toBeMemoizedSelector(received) {
    const { isNot } = this

    return {
      pass: isMemoizedSelector(received),
      message: () => `${received} is${isNot ? '' : ' not'} a memoized selector`
    }
  }
})
