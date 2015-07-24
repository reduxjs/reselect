# reselect
Simple "selector" library for Redux inspired by getters in [NuclearJS](https://github.com/optimizely/nuclear-js.git), [subscriptions](https://github.com/Day8/re-frame#just-a-read-only-cursor) in [re-frame](https://github.com/Day8/re-frame) and this [proposal](https://github.com/gaearon/redux/pull/169) from [speedskater](https://github.com/speedskater).

* Selectors can compute derived data, allowing Redux to store the minimal possible state.
* Selectors are efficient. A selector is not recomputed unless one of its arguments change.
* Selectors are composable. They can be used as input to other selectors. 

## Installation
    npm install reselect

## Example

### Selector Definitions
selectors/ShopSelectors.js
```Javascript

/* 
The data in the Redux store has the following shape:

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

import { createSelector } from 'reselect';

/*
 * Definition of simple selectors. 
 * Simple selectors should be used to abstract away the structure
 * of the store in cases where no calculations are needed 
 * and memoization wouldn't provide any benefits.
 */
const shopItemsSelector = state => state.shop.items;
const taxPercentSelector = state => state.shop.taxPercent;

/* 
 * Definition of combined selectors. 
 * In the subsequent examples selectors are combined to derive new information. 
 * To prevent expensive recalculation of these selectors memoization is applied. 
 * Hence, these selectors are only recomputed whenever their input selectors change. 
 * In all other cases the precomputed values are returned.
 */
const subtotalSelector = createSelector(
  [shopItemsSelector],
  items => items.reduce((acc, item) => acc + item.value, 0)
);

const taxSelector = createSelector(
  [subtotalSelector, taxPercentSelector],
  (subtotal, taxPercent) => subtotal * (taxPercent / 100)
);

export const totalSelector = createSelector(
  [subtotalSelector, taxSelector],
  (subtotal, tax) => { return {total: subtotal + tax}}
);
```

### Selector Usage

```Javascript

import React from 'react';
import { connect } from 'redux/react';

/*
 * Import the selector defined in the example above.
 * This allows your to separate your components from the structure of your stores.
 */
import { totalSelector } from 'selectors/ShopSelectors';

/*
 * Bind the totalSelector on the Total component.
 * The keys of the selector result are bound to the corresponding component props.
 * In our example there is the 'total' key which is bound to this.props.total
 */
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
Return a selectorCreator that creates selectors with a non-default valueEqualsFn. The valueEqualsFn is used to check if the arguments to a selector have changed. The default valueEqualsFn function is:
```js
function defaultValueEquals(a, b) {
  return a === b;
}
```
```js
// create a "selector creator" that uses Immutable.is instead of ===
const immutableCreateSelector = createSelectorCreator(Immutable.is);

// use the new "selector creator" to create a 
// selector (state.values is an Immutable.List)
const mySelector = immutableCreateSelector(
  [state => state.values.filter(val => val < 5)],
  values => values.reduce((acc, val) => acc + val, 0)
);
```
