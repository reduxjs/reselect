import {
  createSelector,
  defaultMemoize,
  createSelectorCreator,
  createStructuredSelector,
  ParametricSelector,
} from '../src/index';



function testSelector() {
  type State = {foo: string};

  const selector = createSelector(
    (state: State) => state.foo,
    (foo) => foo,
  );

  const foo: string = selector({foo: 'bar'});

  // typings:expect-error
  selector({foo: 'bar'}, {prop: 'value'});

  // typings:expect-error
  const num: number = selector({foo: 'bar'});

  // typings:expect-error
  createSelector(
    (state: {foo: string}) => state.foo,
    (state: {bar: number}) => state.bar,
    (foo, bar) => 1
  );
}

type Component<P> = (props: P) => any;

declare function connect<S, P, R>(selector: ParametricSelector<S, P, R>):
  (component: Component<P & R>) => Component<P>;

function testConnect() {
  connect(
    createSelector(
      (state: {foo: string}) => state.foo,
      foo => ({foo}),
    )
  )(props => {
    // typings:expect-error
    props.bar;

    const foo: string = props.foo;
  });

  const connected = connect(
    createSelector(
      (state: {foo: string}) => state.foo,
      (state, props: {bar: number}) => state.bar,
      (foo, bar) => ({foo, baz: bar}),
    )
  )(props => {
    const foo: string = props.foo;
    const bar: number = props.bar;
    const baz: number = props.baz;
    // typings:expect-error
    props.fizz;
  });

  connected({bar: 42});

  // typings:expect-error
  connected({bar: 42, baz: 123});
}

function testInvalidTypeInCombinator() {
  // typings:expect-error
  createSelector(
    (state: {foo: string}) => state.foo,
    (foo: number) => foo,
  );

  // typings:expect-error
  createSelector(
    (state: {foo: string, bar: number, baz: boolean}) => state.foo,
    state => state.bar,
    state => state.baz,
    (foo: string, bar: number, baz: boolean, fizz: string) => {}
  );
}

function testRestParameters() {
  createSelector(
    (state: {foo: string, bar: number}) => state.foo,
    state => state.foo,
    state => state.foo,
    state => state.foo,
    state => state.foo,
    state => state.bar,
    state => state.bar,
    state => state.bar,
    state => state.bar,
    state => state.bar,
    (foo1: string, foo2: string, foo3: string, foo4: string, foo5: string,
     bar1: number, bar2: number, bar3: number, bar4: number, bar5: string) => {
    }
  );
}

function testParametricSelector() {
  type State = {foo: string;};
  type Props = {bar: number};

  const selector = createSelector(
    (state: State) => state.foo,
    (state, props: Props) => props.bar,
    (foo, bar) => ({foo, bar}),
  );

  // typings:expect-error
  selector({foo: 'fizz'});
  // typings:expect-error
  selector({foo: 'fizz'}, {bar: 'baz'});

  const ret = selector({foo: 'fizz'}, {bar: 42});
  const foo: string = ret.foo;
  const bar: number = ret.bar;

  const selector2 = createSelector(
    (state) => state.foo,
    (state) => state.foo,
    (state) => state.foo,
    (state) => state.foo,
    (state) => state.foo,
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
    state => state.foo,
    (state, props: {bar: number}) => props.bar,
  ], (foo1, foo2, bar) => ({foo1, foo2, bar}));

  const ret = selector({foo: 'fizz'}, {bar: 42});
  const foo1: string = ret.foo1;
  const foo2: string = ret.foo2;
  const bar: number = ret.bar;

  // typings:expect-error
  createSelector([
    (state: {foo: string}) => state.foo,
  ]);

  // typings:expect-error
  createSelector([
    (state: {foo: string}) => state.foo,
    (state: {bar: number}) => state.bar,
  ], (foo, bar) => {});

  // typings:expect-error
  createSelector([
    (state: {foo: string}) => state.foo,
    state => state.foo,
  ], (foo: string, bar: number) => {});

  createSelector([
    (state: {foo: string}) => state.foo,
    state => state.foo,
    state => state.foo,
    state => state.foo,
    state => state.foo,
    state => state.foo,
    state => state.foo,
    state => state.foo,
    state => state.foo,
    state => state.foo,
  ], (foo1, foo2, foo3, foo4, foo5, foo6, foo7, foo8, foo9, foo10) => {

  });

  // typings:expect-error
  createSelector([
    (state: {foo: string}) => state.foo,
    state => state.foo,
    state => state.foo,
    state => state.foo,
    state => state.foo,
    state => state.foo,
    state => state.foo,
    state => state.foo,
    state => state.foo,
    state => state.foo,
  ], (foo1, foo2, foo3, foo4, foo5, foo6, foo7, foo8: number, foo9, foo10) => {

  });

  // typings:expect-error
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
    state => state.foo,
    state => state.foo,
    state => state.foo,
    state => state.foo,
    state => state.foo,
    state => state.foo,
    state => state.foo,
    state => state.foo,
  ], (foo1, foo2, foo3, foo4, foo5, foo6, foo7, foo8, foo9) => {
    return {foo1, foo2, foo3, foo4, foo5, foo6, foo7, foo8, foo9};
  });

  selector2({foo: 'fizz'});

  // typings:expect-error
  selector2({foo: 'fizz'}, {bar: 42});

  const parametric = createSelector([
    (state: {foo: string}) => state.foo,
    state => state.foo,
    state => state.foo,
    state => state.foo,
    state => state.foo,
    state => state.foo,
    state => state.foo,
    state => state.foo,
    (state, props: {bar: number}) => props.bar,
  ], (foo1, foo2, foo3, foo4, foo5, foo6, foo7, foo8, bar) => {
    return {foo1, foo2, foo3, foo4, foo5, foo6, foo7, foo8, bar};
  });

  // typings:expect-error
  parametric({foo: 'fizz'});

  parametric({foo: 'fizz'}, {bar: 42});
}

function testDefaultMemoize() {
  const func = (a: string) => +a;

  const memoized = defaultMemoize(func);

  const ret0: number = memoized('42');
  // typings:expect-error
  const ret1: string = memoized('42');

  const memoized2 = defaultMemoize(
    (str: string, arr: string[]) => ({str, arr}),
    (a, b, index) => {
      if (index === 0)
        return a === b;

      return a.toString() === b.toString();
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

  // typings:expect-error
  selector({foo: 'fizz'}, {bar: 42});

  const parametric = createSelector(
    (state: {foo: string}) => state.foo,
    (state, props: {bar: number}) => props.bar,
    (foo, bar) => ({foo, bar}),
  );

  // typings:expect-error
  parametric({foo: 'fizz'});

  const ret = parametric({foo: 'fizz'}, {bar: 42});
  const foo: string = ret.foo;
  const bar: number = ret.bar;

  // typings:expect-error
  createSelectorCreator(defaultMemoize, 1);

  createSelectorCreator(defaultMemoize, (a, b, index) => {
    if (index === 0)
      return a === b;

    return a.toString() === b.toString();
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

  // typings:expect-error
  selector({bar: '42'});

  // typings:expect-error
  selector({foo: '42'}, {bar: 42});

  // typings:expect-error
  createStructuredSelector<{foo: string}, {bar: number}>({
    bar: (state: {baz: boolean}) => 1
  });

  // todo: this should fail in TypeScript 2.1
  createStructuredSelector<{foo: string}, {bar: number}>({
    bar: state => state.foo
  });

  // todo: this should fail in TypeScript 2.1
  createStructuredSelector<{foo: string}, {bar: number}>({
    baz: state => state.foo
  });
}
