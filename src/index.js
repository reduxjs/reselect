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

export function createSelectorCreator(memoize = defaultMemoize, ...memoizeOptions) {
    return (...dependencies) => {
        const memoizedResultFunc = memoize(dependencies.pop(), ...memoizeOptions);
        const selectors = Array.isArray(dependencies[0]) ?
            dependencies[0] : dependencies;
        return (state, props) => {
            const params = selectors.map(selector => selector(state, props));
            return memoizedResultFunc(...params, props);
        };
    };
}

export function createSelector(...args) {
    return createSelectorCreator(defaultMemoize)(...args);
}

