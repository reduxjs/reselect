import type { defaultMemoize, SelectorArray, UnknownMemoizer } from 'reselect'
import { createSelector } from 'reselect'
import { currySelector } from './currySelector'

export const createCurriedSelector = <
  InputSelectors extends SelectorArray,
  Result,
  OverrideMemoizeFunction extends UnknownMemoizer = typeof defaultMemoize,
  OverrideArgsMemoizeFunction extends UnknownMemoizer = typeof defaultMemoize
>(
  ...args: Parameters<
    typeof createSelector<
      InputSelectors,
      Result,
      OverrideMemoizeFunction,
      OverrideArgsMemoizeFunction
    >
  >
) => {
  return currySelector(createSelector(...args))
}
