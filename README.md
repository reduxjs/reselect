# Reselect

Simple "selector" library for Redux inspired by getters in [NuclearJS](https://github.com/optimizely/nuclear-js.git), [subscriptions](https://github.com/Day8/re-frame#just-a-read-only-cursor) in [re-frame](https://github.com/Day8/re-frame) and this [proposal](https://github.com/gaearon/redux/pull/169) from [speedskater](https://github.com/speedskater).

* Selectors can compute derived data, allowing Redux to store the minimal possible state.
* Selectors are efficient. A selector is not recomputed unless one of its arguments change.
* Selectors are composable. They can be used as input to other selectors.

```js
import { createSelector } from 'reselect';

const shopItemsSelector = state => state.shop.items;
const taxPercentSelector = state => state.shop.taxPercent;

const subtotalSelector = createSelector(
  shopItemsSelector,
  items => items.reduce((acc, item) => acc + item.value, 0)
);

const taxSelector = createSelector(
  subtotalSelector,
  taxPercentSelector,
  (subtotal, taxPercent) => subtotal * (taxPercent / 100)
);

export const totalSelector = createSelector(
  subtotalSelector,
  taxSelector,
  (subtotal, tax) => { return {total: subtotal + tax}}
);
```

## Table of Contents

- [Installation](#installation)
- [Example](#example)
  - [Motivation for Memoized Selectors](#motivation-for-memoized-selectors)
  - [Creating a Memoized Selector](#creating-a-memoized-selector)
  - [Composing Selectors](#composing-selectors)
  - [Connecting a Selector to the Redux Store](#connecting-a-selector-to-the-redux-store)
  - [Accessing React Props in Selectors](#accessing-react-props-in-selectors)
- [API](#api)
  - [`createSelector`](#createselectorinputselectors-resultfn)
  - [`defaultMemoizeFunc`](#defaultmemoizefuncfunc-valueequals--defaultvalueequals)
  - [`createSelectorCreator`](#createselectorcreatormemoizefunc-memoizeoptions)
- [FAQ](#faq)
  - [Why isn't my selector recomputing when the input state changes?](#q-why-isnt-my-selector-recomputing-when-the-input-state-changes)
  - [Why is my selector recomputing when the input state stays the same?](#q-why-is-my-selector-recomputing-when-the-input-state-stays-the-same)
  - [Can I use Reselect without Redux?](#q-can-i-use-reselect-without-redux)
  - [The default memoization function is rubbish, can I use a different one?](#q-the-default-memoization-function-is-rubbish-can-i-use-a-different-one)
  - [The default memoization cache size of 1 is rubbish, can I increase it?](#q-the-default-memoization-cache-size-of-1-is-rubbish-can-i-increase-it)
  - [How do I test a selector?](#q-how-do-i-test-a-selector)
  - [How do I create a selector that takes an argument? ](#q-how-do-i-create-a-selector-that-takes-an-argument)
  - [How do I use Reselect with Immutable.js?](#q-how-do-i-use-reselect-with-immutablejs)
- [License](#license)

## Installation
    npm install reselect

## Example

### Motivation for Memoized Selectors

Here is an excerpt from the Redux [Todos List example](https://github.com/docs/basics/UsageWithReact.md):

#### `containers/App.js`

```js
import React, { Component, PropTypes } from 'react';
import { connect } from 'react-redux';
import { addTodo, completeTodo, setVisibilityFilter, VisibilityFilters } from '../actions';
import AddTodo from '../components/AddTodo';
import TodoList from '../components/TodoList';
import Footer from '../components/Footer';

class App extends Component {
  render() {
    // Injected by connect() call:
    const { dispatch, visibleTodos, visibilityFilter } = this.props;
    return (
      <div>
        <AddTodo
          onAddClick={text =>
            dispatch(addTodo(text))
          } />
        <TodoList
          todos={this.props.visibleTodos}
          onTodoClick={index =>
            dispatch(completeTodo(index))
          } />
        <Footer
          filter={visibilityFilter}
          onFilterChange={nextFilter =>
            dispatch(setVisibilityFilter(nextFilter))
          } />
      </div>
    );
  }
}

App.propTypes = {
  visibleTodos: PropTypes.arrayOf(PropTypes.shape({
    text: PropTypes.string.isRequired,
    completed: PropTypes.bool.isRequired
  })),
  visibilityFilter: PropTypes.oneOf([
    'SHOW_ALL',
    'SHOW_COMPLETED',
    'SHOW_ACTIVE'
  ]).isRequired
};

function selectTodos(todos, filter) {
  switch (filter) {
  case VisibilityFilters.SHOW_ALL:
    return todos;
  case VisibilityFilters.SHOW_COMPLETED:
    return todos.filter(todo => todo.completed);
  case VisibilityFilters.SHOW_ACTIVE:
    return todos.filter(todo => !todo.completed);
  }
}

function select(state) {
  return {
    visibleTodos: selectTodos(state.todos, state.visibilityFilter),
    visibilityFilter: state.visibilityFilter
  };
}

// Wrap the component to inject dispatch and state into it
export default connect(select)(App);
```

In the above example, `select` calls `selectTodos` to calculate `visibleTodos`. This works great, but there is a drawback: `visibleTodos` is calculated every time the component is updated. If the state tree is large, or the calculation expensive, repeating the calculation on every update may cause performance problems. Reselect can help to avoid these unnecessary recalculations.

### Creating a Memoized Selector

We would like to replace `select` with a memoized selector that recalculates `visibleTodos` when the value of `state.todos` or `state.visibilityFilter` changes, but not when changes occur in other (unrelated) parts of the state tree.

Reselect provides a function `createSelector` for creating memoized selectors. `createSelector` takes an array of input-selectors and a transform function as its arguments. If the Redux state tree is mutated in a way that causes the value of an input-selector to change, the selector will call its transform function with the values of the input-selectors as arguments and return the result. If the values of the input-selectors are the same as the previous call to the selector, it will return the previously computed value instead of calling the transform function.

Let's define a memoized selector named `visibleTodosSelector` to replace `select`:

#### `selectors/TodoSelectors.js`

```js
import { createSelector } from 'reselect';
import { VisibilityFilters } from './actions';

function selectTodos(todos, filter) {
  switch (filter) {
  case VisibilityFilters.SHOW_ALL:
    return todos;
  case VisibilityFilters.SHOW_COMPLETED:
    return todos.filter(todo => todo.completed);
  case VisibilityFilters.SHOW_ACTIVE:
    return todos.filter(todo => !todo.completed);
  }
}

const visibilityFilterSelector = state => state.visibilityFilter;
const todosSelector = state => state.todos;

export const visibleTodosSelector = createSelector(
  visibilityFilterSelector,
  todosSelector,
  (visibilityFilter, todos) => {
    return {
      visibleTodos: selectTodos(todos, visibilityFilter),
      visibilityFilter
    };
  }
);
```

In the example above, `visibilityFilterSelector` and `todosSelector` are input-selectors. They are created as ordinary non-memoized selector functions because they do not transform the data they select. `visibleTodosSelector` on the other hand is a memoized selector. It takes `visibilityFilterSelector` and `todosSelector` as input-selectors, and a transform function that calculates the filtered todos list.

### Composing Selectors

A memoized selector can itself be an input-selector to another memoized selector. Here is `visibleTodosSelector` being used as an input-selector to a selector that further filters the todos by keyword:

```js
const keywordSelector = state => state.keyword;

const keywordFilterSelector = createSelector(
  [visibleTodosSelector, keywordSelector],
  (visibleTodos, keyword) => visibleTodos.filter(
    todo => todo.indexOf(keyword) > -1
  )
);
```

### Connecting a Selector to the Redux Store

If you are using React Redux, you connect a memoized selector to the Redux store using `connect`:

#### `containers/TodoApp.js`

```js
import React, { Component, PropTypes } from 'react';
import { connect } from 'react-redux';
import { addTodo, completeTodo, setVisibilityFilter } from '../actions';
import AddTodo from '../components/AddTodo';
import TodoList from '../components/TodoList';
import Footer from '../components/Footer';
import { visibleTodosSelector } from '../selectors/todoSelectors.js';

class App extends Component {
  render() {
    // Injected by connect() call:
    const { dispatch, visibleTodos, visibilityFilter } = this.props;
    return (
      <div>
        <AddTodo
          onAddClick={text =>
            dispatch(addTodo(text))
          } />
        <TodoList
          todos={this.props.visibleTodos}
          onTodoClick={index =>
            dispatch(completeTodo(index))
          } />
        <Footer
          filter={visibilityFilter}
          onFilterChange={nextFilter =>
            dispatch(setVisibilityFilter(nextFilter))
          } />
      </div>
    );
  }
}

App.propTypes = {
  visibleTodos: PropTypes.arrayOf(PropTypes.shape({
    text: PropTypes.string.isRequired,
    completed: PropTypes.bool.isRequired
  })),
  visibilityFilter: PropTypes.oneOf([
    'SHOW_ALL',
    'SHOW_COMPLETED',
    'SHOW_ACTIVE'
  ]).isRequired
};

// Pass the selector to the connect component
export default connect(visibleTodosSelector)(App);
```

### Accessing React Props in Selectors

#### `index.js`

A selector hooked up to `connect` can also access the props of the component wrapped by `connect`. In the following example, `App` takes a prop that limits the maximum number of Todos that are displayed at any one time.

```js
import React from 'react';
import { createStore } from 'redux';
import { Provider } from 'react-redux';
import App from './containers/App';
import todoApp from './reducers';

let store = createStore(todoApp);

let rootElement = document.getElementById('root');
React.render(
  // The child must be wrapped in a function
  // to work around an issue in React 0.13.
  <Provider store={store}>
    {() => <App maxTodos={5}/>}
  </Provider>,
  rootElement
);
```

Props are passed as the second argument to selectors hooked up to `connect`. `maxTodosSelector` ignores the state argument and returns `props.maxTodos` for use in the result function.

```js
import { createSelector } from 'reselect';
import { VisibilityFilters } from './actions';

function selectTodos(todos, filter) {
  switch (filter) {
  case VisibilityFilters.SHOW_ALL:
    return todos;
  case VisibilityFilters.SHOW_COMPLETED:
    return todos.filter(todo => todo.completed);
  case VisibilityFilters.SHOW_ACTIVE:
    return todos.filter(todo => !todo.completed);
  }
}

const visibilityFilterSelector = state => state.visibilityFilter;
const todosSelector = state => state.todos;
const maxTodosSelector = (_, props) => props.maxTodos;

export const visibleTodosSelector = createSelector(
  visibilityFilterSelector, 
  todosSelector,
  maxTodosSelector,
  (visibilityFilter, todos, maxTodos) => {
    const visibleTodos = selectTodos(todos, visibilityFilter).slice(0, maxTodos);
    return {
      visibleTodos,
      visibilityFilter
    };
  }
);
```

## API

### createSelector(...inputSelectors, resultFn)
### createSelector([inputSelectors], resultFn)

Takes a variable number or array of selectors whose values are computed and passed as arguments to `resultFn`.

`createSelector` has been designed to work with immutable data.

`createSelector` determines if the value returned by an input selector has changed between calls using reference equality (`===`). Inputs to selectors created with `createSelector` should be immutable.

Selectors created with `createSelector` have a cache size of 1. This means they always recalculate when the value of an input selector changes, as a selector only stores the preceding value of each input selector.

```js
const mySelector = createSelector(
  state => state.values.value1,
  state => state.values.value2,
  (value1, value2) => value1 + value2
);

// You can also pass an array of selectors
const totalSelector = createSelector(
  [
    state => state.values.value1,
    state => state.values.value2
  ],
  (value1, value2) => value1 + value2
);

// A selector's dependencies also receive props when using React Redux's connect decorator
const selectorWithProps = createSelector(
  state => state.values.value,
  (state, props) => props.value,
  (valueFromState, valueFromProps) => valueFromState + valueFromProps;
);
```

### defaultMemoizeFunc(func, valueEquals = defaultValueEquals)

`defaultMemoizeFunc` memoizes the function passed in the func parameter.

`defaultMemoizeFunc` (and by extension `createSelector`) has been designed to work with immutable data.

`defaultMemoizeFunc` determines if an argument has changed by calling the valueEquals function. The `valueEquals` function is configurable. By default it checks for changes using reference equality:

```js
function defaultValueEquals(currentVal, previousVal) {
  return currentVal === previousVal;
}
```

`defaultMemoizeFunc` has a cache size of 1. This means it always recalculates when an argument changes, as it only stores the result for preceding value of the argument.


### createSelectorCreator(memoizeFunc, ...memoizeOptions)

`createSelectorCreator` can be used to make a custom `createSelector`.

`memoizeFunc` is a a memoization function to replace `defaultMemoizeFunc`.

`...memoizeOptions` is a variadic number of configuration options that will be passsed to `memoizeFunc` inside `createSelectorSelector`:

```js

memoizedResultFunc = memoizeFunc(funcToMemoize, ...memoizeOptions);

```

Here are some example of using `createSelectorCreator`:

#### Customize `valueEquals` for `defaultMemoizeFunc`

```js
import { createSelectorCreator, defaultMemoizeFunc } from 'reselect';
import isEqual from 'lodash.isEqual';

// create a "selector creator" that uses lodash.isEqual instead of ===
const createDeepEqualSelector = createSelectorCreator(
  defaultMemoizeFunc,
  isEqual
);

// use the new "selector creator" to create a selector
const mySelector = createDeepEqualSelector(
  state => state.values.filter(val => val < 5),
  values => values.reduce((acc, val) => acc + val, 0)
);
```

#### Use memoize function from lodash for an unbounded cache

```js
import { createSelectorCreator } from 'reselect';
import memoize from 'lodash.memoize';


let called = 0;
const customSelectorCreator = createSelectorCreator(memoize, JSON.stringify);
const selector = customSelectorCreator(
  state => state.a,
  state => state.b,
  (a, b) => {
    called++;
    return a + b;
  }
);
assert.equal(selector({a: 1, b: 2}), 3);
assert.equal(selector({a: 1, b: 2}), 3);
assert.equal(called, 1);
assert.equal(selector({a: 2, b: 3}), 5);
assert.equal(called, 2);
```

## FAQ

### Q: Why isn't my selector recomputing when the input state changes?

A: Check that your memoization function is compatible with your state update function (ie the reducer if you are using Redux). For example, a selector created with `createSelector` will not work with a state update function that mutates an existing object instead of creating a new one each time. As `createSelector` uses `===` to check if an input has changed, the selector will never recompute because the identity of the object never changes. Note that if you are using Redux, mutating the state object is **highly** discouraged and [almost certainly a mistake](http://rackt.github.io/redux/docs/Troubleshooting.html).

The following example defines a simple selector that determines if the first todo item in an array of todos has been completed:

```js
const isFirstTodoCompleteSelector = createSelector(
  state => state.todos[0],
  todo => todo && todo.completed
);
```

The following example **will not** work with `isFirstTodoCompleteSelector`:

```js
export default function todos(state = initialState, action) {
  switch (action.type) {
  case COMPLETE_ALL:
    const areAllMarked = state.every(todo => todo.completed);
    // BAD: mutating an existing object
    return state.map(todo => {
      todo.completed = !areAllMarked;
      return todo;
    });

  default:
    return state;
  }
}
```

The following example **will** work with `isFirstTodoCompleteSelector`:

```js
export default function todos(state = initialState, action) {
  switch (action.type) {
  case COMPLETE_ALL:
    const areAllMarked = state.every(todo => todo.completed);
    // GOOD: returning a new object each time with Object.assign
    return state.map(todo => Object.assign({}, todo, {
      completed: !areAllMarked
    }));

  default:
    return state;
  }
}
```

### Q: Why is my selector recomputing when the input state stays the same?

A: Check that your memoization funtion is compatible with your state update function (ie the reducer if you are using Redux). For example, a selector created with `createSelector` that recomputes unexpectedly may be receiving a new object whether the values it contains have updated or not. As `createSelector` uses `===` to check if an input has changed, the selector will always recompute.

```js
import { REMOVE_OLD } from '../constants/ActionTypes';

const initialState = [{
  text: 'Use Redux',
  completed: false,
  id: 0,
  timestamp: Date.now()
}];

export default function todos(state = initialState, action) {
  switch (action.type) {
  case REMOVE_OLD:
    return state.filter(todo => {
      return todo.timestamp + 30 * 24 * 60 * 60 * 1000 > Date.now();
    });
  default:
    return state;
  }
}
```

The following selector is going to recompute every time REMOVE_OLD is invoked because Array.filter always returns a new object. However, in the majority of cases the the REMOVE_OLD action will not change the list of todos so the recomputation is unnecessary.

```js
import { createselector } from 'reselect';

const todosSelector = state => state.todos;

export const visibletodosselector = createselector(
  todosselector,
  (todos) => {
    ...
  }
);
```

You can eliminate unnecessary recomputations by returning a new object from the state update function only when a deep equality check has found that the list of todos has actually changed:

```js
import { REMOVE_OLD } from '../constants/ActionTypes';
import isEqual from 'lodash.isEqual';

const initialState = [{
  text: 'Use Redux',
  completed: false,
  id: 0,
  timestamp: Date.now()
}];

export default function todos(state = initialState, action) {
  switch (action.type) {
  case REMOVE_OLD:
    const updatedState =  state.filter(todo => {
      return todo.timestamp + 30 * 24 * 60 * 60 * 1000 > Date.now();
    });
    return isEqual(updatedState, state) ? state : updatedState;
  default:
    return state;
  }
}
```

Alternatively, the default `valueEquals` function in the selector can be replaced by a deep equality check:

```js
import { createSelectorCreator, defaultMemoizeFunc } from 'reselect';
import isEqual from 'lodash.isEqual';

const todosSelector = state => state.todos;

// create a "selector creator" that uses lodash.isEqual instead of ===
const createDeepEqualSelector = createSelectorCreator(
  defaultMemoizeFunc,
  isEqual
);

// use the new "selector creator" to create a selector
const mySelector = createDeepEqualSelector(
  todosSelector,
  (todos) => {
    ...
  }
);
```

Always check that the cost of an alernative `valueEquals` function or a deep equals check in the state update function is not greater than the cost of recomputing every time. Furthermore, if recomputing every time is the better option, you should think about whether Reselect is giving you any benefit over passing a plain `mapStateToProps` function to `connect`.

### Q: Can I use Reselect without Redux?

A: Yes. Reselect has no dependencies on any other package, so although it was designed to be used with Redux it can be used independently. It is currently being used successfully in traditional Flux apps.

> If you create selectors using `createSelector` make sure the objects in your store are immutable.
> See [here](#createselectorinputselectors-resultfn)

### Q: How do I create a selector that takes an argument?

A: Creating a factory function may be helpful:

```js
const expensiveItemSelectorFactory = minValue => {
  return createSelector(
    shopItemsSelector,
    items => items.filter(item => item.value < minValue)
  );
}

const subtotalSelector = createSelector(
  expensiveItemSelectorFactory(200),
  items => items.reduce((acc, item) => acc + item.value, 0)
);
```

### Q: The default memoization function is rubbish, can I use a different one? 

A: We think it works great for a lot of use cases, but sure. See [this example](#customize-valueequals-for-defaultmemoizefunc).

### Q: The default memoization cache size of 1 is rubbish, can I increase it? 

A: We think it works great for a lot of use cases, but sure. Check out [this example](#use-memoize-function-from-lodash-for-an-unbounded-cache).

### Q: How do I test a selector?

A: For a given input, a selector should always produce the same output. For this reason they are simple to unit test.

```js
const selector = createSelector(
  state => state.a,
  state => state.b,
  (a, b) => ({
    c: a * 2,
    d: b * 3
  })
);

test("selector unit test", function() {
  assert.deepEqual(selector({a: 1, b: 2}), {c: 2, d: 6});
  assert.deepEqual(selector({a: 2, b: 3}), {c: 4, d: 9});
});
```

It may also be useful to check that the memoization function for a selector works correctly with the state update function (ie the reducer if you are using Redux). Each selector has a `recomputations` method that will return the number of times it has been recomputed:

```js
suite('selector', () => {
  let state = {a: 1, b: 2};

  const reducer = (state, action) => (
    {
      a: action(state.a),
      b: action(state.b)
    }
  );

  const selector = createSelector(
    state => state.a,
    state => state.b,
    (a, b) => ({
      c: a * 2,
      d: b * 3
    })
  );

  const plusOne = x => x + 1;
  const id = x => x;

  test("selector unit test", function() {
    state = reducer(state, plusOne);
    assert.deepEqual(selector(state), {c: 4, d: 9});
    state = reducer(state, id);
    assert.deepEqual(selector(state), {c: 4, d: 9});
    assert.equal(selector.recomputations(), 1);
    state = reducer(state, plusOne);
    assert.deepEqual(selector(state), {c: 6, d: 12});
    assert.equal(selector.recomputations(), 2);
  });
});
```

### Q: How do I use Reselect with Immutable.js?

A: Selectors created with `createSelector` should work just fine with Immutable.js data structures.

If your selector is recomputing and you don't think the state has changed, make sure you are aware of which Immutable.js update methods **always** return a new object and which update methods only return a new object **when the collection actually changes**.

```js
import Immutable from 'immutable';

let myMap = Immutable.Map({
  a: 1,
  b: 2,
  c: 3
});

let newMap = myMap.set('a', 1); // set, merge and others only return a new obj when update changes collection
assert.equal(myMap, newMap);
newMap = myMap.merge({'a', 1});
assert.equal(myMap, newMap);
newMap = myMap.map(a => a * 1); // map, reduce, filter and others always return a new obj
assert.notEqual(myMap, newMap);
```

If a selector's input is updated by an operation that always returns a new object, it may be performing unnecessary recomputations. See [here](#q-why-is-my-selector-recomputing-when-the-input-state-stays-the-same) for a discussion on the pros and cons of using a deep equality check like `Immmutable.is` to eliminate unnecessary recomputations.

## License

MIT
