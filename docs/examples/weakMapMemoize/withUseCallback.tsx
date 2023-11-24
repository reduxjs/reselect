import type { FC } from 'react'
import { useCallback } from 'react'
import { useSelector } from 'react-redux'
import { createSelector } from 'reselect'
import type { RootState } from './weakMapMemoize-problem'

const selectItemsByCategory = createSelector(
  [
    (state: RootState) => state.items,
    (state: RootState, category: string) => category
  ],
  (items, category) => items.filter(item => item.category === category)
)

interface Props {
  category: string
}

const MyComponent: FC<Props> = ({ category }) => {
  const selectItemsByCategoryMemoized = useCallback(selectItemsByCategory, [])

  const itemsByCategory = useSelector((state: RootState) =>
    selectItemsByCategoryMemoized(state, category)
  )

  return (
    <div>
      {itemsByCategory.map(item => (
        <div key={item.id}>{item.name}</div>
      ))}
    </div>
  )
}
