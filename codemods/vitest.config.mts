import * as path from 'path'
import { defineConfig } from 'vitest/config'
import packageJson from './package.json' with { type: 'json' }

const vitestConfig = defineConfig({
  test: {
    dir: path.join(import.meta.dirname, 'tests'),
    name: packageJson.name,
    root: import.meta.dirname,

    coverage: {
      include: ['src'],
      extension: ['.ts', '.tsx', '.js', '.jsx', '.mts', '.mjs', '.cts', '.cjs'],
    },

    reporters: process.env.GITHUB_ACTIONS
      ? [['github-actions'], ['verbose']]
      : [['verbose']],

    typecheck: {
      enabled: true,
      tsconfig: path.join(import.meta.dirname, 'tsconfig.json'),
    },

    clearMocks: true,
    unstubEnvs: true,
    unstubGlobals: true,

    globals: true,
    watch: false,

    chaiConfig: {
      truncateThreshold: 10_000,
    },

    globalSetup: ['./vitest.global.setup.ts'],
  },

  define: {
    'import.meta.vitest': 'undefined',
  },
})

export default vitestConfig
