/**
 * Runs one case in isolation so `--cpu-prof` attributes samples to it alone.
 *
 * Build without minification first, or every frame in the profile is a one-letter
 * name:
 *   node bench/build.mjs --no-minify
 *   node --cpu-prof --cpu-prof-dir=bench/.build/prof bench/profile.mjs [name] [variant]
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

const descriptor = cases.find(
  candidate =>
    candidate.name.trim() === wanted.trim() && candidate.variant === variant
)

if (!descriptor) {
  console.error(`no case named ${wanted} with variant ${variant}`)
  console.error('\navailable:')
  for (const candidate of cases) {
    console.error(
      `  ${candidate.name.trim()} [${candidate.variant || 'floor'}]`
    )
  }
  process.exit(1)
}

const TICKS = 2000

const props = createProps()
const instance = descriptor.instantiate()
let state = createInitialState()

if (descriptor.kind === 'micro') {
  for (let tick = 0; tick < TICKS; tick += 1) {
    for (let call = 0; call < config.callsPerTick; call += 1) {
      instance.run(state, props[call])
    }
  }
} else {
  for (let tick = 0; tick < TICKS; tick += 1) {
    state = applyTick(state, tick)

    for (let call = 0; call < config.callsPerTick; call += 1) {
      instance.run(state, props[call])
    }
  }
}

console.log(
  `${wanted} [${variant}] recomputations: ${instance.recomputations()}`
)
