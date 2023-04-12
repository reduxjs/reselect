// import { DEBUG } from '@glimmer/env'

// import { consumeTag, createTag, dirtyTag, Tag } from '@glimmer/validator'
// import { consumeTag, createTag, dirtyTag, Tag } from '../tracked-storage'
import { formatMs, logLater } from './utils'
import {
  consumeCollection,
  dirtyCollection,
  Node,
  Tag,
  consumeTag,
  dirtyTag,
  createTag
} from './tracking'

export const REDUX_PROXY_LABEL = Symbol()

let nextId = 0

const proto = Object.getPrototypeOf({})

class ObjectTreeNode<T extends Record<string, unknown>> implements Node<T> {
  proxy: T = new Proxy(this, objectProxyHandler) as unknown as T
  tag = createTag()
  tags = {} as Record<string, Tag>
  children = {} as Record<string, Node>
  collectionTag = null
  id = nextId++

  constructor(public value: T) {
    // console.log('Object node: ', this.value)
    this.value = value
    this.tag.value = value
  }
}

const objectProxyHandler = {
  get(node: Node, key: string | symbol): unknown {
    // if (DEBUG && key === REDUX_PROXY_LABEL) {
    //   // logLater('Bailing out of getter: ', key)
    //   return true
    // }
    // let res : unknown;

    const keyString = key.toString()
    // if (keyString === 'constructor') {
    //   console.log('Constructor: ', node)
    // }
    const start = performance.now()

    function calculateResult() {
      // try {
      const { value } = node

      // console.time('Reflect.get: ' + keyString)
      const childValue = Reflect.get(value, key)
      // console.timeEnd('Reflect.get: ' + keyString)

      if (typeof key === 'symbol') {
        return childValue
      }

      if (key in proto) {
        return childValue
      }

      if (typeof childValue === 'object' && childValue !== null) {
        // logLater('Getting child node: ', key, childValue)
        let childNode = node.children[key]

        if (childNode === undefined) {
          // console.time('Creating child node')

          // console.log('Creating node: ', key, childValue)
          childNode = node.children[key] = createNode(childValue)
          // console.timeEnd('Creating child node')
        }

        if (childNode.tag) {
          // logLater('Consuming tag: ', childNode)
          // console.time('Consuming tag A: ' + keyString)
          // console.log('Consuming tag: ', keyString)
          consumeTag(childNode.tag)
          // console.timeEnd('Consuming tag A: ' + keyString)
        }

        return childNode.proxy
      } else {
        let tag = node.tags[key]
        if (key === 'constructor') {
          // console.log('Constructor tag: ', tag)
        }

        if (tag === undefined) {
          // console.time('Creating tag: ' + key)
          // console.log('Creating tag: ', key)
          tag = node.tags[key] = createTag()
          // console.timeEnd('Creating tag: ' + key)
          // console.time('Assigning tag value: ' + keyString)
          tag.value = childValue
          // console.timeEnd('Assigning tag value: ' + keyString)
        }

        // console.time('Consuming tag B: ' + keyString)
        // console.log('Consuming tag: ', keyString, tag)
        consumeTag(tag)

        // console.timeEnd('Consuming tag B: ' + keyString)

        return childValue
      }
    }
    const res = calculateResult()

    const end = performance.now()
    // logLater(`Proxy get trap: ${keyString}: ${formatMs(end - start)}`)
    return res
  },

  ownKeys(node: Node): ArrayLike<string | symbol> {
    consumeCollection(node)
    return Reflect.ownKeys(node.value)
  },

  getOwnPropertyDescriptor(
    node: Node,
    prop: string | symbol
  ): PropertyDescriptor | undefined {
    console.log('getOwnPropertyDescriptor', prop)
    return Reflect.getOwnPropertyDescriptor(node.value, prop)
  },

  has(node: Node, prop: string | symbol): boolean {
    return Reflect.has(node.value, prop)
  }
}

class ArrayTreeNode<T extends Array<unknown>> implements Node<T> {
  proxy: T = new Proxy([this], arrayProxyHandler) as unknown as T
  tag = createTag()
  tags = {}
  children = {}
  collectionTag = null
  id = nextId++

  constructor(public value: T) {
    // console.log('Array node: ', value)
    this.value = value
    this.tag.value = value
  }
}

const arrayProxyHandler = {
  get([node]: [Node], key: string | symbol): unknown {
    if (key === 'length') {
      consumeCollection(node)
    }

    return objectProxyHandler.get(node, key)
  },

  ownKeys([node]: [Node]): ArrayLike<string | symbol> {
    return objectProxyHandler.ownKeys(node)
  },

  getOwnPropertyDescriptor(
    [node]: [Node],
    prop: string | symbol
  ): PropertyDescriptor | undefined {
    return objectProxyHandler.getOwnPropertyDescriptor(node, prop)
  },

  has([node]: [Node], prop: string | symbol): boolean {
    return objectProxyHandler.has(node, prop)
  }
}

export function createNode<T extends Array<unknown> | Record<string, unknown>>(
  value: T
): Node<T> {
  if (Array.isArray(value)) {
    return new ArrayTreeNode(value)
  }

  return new ObjectTreeNode(value) as Node<T>
}

const keysMap = new WeakMap<
  Array<unknown> | Record<string, unknown>,
  Set<string>
>()

export function updateNode<T extends Array<unknown> | Record<string, unknown>>(
  node: Node<T>,
  newValue: T
): void {
  // console.log('UpdateNode: ', newValue)
  const { value, tags, children } = node

  node.value = newValue

  const start = performance.now()

  // console.time('updateNode: array check: ' + node.id)
  if (
    Array.isArray(value) &&
    Array.isArray(newValue) &&
    value.length !== newValue.length
  ) {
    dirtyCollection(node)
  } else {
    if (value !== newValue) {
      let oldKeysSize = 0
      let newKeysSize = 0
      let anyKeysAdded = false

      // console.log('Key check: ', value, newValue)

      for (const _key in value) {
        oldKeysSize++
      }

      for (const key in newValue) {
        newKeysSize++
        if (!(key in value)) {
          anyKeysAdded = true
          break
        }
      }

      // let oldKeys = keysMap.get(value)
      // if (!oldKeys) {
      //   oldKeys = new Set<string>()
      //   for (let key in value) {
      //     oldKeys.add(key)
      //   }
      //   keysMap.set(value, oldKeys)
      // }
      // oldKeyIteration = performance.now()
      // let newKeys = keysMap.get(newValue)
      // if (!newKeys) {
      //   newKeys = new Set<string>()
      //   for (let key in newValue) {
      //     newKeys.add(key)
      //   }
      //   keysMap.set(newValue, newKeys)
      // }
      // newKeyIteration = performance.now()
      // // const oldKeys = Object.keys(value)
      // // const newKeys = Object.keys(newValue)
      // const isDifferent =
      //   oldKeys.size !== newKeys.size || anyKeysDifferent(oldKeys, newKeys)

      const isDifferent = anyKeysAdded || oldKeysSize !== newKeysSize

      if (
        isDifferent
        // [...oldKeys].some((k) => !newKeys!.has(k))
      ) {
        // console.log('Dirtying collection: ', node)
        dirtyCollection(node)
      }
    }
    // console.time('Checking object keys')
    // let oldKeys = keysMap.get(value)
    // if (!oldKeys) {
    //   oldKeys = new Set<string>()
    //   for (const key in value) {
    //     oldKeys.add(key)
    //   }
    //   keysMap.set(value, oldKeys)
    // }
    // let newKeys = keysMap.get(value)
    // if (!newKeys) {
    //   newKeys = new Set<string>()
    //   for (const key in newValue) {
    //     newKeys.add(key)
    //   }
    //   keysMap.set(newValue, newKeys)
    // }
    // // const oldKeys = Object.keys(value)
    // // const newKeys = Object.keys(newValue)

    // if (
    //   oldKeys.size !== newKeys.size ||
    //   [...oldKeys].some(k => !newKeys!.has(k))
    // ) {
    //   dirtyCollection(node)
    // }
    // console.timeEnd('Checking object keys')
  }

  const arrayDone = performance.now()

  // console.timeEnd('updateNode: array check: ' + node.id)

  // console.time('updateNode: tags check: ' + node.id)

  // console.log('Tags: ', tags)
  for (const key in tags) {
    // logLater('Tag key: ', key)
    const childValue = (value as Record<string, unknown>)[key]
    const newChildValue = (newValue as Record<string, unknown>)[key]

    if (childValue !== newChildValue) {
      // console.log('Dirtying tag: ', { key, childValue, newChildValue })
      dirtyCollection(node)
      dirtyTag(tags[key], newChildValue)
    }

    if (typeof newChildValue === 'object' && newChildValue !== null) {
      delete tags[key]
    }
  }

  const tagsDone = performance.now()

  // console.timeEnd('updateNode: tags check: ' + node.id)

  // console.time('updateNode: keys check: ' + node.id)

  for (const key in children) {
    // logLater('Child key: ', key)
    const childNode = children[key]
    const newChildValue = (newValue as Record<string, unknown>)[key]

    const childValue = childNode.value

    if (childValue === newChildValue) {
      // logLater('Skipping child node: ', key, childValue, newChildValue)
      continue
    } else if (
      typeof newChildValue === 'object' &&
      newChildValue !== null // &&
      // Object.getPrototypeOf(newChildValue) === Object.getPrototypeOf(childValue)
    ) {
      // logLater('Updating child node: ', key, childValue, newChildValue)
      // console.time('Nested updateNode: ' + key)
      updateNode(childNode, newChildValue as Record<string, unknown>)
      // console.timeEnd('Nested updateNode: ' + key)
    } else {
      deleteNode(childNode)
      delete children[key]
    }
  }

  const keysDone = performance.now()

  // logLater(
  //   'updateNode: ',
  //   {
  //     total: formatMs(keysDone - start),
  //     array: formatMs(arrayDone - start),
  //     tags: formatMs(tagsDone - arrayDone),
  //     keys: formatMs(keysDone - tagsDone)
  //   },
  //   node.value
  // )

  // console.timeEnd('updateNode: keys check: ' + node.id)
}

function deleteNode(node: Node): void {
  if (node.tag) {
    dirtyTag(node.tag, null)
  }
  dirtyCollection(node)
  for (const key in node.tags) {
    dirtyTag(node.tags[key], null)
  }
  for (const key in node.children) {
    deleteNode(node.children[key])
  }
  // Object.values(node.tags).map(dirtyTag)
  // Object.values(node.children).map(deleteNode)
}
