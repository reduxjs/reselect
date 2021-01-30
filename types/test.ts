import {
  createSelector,
  defaultMemoize,
  createSelectorCreator,
  createStructuredSelector,
  Selector,
} from '../src/index';

function testSelector() {
  type State = {foo: string};

  const selector = createSelector(
    (state: State) => state.foo,
    (foo) => foo,
  );

  const res = selector.resultFunc('test');
  selector.recomputations();
  selector.resetRecomputations();

  const foo: string = selector({foo: 'bar'});

  // $ExpectError
  selector({foo: 'bar'}, {prop: 'value'});

  // $ExpectError
  const num: number = selector({foo: 'bar'});

  // allows heterogeneous parameter type input selectors
  createSelector(
    (state: {foo: string}) => state.foo,
    (state: {bar: number}) => state.bar,
    (foo, bar) => 1
  );
}

function testNestedSelector() {
  type State = {foo: string, bar: number, baz: boolean};

  const selector = createSelector(
    createSelector(
      (state: State) => state.foo,
      (state: State) => state.bar,
      (foo, bar) => ({foo, bar}),
    ),
    (state: State) => state.baz,
    ({foo, bar}, baz) => {
      const foo1: string = foo;
      // $ExpectError
      const foo2: number = foo;

      const bar1: number = bar;
      // $ExpectError
      const bar2: string = bar;

      const baz1: boolean = baz;
      // $ExpectError
      const baz2: string = baz;
    },
  )
}

function testSelectorAsCombiner() {
  type SubState = {foo: string};
  type State = {bar: SubState};

  const subSelector = createSelector(
    (state: SubState) => state.foo,
    foo => foo,
  );

  const selector = createSelector(
    (state: State) => state.bar,
    subSelector,
  );

  // $ExpectError
  selector({foo: ''});

  // $ExpectError
  const n: number = selector({bar: {foo: ''}});

  const s: string = selector({bar: {foo: ''}});
}

type Component<P> = (props: P) => any;

declare function connect<S, R, P>(selector: Selector<S, R, P[]>):
  (component: Component<R & S & ([P] extends [never] ? {} : P)>) => Component<P>;

function testConnect() {
  connect(
    createSelector(
      (state: {foo: string}) => state.foo,
      foo => ({changeUp: foo}),
    )
  )(props => {
    // $ExpectError
    props.bar;

    const foo: string = props.changeUp;
  });

  const connected = connect(
    createSelector(
      (state: {foo: string}) => state.foo,
      (state: {foo: string}, props: {bar: number}) => props.bar,
      (foo, bar) => ({foo, baz: !!bar}),
    )
  )(props => {
    const foo: string = props.foo;
    const bar: number = props.bar;
    const baz: boolean = props.baz;
    // $ExpectError
    props.fizz;
  });

  connected({bar: 42});

  // $ExpectError
  connected({bar: 42, baz: 123});
}

function testInvalidTypeInCombinator() {
  // $ExpectError
  createSelector(
    (state: {foo: string}) => state.foo,
    (foo: number) => foo,
  );

  createSelector(
    // $ExpectError
    (state: {foo: string, bar: number, baz: boolean}) => state.foo,
    state => state.bar,
    state => state.baz,
    (foo: string, bar: number, baz: boolean, fizz: string) => {}
  );

  // does not allow heterogeneous parameter type
  // selectors when the combinator function is typed differently
  createSelector(
    (state: {testString: string}) => state.testString,
    (state: {testNumber: number}) => state.testNumber,
    (state: {testBoolean: boolean}) => state.testBoolean,
    (state: {testString: string}) => state.testString,
    (state: {testString: string}) => state.testString,
    (state: {testString: string}) => state.testString,
    (state: {testString: string}) => state.testString,
    (state: {testNumber: string}) => state.testNumber,
    (state: {testStringArray: string[]}) => state.testStringArray,
    // $ExpectError
    (foo1: string, foo2: number, foo3: boolean, foo4: string, foo5: string, foo6: string, foo7: string, foo8: number, foo9: string[]) => {
      return {foo1, foo2, foo3, foo4, foo5, foo6, foo7, foo8, foo9};
    });

  // does not allow a large array of heterogeneous parameter type
  // selectors when the combinator function is typed differently
  // $ExpectError
  createSelector(
    [
      (state: {testString: string}) => state.testString,
      (state: {testNumber: number}) => state.testNumber,
      (state: {testBoolean: boolean}) => state.testBoolean,
      (state: {testString: string}) => state.testString,
      (state: {testString: string}) => state.testString,
      (state: {testString: string}) => state.testString,
      (state: {testString: string}) => state.testString,
      (state: {testNumber: string}) => state.testNumber,
      (state: {testStringArray: string[]}) => state.testStringArray,
    ], (foo1, foo2, foo3, foo4, foo5, foo6, foo7, foo8: number, foo9: string[]) => {
      return {foo1, foo2, foo3, foo4, foo5, foo6, foo7, foo8, foo9};
    });
}

function testParametricSelector() {
  type State = {foo: string;};
  type Props = {bar: number};

  // allows heterogeneous parameter type selectors
  const heterogeneousSelector = createSelector(
    (state: {testString: string}) => state.testString,
    (state: {testNumber: number}) => state.testNumber,
    (state: {testBoolean: boolean}) => state.testBoolean,
    (state: {testString: string}) => state.testString,
    (state: {testString: string}) => state.testString,
    (state: {testString: string}) => state.testString,
    (state: {testString: string}) => state.testString,
    (state: {testString: string}) => state.testString,
    (state: {testStringArray: string[]}) => state.testStringArray,
    (foo1: string, foo2: number, foo3: boolean, foo4: string, foo5: string, foo6: string, foo7: string, foo8: string, foo9: string[]) => {
      return {foo1, foo2, foo3, foo4, foo5, foo6, foo7, foo8, foo9};
    },
  );

  heterogeneousSelector({testString: 'foo', testBoolean: true, testNumber: 2})

  const selector = createSelector(
    (state: State) => state.foo,
    (state: State, props: Props) => props.bar,
    (foo, bar) => ({foo, bar}),
  );

  // $ExpectError
  selector({foo: 'fizz'});
  // $ExpectError
  selector({foo: 'fizz'}, {bar: 'baz'});

  const ret = selector({foo: 'fizz'}, {bar: 42});
  const foo: string = ret.foo;
  const bar: number = ret.bar;

  const selector2 = createSelector(
    (state: any) => state.foo,
    (state: any) => state.foo,
    (state: any) => state.foo,
    (state: any) => state.foo,
    (state: any) => state.foo,
    (state: State, props: Props) => props.bar,
    (foo1, foo2, foo3, foo4, foo5, bar) => ({
      foo1, foo2, foo3, foo4, foo5, bar,
    }),
  );

  selector2({foo: 'fizz'}, {bar: 42});
}

function testArrayArgument() {
  const selector = createSelector([
    (state: {foo: string}) => state.foo,
    (state: {foo: string}) => state.foo,
    (state, props: {bar: number}) => props.bar,
  ], (foo1, foo2, bar) => ({foo1, foo2, bar}));

  const ret = selector({foo: 'fizz'}, {bar: 42});
  const foo1: string = ret.foo1;
  const foo2: string = ret.foo2;
  const bar: number = ret.bar;

  // $ExpectError
  createSelector([
    (state: {foo: string}) => state.foo,
  ]);

  // $ExpectError
  createSelector([
    (state: {foo: string}) => state.foo,
    (state: {foo: string}) => state.foo,
  ], (foo: string, bar: number) => {});

  createSelector([
    (state: {foo: string}) => state.foo,
    (state: {foo: string}) => state.foo,
    (state: {foo: string}) => state.foo,
    (state: {foo: string}) => state.foo,
    (state: {foo: string}) => state.foo,
    (state: {foo: string}) => state.foo,
    (state: {foo: string}) => state.foo,
    (state: {foo: string}) => state.foo,
    (state: {foo: string}) => state.foo,
    (state: {foo: string}) => state.foo,
  ], (foo1: string, foo2: string, foo3: string, foo4: string, foo5: string,
      foo6: string, foo7: string, foo8: string, foo9: string, foo10: string) => {

  });

  // $ExpectError
  createSelector([
    (state: {foo: string}) => state.foo,
    (state: {foo: string}) => state.foo,
    (state: {foo: string}) => state.foo,
    (state: {foo: string}) => state.foo,
    (state: {foo: string}) => state.foo,
    (state: {foo: string}) => state.foo,
    (state: {foo: string}) => state.foo,
    (state: {foo: string}) => state.foo,
    (state: {foo: string}) => state.foo,
    (state: {foo: string}) => state.foo,
  ], (foo1, foo2, foo3, foo4, foo5, foo6, foo7, foo8: number, foo9, foo10) => {

  });

  // $ExpectError
  createSelector([
    (state: {foo: string}) => state.foo,
    state => state.foo,
    state => state.foo,
    state => state.foo,
    state => state.foo,
    state => state.foo,
    state => state.foo,
    state => state.foo,
    1,
  ], (foo1, foo2, foo3, foo4, foo5, foo6, foo7, foo8, foo9) => {});

  const selector2 = createSelector([
    (state: {foo: string}) => state.foo,
    (state: {foo: string}) => state.foo,
    (state: {foo: string}) => state.foo,
    (state: {foo: string}) => state.foo,
    (state: {foo: string}) => state.foo,
    (state: {foo: string}) => state.foo,
    (state: {foo: string}) => state.foo,
    (state: {foo: string}) => state.foo,
    (state: {foo: string}) => state.foo,
  ], (foo1: string, foo2: string, foo3: string, foo4: string, foo5: string,
      foo6: string, foo7: string, foo8: string, foo9: string) => {
    return {foo1, foo2, foo3, foo4, foo5, foo6, foo7, foo8, foo9};
  });

  {
    const ret = selector2({foo: 'fizz'});
    const foo1: string = ret.foo1;
    const foo2: string = ret.foo2;
    const foo3: string = ret.foo3;
    const foo4: string = ret.foo4;
    const foo5: string = ret.foo5;
    const foo6: string = ret.foo6;
    const foo7: string = ret.foo7;
    const foo8: string = ret.foo8;
    const foo9: string = ret.foo9;
    // $ExpectError
    ret.foo10;
  }

  // $ExpectError
  selector2({foo: 'fizz'}, {bar: 42});

  const parametric = createSelector([
    (state: {foo: string}, props: {bar: number}) => props.bar,
    (state: {foo: string}) => state.foo,
    (state: {foo: string}) => state.foo,
    (state: {foo: string}) => state.foo,
    (state: {foo: string}) => state.foo,
    (state: {foo: string}) => state.foo,
    (state: {foo: string}) => state.foo,
    (state: {foo: string}) => state.foo,
    (state: {foo: string}) => state.foo,
  ], (bar: number, foo1: string, foo2: string, foo3: string, foo4: string,
      foo5: string, foo6: string, foo7: string, foo8: string) => {
    return {foo1, foo2, foo3, foo4, foo5, foo6, foo7, foo8, bar};
  });

  // allows a large array of heterogeneous parameter type selectors
  const correctlyTypedArraySelector = createSelector([
    (state: {testString: string}) => state.testString,
    (state: {testNumber: number}) => state.testNumber,
    (state: {testBoolean: boolean}) => state.testBoolean,
    (state: {testString: string}) => state.testString,
    (state: {testString: string}) => state.testString,
    (state: {testString: string}) => state.testString,
    (state: {testString: string}) => state.testString,
    (state: {testString: string}) => state.testString,
    (state: {testStringArray: string[]}) => state.testStringArray,
  ], (foo1: string, foo2: number, foo3: boolean, foo4: string, foo5: string,
      foo6: string, foo7: string, foo8: string, foo9: string[]) => {
    return {foo1, foo2, foo3, foo4, foo5, foo6, foo7, foo8, foo9};
  });

  // $ExpectError
  parametric({foo: 'fizz'});

  {
    const ret = parametric({foo: 'fizz'}, {bar: 42});
    const foo1: string = ret.foo1;
    const foo2: string = ret.foo2;
    const foo3: string = ret.foo3;
    const foo4: string = ret.foo4;
    const foo5: string = ret.foo5;
    const foo6: string = ret.foo6;
    const foo7: string = ret.foo7;
    const foo8: string = ret.foo8;
    const bar: number = ret.bar;
    // $ExpectError
    ret.foo9;
  }
}

function testDefaultMemoize() {
  const func = (a: string) => +a;

  const memoized = defaultMemoize(func);

  const ret0: number = memoized('42');
  // $ExpectError
  const ret1: string = memoized('42');

  const memoized2 = defaultMemoize(
    (str: string, arr: string[]): {str: string, arr: string[]} => ({str, arr}),
    <T>(a: T, b: T, index: number) => {
      if (index === 0)
        return a === b;

      return `${a}` === `${b}`;
    }
  );

  const ret2 = memoized2('', ['1', '2']);
  const str: string = ret2.str;
  const arr: string[] = ret2.arr;
}

function testCreateSelectorCreator() {
  const createSelector = createSelectorCreator(defaultMemoize);

  const selector = createSelector(
    (state: {foo: string}) => state.foo,
    foo => foo,
  );
  const value: string = selector({foo: 'fizz'});

  // $ExpectError
  selector({foo: 'fizz'}, {bar: 42});

  const parametric = createSelector(
    (state: {foo: string}) => state.foo,
    (state: any, props: {bar: number}) => props.bar,
    (foo, bar) => ({foo, bar}),
  );

  // $ExpectError
  parametric({foo: 'fizz'});

  const ret = parametric({foo: 'fizz'}, {bar: 42});
  const foo: string = ret.foo;
  const bar: number = ret.bar;

  // $ExpectError
  createSelectorCreator(defaultMemoize, 1);

  createSelectorCreator(defaultMemoize, <T>(a: T, b: T, index: number) => {
    if (index === 0)
      return a === b;

    return `${a}` === `${b}`;
  });
}

function testCreateStructuredSelector() {
  const selector = createStructuredSelector<{foo: string}, {
    foo: string;
    bar: number;
  }>({
    foo: state => state.foo,
    bar: state => +state.foo,
  });

  const res = selector({foo: '42'});
  const foo: string = res.foo;
  const bar: number = res.bar;

  // $ExpectError
  selector({bar: '42'});

  // $ExpectError
  selector({foo: '42'}, {bar: 42});

  createStructuredSelector<{foo: string}, {bar: number}>({
    // $ExpectError
    bar: (state: {baz: boolean}) => 1
  });

  createStructuredSelector<{foo: string}, {bar: number}>({
    // $ExpectError
    bar: state => state.foo
  });

  createStructuredSelector<{foo: string}, {bar: number}>({
    // $ExpectError
    baz: state => state.foo
  });
}

function testDynamicArrayArgument() {
  interface Elem {
    val1: string;
    val2: string;
  }
  const data: ReadonlyArray<Elem> = [{val1: 'a', val2: 'aa'}, {val1: 'b', val2: 'bb'}];

  createSelector(data.map(obj => () => obj.val1), (...vals) => vals.join(','));

  // $ExpectError
  createSelector(data.map(obj => () => obj.val1), (vals) => vals.join(','))

  createSelector(data.map(obj => () => obj.val1), (...vals: string[]) => 0)
  // $ExpectError
  createSelector(data.map(obj => () => obj.val1), (...args: number[]) => 0)

  const s = createSelector(data.map(obj => (state: {}, fld: keyof Elem) => obj[fld]), (...vals) => vals.join(','));
  s({}, 'val1');
  s({}, 'val2');
  // $ExpectError
  s({}, 'val3');
}
