/**
 * Prints self-time per function from a `.cpuprofile`, which is the only view
 * that says where the time actually goes.
 *
 * Usage: node bench/summarize-profile.mjs <path to .cpuprofile>
 */
import { readFileSync } from 'node:fs'

const profile = JSON.parse(readFileSync(process.argv[2], 'utf8'))

const selfTicks = new Map()
for (const id of profile.samples) {
  selfTicks.set(id, (selfTicks.get(id) ?? 0) + 1)
}

const totalTicks = profile.samples.length
const byNode = new Map(profile.nodes.map(node => [node.id, node]))

const rows = [...selfTicks.entries()]
  .map(([id, ticks]) => {
    const { functionName, url, lineNumber } = byNode.get(id).callFrame
    const file = url.replace(/^.*[/\\]/, '')

    return {
      label: `${functionName || '(anonymous)'} ${
        file ? `(${file}:${lineNumber + 1})` : ''
      }`,
      ticks,
      share: ticks / totalTicks
    }
  })
  .sort((a, b) => b.ticks - a.ticks)
  .slice(0, 15)

console.log(`\n${totalTicks} samples\n`)
for (const row of rows) {
  console.log(
    `${(row.share * 100).toFixed(1).padStart(6)}%  ${String(row.ticks).padStart(
      6
    )}  ${row.label}`
  )
}
