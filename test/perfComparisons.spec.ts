import type { PayloadAction } from '@reduxjs/toolkit'
import { configureStore, createSlice } from '@reduxjs/toolkit'
import { createSelectorCreator, weakMapMemoize } from 'reselect'
import { vi } from 'vitest'

describe('More perf comparisons', () => {
  const originalEnv = process.env.NODE_ENV

  beforeAll(() => {
    process.env.NODE_ENV = 'production'
  })
  afterAll(() => {
    process.env.NODE_NV = originalEnv
  })

  interface Todo {
    id: number
    name: string
    completed: boolean
  }

  type TodosState = Todo[]

  const counterSlice = createSlice({
    name: 'counters',
    initialState: {
      deeply: {
        nested: {
          really: {
            deeply: {
              nested: {
                c1: { value: 0 }
              }
            }
          }
        }
      },

      c2: { value: 0 }
    },
    reducers: {
      increment1(state) {
        // state.c1.value++
        state.deeply.nested.really.deeply.nested.c1.value++
      },
      increment2(state) {
        state.c2.value++
      }
    }
  })

  const todosSlice = createSlice({
    name: 'todos',
    initialState: [
      { id: 0, name: 'a', completed: false },
      { id: 1, name: 'b', completed: false },
      { id: 2, name: 'c', completed: false }
    ] as TodosState,
    reducers: {
      toggleCompleted(state, action: PayloadAction<number>) {
        const todo = state.find(todo => todo.id === action.payload)
        if (todo) {
          todo.completed = !todo.completed
        }
      },
      setName(state) {
        state[1].name = 'd'
      }
    }
  })

  const store = configureStore({
    reducer: {
      counter: counterSlice.reducer,
      todos: todosSlice.reducer
    },
    middleware: gDM =>
      gDM({
        serializableCheck: false,
        immutableCheck: false
      })
  })

  type RootState = ReturnType<typeof store.getState>

  it.skip('weakMapMemoizer recalcs', () => {
    const state1 = store.getState()

    store.dispatch(counterSlice.actions.increment1())
    const state2 = store.getState()

    const csWeakmap = createSelectorCreator(weakMapMemoize)

    const cwCounters2 = csWeakmap(
      (state: RootState) => state.counter.deeply.nested.really.deeply.nested.c1,
      (state: RootState) => state.counter.c2,
      (c1, c2) => {
        // console.log('inside caCounters2: ', { c1, c2 })
        return c1.value + c2.value
      }
    )

    for (let i = 0; i < 10; i++) {
      cwCounters2(state1)
      cwCounters2(state2)
    }

    console.log('cwCounters2.recomputations()', cwCounters2.recomputations())
  })

  test('Weakmap memoizer has an infinite cache size', async () => {
    const fn = vi.fn()

    let resolve: () => void
    const promise = new Promise<void>(r => (resolve = r))

    const registry = new FinalizationRegistry(heldValue => {
      resolve()
      fn(heldValue)
    })

    const createSelectorWeakmap = createSelectorCreator(weakMapMemoize)

    const store = configureStore({
      reducer: {
        counter: counterSlice.reducer,
        todos: todosSlice.reducer
      },
      middleware: gDM =>
        gDM({
          serializableCheck: false,
          immutableCheck: false
        })
    })

    const reduxStates: RootState[] = []

    const NUM_ITEMS = 10

    for (let i = 0; i < NUM_ITEMS; i++) {
      store.dispatch(todosSlice.actions.toggleCompleted(1))
      const state = store.getState()
      reduxStates.push(state)
      registry.register(state, i)
    }

    const cdTodoIdsAndNames = createSelectorWeakmap(
      (state: RootState) => state.todos,
      todos => {
        // console.log('Recalculating todo IDs')
        return todos.map(todo => ({ id: todo.id, name: todo.name }))
      }
    )

    for (const state of reduxStates) {
      cdTodoIdsAndNames(state)
    }

    expect(cdTodoIdsAndNames.recomputations()).toBe(NUM_ITEMS)

    for (const state of reduxStates) {
      cdTodoIdsAndNames(state)
    }

    expect(cdTodoIdsAndNames.recomputations()).toBe(NUM_ITEMS)

    cdTodoIdsAndNames.memoizedResultFunc.clearCache()

    cdTodoIdsAndNames(reduxStates[0])

    expect(cdTodoIdsAndNames.recomputations()).toBe(NUM_ITEMS)

    cdTodoIdsAndNames(reduxStates[1])

    expect(cdTodoIdsAndNames.recomputations()).toBe(NUM_ITEMS)

    // @ts-ignore
    reduxStates[0] = null
    if (global.gc) {
      global.gc()
    } else {
      return
    }

    await promise
    expect(fn).toHaveBeenCalledWith(0)

    // garbage-collected for ID: 3
  })
})
