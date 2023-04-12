import { createNode, updateNode } from './proxy'
import { Node } from './tracking'

import { createCache } from './autotracking'
import {
  createCacheKeyComparator,
  defaultEqualityCheck
} from '@internal/defaultMemoize'

export function autotrackMemoize<F extends (...args: any[]) => any>(func: F) {
  // we reference arguments instead of spreading them for performance reasons

  // console.log('Creating autotrack memoizer node')
  const node: Node<Record<string, unknown>> = createNode(
    [] as unknown as Record<string, unknown>
  )

  let lastArgs: IArguments | null = null

  const shallowEqual = createCacheKeyComparator(defaultEqualityCheck)

  // console.log('Creating cache')
  const cache = createCache(() => {
    // console.log('Executing cache: ', node.value)
    const res = func.apply(null, node.proxy as unknown as any[])
    // console.log('Res: ', res)
    return res
  })

  // console.log('Creating memoized function')
  function memoized() {
    // console.log('Memoized running')
    if (!shallowEqual(lastArgs, arguments)) {
      // console.log(
      //   'Args are different: lastArgs =',
      //   lastArgs,
      //   'newArgs =',
      //   arguments
      // )
      updateNode(node, arguments as unknown as Record<string, unknown>)
      lastArgs = arguments
    } else {
      // console.log('Same args: ', lastArgs, arguments)
    }
    // const start = performance.now()
    // console.log('Calling memoized: ', arguments)

    // const end = performance.now()
    // console.log('Memoized execution time: ', end - start)
    return cache.value
  }

  memoized.clearCache = () => cache.clear()

  return memoized as F & { clearCache: () => void }
}
