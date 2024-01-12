import { globbySync } from 'globby'
import type { Transform } from 'jscodeshift'
import type { TestOptions } from 'jscodeshift/src/testUtils'
import { runInlineTest } from 'jscodeshift/src/testUtils'
import fs from 'node:fs'
import path from 'node:path'
import { describe, it } from 'vitest'

export const runTransformTest = (
  name: string,
  transform: Transform,
  parser: TestOptions['parser'],
  fixturePath: string
) => {
  describe(name, () => {
    globbySync('**/*.input.*', {
      cwd: fixturePath,
      absolute: true
    })
      .map((entry) => entry.slice(fixturePath.length))
      .forEach((filename) => {
        const extension = path.extname(filename)
        const testName = filename.replace(`.input${extension}`, '')
        const testInputPath = path.join(fixturePath, `${testName}${extension}`)
        const inputPath = path.join(
          fixturePath,
          `${testName}.input${extension}`
        )
        const outputPath = path.join(
          fixturePath,
          `${testName}.output${extension}`
        )
        // const optionsPath = path.join(fixturePath, `${testName}.options.json`)
        // const options = fs.existsSync(optionsPath)
        //   ? fs.readFileSync(optionsPath, 'utf-8')
        //   : '{}'

        describe(testName, () => {
          // beforeEach(() => {
          //   process.env.CODEMOD_CLI_ARGS = options
          // })

          // afterEach(() => {
          //   process.env.CODEMOD_CLI_ARGS = ''
          // })

          it('transforms correctly', () => {
            runInlineTest(
              transform,
              {},
              {
                path: testInputPath,
                source: fs.readFileSync(inputPath, 'utf8')
              },
              fs.readFileSync(outputPath, 'utf8'),
              { parser }
            )
          })

          it('is idempotent', () => {
            runInlineTest(
              transform,
              {},
              {
                path: testInputPath,
                source: fs.readFileSync(outputPath, 'utf8')
              },
              fs.readFileSync(outputPath, 'utf8'),
              { parser }
            )
          })
        })
      })
  })
}
