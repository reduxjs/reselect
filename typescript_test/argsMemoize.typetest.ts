import { createSelector } from '@reduxjs/toolkit'
import memoizeOne from 'memoize-one'
import microMemoize from 'micro-memoize'
import { autotrackMemoize, weakMapMemoize } from 'reselect'
import { createSelectorCreator } from '../src/createSelectorCreator'
import { defaultMemoize } from '../src/defaultMemoize'
import { expectExactType } from './test'

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

function overrideOnlyMemoizeInCreateSelector() {
  const selectorDefaultSeparateInlineArgs = createSelector(
    (state: State) => state.todos,
    todos => todos.map(t => t.id),
    { memoize: defaultMemoize }
  )
  const selectorDefaultArgsAsArray = createSelector(
    [(state: State) => state.todos],
    todos => todos.map(t => t.id),
    { memoize: defaultMemoize }
  )
  const selectorDefaultArgsAsArrayWithMemoizeOptions = createSelector(
    [(state: State) => state.todos],
    todos => todos.map(t => t.id),
    { memoize: defaultMemoize, memoizeOptions: { maxSize: 2 } }
  )
  const selectorDefaultSeparateInlineArgsWithMemoizeOptions = createSelector(
    (state: State) => state.todos,
    todos => todos.map(t => t.id),
    { memoize: defaultMemoize, memoizeOptions: { maxSize: 2 } }
  )
  const selectorAutotrackSeparateInlineArgs = createSelector(
    (state: State) => state.todos,
    todos => todos.map(t => t.id),
    { memoize: autotrackMemoize }
  )
  const selectorAutotrackArgsAsArray = createSelector(
    [(state: State) => state.todos],
    todos => todos.map(t => t.id),
    { memoize: autotrackMemoize }
  )
  // @ts-expect-error When memoize is autotrackMemoize, type of memoizeOptions needs to be the same as options args in autotrackMemoize.
  const selectorAutotrackArgsAsArrayWithMemoizeOptions = createSelector(
    [(state: State) => state.todos],
    // @ts-expect-error
    todos => todos.map(t => t.id),
    { memoize: autotrackMemoize, memoizeOptions: { maxSize: 2 } }
  )
  // @ts-expect-error When memoize is autotrackMemoize, type of memoizeOptions needs to be the same as options args in autotrackMemoize.
  const selectorAutotrackSeparateInlineArgsWithMemoizeOptions = createSelector(
    (state: State) => state.todos,
    // @ts-expect-error
    todos => todos.map(t => t.id),
    { memoize: autotrackMemoize, memoizeOptions: { maxSize: 2 } }
  )
  const selectorWeakMapSeparateInlineArgs = createSelector(
    (state: State) => state.todos,
    todos => todos.map(t => t.id),
    { memoize: weakMapMemoize }
  )
  const selectorWeakMapArgsAsArray = createSelector(
    [(state: State) => state.todos],
    todos => todos.map(t => t.id),
    { memoize: weakMapMemoize }
  )
  // @ts-expect-error When memoize is weakMapMemoize, type of memoizeOptions needs to be the same as options args in weakMapMemoize.
  const selectorWeakMapArgsAsArrayWithMemoizeOptions = createSelector(
    [(state: State) => state.todos],
    // @ts-expect-error
    todos => todos.map(t => t.id),
    { memoize: weakMapMemoize, memoizeOptions: { maxSize: 2 } }
  )
  // @ts-expect-error When memoize is weakMapMemoize, type of memoizeOptions needs to be the same as options args in weakMapMemoize.
  const selectorWeakMapSeparateInlineArgsWithMemoizeOptions = createSelector(
    (state: State) => state.todos,
    // @ts-expect-error
    todos => todos.map(t => t.id),
    { memoize: weakMapMemoize, memoizeOptions: { maxSize: 2 } }
  )
  const createSelectorDefault = createSelectorCreator(defaultMemoize)
  const createSelectorWeakMap = createSelectorCreator(weakMapMemoize)
  const createSelectorAutotrack = createSelectorCreator(autotrackMemoize)
  const changeMemoizeMethodSelectorDefault = createSelectorDefault(
    (state: State) => state.todos,
    todos => todos.map(t => t.id),
    { memoize: weakMapMemoize }
  )
  const changeMemoizeMethodSelectorWeakMap = createSelectorWeakMap(
    (state: State) => state.todos,
    todos => todos.map(t => t.id),
    { memoize: defaultMemoize }
  )
  const changeMemoizeMethodSelectorAutotrack = createSelectorAutotrack(
    (state: State) => state.todos,
    todos => todos.map(t => t.id),
    { memoize: defaultMemoize }
  )
  const changeMemoizeMethodSelectorDefaultWithMemoizeOptions =
    // @ts-expect-error When memoize is changed to weakMapMemoize or autotrackMemoize, memoizeOptions cannot be the same type as options args in defaultMemoize.
    createSelectorDefault(
      (state: State) => state.todos,
      // @ts-expect-error
      todos => todos.map(t => t.id),
      { memoize: weakMapMemoize, memoizeOptions: { maxSize: 2 } }
    )
  const changeMemoizeMethodSelectorWeakMapWithMemoizeOptions =
    createSelectorWeakMap(
      (state: State) => state.todos,
      todos => todos.map(t => t.id),
      { memoize: defaultMemoize, memoizeOptions: { maxSize: 2 } } // When memoize is changed to defaultMemoize, memoizeOptions can now be the same type as options args in defaultMemoize.
    )
  const changeMemoizeMethodSelectorAutotrackWithMemoizeOptions =
    createSelectorAutotrack(
      (state: State) => state.todos,
      todos => todos.map(t => t.id),
      { memoize: defaultMemoize, memoizeOptions: { maxSize: 2 } } // When memoize is changed to defaultMemoize, memoizeOptions can now be the same type as options args in defaultMemoize.
    )
}

function overrideOnlyArgsMemoizeInCreateSelector() {
  const selectorDefaultSeparateInlineArgs = createSelector(
    (state: State) => state.todos,
    todos => todos.map(t => t.id),
    { argsMemoize: defaultMemoize }
  )
  const selectorDefaultArgsAsArray = createSelector(
    [(state: State) => state.todos],
    todos => todos.map(t => t.id),
    { argsMemoize: defaultMemoize }
  )
  const selectorDefaultArgsAsArrayWithMemoizeOptions = createSelector(
    [(state: State) => state.todos],
    todos => todos.map(t => t.id),
    { argsMemoize: defaultMemoize, argsMemoizeOptions: { maxSize: 2 } }
  )
  const selectorDefaultSeparateInlineArgsWithMemoizeOptions = createSelector(
    (state: State) => state.todos,
    todos => todos.map(t => t.id),
    { argsMemoize: defaultMemoize, argsMemoizeOptions: { maxSize: 2 } }
  )
  const selectorAutotrackSeparateInlineArgs = createSelector(
    (state: State) => state.todos,
    todos => todos.map(t => t.id),
    { argsMemoize: autotrackMemoize }
  )
  const selectorAutotrackArgsAsArray = createSelector(
    [(state: State) => state.todos],
    todos => todos.map(t => t.id),
    { argsMemoize: autotrackMemoize }
  )
  // @ts-expect-error When argsMemoize is autotrackMemoize, type of argsMemoizeOptions needs to be the same as options args in autotrackMemoize.
  const selectorAutotrackArgsAsArrayWithMemoizeOptions = createSelector(
    [(state: State) => state.todos],
    // @ts-expect-error
    todos => todos.map(t => t.id),
    { argsMemoize: autotrackMemoize, argsMemoizeOptions: { maxSize: 2 } }
  )
  // @ts-expect-error When argsMemoize is autotrackMemoize, type of argsMemoizeOptions needs to be the same as options args in autotrackMemoize.
  const selectorAutotrackSeparateInlineArgsWithMemoizeOptions = createSelector(
    (state: State) => state.todos,
    // @ts-expect-error
    todos => todos.map(t => t.id),
    { argsMemoize: autotrackMemoize, argsMemoizeOptions: { maxSize: 2 } }
  )
  const selectorWeakMapSeparateInlineArgs = createSelector(
    (state: State) => state.todos,
    todos => todos.map(t => t.id),
    { argsMemoize: weakMapMemoize }
  )
  const selectorWeakMapArgsAsArray = createSelector(
    [(state: State) => state.todos],
    todos => todos.map(t => t.id),
    { argsMemoize: weakMapMemoize }
  )
  // @ts-expect-error When argsMemoize is weakMapMemoize, type of argsMemoizeOptions needs to be the same as options args in weakMapMemoize.
  const selectorWeakMapArgsAsArrayWithMemoizeOptions = createSelector(
    [(state: State) => state.todos],
    // @ts-expect-error
    todos => todos.map(t => t.id),
    { argsMemoize: weakMapMemoize, argsMemoizeOptions: { maxSize: 2 } }
  )
  // @ts-expect-error When argsMemoize is weakMapMemoize, type of argsMemoizeOptions needs to be the same as options args in weakMapMemoize.
  const selectorWeakMapSeparateInlineArgsWithMemoizeOptions = createSelector(
    (state: State) => state.todos,
    // @ts-expect-error
    todos => todos.map(t => t.id),
    { argsMemoize: weakMapMemoize, argsMemoizeOptions: { maxSize: 2 } }
  )
  const createSelectorDefault = createSelectorCreator(defaultMemoize)
  const createSelectorWeakMap = createSelectorCreator(weakMapMemoize)
  const createSelectorAutotrack = createSelectorCreator(autotrackMemoize)
  const changeMemoizeMethodSelectorDefault = createSelectorDefault(
    (state: State) => state.todos,
    todos => todos.map(t => t.id),
    { argsMemoize: weakMapMemoize }
  )
  const changeMemoizeMethodSelectorWeakMap = createSelectorWeakMap(
    (state: State) => state.todos,
    todos => todos.map(t => t.id),
    { argsMemoize: defaultMemoize }
  )
  const changeMemoizeMethodSelectorAutotrack = createSelectorAutotrack(
    (state: State) => state.todos,
    todos => todos.map(t => t.id),
    { argsMemoize: defaultMemoize }
  )
  const changeMemoizeMethodSelectorDefaultWithMemoizeOptions =
    // @ts-expect-error When argsMemoize is changed to weakMapMemoize or autotrackMemoize, argsMemoizeOptions cannot be the same type as options args in defaultMemoize.
    createSelectorDefault(
      (state: State) => state.todos,
      // @ts-expect-error
      todos => todos.map(t => t.id),
      { argsMemoize: weakMapMemoize, argsMemoizeOptions: { maxSize: 2 } }
    )
  const changeMemoizeMethodSelectorWeakMapWithMemoizeOptions =
    createSelectorWeakMap(
      (state: State) => state.todos,
      todos => todos.map(t => t.id),
      { argsMemoize: defaultMemoize, argsMemoizeOptions: { maxSize: 2 } } // When argsMemoize is changed to defaultMemoize, argsMemoizeOptions can now be the same type as options args in defaultMemoize.
    )
  const changeMemoizeMethodSelectorAutotrackWithMemoizeOptions =
    createSelectorAutotrack(
      (state: State) => state.todos,
      todos => todos.map(t => t.id),
      { argsMemoize: defaultMemoize, argsMemoizeOptions: { maxSize: 2 } } // When argsMemoize is changed to defaultMemoize, argsMemoizeOptions can now be the same type as options args in defaultMemoize.
    )
}

function overrideMemoizeAndArgsMemoizeInCreateSelector() {
  const createSelectorMicroMemoize = createSelectorCreator({
    memoize: microMemoize,
    memoizeOptions: { isEqual: (a, b) => a === b },
    argsMemoize: microMemoize,
    argsMemoizeOptions: { isEqual: (a, b) => a === b }
  })
  const selectorMicroMemoize = createSelectorMicroMemoize(
    (state: State) => state.todos,
    todos => todos.map(({ id }) => id)
  )
  expectExactType<number[]>(selectorMicroMemoize(state))
  // @ts-expect-error
  selectorMicroMemoize()
  // Checking existence of fields related to `argsMemoize`
  selectorMicroMemoize.cache
  selectorMicroMemoize.fn()
  selectorMicroMemoize.isMemoized
  selectorMicroMemoize.options
  // @ts-expect-error
  selectorMicroMemoize.clearCache()
  // Checking existence of fields related to `memoize`
  selectorMicroMemoize.memoizedResultFunc.cache
  selectorMicroMemoize.memoizedResultFunc.fn()
  selectorMicroMemoize.memoizedResultFunc.isMemoized
  selectorMicroMemoize.memoizedResultFunc.options
  // @ts-expect-error
  selectorMicroMemoize.memoizedResultFunc.clearCache()
  // Checking existence of fields related to the actual memoized selector
  selectorMicroMemoize.dependencies
  expectExactType<
    [
      (state: State) => {
        id: number
        completed: boolean
      }[]
    ]
  >(selectorMicroMemoize.dependencies)
  expectExactType<number[]>(selectorMicroMemoize.lastResult())
  // @ts-expect-error
  selectorMicroMemoize.memoizedResultFunc()
  expectExactType<number[]>(
    selectorMicroMemoize.memoizedResultFunc([{ id: 0, completed: true }])
  )
  selectorMicroMemoize.recomputations()
  selectorMicroMemoize.resetRecomputations()
  // @ts-expect-error
  selectorMicroMemoize.resultFunc()
  expectExactType<number[]>(
    selectorMicroMemoize.resultFunc([{ id: 0, completed: true }])
  )

  // Checking to see if types dynamically change if memoize or argsMemoize are overridden inside `createSelector`.
  // `microMemoize` was initially passed into `createSelectorCreator`
  // as `memoize` and `argsMemoize`, After overriding them both to `defaultMemoize`,
  // not only does the type for `memoizeOptions` and `argsMemoizeOptions` change to
  // the options parameter of `defaultMemoize`, the output selector fields
  // also change their type to the return type of `defaultMemoize`.
  const selectorMicroMemoizeOverridden = createSelectorMicroMemoize(
    (state: State) => state.todos,
    todos => todos.map(t => t.id),
    {
      memoize: defaultMemoize,
      argsMemoize: defaultMemoize,
      memoizeOptions: { equalityCheck: (a, b) => a === b, maxSize: 2 },
      argsMemoizeOptions: { equalityCheck: (a, b) => a === b, maxSize: 3 }
    }
  )
  expectExactType<number[]>(selectorMicroMemoizeOverridden(state))
  // @ts-expect-error
  selectorMicroMemoizeOverridden()
  // Checking existence of fields related to `argsMemoize`
  selectorMicroMemoizeOverridden.clearCache() // Prior to override, this field did NOT exist.
  // @ts-expect-error Prior to override, this field DID exist.
  selectorMicroMemoizeOverridden.cache
  // @ts-expect-error Prior to override, this field DID exist.
  selectorMicroMemoizeOverridden.fn()
  // @ts-expect-error Prior to override, this field DID exist.
  selectorMicroMemoizeOverridden.isMemoized
  // @ts-expect-error Prior to override, this field DID exist.
  selectorMicroMemoizeOverridden.options
  // Checking existence of fields related to `memoize`
  selectorMicroMemoizeOverridden.memoizedResultFunc.clearCache() // Prior to override, this field did NOT exist.
  // @ts-expect-error Prior to override, this field DID exist.
  selectorMicroMemoizeOverridden.memoizedResultFunc.cache
  // @ts-expect-error Prior to override, this field DID exist.
  selectorMicroMemoizeOverridden.memoizedResultFunc.fn()
  // @ts-expect-error Prior to override, this field DID exist.
  selectorMicroMemoizeOverridden.memoizedResultFunc.isMemoized
  // @ts-expect-error Prior to override, this field DID exist.
  selectorMicroMemoizeOverridden.memoizedResultFunc.options
  // Checking existence of fields related to the actual memoized selector
  expectExactType<
    [
      (state: State) => {
        id: number
        completed: boolean
      }[]
    ]
  >(selectorMicroMemoizeOverridden.dependencies)
  expectExactType<number[]>(
    selectorMicroMemoizeOverridden.memoizedResultFunc([
      { id: 0, completed: true }
    ])
  )
  // @ts-expect-error
  selectorMicroMemoizeOverridden.memoizedResultFunc()
  selectorMicroMemoizeOverridden.recomputations()
  selectorMicroMemoizeOverridden.resetRecomputations()
  // @ts-expect-error
  selectorMicroMemoizeOverridden.resultFunc()
  expectExactType<number[]>(
    selectorMicroMemoizeOverridden.resultFunc([{ id: 0, completed: true }])
  )
  // Making sure the type behavior is consistent when args are passed in as an array.
  const selectorMicroMemoizeOverriddenArray = createSelectorMicroMemoize(
    [(state: State) => state.todos],
    todos => todos.map(({ id }) => id),
    {
      memoize: defaultMemoize,
      argsMemoize: defaultMemoize,
      memoizeOptions: { equalityCheck: (a, b) => a === b, maxSize: 2 },
      argsMemoizeOptions: { equalityCheck: (a, b) => a === b, maxSize: 3 }
    }
  )
  expectExactType<number[]>(selectorMicroMemoizeOverriddenArray(state))
  // @ts-expect-error
  selectorMicroMemoizeOverriddenArray()
  // Checking existence of fields related to `argsMemoize`
  selectorMicroMemoizeOverriddenArray.clearCache() // Prior to override, this field did NOT exist.
  // @ts-expect-error Prior to override, this field DID exist.
  selectorMicroMemoizeOverriddenArray.cache
  // @ts-expect-error Prior to override, this field DID exist.
  selectorMicroMemoizeOverriddenArray.fn()
  // @ts-expect-error Prior to override, this field DID exist.
  selectorMicroMemoizeOverriddenArray.isMemoized
  // @ts-expect-error Prior to override, this field DID exist.
  selectorMicroMemoizeOverriddenArray.options
  // Checking existence of fields related to `memoize`
  selectorMicroMemoizeOverriddenArray.memoizedResultFunc.clearCache() // Prior to override, this field did NOT exist.
  // @ts-expect-error Prior to override, this field DID exist.
  selectorMicroMemoizeOverriddenArray.memoizedResultFunc.cache
  // @ts-expect-error Prior to override, this field DID exist.
  selectorMicroMemoizeOverriddenArray.memoizedResultFunc.fn()
  // @ts-expect-error Prior to override, this field DID exist.
  selectorMicroMemoizeOverriddenArray.memoizedResultFunc.isMemoized
  // @ts-expect-error Prior to override, this field DID exist.
  selectorMicroMemoizeOverriddenArray.memoizedResultFunc.options
  // Checking existence of fields related to the actual memoized selector
  expectExactType<
    [
      (state: State) => {
        id: number
        completed: boolean
      }[]
    ]
  >(selectorMicroMemoizeOverriddenArray.dependencies)
  expectExactType<number[]>(
    selectorMicroMemoizeOverriddenArray.memoizedResultFunc([
      { id: 0, completed: true }
    ])
  )
  // @ts-expect-error
  selectorMicroMemoizeOverriddenArray.memoizedResultFunc()
  selectorMicroMemoizeOverriddenArray.recomputations()
  selectorMicroMemoizeOverriddenArray.resetRecomputations()
  // @ts-expect-error
  selectorMicroMemoizeOverriddenArray.resultFunc()
  expectExactType<number[]>(
    selectorMicroMemoizeOverriddenArray.resultFunc([{ id: 0, completed: true }])
  )
  // Making sure the type of `memoizeOptions` remains the same when only overriding `argsMemoize`
  const selectorMicroMemoizeOverrideArgsMemoizeOnly =
    createSelectorMicroMemoize(
      (state: State) => state.todos,
      todos => todos.map(({ id }) => id),
      {
        argsMemoize: defaultMemoize,
        memoizeOptions: { isPromise: false },
        argsMemoizeOptions: { resultEqualityCheck: (a, b) => a === b }
      }
    )
  expectExactType<number[]>(selectorMicroMemoizeOverrideArgsMemoizeOnly(state))
  // @ts-expect-error
  selectorMicroMemoizeOverrideArgsMemoizeOnly()
  // Checking existence of fields related to `argsMemoize`
  selectorMicroMemoizeOverrideArgsMemoizeOnly.clearCache() // Prior to override, this field did NOT exist.
  // @ts-expect-error Prior to override, this field DID exist.
  selectorMicroMemoizeOverrideArgsMemoizeOnly.cache
  // @ts-expect-error Prior to override, this field DID exist.
  selectorMicroMemoizeOverrideArgsMemoizeOnly.fn()
  // @ts-expect-error Prior to override, this field DID exist.
  selectorMicroMemoizeOverrideArgsMemoizeOnly.isMemoized
  // @ts-expect-error Prior to override, this field DID exist.
  selectorMicroMemoizeOverrideArgsMemoizeOnly.options

  // Checking existence of fields related to `memoize`, these should still be the same.
  selectorMicroMemoizeOverrideArgsMemoizeOnly.memoizedResultFunc.cache
  selectorMicroMemoizeOverrideArgsMemoizeOnly.memoizedResultFunc.fn()
  selectorMicroMemoizeOverrideArgsMemoizeOnly.memoizedResultFunc.isMemoized
  selectorMicroMemoizeOverrideArgsMemoizeOnly.memoizedResultFunc.options
  // @ts-expect-error Note that since we did not override `memoize` in the options object,
  // `memoizedResultFunc.clearCache` is still an invalid field access.
  selectorMicroMemoizeOverrideArgsMemoizeOnly.memoizedResultFunc.clearCache()
  // Checking existence of fields related to the actual memoized selector
  expectExactType<
    [
      (state: State) => {
        id: number
        completed: boolean
      }[]
    ]
  >(selectorMicroMemoizeOverrideArgsMemoizeOnly.dependencies)
  expectExactType<number[]>(
    selectorMicroMemoizeOverrideArgsMemoizeOnly.lastResult()
  )
  expectExactType<number[]>(
    selectorMicroMemoizeOverrideArgsMemoizeOnly.memoizedResultFunc([
      { id: 0, completed: true }
    ])
  )
  // @ts-expect-error
  selectorMicroMemoizeOverrideArgsMemoizeOnly.memoizedResultFunc()
  selectorMicroMemoizeOverrideArgsMemoizeOnly.recomputations()
  selectorMicroMemoizeOverrideArgsMemoizeOnly.resetRecomputations()
  // @ts-expect-error
  selectorMicroMemoizeOverrideArgsMemoizeOnly.resultFunc()
  expectExactType<number[]>(
    selectorMicroMemoizeOverrideArgsMemoizeOnly.resultFunc([
      { id: 0, completed: true }
    ])
  )

  const selectorMicroMemoizeOverrideMemoizeOnly = createSelectorMicroMemoize(
    (state: State) => state.todos,
    todos => todos.map(t => t.id),
    {
      memoize: defaultMemoize,
      memoizeOptions: { resultEqualityCheck: (a, b) => a === b }
    }
  )
  expectExactType<number[]>(selectorMicroMemoizeOverrideMemoizeOnly(state))
  // @ts-expect-error
  selectorMicroMemoizeOverrideMemoizeOnly()

  // Checking existence of fields related to `argsMemoize`
  selectorMicroMemoizeOverrideMemoizeOnly.cache
  selectorMicroMemoizeOverrideMemoizeOnly.fn
  selectorMicroMemoizeOverrideMemoizeOnly.isMemoized
  selectorMicroMemoizeOverrideMemoizeOnly.options
  // @ts-expect-error Note that since we did not override `argsMemoize` in the options object,
  // `selector.clearCache` is still an invalid field access.
  selectorMicroMemoizeOverrideMemoizeOnly.clearCache()

  // Checking existence of fields related to `memoize`
  // @ts-expect-error Prior to override, this field DID exist.
  selectorMicroMemoizeOverrideMemoizeOnly.memoizedResultFunc.cache
  // @ts-expect-error Prior to override, this field DID exist.
  selectorMicroMemoizeOverrideMemoizeOnly.memoizedResultFunc.fn()
  // @ts-expect-error Prior to override, this field DID exist.
  selectorMicroMemoizeOverrideMemoizeOnly.memoizedResultFunc.isMemoized
  // @ts-expect-error Prior to override, this field DID exist.
  selectorMicroMemoizeOverrideMemoizeOnly.memoizedResultFunc.options
  selectorMicroMemoizeOverrideMemoizeOnly.memoizedResultFunc.clearCache() // Prior to override, this field did NOT exist.

  // Checking existence of fields related to the actual memoized selector
  expectExactType<
    [
      (state: State) => {
        id: number
        completed: boolean
      }[]
    ]
  >(selectorMicroMemoizeOverrideMemoizeOnly.dependencies)
  expectExactType<number[]>(
    selectorMicroMemoizeOverrideMemoizeOnly.lastResult()
  )
  expectExactType<number[]>(
    selectorMicroMemoizeOverrideMemoizeOnly.memoizedResultFunc([
      { id: 0, completed: true }
    ])
  )
  // @ts-expect-error
  selectorMicroMemoizeOverrideMemoizeOnly.memoizedResultFunc()
  selectorMicroMemoizeOverrideMemoizeOnly.recomputations()
  selectorMicroMemoizeOverrideMemoizeOnly.resetRecomputations()
  // @ts-expect-error
  selectorMicroMemoizeOverrideMemoizeOnly.resultFunc()
  expectExactType<number[]>(
    selectorMicroMemoizeOverrideMemoizeOnly.resultFunc([
      { id: 0, completed: true }
    ])
  )

  // @ts-expect-error Since `argsMemoize` is set to `defaultMemoize`,
  // `argsMemoizeOptions` must match the options object parameter of `defaultMemoize`
  const selectorMicroMemoizePartiallyOverridden = createSelectorMicroMemoize(
    (state: State) => state.todos,
    // @ts-expect-error
    todos => todos.map(t => t.id),
    {
      memoize: defaultMemoize,
      argsMemoize: defaultMemoize,
      memoizeOptions: {
        // @ts-expect-error
        equalityCheck: (a, b) => a === b,
        maxSize: 2
      },
      argsMemoizeOptions: { isPromise: false } // This field causes a type error since it does not match the options param of `defaultMemoize`.
    }
  )

  const selectorDefaultParametric = createSelector(
    (state: State, id: number) => id,
    (state: State) => state.todos,
    (id, todos) => todos.filter(todo => todo.id === id),
    {
      argsMemoize: microMemoize,
      inputStabilityCheck: 'never',
      memoize: memoizeOne,
      memoizeOptions: [(a, b) => a === b]
    }
  )
  expectExactType<
    {
      id: number
      completed: boolean
    }[]
  >(selectorDefaultParametric(state, 0))
  expectExactType<
    {
      id: number
      completed: boolean
    }[]
  >(selectorDefaultParametric(state, 1))
  // @ts-expect-error
  selectorDefaultParametric(state)
  // @ts-expect-error
  selectorDefaultParametric(1)
  // @ts-expect-error
  selectorDefaultParametric(state, '')
  // @ts-expect-error
  selectorDefaultParametric(state, 1, 1)
  // Checking existence of fields related to `argsMemoize`
  // Prior to override, this field did NOT exist.
  selectorDefaultParametric.cache
  // Prior to override, this field did NOT exist.
  selectorDefaultParametric.fn
  // Prior to override, this field did NOT exist.
  selectorDefaultParametric.isMemoized
  // Prior to override, this field did NOT exist.
  selectorDefaultParametric.options
  // @ts-expect-error Prior to override, this field DID exist.
  selectorDefaultParametric.clearCache()

  // Checking existence of fields related to `memoize`
  // @ts-expect-error Prior to override, this field DID exist.
  selectorDefaultParametric.memoizedResultFunc.clearCache()
  // Prior to override, this field did NOT exist.
  selectorDefaultParametric.memoizedResultFunc.clear()

  // Checking existence of fields related to the actual memoized selector
  expectExactType<
    [
      (state: State, id: number) => number,
      (state: State) => { id: number; completed: boolean }[]
    ]
  >(selectorDefaultParametric.dependencies)
  expectExactType<{ id: number; completed: boolean }[]>(
    selectorDefaultParametric.lastResult()
  )
  expectExactType<{ id: number; completed: boolean }[]>(
    selectorDefaultParametric.memoizedResultFunc(0, [
      { id: 0, completed: true }
    ])
  )
  // @ts-expect-error
  selectorDefaultParametric.memoizedResultFunc()
  selectorDefaultParametric.recomputations()
  selectorDefaultParametric.resetRecomputations()
  // @ts-expect-error
  selectorDefaultParametric.resultFunc()
  expectExactType<{ id: number; completed: boolean }[]>(
    selectorDefaultParametric.resultFunc(0, [{ id: 0, completed: true }])
  )
}

function memoizeAndArgsMemoizeInCreateSelectorCreator() {
  // If we don't pass in `argsMemoize`, the type for `argsMemoizeOptions`
  // falls back to the options parameter of `defaultMemoize`.
  const createSelectorArgsMemoizeOptionsFallbackToDefault =
    createSelectorCreator({
      memoize: microMemoize,
      memoizeOptions: [{ isPromise: false }],
      argsMemoizeOptions: { resultEqualityCheck: (a, b) => a === b }
    })
  const selectorMicroMemoizeArgsMemoizeOptionsFallbackToDefault =
    createSelectorArgsMemoizeOptionsFallbackToDefault(
      (state: State) => state.todos,
      todos => todos.map(({ id }) => id)
    )
  expectExactType<number[]>(
    selectorMicroMemoizeArgsMemoizeOptionsFallbackToDefault(state)
  )
  // @ts-expect-error
  selectorMicroMemoizeArgsMemoizeOptionsFallbackToDefault()
  selectorMicroMemoizeArgsMemoizeOptionsFallbackToDefault.clearCache()
  // @ts-expect-error
  selectorMicroMemoizeArgsMemoizeOptionsFallbackToDefault.cache
  // @ts-expect-error
  selectorMicroMemoizeArgsMemoizeOptionsFallbackToDefault.fn
  // @ts-expect-error
  selectorMicroMemoizeArgsMemoizeOptionsFallbackToDefault.isMemoized
  // @ts-expect-error
  selectorMicroMemoizeArgsMemoizeOptionsFallbackToDefault.options
  // Checking existence of fields related to `memoize`
  selectorMicroMemoizeArgsMemoizeOptionsFallbackToDefault.memoizedResultFunc
    .cache
  selectorMicroMemoizeArgsMemoizeOptionsFallbackToDefault.memoizedResultFunc.fn()
  selectorMicroMemoizeArgsMemoizeOptionsFallbackToDefault.memoizedResultFunc
    .isMemoized
  selectorMicroMemoizeArgsMemoizeOptionsFallbackToDefault.memoizedResultFunc
    .options
  // @ts-expect-error
  selectorMicroMemoizeArgsMemoizeOptionsFallbackToDefault.memoizedResultFunc.clearCache()
  // Checking existence of fields related to the actual memoized selector
  expectExactType<
    [
      (state: State) => {
        id: number
        completed: boolean
      }[]
    ]
  >(selectorMicroMemoizeArgsMemoizeOptionsFallbackToDefault.dependencies)
  expectExactType<number[]>(
    selectorMicroMemoizeArgsMemoizeOptionsFallbackToDefault.lastResult()
  )
  expectExactType<number[]>(
    selectorMicroMemoizeArgsMemoizeOptionsFallbackToDefault.memoizedResultFunc([
      { id: 0, completed: true }
    ])
  )
  // @ts-expect-error
  selectorMicroMemoizeArgsMemoizeOptionsFallbackToDefault.memoizedResultFunc()
  selectorMicroMemoizeArgsMemoizeOptionsFallbackToDefault.recomputations()
  selectorMicroMemoizeArgsMemoizeOptionsFallbackToDefault.resetRecomputations()
  // @ts-expect-error
  selectorMicroMemoizeArgsMemoizeOptionsFallbackToDefault.resultFunc()
  expectExactType<number[]>(
    selectorMicroMemoizeArgsMemoizeOptionsFallbackToDefault.resultFunc([
      { id: 0, completed: true }
    ])
  )

  const createSelectorWithWrongArgsMemoizeOptions =
    // @ts-expect-error If we don't pass in `argsMemoize`, the type for `argsMemoizeOptions` falls back to the options parameter of `defaultMemoize`.
    createSelectorCreator({
      memoize: microMemoize,
      memoizeOptions: { isEqual: (a, b) => a === b },
      // @ts-expect-error
      argsMemoizeOptions: { isEqual: (a, b) => a === b }
    })

  // When passing in an options object as the first argument, there should be no other arguments.
  const createSelectorWrong = createSelectorCreator(
    {
      // @ts-expect-error
      memoize: microMemoize,
      // @ts-expect-error
      memoizeOptions: { isEqual: (a, b) => a === b },
      // @ts-expect-error
      argsMemoizeOptions: { equalityCheck: (a, b) => a === b }
    },
    [] // This causes the error.
  )
}
