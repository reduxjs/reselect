import { createSelector } from '@reduxjs/toolkit'
import { bench } from 'vitest'
import { autotrackMemoize } from '../src/autotrackMemoize/autotrackMemoize'
import { weakMapMemoize } from '../src/weakMapMemoize'

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
      { id: 1, completed: false }
    ]
  }
  bench(
    'selectorDefault',
    () => {
      const selectorDefault = createSelector(
        (state: State) => state.todos,
        todos => todos.map(t => t.id)
      )
      selectorDefault(state)
    },
    { iterations: 500 }
  )

  bench(
    'selectorAutotrack',
    () => {
      const selectorAutotrack = createSelector(
        (state: State) => state.todos,
        todos => todos.map(t => t.id),
        { memoize: autotrackMemoize }
      )
      selectorAutotrack(state)
    },
    { iterations: 500 }
  )

  bench(
    'selectorWeakMap',
    () => {
      const selectorWeakMap = createSelector(
        (state: State) => state.todos,
        todos => todos.map(t => t.id),
        { memoize: weakMapMemoize }
      )
      selectorWeakMap(state)
    },
    { iterations: 500 }
  )
})
