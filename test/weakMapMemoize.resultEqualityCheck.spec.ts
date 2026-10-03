import isEqual from 'lodash/isEqual'
import { shallowEqual } from 'react-redux'
import { createSelector, weakMapMemoize } from 'reselect'

interface Database {
  values: Record<string, number>
  revision: number
}

const makeDatabase = (count = 64): Database => ({
  values: Object.fromEntries(
    Array.from({ length: count }, (_, index) => [`item-${index}`, index])
  ),
  revision: 0
})

describe('weakMapMemoize result equality across object branches', () => {
  test.each(['forward', 'reverse'])(
    'preserves each ID result after an immutable update with %s reads',
    order => {
      const db = makeDatabase()
      const ids = Object.keys(db.values)
      const memoized = weakMapMemoize(
        (db: Database, id: string) => [db.values[id]],
        { resultEqualityCheck: shallowEqual }
      )
      const previous = new Map(ids.map(id => [id, memoized(db, id)]))
      const updated = { ...db, revision: 1 }

      for (const id of order === 'reverse' ? ids.toReversed() : ids) {
        expect(memoized(updated, id)).toBe(previous.get(id))
      }
      expect(memoized.resultsCount()).toBe(ids.length)
    }
  )

  test('preserves results when a changing object follows a primitive key', () => {
    const db = makeDatabase(2)
    const memoized = weakMapMemoize(
      (id: string, db: Database) => [db.values[id]],
      { resultEqualityCheck: shallowEqual }
    )
    const first = memoized('item-0', db)
    const second = memoized('item-1', db)
    const updated = { ...db, revision: 1 }

    expect(memoized('item-0', updated)).toBe(first)
    expect(memoized('item-1', updated)).toBe(second)
  })

  test('preserves keyed results when an object changes below a stable owner', () => {
    const owner = {}
    const db = makeDatabase(2)
    const memoized = weakMapMemoize(
      (_owner: object, db: Database, id: string) => [db.values[id]],
      { resultEqualityCheck: shallowEqual }
    )
    const first = memoized(owner, db, 'item-0')
    const second = memoized(owner, db, 'item-1')
    const updated = { ...db, revision: 1 }

    expect(memoized(owner, updated, 'item-0')).toBe(first)
    expect(memoized(owner, updated, 'item-1')).toBe(second)
  })

  test('preserves keyed results with a stable object suffix', () => {
    const db = makeDatabase(2)
    const options = {}
    const memoized = weakMapMemoize(
      (db: Database, _options: object, id: string) => [db.values[id]],
      { resultEqualityCheck: shallowEqual }
    )
    const first = memoized(db, options, 'item-0')
    const second = memoized(db, options, 'item-1')
    const updated = { ...db, revision: 1 }

    expect(memoized(updated, options, 'item-0')).toBe(first)
    expect(memoized(updated, options, 'item-1')).toBe(second)
  })

  test('preserves keyed results below a function argument', () => {
    const db = makeDatabase(2)
    const read = () => db
    const memoized = weakMapMemoize(
      (read: () => Database, id: string) => [read().values[id]],
      { resultEqualityCheck: shallowEqual }
    )
    const first = memoized(read, 'item-0')
    const second = memoized(read, 'item-1')
    const readUpdated = () => ({ ...db, revision: 1 })

    expect(memoized(readUpdated, 'item-0')).toBe(first)
    expect(memoized(readUpdated, 'item-1')).toBe(second)
  })

  test('preserves shared createSelector results across immutable updates', () => {
    const db = makeDatabase(2)
    const state = { db }
    const selector = createSelector(
      [(state: { db: Database }) => state.db, (_state, id: string) => id],
      (db, id) => [db.values[id]],
      {
        memoizeOptions: { resultEqualityCheck: shallowEqual },
        devModeChecks: { inputStabilityCheck: 'never' }
      }
    )
    const first = selector(state, 'item-0')
    const second = selector(state, 'item-1')
    const updated = { db: { ...db, revision: 1 } }

    expect(selector(updated, 'item-0')).toBe(first)
    expect(selector(updated, 'item-1')).toBe(second)
    expect(selector.memoizedResultFunc.resultsCount()).toBe(2)
    expect(selector.recomputations()).toBe(4)
    expect(selector(state, 'item-0')).toBe(first)
    expect(selector.recomputations()).toBe(4)
  })

  test('clearCache drops previous comparison candidates', () => {
    const db = makeDatabase(1)
    const memoized = weakMapMemoize(
      (db: Database, id: string) => [db.values[id]],
      { resultEqualityCheck: shallowEqual }
    )
    const previous = memoized(db, 'item-0')

    memoized.clearCache()

    expect(memoized(db, 'item-0')).not.toBe(previous)
    expect(memoized.resultsCount()).toBe(1)
  })

  test('keeps a stable owner when another owner has the same object suffix', () => {
    const firstOwner = { value: 10 }
    const secondOwner = { value: 20 }
    const firstDb = { value: 1 }
    const secondDb = { value: 1 }
    const memoized = weakMapMemoize(
      (owner: { value: number }, db: { value: number }, id: number) => [
        owner.value + db.value + id
      ],
      { resultEqualityCheck: shallowEqual }
    )
    memoized(firstOwner, secondDb, 1)
    const previous = memoized(secondOwner, firstDb, 1)
    memoized(firstOwner, secondDb, 2)

    expect(memoized(secondOwner, secondDb, 1)).toBe(previous)
    expect(memoized(secondOwner, secondDb, 2)).toEqual([23])
  })

  test('preserves old exact tuples without recomputing or comparing', () => {
    const db = makeDatabase(2)
    let computations = 0
    let comparisons = 0
    const memoized = weakMapMemoize(
      (db: Database, id: string) => {
        computations++
        return [db.values[id]]
      },
      {
        resultEqualityCheck: (previous, next) => {
          comparisons++
          return shallowEqual(previous, next)
        }
      }
    )
    const previous = memoized(db, 'item-0')
    memoized(db, 'item-1')
    memoized({ ...db, revision: 1 }, 'item-0')
    const compared = comparisons

    for (let index = 0; index < 100; index++) {
      expect(memoized(db, 'item-0')).toBe(previous)
    }
    expect(computations).toBe(3)
    expect(comparisons).toBe(compared)
  })

  test('returns changed data and keeps the previous exact tuple', () => {
    const db = makeDatabase(2)
    const memoized = weakMapMemoize(
      (db: Database, id: string) => [db.values[id]],
      { resultEqualityCheck: shallowEqual }
    )
    const first = memoized(db, 'item-0')
    const second = memoized(db, 'item-1')
    const updated = {
      values: { ...db.values, 'item-0': 100 },
      revision: 1
    }

    expect(memoized(updated, 'item-0')).toEqual([100])
    expect(memoized(updated, 'item-0')).not.toBe(first)
    expect(memoized(updated, 'item-1')).toBe(second)
    expect(memoized(db, 'item-0')).toBe(first)
    expect(memoized.resultsCount()).toBe(3)
  })

  test('keeps primitive suffix tuples separate', () => {
    const db = makeDatabase(2)
    const memoized = weakMapMemoize(
      (db: Database, id: string, offset: number) => [db.values[id], offset],
      { resultEqualityCheck: shallowEqual }
    )
    const first = memoized(db, 'item-0', 0)
    const second = memoized(db, 'item-0', 1)
    const third = memoized(db, 'item-1', 0)
    const updated = { ...db, revision: 1 }

    expect(memoized(updated, 'item-0', 0)).toBe(first)
    expect(memoized(updated, 'item-0', 1)).toBe(second)
    expect(memoized(updated, 'item-1', 0)).toBe(third)
  })

  test('does not search beyond the immediately previous object branch', () => {
    const db = makeDatabase(2)
    const memoized = weakMapMemoize(
      (db: Database, id: string) => [db.values[id]],
      { resultEqualityCheck: shallowEqual }
    )
    const first = memoized(db, 'item-0')
    const second = memoized(db, 'item-1')
    const intermediate = { ...db, revision: 1 }
    const updated = { ...db, revision: 2 }

    expect(memoized(intermediate, 'item-0')).toBe(first)
    expect(memoized(updated, 'item-1')).toEqual(second)
    expect(memoized(updated, 'item-1')).not.toBe(second)
    expect(memoized(db, 'item-1')).toBe(second)
  })

  test('keeps an unchanged object-keyed row when another row changes to its value', () => {
    const rowA = { id: 'A' }
    const rowB = { id: 'B' }
    const memoized = weakMapMemoize(
      (state: Record<string, string>, row: { id: string }) => [state[row.id]],
      { resultEqualityCheck: shallowEqual }
    )
    const state1 = { A: 'x', B: 'y' }
    memoized(state1, rowA)
    const b1 = memoized(state1, rowB)
    const state2 = { A: 'y', B: 'y' }
    const a2 = memoized(state2, rowA)

    expect(memoized(state2, rowB)).toBe(b1)
    expect(a2).toEqual(b1)
  })

  test('returns the same references with and without native WeakRef while previous arguments are alive', async () => {
    const db = makeDatabase(3)
    const sequences: { versions: Database[]; calls: [number, string][] }[] = [
      {
        versions: [
          db,
          { ...db, revision: 1 },
          { values: { ...db.values, 'item-1': 9 }, revision: 2 },
          { ...db, revision: 3 }
        ],
        calls: [
          [0, 'item-0'],
          [0, 'item-1'],
          [1, 'item-1'],
          [1, 'item-0'],
          [2, 'item-1'],
          [2, 'item-2'],
          [3, 'item-2'],
          [3, 'item-1'],
          [0, 'item-1']
        ]
      },
      {
        versions: [db, { ...db, revision: 1 }, { ...db, revision: 2 }],
        calls: [
          [0, 'item-0'],
          [0, 'item-1'],
          [1, 'item-0'],
          [2, 'item-1']
        ]
      }
    ]
    const trace = (memoize: typeof weakMapMemoize) =>
      sequences.map(({ versions, calls }) => {
        const memoized = memoize(
          (db: Database, id: string) => [db.values[id]],
          { resultEqualityCheck: shallowEqual }
        )
        const seen: unknown[] = []
        const identity = (value: unknown) => {
          const index = seen.indexOf(value)
          return index === -1 ? seen.push(value) - 1 : index
        }
        return calls.map(([version, id]) =>
          identity(memoized(versions[version], id))
        )
      })
    vi.resetModules()
    try {
      vi.stubGlobal('WeakRef', undefined)
      const { weakMapMemoize: withoutWeakRef } =
        await import('@internal/weakMapMemoize')
      vi.unstubAllGlobals()

      expect(trace(withoutWeakRef)).toEqual(trace(weakMapMemoize))
      expect(trace(weakMapMemoize)).toEqual([
        [0, 1, 1, 0, 2, 3, 3, 4, 1],
        [0, 1, 0, 2]
      ])
    } finally {
      vi.unstubAllGlobals()
      vi.resetModules()
    }
  })

  test('finds a result in the previous generation when only a promotion created its object', () => {
    const memoized = weakMapMemoize(
      (db: Database, id: string) => [db.values[id]],
      { resultEqualityCheck: shallowEqual, maxSize: 2 }
    )
    const db = makeDatabase(2)
    const first = memoized(db, 'item-0')
    memoized(db, 'item-1')
    memoized(db, 'item-1')

    expect(memoized({ ...db, revision: 1 }, 'item-0')).toBe(first)
  })

  test('preserves result equality across cache generations', () => {
    const db = makeDatabase(2)
    const memoized = weakMapMemoize(
      (db: Database, id: string) => [db.values[id]],
      { resultEqualityCheck: shallowEqual, maxSize: 2 }
    )
    const first = memoized(db, 'item-0')
    const second = memoized(db, 'item-1')
    const updated = { ...db, revision: 1 }

    expect(memoized(updated, 'item-0')).toBe(first)
    expect(memoized(updated, 'item-1')).toBe(second)
  })

  test('keeps an ID reference through an unrelated state change and a database update that leaves it equal', () => {
    interface Entity {
      name: string
    }
    interface State {
      entities: Record<string, Entity>
      ui: number
    }
    const selectDb = createSelector(
      [(state: State) => state.entities],
      entities => ({ ...entities })
    )
    const produced: Entity[] = []
    const selectEntity = createSelector(
      [selectDb, (_state: State, id: string) => id],
      (db, id) => {
        const entity = { ...db[id] }
        produced.push(entity)
        return entity
      },
      {
        memoizeOptions: { resultEqualityCheck: isEqual },
        devModeChecks: { inputStabilityCheck: 'never' }
      }
    )
    const state1: State = {
      entities: { a: { name: 'A' }, b: { name: 'B' } },
      ui: 0
    }
    const a1 = selectEntity(state1, 'a')
    const b1 = selectEntity(state1, 'b')

    const state2 = { ...state1, ui: 1 }
    expect(selectEntity(state2, 'a')).toBe(a1)
    expect(selectEntity(state2, 'b')).toBe(b1)
    expect(selectDb.recomputations()).toBe(1)
    expect(produced).toHaveLength(2)

    const state3 = {
      ...state2,
      entities: { ...state2.entities, b: { name: 'B2' } }
    }
    const b3 = selectEntity(state3, 'b')
    const a3 = selectEntity(state3, 'a')
    expect(selectDb.recomputations()).toBe(2)
    expect(produced).toHaveLength(4)
    expect(produced[3]).not.toBe(a1)
    expect(produced[3]).toEqual(a1)
    expect(a3).toBe(a1)
    expect(b3).not.toBe(b1)
    expect(b3).toEqual({ name: 'B2' })
  })

  test('keeps references in argsMemoize when each key derives its own input', () => {
    interface State {
      meta: Record<string, { units: string[] }>
    }
    const options = {
      devModeChecks: { inputStabilityCheck: 'never' }
    } as const
    const inputs = [(state: State, type: string) => state.meta[type]] as const
    const combiner = (meta: { units: string[] }) =>
      meta.units.filter(unit => unit !== 'hidden')
    const byInputs = createSelector(inputs, combiner, {
      ...options,
      memoizeOptions: { resultEqualityCheck: shallowEqual }
    })
    const byArguments = createSelector(inputs, combiner, {
      ...options,
      argsMemoizeOptions: { resultEqualityCheck: shallowEqual }
    })
    const makeState = (): State => ({
      meta: {
        task: { units: ['title', 'hidden'] },
        bug: { units: ['status'] }
      }
    })
    const state1 = makeState()
    const state2 = makeState()
    const before = [byInputs, byArguments].map(select => [
      select(state1, 'task'),
      select(state1, 'bug')
    ])
    const after = [byInputs, byArguments].map(select => [
      select(state2, 'task'),
      select(state2, 'bug')
    ])

    expect(after[0][0]).not.toBe(before[0][0])
    expect(after[1][0]).toBe(before[1][0])
    expect(after[1][1]).toBe(before[1][1])
  })

  test('argsMemoize equality compares once per change, not once per state over the same input', () => {
    interface State {
      entities: Record<string, { name: string }>
      ui: number
    }
    let comparisons = 0
    const selectEntity = createSelector(
      [(state: State) => state.entities, (_state: State, id: string) => id],
      (entities, id) => ({ ...entities[id] }),
      {
        argsMemoizeOptions: {
          resultEqualityCheck: (previous: unknown, next: unknown) => {
            comparisons++
            return isEqual(previous, next)
          }
        },
        devModeChecks: { inputStabilityCheck: 'never' }
      }
    )
    const state1: State = { entities: { a: { name: 'A' } }, ui: 0 }
    const first = selectEntity(state1, 'a')
    const entities = { ...state1.entities }

    expect(selectEntity({ entities, ui: 1 }, 'a')).toBe(first)
    expect(comparisons).toBe(1)
    expect(selectEntity({ entities, ui: 2 }, 'a')).toBe(first)
    expect(selectEntity({ entities, ui: 3 }, 'a')).toBe(first)
    expect(comparisons).toBe(1)
  })

  test.each([false, true])(
    'keeps references through strong links if WeakRef was unavailable at import (restore before construction: %s)',
    async restoreBeforeConstruction => {
      vi.resetModules()
      try {
        vi.stubGlobal('WeakRef', undefined)
        const { weakMapMemoize } = await import('@internal/weakMapMemoize')
        if (restoreBeforeConstruction) {
          vi.unstubAllGlobals()
        }
        const memoized = weakMapMemoize(
          (db: Database, id: string) => [db.values[id]],
          { resultEqualityCheck: shallowEqual }
        )
        const db = makeDatabase(2)
        const first = [memoized(db, 'item-0'), memoized(db, 'item-1')]
        for (let revision = 1; revision < 50; revision++) {
          const updated = { ...db, revision }
          expect(memoized(updated, 'item-0')).toBe(first[0])
          expect(memoized(updated, 'item-1')).toBe(first[1])
        }
      } finally {
        vi.unstubAllGlobals()
        vi.resetModules()
      }
    }
  )

  test('a clearCache inside func drops the candidates of the call in progress', () => {
    let clearDuringNextCall = false
    const memoized = weakMapMemoize(
      (db: Database, id: string) => {
        if (clearDuringNextCall) {
          clearDuringNextCall = false
          memoized.clearCache()
        }
        return [db.values[id]]
      },
      { resultEqualityCheck: shallowEqual }
    )
    const db = makeDatabase(1)
    const first = memoized(db, 'item-0')
    clearDuringNextCall = true
    const afterClear = memoized({ ...db, revision: 1 }, 'item-0')

    expect(afterClear).toEqual(first)
    expect(afterClear).not.toBe(first)
  })
})
