# reselect
Simple "selector" library for Redux inspired by getters in [nuclear.js](https://github.com/optimizely/nuclear-js.git), [subscriptions](https://github.com/Day8/re-frame#just-a-read-only-cursor) in [re-frame](https://github.com/Day8/re-frame) and this [proposal](https://github.com/gaearon/redux/pull/169) from [speedskater](https://github.com/speedskater).

* Selectors can compute derived data, allowing Redux to store the minimal possible state.
* Selectors are efficient. A selector is not recomputed unless one of its arguments change.
* Selectors are composable. They can be used as input to other selectors. 

## Installation
    npm install reselect

## Example

```Javascript

/* 
Data in the Redux store has the following form:

store: {
  shop: {
    items: [
      {
        name: 'Item 1',
        value: 100
      },
      {
        name: 'Item 2',
        value: 200
      },
      {
        name: 'Item 3',
        value: 300
      }
    ],
    taxPercent: 20
  }
}
*/

import React from 'react';
import { createSelector } from 'reselect';
import { connect } from 'redux/react';

const subtotalSelector = createSelector(
  [state => state.shop.items],
  items => items.reduce((acc, item) => acc + item.value, 0)
);

const taxSelector = createSelector(
  [subtotalSelector, state => state.shop.taxPercent],
  (subtotal, taxPercent) => subtotal * (taxPercent / 100)
);

const totalSelector = createSelector(
  [subtotalSelector, taxSelector],
  (subtotal, tax) => { return {total: subtotal + tax}}
);

@connect(totalSelector)
class Total extends React.Component {
  render() {
    return <div>{ this.props.total }</div>
  }
}

export default Total;
```

## API Documentation

### createSelector([inputSelectors], resultFn)

Takes an array of selectors whose values are computed and passed as arguments to resultFn.
```js

const mySelector = createSelector(
  [
    state => state.values.value1,
    state => state.values.value2
  ],
  (value1, value2) => value1 + value2
);

// it is not necessary to wrap a single input selector in an array
const totalSelector = createSelector(
  state => state.shop.items,
  items => items.reduce((acc, item) => acc + item.value, 0)
);

```
### createSelectorCreator(valueEqualsFn)
Allows the user to specify the function used to check if the arguments to a selector have changed
```js
// state.values = Immutable.List([1,2,3,4,5,6,7,8,9,10]);

const immutableCreateSelector = createSelectorCreator(Immutable.is);

const mySelector = immutableCreateSelector(
  [state => state.values.filter(val => val < 5)],
  values => values.reduce((acc, val) => acc + val, 0)
);
```
