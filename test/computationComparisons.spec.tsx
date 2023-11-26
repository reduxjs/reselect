/**
 * @vitest-environment jsdom
 */

import { createSelector, weakMapMemoize } from 'reselect'
import React, { useLayoutEffect, useMemo } from 'react'
import type { TypedUseSelectorHook } from 'react-redux'
import { useSelector, Provider, shallowEqual } from 'react-redux'
import * as rtl from '@testing-library/react'

import type {
  OutputSelector,
  OutputSelectorFields,
  Selector,
  defaultMemoize
} from 'reselect'
import type { RootState, Todo } from './testUtils'
import { logSelectorRecomputations } from './testUtils'
import {
  addTodo,
  deepClone,
  localTest,
  toggleCompleted,
  setupStore
} from './testUtils'

describe('Computations and re-rendering with React components', () => {
  const selector = createSelector(
    (a: number) => a,
    a => a
  )

  test('passes', () => {
    console.log(selector(1))
  })

  let store: ReturnType<typeof setupStore>

  beforeEach(() => {
    store = setupStore()
    listItemRenders = 0
    listRenders = 0
    listItemMounts = 0
  })

  type SelectTodoIds = OutputSelector<
    [(state: RootState) => RootState['todos']],
    number[],
    typeof defaultMemoize,
    any
  >

  type SelectTodoById = OutputSelector<
    [
      (state: RootState) => RootState['todos'],
      (state: RootState, id: number) => number
    ],
    readonly [todo: Todo | undefined],
    typeof defaultMemoize,
    any
  >

  const selectTodos = (state: RootState) => state.todos
  const mapTodoIds = (todos: RootState['todos']) => todos.map(({ id }) => id)
  const selectTodoId = (todos: RootState, id: number) => id
  const mapTodoById = (todos: RootState['todos'], id: number) => {
    // Intentionally return this wrapped in an array to force a new reference each time
    return [todos.find(todo => todo.id === id)] as const
  }

  const selectTodoIdsDefault = createSelector([selectTodos], mapTodoIds)
  console.log(`selectTodoIdsDefault name: ${selectTodoIdsDefault.name}`)

  const selectTodoIdsResultEquality = createSelector(
    [selectTodos],
    mapTodoIds,
    { memoizeOptions: { resultEqualityCheck: shallowEqual } }
  )

  const selectTodoIdsWeakMap = createSelector([selectTodos], mapTodoIds, {
    argsMemoize: weakMapMemoize,
    memoize: weakMapMemoize
  })

  const selectTodoIdsWeakMapResultEquality = createSelector(
    [selectTodos],
    mapTodoIds,
    {
      argsMemoize: weakMapMemoize,
      memoize: weakMapMemoize,
      memoizeOptions: { resultEqualityCheck: shallowEqual }
    }
  )

  const selectTodoByIdDefault = createSelector(
    [selectTodos, selectTodoId],
    mapTodoById
  )

  const selectTodoByIdResultEquality = createSelector(
    [selectTodos, selectTodoId],
    mapTodoById,
    { memoizeOptions: { resultEqualityCheck: shallowEqual, maxSize: 500 } }
  )

  const selectTodoByIdWeakMap = createSelector(
    [selectTodos, selectTodoId],
    mapTodoById,
    { argsMemoize: weakMapMemoize, memoize: weakMapMemoize }
  )

  const useAppSelector: TypedUseSelectorHook<RootState> = useSelector

  let listItemRenders = 0
  let listRenders = 0
  let listItemMounts = 0

  const TodoListItem = React.memo(function TodoListItem({
    id,
    selectTodoById
  }: {
    id: number
    selectTodoById: SelectTodoById
  }) {
    // Prevent `useSelector` from re-running the selector while rendering
    // due to passing in a new selector reference
    const memoizedSelectTodoById = useMemo(
      () => (state: RootState) => selectTodoById(state, id),
      [id]
    )
    const [todo] = useAppSelector(memoizedSelectTodoById)

    useLayoutEffect(() => {
      listItemRenders++
    })

    useLayoutEffect(() => {
      listItemMounts++
    }, [])

    return <li>{todo?.title}</li>
  })

  const TodoList = ({
    selectTodoIds,
    selectTodoById
  }: {
    selectTodoIds: SelectTodoIds
    selectTodoById: SelectTodoById
  }) => {
    const todoIds = useAppSelector(selectTodoIds)

    useLayoutEffect(() => {
      listRenders++
    })

    return (
      <ul>
        {todoIds.map(id => (
          <TodoListItem key={id} id={id} selectTodoById={selectTodoById} />
        ))}
      </ul>
    )
  }

  const testCases: [string, SelectTodoIds, SelectTodoById][] = [
    ['default', selectTodoIdsDefault, selectTodoByIdDefault],
    [
      'resultEquality',
      selectTodoIdsResultEquality,
      selectTodoByIdResultEquality
    ],
    ['weakMap', selectTodoIdsWeakMap, selectTodoByIdWeakMap] as any,

    [
      'weakMapResultEquality',
      selectTodoIdsWeakMapResultEquality,
      selectTodoByIdWeakMap
    ]
  ]

  test.each(testCases)(
    `%s`,
    async (
      name,
      selectTodoIds: SelectTodoIds,
      selectTodoById: SelectTodoById
    ) => {
      selectTodoIds.resetRecomputations()
      selectTodoIds.resetDependencyRecomputations()
      selectTodoById.resetRecomputations()
      selectTodoById.resetDependencyRecomputations()
      selectTodoIds.memoizedResultFunc.resetResultsCount()
      selectTodoById.memoizedResultFunc.resetResultsCount()

      const numTodos = store.getState().todos.length
      rtl.render(
        <Provider store={store}>
          <TodoList
            selectTodoIds={selectTodoIds}
            selectTodoById={selectTodoById}
          />
        </Provider>
      )

      console.log(`Recomputations after render (${name}): `)
      console.log('selectTodoIds: ')
      logSelectorRecomputations(selectTodoIds as any)
      console.log('selectTodoById: ')
      logSelectorRecomputations(selectTodoById as any)

      console.log('Render count: ', {
        listRenders,
        listItemRenders,
        listItemMounts
      })

      expect(listItemRenders).toBe(numTodos)

      rtl.act(() => {
        store.dispatch(toggleCompleted(3))
      })

      console.log(`\nRecomputations after toggle completed (${name}): `)
      console.log('selectTodoIds: ')
      logSelectorRecomputations(selectTodoIds as any)
      console.log('selectTodoById: ')
      logSelectorRecomputations(selectTodoById as any)

      console.log('Render count: ', {
        listRenders,
        listItemRenders,
        listItemMounts
      })

      rtl.act(() => {
        store.dispatch(addTodo({ title: 'a', description: 'b' }))
      })

      console.log(`\nRecomputations after added (${name}): `)
      console.log('selectTodoIds: ')
      logSelectorRecomputations(selectTodoIds as any)
      console.log('selectTodoById: ')
      logSelectorRecomputations(selectTodoById as any)

      console.log('Render count: ', {
        listRenders,
        listItemRenders,
        listItemMounts
      })
    }
  )
})
