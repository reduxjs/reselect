function defaultValuesEqual(a, b) {
    return a === b;
}

// TODO: Reintroduce comment, slightly rewritten
export function defaultMemoize(func, valuesEqual = defaultValuesEqual) {
    let lastArgs = null;
    let lastResult = null;
    return (...args) => {
        if (lastArgs !== null &&
            args.every((value, index) => valuesEqual(value, lastArgs[index]))) {
            return lastResult;
        }
        lastArgs = args;
        lastResult = func(...args);
        return lastResult;
    };
}

export function createSelectorCreator(memoize, ...memoizeOptions) {
    return (...selectors) => {
        const memoizedResultFunc = memoize(selectors.pop(), ...memoizeOptions);
        const dependencies = Array.isArray(selectors[0]) ?
            selectors[0] : selectors;
        return (state, props, ...args) => {
            const params = dependencies.map(
                dependency => dependency(state, props, ...args)
            );
            return memoizedResultFunc(...params);
        };
    };
}

export function createSelector(...args) {
    return createSelectorCreator(defaultMemoize)(...args);
}
