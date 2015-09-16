function defaultEqualityCheck(a, b) {
    return a === b;
}

export function defaultMemoize(func, equalityCheck = defaultEqualityCheck) {
    let lastArgs = null;
    let lastResult = null;
    return (...args) => {
        if (lastArgs !== null &&
            args.every((value, index) => equalityCheck(value, lastArgs[index]))) {
            return lastResult;
        }
        lastArgs = args;
        lastResult = func(...args);
        return lastResult;
    };
}

export function createSelectorCreator(memoize, ...memoizeOptions) {
    return (...funcs) => {
        let recomputations = 0;
        const resultFunc = funcs.pop();
        const dependencies = Array.isArray(funcs[0]) ? funcs[0] : funcs;

        const memoizedResultFunc = memoize(
            (...args) => {
                recomputations++;
                return resultFunc(...args);
            },
            ...memoizeOptions
        );

        const selector = (state, props, ...args) => {
            const params = dependencies.map(
                dependency => dependency(state, props, ...args)
            );
            return memoizedResultFunc(...params);
        };

        selector.recomputations = () => recomputations;
        return selector;
    };
}

export function createSelector(...args) {
    return createSelectorCreator(defaultMemoize)(...args);
}

export function createStructuredSelector( selectors, selectorCreator = createSelector ) {
	 let objectKeys = Object.keys(selectors);
    return selectorCreator(
       objectKeys.map( (key) => {
           return selectors[key];
		 }),
       (...values) => {
           return values.reduce((composition, value, index) => {
               composition[objectKeys[index]] = value;
               return composition;
           }, {});
       }
    );
}

