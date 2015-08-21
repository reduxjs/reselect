export function createSelectorCreator(memoize = defaultMemoize, ...memoizeOptions) {
    return (...selectors) => {
        const memoizedResultFunc = memoize(selectors.pop(), ...memoizeOptions);
        if (Array.isArray(selectors[0])) {
            selectors = selectors[0];
        }
        return (state, props) => {
            const params = selectors.map(selector => selector(state, props));
            return memoizedResultFunc(...params, props);
        }
    };
}

export function createSelector(...args) {
    return createSelectorCreator(defaultMemoize)(...args);
}

function defaultValuesEqual(a, b) {
    return a === b;
}

// TODO: Reintroduce comment, slightly rewritten
export function defaultMemoize(func, valuesEqual = defaultValuesEqual) {
    let lastArgs = null;
    let lastResult = null;
    return (...args) => {
        const props = args.pop();
        if (lastArgs !== null &&
            args.every((value, index) => valuesEqual(value, lastArgs[index]))) {
            return lastResult;
        }
        lastArgs = args;
        lastResult = func(...args, props);
        return lastResult;
    }
}
