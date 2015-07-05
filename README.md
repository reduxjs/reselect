# reselect
Simple Selector library for Redux inspired by [nuclear.js](https://github.com/optimizely/nuclear-js.git) and [re-frame](https://github.com/Day8/re-frame).

## Installation
    npm install proxyquireify

## Example

Store

```Javascript
const initialState = {
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
};

export default function todos(state = initialState, action) {
  switch (action.type) {
  
  ...
  
  default:
    return state;
  }
}
```

Smart/Container Component

```Javascript
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
  [taxSelector, subtotalSelector],
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
