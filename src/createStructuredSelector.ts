import { createSelector } from './createSelectorCreator'

import type { CreateSelectorFunction } from './createSelectorCreator'
import type {
  InterruptRecursion,
  ObjectValuesToTuple,
  OutputSelector,
  Selector,
  Simplify,
  UnknownMemoizer
} from './types'
import { assertIsObject } from './utils'
import type { weakMapMemoize } from './weakMapMemoize'

/**
 * Represents a mapping of selectors to their return types.
 *
 * @template T - An object type where each property is a selector function.
 *
 * @public
 * @WIP
 */
type SelectorResultsMap<T extends SelectorsObject> = {
  [Key in keyof T]: ReturnType<T[Key]>
}

/**
 * Represents a mapping of selectors for each key in a given root state.
 *
 * This type is a utility that takes a root state object type and
 * generates a corresponding set of selectors. Each selector is associated
 * with a key in the root state, allowing for the selection
 * of specific parts of the state.
 *
 * @template RootState - The type of the root state object.
 *
 * @since 5.0.0
 * @public
 */
export type RootStateSelectors<RootState = any> = {
  [Key in keyof RootState]: Selector<RootState, RootState[Key], []>
}

// TODO: Write more type tests for `TypedStructuredSelectorCreator`.
/**
 * Allows you to create a pre-typed version of
 * {@linkcode createStructuredSelector createStructuredSelector}
 * For your root state.
 *
 * @template RootState - The type of the root state object.
 *
 * @since 5.0.0
 * @public
 * @WIP
 */
export interface TypedStructuredSelectorCreator<RootState = any> {
  <
    InputSelectorsObject extends RootStateSelectors<RootState> = RootStateSelectors<RootState>,
    MemoizeFunction extends UnknownMemoizer = typeof weakMapMemoize,
    ArgsMemoizeFunction extends UnknownMemoizer = typeof weakMapMemoize
  >(
    selectors: InputSelectorsObject,
    selectorCreator?: CreateSelectorFunction<
      MemoizeFunction,
      ArgsMemoizeFunction
    >
  ): OutputSelector<
    ObjectValuesToTuple<InputSelectorsObject>,
    SelectorResultsMap<InputSelectorsObject>,
    MemoizeFunction,
    ArgsMemoizeFunction
  >
}

/**
 * Represents an object where each property is a selector function.
 *
 * @public
 */
export interface SelectorsObject {
  [key: string]: Selector
}

/**
 * It provides a way to create structured selectors.
 * The structured selector can take multiple input selectors
 * and map their output to an object with specific keys.
 *
 * @see {@link https://reselect.js.org/api/createStructuredSelector `createStructuredSelector`}
 *
 * @public
 */
export interface StructuredSelectorCreator {
  /**
   * A convenience function that simplifies returning an object
   * made up of selector results.
   *
   * @param inputSelectorsObject - A key value pair consisting of input selectors.
   * @param selectorCreator - A custom selector creator function. It defaults to `createSelector`.
   * @returns A memoized structured selector.
   *
   * @example
   * <caption>Modern Use Case</caption>
   * ```ts
   * import { createSelector, createStructuredSelector } from 'reselect'
   *
   * interface RootState {
   *   todos: {
   *     id: number
   *     completed: boolean
   *     title: string
   *     description: string
   *   }[]
   *   alerts: { id: number; read: boolean }[]
   * }
   *
   * // This:
   * const structuredSelector = createStructuredSelector(
   *   {
   *     todos: (state: RootState) => state.todos,
   *     alerts: (state: RootState) => state.alerts,
   *     todoById: (state: RootState, id: number) => state.todos[id]
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
   *   (todos, alerts, todoById) => {
   *     return {
   *       todos,
   *       alerts,
   *       todoById
   *     }
   *   }
   * )
   * ```
   *
   * @example
   * <caption>In your component:</caption>
   * ```tsx
   * import type { RootState } from 'createStructuredSelector/modernUseCase'
   * import { structuredSelector } from 'createStructuredSelector/modernUseCase'
   * import type { FC } from 'react'
   * import { useSelector } from 'react-redux'
   *
   * interface Props {
   *   id: number
   * }
   *
   * const MyComponent: FC<Props> = ({ id }) => {
   *   const { todos, alerts, todoById } = useSelector((state: RootState) =>
   *     structuredSelector(state, id)
   *   )
   *
   *   return (
   *     <div>
   *       Next to do is:
   *       <h2>{todoById.title}</h2>
   *       <p>Description: {todoById.description}</p>
   *       <ul>
   *         <h3>All other to dos:</h3>
   *         {todos.map(todo => (
   *           <li key={todo.id}>{todo.title}</li>
   *         ))}
   *       </ul>
   *     </div>
   *   )
   * }
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
   * @template MemoizeFunction - The type of the memoize function that is used to create the structured selector. It defaults to `weakMapMemoize`.
   * @template ArgsMemoizeFunction - The type of the of the memoize function that is used to memoize the arguments passed into the generated structured selector. It defaults to `weakMapMemoize`.
   *
   * @see {@link https://reselect.js.org/api/createStructuredSelector `createStructuredSelector`}
   */
  <
    InputSelectorsObject extends SelectorsObject,
    MemoizeFunction extends UnknownMemoizer = typeof weakMapMemoize,
    ArgsMemoizeFunction extends UnknownMemoizer = typeof weakMapMemoize
  >(
    inputSelectorsObject: InputSelectorsObject,
    selectorCreator?: CreateSelectorFunction<
      MemoizeFunction,
      ArgsMemoizeFunction
    >
  ): OutputSelector<
    ObjectValuesToTuple<InputSelectorsObject>,
    Simplify<SelectorResultsMap<InputSelectorsObject>>,
    MemoizeFunction,
    ArgsMemoizeFunction
  > &
    InterruptRecursion
}

/**
 * A convenience function that simplifies returning an object
 * made up of selector results.
 *
 * @example
 * <caption>Modern Use Case</caption>
 * ```ts
 * import { createSelector, createStructuredSelector } from 'reselect'
 *
 * interface RootState {
 *   todos: {
 *     id: number
 *     completed: boolean
 *     title: string
 *     description: string
 *   }[]
 *   alerts: { id: number; read: boolean }[]
 * }
 *
 * // This:
 * const structuredSelector = createStructuredSelector(
 *   {
 *     todos: (state: RootState) => state.todos,
 *     alerts: (state: RootState) => state.alerts,
 *     todoById: (state: RootState, id: number) => state.todos[id]
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
 *   (todos, alerts, todoById) => {
 *     return {
 *       todos,
 *       alerts,
 *       todoById
 *     }
 *   }
 * )
 * ```
 *
 * @see {@link https://reselect.js.org/api/createStructuredSelector `createStructuredSelector`}
 *
 * @public
 */
export const createStructuredSelector: StructuredSelectorCreator = (<
  InputSelectorsObject extends SelectorsObject,
  MemoizeFunction extends UnknownMemoizer = typeof weakMapMemoize,
  ArgsMemoizeFunction extends UnknownMemoizer = typeof weakMapMemoize
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
