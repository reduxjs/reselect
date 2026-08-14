// Writes a V8 heap snapshot of a filled memoization cache and prints a summary
// of its contents, for https://github.com/reduxjs/reselect/issues/635
//
// Run it once per memoization function to compare the two.
//
// Usage:
//   yarn heap-snapshot
//   yarn heap-snapshot --memoize=lru --entries=50000
//
// The printed sizes are shallow (`self_size`) sums per object type, which is
// enough to compare two runs. Open the written `.heapsnapshot` file in Chrome
// DevTools ("Memory" -> "Load profile") for retained sizes and retainer chains.

import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import v8 from 'node:v8'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDirectory = path.join(__dirname, '..')

const parseArguments = () => {
  const options = {
    memoize: 'weakmap',
    entries: 50_000,
    out: path.join(rootDirectory, 'weakMapMemoize.heapsnapshot')
  }
  for (const argument of process.argv.slice(2)) {
    const [key, value] = argument.replace(/^--/, '').split('=')
    if (key === 'memoize') options.memoize = value
    if (key === 'entries') options.entries = Number(value)
    if (key === 'out') options.out = path.resolve(value)
  }
  if (options.memoize !== 'weakmap' && options.memoize !== 'lru') {
    throw new Error(
      `--memoize must be "weakmap" or "lru", got "${options.memoize}"`
    )
  }
  if (!Number.isInteger(options.entries) || options.entries < 1) {
    throw new Error(
      `--entries must be a positive integer, got "${options.entries}"`
    )
  }
  return options
}

const loadReselect = async () => {
  const buildOutput = path.join(rootDirectory, 'dist', 'reselect.mjs')
  try {
    // `import()` needs a URL rather than a bare path to work on Windows.
    return await import(pathToFileURL(buildOutput).href)
  } catch (error) {
    throw new Error(
      `Could not load ${buildOutput}. Run \`yarn build\` first, or use \`yarn heap-snapshot\`.\n${error.message}`
    )
  }
}

const formatBytes = bytes => {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(2)} MB`
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(2)} KB`
  return `${bytes} B`
}

/**
 * Fills a selector's cache the way the issue describes: one long-lived object
 * argument, and a primitive argument that keeps taking new values.
 */
const fillCache = ({ createSelector, lruMemoize }, { memoize, entries }) => {
  const state = {
    items: Array.from({ length: 1_000 }, (item, index) => ({ id: index }))
  }

  const options =
    memoize === 'lru'
      ? { memoize: lruMemoize, argsMemoize: lruMemoize }
      : undefined

  const selector = options
    ? createSelector(
        [state => state.items, (state, id) => id],
        (items, id) => items.filter(item => item.id % (id + 1) === 0),
        options
      )
    : createSelector([state => state.items, (state, id) => id], (items, id) =>
        items.filter(item => item.id % (id + 1) === 0)
      )

  for (let i = 0; i < entries; i++) {
    selector(state, i)
  }

  // Returned so that both stay reachable while the snapshot is taken.
  return { state, selector }
}

/** Sums `self_size` per node type/name from a written heap snapshot. */
const summarizeSnapshot = async file => {
  const snapshot = JSON.parse(await readFile(file, 'utf8'))
  const { node_fields: nodeFields, node_types: nodeTypes } =
    snapshot.snapshot.meta

  const typeOffset = nodeFields.indexOf('type')
  const nameOffset = nodeFields.indexOf('name')
  const selfSizeOffset = nodeFields.indexOf('self_size')
  const stride = nodeFields.length
  const typeNames = nodeTypes[typeOffset]

  const totals = new Map()
  let heapTotal = 0

  for (let i = 0; i < snapshot.nodes.length; i += stride) {
    const type = typeNames[snapshot.nodes[i + typeOffset]]
    const name = snapshot.strings[snapshot.nodes[i + nameOffset]]
    const selfSize = snapshot.nodes[i + selfSizeOffset]
    const key = name ? `${type} / ${name}` : type

    const entry = totals.get(key) ?? { count: 0, selfSize: 0 }
    entry.count++
    entry.selfSize += selfSize
    totals.set(key, entry)
    heapTotal += selfSize
  }

  return { totals, heapTotal }
}

const main = async () => {
  const options = parseArguments()
  const reselect = await loadReselect()

  const held = fillCache(reselect, options)

  if (typeof global.gc === 'function') {
    global.gc()
    global.gc()
  }

  const heapUsed = process.memoryUsage().heapUsed
  v8.writeHeapSnapshot(options.out)

  const { totals, heapTotal } = await summarizeSnapshot(options.out)

  const ranked = [...totals.entries()]
    .sort((a, b) => b[1].selfSize - a[1].selfSize)
    .slice(0, 12)

  console.log(
    `\nmemoize: ${
      options.memoize
    }   cached entries: ${options.entries.toLocaleString(
      'en-US'
    )}   heapUsed: ${formatBytes(heapUsed)}`
  )
  console.log(`snapshot: ${options.out}\n`)
  console.log(
    `${'object type'.padEnd(34)}${'count'.padStart(
      12
    )}${'shallow size'.padStart(14)}`
  )
  for (const [key, { count, selfSize }] of ranked) {
    console.log(
      `${key.slice(0, 33).padEnd(34)}${count
        .toLocaleString('en-US')
        .padStart(12)}${formatBytes(selfSize).padStart(14)}`
    )
  }
  console.log(
    `${'total'.padEnd(34)}${''.padStart(12)}${formatBytes(heapTotal).padStart(
      14
    )}`
  )
  console.log(
    '\nShallow sizes only. Load the snapshot in Chrome DevTools > Memory for retained sizes.'
  )

  // Keep the cache reachable until after the snapshot has been summarized.
  if (held.selector(held.state, 0) === undefined) {
    throw new Error('unreachable')
  }
}

main().catch(error => {
  console.error(error.message)
  process.exitCode = 1
})
