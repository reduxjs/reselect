import type { ExecFileOptionsWithOtherEncoding } from 'node:child_process'
import * as child_process from 'node:child_process'
import * as path from 'node:path'
import { promisify } from 'node:util'
import packageJson from '../package.json' with { type: 'json' }

const execFile = promisify(child_process.execFile)

export const fixtureParentDirectoryPath = path.join(
  import.meta.dirname,
  '__testfixtures__',
)

export const tempParentDirectoryPath = path.join(
  import.meta.dirname,
  '..',
  '.temp',
)

export const extensionsToTest = [
  'ts',
  'tsx',
  'js',
  'jsx',
  'mts',
  'cts',
  'mjs',
  'cjs',
] as const

export const TSExtensions = ['ts', 'tsx', 'mts', 'cts'] as const

export const JSExtensions = ['js', 'jsx', 'mjs', 'cjs'] as const

const defaultCLICommand = packageJson.name

const defaultCLIArguments = [] as const satisfies string[]

const defaultExecFileOptions = {
  encoding: 'utf-8',
  shell: true,
} as const satisfies ExecFileOptionsWithOtherEncoding

export const runCodemodCLI = async (
  CLIArguments: readonly string[] = [],
  execFileOptions?: Partial<ExecFileOptionsWithOtherEncoding>,
): Promise<{
  stderr: string
  stdout: string
}> => {
  const { stderr, stdout } = await execFile(
    defaultCLICommand,
    [...defaultCLIArguments, ...CLIArguments],
    {
      ...defaultExecFileOptions,
      ...execFileOptions,
    },
  )

  if (stderr) {
    console.log(stderr.trim())
  }

  if (stdout) {
    console.log(stdout.trim())
  }

  return { stderr, stdout }
}
