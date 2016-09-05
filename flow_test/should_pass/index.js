/* @flow */
const reselect = require('reselect');
const {
  createSelector,
  defaultMemoize,
  createSelectorCreator,
  createStructuredSelector
} = reselect;

/*
  TESTS FOR `createSelector`
*/

// TEST: Should pass for 2 selectors given as arguments
type State = {
  x: number,
  y: number
};

const test1Selector = createSelector(
  (state: State) => state.x,
  (state: State) => state.y,
  (x, y) => {
    return x + y
  }
)({x: 100, y: 200})
// END TEST

// TEST: Should pass for 2 selectors given as array
createSelector(
  [
    (state: State) => state.x,
    (state: State) => state.y
  ] ,
  (x, y) => {
    return x + y
  }
)({x: 100, y: 200})
// END TEST


// TEST: Should pass when selectors have additional Props argument
type TestProps = {
  x: number
};

createSelector(
  (state: State, props: TestProps) => state.x + props.x,
  (state: State, props: TestProps) => state.y + props.x,
  (x, y) => {
    return x + y
  }
)({x: 100, y: 200}, {
  x: 10
});
// END TEST

// TEST: Should pass for additional arguments
createSelector(
  (state: State, props: TestProps, test) => state.x + props.x + test,
  (state: State, props: TestProps, test) => state.y + props.x + test,
  (x, y) => {
    return x + y
  }
)({x: 100, y: 200}, {
  x: 10
}, 10);
// END TEST

/*
  TESTS FOR `defaultMemoize`
*/

defaultMemoize((a: number) => a + 1)(2);
defaultMemoize((a: number) => a + 1, (a, b) => a + b)(2);

/*
  TESTS FOR `createSelectorCreator`
*/

// TEST 8: Should threat newly created selector as normal one
let x = createSelectorCreator(defaultMemoize)(
  (state) => state.x,
  (state) => state.y,
  (x, y) => {
    return x + y;
  }
)

x({
  x: 10,
  y: 20
})
// END TEST

/*
  TESTS FOR `createStructuredSelector`
*/
createStructuredSelector({
  first: (state) => state.x,
  second: (state) => state.y
})({
  x: 10,
  y: 20
})
