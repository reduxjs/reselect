function defaultEqualityCheck<T>(a: T, b: T) {
  return a === b;
}

type EqualityCheck = <U>(a: U, b: U) => boolean;

function areArgumentsShallowlyEqual<T extends unknown[]>(
  equalityCheck: EqualityCheck,
  prev: T,
  next: T
): boolean {
  if (prev == null || next == null || prev.length !== next.length) {
    return false;
  }

  // Do this in a for loop (and not a `forEach` or an `every`) so we can determine equality as fast as possible.
  const length = prev.length;
  for (let i = 0; i < length; i++) {
    if (!equalityCheck(prev[i], next[i])) {
      return false;
    }
  }

  return true;
}

export function defaultMemoize<
  F extends (...args: any[]) => any,
  PS extends Parameters<F>,
  R extends ReturnType<F>
>(
  func: F,
  equalityCheck: EqualityCheck = defaultEqualityCheck
): (...args: PS) => R {
  let lastArgs: PS;
  let lastResult: R;
  return function(...args: PS) {
    if (!areArgumentsShallowlyEqual(equalityCheck, lastArgs, args)) {
      // apply arguments instead of spreading for performance.
      lastResult = func.apply(null, args);
    }

    lastArgs = args;
    return lastResult;
  };
}

function checkDependencies<FS extends FunctionType[]>(dependencies: FS) {
  if (!dependencies.every(dep => typeof dep === "function")) {
    const dependencyTypes = dependencies
      .map((dep: any) => typeof dep)
      .join(", ");
    throw new Error(
      "Selector creators expect all input-selectors to be functions, " +
        `instead received the following types: [${dependencyTypes}]`
    );
  }

  return dependencies;
}

type NonEmptyArray<T> = [T, ...T[]];

type FunctionType = (...args: any[]) => any;

type ReturnTypes<TS extends FunctionType[]> = {
  [K in keyof TS]: TS[K] extends FunctionType ? ReturnType<TS[K]> : never;
};

type Selector<PS extends any[], R> = (...args: PS) => R;

type OutputSelector<PS extends any[], RS extends any[], R> = Selector<PS, R> & {
  resultFunc: Selector<RS, R>;
  dependencies: FunctionType[];
  recomputations: () => number;
  resetRecomputations: () => 0;
};

export function createSelectorCreator(
  memoize = defaultMemoize,
  ...memoizeOptions: any[] // TODO: Type the memoize options based on the type of the memoize function?
) {
  return <
    FS extends NonEmptyArray<(...args: any[]) => any>, // TODO: The non-empty array makes sure RS is a tuple. This causes some problems in the typings-test file where the selectors are generated from an Array.map
    PS extends Parameters<FS[0]>, // TODO: input selectors take their parameter types from the first selector which also causes problems in the typings-test file
    RS extends ReturnTypes<FS>,
    R
  >(
    dependencies: FS,
    resultFunc: Selector<RS, R>
  ) => {
    let recomputations = 0;

    checkDependencies(dependencies);

    const memoizedResultFunc = memoize(function(...args: RS): R {
      recomputations++;
      // apply arguments instead of spreading for performance.
      return resultFunc.apply(null, args);
    }, ...memoizeOptions);

    const selector: OutputSelector<PS, RS, R> = Object.assign(
      memoize(function(...args: PS): R {
        const params = dependencies.map(f => f(...args)) as RS;

        return memoizedResultFunc.apply(null, params);
      }),
      {
        resultFunc,
        dependencies,
        recomputations: () => recomputations,
        resetRecomputations: () => (recomputations = 0)
      }
    );

    return selector;
  };
}

export const createSelector = createSelectorCreator();

// TODO: Stop cheating and type this properly
export function createStructuredSelector(
  selectors: { [key: string]: (...args: any[]) => any },
  selectorCreator: typeof createSelector = createSelector
) {
  if (typeof selectors !== "object") {
    throw new Error(
      "createStructuredSelector expects first argument to be an object " +
        `where each property is a selector, instead received a ${typeof selectors}`
    );
  }

  const objectKeys = Object.keys(selectors);
  if (objectKeys.length === 0) {
    throw new Error(
      "createStructuredSelector expects first argument to be an object " +
        `where each property is a selector, instead received an empty object`
    );
  }

  const mappedSelectors = objectKeys.map(
    (key: string) => selectors[key]
  ) as NonEmptyArray<(...args: any[]) => any>;

  return selectorCreator(mappedSelectors, (...values) => {
    return values.reduce((composition, value, index) => {
      composition[objectKeys[index]] = value;
      return composition;
    }, {});
  });
}

// Sanity Check
interface Item {
  name: string;
  value: number;
}

interface Shop {
  name: string;
  taxPercent: 8;
  items: Item[];
}

interface State {
  shop: Shop;
}

interface Props {
  index: number;
}

const shopNameSelector = (state: State, _props: Props) => {
  return state.shop.name;
};

const shopItemsSelector = (state: State, _props: Props) => {
  return state.shop.items;
};

const taxPercentSelector = (state: State, props: Props) => {
  props.index + 1;
  return state.shop.taxPercent;
};

const augmentShopNameSelector = createSelector(
  [shopNameSelector],
  (name: string) => name + " is open at 9AM"
);

const subtotalSelector = createSelector(
  [shopItemsSelector, augmentShopNameSelector],
  (items, _name) => items.reduce((acc, item) => acc + item.value, 0)
);

const taxSelector = createSelector(
  [subtotalSelector, shopNameSelector, taxPercentSelector],
  (subtotal, _shopNameSelector, taxPercent) => subtotal * (taxPercent / 100)
);

const totalSelector = createSelector(
  [subtotalSelector, taxSelector],
  (subtotal, tax) => ({ total: subtotal + tax })
);

const exampleState: State = {
  shop: {
    name: "Chadwicks",
    taxPercent: 8,
    items: [{ name: "apple", value: 1.2 }, { name: "orange", value: 0.95 }]
  }
};

const exampleProps: Props = {
  index: 100
};

subtotalSelector(exampleState, exampleProps); // 2.15
taxSelector(exampleState, exampleProps); // 0.172
totalSelector(exampleState, exampleProps); // { total: 2.322 }
