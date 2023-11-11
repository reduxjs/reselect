import { createSelector } from './createSelectorCreator'

import type { CreateSelectorFunction } from './createSelectorCreator'
import type { defaultMemoize } from './defaultMemoize'
import type {
  InterruptRecursion,
  ObjectValuesToTuple,
  OutputSelector,
  Selector,
  Simplify,
  UnknownMemoizer
} from './types'
import { assertIsObject } from './utils'

/**
 *
 * @WIP
 */
type SelectorsMap<T extends SelectorsObject> = {
  [Key in keyof T]: ReturnType<T[Key]>
}

// TODO: Write more type tests for `TypedStructuredSelectorCreator`.
/**
 * Allows you to create a pre-typed version of {@linkcode createStructuredSelector createStructuredSelector}
 * For your root state.
 *
 * @since 5.0.0
 * @public
 * @WIP
 */
export interface TypedStructuredSelectorCreator<RootState = any> {
  <
    InputSelectorsObject extends {
      [Key in keyof RootState]: Selector<RootState, RootState[Key], []>
    } = {
      [Key in keyof RootState]: Selector<RootState, RootState[Key], []>
    },
    MemoizeFunction extends UnknownMemoizer = typeof defaultMemoize,
    ArgsMemoizeFunction extends UnknownMemoizer = typeof defaultMemoize
  >(
    selectors: InputSelectorsObject,
    selectorCreator?: CreateSelectorFunction<
      MemoizeFunction,
      ArgsMemoizeFunction
    >
  ): OutputSelector<
    ObjectValuesToTuple<InputSelectorsObject>,
    SelectorsMap<InputSelectorsObject>,
    MemoizeFunction,
    ArgsMemoizeFunction
  >
}

interface SelectorsObject {
  [key: string]: Selector
}

/**
 * It provides a way to create structured selectors.
 * The structured selector can take multiple input selectors
 * and map their output to an object with specific keys.
 *
 * @see {@link https://github.com/reduxjs/reselect#createstructuredselectorinputselectors-selectorcreator--createselector createStructuredSelector}
 *
 * @public
 */
export interface StructuredSelectorCreator {
  /**
   * A convenience function for a common pattern that arises when using Reselect.
   * The selector passed to a `connect` decorator often just takes the
   * values of its input selectors and maps them to keys in an object.
   *
   * @param selectorMap - A key value pair consisting of input selectors.
   * @param selectorCreator - A custom selector creator function. It defaults to `createSelector`.
   * @returns A memoized structured selector.
   *
   * @example
   * <caption>Modern Use Case</caption>
   * ```ts
   * import { createSelector, createStructuredSelector } from 'reselect'
   *
   * interface RootState {
   *   todos: { id: number; completed: boolean }[]
   *   alerts: { id: number; read: boolean }[]
   * }
   *
   * const state: RootState = {
   *   todos: [
   *     { id: 0, completed: false },
   *     { id: 1, completed: true }
   *   ],
   *   alerts: [
   *     { id: 0, read: false },
   *     { id: 1, read: true }
   *   ]
   * }
   *
   * // This:
   * const structuredSelector = createStructuredSelector(
   *   {
   *     allTodos: (state: RootState) => state.todos,
   *     allAlerts: (state: RootState) => state.alerts,
   *     selectedTodo: (state: RootState, id: number) => state.todos[id]
   *   },
   *   createSelector
   * )
   *
   * // Is essentially the same as this:
   * const selector = createSelector(
   *   [
   *     (state: RootState) => state.todos,
   *     (state: RootState) => state.alerts,
   *     (state: RootState, id: number) => state.todos[id]
   *   ],
   *   (allTodos, allAlerts, selectedTodo) => {
   *     return {
   *       allTodos,
   *       allAlerts,
   *       selectedTodo
   *     }
   *   }
   * )
   * ```
   *
   * @example
   * <caption>Simple Use Case</caption>
   * ```ts
   * const selectA = state => state.a
   * const selectB = state => state.b
   *
   * // The result function in the following selector
   * // is simply building an object from the input selectors
   * const structuredSelector = createSelector(selectA, selectB, (a, b) => ({
   *   a,
   *   b
   * }))
   *
   * const result = structuredSelector({ a: 1, b: 2 }) // will produce { x: 1, y: 2 }
   * ```
   *
   * @template InputSelectorsObject - The shape of the input selectors object.
   * @template MemoizeFunction - The type of the memoize function that is used to create the structured selector. It defaults to `defaultMemoize`.
   * @template ArgsMemoizeFunction - The type of the of the memoize function that is used to memoize the arguments passed into the generated structured selector. It defaults to `defaultMemoize`.
   *
   * @see {@link https://github.com/reduxjs/reselect#createstructuredselectorinputselectors-selectorcreator--createselector createStructuredSelector}
   */
  <
    InputSelectorsObject extends SelectorsObject,
    MemoizeFunction extends UnknownMemoizer = typeof defaultMemoize,
    ArgsMemoizeFunction extends UnknownMemoizer = typeof defaultMemoize
  >(
    selectorMap: InputSelectorsObject,
    selectorCreator?: CreateSelectorFunction<
      MemoizeFunction,
      ArgsMemoizeFunction
    >
  ): OutputSelector<
    ObjectValuesToTuple<InputSelectorsObject>,
    Simplify<SelectorsMap<InputSelectorsObject>>,
    MemoizeFunction,
    ArgsMemoizeFunction
  > &
    InterruptRecursion
  // TODO: Do we need this?
  /**
   * Second overload
   */
  // <
  //   State,
  //   Result = State,
  //   MemoizeFunction extends UnknownMemoizer = typeof defaultMemoize,
  //   ArgsMemoizeFunction extends UnknownMemoizer = typeof defaultMemoize
  // >(
  //   selectors: {
  //     [Key in keyof State]: Selector<State, State[Key], never>
  //   },
  //   selectorCreator?: CreateSelectorFunction<
  //     MemoizeFunction,
  //     ArgsMemoizeFunction
  //   >
  // ): OutputSelector<
  //   readonly Selector<State, State, []>[],
  //   Result,
  //   MemoizeFunction,
  //   ArgsMemoizeFunction
  // >
}

// Manual definition of state and output arguments
/**
 * A convenience function for a common pattern that arises when using Reselect.
 * The selector passed to a `connect` decorator often just takes the values of its input selectors
 * and maps them to keys in an object.
 *
 * @example
 * <caption>Simple Use Case</caption>
 * ```ts
 * const selectA = state => state.a
 * const selectB = state => state.b
 *
 * // The result function in the following selector
 * // is simply building an object from the input selectors
 * const structuredSelector = createSelector(selectA, selectB, (a, b) => ({
 *   a,
 *   b
 * }))
 * ```
 *
 * @see {@link https://github.com/reduxjs/reselect#createstructuredselectorinputselectors-selectorcreator--createselector createStructuredSelector}
 *
 * @public
 */
export const createStructuredSelector: StructuredSelectorCreator = (<
  InputSelectorsObject extends SelectorsObject,
  MemoizeFunction extends UnknownMemoizer = typeof defaultMemoize,
  ArgsMemoizeFunction extends UnknownMemoizer = typeof defaultMemoize
>(
  inputSelectorsObject: InputSelectorsObject,
  selectorCreator: CreateSelectorFunction<
    MemoizeFunction,
    ArgsMemoizeFunction
  > = createSelector as CreateSelectorFunction<
    MemoizeFunction,
    ArgsMemoizeFunction
  >
) => {
  assertIsObject(
    inputSelectorsObject,
    'createStructuredSelector expects first argument to be an object ' +
      `where each property is a selector, instead received a ${typeof inputSelectorsObject}`
  )
  const inputSelectorKeys = Object.keys(inputSelectorsObject)
  const dependencies = inputSelectorKeys.map(key => inputSelectorsObject[key])
  const structuredSelector = selectorCreator(
    dependencies,
    (...inputSelectorResults: any[]) => {
      return inputSelectorResults.reduce((composition, value, index) => {
        composition[inputSelectorKeys[index]] = value
        return composition
      }, {})
    }
  )
  return structuredSelector
}) as StructuredSelectorCreator
