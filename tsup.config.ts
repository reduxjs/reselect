import type { Options } from 'tsup'
import { defineConfig } from 'tsup'

const tsconfig = 'tsconfig.build.json' satisfies Options['tsconfig']

export default defineConfig(options => {
  const commonOptions: Options = {
    entry: {
      reselect: 'src/index.ts'
    },
    sourcemap: true,
    tsconfig,
    ...options
  }

  return [
    // Modern ESM
    {
      ...commonOptions,
      format: ['esm'],
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
      format: ['cjs'],
      outDir: './dist/cjs/',
      outExtension: () => ({ js: '.cjs' })
    }
  ] as Options[]
})
