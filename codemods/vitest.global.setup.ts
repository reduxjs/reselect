import * as fs from 'node:fs/promises'
import path from 'node:path'
import type { TestProject } from 'vitest/node'
import {
  JSExtensions,
  TSExtensions,
  fixtureParentDirectoryPath,
  tempParentDirectoryPath,
} from './tests/test-utils.js'

export async function setup(_testProject: TestProject): Promise<void> {
  await fs.rm(tempParentDirectoryPath, { force: true, recursive: true })

  await fs.mkdir(tempParentDirectoryPath, { recursive: true })

  await fs.cp(fixtureParentDirectoryPath, tempParentDirectoryPath, {
    recursive: true,
    filter: source =>
      !source.endsWith('.output.ts') && !source.endsWith('.output.js'),
  })

  const directoryEntries = await Promise.all(
    (
      await fs.readdir(tempParentDirectoryPath, {
        recursive: true,
        encoding: 'utf-8',
        withFileTypes: true,
      })
    )
      .filter(directoryEntry => directoryEntry.isFile())
      .map(async directoryEntry => {
        const pathExtension = path.extname(directoryEntry.name)

        const basename = path.basename(
          directoryEntry.name,
          `.input${pathExtension}`,
        )

        const newPath = path.join(
          directoryEntry.parentPath,
          `${basename}.output${pathExtension}`,
        )

        const oldPath = path.join(
          directoryEntry.parentPath,
          directoryEntry.name,
        )

        await fs.rename(oldPath, newPath)

        return newPath
      }),
  )

  directoryEntries
    .filter(directoryEntry => directoryEntry.endsWith('.ts'))
    .map(async directoryEntry => {
      await Promise.all(
        TSExtensions.map(extensionToTest =>
          fs.copyFile(
            directoryEntry,
            path.join(
              path.dirname(directoryEntry),
              `${path.basename(directoryEntry, '.ts')}.${extensionToTest}`,
            ),
          ),
        ),
      )
    })

  directoryEntries
    .filter(directoryEntry => directoryEntry.endsWith('.js'))
    .map(async directoryEntry => {
      await Promise.all(
        JSExtensions.map(extensionToTest =>
          fs.copyFile(
            directoryEntry,
            path.join(
              path.dirname(directoryEntry),
              `${path.basename(directoryEntry, '.js')}.${extensionToTest}`,
            ),
          ),
        ),
      )
    })
}

export async function teardown(): Promise<void> {
  if (process.env.KEEP_TEMP_DIR !== 'true') {
    await fs.rm(tempParentDirectoryPath, { force: true, recursive: true })
  }
}
