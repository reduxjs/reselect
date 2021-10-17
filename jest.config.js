/** @type {import('@ts-jest/dist/types').InitialOptionsTsJest} */

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  coverageDirectory: './coverage/',
  collectCoverage: true,
  testRegex: '(/test/.*(js|ts))$',
  globals: {
    'ts-jest': {
      tsconfig: './test/tsconfig.json'
    }
  }
}
