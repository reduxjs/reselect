# convertInputSelectorsToArray

Transforms the usage of the Reselect's `createSelector` API by consolidating multiple inline input selector arguments into a single array.

Should work with both JS and TS files.

## Usage

```
npx reselect-codemods convertInputSelectorsToArray path/of/files/ or/some**/*glob.js

# or

yarn global add reselect-codemods
reselect-codemods convertInputSelectorsToArray path/of/files/ or/some**/*glob.js
```

## Local Usage

```
node ./bin/cli.js convertInputSelectorsToArray path/of/files/ or/some**/*glob.js
```

## Input / Output

<!--FIXTURES_TOC_START-->

- [separate-inline-arguments.input.ts](#separate-inline-arguments.ts)
- [withTypes.input.ts](#withTypes.ts)

<!--FIXTURES_TOC_END-->

## <!--FIXTURES_CONTENT_START-->

<a id="separate-inline-arguments.ts">**separate-inline-arguments.ts**</a>

**Input** (<small>[separate-inline-arguments.input.ts](transforms\convertInputSelectorsToArray\__testfixtures__\separate-inline-arguments.input.ts)</small>):

```ts
import {
  unstable_autotrackMemoize as autotrackMemoize,
  createSelector,
  createSelectorCreator,
  lruMemoize,
  weakMapMemoize
} from 'reselect'

interface RootState {
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
  (todos) => todos.map((t) => t.id)
)

const selectorDefaultParametric = createSelector(
  (state: RootState, id: number) => id,
  (state: RootState) => state.todos,
  (id, todos) => todos.filter((t) => t.id === id)
)

const selectorLodashFunc = createSelector(
  (state: RootState) => state.todos,
  (todos) => todos.map((t) => t.id),
  {
    memoizeOptions: []
  }
)

const createSelectorWeakMap = createSelectorCreator(weakMapMemoize)

const selector1 = createSelectorWeakMap(
  [(state: RootState) => state.todos],
  (todos) => todos.map((t) => t.id)
)

const selector2 = createSelectorWeakMap(
  [(state: RootState, id: number) => id, (state: RootState) => state.todos],
  (id, todos) => todos.filter((t) => t.id === id)
)

const selector3 = createSelectorWeakMap(
  [(state: RootState, id: number) => id, (state: RootState) => state.todos],
  (id, todos) => todos.filter((t) => t.id === id),
  { memoizeOptions: [] }
)

const selectorDefault2 = createSelector(
  [(state: RootState) => state.todos, (state: RootState, id: number) => id],
  (todos, id) => todos.map((todo) => todo.id === id)
)

const selectorDefaultWithCacheSize = createSelector(
  [(state: RootState) => state.todos, (state: RootState, id: number) => id],
  (todos, id) => todos.map((todo) => todo.id === id),
  { memoize: lruMemoize, memoizeOptions: { maxSize: 30 } }
)

const selectorDefaultWithArgsCacheSize = createSelector(
  [(state: RootState) => state.todos, (state: RootState, id: number) => id],
  (todos, id) => todos.map((todo) => todo.id === id),
  { argsMemoize: lruMemoize, argsMemoizeOptions: { maxSize: 30 } }
)

const selectorDefaultWithBothCacheSize = createSelector(
  [(state: RootState) => state.todos, (state: RootState, id: number) => id],
  (todos, id) => todos.map((todo) => todo.id === id),
  {
    memoize: lruMemoize,
    argsMemoize: lruMemoize,
    memoizeOptions: { maxSize: 30 },
    argsMemoizeOptions: { maxSize: 30 }
  }
)

const selectorWeakMap = createSelector(
  [(state: RootState) => state.todos, (state: RootState, id: number) => id],
  (todos, id) => todos.map((todo) => todo.id === id),
  { memoize: weakMapMemoize }
)

const selectorAutotrack = createSelector(
  (state: RootState) => state.todos,
  (state: RootState, id: number) => id,
  (todos, id) => todos.map((todo) => todo.id === id),
  { memoize: autotrackMemoize }
)

const selectorArgsAutotrack = createSelector(
  (state: RootState) => state.todos,
  (state: RootState, id: number) => id,
  (todos, id) => todos.map((todo) => todo.id === id),
  { argsMemoize: autotrackMemoize }
)

const selectorBothAutotrack = createSelector(
  (state: RootState) => state.todos,
  (state: RootState, id: number) => id,
  (todos, id) => todos.map((todo) => todo.id === id),
  { argsMemoize: autotrackMemoize, memoize: autotrackMemoize }
)

const selectorArgsWeakMap = createSelector(
  (state: RootState) => state.todos,
  (state: RootState, id: number) => id,
  (todos, id) => todos.map((todo) => todo.id === id),
  { argsMemoize: weakMapMemoize }
)

const selectorBothWeakMap = createSelector(
  (state: RootState) => state.todos,
  (state: RootState, id: number) => id,
  (todos, id) => todos.map((todo) => todo.id === id),
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
  (todos, id) => todos.map((todo) => todo.id === id),
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
  (todos, id) => todos.map((todo) => todo.id === id),
  { argsMemoize: weakMapMemoize, memoize: weakMapMemoize }
)

const selectTodoIds = createSelector(
  function selectTodos(state: RootState) {
    return state.todos
  },
  function selectId(state: RootState, id: number) {
    return id
  },
  (todos, id) => todos.map((todo) => todo.id)
)

const arr4 = [
  function (state: RootState) {
    return state.todos
  },
  function (state: RootState, id: number) {
    return id
  }
] satisfies [
  (state: RootState) => {
    id: number
    completed: boolean
  }[],
  (state: RootState, id: number) => number
]

const selectorBothWeakMap5 = createSelector(
  arr4,
  (todos, id) => todos.map((todo) => todo.id === id),
  { argsMemoize: weakMapMemoize, memoize: weakMapMemoize }
)

const arr5: [
  (state: RootState) => {
    id: number
    completed: boolean
  }[],
  (state: RootState, id: number) => number
] = [
  function (state: RootState) {
    return state.todos
  },
  function (state: RootState, id: number) {
    return id
  }
]

const selectorBothWeakMap6 = createSelector(
  arr5,
  (todos, id) => todos.map((todo) => todo.id === id),
  { argsMemoize: weakMapMemoize, memoize: weakMapMemoize }
)

const inputSelector = (state: RootState) => state.todos

const selector = createSelector(inputSelector, (todos) =>
  todos.map(({ id }) => id)
)

const selectTodoById = createSelector(
  (state: RootState) => state.todos,
  (state: RootState, id: number) => id,
  (todos, id) => todos.find((todo) => todo.id === id)
)
```

**Output** (<small>[separate-inline-arguments.output.ts](transforms\convertInputSelectorsToArray\__testfixtures__\separate-inline-arguments.output.ts)</small>):

```ts
import {
  unstable_autotrackMemoize as autotrackMemoize,
  createSelector,
  createSelectorCreator,
  lruMemoize,
  weakMapMemoize
} from 'reselect'

interface RootState {
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

const selectorDefault = createSelector([(state: RootState) => state.todos], (todos) => todos.map((t) => t.id))

const selectorDefaultParametric = createSelector(
  [(state: RootState, id: number) => id, (state: RootState) => state.todos],
  (id, todos) => todos.filter((t) => t.id === id)
)

const selectorLodashFunc = createSelector([(state: RootState) => state.todos], (todos) => todos.map((t) => t.id), {
  memoizeOptions: []
})

const createSelectorWeakMap = createSelectorCreator(weakMapMemoize)

const selector1 = createSelectorWeakMap(
  [(state: RootState) => state.todos],
  (todos) => todos.map((t) => t.id)
)

const selector2 = createSelectorWeakMap(
  [(state: RootState, id: number) => id, (state: RootState) => state.todos],
  (id, todos) => todos.filter((t) => t.id === id)
)

const selector3 = createSelectorWeakMap(
  [(state: RootState, id: number) => id, (state: RootState) => state.todos],
  (id, todos) => todos.filter((t) => t.id === id),
  { memoizeOptions: [] }
)

const selectorDefault2 = createSelector(
  [(state: RootState) => state.todos, (state: RootState, id: number) => id],
  (todos, id) => todos.map((todo) => todo.id === id)
)

const selectorDefaultWithCacheSize = createSelector(
  [(state: RootState) => state.todos, (state: RootState, id: number) => id],
  (todos, id) => todos.map((todo) => todo.id === id),
  { memoize: lruMemoize, memoizeOptions: { maxSize: 30 } }
)

const selectorDefaultWithArgsCacheSize = createSelector(
  [(state: RootState) => state.todos, (state: RootState, id: number) => id],
  (todos, id) => todos.map((todo) => todo.id === id),
  { argsMemoize: lruMemoize, argsMemoizeOptions: { maxSize: 30 } }
)

const selectorDefaultWithBothCacheSize = createSelector(
  [(state: RootState) => state.todos, (state: RootState, id: number) => id],
  (todos, id) => todos.map((todo) => todo.id === id),
  {
    memoize: lruMemoize,
    argsMemoize: lruMemoize,
    memoizeOptions: { maxSize: 30 },
    argsMemoizeOptions: { maxSize: 30 }
  }
)

const selectorWeakMap = createSelector(
  [(state: RootState) => state.todos, (state: RootState, id: number) => id],
  (todos, id) => todos.map((todo) => todo.id === id),
  { memoize: weakMapMemoize }
)

const selectorAutotrack = createSelector(
  [(state: RootState) => state.todos, (state: RootState, id: number) => id],
  (todos, id) => todos.map((todo) => todo.id === id),
  { memoize: autotrackMemoize }
)

const selectorArgsAutotrack = createSelector(
  [(state: RootState) => state.todos, (state: RootState, id: number) => id],
  (todos, id) => todos.map((todo) => todo.id === id),
  { argsMemoize: autotrackMemoize }
)

const selectorBothAutotrack = createSelector(
  [(state: RootState) => state.todos, (state: RootState, id: number) => id],
  (todos, id) => todos.map((todo) => todo.id === id),
  { argsMemoize: autotrackMemoize, memoize: autotrackMemoize }
)

const selectorArgsWeakMap = createSelector(
  [(state: RootState) => state.todos, (state: RootState, id: number) => id],
  (todos, id) => todos.map((todo) => todo.id === id),
  { argsMemoize: weakMapMemoize }
)

const selectorBothWeakMap = createSelector(
  [(state: RootState) => state.todos, (state: RootState, id: number) => id],
  (todos, id) => todos.map((todo) => todo.id === id),
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
  (todos, id) => todos.map((todo) => todo.id === id),
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
  (todos, id) => todos.map((todo) => todo.id === id),
  { argsMemoize: weakMapMemoize, memoize: weakMapMemoize }
)

const selectTodoIds = createSelector([function selectTodos(state: RootState) {
  return state.todos
}, function selectId(state: RootState, id: number) {
  return id
}], (todos, id) => todos.map((todo) => todo.id))

const arr4 = [
  function (state: RootState) {
    return state.todos
  },
  function (state: RootState, id: number) {
    return id
  }
] satisfies [
  (state: RootState) => {
    id: number
    completed: boolean
  }[],
  (state: RootState, id: number) => number
]

const selectorBothWeakMap5 = createSelector(
  arr4,
  (todos, id) => todos.map((todo) => todo.id === id),
  { argsMemoize: weakMapMemoize, memoize: weakMapMemoize }
)

const arr5: [
  (state: RootState) => {
    id: number
    completed: boolean
  }[],
  (state: RootState, id: number) => number
] = [
  function (state: RootState) {
    return state.todos
  },
  function (state: RootState, id: number) {
    return id
  }
]

const selectorBothWeakMap6 = createSelector(
  arr5,
  (todos, id) => todos.map((todo) => todo.id === id),
  { argsMemoize: weakMapMemoize, memoize: weakMapMemoize }
)

const inputSelector = (state: RootState) => state.todos

const selector = createSelector([inputSelector], (todos) =>
  todos.map(({ id }) => id))

const selectTodoById = createSelector(
  [(state: RootState) => state.todos, (state: RootState, id: number) => id],
  (todos, id) => todos.find((todo) => todo.id === id)
)
```

---

<a id="withTypes">**withTypes**</a>

**Input** (<small>[withTypes.input.ts](transforms\convertInputSelectorsToArray\__testfixtures__\withTypes.input.ts)</small>):

```ts
import { createSelector, createSelectorCreator, lruMemoize } from 'reselect'

interface RootState {
  todos: {
    id: number
    completed: boolean
  }[]
}

const createAppSelector = createSelector.withTypes<RootState>()

const createSelectorLru = createSelectorCreator({
  memoize: lruMemoize,
  argsMemoize: lruMemoize
})

const createAppSelectorLru = createSelectorLru.withTypes<RootState>()

const createStateSelector = createSelectorCreator({
  memoize: lruMemoize,
  argsMemoize: lruMemoize
}).withTypes<RootState>()

const selectTodoIds = createAppSelector(
  (state) => state.todos,
  (todos) => todos.map(({ id }) => id)
)

const selectTodoIds2 = createAppSelectorLru(
  (state) => state.todos,
  (todos) => todos.map(({ id }) => id)
)

const selectTodoIds3 = createStateSelector(
  (state) => state.todos,
  (todos) => todos.map(({ id }) => id)
)

const selectTodoIdsWithOptions = createAppSelector(
  (state) => state.todos,
  (todos) => todos.map(({ id }) => id),
  {
    argsMemoize: lruMemoize,
    memoize: lruMemoize
  }
)

```

**Output** (<small>[withTypes.output.ts](transforms\convertInputSelectorsToArray\__testfixtures__\withTypes.output.ts)</small>):

```ts
import { createSelector, createSelectorCreator, lruMemoize } from 'reselect'

interface RootState {
  todos: {
    id: number
    completed: boolean
  }[]
}

const createAppSelector = createSelector.withTypes<RootState>()

const createSelectorLru = createSelectorCreator({
  memoize: lruMemoize,
  argsMemoize: lruMemoize
})

const createAppSelectorLru = createSelectorLru.withTypes<RootState>()

const createStateSelector = createSelectorCreator({
  memoize: lruMemoize,
  argsMemoize: lruMemoize
}).withTypes<RootState>()

const selectTodoIds = createAppSelector([(state) => state.todos], (todos) => todos.map(({ id }) => id))

const selectTodoIds2 = createAppSelectorLru([(state) => state.todos], (todos) => todos.map(({ id }) => id))

const selectTodoIds3 = createStateSelector([(state) => state.todos], (todos) => todos.map(({ id }) => id))

const selectTodoIdsWithOptions = createAppSelector([(state) => state.todos], (todos) => todos.map(({ id }) => id), {
  argsMemoize: lruMemoize,
  memoize: lruMemoize
})

```

<!--FIXTURES_CONTENT_END-->