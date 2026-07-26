import fs from 'node:fs/promises'
import path from 'node:path'
import { defineConfig, type Options } from 'tsdown'

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

const commonOptions = {
  entry: { reselect: 'src/index.ts' },
  sourcemap: true,
  target: 'esnext',
  // tsdown bundles into a single file per entry, matching the previous
  // `tsup` output rather than mirroring the source module layout.
  unbundle: false,
  // Only the first build wipes `dist`; the rest add to it.
  clean: false
} satisfies Options

export default defineConfig([
  {
    ...commonOptions,
    name: 'Modern ESM',
    format: 'esm',
    outExtensions: () => ({ js: '.mjs', dts: '.d.ts' }),
    // Emit the single shared type definitions alongside the modern ESM build.
    dts: true,
    clean: true
  },

  // Support Webpack 4 by pointing `"module"` to a file with a `.js` extension
  // and optional chaining compiled away
  {
    ...commonOptions,
    name: 'Legacy ESM, Webpack 4',
    entry: { 'reselect.legacy-esm': 'src/index.ts' },
    format: 'esm',
    outExtensions: () => ({ js: '.js' }),
    target: 'es2017',
    dts: false
  },

  // Meant to be served up via CDNs like `unpkg`.
  {
    ...commonOptions,
    name: 'Browser-ready ESM',
    entry: { 'reselect.browser': 'src/index.ts' },
    platform: 'browser',
    env: { NODE_ENV: 'production' },
    format: 'esm',
    outExtensions: () => ({ js: '.mjs' }),
    minify: true,
    dts: false
  },

  {
    ...commonOptions,
    name: 'CJS Development',
    entry: { 'reselect.development': 'src/index.ts' },
    env: { NODE_ENV: 'development' },
    format: 'cjs',
    outDir: './dist/cjs/',
    outExtensions: () => ({ js: '.cjs' }),
    dts: false
  },

  {
    ...commonOptions,
    name: 'CJS Production',
    entry: { 'reselect.production.min': 'src/index.ts' },
    env: { NODE_ENV: 'production' },
    format: 'cjs',
    outDir: './dist/cjs/',
    outExtensions: () => ({ js: '.cjs' }),
    minify: true,
    dts: false,
    onSuccess: writeCommonJSEntry
  }
])
