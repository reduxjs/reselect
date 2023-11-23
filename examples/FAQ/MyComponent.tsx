import type { FC } from 'react'
import { useSelectTodo } from './createParametricSelectorHook'

interface Props {
  id: number
}

const MyComponent: FC<Props> = ({ id }) => {
  const todo = useSelectTodo(id)
  return <div>{todo?.title}</div>
}
