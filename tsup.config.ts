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
    sourcemap: true,
    ...options
  }

  return [
    // Modern ESM
    {
      ...commonOptions,
      format: ['esm'],
      target: 'es2019',
      outExtension: () => ({ js: '.mjs' }),
      dts: true,
      clean: true
    },

    // Support Webpack 4 by pointing `"module"` to a file with a `.js` extension
    // and optional chaining compiled away
    {
      ...commonOptions,
      entry: {
        'reselect.legacy-esm': 'src/index.ts'
      },
      format: ['esm'],
      outExtension: () => ({ js: '.js' }),
      target: 'es2017'
    },
    // Browser-ready ESM, production + minified
    {
      ...commonOptions,
      entry: {
        'reselect.browser': 'src/index.ts'
      },
      define: {
        'process.env.NODE_ENV': JSON.stringify('production')
      },
      format: ['esm'],
      outExtension: () => ({ js: '.mjs' }),
      minify: true
    },
    {
      ...commonOptions,
      format: 'cjs',
      outDir: './dist/cjs/',
      outExtension: () => ({ js: '.cjs' })
    }
  ]
})
