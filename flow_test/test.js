/* @flow */
const reselect = require('reselect');

const { createSelector } = reselect;

const s = createSelector(
  (state: {x: number}) : number => state.x,
  (state: {y: number}) : number => state.y,
  (x, y) => {
    return x + y
  }
)

const a = s({x: 100, y: "200"})

// Packaging issues
// https://github.com/facebook/nuclide/issues/529
