import { applyTransform } from 'jscodeshift/src/testUtils'
import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, test } from 'vitest'
import { runTransformTest } from '../../transformTestUtils'
import transform, { parser } from './index'

runTransformTest(
  'convertInputSelectorsToArray',
  transform,
  parser,
  path.join(__dirname, '__testfixtures__')
)

describe('convert input selectors to array', () => {
  test('should convert input selectors to array', () => {
    const inputPath = path.join(
      __dirname,
      '../convertInputSelectorsToArray/__testfixtures__/separate-inline-arguments.input.ts'
    )

    const inputFile = fs.readFileSync(inputPath, 'utf-8')

    const outputFile = fs.readFileSync(
      path.join(
        __dirname,
        '../convertInputSelectorsToArray/__testfixtures__/separate-inline-arguments.output.ts'
      ),
      'utf-8'
    )

    const transformed = applyTransform(
      transform,
      undefined,
      {
        path: inputPath,
        source: inputFile
      },
      { parser }
    )

    expect(transformed).toBe(outputFile)
  })
})
