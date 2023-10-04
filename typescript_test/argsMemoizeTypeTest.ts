import microMemoize from 'micro-memoize'
import { createSelectorCreator, defaultMemoize } from '../src/index'

function testArgsMemoizeInCreateSelectorCreatorDoneCorrectly() {
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

  const createSelectorMicroMemoize = createSelectorCreator({
    memoize: microMemoize,
    memoizeOptions: { isEqual: (a, b) => a === b },
    argsMemoize: microMemoize,
    argsMemoizeOptions: { isEqual: (a, b) => a === b }
  })
  const selectorMicroMemoize = createSelectorMicroMemoize(
    (state: State) => state.todos,
    todos => todos.map(t => t.id)
  )
  selectorMicroMemoize(state)
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
  selectorMicroMemoize.lastResult()
  selectorMicroMemoize.memoizedResultFunc([{ id: 0, completed: true }])
  // @ts-expect-error
  selectorMicroMemoize.memoizedResultFunc()
  selectorMicroMemoize.recomputations()
  selectorMicroMemoize.resetRecomputations()
  // @ts-expect-error
  selectorMicroMemoize.resultFunc()
  selectorMicroMemoize.resultFunc([{ id: 0, completed: true }])

  // Checking to see if types dynamically change if memoize or argsMemoize or overridden inside `createSelector`
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
  selectorMicroMemoizeOverridden(state)
  // @ts-expect-error
  selectorMicroMemoizeOverridden()
  // Checking existence of fields related to `argsMemoize`
  selectorMicroMemoizeOverridden.clearCache()
  // @ts-expect-error
  selectorMicroMemoizeOverridden.cache
  // @ts-expect-error
  selectorMicroMemoizeOverridden.fn()
  // @ts-expect-error
  selectorMicroMemoizeOverridden.isMemoized
  // @ts-expect-error
  selectorMicroMemoizeOverridden.options
  // Checking existence of fields related to `memoize`
  selectorMicroMemoizeOverridden.memoizedResultFunc.clearCache()
  // @ts-expect-error
  selectorMicroMemoizeOverridden.memoizedResultFunc.cache
  // @ts-expect-error
  selectorMicroMemoizeOverridden.memoizedResultFunc.fn()
  // @ts-expect-error
  selectorMicroMemoizeOverridden.memoizedResultFunc.isMemoized
  // @ts-expect-error
  selectorMicroMemoizeOverridden.memoizedResultFunc.options
  // Checking existence of fields related to the actual memoized selector
  selectorMicroMemoizeOverridden.dependencies
  selectorMicroMemoizeOverridden.lastResult()
  selectorMicroMemoizeOverridden.memoizedResultFunc([
    { id: 0, completed: true }
  ])
  // @ts-expect-error
  selectorMicroMemoizeOverridden.memoizedResultFunc()
  selectorMicroMemoizeOverridden.recomputations()
  selectorMicroMemoizeOverridden.resetRecomputations()
  // @ts-expect-error
  selectorMicroMemoizeOverridden.resultFunc()
  selectorMicroMemoizeOverridden.resultFunc([{ id: 0, completed: true }])

  const selectorMicroMemoizeOverrideArgsMemoizeOnly =
    createSelectorMicroMemoize(
      (state: State) => state.todos,
      todos => todos.map(t => t.id),
      {
        argsMemoize: defaultMemoize,
        argsMemoizeOptions: { resultEqualityCheck: (a, b) => a === b }
      }
    )
  selectorMicroMemoizeOverrideArgsMemoizeOnly(state)
  // @ts-expect-error
  selectorMicroMemoizeOverrideArgsMemoizeOnly()
  // Checking existence of fields related to `argsMemoize`
  selectorMicroMemoizeOverrideArgsMemoizeOnly.clearCache()
  // @ts-expect-error
  selectorMicroMemoizeOverrideArgsMemoizeOnly.cache
  // @ts-expect-error
  selectorMicroMemoizeOverrideArgsMemoizeOnly.fn()
  // @ts-expect-error
  selectorMicroMemoizeOverrideArgsMemoizeOnly.isMemoized
  // @ts-expect-error
  selectorMicroMemoizeOverrideArgsMemoizeOnly.options
  // Checking existence of fields related to `memoize`
  // @ts-expect-error Note that since we did not override `memoize` in the options object,
  // memoizedResultFunc.clearCache becomes an invalid field access, and we get `cache`, `fn`, `isMemoized` and `options` instead.
  selectorMicroMemoizeOverrideArgsMemoizeOnly.memoizedResultFunc.clearCache()
  selectorMicroMemoizeOverrideArgsMemoizeOnly.memoizedResultFunc.cache
  selectorMicroMemoizeOverrideArgsMemoizeOnly.memoizedResultFunc.fn()
  selectorMicroMemoizeOverrideArgsMemoizeOnly.memoizedResultFunc.isMemoized
  selectorMicroMemoizeOverrideArgsMemoizeOnly.memoizedResultFunc.options
  // Checking existence of fields related to the actual memoized selector
  selectorMicroMemoizeOverrideArgsMemoizeOnly.dependencies
  selectorMicroMemoizeOverrideArgsMemoizeOnly.lastResult()
  selectorMicroMemoizeOverrideArgsMemoizeOnly.memoizedResultFunc([
    { id: 0, completed: true }
  ])
  // @ts-expect-error
  selectorMicroMemoizeOverrideArgsMemoizeOnly.memoizedResultFunc()
  selectorMicroMemoizeOverrideArgsMemoizeOnly.recomputations()
  selectorMicroMemoizeOverrideArgsMemoizeOnly.resetRecomputations()
  // @ts-expect-error
  selectorMicroMemoizeOverrideArgsMemoizeOnly.resultFunc()
  selectorMicroMemoizeOverrideArgsMemoizeOnly.resultFunc([
    { id: 0, completed: true }
  ])

  const selectorMicroMemoizeOverrideMemoizeOnly = createSelectorMicroMemoize(
    (state: State) => state.todos,
    todos => todos.map(t => t.id),
    {
      memoize: defaultMemoize,
      memoizeOptions: { resultEqualityCheck: (a, b) => a === b }
    }
  )
  selectorMicroMemoizeOverrideMemoizeOnly(state)
  // @ts-expect-error
  selectorMicroMemoizeOverrideMemoizeOnly()
  // Checking existence of fields related to `argsMemoize`
  // @ts-expect-error Note that since we did not override `argsMemoize` in the options object,
  // selector.clearCache becomes an invalid field access, and we get `cache`, `fn`, `isMemoized` and `options` instead.
  selectorMicroMemoizeOverrideMemoizeOnly.clearCache()
  selectorMicroMemoizeOverrideMemoizeOnly.cache
  selectorMicroMemoizeOverrideMemoizeOnly.fn
  selectorMicroMemoizeOverrideMemoizeOnly.isMemoized
  selectorMicroMemoizeOverrideMemoizeOnly.options
  // Checking existence of fields related to `memoize`
  // @ts-expect-error
  selectorMicroMemoizeOverrideMemoizeOnly.memoizedResultFunc.cache
  // @ts-expect-error
  selectorMicroMemoizeOverrideMemoizeOnly.memoizedResultFunc.fn()
  // @ts-expect-error
  selectorMicroMemoizeOverrideMemoizeOnly.memoizedResultFunc.isMemoized
  // @ts-expect-error
  selectorMicroMemoizeOverrideMemoizeOnly.memoizedResultFunc.options
  selectorMicroMemoizeOverrideMemoizeOnly.memoizedResultFunc.clearCache()
  // Checking existence of fields related to the actual memoized selector
  selectorMicroMemoizeOverrideMemoizeOnly.dependencies
  selectorMicroMemoizeOverrideMemoizeOnly.lastResult()
  selectorMicroMemoizeOverrideMemoizeOnly.memoizedResultFunc([
    { id: 0, completed: true }
  ])
  // @ts-expect-error
  selectorMicroMemoizeOverrideMemoizeOnly.memoizedResultFunc()
  selectorMicroMemoizeOverrideMemoizeOnly.recomputations()
  selectorMicroMemoizeOverrideMemoizeOnly.resetRecomputations()
  // @ts-expect-error
  selectorMicroMemoizeOverrideMemoizeOnly.resultFunc()
  selectorMicroMemoizeOverrideMemoizeOnly.resultFunc([
    { id: 0, completed: true }
  ])
  // If we don't pass in `argsMemoize`, the type for `argsMemoizeOptions` falls back to the options parameter of `defaultMemoize`.
  const createSelectorMicroMemoizeArgsMemoizeOptionsFallbackToDefault =
    createSelectorCreator({
      memoize: microMemoize,
      memoizeOptions: { isPromise: false },
      argsMemoizeOptions: { resultEqualityCheck: (a, b) => a === b }
    })
  const selectorMicroMemoizeArgsMemoizeOptionsFallbackToDefault =
    createSelectorMicroMemoizeArgsMemoizeOptionsFallbackToDefault(
      (state: State) => state.todos,
      todos => todos.map(t => t.id)
    )
  selectorMicroMemoizeArgsMemoizeOptionsFallbackToDefault(state)
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
  selectorMicroMemoizeArgsMemoizeOptionsFallbackToDefault.dependencies
  selectorMicroMemoizeArgsMemoizeOptionsFallbackToDefault.lastResult()
  selectorMicroMemoizeArgsMemoizeOptionsFallbackToDefault.memoizedResultFunc([
    { id: 0, completed: true }
  ])
  // @ts-expect-error
  selectorMicroMemoizeArgsMemoizeOptionsFallbackToDefault.memoizedResultFunc()
  selectorMicroMemoizeArgsMemoizeOptionsFallbackToDefault.recomputations()
  selectorMicroMemoizeArgsMemoizeOptionsFallbackToDefault.resetRecomputations()
  // @ts-expect-error
  selectorMicroMemoizeArgsMemoizeOptionsFallbackToDefault.resultFunc()
  selectorMicroMemoizeArgsMemoizeOptionsFallbackToDefault.resultFunc([
    { id: 0, completed: true }
  ])
}

function testArgsMemoizeInCreateSelectorCreatorDoneWrong() {
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

  const createSelectorMicroMemoize = createSelectorCreator({
    memoize: microMemoize,
    memoizeOptions: { isPromise: false },
    argsMemoize: microMemoize,
    argsMemoizeOptions: { isEqual: (a, b) => a === b }
  })

  const createSelectorMicroMemoizeArgsMemoizeOptionsFallbackToDefaultError =
    // @ts-expect-error If we don't pass in `argsMemoize`, the type for `argsMemoizeOptions` falls back to the options parameter of `defaultMemoize`.
    createSelectorCreator({
      memoize: microMemoize,
      memoizeOptions: { isEqual: (a, b) => a === b },
      // @ts-expect-error
      argsMemoizeOptions: { isEqual: (a, b) => a === b }
    })

  // @ts-expect-error Since `argsMemoize` is set to `defaultMemoize`, `argsMemoizeOptions` must match the options object parameter of `defaultMemoize`
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
}
