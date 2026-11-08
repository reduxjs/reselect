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

  test.each([
    { maxSize: 2, sharedPrefix: false },
    { maxSize: 4, sharedPrefix: false },
    { maxSize: 2, sharedPrefix: true },
    { maxSize: 4, sharedPrefix: true }
  ])(
    'counts results with multiple primitives (maxSize: $maxSize, sharedPrefix: $sharedPrefix)',
    ({ maxSize, sharedPrefix }) => {
      const spy = vi.fn((price: number, quantity: number) => ({
        total: price * quantity
      }))
      const fn = weakMapMemoize(spy, { maxSize })
      const args = Array.from(
        { length: maxSize },
        (_, i) => [sharedPrefix ? 10 : 10 + i, i + 1] as const
      )
      const passes = Array.from({ length: 3 }, () =>
        args.map(tuple => fn(...tuple))
      )

      expect(spy).toHaveBeenCalledTimes(maxSize)
      for (const pass of passes) {
        pass.forEach((result, i) => expect(result).toBe(passes[0][i]))
      }
    }
  )

  test('preserves selector results for new states with the same primitive inputs', () => {
    const selector = createSelector(
      [(s: { price: number; quantity: number }) => s.price, s => s.quantity],
      (price, quantity) => ({ total: price * quantity }),
      { memoizeOptions: { maxSize: 2 } }
    )
    const states = [
      { price: 10, quantity: 1 },
      { price: 11, quantity: 2 }
    ]
    const results = states.map(state => selector(state))
    for (let pass = 0; pass < 2; pass++) {
      states.forEach((state, i) => {
        expect(selector({ ...state })).toBe(results[i])
      })
    }
    expect(selector.recomputations()).toBe(2)
  })

  test('counts a result stored at an existing argument-prefix node', () => {
    const spy = vi.fn((...args: number[]) => ({ args }))
    const fn = weakMapMemoize(spy, { maxSize: 3 })
    const first = fn(1, 2)
    fn(1) // A new result, although its argument node already exists.
    fn(3) // First generation is full.
    fn(4)
    fn(5)
    fn(6) // Second generation is full; the first is dropped.
    expect(fn(1, 2)).not.toBe(first)
    expect(spy).toHaveBeenCalledTimes(7)
  })

  test.each(['first', 'last'] as const)(
    'counts mixed tuples with the object argument %s',
    position => {
      const spy = vi.fn((...args: unknown[]) => ({ args }))
      const fn = weakMapMemoize(spy, { maxSize: 2 })
      const keys = [{}, {}, {}, {}]
      const args = keys.map(key =>
        position === 'first' ? [key, 1, 2] : [1, 2, key]
      )
      const first = fn(...args[0])
      const second = fn(...args[1])
      expect(fn(...args[0])).toBe(first)
      expect(fn(...args[1])).toBe(second)
      expect(spy).toHaveBeenCalledTimes(2)

      fn(...args[2])
      fn(...args[3])
      expect(fn(...args[0])).not.toBe(first)
      expect(spy).toHaveBeenCalledTimes(5)
    }
  )

  test('object-only and zero-argument calls do not fill a generation', () => {
    const spy = vi.fn((...args: object[]) => ({ args }))
    const fn = weakMapMemoize(spy, { maxSize: 1 })
    const empty = fn()
    const keys = [{}, () => {}, {}]
    const results = keys.map(key => fn(key))
    keys.forEach((key, i) => expect(fn(key)).toBe(results[i]))
    expect(fn()).toBe(empty)
    expect(spy).toHaveBeenCalledTimes(4)
  })

  test.each(['func', 'resultEqualityCheck'] as const)(
    'does not count a result when %s throws',
    throwingFunction => {
      let shouldThrow = true
      const fail = () => {
        if (shouldThrow) throw new Error('test error')
      }
      const spy = vi.fn((x: number) => {
        if (x === 2 && throwingFunction === 'func') fail()
        return { value: x }
      })
      const fn = weakMapMemoize(spy, {
        maxSize: 3,
        resultEqualityCheck: (_a, b) => {
          if (b.value === 2 && throwingFunction === 'resultEqualityCheck') {
            fail()
          }
          return false
        }
      })
      const first = fn(1)
      expect(() => fn(2)).toThrow('test error')
      expect(() => fn(2)).toThrow('test error')
      fn(3)
      fn(4)
      fn(5)
      fn(6) // {1, 3, 4} must still be the previous generation.
      expect(fn(1)).toBe(first)
      expect(spy).toHaveBeenCalledTimes(7)

      shouldThrow = false
      const recovered = fn(2)
      expect(fn(2)).toBe(recovered)
      expect(spy).toHaveBeenCalledTimes(8)
    }
  )

  test.each(['func', 'resultEqualityCheck'] as const)(
    'counts a tuple only once when %s reenters with the same arguments',
    reenteringFunction => {
      let reenter = true
      const callAgain = (x: number) => {
        if (x === 1 && reenter) {
          reenter = false
          fn(1)
        }
      }
      const spy = vi.fn((x: number) => {
        if (reenteringFunction === 'func') callAgain(x)
        return { value: x }
      })
      const fn = weakMapMemoize(spy, {
        maxSize: 3,
        resultEqualityCheck: (_a, b) => {
          if (reenteringFunction === 'resultEqualityCheck') callAgain(b.value)
          return false
        }
      })
      fn(0)
      const first = fn(1)
      fn(2)
      fn(3)
      fn(4)
      expect(fn(1)).toBe(first)
      expect(spy).toHaveBeenCalledTimes(6)
    }
  )

  test
    .skipIf(typeof globalThis.gc !== 'function')
    .each(['func', 'resultEqualityCheck'] as const)(
    'does not retain primitive branches when %s throws',
    async throwingFunction => {
      const fail = (key: unknown) => {
        if (typeof key === 'string') throw new Error('test error')
      }
      const fn = weakMapMemoize(
        (key: string | object) => {
          if (throwingFunction === 'func') fail(key)
          return { key }
        },
        {
          maxSize: 2,
          resultEqualityCheck: (_a, b) => {
            if (throwingFunction === 'resultEqualityCheck') fail(b.key)
            return false
          }
        }
      )
      fn({}) // Seed resultEqualityCheck without retaining a primitive branch.
      const nodes: WeakRef<object>[] = []
      const originalSet = Map.prototype.set
      const setSpy = vi
        .spyOn(Map.prototype, 'set')
        .mockImplementation(function (key, value) {
          if (typeof key === 'string' && key.startsWith('failed-')) {
            nodes.push(new WeakRef(value))
          }
          return originalSet.call(this, key, value)
        })
      try {
        for (let i = 0; i < 3; i++) {
          expect(() => fn(`failed-${i}`)).toThrow('test error')
          fn({})
        }
      } finally {
        setSpy.mockRestore()
      }
      // Observe any published nodes weakly, so the test cannot keep them alive.
      for (const node of nodes) await expect(node).toBeGarbageCollected()
      expect(fn({}).key).toEqual({}) // Keep the memoizer alive through GC.
    }
  )

  test.each(['func', 'resultEqualityCheck'] as const)(
    'preserves cached siblings when %s throws under a shared prefix',
    throwingFunction => {
      const fail = (key: string) => {
        if (key === 'bad') throw new Error('test error')
      }
      const spy = vi.fn((prefix: string, key: string) => {
        if (throwingFunction === 'func') fail(key)
        return { prefix, key }
      })
      const fn = weakMapMemoize(spy, {
        maxSize: 2,
        resultEqualityCheck: (_a, b) => {
          if (throwingFunction === 'resultEqualityCheck') fail(b.key)
          return false
        }
      })
      const first = fn('shared', 'ok')
      expect(() => fn('shared', 'bad')).toThrow('test error')
      expect(fn('shared', 'ok')).toBe(first)
      expect(spy).toHaveBeenCalledTimes(2)
    }
  )

  test.each([
    { maxSize: 2, clear: false, descendant: false },
    { maxSize: 2, clear: false, descendant: true },
    { maxSize: 1, clear: false, descendant: true },
    { maxSize: 2, clear: true, descendant: true }
  ])(
    'preserves a nested result when the outer call throws ($maxSize, $clear, $descendant)',
    ({ maxSize, clear, descendant }) => {
      let reenter = true
      let nestedResult: object | undefined
      const nestedArgs = descendant ? ['shared', 'child'] : ['shared']
      const spy = vi.fn((...args: string[]): object => {
        if (reenter) {
          reenter = false
          if (clear) fn.clearCache()
          nestedResult = fn(...nestedArgs)
          throw new Error('outer error')
        }
        return { args }
      })
      const fn = weakMapMemoize(spy, { maxSize })
      expect(() => fn('shared')).toThrow('outer error')
      expect(fn(...nestedArgs)).toBe(nestedResult)
      expect(spy).toHaveBeenCalledTimes(2)
    }
  )

  test('counts separate cache entries even when resultEqualityCheck reuses a reference', () => {
    const spy = vi.fn((_x: number, _y: number) => ({ value: 1 }))
    const resultEqualityCheck = vi.fn(() => true)
    const fn = weakMapMemoize(spy, { maxSize: 2, resultEqualityCheck })
    const first = fn(1, 10)
    expect(fn(2, 20)).toBe(first)
    expect(fn.resultsCount()).toBe(1)
    expect(fn(1, 10)).toBe(first)
    expect(fn(2, 20)).toBe(first)
    expect(spy).toHaveBeenCalledTimes(2)
    expect(resultEqualityCheck).toHaveBeenCalledTimes(1)

    fn(3, 30)
    fn(4, 40)
    fn(1, 10) // Recomputes after eviction, even though all results are equal.
    expect(spy).toHaveBeenCalledTimes(5)
  })

  test.each(['func', 'resultEqualityCheck'] as const)(
    'does not count a result in a cache cleared by %s',
    clearingFunction => {
      const spy = vi.fn((x: number) => {
        if (x === 1 && clearingFunction === 'func') fn.clearCache()
        return { value: x }
      })
      const fn = weakMapMemoize(spy, {
        maxSize: 2,
        resultEqualityCheck: (_a, b) => {
          if (b.value === 1 && clearingFunction === 'resultEqualityCheck') {
            fn.clearCache()
          }
          return false
        }
      })
      fn(0) // Give resultEqualityCheck a previous result to compare.
      fn(1) // This result is written to the tree that was cleared.
      const second = fn(2)
      fn(3) // The fresh generation contains {2, 3}.
      fn(4)
      expect(fn(2)).toBe(second)
      expect(spy).toHaveBeenCalledTimes(5)
    }
  )

  test.skipIf(typeof globalThis.gc !== 'function')(
    'mixed tuples still release object keys and results in both generations',
    async () => {
      const fn = weakMapMemoize(
        (prefix: number, key: object, id: number) => ({
          prefix,
          key,
          id
        }),
        { maxSize: 2 }
      )
      const previousKey = new WeakRef({})
      const previousResult = new WeakRef(fn(1, previousKey.deref()!, 1))
      fn(2, {}, 2) // Demote the first generation.
      const currentKey = new WeakRef({})
      const currentResult = new WeakRef(fn(3, currentKey.deref()!, 3))

      await expect(previousKey).toBeGarbageCollected()
      await expect(previousResult).toBeGarbageCollected()
      await expect(currentKey).toBeGarbageCollected()
      await expect(currentResult).toBeGarbageCollected()
      expect(fn(4, {}, 4).id).toBe(4) // Keep the memoizer alive.
    }
  )

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
    fn(4) // Flip: prev = {1,2,3,4}, current is empty.
    fn(5) // current = {5}
    expect(spy).toHaveBeenCalledTimes(5)

    // 1 misses current, hits previous, gets copied into current.
    expect(fn(1)).toBe(first)
    expect(spy).toHaveBeenCalledTimes(5)

    // Promotion counts as one cached result: current = {5,1}.
    fn(6)
    fn(7) // Flip: prev = {5,1,6,7}, current is empty.
    fn(8) // current = {8}
    expect(fn(1)).toBe(first) // survives because it was promoted
    expect(spy).toHaveBeenCalledTimes(8)
  })

  test('entries never touched again are dropped after two flips', () => {
    const spy = vi.fn((x: number) => ({ value: x }))
    const fn = weakMapMemoize(spy, { maxSize: 2 })
    fn(1)
    fn(2) // Flip 1: prev = {1,2}, current is empty.
    fn(3)
    fn(4) // Flip 2: prev = {3,4}; {1,2} dropped.
    fn(5) // current = {5}
    expect(spy).toHaveBeenCalledTimes(5)
    fn(1)
    expect(spy).toHaveBeenCalledTimes(6) // Recomputed; flip drops {3,4}.
    fn(4) // Recomputes because only {5,1} survived into prev.
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
    fn(a, 12) // Three cached results trigger a flip.
    fn(a, 13) // prev holds a->{10,11,12}
    expect(spy).toHaveBeenCalledTimes(4)
    // Hit through the previous generation's WeakMap branch.
    expect(fn(a, 10)).toBe(20)
    expect(spy).toHaveBeenCalledTimes(4)
  })

  test('maxSize: 1 still memoizes consecutive identical calls', () => {
    const spy = vi.fn((x: number, y: number) => ({ value: x * y }))
    const fn = weakMapMemoize(spy, { maxSize: 1 })
    const r1 = fn(1, 10) // The first result fills the generation.
    // Each subsequent call promotes the result and flips again.
    expect(fn(1, 10)).toBe(r1)
    expect(fn(1, 10)).toBe(r1)
    expect(spy).toHaveBeenCalledTimes(1)
    fn(2, 20)
    expect(spy).toHaveBeenCalledTimes(2)
    expect(fn(1, 10)).not.toBe(r1)
    expect(spy).toHaveBeenCalledTimes(3)
  })

  test('clearCache drops both generations and resets the counter', () => {
    const spy = vi.fn((x: number) => ({ value: x }))
    const fn = weakMapMemoize(spy, { maxSize: 2 })
    fn(1)
    fn(2)
    fn(3) // prev = {1,2}, current = {3}
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
    fn(3) // [1] differs from lastResult, which is [0].
    fn(5) // [1] matches lastResult; deduplicate, then flip.
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
