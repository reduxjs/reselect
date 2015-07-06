# reselect
Simple "selector" library for Redux inspired by getters in [nuclear.js](https://github.com/optimizely/nuclear-js.git) and [subscriptions](https://github.com/Day8/re-frame#just-a-read-only-cursor) in [re-frame](https://github.com/Day8/re-frame).

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

const shopItemSelector = createSelector(state => state.shop.items);

const subtotalSelector = createSelector(
  shopItemSelector,
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

##API Documentation

###createSelector

###createSelectorCreator
