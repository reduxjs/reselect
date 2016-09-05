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
type Test1State = {
  x: number,
  y: number
};

const test1Selector = createSelector(
  (state: Test1State) => state.x,
  (state: Test1State) => state.y,
  (x, y) => {
    return x + y
  }
)({x: 100, y: 200})
// END TEST

// TEST: Should pass for 2 selectors given as array
type Test2State = {
  x: number,
  y: number
};

createSelector(
  [
    (state: Test2State) => state.x,
    (state: Test2State) => state.y
  ] ,
  (x, y) => {
    return x + y
  }
)({x: 100, y: 200})
// END TEST


// TEST: Should pass when selectors have additional Props argument
type Test3State = {
  x: number,
  y: number
};

type Test3Props = {
  x: number
};

createSelector(
  (state: Test3State, props: Test3Props) => state.x + props.x,
  (state: Test3State, props: Test3Props) => state.y + props.x,
  (x, y) => {
    return x + y
  }
)({x: 100, y: 200}, {
  x: 10
});
// END TEST

// TEST: Should pass for additional arguments
type Test4State = {
  x: number,
  y: number
};

type Test4Props = {
  x: number
};

createSelector(
  (state: Test4State, props: Test4Props, test) => state.x + props.x + test,
  (state: Test4State, props: Test4Props, test) => state.y + props.x + test,
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

x({
  d: 10,
  c: 20
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
