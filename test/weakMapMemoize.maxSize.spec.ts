import {
  createSelector,
  setGlobalDevModeChecks,
  weakMapMemoize
} from 'reselect'

// `maxSize` bounds cache growth for primitive arguments with a generational
// scheme: after `maxSize` results are cached, the whole cache is demoted to a
// "previous generation" and a fresh cache becomes current. Misses probe the
// previous generation and promote hits forward; the generation before that is
// dropped wholesale. See the `WeakMapMemoizeOptions.maxSize` JSDoc.

describe('weakMapMemoize maxSize option', () => {
  beforeAll(() => {
    setGlobalDevModeChecks({ cacheSizeCheck: 'never' })
  })
  afterAll(() => {
    setGlobalDevModeChecks({ cacheSizeCheck: 'once' })
  })

  test('validates maxSize', () => {
    for (const bad of [0, -1, 1.5, Infinity, NaN]) {
      expect(() => weakMapMemoize((x: number) => x, { maxSize: bad })).toThrow(
        TypeError
      )
    }
    expect(() => weakMapMemoize((x: number) => x, { maxSize: 1 })).not.toThrow()
  })

  test.each([2, 4])(
    'maxSize: %i caches that many results with multiple primitive arguments',
    maxSize => {
      const spy = vi.fn((price: number, qty: number) => ({
        total: price * qty
      }))
      const fn = weakMapMemoize(spy, { maxSize })
      const args = Array.from(
        { length: maxSize },
        (_, i) => [10 + i, i + 1] as const
      )
      const results = [...args, ...args, ...args].map(args => fn(...args))
      expect(spy).toHaveBeenCalledTimes(maxSize)
      results.forEach((result, i) => expect(result).toBe(results[i % maxSize]))
    }
  )

  test('createSelector reuses results for multiple primitive inputs with maxSize', () => {
    const selector = createSelector(
      [
        (state: { price: number; qty: number }) => state.price,
        state => state.qty
      ],
      (price, qty) => ({ total: price * qty }),
      { memoizeOptions: { maxSize: 2 } }
    )
    const states = [
      { price: 10, qty: 1 },
      { price: 11, qty: 2 }
    ]
    const results = states.map(state => selector(state))

    for (let pass = 0; pass < 2; pass++) {
      states.forEach((state, i) =>
        expect(selector({ ...state })).toBe(results[i])
      )
    }
    expect(selector.recomputations()).toBe(2)
    expect(selector.dependencyRecomputations()).toBe(6)
  })

  test('createSelector caches multiple primitive arguments with argsMemoize maxSize', () => {
    const selector = createSelector(
      [(price: number, qty: number) => price, (price, qty) => qty],
      (price, qty) => ({ total: price * qty }),
      { argsMemoizeOptions: { maxSize: 2 } }
    )
    const first = selector(10, 1)
    const second = selector(11, 2)

    for (let pass = 0; pass < 2; pass++) {
      expect(selector(10, 1)).toBe(first)
      expect(selector(11, 2)).toBe(second)
    }
    expect(selector.dependencyRecomputations()).toBe(2)
  })

  test('bounds primitive cache growth to roughly 2x maxSize', () => {
    const spy = vi.fn((x: number) => ({ value: x }))
    const fn = weakMapMemoize(spy, { maxSize: 10 })
    const results: object[] = []
    for (let i = 0; i < 1000; i++) {
      results.push(fn(i))
    }
    expect(spy).toHaveBeenCalledTimes(1000)

    // Everything in the current generation window still hits.
    const recent = fn(999)
    expect(spy).toHaveBeenCalledTimes(1000)
    expect(recent).toBe(results[999])

    // An entry from far in the past was dropped and recomputes.
    const old = fn(0)
    expect(spy).toHaveBeenCalledTimes(1001)
    expect(old).not.toBe(results[0])
  })

  test('a hit in the previous generation is promoted and survives the next flip', () => {
    const spy = vi.fn((x: number) => ({ value: x }))
    const fn = weakMapMemoize(spy, { maxSize: 4 })
    const first = fn(1) // gen A: {1}
    fn(2)
    fn(3)
    fn(4) // insertionCount = 4 -> next call flips
    fn(5) // flip: prev = {1,2,3,4}, current = {5}
    expect(spy).toHaveBeenCalledTimes(5)

    // 1 misses current, hits previous, gets copied into current.
    expect(fn(1)).toBe(first)
    expect(spy).toHaveBeenCalledTimes(5)

    // Promoting a result also counts toward maxSize. current = {5, 1}.
    fn(6)
    fn(7) // current = {5,1,6,7} -> next call flips
    fn(8) // flip: prev = {5,1,6,7}, current = {8}
    expect(fn(1)).toBe(first) // survives because it was promoted
    expect(spy).toHaveBeenCalledTimes(8)
  })

  test('entries never touched again are dropped after two flips', () => {
    const spy = vi.fn((x: number) => ({ value: x }))
    const fn = weakMapMemoize(spy, { maxSize: 2 })
    fn(1)
    fn(2) // gen A full
    fn(3) // flip 1: prev = {1,2}, current = {3}
    fn(4) // current = {3,4}
    fn(5) // flip 2: prev = {3,4}, current = {5}; {1,2} dropped
    expect(spy).toHaveBeenCalledTimes(5)
    fn(1)
    expect(spy).toHaveBeenCalledTimes(6) // recomputed; current now {5,1} (full)
    fn(4) // this call flips first (prev = {5,1}), so {3,4} is dropped
    expect(spy).toHaveBeenCalledTimes(7)
    fn(5) // 5 survived into prev, hits
    expect(spy).toHaveBeenCalledTimes(7)
  })

  test('works with object arguments mixed with primitives', () => {
    const spy = vi.fn((obj: { id: number }, mult: number) => obj.id * mult)
    const fn = weakMapMemoize(spy, { maxSize: 3 })
    const a = { id: 2 }
    expect(fn(a, 10)).toBe(20)
    expect(fn(a, 10)).toBe(20)
    expect(spy).toHaveBeenCalledTimes(1)
    fn(a, 11)
    fn(a, 12) // 3 insertions -> next call flips
    fn(a, 13) // flip; prev holds a->{10,11,12}
    expect(spy).toHaveBeenCalledTimes(4)
    // Hit through the previous generation's WeakMap branch.
    expect(fn(a, 10)).toBe(20)
    expect(spy).toHaveBeenCalledTimes(4)
  })

  test('maxSize: 1 still memoizes consecutive identical calls', () => {
    const spy = vi.fn((x: number) => ({ value: x }))
    const fn = weakMapMemoize(spy, { maxSize: 1 })
    const r1 = fn(1) // insert -> count 1
    // Next call flips, but 1 is in prev and gets promoted.
    expect(fn(1)).toBe(r1)
    expect(fn(1)).toBe(r1)
    expect(spy).toHaveBeenCalledTimes(1)
    fn(2)
    expect(spy).toHaveBeenCalledTimes(2)
  })

  test('clearCache drops both generations and resets the counter', () => {
    const spy = vi.fn((x: number) => ({ value: x }))
    const fn = weakMapMemoize(spy, { maxSize: 2 })
    fn(1)
    fn(2)
    fn(3) // flip: prev = {1,2}
    fn.clearCache()
    fn(1) // must recompute: prev was dropped too
    fn(2)
    expect(spy).toHaveBeenCalledTimes(5)
    // Counter was reset: no premature flip; 1 and 2 still hit.
    fn(1)
    fn(2)
    expect(spy).toHaveBeenCalledTimes(5)
  })

  test('resultEqualityCheck still deduplicates across flips', () => {
    const resultEqualityCheck = vi.fn(
      (a: number[], b: number[]) =>
        a.length === b.length && a.every((v, i) => v === b[i])
    )
    const fn = weakMapMemoize((x: number) => [x % 2], {
      maxSize: 2,
      resultEqualityCheck
    })
    const r1 = fn(1) // [1]
    fn(2) // [0]
    fn(3) // flip happens; [1] equals lastResult? lastResult is [0], no.
    fn(5) // flip pending state; [1] vs lastResult [1] -> dedup
    expect(fn(5)).toBe(fn(3))
  })

  test.skipIf(typeof globalThis.gc !== 'function')(
    'results dropped by a generation flip are garbage collected',
    async () => {
      const fn = weakMapMemoize((x: number) => ({ value: x }), { maxSize: 5 })
      const ref = new WeakRef(fn(1) as object)
      // Two full flips: {1} ends up in the dropped generation.
      for (let i = 2; i <= 12; i++) {
        fn(i)
      }
      await expect(ref).toBeGarbageCollected()
      if (fn(12) === undefined) throw new Error('keep fn alive')
    }
  )

  test.skipIf(typeof globalThis.gc !== 'function')(
    'without maxSize, primitive-keyed results are retained (baseline)',
    async () => {
      const fn = weakMapMemoize((x: number) => ({ value: x }))
      const ref = new WeakRef(fn(1) as object)
      for (let i = 2; i <= 12; i++) {
        fn(i)
      }
      await expect(expect(ref).toBeGarbageCollected()).rejects.toThrow()
      if (fn(12) === undefined) throw new Error('keep fn alive')
    }
  )

  test('no maxSize: behavior is unchanged (unbounded)', () => {
    const spy = vi.fn((x: number) => ({ value: x }))
    const fn = weakMapMemoize(spy)
    const results: object[] = []
    for (let i = 0; i < 5000; i++) results.push(fn(i))
    expect(spy).toHaveBeenCalledTimes(5000)
    for (let i = 0; i < 5000; i++) expect(fn(i)).toBe(results[i])
    expect(spy).toHaveBeenCalledTimes(5000)
  })
})
