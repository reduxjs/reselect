export function createSelectorCreator(memoize = internalMemoize) {
    return (...selectors) => {
        const memoizedResultFunc = memoize(selectors.pop());
        if (Array.isArray(selectors[0])) {
            selectors = selectors[0];
        }
        return state => {
            const params = selectors.map(selector => selector(state));
            return memoizedResultFunc(params);
        }
    };
}

export function createSelector(...args) {
    return createSelectorCreator(internalMemoize)(...args);
}

function defaultShouldUpdate(a, b) {
    return a === b;
}

export function createMemoize(shouldUpdate = defaultShouldUpdate) {
    return func => internalMemoize(func, shouldUpdate);
}

// TODO: Reintroduce comment, slightly rewritten
function internalMemoize(func, shouldUpdate = defaultShouldUpdate) {
    let lastArgs = null;
    let lastResult = null;
    return (args) => {
        if (lastArgs !== null &&
            args.every((value, index) => shouldUpdate(value, lastArgs[index]))) {
            return lastResult;
        }
        lastArgs = args;
        lastResult = func(...args);
        return lastResult;
    }
}
