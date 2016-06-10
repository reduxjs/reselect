function defaultEqualityCheck(a, b) {
  return a === b
}

export function defaultMemoize(func, equalityCheck = defaultEqualityCheck) {
  let lastArgs = null
  let lastResult = null
  return (...args) => {
    if (
      lastArgs !== null &&
      lastArgs.length === args.length &&
      args.every((value, index) => equalityCheck(value, lastArgs[index]))
    ) {
      return lastResult
    }
    const veryLastArgs = lastArgs || [];
    lastArgs = args
    lastResult = func(...args, ...veryLastArgs, lastResult))
    return lastResult
  }
}
/*
test('Test returning previous state', () => { 
  const selector = createSelector(
    [ state => state.a, state => state.b ],
    (a, b, _a, _b, previous) => { 
        console.log('RUN...')
        console.log('current a', a);
        console.log('previous _a', _a);
        console.log('current b', b);
        console.log('previous _b', _b);
        console.log('previous result', previous);
      return { c: a + b }
    }
  )
})

//Sample OUTPUT
RUN...
a 1
_a undefined
b 2
_b undefined
undefined

RUN...
a 3
_a 1
b 2
_b 2
{ c: 3 }
*/

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
    return selector
  }
}

export function createSelector(...args) {
  return createSelectorCreator(defaultMemoize)(...args)
}

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
