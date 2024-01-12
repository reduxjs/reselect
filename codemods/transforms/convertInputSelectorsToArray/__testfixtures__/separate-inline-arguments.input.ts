import {
  createSelector,
  createSelectorCreator,
  unstable_autotrackMemoize as autotrackMemoize,
  weakMapMemoize
} from 'reselect'

type RootState = {
  todos: {
    id: number
    completed: boolean
  }[]
}

const state: RootState = {
  todos: [
    { id: 0, completed: false },
    { id: 1, completed: false }
  ]
}

const selectorDefault = createSelector(
  (state: RootState) => state.todos,
  todos => todos.map(t => t.id)
)

const selectorDefaultParametric = createSelector(
  (state: RootState, id: number) => id,
  (state: RootState) => state.todos,
  (id, todos) => todos.find(t => t.id === id)
)

const selectorLodashFunc = createSelector(
  (state: RootState) => state.todos,
  todos => todos.map(t => t.id),
  {
    memoizeOptions: []
  }
)

const createSelectorWeakMap = createSelectorCreator(weakMapMemoize)

const selector1 = createSelectorWeakMap(
  [(state: RootState) => state.todos],
  todos => todos.find(t => t.id)
)

const selector2 = createSelectorWeakMap(
  [(state: RootState, id: number) => id, (state: RootState) => state.todos],
  (id, todos) => todos.find(t => t.id === id)
)

const selector3 = createSelectorWeakMap(
  [(state: RootState, id: number) => id, (state: RootState) => state.todos],
  (id, todos) => todos.find(t => t.id === id),
  { memoizeOptions: [] }
)

const selectorDefault2 = createSelector(
  [(state: RootState) => state.todos, (state: RootState, id: number) => id],
  (todos, id) => todos.find(todo => todo.id === id)
)
const selectorDefaultWithCacheSize = createSelector(
  [(state: RootState) => state.todos, (state: RootState, id: number) => id],
  (todos, id) => todos.find(todo => todo.id === id),
  { memoizeOptions: { maxSize: 30 } }
)
const selectorDefaultWithArgsCacheSize = createSelector(
  [(state: RootState) => state.todos, (state: RootState, id: number) => id],
  (todos, id) => todos.find(todo => todo.id === id),
  { argsMemoizeOptions: { maxSize: 30 } }
)
const selectorDefaultWithBothCacheSize = createSelector(
  [(state: RootState) => state.todos, (state: RootState, id: number) => id],
  (todos, id) => todos.find(todo => todo.id === id),
  { memoizeOptions: { maxSize: 30 }, argsMemoizeOptions: { maxSize: 30 } }
)
const selectorWeakMap = createSelector(
  [(state: RootState) => state.todos, (state: RootState, id: number) => id],
  (todos, id) => todos.find(todo => todo.id === id),
  { memoize: weakMapMemoize }
)
const selectorAutotrack = createSelector(
  (state: RootState) => state.todos,
  (state: RootState, id: number) => id,
  (todos, id) => todos.find(todo => todo.id === id),
  { memoize: autotrackMemoize }
)
const selectorArgsAutotrack = createSelector(
  (state: RootState) => state.todos,
  (state: RootState, id: number) => id,
  (todos, id) => todos.find(todo => todo.id === id),
  { argsMemoize: autotrackMemoize }
)
const selectorBothAutotrack = createSelector(
  (state: RootState) => state.todos,
  (state: RootState, id: number) => id,
  (todos, id) => todos.find(todo => todo.id === id),
  { argsMemoize: autotrackMemoize, memoize: autotrackMemoize }
)
const selectorArgsWeakMap = createSelector(
  (state: RootState) => state.todos,
  (state: RootState, id: number) => id,
  (todos, id) => todos.find(todo => todo.id === id),
  { argsMemoize: weakMapMemoize }
)
const selectorBothWeakMap = createSelector(
  (state: RootState) => state.todos,
  (state: RootState, id: number) => id,
  (todos, id) => todos.find(todo => todo.id === id),
  { argsMemoize: weakMapMemoize, memoize: weakMapMemoize }
)
const arr = [
  (state: RootState) => state.todos,
  (state: RootState, id: number) => id
] as [
  (state: RootState) => {
    id: number
    completed: boolean
  }[],
  (state: RootState, id: number) => number
]
const selectorBothWeakMap1 = createSelector(
  arr,
  (todos, id) => todos.find(todo => todo.id === id),
  { argsMemoize: weakMapMemoize, memoize: weakMapMemoize }
)
const arr1 = [
  (state: RootState) => state.todos,
  (state: RootState, id: number) => id
] satisfies [
  (state: RootState) => {
    id: number
    completed: boolean
  }[],
  (state: RootState, id: number) => number
]
const selectorBothWeakMap2 = createSelector(
  arr1,
  (todos, id) => todos.find(todo => todo.id === id),
  { argsMemoize: weakMapMemoize, memoize: weakMapMemoize }
)
const arr3 = [
  function (state: RootState) {
    return state.todos
  },
  function (state: RootState, id: number) {
    return id
  }
] as [
  (state: RootState) => {
    id: number
    completed: boolean
  }[],
  (state: RootState, id: number) => number
]
const selectorBothWeakMap4 = createSelector(
  arr3,
  (todos, id) => todos.find(todo => todo.id === id),
  { argsMemoize: weakMapMemoize, memoize: weakMapMemoize }
)
function a(state: RootState) {
  return state.todos
}
function b(state: RootState, id: number) {
  return id
}
const selectorBothWeakMap5 = createSelector(
  a,
  b,
  (todos, id) => todos.find(todo => todo.id === id),
  { argsMemoize: weakMapMemoize, memoize: weakMapMemoize }
)
const selectorBothWeakMap6 = createSelector(
  (state: RootState) => state.todos,
  (state: RootState, id: number) => id,
  (todos, id) => todos.find(todo => todo.id === id),
  { argsMemoize: weakMapMemoize, memoize: weakMapMemoize }
)
