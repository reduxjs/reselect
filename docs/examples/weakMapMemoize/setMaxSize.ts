import { createSelector } from 'reselect'
import type { RootState } from './cacheSizeProblem'

const selectItemsByCategory = createSelector(
  [
    (state: RootState) => state.items,
    (state: RootState, category: string) => category
  ],
  (items, category) => items.filter(item => item.category === category),
  {
    memoizeOptions: {
      maxSize: 10
    }
  }
)
