/**
 * Runs one case in isolation so `--cpu-prof` attributes samples to it alone.
 *
 * Usage: node --cpu-prof --cpu-prof-dir=bench/.build/prof bench/profile.mjs [name]
 */
import { cases } from './cases.mjs'
import {
  applyTick,
  config,
  createInitialState,
  createProps
} from './workload.mjs'

const wanted = process.argv[2] ?? '1 input, (state, props)'
const variant = process.argv[3] ?? 'base'

const factory = cases.find(createCase => {
  const instance = createCase()
  return instance.name.trim() === wanted.trim() && instance.variant === variant
})

if (!factory) {
  console.error(`no case named ${wanted} with variant ${variant}`)
  process.exit(1)
}

const props = createProps()
const instance = factory()
let state = createInitialState()

for (let tick = 0; tick < 2000; tick += 1) {
  state = applyTick(state, tick)

  for (let call = 0; call < config.callsPerTick; call += 1) {
    instance.run(state, props[call])
  }
}

console.log(
  `${wanted} [${variant}] recomputations: ${instance.recomputations()}`
)
