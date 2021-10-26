import {
  createSelector,
  defaultMemoize,
  defaultEqualityCheck,
  createSelectorCreator,
  createStructuredSelector,
  ParametricSelector,
  OutputSelector,
  SelectorResultArray,
  GetParamsFromSelectors
} from '../src/index'

import microMemoize from 'micro-memoize'
import memoizeOne from 'memoize-one'

export function expectType<T>(t: T): T {
  return t
}

interface StateA {
  a: number
}

interface StateAB {
  a: number
  b: number
}

interface StateSub {
  sub: {
    a: number
  }
}

function testSelector() {
  type State = { foo: string }

  const selector = createSelector(
    (state: State) => state.foo,
    foo => foo
  )

  const res = selector.resultFunc('test')
  selector.recomputations()
  selector.resetRecomputations()

  const foo: string = selector({ foo: 'bar' })

  // @ts-expect-error
  selector({ foo: 'bar' }, { prop: 'value' })

  // @ts-expect-error
  const num: number = selector({ foo: 'bar' })

  // allows heterogeneous parameter type input selectors
  createSelector(
    (state: { foo: string }) => state.foo,
    (state: { bar: number }) => state.bar,
    (foo, bar) => 1
  )
}

function testNestedSelector() {
  type State = { foo: string; bar: number; baz: boolean }

  const selector = createSelector(
    createSelector(
      (state: State) => state.foo,
      (state: State) => state.bar,
      (foo, bar) => ({ foo, bar })
    ),
    (state: State) => state.baz,
    ({ foo, bar }, baz) => {
      const foo1: string = foo
      // @ts-expect-error
      const foo2: number = foo

      const bar1: number = bar
      // @ts-expect-error
      const bar2: string = bar

      const baz1: boolean = baz
      // @ts-expect-error
      const baz2: string = baz
    }
  )
}

function testSelectorAsCombiner() {
  type SubState = { foo: string }
  type State = { bar: SubState }

  const subSelector = createSelector(
    (state: SubState) => state.foo,
    foo => foo
  )

  const selector = createSelector((state: State) => state.bar, subSelector)

  // @ts-expect-error
  selector({ foo: '' })

  // @ts-expect-error
  const n: number = selector({ bar: { foo: '' } })

  const s: string = selector({ bar: { foo: '' } })
}

type Component<P> = (props: P) => any

// TODO Figure out why this is failing
// @ts-ignore
declare function connect<S, P, R>(
  selector: ParametricSelector<S, P, R>
): (component: Component<P & R>) => Component<P>

function testConnect() {
  connect(
    createSelector(
      (state: { foo: string }) => state.foo,
      foo => ({ foo })
    )
  )(props => {
    // @ts-expect-error
    props.bar

    const foo: string = props.foo
  })

  const connected = connect(
    createSelector(
      (state: { foo: string }) => state.foo,
      (state: any, props: { bar: number }) => props.bar,
      (foo, bar) => ({ foo, baz: bar })
    )
  )(props => {
    const foo: string = props.foo
    const bar: number = props.bar
    const baz: number = props.baz
    // @ts-expect-error
    props.fizz
  })

  connected({ bar: 42 })

  // @ts-expect-error
  connected({ bar: 42, baz: 123 })
}

function testInvalidTypeInCombinator() {
  // @ts-expect-error
  createSelector(
    (state: { foo: string }) => state.foo,
    (foo: number) => foo
  )

  createSelector(
    // @ts-expect-error
    (state: { foo: string; bar: number; baz: boolean }) => state.foo,
    state => state.bar,
    state => state.baz,
    (foo: string, bar: number, baz: boolean, fizz: string) => {}
  )

  // does not allow heterogeneous parameter type
  // selectors when the combinator function is typed differently
  // @ts-expect-error
  createSelector(
    (state: { testString: string }) => state.testString,
    (state: { testNumber: number }) => state.testNumber,
    (state: { testBoolean: boolean }) => state.testBoolean,
    (state: { testString: string }) => state.testString,
    (state: { testString: string }) => state.testString,
    (state: { testString: string }) => state.testString,
    (state: { testString: string }) => state.testString,
    (state: { testNumber: string }) => state.testNumber,
    (state: { testStringArray: string[] }) => state.testStringArray,
    (
      foo1: string,
      foo2: number,
      foo3: boolean,
      foo4: string,
      foo5: string,
      foo6: string,
      foo7: string,
      foo8: number,
      foo9: string[]
    ) => {
      return { foo1, foo2, foo3, foo4, foo5, foo6, foo7, foo8, foo9 }
    }
  )

  // does not allow a large array of heterogeneous parameter type
  // selectors when the combinator function is typed differently
  // @ts-expect-error
  createSelector(
    [
      (state: { testString: string }) => state.testString,
      (state: { testNumber: number }) => state.testNumber,
      (state: { testBoolean: boolean }) => state.testBoolean,
      (state: { testString: string }) => state.testString,
      (state: { testString: string }) => state.testString,
      (state: { testString: string }) => state.testString,
      (state: { testString: string }) => state.testString,
      (state: { testNumber: string }) => state.testNumber,
      (state: { testStringArray: string[] }) => state.testStringArray
    ],
    (
      foo1: string,
      foo2: number,
      foo3: boolean,
      foo4: string,
      foo5: string,
      foo6: string,
      foo7: string,
      foo8: number,
      foo9: string[]
    ) => {
      return { foo1, foo2, foo3, foo4, foo5, foo6, foo7, foo8, foo9 }
    }
  )
}

function testParametricSelector() {
  type State = { foo: string }
  type Props = { bar: number }

  // allows heterogeneous parameter type selectors
  createSelector(
    (state: { testString: string }) => state.testString,
    (state: { testNumber: number }) => state.testNumber,
    (state: { testBoolean: boolean }) => state.testBoolean,
    (state: { testString: string }) => state.testString,
    (state: { testString: string }) => state.testString,
    (state: { testString: string }) => state.testString,
    (state: { testString: string }) => state.testString,
    (state: { testString: string }) => state.testString,
    (state: { testStringArray: string[] }) => state.testStringArray,
    (
      foo1: string,
      foo2: number,
      foo3: boolean,
      foo4: string,
      foo5: string,
      foo6: string,
      foo7: string,
      foo8: string,
      foo9: string[]
    ) => {
      return { foo1, foo2, foo3, foo4, foo5, foo6, foo7, foo8, foo9 }
    }
  )

  const selector = createSelector(
    (state: State) => state.foo,
    (state: State, props: Props) => props.bar,
    (foo, bar) => ({ foo, bar })
  )

  // @ts-expect-error
  selector({ foo: 'fizz' })
  // @ts-expect-error
  selector({ foo: 'fizz' }, { bar: 'baz' })

  const ret = selector({ foo: 'fizz' }, { bar: 42 })
  const foo: string = ret.foo
  const bar: number = ret.bar

  const selector2 = createSelector(
    (state: any) => state.foo,
    (state: any) => state.foo,
    (state: any) => state.foo,
    (state: any) => state.foo,
    (state: any) => state.foo,
    (state: State, props: Props) => props.bar,
    (foo1, foo2, foo3, foo4, foo5, bar) => ({
      foo1,
      foo2,
      foo3,
      foo4,
      foo5,
      bar
    })
  )

  selector2({ foo: 'fizz' }, { bar: 42 })

  // TODO Should should error because two of the inputs have conflicting types for arg 2
  const selector3 = createSelector(
    (s: State) => s.foo,
    (s: State, x: string) => x,
    (s: State, y: number) => y,
    (v, x) => {
      return x + v
    }
  )
}

function testArrayArgument() {
  const selector = createSelector(
    [
      (state: { foo: string }) => state.foo,
      (state: { foo: string }) => state.foo,
      (state: { foo: string }, props: { bar: number }) => props.bar
    ],
    (foo1, foo2, bar) => ({ foo1, foo2, bar })
  )

  const ret = selector({ foo: 'fizz' }, { bar: 42 })
  const foo1: string = ret.foo1
  const foo2: string = ret.foo2
  const bar: number = ret.bar

  // @ts-expect-error
  createSelector([(state: { foo: string }) => state.foo])

  // @ts-expect-error
  createSelector(
    [
      (state: { foo: string }) => state.foo,
      (state: { foo: string }) => state.foo
    ],
    (foo: string, bar: number) => {}
  )

  createSelector(
    [
      (state: { foo: string }) => state.foo,
      (state: { foo: string }) => state.foo,
      (state: { foo: string }) => state.foo,
      (state: { foo: string }) => state.foo,
      (state: { foo: string }) => state.foo,
      (state: { foo: string }) => state.foo,
      (state: { foo: string }) => state.foo,
      (state: { foo: string }) => state.foo,
      (state: { foo: string }) => state.foo,
      (state: { foo: string }) => state.foo
    ],
    (
      foo1: string,
      foo2: string,
      foo3: string,
      foo4: string,
      foo5: string,
      foo6: string,
      foo7: string,
      foo8: string,
      foo9: string,
      foo10: string
    ) => {}
  )

  // @ts-expect-error
  createSelector(
    [
      (state: { foo: string }) => state.foo,
      (state: { foo: string }) => state.foo,
      (state: { foo: string }) => state.foo,
      (state: { foo: string }) => state.foo,
      (state: { foo: string }) => state.foo,
      (state: { foo: string }) => state.foo,
      (state: { foo: string }) => state.foo,
      (state: { foo: string }) => state.foo,
      (state: { foo: string }) => state.foo,
      (state: { foo: string }) => state.foo
    ],
    (foo1, foo2, foo3, foo4, foo5, foo6, foo7, foo8: number, foo9, foo10) => {}
  )

  // @ts-expect-error
  createSelector(
    [
      (state: { foo: string }) => state.foo,
      // @ts-expect-error
      state => state.foo,
      // @ts-expect-error
      state => state.foo,
      // @ts-expect-error
      state => state.foo,
      // @ts-expect-error
      state => state.foo,
      // @ts-expect-error
      state => state.foo,
      // @ts-expect-error
      state => state.foo,
      // @ts-expect-error
      state => state.foo,
      1
    ],
    // We expect an error here, but the error differs between TS versions
    // @ts-ignore
    (foo1, foo2, foo3, foo4, foo5, foo6, foo7, foo8, foo9) => {}
  )

  const selector2 = createSelector(
    [
      (state: { foo: string }) => state.foo,
      (state: { foo: string }) => state.foo,
      (state: { foo: string }) => state.foo,
      (state: { foo: string }) => state.foo,
      (state: { foo: string }) => state.foo,
      (state: { foo: string }) => state.foo,
      (state: { foo: string }) => state.foo,
      (state: { foo: string }) => state.foo,
      (state: { foo: string }) => state.foo
    ],
    (
      foo1: string,
      foo2: string,
      foo3: string,
      foo4: string,
      foo5: string,
      foo6: string,
      foo7: string,
      foo8: string,
      foo9: string
    ) => {
      return { foo1, foo2, foo3, foo4, foo5, foo6, foo7, foo8, foo9 }
    }
  )

  {
    const ret = selector2({ foo: 'fizz' })
    const foo1: string = ret.foo1
    const foo2: string = ret.foo2
    const foo3: string = ret.foo3
    const foo4: string = ret.foo4
    const foo5: string = ret.foo5
    const foo6: string = ret.foo6
    const foo7: string = ret.foo7
    const foo8: string = ret.foo8
    const foo9: string = ret.foo9
    // @ts-expect-error
    ret.foo10
  }

  // @ts-expect-error
  selector2({ foo: 'fizz' }, { bar: 42 })

  const parametric = createSelector(
    [
      (state: { foo: string }, props: { bar: number }) => props.bar,
      (state: { foo: string }) => state.foo,
      (state: { foo: string }) => state.foo,
      (state: { foo: string }) => state.foo,
      (state: { foo: string }) => state.foo,
      (state: { foo: string }) => state.foo,
      (state: { foo: string }) => state.foo,
      (state: { foo: string }) => state.foo,
      (state: { foo: string }) => state.foo
    ],
    (
      bar: number,
      foo1: string,
      foo2: string,
      foo3: string,
      foo4: string,
      foo5: string,
      foo6: string,
      foo7: string,
      foo8: string
    ) => {
      return { foo1, foo2, foo3, foo4, foo5, foo6, foo7, foo8, bar }
    }
  )

  // allows a large array of heterogeneous parameter type selectors
  const correctlyTypedArraySelector = createSelector(
    [
      (state: { testString: string }) => state.testString,
      (state: { testNumber: number }) => state.testNumber,
      (state: { testBoolean: boolean }) => state.testBoolean,
      (state: { testString: string }) => state.testString,
      (state: { testString: string }) => state.testString,
      (state: { testString: string }) => state.testString,
      (state: { testString: string }) => state.testString,
      (state: { testString: string }) => state.testString,
      (state: { testStringArray: string[] }) => state.testStringArray
    ],
    (
      foo1: string,
      foo2: number,
      foo3: boolean,
      foo4: string,
      foo5: string,
      foo6: string,
      foo7: string,
      foo8: string,
      foo9: string[]
    ) => {
      return { foo1, foo2, foo3, foo4, foo5, foo6, foo7, foo8, foo9 }
    }
  )

  // @ts-expect-error
  parametric({ foo: 'fizz' })

  {
    const ret = parametric({ foo: 'fizz' }, { bar: 42 })
    const foo1: string = ret.foo1
    const foo2: string = ret.foo2
    const foo3: string = ret.foo3
    const foo4: string = ret.foo4
    const foo5: string = ret.foo5
    const foo6: string = ret.foo6
    const foo7: string = ret.foo7
    const foo8: string = ret.foo8
    const bar: number = ret.bar
    // @ts-expect-error
    ret.foo9
  }
}

function testDefaultMemoize() {
  const func = (a: string) => +a

  const memoized = defaultMemoize(func)

  const ret0: number = memoized('42')
  // @ts-expect-error
  const ret1: string = memoized('42')

  const memoized2 = defaultMemoize(
    (str: string, arr: string[]): { str: string; arr: string[] } => ({
      str,
      arr
    }),
    <T>(a: T, b: T) => {
      return `${a}` === `${b}`
    }
  )

  const ret2 = memoized2('', ['1', '2'])
  const str: string = ret2.str
  const arr: string[] = ret2.arr
}

function testCreateSelectorCreator() {
  const createSelector = createSelectorCreator(defaultMemoize)

  const selector = createSelector(
    (state: { foo: string }) => state.foo,
    foo => foo
  )
  const value: string = selector({ foo: 'fizz' })

  // @ts-expect-error
  selector({ foo: 'fizz' }, { bar: 42 })

  const parametric = createSelector(
    (state: { foo: string }) => state.foo,
    (state: { foo: string }, props: { bar: number }) => props.bar,
    (foo, bar) => ({ foo, bar })
  )

  // @ts-expect-error
  parametric({ foo: 'fizz' })

  const ret = parametric({ foo: 'fizz' }, { bar: 42 })
  const foo: string = ret.foo
  const bar: number = ret.bar

  // @ts-expect-error
  createSelectorCreator(defaultMemoize, 1)

  createSelectorCreator(defaultMemoize, <T>(a: T, b: T) => {
    return `${a}` === `${b}`
  })
}

function testCreateStructuredSelector() {
  const selector = createStructuredSelector<
    { foo: string },
    {
      foo: string
      bar: number
    }
  >({
    foo: state => state.foo,
    bar: state => +state.foo
  })

  const res = selector({ foo: '42' })
  const foo: string = res.foo
  const bar: number = res.bar

  // @ts-expect-error
  selector({ bar: '42' })

  // @ts-expect-error
  selector({ foo: '42' }, { bar: 42 })

  createStructuredSelector<{ foo: string }, { bar: number }>({
    // @ts-expect-error
    bar: (state: { baz: boolean }) => 1
  })

  createStructuredSelector<{ foo: string }, { bar: number }>({
    // @ts-expect-error
    bar: state => state.foo
  })

  createStructuredSelector<{ foo: string }, { bar: number }>({
    // @ts-expect-error
    baz: state => state.foo
  })

  // Test automatic inference of types for createStructuredSelector via overload
  type State = { foo: string }
  const FooSelector = (state: State) => state.foo
  const BarSelector = (state: State) => +state.foo

  const selector2 = createStructuredSelector({
    foo: FooSelector,
    bar: BarSelector
  })

  const selectorGenerics = createStructuredSelector<{
    foo: typeof FooSelector
    bar: typeof BarSelector
  }>({
    foo: state => state.foo,
    bar: state => +state.foo
  })

  type ExpectedResult = {
    foo: string
    bar: number
  }

  const res2: ExpectedResult = selector({ foo: '42' })
  const resGenerics: ExpectedResult = selectorGenerics({ foo: '42' })

  //@ts-expect-error
  selector2({ bar: '42' })
  // @ts-expect-error
  selectorGenerics({ bar: '42' })
}

function testDynamicArrayArgument() {
  interface Elem {
    val1: string
    val2: string
  }
  const data: ReadonlyArray<Elem> = [
    { val1: 'a', val2: 'aa' },
    { val1: 'b', val2: 'bb' }
  ]

  createSelector(
    data.map(obj => () => obj.val1),
    (...vals) => vals.join(',')
  )

  createSelector(
    data.map(obj => () => obj.val1),
    // @ts-expect-error
    vals => vals.join(',')
  )

  createSelector(
    data.map(obj => () => obj.val1),
    (...vals: string[]) => 0
  )
  // @ts-expect-error
  createSelector(
    data.map(obj => () => obj.val1),
    (...vals: number[]) => 0
  )

  const s = createSelector(
    data.map(obj => (state: {}, fld: keyof Elem) => obj[fld]),
    (...vals) => vals.join(',')
  )
  s({}, 'val1')
  s({}, 'val2')
  // @ts-expect-error
  s({}, 'val3')
}

function testStructuredSelectorTypeParams() {
  type GlobalState = {
    foo: string
    bar: number
  }

  const selectFoo = (state: GlobalState) => state.foo
  const selectBar = (state: GlobalState) => state.bar

  // Output state should be the same as input, if not provided
  // @ts-expect-error
  createStructuredSelector<GlobalState>({
    foo: selectFoo
    // bar: selectBar,
    // ^^^ because this is missing, an error is thrown
  })

  // This works
  createStructuredSelector<GlobalState>({
    foo: selectFoo,
    bar: selectBar
  })

  // So does this
  createStructuredSelector<GlobalState, Omit<GlobalState, 'bar'>>({
    foo: selectFoo
  })
}

function multiArgMemoize<F extends (...args: any[]) => any>(
  func: F,
  a: number,
  b: string,
  equalityCheck = defaultEqualityCheck
): F {
  // @ts-ignore
  return () => {}
}

// #384: check for defaultMemoize
import { isEqual, groupBy } from 'lodash'
import { GetStateFromSelectors } from '../src/types'

{
  interface Transaction {
    transactionId: string
  }

  const toId = (transaction: Transaction) => transaction.transactionId
  const transactionsIds = (transactions: Transaction[]) =>
    transactions.map(toId)
  const collectionsEqual = (ts1: Transaction[], ts2: Transaction[]) =>
    isEqual(transactionsIds(ts1), transactionsIds(ts2))

  const createTransactionsSelector = createSelectorCreator(
    defaultMemoize,
    collectionsEqual
  )

  const createMultiMemoizeArgSelector = createSelectorCreator(
    multiArgMemoize,
    42,
    'abcd',
    defaultEqualityCheck
  )

  const createMultiMemoizeArgSelector2 = createSelectorCreator(
    multiArgMemoize,
    42,
    // @ts-expect-error
    defaultEqualityCheck
  )

  const groupTransactionsByLabel = defaultMemoize(
    (transactions: Transaction[]) =>
      groupBy(transactions, item => item.transactionId),
    collectionsEqual
  )
}

// #445
function issue445() {
  interface TestState {
    someNumber: number | null
    someString: string | null
  }

  interface Object1 {
    str: string
  }
  interface Object2 {
    num: number
  }

  const getNumber = (state: TestState) => state.someNumber
  const getString = (state: TestState) => state.someString

  function generateObject1(str: string): Object1 {
    return {
      str
    }
  }
  function generateObject2(num: number): Object2 {
    return {
      num
    }
  }
  function generateComplexObject(
    num: number,
    subObject: Object1,
    subObject2: Object2
  ): boolean {
    return true
  }

  // ################ Tests ################

  // Compact selector examples

  // Should error because generateObject1 can't take null
  // @ts-expect-error
  const getObject1 = createSelector([getString], generateObject1)

  // Should error because generateObject2 can't take null
  // @ts-expect-error
  const getObject2 = createSelector([getNumber], generateObject2)

  // Should error because mismatch of params
  // @ts-expect-error
  const getComplexObjectTest1 = createSelector(
    [getObject1],
    generateComplexObject
  )

  // Does error, but error is really weird and talks about "Object1 is not assignable to type number"
  // @ts-expect-error
  const getComplexObjectTest2 = createSelector(
    [getNumber, getObject1],
    generateComplexObject
  )

  // Should error because number can't be null
  const getComplexObjectTest3 = createSelector(
    // @ts-expect-error
    [getNumber, getObject1, getObject2],
    generateComplexObject
  )

  // Does error, but error is really weird and talks about "Object1 is not assignable to type number"
  const getComplexObjectTest4 = createSelector(
    // @ts-expect-error
    [getObject1, getNumber, getObject2],
    generateComplexObject
  )

  // Verbose selector examples

  // Errors correctly, says str can't be null
  const getVerboseObject1 = createSelector([getString], str =>
    // @ts-expect-error
    generateObject1(str)
  )

  // Errors correctly, says num can't be null
  const getVerboseObject2 = createSelector([getNumber], num =>
    // @ts-expect-error
    generateObject2(num)
  )

  // Errors correctly
  // @ts-expect-error
  const getVerboseComplexObjectTest1 = createSelector([getObject1], obj1 =>
    // @ts-expect-error
    generateComplexObject(obj1)
  )

  // Errors correctly
  // @ts-expect-error
  const getVerboseComplexObjectTest2 = createSelector(
    [getNumber, getObject1],
    // @ts-expect-error
    (num, obj1) => generateComplexObject(num, obj1)
  )

  // Errors correctly
  const getVerboseComplexObjectTest3 = createSelector(
    // @ts-expect-error
    [getNumber, getObject1, getObject2],
    (num, obj1, obj2) => generateComplexObject(num, obj1, obj2)
  )

  // Errors correctly
  const getVerboseComplexObjectTest4 = createSelector(
    // @ts-expect-error
    [getObject1, getNumber, getObject2],
    (num, obj1, obj2) => generateComplexObject(num, obj1, obj2)
  )
}

// #492
function issue492() {
  const fooPropSelector = (_: {}, ownProps: { foo: string }) => ownProps.foo
  const fooBarPropsSelector = (
    _: {},
    ownProps: { foo: string; bar: string }
  ) => [ownProps.foo, ownProps.bar]

  const combinedSelector = createSelector(
    fooPropSelector,
    fooBarPropsSelector,
    (foo, fooBar) => fooBar
  )

  /*
  expectType<
    OutputSelector<
      {},
      {
        foo: string
        bar: string
      },
      string[],
      (res1: string, res2: string[]) => string[]
    >
  >(combinedSelector)
  */
}

function customMemoizationOptionTypes() {
  const customMemoize = (
    f: (...args: any[]) => any,
    a: string,
    b: number,
    c: boolean
  ) => {
    return f
  }

  const customSelectorCreatorCustomMemoizeWorking = createSelectorCreator(
    customMemoize,
    'a',
    42,
    true
  )

  // @ts-expect-error
  const customSelectorCreatorCustomMemoizeMissingArg = createSelectorCreator(
    customMemoize,
    'a',
    true
  )
}

// createSelector config options
function createSelectorConfigOptions() {
  const defaultMemoizeAcceptsFirstArgDirectly = createSelector(
    (state: StateAB) => state.a,
    (state: StateAB) => state.b,
    (a, b) => a + b,
    {
      memoizeOptions: (a, b) => a === b
    }
  )

  const defaultMemoizeAcceptsFirstArgAsObject = createSelector(
    (state: StateAB) => state.a,
    (state: StateAB) => state.b,
    (a, b) => a + b,
    {
      memoizeOptions: {
        equalityCheck: (a, b) => a === b
      }
    }
  )

  const defaultMemoizeAcceptsArgsAsArray = createSelector(
    (state: StateAB) => state.a,
    (state: StateAB) => state.b,
    (a, b) => a + b,
    {
      memoizeOptions: [(a, b) => a === b]
    }
  )

  const customSelectorCreatorMicroMemoize = createSelectorCreator(
    microMemoize,
    {
      maxSize: 42
    }
  )

  customSelectorCreatorMicroMemoize(
    (state: StateAB) => state.a,
    (state: StateAB) => state.b,
    (a, b) => a + b,
    {
      memoizeOptions: [
        {
          maxSize: 42
        }
      ]
    }
  )

  const customSelectorCreatorMemoizeOne = createSelectorCreator(memoizeOne)

  customSelectorCreatorMemoizeOne(
    (state: StateAB) => state.a,
    (state: StateAB) => state.b,
    (a, b) => a + b,
    {
      memoizeOptions: (a, b) => a === b
    }
  )
}

const withLotsOfInputSelectors = createSelector(
  (_state: any) => 1,
  (_state: any) => 2,
  (_state: any) => 3,
  (_state: any) => 4,
  (_state: any) => 5,
  (_state: any) => 6,
  (_state: any) => 7,
  (_state: any) => 8,
  (_state: any) => 9,
  (_state: any) => 10,
  (_state: any) => 11,
  (_state: any) => 12,
  (_state: any) => 13,
  (_state: any) => 14,
  (_state: any) => 15,
  (_state: any) => 16,
  (_state: any) => 17,
  (_state: any) => 18,
  (_state: any) => 19,
  (_state: any) => 20,
  (_state: any) => 21,
  (_state: any) => 22,
  (_state: any) => 23,
  (_state: any) => 24,
  (_state: any) => 25,
  (_state: any) => 26,
  (_state: any) => 27,
  (_state: any) => 28,
  (...args) => args.length
)

type SelectorArray29 = [
  (_state: any) => 1,
  (_state: any) => 2,
  (_state: any) => 3,
  (_state: any) => 4,
  (_state: any) => 5,
  (_state: any) => 6,
  (_state: any) => 7,
  (_state: any) => 8,
  (_state: any) => 9,
  (_state: any) => 10,
  (_state: any) => 11,
  (_state: any) => 12,
  (_state: any) => 13,
  (_state: any) => 14,
  (_state: any) => 15,
  (_state: any) => 16,
  (_state: any) => 17,
  (_state: any) => 18,
  (_state: any) => 19,
  (_state: any) => 20,
  (_state: any) => 21,
  (_state: any) => 22,
  (_state: any) => 23,
  (_state: any) => 24,
  (_state: any) => 25,
  (_state: any) => 26,
  (_state: any) => 27,
  (_state: any) => 28,
  (_state: any) => 29
]

type Results = SelectorResultArray<SelectorArray29>
type State = GetStateFromSelectors<SelectorArray29>
// Issue #526
function testInputSelectorWithUndefinedReturn() {
  type Input = { field: number | undefined }
  type Output = string
  type SelectorType = (input: Input) => Output

  const input = ({ field }: Input) => field
  const result = (out: number | undefined): Output => 'test'

  // Make sure the selector type is honored
  const selector: SelectorType = createSelector(
    ({ field }: Input) => field,
    args => 'test'
  )

  // even when memoizeOptions are passed
  const selector2: SelectorType = createSelector(
    ({ field }: Input) => field,
    args => 'test',
    { memoizeOptions: { maxSize: 42 } }
  )

  // Make sure inference of functions works...
  const selector3: SelectorType = createSelector(input, result)
  const selector4: SelectorType = createSelector(input, result, {
    memoizeOptions: { maxSize: 42 }
  })
}
