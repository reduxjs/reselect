/** @type {import('@ts-jest/dist/types').InitialOptionsTsJest} */

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testRegex: '(/test/.*(js|ts))$',
  globals: {
    'ts-jest': {
      tsconfig: './test/tsconfig.json'
    }
  }
}
