import { weakMapMemoize } from 'reselect'

interface Source {
  value: number
}

interface Result {
  source: Source
  id: number
}

const equalResults = (previous: Result, next: Result) =>
  previous.source.value === next.source.value && previous.id === next.id

describe.skipIf(!globalThis.gc)('weak result equality branch ownership', () => {
  test('collects previous branches containing result to input cycles', async () => {
    const memoized = weakMapMemoize(
      (source: Source, id: number): Result => ({ source, id }),
      { resultEqualityCheck: equalResults }
    )
    const previous = new WeakRef(memoized({ value: 0 }, 0))

    for (let value = 1; value < 100; value++) {
      memoized({ value }, value)
    }

    await expect(previous).toBeGarbageCollected()
    expect(memoized({ value: 100 }, 100).id).toBe(100)
  })

  test('collects an inner database while its owner stays alive', async () => {
    const owner = {}
    const memoized = weakMapMemoize(
      (_owner: object, source: Source, id: number): Result => ({ source, id }),
      { resultEqualityCheck: equalResults }
    )
    const previous = new WeakRef(memoized(owner, { value: 0 }, 0))
    memoized(owner, { value: 1 }, 1)

    await expect(previous).toBeGarbageCollected()
    expect(memoized(owner, { value: 2 }, 2).id).toBe(2)
  })

  test('collects an owner branch while its inner database stays alive', async () => {
    const source = { value: 0 }
    const memoized = weakMapMemoize(
      (owner: object, source: Source, id: number) => ({ owner, source, id }),
      {
        resultEqualityCheck: (previous, next) =>
          previous.owner === next.owner && equalResults(previous, next)
      }
    )
    const previous = new WeakRef(memoized({}, source, 0))
    memoized({}, source, 1)

    await expect(previous).toBeGarbageCollected()
    expect(memoized({}, source, 2).source).toBe(source)
  })

  test('retains primitive suffix results while their database stays alive', async () => {
    const source = { value: 0 }
    const memoized = weakMapMemoize(
      (source: Source, id: number): Result => ({ source, id }),
      { resultEqualityCheck: equalResults }
    )
    const previous = new WeakRef(memoized(source, 0))

    for (let id = 1; id < 100; id++) {
      memoized(source, id)
    }

    await expect(previous).not.toBeGarbageCollected()
    expect(memoized(source, 0)).toBe(previous.deref())
  })

  test('collects retired generations even while their database stays alive', async () => {
    const source = { value: 0 }
    const memoized = weakMapMemoize(
      (source: Source, id: number): Result => ({ source, id }),
      { resultEqualityCheck: equalResults, maxSize: 2 }
    )
    const previous = new WeakRef(memoized(source, 0))

    for (let id = 1; id < 10; id++) {
      memoized(source, id)
    }

    await expect(previous).toBeGarbageCollected()
    expect(memoized(source, 10).source).toBe(source)
  })

  test('clearCache releases results while their input keys stay alive', async () => {
    const source = { value: 0 }
    const memoized = weakMapMemoize(
      (source: Source, id: number): Result => ({ source, id }),
      { resultEqualityCheck: equalResults }
    )
    const previous = new WeakRef(memoized(source, 0))
    memoized.clearCache()

    await expect(previous).toBeGarbageCollected()
    expect(memoized(source, 0).source).toBe(source)
  })

  test('retaining outputs does not retain their database lookup branches', async () => {
    const memoized = weakMapMemoize(
      (source: Source, id: number) => [source.value + id],
      {
        resultEqualityCheck: (previous, next) => previous[0] === next[0]
      }
    )
    const createPrevious = () => {
      const source = { value: 0 }
      return {
        source: new WeakRef(source),
        first: memoized(source, 0),
        second: memoized(source, 1)
      }
    }
    const previous = createPrevious()

    await expect(previous.source).toBeGarbageCollected()

    const updated = { value: 0 }
    expect(memoized(updated, 0)).toEqual(previous.first)
    expect(memoized(updated, 0)).not.toBe(previous.first)
    expect(memoized(updated, 1)).toEqual(previous.second)
    expect(memoized(updated, 1)).not.toBe(previous.second)
  })

  test.each([false, true])(
    'collects older versions through strong links if WeakRef was unavailable at import (restore before construction: %s)',
    async restoreBeforeConstruction => {
      const NativeWeakRef = WeakRef
      vi.resetModules()
      try {
        vi.stubGlobal('WeakRef', undefined)
        const { weakMapMemoize } = await import('@internal/weakMapMemoize')
        if (restoreBeforeConstruction) {
          vi.unstubAllGlobals()
        }
        const memoized = weakMapMemoize(
          (source: Source, id: number): Result => ({ source, id }),
          { resultEqualityCheck: equalResults }
        )
        const previous = new NativeWeakRef(memoized({ value: 0 }, 0))
        for (let value = 1; value < 50; value++) {
          memoized({ value }, value)
        }
        vi.unstubAllGlobals()

        await expect(previous).toBeGarbageCollected()
        expect(memoized({ value: 50 }, 50).id).toBe(50)
      } finally {
        vi.unstubAllGlobals()
        vi.resetModules()
      }
    }
  )

  test('keeps no older result alive through a strong last result if WeakRef was unavailable at import', async () => {
    const NativeWeakRef = WeakRef
    vi.resetModules()
    try {
      vi.stubGlobal('WeakRef', undefined)
      const { weakMapMemoize } = await import('@internal/weakMapMemoize')
      vi.unstubAllGlobals()
      const memoized = weakMapMemoize(
        (source: Source, id: number): Result => ({ source, id }),
        { resultEqualityCheck: equalResults }
      )
      const previous = new NativeWeakRef(memoized({ value: 0 }, 0))
      for (let value = 1; value < 50; value++) {
        memoized({ value }, 0)
      }

      await expect(previous).toBeGarbageCollected()
    } finally {
      vi.unstubAllGlobals()
      vi.resetModules()
    }
  })
})
