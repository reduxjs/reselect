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
    };
}

export function createSelectorCreator(memoize, ...memoizeOptions) {
    return (...selectors) => {
        const memoizedResultFunc = memoize(selectors.pop(), ...memoizeOptions);
        const dependencies = Array.isArray(selectors[0]) ?
            selectors[0] : selectors;
        return (state, props) => {
            const params = dependencies.map(dependency => dependency(state, props));
            return memoizedResultFunc(...params, props);
        };
    };
}

export function createSelector(...args) {
    return createSelectorCreator(defaultMemoize)(...args);
}
