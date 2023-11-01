import type { PayloadAction } from '@reduxjs/toolkit'
import { combineReducers, configureStore, createSlice } from '@reduxjs/toolkit'

interface Todo {
  id: number
  title: string
  description: string
  completed: boolean
}

interface Alert {
  id: number
  message: string
  type: string
  read: boolean
}

const todoState = [
  {
    id: 0,
    title: 'Buy groceries',
    description: 'Milk, bread, eggs, and fruits',
    completed: false
  },
  {
    id: 1,
    title: 'Schedule dentist appointment',
    description: 'Check available slots for next week',
    completed: false
  },
  {
    id: 2,
    title: 'Convince the cat to get a job',
    description: 'Need extra income for cat treats',
    completed: false
  },
  {
    id: 3,
    title: 'Figure out if plants are plotting world domination',
    description: 'That cactus looks suspicious...',
    completed: false
  },
  {
    id: 4,
    title: 'Practice telekinesis',
    description: 'Try moving the remote without getting up',
    completed: false
  },
  {
    id: 5,
    title: 'Determine location of El Dorado',
    description: 'Might need it for the next vacation',
    completed: false
  },
  {
    id: 6,
    title: 'Master the art of invisible potato juggling',
    description: 'Great party trick',
    completed: false
  }
]

const alertState = [
  {
    id: 0,
    message: 'You have an upcoming meeting at 3 PM.',
    type: 'reminder',
    read: false
  },
  {
    id: 1,
    message: 'New software update available.',
    type: 'notification',
    read: false
  },
  {
    id: 3,
    message:
      'The plants have been watered, but keep an eye on that shifty cactus.',
    type: 'notification',
    read: false
  },
  {
    id: 4,
    message:
      'Telekinesis class has been moved to 5 PM. Please do not bring any spoons.',
    type: 'reminder',
    read: false
  },
  {
    id: 5,
    message:
      'Expedition to El Dorado is postponed. The treasure map is being updated.',
    type: 'notification',
    read: false
  },
  {
    id: 6,
    message:
      'Invisible potato juggling championship is tonight. May the best mime win.',
    type: 'reminder',
    read: false
  }
]

const todoSlice = createSlice({
  name: 'todos',
  initialState: todoState,
  reducers: {
    toggleCompleted: (state, action: PayloadAction<number>) => {
      const todo = state.find(todo => todo.id === action.payload)
      if (todo) {
        todo.completed = !todo.completed
      }
    },

    addTodo: (state, action: PayloadAction<Omit<Todo, 'id' | 'completed'>>) => {
      const newId = state.length > 0 ? state[state.length - 1].id + 1 : 0
      state.push({
        ...action.payload,
        id: newId,
        completed: false
      })
    },

    removeTodo: (state, action: PayloadAction<number>) => {
      return state.filter(todo => todo.id !== action.payload)
    },

    updateTodo: (state, action: PayloadAction<Todo>) => {
      const index = state.findIndex(todo => todo.id === action.payload.id)
      if (index !== -1) {
        state[index] = action.payload
      }
    },

    clearCompleted: state => {
      return state.filter(todo => !todo.completed)
    }
  }
})

const alertSlice = createSlice({
  name: 'alerts',
  initialState: alertState,
  reducers: {
    markAsRead: (state, action: PayloadAction<number>) => {
      const alert = state.find(alert => alert.id === action.payload)
      if (alert) {
        alert.read = true
      }
    },

    addAlert: (state, action: PayloadAction<Omit<Alert, 'id'>>) => {
      const newId = state.length > 0 ? state[state.length - 1].id + 1 : 0
      state.push({
        ...action.payload,
        id: newId
      })
    },

    removeAlert: (state, action: PayloadAction<number>) => {
      return state.filter(alert => alert.id !== action.payload)
    }
  }
})

const rootReducer = combineReducers({
  [todoSlice.name]: todoSlice.reducer,
  [alertSlice.name]: alertSlice.reducer
})

export const setupStore = () => configureStore({ reducer: rootReducer })

export type AppStore = ReturnType<typeof setupStore>

export type RootState = ReturnType<typeof rootReducer>

export interface LocalTestContext {
  store: AppStore
  state: RootState
}

export const { markAsRead, addAlert, removeAlert } = alertSlice.actions

export const {
  toggleCompleted,
  addTodo,
  removeTodo,
  updateTodo,
  clearCompleted
} = todoSlice.actions

// Since Node 16 does not support `structuredClone`
export const deepClone = <T extends object>(object: T): T =>
  JSON.parse(JSON.stringify(object))
