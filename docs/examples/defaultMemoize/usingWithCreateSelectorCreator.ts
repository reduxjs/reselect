import { shallowEqual } from 'react-redux'
import { createSelectorCreator, defaultMemoize } from 'reselect'

export interface RootState {
  todos: {
    id: number
    completed: boolean
    title: string
    description: string
  }[]
  alerts: { id: number; read: boolean }[]
}

const createSelectorShallowEqual = createSelectorCreator({
  memoize: defaultMemoize,
  memoizeOptions: {
    equalityCheck: shallowEqual,
    resultEqualityCheck: shallowEqual,
    maxSize: 10
  },
  argsMemoize: defaultMemoize,
  argsMemoizeOptions: {
    equalityCheck: shallowEqual,
    resultEqualityCheck: shallowEqual,
    maxSize: 10
  }
})

const selectTodoIds = createSelectorShallowEqual(
  [(state: RootState) => state.todos],
  todos => todos.map(todo => todo.id)
)
