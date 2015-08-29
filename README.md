# Reselect 

Simple "selector" library for Redux inspired by getters in [NuclearJS](https://github.com/optimizely/nuclear-js.git), [subscriptions](https://github.com/Day8/re-frame#just-a-read-only-cursor) in [re-frame](https://github.com/Day8/re-frame) and this [proposal](https://github.com/gaearon/redux/pull/169) from [speedskater](https://github.com/speedskater).

* Selectors can compute derived data, allowing Redux to store the minimal possible state.
* Selectors are efficient. A selector is not recomputed unless one of its arguments change.
* Selectors are composable. They can be used as input to other selectors. 

### Installation
    npm install reselect

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

const visibilityFilterSelector = (state) => state.visibilityFilter;
const todosSelector = (state) => state.todos;

export const visibleTodosSelector = createSelector(
  [visibilityFilterSelector, todosSelector],
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
const keywordSelector = (state) => state.keyword;

const keywordFilterSelector = createSelector(
  [visibleTodosSelector, keywordSelector],
  (visibleTodos, keyword) => visibleTodos.filter(
    todo => todo.indexOf(keyword) > -1
  )
);
```

### Connecting a Selector to the Redux Store

If you are using react-redux, you connect a memoized selector to the Redux store using `connect`:

#### `containers/App.js`

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

### API Documentation

#### createSelector(...inputSelectors, resultFn)
#### createSelector([inputSelectors], resultFn)

Takes a variable number or array of selectors whose values are computed and passed as arguments to `resultFn`.

> `createSelector` uses the default memoize function `defaultMemoizeFunc`. *Explain what that means*

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

// A selector's dependencies also receive props
const selectorWithProps = createSelector(
  state => state.values.value,
  (state, props) => props.value,
  (valueFromState, valueFromProps) => valueFromState + valueFromProps;
);
```

#### defaultMemoizeFunc(func, valueEquals = defaultValueEquals)

`defaultMemoizeFunc` has a cache size of 1. This means it always recalculates when an argument changes, as it only stores the result for immediately preceding value of the argument.

`defaultMemoizeFunc` determines if an argument has changed by calling the valueEquals function. The default `valueEquals` function checks for changes using reference equality:

```js
function defaultValueEquals(currentVal, previousVal) {
  return currentVal === previousVal;
}
```

#### createSelectorCreator(memoizeFunc, ...memoizeOptions)

Return a selectorCreator that creates selectors with a non-default memoizeFunc. 

`...memoizeOptions` is a variadic number of configuration options that will be passsed to `memoizeFunc` inside `createSelectorSelector`:

```js

let memoizedResultFunc = memoizeFunc(resultFunc, ...memoizeOptions);

```
You can use createSelectorCreator to customize the `valueEquals` function for `defaultMemoizeFunc` like this:

```js
import { createSelectorCreator, defaultMemoizeFunc } from 'reselect';
import Immutable from 'immutable';

// create a "selector creator" that uses Immutable.is instead of ===
// Note that this is not usually necessary when using Immutable.js with reselect
const immutableCreateSelector = createSelectorCreator(
  defaultMemoizeFunc,
  Immutable.is
);

// use the new "selector creator" to create a 
// selector (state.values is an Immutable.List)
const mySelector = immutableCreateSelector(
  [state => state.values.filter(val => val < 5)],
  values => values.reduce((acc, val) => acc + val, 0)
);
```

Using the memoize function from lodash for an unbounded cache:

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
###FAQ

Q: How do I create a selector that takes an argument? 

A: You can use a factory function when you need additional arguments for your selectors:

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

TODO: Note about not creating selector every time.

Q: Can I use Reselect with Immutable.js?

A: TODO

Q: How do I test a selector?

A: TODO
