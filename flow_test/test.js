/* @flow */
const reselect = require('reselect');

const { createSelector } = reselect;

const s = createSelector(
  (state: {x: number}) : number => state.x,
  (state: {y: number}) : number => state.y,
  (x: number, y: number) => {
    return x + y
  }
)

const a = s({x: 100, y: 200})
