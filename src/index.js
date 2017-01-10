function defaultEqualityCheck(a, b) {
  return a === b
}

export function defaultMemoize(func, equalityCheck = defaultEqualityCheck, cacheSize=1) {

  let cacheArgsArr = []     // Cache store of old argument arrays
  let cacheResultArr = []  // Cache store of old results

  const memoizedResultFunc = (...args) => {
    let foundIdx = -1
    const oldCacheResultArr = cacheResultArr
    const isFound = cacheArgsArr.some( (oldArgArr,idx)=>{
      if( oldArgArr.length !== args.length ) {
        return false
      }

      if( oldArgArr.every( (value,i) => equalityCheck(args[i],value) )) {
        foundIdx = idx
      }

      return foundIdx > -1
    })

    // console.log( 'foundIdx: ' + foundIdx )
    let result
    if( isFound ) {
      cacheArgsArr = [
        args,
        ...cacheArgsArr.slice( 0, foundIdx ),
        ...cacheArgsArr.slice( foundIdx+1, cacheSize )
      ]
      cacheResultArr = [
        cacheResultArr[foundIdx],
        ...cacheResultArr.slice( 0, foundIdx ),
        ...cacheResultArr.slice( foundIdx+1, cacheSize )
      ]
      result = cacheResultArr[0]

    } else if( ! isFound ) {

      result = func(...args)
      cacheArgsArr = [ args, ...cacheArgsArr.slice( 0, cacheSize-1 ) ]
      cacheResultArr = [ result, ...cacheResultArr.slice( 0, cacheSize-1 ) ]
      result = cacheResultArr[0]
    }

    if( oldCacheResultArr !== cacheResultArr ) {
      // console.log( 'updated cache:' )
      // console.log( cacheArgsArr )
      // console.log( cacheResultArr )
    }

    return result
  }

  memoizedResultFunc.getCacheArgsArr = ()=> cacheArgsArr
  memoizedResultFunc.getCacheResultArr = ()=> cacheResultArr
  memoizedResultFunc.clearCache = ()=> {
    cacheArgsArr = []
    cacheResultArr = []
  }
  return memoizedResultFunc
}


function getDependencies(funcs) {
  const dependencies = Array.isArray(funcs[0]) ? funcs[0] : funcs

  if (!dependencies.every(dep => typeof dep === 'function')) {
    const dependencyTypes = dependencies.map(
      dep => typeof dep
    ).join(', ')
    throw new Error(
      `Selector creators expect all input-selectors to be functions, ` +
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
      (...args) => {
        recomputations++
        return resultFunc(...args)
      },
      ...memoizeOptions
    )

    const selector = (state, props, ...args) => {
      const params = dependencies.map(
        dependency => dependency(state, props, ...args)
      )
      return memoizedResultFunc(...params)
    }

    selector.resultFunc = resultFunc
    selector.recomputations = () => recomputations
    selector.resetRecomputations = () => recomputations = 0
    selector.getCacheArgsArr = () => memoizedResultFunc.getCacheArgsArr()
    selector.getCacheResultArr = () => memoizedResultFunc.getCacheResultArr()
    selector.clearCache = () => memoizedResultFunc.clearCache()
    return selector
  }
}

export const createSelector = createSelectorCreator(defaultMemoize)

export function createStructuredSelector(selectors, selectorCreator = createSelector) {
  if (typeof selectors !== 'object') {
    throw new Error(
      `createStructuredSelector expects first argument to be an object ` +
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
