import type { CreateSelectorFunction } from './createSelectorCreator'
import { createSelectorCreator } from './createSelectorCreator'

import { defaultMemoize } from './defaultMemoize'
import type {
  Combiner,
  CreateSelectorOptions,
  CurriedOutputSelector,
  DropFirstParameter,
  InterruptRecursion,
  SelectorArray,
  Simplify,
  UnknownMemoizer
} from './types'

/**
 * @WIP
 */
export interface CreateCurriedSelector<
  MemoizeFunction extends UnknownMemoizer = typeof defaultMemoize,
  ArgsMemoizeFunction extends UnknownMemoizer = typeof defaultMemoize
> {
  /**
   * One arg
   */
  <InputSelectors extends SelectorArray, Result>(
    ...createSelectorArgs: [
      ...inputSelectors: InputSelectors,
      combiner: Combiner<InputSelectors, Result>
    ]
  ): CurriedOutputSelector<
    InputSelectors,
    Result,
    MemoizeFunction,
    ArgsMemoizeFunction
  > &
    InterruptRecursion

  /**
   * inline args
   */
  <
    InputSelectors extends SelectorArray,
    Result,
    OverrideMemoizeFunction extends UnknownMemoizer = MemoizeFunction,
    OverrideArgsMemoizeFunction extends UnknownMemoizer = ArgsMemoizeFunction
  >(
    ...createSelectorArgs: [
      ...inputSelectors: InputSelectors,
      combiner: Combiner<InputSelectors, Result>,
      createSelectorOptions: Simplify<
        CreateSelectorOptions<
          MemoizeFunction,
          ArgsMemoizeFunction,
          OverrideMemoizeFunction,
          OverrideArgsMemoizeFunction
        >
      >
    ]
  ): CurriedOutputSelector<
    InputSelectors,
    Result,
    OverrideMemoizeFunction,
    OverrideArgsMemoizeFunction
  > &
    InterruptRecursion

  /**
   * array args
   */
  <
    InputSelectors extends SelectorArray,
    Result,
    OverrideMemoizeFunction extends UnknownMemoizer = MemoizeFunction,
    OverrideArgsMemoizeFunction extends UnknownMemoizer = ArgsMemoizeFunction
  >(
    inputSelectors: [...InputSelectors],
    combiner: Combiner<InputSelectors, Result>,
    createSelectorOptions?: Simplify<
      CreateSelectorOptions<
        MemoizeFunction,
        ArgsMemoizeFunction,
        OverrideMemoizeFunction,
        OverrideArgsMemoizeFunction
      >
    >
  ): CurriedOutputSelector<
    InputSelectors,
    Result,
    OverrideMemoizeFunction,
    OverrideArgsMemoizeFunction
  > &
    InterruptRecursion
}

/**
 * @WIP
 */
export function createCurriedSelectorCreator<
  MemoizeFunction extends UnknownMemoizer = typeof defaultMemoize,
  ArgsMemoizeFunction extends UnknownMemoizer = typeof defaultMemoize
>(...createSelectorCreatorArgs: Parameters<typeof createSelectorCreator>) {
  const createSelector = createSelectorCreator(...createSelectorCreatorArgs)

  const createCurriedSelector = (
    ...createSelectorArgs: Parameters<
      CreateSelectorFunction<MemoizeFunction, ArgsMemoizeFunction>
    >
  ) => {
    // @ts-ignore
    const selector = createSelector.apply(null, createSelectorArgs)
    // const selector = createSelector(...createSelectorArgs)
    const curriedSelector = selector.argsMemoize(
      (...params: DropFirstParameter<typeof selector>) => {
        return selector.argsMemoize((state: Parameters<typeof selector>[0]) => {
          return selector(state, ...params)
        })
      }
    )
    return Object.assign(curriedSelector, selector) as CurriedOutputSelector
  }
  return createCurriedSelector as unknown as CreateCurriedSelector<
    MemoizeFunction,
    ArgsMemoizeFunction
  >
}

/**
 * @WIP
 */
export const createCurriedSelector =
  /* #__PURE__ */ createCurriedSelectorCreator(defaultMemoize)
