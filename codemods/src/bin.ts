#!/usr/bin/env node

import { globby } from 'globby'
import * as child_process from 'node:child_process'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const execFile = promisify(child_process.execFile)

const extensions = 'ts,tsx,js,jsx,mts,cts,mjs,cjs'

const transformerDirectory = path.join(__dirname, '..', 'dist', 'transforms')
const transformerFilePath = path.join(
  transformerDirectory,
  `${process.argv[2]}.js`,
)

const runCodemod = async () => {
  const targetedFiles = await globby(process.argv.slice(3))

  await execFile(
    'jscodeshift',
    ['-t', transformerFilePath, '--extensions', extensions, ...targetedFiles],
    { shell: true },
  )
}

void runCodemod()
