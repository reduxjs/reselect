import {
  createSelector,
  unstable_autotrackMemoize as autotrackMemoize,
  weakMapMemoize
} from 'reselect'
import type { Options } from 'tinybench'
import { bench } from 'vitest'
import type { RootState } from '../testUtils'
import { setFunctionNames, setupStore } from '../testUtils'

const options: Options = {
  // iterations: 10_000_000,
  // time: 0
}

describe.skip('bench', () => {
  const store = setupStore()
  const state = store.getState()
  const selectorDefault = createSelector(
    (state: RootState) => state.todos,
    todos => todos.map(({ id }) => id)
  )
  const selectorAutotrack = createSelector(
    (state: RootState) => state.todos,
    todos => todos.map(({ id }) => id),
    { memoize: autotrackMemoize }
  )
  const selectorWeakMap = createSelector(
    (state: RootState) => state.todos,
    todos => todos.map(({ id }) => id),
    { memoize: weakMapMemoize }
  )
  const selectorArgsAutotrack = createSelector(
    (state: RootState) => state.todos,
    todos => todos.map(({ id }) => id),
    { argsMemoize: autotrackMemoize }
  )
  const nonMemoizedSelector = (state: RootState) => {
    return state.todos.map(({ id }) => id)
  }

  const selectorArgsWeakMap = createSelector(
    (state: RootState) => state.todos,
    todos => todos.map(({ id }) => id),
    { argsMemoize: weakMapMemoize }
  )
  const parametricSelector = createSelector(
    (state: RootState) => state.todos,
    (state: RootState, id: number) => id,
    (todos, id) => todos[id]
  )
  const parametricSelectorWeakMapArgs = createSelector(
    (state: RootState) => state.todos,
    (state: RootState, id: number) => id,
    (todos, id) => todos[id],
    { argsMemoize: weakMapMemoize }
  )
  bench(
    'selectorDefault',
    () => {
      selectorDefault(state)
    },
    options
  )
  bench(
    'selectorAutotrack',
    () => {
      selectorAutotrack(state)
    },
    options
  )
  bench(
    'selectorWeakMap',
    () => {
      selectorWeakMap(state)
    },
    options
  )
  bench(
    'selectorArgsAutotrack',
    () => {
      selectorArgsAutotrack(state)
    },
    options
  )
  bench(
    'selectorArgsWeakMap',
    () => {
      selectorArgsWeakMap(state)
    },
    options
  )
  bench(
    'non-memoized selector',
    () => {
      nonMemoizedSelector(state)
    },
    options
  )
  bench(
    'parametricSelector',
    () => {
      parametricSelector(state, 0)
    },
    options
  )
  bench(
    'parametricSelectorWeakMapArgs',
    () => {
      parametricSelectorWeakMapArgs(state, 0)
    },
    options
  )
})

describe.skip('for loops', () => {
  const store = setupStore()
  const state = store.getState()
  const { todos } = state
  const { length } = todos
  bench(
    'for loop length not cached',
    () => {
      for (let i = 0; i < todos.length; i++) {
        //
        todos[i].completed
        todos[i].id
      }
    },
    options
  )
  bench(
    'for loop length cached',
    () => {
      for (let i = 0; i < length; i++) {
        //
        todos[i].completed
        todos[i].id
      }
    },
    options
  )
  bench(
    'for loop length and arg cached',
    () => {
      for (let i = 0; i < length; i++) {
        //
        const arg = todos[i]
        arg.completed
        arg.id
      }
    },
    options
  )
})

describe.skip('nested field access', () => {
  const store = setupStore()
  const state = store.getState()
  const selectorDefault = createSelector(
    (state: RootState) => state.users,
    users => users.user.details.preferences.notifications.push.frequency
  )
  const selectorDefault1 = createSelector(
    (state: RootState) => state.users.user,
    user => user.details.preferences.notifications.push.frequency
  )
  const nonMemoizedSelector = (state: RootState) =>
    state.users.user.details.preferences.notifications.push.frequency
  bench(
    'selectorDefault',
    () => {
      selectorDefault(state)
    },
    options
  )
  bench(
    'nonMemoizedSelector',
    () => {
      nonMemoizedSelector(state)
    },
    options
  )
  bench(
    'selectorDefault1',
    () => {
      selectorDefault1(state)
    },
    options
  )
})

describe.skip('simple field access', () => {
  const store = setupStore()
  const state = store.getState()
  const selectorDefault = createSelector(
    (state: RootState) => state.users,
    users => users.user.details.preferences.notifications.push.frequency
  )
  const selectorDefault1 = createSelector(
    (state: RootState) => state.users.user,
    user => user.details.preferences.notifications.push.frequency
  )
  const selectorDefault2 = createSelector(
    (state: RootState) => state.users,
    (state: RootState) => state.users,
    (state: RootState) => state.users,
    (state: RootState) => state.users,
    (state: RootState) => state.users,
    (state: RootState) => state.users,
    (state: RootState) => state.users,
    (state: RootState) => state.users,
    (state: RootState) => state.users,
    (state: RootState) => state.users,
    (state: RootState) => state.users,
    (state: RootState) => state.users,
    (state: RootState) => state.users,
    (state: RootState) => state.users,
    (state: RootState) => state.users,
    (state: RootState) => state.users,
    (state: RootState) => state.users,
    (state: RootState) => state.users,
    (state: RootState) => state.users,
    (state: RootState) => state.users,
    (state: RootState) => state.users,
    (state: RootState) => state.users,
    (state: RootState) => state.users,
    (state: RootState) => state.users,
    (state: RootState) => state.users,
    users => users.user.details.preferences.notifications.push.frequency
  )
  const nonMemoizedSelector = (state: RootState) =>
    state.users.user.details.preferences.notifications.push.frequency
  bench(
    'selectorDefault',
    () => {
      selectorDefault(state)
    },
    options
  )
  bench(
    'nonMemoizedSelector',
    () => {
      nonMemoizedSelector(state)
    },
    options
  )
  bench(
    'selectorDefault1',
    () => {
      selectorDefault1(state)
    },
    options
  )
  bench(
    'selectorDefault2',
    () => {
      selectorDefault2(state)
    },
    options
  )
})

describe.only('field accessors', () => {
  const store = setupStore()
  const selectorDefault = createSelector(
    [(state: RootState) => state.users],
    users => users.appSettings
  )
  const nonMemoizedSelector = (state: RootState) => state.users.appSettings

  setFunctionNames({ selectorDefault, nonMemoizedSelector })

  const options: Options = {
    // iterations: 1000,
    // time: 0
  }
  bench(
    selectorDefault,
    () => {
      selectorDefault(store.getState())
    },
    { ...options }
  )
  bench(
    nonMemoizedSelector,
    () => {
      nonMemoizedSelector(store.getState())
    },
    { ...options }
  )
})
