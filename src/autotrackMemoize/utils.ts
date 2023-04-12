export function assert(
  condition: any,
  msg = 'Assertion failed!'
): asserts condition {
  if (!condition) {
    console.error(msg)
    throw new Error(msg)
  }
}

export function formatMs(n: number) {
  return n.toFixed(4) + 'ms'
}

export const loggedValues: any[] = []

export const logLater: typeof console.log = (...args: any[]) => {
  loggedValues.push([new Date(), ...args])
}
