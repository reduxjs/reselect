import { createSelector } from '@reduxjs/toolkit'
import { bench } from 'vitest'
import { autotrackMemoize } from '../src/autotrackMemoize/autotrackMemoize'
import { weakMapMemoize } from '../src/weakMapMemoize'

const options: NonNullable<Parameters<typeof bench>[2]> = {
  iterations: 1_000_000,
  time: 100
}

describe('bench', () => {
  interface State {
    todos: {
      id: number
      completed: boolean
    }[]
  }
  const state: State = {
    todos: [
      { id: 0, completed: false },
      { id: 1, completed: false },
      { id: 2, completed: false },
      { id: 3, completed: false },
      { id: 4, completed: false },
      { id: 5, completed: false },
      { id: 6, completed: false },
      { id: 7, completed: false },
      { id: 8, completed: false },
      { id: 9, completed: false },
      { id: 10, completed: false },
      { id: 11, completed: false },
      { id: 12, completed: false },
      { id: 13, completed: false },
      { id: 14, completed: false },
      { id: 15, completed: false },
      { id: 16, completed: false },
      { id: 17, completed: false },
      { id: 18, completed: false },
      { id: 19, completed: false },
      { id: 20, completed: false },
      { id: 21, completed: false },
      { id: 22, completed: false },
      { id: 23, completed: false },
      { id: 24, completed: false },
      { id: 25, completed: false },
      { id: 26, completed: false },
      { id: 27, completed: false },
      { id: 28, completed: false },
      { id: 29, completed: false },
      { id: 30, completed: false },
      { id: 31, completed: false },
      { id: 32, completed: false },
      { id: 33, completed: false },
      { id: 34, completed: false },
      { id: 35, completed: false },
      { id: 36, completed: false },
      { id: 37, completed: false },
      { id: 38, completed: false },
      { id: 39, completed: false },
      { id: 40, completed: false },
      { id: 41, completed: false },
      { id: 42, completed: false },
      { id: 43, completed: false },
      { id: 44, completed: false },
      { id: 45, completed: false },
      { id: 46, completed: false },
      { id: 47, completed: false },
      { id: 48, completed: false },
      { id: 49, completed: false },
      { id: 50, completed: false },
      { id: 51, completed: false },
      { id: 52, completed: false },
      { id: 53, completed: false },
      { id: 54, completed: false },
      { id: 55, completed: false },
      { id: 56, completed: false },
      { id: 57, completed: false },
      { id: 58, completed: false },
      { id: 59, completed: false },
      { id: 60, completed: false },
      { id: 61, completed: false },
      { id: 62, completed: false },
      { id: 63, completed: false },
      { id: 64, completed: false },
      { id: 65, completed: false },
      { id: 66, completed: false },
      { id: 67, completed: false },
      { id: 68, completed: false },
      { id: 69, completed: false },
      { id: 70, completed: false },
      { id: 71, completed: false },
      { id: 72, completed: false },
      { id: 73, completed: false },
      { id: 74, completed: false },
      { id: 75, completed: false },
      { id: 76, completed: false },
      { id: 77, completed: false },
      { id: 78, completed: false },
      { id: 79, completed: false },
      { id: 80, completed: false },
      { id: 81, completed: false },
      { id: 82, completed: false },
      { id: 83, completed: false },
      { id: 84, completed: false },
      { id: 85, completed: false },
      { id: 86, completed: false },
      { id: 87, completed: false },
      { id: 88, completed: false },
      { id: 89, completed: false },
      { id: 90, completed: false },
      { id: 91, completed: false },
      { id: 92, completed: false },
      { id: 93, completed: false },
      { id: 94, completed: false },
      { id: 95, completed: false },
      { id: 96, completed: false },
      { id: 97, completed: false },
      { id: 98, completed: false },
      { id: 99, completed: false }
    ]
  }
  const selectorDefault = createSelector(
    (state: State) => state.todos,
    todos => todos.map(t => t.id)
  )
  const selectorAutotrack = createSelector(
    (state: State) => state.todos,
    todos => todos.map(t => t.id),
    { memoize: autotrackMemoize }
  )
  const selectorWeakMap = createSelector(
    (state: State) => state.todos,
    todos => todos.map(t => t.id),
    { memoize: weakMapMemoize }
  )
  const selectorArgsAutotrack = createSelector(
    (state: State) => state.todos,
    todos => todos.map(t => t.id),
    { argsMemoize: autotrackMemoize }
  )
  const nonMemoizedSelector = (state: State) => state.todos.map(t => t.id)
  const selectorArgsWeakMap = createSelector(
    (state: State) => state.todos,
    todos => todos.map(t => t.id),
    { argsMemoize: weakMapMemoize }
  )
  const parametricSelector = createSelector(
    (state: State) => state.todos,
    (state: State, id: number) => id,
    (todos, id) => todos[id]
  )
  const parametricSelectorWeakMapArgs = createSelector(
    (state: State) => state.todos,
    (state: State, id: number) => id,
    (todos, id) => todos[id],
    {
      argsMemoize: weakMapMemoize
    }
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
