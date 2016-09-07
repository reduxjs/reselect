/* @flow */
const reselect = require('../../src/index');
const {
  createSelector,
  defaultMemoize,
  createSelectorCreator,
  createStructuredSelector
} = reselect;

/*
  TESTS FOR `createSelector`
*/

// TEST: Should not pass when selectors handle different states
type TestState1 = {
  x: number,
  y: number
};

type TestState2 = {
  d: number
};

createSelector(
  (state: TestState1) => state.x,
  (state: TestState2) => state.y,
  (x, y) => {
    return x + y
  }
)({x: 100, y: 200});
// END TEST


createSelector(
  (state, props) => state.x + props.d,
  (state) => state.y,
  (x, y) => {
    return x + y
  }
)({x: 100, y: 200}, { x: 20 });
// END TEST

// TEST: Should not result do not include property
createSelector(
  (state) => state.x,
  (state) => state.y,
  (x, y) => {
    return {
      x,
      y
    }
  }
)({x: 100, y: 200}, { x: 20 }).d;
// END TEST

/*
  TESTS FOR `defaultMemoize`
*/

defaultMemoize((a: number) => a + 1)('');
defaultMemoize((a: number) => a + 1, (a, b) => '')(2);

/*
  TESTS FOR `createSelectorCreator`
*/

// TEST: Should fail when state don't have good properties
createSelectorCreator(defaultMemoize)(
  (state) => state.x,
  (state) => state.y,
  (x, y) => {
    return x + y;
  }
)({
  x: 10,
  d: 20
})
// END TEST


/*
  TESTS FOR `createStructuredSelector`
*/
createStructuredSelector({
  first: (state) => state.d,
  second: (state) => state.y
})({
  x: 10,
  y: 20
})


// Packaging issues
// https://github.com/facebook/nuclide/issues/529
