import type { TypedStructuredSelectorCreator } from 'reselect'
import { createStructuredSelector } from 'reselect'

interface RootState {
  todos: {
    id: number
    completed: boolean
    title: string
    description: string
  }[]
  alerts: { id: number; read: boolean }[]
}

export const createStructuredAppSelector: TypedStructuredSelectorCreator<RootState> =
  createStructuredSelector

const structuredSelector = createStructuredAppSelector({
  // The `state` argument is correctly typed as `RootState`
  todos: state => state.todos,
  alerts: state => state.alerts
})
