# Reselect

![TypeScript][typescript-badge][![npm package][npm-badge]][npm][![Coveralls][coveralls-badge]][coveralls][![GitHub Workflow Status][build-badge]][build]

A library for creating memoized "selector" functions. Commonly used with Redux, but usable with any plain JS immutable data as well.

- Selectors can compute derived data, allowing Redux to store the minimal possible state.
- Selectors are efficient. A selector is not recomputed unless one of its arguments changes.
- Selectors are composable. They can be used as input to other selectors.

The **Redux docs usage page on [Deriving Data with Selectors](https://redux.js.org/usage/deriving-data-selectors)** covers the purpose and motivation for selectors, why memoized selectors are useful, typical `Reselect` usage patterns, and using selectors with React-Redux.

## Installation

### Redux Toolkit

While `Reselect` is not exclusive to Redux, it is already included by default in [the official Redux Toolkit package](https://redux-toolkit.js.org) - no further installation needed.

```ts
import { createSelector } from '@reduxjs/toolkit'
```

### Standalone

For standalone usage, install the `Reselect` package:

#### Using `npm`

```bash
npm install reselect
```

#### Using `yarn`

```bash
yarn add reselect
```

#### Using `bun`

```bash
bun add reselect
```

#### Using `pnpm`

```bash
pnpm add reselect
```

---

## Basic Usage

`Reselect` exports a `createSelector` API, which generates memoized selector functions. `createSelector` accepts one or more `input selectors`, which extract values from arguments, and a `combiner` function that receives the extracted values and should return a derived value. If the generated `output selector` is called multiple times, the output will only be recalculated when the extracted values have changed.

You can play around with the following **example** in [this CodeSandbox](https://codesandbox.io/s/reselect-example-g3k9gf?file=/src/index.js):

```ts
import { createSelector } from 'reselect'

interface RootState {
  todos: { id: number; completed: boolean }[]
  alerts: { id: number; read: boolean }[]
}

const state: RootState = {
  todos: [
    { id: 0, completed: false },
    { id: 1, completed: true }
  ],
  alerts: [
    { id: 0, read: false },
    { id: 1, read: true }
  ]
}

const selectCompletedTodos = (state: RootState) => {
  console.log('selector ran')
  return state.todos.filter(todo => todo.completed === true)
}

selectCompletedTodos(state) // selector ran
selectCompletedTodos(state) // selector ran
selectCompletedTodos(state) // selector ran

const memoizedSelectCompletedTodos = createSelector(
  [(state: RootState) => state.todos],
  todos => {
    console.log('memoized selector ran')
    return todos.filter(todo => todo.completed === true)
  }
)

memoizedSelectCompletedTodos(state) // memoized selector ran
memoizedSelectCompletedTodos(state)
memoizedSelectCompletedTodos(state)

console.log(selectCompletedTodos(state) === selectCompletedTodos(state)) //=> false

console.log(
  memoizedSelectCompletedTodos(state) === memoizedSelectCompletedTodos(state)
) //=> true
```

As you can see from the example above, `memoizedSelectCompletedTodos` does not run the second or third time, but we still get the same return value as last time.

Another difference is that with `memoizedSelectCompletedTodos` the referential integrity of the return value is also maintained through multiple calls of the selector, but the same cannot be said about the first example.

---

## Table of Contents

- [Installation](#installation)
  - [Redux Toolkit](#redux-toolkit)
  - [Standalone](#standalone)
- [Basic Usage](#basic-usage)
- [API](#api)
  - [**`createSelector`**](#createselector)
  - [**`defaultMemoize`**](#defaultmemoize)
  - [**`weakMapMemoize`**](#weakmapmemoize)
  - [**`autotrackMemoize`**](#autotrackmemoize)
  - [**`createSelectorCreator`**](#createselectorcreator)
  - [**`createStructuredSelector`**](#createstructuredselector)
  - [**`createCurriedSelector`**](#createcurriedselector)
- [Debugging Tools](#debuggingtools)
- [FAQ](#faq)
  - [Why isn’t my selector recomputing when the input state changes?](#why-isnt-my-selector-recomputing-when-the-input-state-changes)
  - [Why is my selector recomputing when the input state stays the same?](#why-is-my-selector-recomputing-when-the-input-state-stays-the-same)
  - [Can I use Reselect without Redux?](#can-i-use-reselect-without-redux)
  - [How do I create a selector that takes an argument?](#how-do-i-create-a-selector-that-takes-an-argument)
  - [The default memoization function is no good, can I use a different one?](#the-default-memoization-function-is-no-good-can-i-use-a-different-one)
  - [How do I test a selector?](#how-do-i-test-a-selector)
  - [Can I share a selector across multiple component instances?](#can-i-share-a-selector-across-multiple-component-instances)
  - [Are there TypeScript Typings?](#are-there-typescript-typings)
  - [I am seeing a TypeScript error: `Type instantiation is excessively deep and possibly infinite`](#i-am-seeing-a-typescript-error-type-instantiation-is-excessively-deep-and-possibly-infinite)
  - [How can I make a curried selector?](#how-can-i-make-a-curried-selector)
- [Related Projects](#related-projects)
- [License](#license)
- [Prior Art and Inspiration](#prior-art-and-inspiration)

---

<details>

  <summary>

## Terminology

  </summary>

- <a name="selector-function" id="selector-function"></a>[**`Selector Function`**](#selector-function): Any function that accepts the Redux store state (or part of the state) as an argument, and returns data that is based on that state.
- <a name="input-selectors" id="input-selectors"></a>[**`Input Selectors`**](#input-selectors): Standard selector functions that are used to create the result function.
- <a name="output-selector" id="output-selector"></a>[**`Output Selector`**](#output-selector): The actual selectors generated by calling `createSelector`.
- <a name="result-function" id="result-function"></a>[**`Result Function`**](#result-function): The function that comes after the input selectors. It takes input selectors' return values as arguments and returns a result. Otherwise known as the `combiner`.
- <a name="combiner" id="combiner"></a>[**`Combiner`**](#combiner): A function that takes input selectors' return values as arguments and returns a result. This term is somewhat interchangeably used with `resultFunc`. But `combiner` is more of a general term and `resultFunc` is more specific to `Reselect`. So the `resultFunc` is a `combiner` but a `combiner` is not necessarily the same as `resultFunc`.
- <a name="dependencies" id="dependencies"></a>[**`Dependencies`**](#dependencies): Same as input selectors. They are what the output selector "depends" on.

The below example serves as a visual aid.

```ts
const outputSelector = createSelector(
  [inputSelector1, inputSelector2, inputSelector3], // synonymous with `dependencies`.
  combiner // synonymous with `Result Function` or `resultFunc`.
)
```

</details>

<div align="right">[ <a href="#table-of-contents">↑ Back to top ↑</a> ]</div>

---

## How Does `Reselect` Work?

<a id="cascadingmemoization"></a>

### Cascading Memoization

<!-- Reselect uses a unique method called **_Cascading Double-Layer Memoization_**. Here's how it works: -->

The way `Reselect` works can be broken down into multiple parts:

1. **Initial Run**: On the first call, `Reselect` runs all the `input selectors`, gathers their results, and passes them to the `result function`.

2. **Subsequent Runs**: For subsequent calls, `Reselect` performs two levels of checks:

   - **First Level**: It compares the current arguments with the previous ones.

     - If they're the same, it returns the cached result without running the `input selectors` or the `result function`.

     - If they differ, it proceeds to the second level.

   - **Second Level**: It runs the `input selectors` and compares their current results with the previous ones.
     > [!NOTE]
     > If any one of the `input selectors` return a different result, all `input selectors` will recalculate.
     - If the results are the same, it returns the cached result without running the `result function`.
     - If the results differ, it runs the `result function`.

This behavior is what we call **_Cascading Double-Layer Memoization_**.

<!-- The way `Reselect` works can be broken down into multiple parts:

1. Initial Run: Initially `Reselect` will run all of the [`input selectors`](#input-selectors), gather their results and pass their results to the `result function` as arguments. Then the `result function` will run.

2. Subsequent Runs: When calling the `output selector` a second time, `Reselect` will:

- Check the current arguments against the previous ones to see if they are the same:
  - If they are, it will skip running the `input selectors` and the `result function`, and it will simply return the cached result.
  - If they are not, the `input selectors` will run one at a time. Then their current results are compared to the previous ones:
    - If they return the same results as last time, the `result function` will not run, and instead the cached result will be returned.
      > [!NOTE]
      > If any one of the `input selectors` return a different result, all `input selectors` will recalculate.
    - If the results are different than last time, the `result function` will run.

This behavior is what we call **_Cascading Double-Layer Memoization_**. -->

### `Reselect` Vs Standard Memoization

##### Standard Memoization

![normal-memoization-function](docs/assets//normal-memoization-function.png)

_Standard memoization only compares arguments. If they're the same, it returns the cached result._

##### Memoization with `Reselect`

![reselect-memoization](docs/assets//reselect-memoization.png)

_`Reselect` adds a second layer of checks with the `input selectors`. This is crucial in `Redux` applications where state references change frequently._

A normal memoization function will compare the arguments, and if they are the same as last time, it will skip running the function and return the cached result. `Reselect`'s behavior differs from a simple memoization function in that, it adds a second layer of checks through the `input selectors`. So what can sometimes happen is that the arguments that get passed to the `input selectors` change, but the result of the `input selectors` still remain the same, and that means we can still skip running the `result function`.

This is especially important since in a `Redux` application, your `state` is going to change its reference any time you make an update through dispatched actions.

> [!NOTE]
> The `input selectors` take the same arguments as the `output selector`.

#### Why `Reselect` Is Often Used With `Redux`

Imagine you have a selector like this:

```ts
const selectCompletedTodos = (state: RootState) =>
  state.todos.filter(todo => todo.completed === true)
```

So you decide to memoize it:

```ts
const selectCompletedTodos = someMemoizeFunction((state: RootState) =>
  state.todos.filter(todo => todo.completed === true)
)
```

Then you update `state.alerts`:

```ts
store.dispatch(toggleRead(0))
```

Now when you call `selectCompletedTodos`, it re-runs, because we have effectively broken memoization.

```ts
selectCompletedTodos(store.getState())
selectCompletedTodos(store.getState()) // Will not run, and the cached result will be returned.
store.dispatch(toggleRead(0))
selectCompletedTodos(store.getState()) // It recalculates.
```

But why? `selectCompletedTodos` only needs to access `state.todos`, and has nothing to do with `state.alerts`, so why have we broken memoization? Well that's because in `Redux` anytime you make a change to the root `state`, it gets shallowly updated, which means its reference changes, therefore a normal memoization function will always fail the comparison check on the arguments.

But with `Reselect`, we can do something like this:

```ts
const selectCompletedTodos = createSelector(
  [(state: RootState) => state.todos],
  todos => todos.filter(todo => todo.completed === true)
)
```

And now we have achieved memoization:

```ts
selectCompletedTodos(store.getState())
selectCompletedTodos(store.getState()) // Will not run, and the cached result will be returned.
store.dispatch(toggleRead(0))
selectCompletedTodos(store.getState()) // The `input selectors` will run, But the `result function` is skipped and the cached result will be returned.
```

Even though our `state` changes, and we fail the comparison check on the arguments, the `result function` will not run because the current `state.todos` is still the same as the previous `state.todos`. So we have at least partial memoization, because the memoization "cascades" and goes from the arguments to the results of the `input selectors`. So basically there are "2 layers of checks" and in this situation, while the first one fails, the second one succeeds. And that is why this type of `Cascading Double-Layer Memoization` makes `Reselect` a good candidate to be used with `Redux`.

<div align="right">[ <a href="#table-of-contents">↑ Back to top ↑</a> ]</div>

---

## API

<a id="createselector" ></a>

### createSelector(...inputSelectors | [inputSelectors], resultFunc, createSelectorOptions?)

<details>

  <summary>

#### Description

  </summary>

Accepts one or more ["input selectors"](#input-selectors) (either as separate arguments or a single array),
a single ["result function"](#result-function) / ["combiner"](#combiner), and an optional options object, and
generates a memoized selector function.

</details>

<details>

  <summary>

#### Parameters

  </summary>

| Name                     | Description                                                                                                                   |
| :----------------------- | :---------------------------------------------------------------------------------------------------------------------------- |
| `inputSelectors`         | An array of [`input selectors`](#input-selectors), can also be passed as separate arguments.                                  |
| `combiner`               | A [`combiner`](#combiner) function that takes the results of the [`input selectors`](#input-selectors) as separate arguments. |
| `createSelectorOptions?` | An optional options object that allows for further customization per selector.                                                |

</details>

<details>

  <summary>

#### Returns

  </summary>

A memoized [`output selector`](#output-selector).

</details>

<details>

  <summary>

#### Type parameters

  </summary>

| Name                          | Description                                                                                                                                                                                          |
| :---------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `InputSelectors`              | The type of the [`input selectors`](#input-selectors) array.                                                                                                                                         |
| `Result`                      | The return type of the [`combiner`](#combiner) as well as the [`output selector`](#output-selector).                                                                                                 |
| `OverrideMemoizeFunction`     | The type of the optional `memoize` function that could be passed into the options object to override the original `memoize` function that was initially passed into `createSelectorCreator`.         |
| `OverrideArgsMemoizeFunction` | The type of the optional `argsMemoize` function that could be passed into the options object to override the original `argsMemoize` function that was initially passed into `createSelectorCreator`. |

</details>

<div align="right">[ <a href="#table-of-contents">↑ Back to top ↑</a> ]</div>

---

### Memoization Functions

<a id="defaultmemoize"></a>

#### defaultMemoize(func, equalityCheckOrOptions = defaultEqualityCheck)

<details>

  <summary>

##### Description

  </summary>

The standard memoize function used by `createSelector`.

It has a default cache size of 1. This means it always recalculates when the value of an argument changes. However, this can be customized as needed with a specific max cache size (**`Since`** 4.1.0).

It determines if an argument has changed by calling the `equalityCheck` function. As `defaultMemoize` is designed to be used with immutable data, the default `equalityCheck` function checks for changes using [`reference equality`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Strict_equality):

```ts
const defaultEqualityCheck = (previousValue: any, currentValue: any) => {
  return previousValue === currentValue
}
```

</details>

<details>

  <summary>

##### Parameters

  </summary>

| Name                     | Description                                                 |
| :----------------------- | :---------------------------------------------------------- |
| `func`                   | The function to be memoized.                                |
| `equalityCheckOrOptions` | Either an `equality check` function or an `options` object. |

**`Since`** 4.1.0, `defaultMemoize` also accepts an options object as its first argument instead of an `equalityCheck` function. The `options` object may contain:

```ts
type EqualityFn = (a: any, b: any) => boolean

interface DefaultMemoizeOptions {
  equalityCheck?: EqualityFn
  resultEqualityCheck?: EqualityFn
  maxSize?: number
}
```

| Name                  | Description                                                                                                                                                                                                                                                                                                                                                                         |
| :-------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `equalityCheck`       | Used to compare the individual arguments of the provided calculation function. <br /> **`Default`** = `defaultEqualityCheck`                                                                                                                                                                                                                                                        |
| `resultEqualityCheck` | If provided, used to compare a newly generated output value against previous values in the cache. If a match is found, the old value is returned. This addresses the common <code>todos.map(todo => todo.id)</code> use case, where an update to another field in the original data causes a recalculation due to changed references, but the output is still effectively the same. |
| `maxSize`             | The cache size for the selector. If greater than 1, the selector will use an LRU cache internally. <br /> **`Default`** = 1                                                                                                                                                                                                                                                         |

> [!WARNING]
> If `resultEqualityCheck` is used inside `argsMemoizeOptions` it has no effect.

</details>

<details>

  <summary>

##### Returns

  </summary>

A memoized function with a `.clearCache()` method attached.

</details>

<details>

  <summary>

##### Type parameters

  </summary>

| Name   | Description                                |
| :----- | :----------------------------------------- |
| `Func` | The type of the function that is memoized. |

</details>

<details>

  <summary>

##### **`Examples`**

  </summary>

###### Using `createSelector`

```ts
import { shallowEqual } from 'react-redux'
import { createSelector } from 'reselect'

const selectTodoIds = createSelector(
  [(state: RootState) => state.todos],
  todos => todos.map(todo => todo.id),
  {
    memoizeOptions: {
      equalityCheck: shallowEqual,
      resultEqualityCheck: shallowEqual,
      maxSize: 10
    },
    argsMemoizeOptions: {
      equalityCheck: shallowEqual,
      resultEqualityCheck: shallowEqual,
      maxSize: 10
    }
  }
)
```

###### Using `createSelectorCreator`

```ts
import { shallowEqual } from 'react-redux'
import { createSelectorCreator, defaultMemoize } from 'reselect'

const createSelectorShallowEqual = createSelectorCreator({
  memoize: defaultMemoize,
  memoizeOptions: {
    equalityCheck: shallowEqual,
    resultEqualityCheck: shallowEqual,
    maxSize: 10
  },
  argsMemoize: defaultMemoize,
  argsMemoizeOptions: {
    equalityCheck: shallowEqual,
    resultEqualityCheck: shallowEqual,
    maxSize: 10
  }
})

const selectTodoIds = createSelectorShallowEqual(
  [(state: RootState) => state.todos],
  todos => todos.map(todo => todo.id)
)
```

</details>

<div align="right">[ <a href="#table-of-contents">↑ Back to top ↑</a> ]</div>

---

<a id="weakmapmemoize"></a>

#### weakMapMemoize(func) - (**`Since`** 5.0.0)

<details>

  <summary>

##### Description

  </summary>

`defaultMemoize` has to be explicitly configured to have a cache size larger than 1, and uses an LRU cache internally.

`weakMapMemoize` creates a tree of `WeakMap`-based cache nodes based on the identity of the arguments it's been called with (in this case, the extracted values from your input selectors). **This allows `weakMapMemoize` to have an effectively infinite cache size**. Cache results will be kept in memory as long as references to the arguments still exist, and then cleared out as the arguments are garbage-collected.

**Design Tradeoffs for `weakMapMemoize`:**

- Pros:
  - It has an effectively infinite cache size, but you have no control over
    how long values are kept in cache as it's based on garbage collection and `WeakMap`s.
- Cons:
  - There's currently no way to alter the argument comparisons. They're based on strict reference equality.

**Use Cases for `weakMapMemoize`:**

- This memoizer is likely best used for cases where you need to call the
  same selector instance with many different arguments, such as a single
  selector instance that is used in a list item component and called with
  item IDs like:

```ts
useSelector(state => selectSomeData(state, id))
```

</details>

<details>

  <summary>

##### Parameters

  </summary>

| Name   | Description                  |
| :----- | :--------------------------- |
| `func` | The function to be memoized. |

</details>

<details>

  <summary>

##### Returns

  </summary>

A memoized function with a `.clearCache()` method attached.

</details>

<details>

  <summary>

##### Type parameters

  </summary>

| Name   | Description                                |
| :----- | :----------------------------------------- |
| `Func` | The type of the function that is memoized. |

</details>

<details>

  <summary>

##### **`Examples`**

  </summary>

Prior to `weakMapMemoize`, you had this problem:

```ts
const parametricSelector = createSelector(
  [(state: RootState) => state.todos, (state: RootState, id: number) => id],
  (todos, id) => todos.filter(todo => todo.id === id)
)

parametricSelector(state, 0) // Selector runs
parametricSelector(state, 0)
parametricSelector(state, 1) // Selector runs
parametricSelector(state, 0) // Selector runs again!
```

Before you could solve this in a number of different ways:

1. Set the `maxSize` with `defaultMemoize`:

```ts
const parametricSelector = createSelector(
  [(state: RootState) => state.todos, (state: RootState, id: number) => id],
  (todos, id) => todos.filter(todo => todo.id === id),
  {
    memoizeOptions: {
      maxSize: 10
    }
  }
)
```

But this required having to know the cache size ahead of time.

2. Create unique selector instances using `useMemo`.

```tsx
const parametricSelector = (id: number) =>
  createSelector([(state: RootState) => state.todos], todos =>
    todos.filter(todo => todo.id === id)
  )

const MyComponent: FC<Props> = ({ id }) => {
  const selectTodosById = useMemo(() => parametricSelector(id), [id])

  const todosById = useSelector(selectTodosById)

  return (
    <div>
      {todosById.map(todo => (
        <div key={todo.id}>{todo.title}</div>
      ))}
    </div>
  )
}
```

3. Using `useCallback`.

```tsx
const parametricSelector = createSelector(
  [(state: RootState) => state.todos, (state: RootState, id: number) => id],
  (todos, id) => todos.filter(todo => todo.id === id)
)

const MyComponent: FC<Props> = ({ id }) => {
  const selectTodosById = useCallback(parametricSelector, [])

  const todosById = useSelector(state => selectTodosById(state, id))

  return (
    <div>
      {todosById.map(todo => (
        <div key={todo.id}> {todo.title}</div>
      ))}
    </div>
  )
}
```

4. Use `re-reselect`:

```ts
import { createCachedSelector } from 're-reselect'

const parametricSelector = createCachedSelector(
  [(state: RootState) => state.todos, (state: RootState, id: number) => id],
  (todos, id) => todos.filter(todo => todo.id === id)
)((state: RootState, id: number) => id)
```

Starting in 5.0.0, you can eliminate this problem using `weakMapMemoize`.

###### Using `createSelector`

```ts
const parametricSelector = createSelector(
  [(state: RootState) => state.todos, (state: RootState, id: number) => id],
  (todos, id) => todos.filter(todo => todo.id === id),
  {
    memoize: weakMapMemoize,
    argsMemoize: weakMapMemoize
  }
)

parametricSelector(state, 0) // Selector runs
parametricSelector(state, 0)
parametricSelector(state, 1) // Selector runs
parametricSelector(state, 0)
```

###### Using `createSelectorCreator`

```ts
import { createSelectorCreator, weakMapMemoize } from 'reselect'

const createSelectorWeakMap = createSelectorCreator({
  memoize: weakMapMemoize,
  argsMemoize: weakMapMemoize
})

const parametricSelector = createSelector(
  [(state: RootState) => state.todos, (state: RootState, id: number) => id],
  (todos, id) => todos.filter(todo => todo.id === id)
)

parametricSelector(state, 0) // Selector runs
parametricSelector(state, 0)
parametricSelector(state, 1) // Selector runs
parametricSelector(state, 0)
```

This solves the problem of having to know and set the cache size prior to creating a memoized selector.

</details>

<div align="right">[ <a href="#table-of-contents">↑ Back to top ↑</a> ]</div>

---

<a id="autotrackmemoize"></a>

#### autotrackMemoize(func) - (**`Since`** 5.0.0)

<details>

  <summary>

##### Description

  </summary>

Uses an "auto-tracking" approach inspired by the work of the Ember Glimmer team. It uses a Proxy to wrap arguments and track accesses to nested fields in your selector on first read. Later, when the selector is called with new arguments, it identifies which accessed fields have changed and only recalculates the result if one or more of those accessed fields have changed. This allows it to be more precise than the shallow equality checks in defaultMemoize.

</details>

<details>

  <summary>

##### Parameters

  </summary>

| Name   | Description                  |
| :----- | :--------------------------- |
| `func` | The function to be memoized. |

</details>

<details>

  <summary>

##### Returns

  </summary>

A memoized function with a `.clearCache()` method attached.

</details>

<details>

  <summary>

##### Type parameters

  </summary>

| Name   | Description                                |
| :----- | :----------------------------------------- |
| `Func` | The type of the function that is memoized. |

</details>

<details>

  <summary>

##### **`Examples`**

  </summary>

###### Using `createSelector`

```ts
import {
  unstable_autotrackMemoize as autotrackMemoize,
  createSelector
} from 'reselect'

const selectTodoIds = createSelector(
  [(state: RootState) => state.todos],
  todos => todos.map(todo => todo.id),
  { memoize: autotrackMemoize }
)
```

###### Using `createSelectorCreator`

```ts
import {
  unstable_autotrackMemoize as autotrackMemoize,
  createSelectorCreator
} from 'reselect'

const createSelectorAutotrack = createSelectorCreator({
  memoize: autotrackMemoize
})

const selectTodoIds = createSelectorAutotrack(
  [(state: RootState) => state.todos],
  todos => todos.map(todo => todo.id)
)
```

**Design Tradeoffs for autotrackMemoize:**

- Pros:
  - It is likely to avoid excess calculations and recalculate fewer times than defaultMemoize will, which may also result in fewer component re-renders.
- Cons:

  - It only has a cache size of 1.
  - It is slower than defaultMemoize, because it has to do more work. (How much slower is dependent on the number of accessed fields in a selector, number of calls, frequency of input changes, etc)
  - It can have some unexpected behavior. Because it tracks nested field accesses, cases where you don't access a field will not recalculate properly. For example, a badly-written selector like:

  ```ts
  createSelector([state => state.todos], todos => todos)
  ```

  that just immediately returns the extracted value will never update, because it doesn't see any field accesses to check.

**Use Cases for `autotrackMemoize`:**

- It is likely best used for cases where you need to access specific nested fields in data, and avoid recalculating if other fields in the same data objects are immutably updated.

<caption>Using `createSelector`</caption>

```ts
import {
  unstable_autotrackMemoize as autotrackMemoize,
  createSelector
} from 'reselect'

const selectTodoIds = createSelector(
  [(state: RootState) => state.todos],
  todos => todos.map(todo => todo.id),
  { memoize: autotrackMemoize }
)
```

<caption>Using `createSelectorCreator`</caption>

```ts
import {
  unstable_autotrackMemoize as autotrackMemoize,
  createSelectorCreator
} from 'reselect'

const createSelectorAutotrack = createSelectorCreator({
  memoize: autotrackMemoize
})

const selectTodoIds = createSelectorAutotrack(
  [(state: RootState) => state.todos],
  todos => todos.map(todo => todo.id)
)
```

</details>

<div align="right">[ <a href="#table-of-contents">↑ Back to top ↑</a> ]</div>

---

<a id="createselectorcreator" ></a>

### createSelectorCreator(memoize | options, ...memoizeOptions)

<details>

  <summary>

#### Description

  </summary>

Accepts either a `memoize` function and `...memoizeOptions` rest parameter, or **`Since`** 5.0.0 an `options` object containing a `memoize` function and creates a custom selector creator function.

</details>

<details>

  <summary>

#### Parameters (**`Since`** 5.0.0)

  </summary>

| Name                           | Description                                                                                                                                                                                                                                                                                                               |
| :----------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `options`                      | An options object containing the `memoize` function responsible for memoizing the `resultFunc` inside `createSelector` (e.g., `defaultMemoize` or `weakMapMemoize`). It also provides additional options for customizing memoization. While the `memoize` property is mandatory, the rest are optional.                   |
| `options.argsMemoize?`         | The optional memoize function that is used to memoize the arguments passed into the `output selector` generated by `createSelector` (e.g., `defaultMemoize` or `weakMapMemoize`). <br /> **`Default`** `defaultMemoize`                                                                                                   |
| `options.argsMemoizeOptions?`  | Optional configuration options for the `argsMemoize` function. These options are passed to the `argsMemoize` function as the second argument. <br /> **`Since`** 5.0.0                                                                                                                                                    |
| `options.inputStabilityCheck?` | Overrides the global input stability check for the selector. Possible values are: <br /> `once` - Run only the first time the selector is called. <br /> `always` - Run every time the selector is called. <br /> `never` - Never run the input stability check. <br /> **`Default`** = `'once'` <br /> **`Since`** 5.0.0 |
| `options.memoize`              | The memoize function that is used to memoize the `resultFunc` inside `createSelector` (e.g., `defaultMemoize` or `weakMapMemoize`). **`Since`** 5.0.0                                                                                                                                                                     |
| `options.memoizeOptions?`      | Optional configuration options for the `memoize` function. These options are passed to the `memoize` function as the second argument. <br /> **`Since`** 5.0.0                                                                                                                                                            |

</details>

<details>

  <summary>

#### Parameters

  </summary>

| Name                        | Description                                                                                                                                        |
| :-------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------- |
| `memoize`                   | The `memoize` function responsible for memoizing the `resultFunc` inside `createSelector` (e.g., `defaultMemoize` or `weakMapMemoize`).            |
| `...memoizeOptionsFromArgs` | Optional configuration options for the memoization function. These options are then passed to the memoize function as the second argument onwards. |

</details>

<details>

  <summary>

#### Returns

  </summary>

A customized `createSelector` function.

</details>

<details>

  <summary>

#### Type parameters

  </summary>

| Name                  | Description                                                                                                                                                                                                                                                |
| :-------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `MemoizeFunction`     | The type of the memoize function that is used to memoize the `resultFunc` inside `createSelector` (e.g., `defaultMemoize` or `weakMapMemoize`).                                                                                                            |
| `ArgsMemoizeFunction` | The type of the optional memoize function that is used to memoize the arguments passed into the output selector generated by `createSelector` (e.g., `defaultMemoize` or `weakMapMemoize`). If none is explicitly provided, `defaultMemoize` will be used. |

</details>

<details>

  <summary>

#### **`Examples`**

  </summary>

##### Using `options` (**`Since`** 5.0.0)

```ts
const customCreateSelector = createSelectorCreator({
  memoize: customMemoize, // Function to be used to memoize `resultFunc`
  memoizeOptions: [memoizeOption1, memoizeOption2], // Options passed to `customMemoize` as the second argument onwards
  argsMemoize: customArgsMemoize, // Function to be used to memoize the selector's arguments
  argsMemoizeOptions: [argsMemoizeOption1, argsMemoizeOption2] // Options passed to `customArgsMemoize` as the second argument onwards
})

const customSelector = customCreateSelector(
  [inputSelector1, inputSelector2],
  resultFunc // `resultFunc` will be passed as the first argument to `customMemoize`
)

customSelector(
  ...selectorArgs // Will be memoized by `customArgsMemoize`
)
```

<div align="right">[ <a href="#table-of-contents">↑ Back to top ↑</a> ]</div>

---

##### Using `memoize` and `...memoizeOptions`

`createSelectorCreator` can be used to make a customized version of `createSelector`.

The `memoize` argument is a memoization function to replace `defaultMemoize`.

The `...memoizeOptions` rest parameters are zero or more configuration options to be passed to `memoizeFunc`. The selectors `resultFunc` is passed as the first argument to `memoize` and the `memoizeOptions` are passed as the second argument onwards:

```ts
const customSelectorCreator = createSelectorCreator(
  customMemoize, // Function to be used to memoize `resultFunc`
  option1, // `option1` will be passed as second argument to `customMemoize`
  option2, // `option2` will be passed as third argument to `customMemoize`
  option3 // `option3` will be passed as fourth argument to `customMemoize`
)

const customSelector = customSelectorCreator(
  [inputSelector1, inputSelector2],
  resultFunc // `resultFunc` will be passed as first argument to `customMemoize`
)
```

Internally `customSelector` calls the memoize function as follows:

```ts
customMemoize(resultFunc, option1, option2, option3)
```

##### Additional Examples

###### Customize `equalityCheck` for `defaultMemoize`

```js
import { createSelectorCreator, defaultMemoize } from 'reselect'
import isEqual from 'lodash.isequal'

// create a "selector creator" that uses lodash.isequal instead of ===
const createDeepEqualSelector = createSelectorCreator(defaultMemoize, isEqual)

// use the new "selector creator" to create a selector
const selectSum = createDeepEqualSelector(
  [state => state.values.filter(val => val < 5)],
  values => values.reduce((acc, val) => acc + val, 0)
)
```

###### Use memoize function from `Lodash` for an unbounded cache

```js
import { createSelectorCreator } from 'reselect'
import memoize from 'lodash.memoize'

const hashFn = (...args) =>
  args.reduce((acc, val) => acc + '-' + JSON.stringify(val), '')

const customSelectorCreator = createSelectorCreator(memoize, hashFn)

const selector = customSelectorCreator(
  [state => state.a, state => state.b],
  (a, b) => a + b
)
```

</details>

<div align="right">[ <a href="#table-of-contents">↑ Back to top ↑</a> ]</div>

---

<a id="createstructuredselector"></a>

### createStructuredSelector({ inputSelectors }, selectorCreator = createSelector)

<details>

  <summary>

#### Description

  </summary>

A convenience function for a common pattern that arises when using `Reselect`.
The selector passed to a `connect` decorator often just takes the values of its `input selectors`
and maps them to keys in an object.

</details>

<details>

  <summary>

#### Parameters

  </summary>

| Name               | Description                                                          |
| :----------------- | :------------------------------------------------------------------- |
| `selectorMap`      | A key value pair consisting of input selectors.                      |
| `selectorCreator?` | A custom selector creator function. It defaults to `createSelector`. |

</details>

<details>

  <summary>

#### Returns

  </summary>

A memoized structured selector.

</details>

<details>

  <summary>

#### Type parameters

  </summary>

| Name                   | Description                                                                                                                                                   |
| :--------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `InputSelectorsObject` | The shape of the `input selectors` object.                                                                                                                    |
| `MemoizeFunction`      | The type of the memoize function that is used to create the structured selector. It defaults to `defaultMemoize`.                                             |
| `ArgsMemoizeFunction`  | The type of the of the memoize function that is used to memoize the arguments passed into the generated structured selector. It defaults to `defaultMemoize`. |

</details>

<details>

  <summary>

#### **`Examples`**

  </summary>

##### Modern Use Case

```ts
import { createSelector, createStructuredSelector } from 'reselect'

interface RootState {
  todos: { id: number; completed: boolean }[]
  alerts: { id: number; read: boolean }[]
}

const state: RootState = {
  todos: [
    { id: 0, completed: false },
    { id: 1, completed: true }
  ],
  alerts: [
    { id: 0, read: false },
    { id: 1, read: true }
  ]
}

// This:
const structuredSelector = createStructuredSelector(
  {
    allTodos: (state: RootState) => state.todos,
    allAlerts: (state: RootState) => state.alerts,
    selectedTodo: (state: RootState, id: number) => state.todos[id]
  },
  createSelector
)

// Is essentially the same as this:
const selector = createSelector(
  [
    (state: RootState) => state.todos,
    (state: RootState) => state.alerts,
    (state: RootState, id: number) => state.todos[id]
  ],
  (allTodos, allAlerts, selectedTodo) => {
    return {
      allTodos,
      allAlerts,
      selectedTodo
    }
  }
)
```

##### Simple Use Case

```ts
const selectA = state => state.a
const selectB = state => state.b

// The result function in the following selector
// is simply building an object from the input selectors
const structuredSelector = createSelector(selectA, selectB, (a, b) => ({
  a,
  b
}))

const result = structuredSelector({ a: 1, b: 2 }) // will produce { x: 1, y: 2 }
```

</details>

<div align="right">[ <a href="#table-of-contents">↑ Back to top ↑</a> ]</div>

---

<a id="debuggingtools"></a>

## Debugging Tools

<details>

<a id="developmentonlychecks"></a>

  <summary>

### Development-only Checks - (**`Since`** 5.0.0)

  </summary>

<a id="inputstabilitycheck"></a>

#### `inputStabilityCheck`

Due to how [`Cascading Memoization`](#cascadingmemoization) works in `Reselect`, it is crucial that your `input selectors` do not return a new reference on each run. If an `input selector` always returns a new reference, like

```ts
state => ({ a: state.a, b: state.b })
```

or

```ts
state => state.todos.map(todo => todo.id)
```

that will cause the selector to never memoize properly.
Since this is a common mistake, we've added a development mode check to catch this. By default, `createSelector` will now run the `input selectors` twice during the first call to the selector. If the result appears to be different for the same call, it will log a warning with the arguments and the two different sets of extracted input values.

```ts
type StabilityCheckFrequency = 'always' | 'once' | 'never'
```

| Possible Values | Description                                     |
| :-------------- | :---------------------------------------------- |
| `once`          | Run only the first time the selector is called. |
| `always`        | Run every time the selector is called.          |
| `never`         | Never run the `input stability check`.          |

> [!IMPORTANT]
> The `input stability check` is automatically disabled in production environments.

You can configure this behavior in two ways:

<a id="setinputstabilitycheckenabled"></a>

##### 1. Globally through `setInputStabilityCheckEnabled`:

A `setInputStabilityCheckEnabled` function is exported from `Reselect`, which should be called with the desired setting.

```ts
import { setInputStabilityCheckEnabled } from 'reselect'

// Run only the first time the selector is called. (default)
setInputStabilityCheckEnabled('once')

// Run every time the selector is called.
setInputStabilityCheckEnabled('always')

// Never run the input stability check.
setInputStabilityCheckEnabled('never')
```

##### 2. Per selector by passing an `inputStabilityCheck` option directly to `createSelector`:

```ts
// Create a selector that double-checks the results of `input selectors` every time it runs.
const selectCompletedTodosLength = createSelector(
  [
    // This `input selector` will not be memoized properly since it always returns a new reference.
    (state: RootState) =>
      state.todos.filter(({ completed }) => completed === true)
  ],
  completedTodos => completedTodos.length,
  // Will override the global setting.
  { inputStabilityCheck: 'always' }
)
```

> [!WARNING]
> This will override the global `input stability check` set by calling `setInputStabilityCheckEnabled`.

</details>

<details>

<a id="outputselectorfields"></a>

  <summary>

### Output Selector Fields

  </summary>

The `output selectors` created by `createSelector` have several additional properties attached to them:

| Name                            | Description                                                                                                                                                                             |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `resultFunc`                    | The final function passed to `createSelector`. Otherwise known as the `combiner`.                                                                                                       |
| `memoizedResultFunc`            | The memoized version of `resultFunc`.                                                                                                                                                   |
| `lastResult`                    | Returns The last result calculated by `memoizedResultFunc`.                                                                                                                             |
| `dependencies`                  | The array of the input selectors used by `createSelector` to compose the combiner (`memoizedResultFunc`).                                                                               |
| `recomputations`                | Counts the number of times `memoizedResultFunc` has been recalculated.                                                                                                                  |
| `resetRecomputations`           | Resets the count of `recomputations` count to 0.                                                                                                                                        |
| `dependencyRecomputations`      | Counts the number of times the input selectors (`dependencies`) have been recalculated. This is distinct from `recomputations`, which tracks the recalculations of the result function. |
| `resetDependencyRecomputations` | Resets the `dependencyRecomputations` count to 0.                                                                                                                                       |
| `memoize`                       | Function used to memoize the `resultFunc`.                                                                                                                                              |
| `argsMemoize`                   | Function used to memoize the arguments passed into the `output selector`.                                                                                                               |

</details>

<div align="right">[ <a href="#table-of-contents">↑ Back to top ↑</a> ]</div>

---

<details>

<a id="v5summary"></a>

  <summary>

## What's New in 5.0.0?

  </summary>

Version 5.0.0 introduces several new features and improvements:

- **Customization Enhancements**:

  - Added the ability to pass an options object to `createSelectorCreator`, allowing for customized `memoize` and `argsMemoize` functions, alongside their respective options (`memoizeOptions` and `argsMemoizeOptions`).
  - The `createSelector` function now supports direct customization of `memoize` and `argsMemoize` within its options object.

- **Memoization Functions**:

  - Introduced new experimental memoization functions: `weakMapMemoize` and `autotrackMemoize`.
  - Incorporated `memoize` and `argsMemoize` into the [`output selector fields`](#outputselectorfields) for debugging purposes.

- **TypeScript Support and Performance**:

  - Discontinued support for `TypeScript` versions below 4.7, aligning with modern `TypeScript` features.
  - Significantly improved `TypeScript` performance for nesting `output selectors`. The nesting limit has increased from approximately 8 to around 30 `output selectors`, greatly reducing the occurrence of the infamous `Type instantiation is excessively deep and possibly infinite` error.

- **Selector API Enhancements**:

  - Introduced experimental APIs: `createCurriedSelector` and `createCurriedSelectorCreator`, for more advanced selector patterns.
  - Removed the second overload of `createStructuredSelector` due to its susceptibility to runtime errors.
  - Added the `TypedStructuredSelectorCreator` utility type (_currently a work-in-progress_) to facilitate the creation of a pre-typed version of `createStructuredSelector` for your root state.

- **Additional Functionalities**:

  - Added `dependencyRecomputations` and `resetDependencyRecomputations` to the `output selector fields`. These additions provide greater control and insight over `input selectors`, complementing the new `argsMemoize` API.
  - Introduced `inputStabilityCheck`, a development tool that runs the `input selectors` twice using the same arguments and triggers a warning If they return differing results for the same call.

These updates aim to enhance flexibility, performance, and developer experience. For detailed usage and examples, refer to the updated documentation sections for each feature.

</details>

<div align="right">[ <a href="#table-of-contents">↑ Back to top ↑</a> ]</div>

---

<details>

<a id="optimizingreselect"></a>

  <summary>

## Optimizing `Reselect`

  </summary>

### Empty Array Pattern

To reduce recalculations, use a predefined empty array when `array.filter` or similar methods result in an empty array.

So you can have a pattern like this:

```ts
const EMPTY_ARRAY = []

const selectCompletedTodos = createSelector(
  [(state: RootState) => state.todos],
  todos => {
    const completedTodos = todos.filter(todo => todo.completed === true)
    return completedTodos.length === 0 ? EMPTY_ARRAY : completedTodos
  }
)
```

Or to avoid repetition, you can create a wrapper function and reuse it:

```ts
const EMPTY_ARRAY = []

export const fallbackToEmptyArray = <T>(array: T[]) => {
  return array.length === 0 ? EMPTY_ARRAY : array
}

const selectCompletedTodos = createSelector(
  [(state: RootState) => state.todos],
  todos => {
    return fallbackToEmptyArray(todos.filter(todo => todo.completed === true))
  }
)
```

There are a few details that will help you skip running as many functions as possible and get the best possible performance out of `Reselect`:

- Due to the `Cascading Memoization` in `Reselect`, The first layer of checks is upon the arguments that are passed to the `output selector`, therefore it's best to maintain the same reference for the arguments as much as possible.
- In `Redux`, your state will change reference when updated. But it's best to keep the additional arguments as simple as possible, try to avoid passing in objects or arrays and mostly stick to primitives like numbers for ids.
- Keep your [`input selectors`](#input-selectors) as simple as possible. It's best if they mostly consist of field accessors like `state => state.todos` or argument providers like `(state, id) => id`. You should not be doing any sort of calculation inside `input selectors`, and you should definitely not be returning an object or array with a new reference each time.
- The `result function` is only re-run as a last resort. So make sure to put any and all calculations inside your `result function`. That way, `Reselect` will only run those calculations if all other checks fail.

This:

```ts
const selectorGood = createSelector(
  [(state: RootState) => state.todos],
  todos => someExpensiveComputation(todos)
)
```

Is preferable to this:

```ts
const selectorBad = createSelector(
  [(state: RootState) => someExpensiveComputation(state.todos)],
  someOtherCalculation
)
```

Because we have less calculations in input selectors and more in the result function.

</details>

<div align="right">[ <a href="#table-of-contents">↑ Back to top ↑</a> ]</div>

---

## FAQ

<details>

  <summary>

### Why isn’t my selector recomputing when the input state changes?

  </summary>

A: Check that your memoization function is compatible with your state update function (i.e. the reducer if you are using `Redux`). For example, a selector created with `createSelector` will not work with a state update function that mutates an existing object instead of creating a new one each time. `createSelector` uses an identity check (`===`) to detect that an input has changed, so mutating an existing object will not trigger the selector to recompute because mutating an object does not change its identity. Note that if you are using `Redux`, mutating the state object is [almost certainly a mistake](http://redux.js.org/docs/Troubleshooting.html).

</details>

<details>

  <summary>

### Why is my selector recomputing when the input state stays the same?

  </summary>

A: Make sure you have `inputStabilityCheck` set to either `always` or `once` and that in and of itself should take some weight off of your shoulders by doing some of the debugging for you. Also make sure you use your `output selector fields` like `recomputations`, `resetRecomputations`, `dependencyRecomputations`, `resetDependencyRecomputations` to narrow down the root of the problem to see where it is coming from. Is it coming from the arguments changing reference unexpectedly? then if that is the case your `dependencyRecomputations` should be going up. If `dependencyRecomputations` is incrementing but `recomputations` is not, that means your arguments are changing reference too often. If your `input selectors` return a new reference every time, that will be caught be `inputStabilityCheck`. And if your arguments are changing reference too often, you can narrow it down to see which arguments are changing reference too often by doing this:

```ts
interface RootState {
  todos: { id: number; completed: boolean }[]
  alerts: { id: number; read: boolean; type: string }[]
}

const selectAlertsByType = createSelector(
  [
    (state: RootState) => state.alerts,
    (state: RootState, type: string) => type
  ],
  (alerts, type) => alerts.filter(todo => todo.type === type),
  {
    argsMemoizeOptions: {
      // This will check the arguments passed to the `output selector`.
      equalityCheck: (a, b) => {
        if (a !== b) {
          console.log(a, 'is not equal to', b)
        }
        return a === b
      }
    }
  }
)
```

</details>

<details>

  <summary>

### Can I use `Reselect` without `Redux`?

  </summary>

A: Yes. `Reselect` has no dependencies on any other package, so although it was designed to be used with `Redux` it can be used independently. It can be used with any plain JS data, such as typical `React` state values, as long as that data is being updated immutably.

</details>

<details>

  <summary>

### How do I create a selector that takes an argument?

  </summary>

When creating a selector that accepts arguments in `Reselect`, it's important to structure your input and `output selectors` appropriately. Here are key points to consider:

1. **Consistency in Arguments**: Ensure that all positional arguments across `input selectors` are of the same type for consistency.

2. **Selective Argument Usage**: Design each selector to use only its relevant argument(s) and ignore the rest. This is crucial because all `input selectors` receive the same arguments that are passed to the `output selector`.

Suppose we have the following state structure:

```ts
interface RootState {
  items: { id: number; category: string }[]
  // ... other state properties ...
}
```

To create a selector that filters `items` based on a `category` and excludes a specific `id`, you can set up your selectors as follows:

```ts
const selectAvailableItems = createSelector(
  [
    // First input selector extracts items from the state
    (state: RootState) => state.items,
    // Second input selector forwards the category argument
    (state: RootState, category: string) => category,
    // Third input selector forwards the ID argument
    (state: RootState, category: string, id: number) => id
  ],
  // Output selector uses the extracted items, category, and ID
  (items, category, id) =>
    items.filter(item => item.category === category && item.id !== id)
)
```

Internally `Reselect` is doing this:

```ts
// Input selector #1
const items = (state: RootState, category: string, id: number) => state.items
// Input selector #2
const category = (state: RootState, category: string, id: number) => category
// Input selector #3
const id = (state: RootState, category: string, id: number) => id
// result of `output selector`
const finalResult =
  // The `Result Function`
  items.filter(item => item.category === category && item.id !== id)
```

</details>

<details>

  <summary>

### The default memoization function is no good, can I use a different one?

  </summary>

A: We think it works great for a lot of use cases, but sure. See [these examples](#customize-equalitycheck-for-defaultmemoize).

</details>

<details>

  <summary>

### How do I test a selector?

  </summary>

A: For a given input, a selector should always produce the same result. For this reason they are simple to unit test.

```ts
interface RootState {
  todos: { id: number; completed: boolean }[]
  alerts: { id: number; read: boolean }[]
}

const state: RootState = {
  todos: [
    { id: 0, completed: false },
    { id: 1, completed: true }
  ],
  alerts: [
    { id: 0, read: false },
    { id: 1, read: true }
  ]
}

// With `Vitest`
test('selector unit test', () => {
  const selectTodoIds = createSelector(
    [(state: RootState) => state.todos],
    todos => todos.map(({ id }) => id)
  )
  const firstResult = selectTodoIds(state)
  const secondResult = selectTodoIds(state)
  // Reference equality should pass.
  expect(firstResult).toBe(secondResult)
  // Deep equality should also pass.
  expect(firstResult).toStrictEqual(secondResult)
  selectTodoIds(state)
  selectTodoIds(state)
  selectTodoIds(state)
  // The `Result Function` should not recalculate.
  expect(selectTodoIds.recomputations()).toBe(1)
  // `Input selectors` should not recalculate.
  expect(selectTodoIds.dependencyRecomputations()).toBe(1)
})
```

</details>

<details>

  <summary>

### Can I share a selector across multiple component instances?

  </summary>

A: Yes, as of 5.0.0 you can use `weakMapMemoize` to achieve this.

</details>

<details>

  <summary>

### Are there TypeScript Typings?

  </summary>

A: Yes! `Reselect` is now written in `TypeScript` itself, so they should Just Work™.

</details>

<details>

  <summary>

### I am seeing a TypeScript error: `Type instantiation is excessively deep and possibly infinite`

  </summary>

A: **`Since`** 5.0.0 you should be able to nest up to 30 selectors, but in case you still run into this issue, you can refer to [this
comment](https://github.com/reduxjs/reselect/issues/534#issuecomment-956708953) for a discussion of the problem, as
relating to nested selectors.

</details>

<details>

  <summary>

### How can I make a [curried](https://github.com/hemanth/functional-programming-jargon#currying) selector?

  </summary>

A: You can try this new experimental API:

<a id="createcurriedselector"></a>

#### createCurriedSelector(...inputSelectors | [inputSelectors], resultFunc, createSelectorOptions?)

This:

```ts
const parametricSelector = createSelector(
  [(state: RootState) => state.todos, (state: RootState, id: number) => id],
  (todos, id) => todos.filter(todo => todo.id === id)
)

parametricSelector(state, 0)
```

Is the same as this:

```ts
const curriedSelector = createCurriedSelector(
  [(state: RootState) => state.todos, (state: RootState, id: number) => id],
  (todos, id) => todos.filter(todo => todo.id === id)
)

curriedSelector(0)(state)
```

As before you had to do this:

```ts
const selectTodo = useSelector(state => parametricSelector(state, props.id))
```

Now you can do this:

```ts
const selectTodo = useSelector(curriedSelector(props.id))
```

Another thing you can do if you are using `React-Redux` is this:

```ts
import type { GetParamsFromSelectors, Selector } from 'reselect'
import { useSelector } from 'react-redux'

export const createParametricSelectorHook = <S extends Selector>(
  selector: S
) => {
  return (...args: GetParamsFromSelectors<[S]>) => {
    return useSelector(state => selector(state, ...args))
  }
}

const useSelectTodo = createParametricSelectorHook(parametricSelector)
```

And then inside your component:

```tsx
import type { FC } from 'react'

interface Props {
  id: number
}

const MyComponent: FC<Props> = ({ id }) => {
  const todo = useSelectTodo(id)
  return <div>{todo.title}</div>
}
```

### How can I make pre-typed version of `createSelector` for my root state?

A: You can create a custom typed version of `createSelector` by defining a utility type that extends the original `createSelector` function. Here's an example:

```ts
import type { createSelector, SelectorsArray, Selector } from 'reselect'

interface RootState {
  todos: { id: number; completed: boolean }[]
  alerts: { id: number; read: boolean }[]
}

export type TypedCreateSelector<State> = <
  SelectorsArray extends readonly Selector<State>[],
  Result
>(
  ...createSelectorArgs: Parameters<
    typeof createSelector<SelectorsArray, Result>
  >
) => ReturnType<typeof createSelector<SelectorsArray, Result>>

export const createAppSelector: TypedCreateSelector<RootState> = createSelector
```

> [!WARNING]: This approach currently only supports `input selectors` provided as a single array.

</details>

<div align="right">[ <a href="#table-of-contents">↑ Back to top ↑</a> ]</div>

---

<details>

  <summary>

## External References

  </summary>

- [**`WeakMap`**](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/WeakMap)
- [**`Reference Equality Check`**](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Strict_equality)

</details>

<details>

  <summary>

## Related Projects

  </summary>

### [re-reselect](https://github.com/toomuchdesign/re-reselect)

Enhances `Reselect` selectors by wrapping `createSelector` and returning a memoized collection of selectors indexed with the cache key returned by a custom resolver function.

Useful to reduce selectors recalculation when the same selector is repeatedly called with one/few different arguments.

### [reselect-tools](https://github.com/skortchmark9/reselect-tools)

[Chrome extension](https://chrome.google.com/webstore/detail/reselect-devtools/cjmaipngmabglflfeepmdiffcijhjlbb?hl=en) and [companion lib](https://github.com/skortchmark9/reselect-tools) for debugging selectors.

- Measure selector recomputations across the app and identify performance bottlenecks
- Check selector dependencies, inputs, outputs, and recomputations at any time with the chrome extension
- Statically export a JSON representation of your selector graph for further analysis

### [reselect-debugger](https://github.com/vlanemcev/reselect-debugger-flipper)

[Flipper plugin](https://github.com/vlanemcev/flipper-plugin-reselect-debugger) and [and the connect app](https://github.com/vlanemcev/reselect-debugger-flipper) for debugging selectors in **React Native Apps**.

Inspired by `Reselect Tools`, so it also has all functionality from this library and more, but only for React Native and Flipper.

- Selectors Recomputations count in live time across the App for identify performance bottlenecks
- Highlight most recomputed selectors
- Dependency Graph
- Search by Selectors Graph
- Selectors Inputs
- Selectors Output (In case if selector not dependent from external arguments)
- Shows "Not Memoized (NM)" selectors

</details>

<div align="right">[ <a href="#table-of-contents">↑ Back to top ↑</a> ]</div>

---

## License

MIT

<details>

  <summary>

## Prior Art and Inspiration

  </summary>

Originally inspired by getters in [NuclearJS](https://github.com/optimizely/nuclear-js.git), [subscriptions](https://github.com/Day8/re-frame#just-a-read-only-cursor) in [re-frame](https://github.com/Day8/re-frame) and this [proposal](https://github.com/reduxjs/redux/pull/169) from [speedskater](https://github.com/speedskater).

[typescript-badge]: https://img.shields.io/badge/TypeScript-v4%2E7%2B-007ACC?style=for-the-badge&logo=TypeScript&logoColor=black&labelColor=blue&color=gray
[build-badge]: https://img.shields.io/github/actions/workflow/status/reduxjs/reselect/build-and-test-types.yml?branch=master&style=for-the-badge
[build]: https://github.com/reduxjs/reselect/actions/workflows/build-and-test-types.yml
[npm-badge]: https://img.shields.io/npm/v/reselect.svg?style=for-the-badge
[npm]: https://www.npmjs.org/package/reselect
[coveralls-badge]: https://img.shields.io/coveralls/reduxjs/reselect/master.svg?style=for-the-badge
[coveralls]: https://coveralls.io/github/reduxjs/reselect

</details>

<div align="right">[ <a href="#table-of-contents">↑ Back to top ↑</a> ]</div>

---
