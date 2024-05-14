import { globbySync } from 'globby'
import type { Transform } from 'jscodeshift'
import type { TestOptions } from 'jscodeshift/src/testUtils'
import { applyTransform } from 'jscodeshift/src/testUtils'
import fs from 'node:fs'
import path from 'node:path'

export const runTransformTest = (
  name: string,
  transform: Transform,
  parser: TestOptions['parser'],
  fixturePath: string,
) => {
  describe(name, () => {
    globbySync('**/*.input.*', {
      cwd: fixturePath,
      absolute: true,
      objectMode: true,
    })
      .map(entry => entry.name)
      .forEach(filename => {
        const extension = path.extname(filename)

        const testName = filename.replace(`.input${extension}`, '')

        const testInputPath = path.join(fixturePath, `${testName}${extension}`)

        const inputPath = path.join(
          fixturePath,
          `${testName}.input${extension}`,
        )

        const outputPath = path.join(
          fixturePath,
          `${testName}.output${extension}`,
        )

        const inputFileContent = fs.readFileSync(inputPath, 'utf8')

        const expectedOutput = fs.readFileSync(outputPath, 'utf8')

        describe(`${testName}${extension}`, () => {
          it('transforms correctly', () => {
            const output = applyTransform(
              transform,
              {},
              {
                path: testInputPath,
                source: inputFileContent,
              },
              { parser },
            )
            expect(output).toBe(expectedOutput.trim().replace('\r\n', '\n'))
          })

          it('is idempotent', () => {
            const output = applyTransform(
              transform,
              {},
              {
                path: testInputPath,
                source: inputFileContent,
              },
              { parser },
            )
            expect(output).toBe(expectedOutput.trim().replace('\r\n', '\n'))
          })
        })
      })
  })
}
