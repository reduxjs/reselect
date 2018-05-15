export function defaultEqualityCheck(a, b) {
  return a === b
}

function areArgumentsShallowlyEqual(equalityCheck, prev, next) {
  if (prev === null || next === null || prev.length !== next.length) {
    return false
  }

  // Do this in a for loop (and not a `forEach` or an `every`) so we can determine equality as fast as possible.
  const length = prev.length
  for (let i = 0; i < length; i++) {
    if (!equalityCheck(prev[i], next[i])) {
      return false
    }
  }

  return true
}

export function defaultMemoize(func, equalityCheck = defaultEqualityCheck, cacheSize = 1) {
  if (cacheSize < 1) throw new Error('cacheSize must be greater than zero!')

  let argsArr, resultsArr, resultsLength, lastIndex, endIndex, lastCacheHitIndex, i, j

  const clearCache = () => {
    argsArr = []
    resultsArr = []
    for (i = 0; i < cacheSize; i++) {
      // Must set to null for the test in areArgumentsShallowlyEqual.
      argsArr[i] = null
      resultsArr[i] = null
    }
    resultsLength = 0
    lastIndex = cacheSize
    endIndex = cacheSize
    lastCacheHitIndex = cacheSize - 1
  }
  clearCache()

  // we reference arguments instead of spreading them for performance reasons
  const memoizedResultFunc = function () {
    // Check the most recent cache hit first
    if (areArgumentsShallowlyEqual(equalityCheck, argsArr[lastCacheHitIndex], arguments)) {
      argsArr[lastCacheHitIndex] = arguments
      return resultsArr[lastCacheHitIndex]
    }

    // Search from newest to oldest, skipping the last cache hit
    for (i = lastIndex; i < endIndex; i++) {
      if (i === lastCacheHitIndex) continue

      // Use modulus to cycle through the array
      j = i % cacheSize
      if (areArgumentsShallowlyEqual(equalityCheck, argsArr[j], arguments)) {
        lastCacheHitIndex = j
        argsArr[j] = arguments
        return resultsArr[j]
      }
    }

    if (lastIndex === 0) {
      lastIndex = cacheSize - 1
    } else {
      if (resultsLength < cacheSize) resultsLength++
      lastIndex--
    }
    endIndex = lastIndex + resultsLength
    lastCacheHitIndex = lastIndex

    // Apply arguments instead of spreading for performance.
    resultsArr[lastIndex] = func.apply(null, arguments)

    // Must set arguments after result, in case result func throws an error.
    argsArr[lastIndex] = arguments

    return resultsArr[lastIndex]
  }

  memoizedResultFunc.getArgsArr = () => argsArr
  memoizedResultFunc.getResultsArr = () => resultsArr
  memoizedResultFunc.getLastIndex = () => lastIndex
  memoizedResultFunc.getLastCacheHitIndex = () => lastCacheHitIndex
  memoizedResultFunc.getResultsLength = () => resultsLength
  memoizedResultFunc.clearCache = clearCache

  return memoizedResultFunc
}

function getDependencies(funcs) {
  const dependencies = Array.isArray(funcs[0]) ? funcs[0] : funcs

  if (!dependencies.every(dep => typeof dep === 'function')) {
    const dependencyTypes = dependencies.map(
      dep => typeof dep
    ).join(', ')
    throw new Error(
      'Selector creators expect all input-selectors to be functions, ' +
      `instead received the following types: [${dependencyTypes}]`
    )
  }

  return dependencies
}

export function createSelectorCreator(memoize, ...memoizeOptions) {
  return (...funcs) => {
    let recomputations = 0
    const resultFunc = funcs.pop()
    const dependencies = getDependencies(funcs)

    const memoizedResultFunc = memoize(
      function () {
        recomputations++
        // apply arguments instead of spreading for performance.
        return resultFunc.apply(null, arguments)
      },
      ...memoizeOptions
    )

    // If a selector is called with the exact same arguments we don't need to traverse our dependencies again.
    const selector = defaultMemoize(function () {
      const params = []
      const length = dependencies.length

      for (let i = 0; i < length; i++) {
        // apply arguments instead of spreading and mutate a local list of params for performance.
        params.push(dependencies[i].apply(null, arguments))
      }

      // apply arguments instead of spreading for performance.
      return memoizedResultFunc.apply(null, params)
    })

    selector.resultFunc = resultFunc
    selector.memoizedResultFunc = memoizedResultFunc
    if (typeof memoizedResultFunc.clearCache === 'function')
      selector.clearCache = memoizedResultFunc.clearCache
    selector.recomputations = () => recomputations
    selector.resetRecomputations = () => { recomputations = 0 }
    return selector
  }
}

export const createSelector = createSelectorCreator(defaultMemoize)
export const createSelectorWithCacheSize = (cacheSize, ...args) => (
  createSelectorCreator(defaultMemoize, defaultEqualityCheck, cacheSize)
)(...args)

export function createStructuredSelector(selectors, selectorCreator = createSelector) {
  if (typeof selectors !== 'object') {
    throw new Error(
      'createStructuredSelector expects first argument to be an object ' +
      `where each property is a selector, instead received a ${typeof selectors}`
    )
  }
  const objectKeys = Object.keys(selectors)
  return selectorCreator(
    objectKeys.map(key => selectors[key]),
    (...values) => {
      return values.reduce((composition, value, index) => {
        composition[objectKeys[index]] = value
        return composition
      }, {})
    }
  )
}
