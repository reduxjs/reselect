import { createNode, updateNode } from './proxy'
import { Node } from './tracking'

import { createCache } from './autotracking'
import {
  createCacheKeyComparator,
  defaultEqualityCheck
} from '@internal/defaultMemoize'

export function autotrackMemoize<F extends (...args: any[]) => any>(func: F) {
  // we reference arguments instead of spreading them for performance reasons

  const node: Node<Record<string, unknown>> = createNode(
    [] as unknown as Record<string, unknown>
  )

  let lastArgs: IArguments | null = null

  const shallowEqual = createCacheKeyComparator(defaultEqualityCheck)

  const cache = createCache(() => {
    const res = func.apply(null, node.proxy as unknown as any[])
    return res
  })

  function memoized() {
    if (!shallowEqual(lastArgs, arguments)) {
      updateNode(node, arguments as unknown as Record<string, unknown>)
      lastArgs = arguments
    }
    return cache.value
  }

  memoized.clearCache = () => cache.clear()

  return memoized as F & { clearCache: () => void }
}
