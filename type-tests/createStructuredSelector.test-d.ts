import type { TypedStructuredSelectorCreator } from 'reselect'
import { createStructuredSelector } from 'reselect'
import { describe, test } from 'vitest'

interface RootState {
  todos: { id: number; completed: boolean }[]
  alerts: { id: number; read: boolean }[]
}

const state: RootState = {
  todos: [
    { id: 0, completed: false },
    { id: 1, completed: true }
  ],
  alerts: [
    { id: 0, read: false },
    { id: 1, read: true }
  ]
}

describe('createStructuredSelector', () => {
  test('TypedStructuredSelectorCreator', () => {
    const typedStructuredSelectorCreator: TypedStructuredSelectorCreator<RootState> =
      createStructuredSelector
    const structuredSelector = typedStructuredSelectorCreator({
      todos: state => state.todos,
      alerts: state => state.alerts
    })
    structuredSelector(state).alerts
    structuredSelector(state).todos
  })
  test('parametric', () => {
    const structuredSelector = createStructuredSelector({
      todos: (state: RootState) => state.todos,
      alerts: (state: RootState) => state.alerts,
      todoById: (state: RootState, id: number) => state.todos[id]
    })
    structuredSelector(state, 0).alerts
    structuredSelector(state, 0).todoById.id
    structuredSelector(state, 0).todos
    const { alerts, todos, todoById } = structuredSelector(state, 0)
  })
})
