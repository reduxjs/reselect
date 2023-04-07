import { defineConfig, Options } from 'tsup'
import fs from 'fs'
import sh from 'shelljs'
import type { ExecOptions } from 'shelljs'

function execAsync(cmd: string, opts: ExecOptions = {}) {
  return new Promise(function (resolve, reject) {
    // Execute the command, reject if we exit non-zero (i.e. error)
    sh.exec(cmd, opts, function (code, stdout, stderr) {
      if (code !== 0) return reject(new Error(stderr))
      return resolve(stdout)
    })
  })
}

export default defineConfig(options => {
  const commonOptions: Partial<Options> = {
    entry: {
      reselect: 'src/index.ts'
    },
    ...options
  }

  return [
    {
      ...commonOptions,
      format: ['esm'],
      outExtension: () => ({ js: '.mjs' }),
      dts: true,
      clean: true,
      async onSuccess() {
        // Support Webpack 4 by pointing `"module"` to a file with a `.js` extension
        fs.copyFileSync('dist/reselect.mjs', 'dist/reselect.legacy-esm.js')
        console.log('onSuccess')

        console.log('Generating TS 4.6 types...')
        await execAsync('yarn tsc -p tsconfig.ts46types.json')
        fs.copyFileSync(
          'src/versionedTypes/package.dist.json',
          'dist/versionedTypes/ts46/versionedTypes/package.json'
        )
        console.log('TS 4.6 types done')
      }
    },
    {
      ...commonOptions,
      format: 'cjs',
      outDir: './dist/cjs/',
      outExtension: () => ({ js: '.cjs' })
    }
  ]
})
