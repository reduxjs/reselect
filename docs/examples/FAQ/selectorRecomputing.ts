import { createSelector } from 'reselect'

export interface RootState {
  todos: { id: number; completed: boolean }[]
  alerts: { id: number; read: boolean; type: string }[]
}

const selectAlertsByType = createSelector(
  [
    (state: RootState) => state.alerts,
    (state: RootState, type: string) => type
  ],
  (alerts, type) => alerts.filter(todo => todo.type === type),
  {
    argsMemoizeOptions: {
      // This will check the arguments passed to the output selector.
      equalityCheck: (a, b) => {
        if (a !== b) {
          console.log('Changed argument:', a, 'to', b)
        }
        return a === b
      }
    }
  }
)
