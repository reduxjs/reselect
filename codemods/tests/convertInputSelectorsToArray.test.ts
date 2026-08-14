import { globby } from 'globby'
import { applyTransform } from 'jscodeshift/src/testUtils.js'
import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import {
  convertInputSelectorsToArrayTransform,
  parser,
} from '../src/transforms/convertInputSelectorsToArray.js'
import {
  fixtureParentDirectoryPath,
  runCodemodCLI,
  tempParentDirectoryPath,
} from './test-utils.js'

const transformerName = path.basename(import.meta.filename, '.test.ts')

const fixtureDirectoryPath = path.join(
  fixtureParentDirectoryPath,
  transformerName,
)

const tempDirectoryPath = path.join(tempParentDirectoryPath, transformerName)

describe(convertInputSelectorsToArrayTransform, () => {
  describe(transformerName, async () => {
    const entries = await globby('**/*.input.*', {
      cwd: fixtureDirectoryPath,
      absolute: true,
      objectMode: true,
    })

    await Promise.all(
      entries.map(async ({ name: fileName, path: testInputPath }) => {
        const extension = path.extname(fileName)

        const testName = path.basename(fileName, `.input${extension}`)

        const inputFilePath = path.join(
          fixtureDirectoryPath,
          `${testName}.input${extension}`,
        )

        const outputFilePath = path.join(
          fixtureDirectoryPath,
          `${testName}.output${extension}`,
        )

        const inputFileContent = await fs.readFile(inputFilePath, {
          encoding: 'utf-8',
        })

        const expectedOutput = await fs.readFile(outputFilePath, {
          encoding: 'utf-8',
        })

        describe(`${testName}${extension}`, () => {
          it('transforms correctly', () => {
            const actualOutput = applyTransform(
              { default: convertInputSelectorsToArrayTransform, parser },
              {},
              {
                path: testInputPath,
                source: inputFileContent,
              },
              { parser },
            )

            expect(actualOutput).toBe(expectedOutput.trim())
          })

          it('is idempotent', () => {
            const actualOutput = applyTransform(
              { default: convertInputSelectorsToArrayTransform, parser },
              {},
              {
                path: testInputPath,
                source: inputFileContent,
              },
              { parser },
            )

            expect(actualOutput).toBe(expectedOutput.trim())
          })
        })
      }),
    )
  })
})

describe('cli test', { todo: true }, () => {
  test('glob patterns work', async () => {
    await expect(
      runCodemodCLI([transformerName, './**/*-*.*.{m,c,}ts{x,}'], {
        cwd: tempDirectoryPath,
      }),
    ).resolves.not.toThrow()

    const outputFileNames = await globby('**/*.output.ts', {
      cwd: fixtureDirectoryPath,
      absolute: true,
    })

    const expectedContents = Object.fromEntries(
      await Promise.all(
        outputFileNames.map(
          async outputFile =>
            [
              `${path.basename(outputFile, '.ts')}.*`,
              await fs.readFile(outputFile, { encoding: 'utf-8' }),
            ] as const,
        ),
      ),
    )

    const outputFiles = await globby(Object.keys(expectedContents), {
      absolute: true,
      cwd: tempDirectoryPath,
    })

    const outputContents = await Promise.all(
      outputFiles.map(async filePath =>
        fs.readFile(filePath, { encoding: 'utf-8' }),
      ),
    )

    const values = Object.entries(expectedContents)

    values.forEach(([key, value]) => {
      expect(outputContents).toStrictEqual(
        Array(outputContents.length).fill(expectedContents[key]),
      )
    })
  })
})
