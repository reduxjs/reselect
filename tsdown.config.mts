import fs from 'node:fs/promises'
import path from 'node:path'
import type { UserConfig } from 'tsdown'
import { defineConfig } from 'tsdown'

async function writeCommonJSEntry() {
  await fs.writeFile(
    path.join('dist/cjs/', 'index.js'),
    `'use strict'
if (process.env.NODE_ENV === 'production') {
  module.exports = require('./reselect.production.min.cjs')
} else {
  module.exports = require('./reselect.development.cjs')
}`
  )
}

export default defineConfig((options): UserConfig[] => {
  const commonOptions = {
    entry: {
      reselect: 'src/index.ts'
    },
    sourcemap: true,
    // `pnpm clean` already removes `dist/`; letting each of the six builds
    // clean would race them against each other.
    clean: false,
    hash: false,
    report: false,
    target: ['esnext'],
    dts: false,
    // esbuild dropped JSDoc from the bundles; Rolldown keeps it by default,
    // which inflates every output file several times over. Legal and
    // annotation comments stay so `@__PURE__` survives for consumers.
    outputOptions: {
      comments: { jsdoc: false }
    },
    ...options
  } satisfies UserConfig

  return [
    // Standard ESM, embedded `process.env.NODE_ENV` checks
    {
      ...commonOptions,
      name: 'Modern ESM',
      format: ['esm'],
      outExtensions: () => ({ js: '.mjs' })
    },

    // Support Webpack 4 by pointing `"module"` to a file with a `.js` extension
    // and optional chaining compiled away
    {
      ...commonOptions,
      name: 'Legacy ESM, Webpack 4',
      entry: {
        'reselect.legacy-esm': 'src/index.ts'
      },
      format: ['esm'],
      target: ['es2017'],
      outExtensions: () => ({ js: '.js' })
    },

    // Meant to be served up via CDNs like `unpkg`.
    {
      ...commonOptions,
      name: 'Browser-ready ESM',
      entry: {
        'reselect.browser': 'src/index.ts'
      },
      platform: 'browser',
      env: {
        NODE_ENV: 'production'
      },
      format: ['esm'],
      outExtensions: () => ({ js: '.mjs' }),
      minify: true
    },
    {
      ...commonOptions,
      name: 'CJS Development',
      entry: {
        'reselect.development': 'src/index.ts'
      },
      env: {
        NODE_ENV: 'development'
      },
      format: ['cjs'],
      outDir: './dist/cjs/',
      outExtensions: () => ({ js: '.cjs' })
    },
    {
      ...commonOptions,
      name: 'CJS production',
      entry: {
        'reselect.production.min': 'src/index.ts'
      },
      env: {
        NODE_ENV: 'production'
      },
      format: ['cjs'],
      outDir: './dist/cjs/',
      outExtensions: () => ({ js: '.cjs' }),
      minify: true,
      onSuccess: async () => {
        await writeCommonJSEntry()
      }
    },
    {
      ...commonOptions,
      name: 'Type definitions',
      format: ['esm'],
      sourcemap: false,
      dts: { emitDtsOnly: true, sourcemap: false },
      outExtensions: () => ({ dts: '.d.ts' })
    }
  ]
})
