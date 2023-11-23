import gulp from 'gulp'
import preserveWhitespace from 'gulp-preserve-typescript-whitespace'
import ts from 'gulp-typescript'
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import path from 'node:path'

gulp.task('compile-ts', () => {
  const tsProject = ts.createProject('../examples/tsconfig.json', {
    rootDir: '../'
  })
  return gulp
    .src('../examples/**/*.{ts,tsx}')
    .pipe(preserveWhitespace.saveWhitespace()) // Encodes whitespaces/newlines so TypeScript compiler won't remove them
    .pipe(tsProject()) // TypeScript compiler must be run with "removeComments: false" option
    .js.pipe(preserveWhitespace.restoreWhitespace()) // Restores encoded whitespaces/newlines
    .pipe(gulp.dest('../examples'))
})

const collectMarkdownFiles = (
  directory: string,
  markdownFilesPaths: string[] = []
) => {
  const placeholderRegex = /<!-- START: (.*?) -->([\s\S]*?)<!-- END: \1 -->/g
  const markdownFiles = readdirSync(directory)
  markdownFiles.forEach(markdownFile => {
    const markdownFilePath = path.join(directory, markdownFile)
    if (statSync(markdownFilePath).isDirectory()) {
      markdownFilesPaths = collectMarkdownFiles(
        markdownFilePath,
        markdownFilesPaths
      )
    } else if (
      ['.md', '.mdx'].includes(path.extname(markdownFile)) &&
      placeholderRegex.test(readFileSync(markdownFilePath, 'utf-8'))
    ) {
      markdownFilesPaths.push(markdownFilePath)
    }
  })
  return markdownFilesPaths
}

gulp.task('insert-md', done => {
  const placeholderRegex = /<!-- START: (.*?) -->([\s\S]*?)<!-- END: \1 -->/g
  const markdownFilesPaths = collectMarkdownFiles('docs')
  markdownFilesPaths.forEach(markdownFilePath => {
    let markdownContent = readFileSync(markdownFilePath, 'utf-8')
    const frontMatterRegex = /---\s*[\s\S]*?---/

    const importTabs = markdownContent.includes('import Tabs from')
      ? ''
      : `import Tabs from '@theme/Tabs'\n`
    const importTabItem = markdownContent.includes('import TabItem from')
      ? ''
      : `import TabItem from '@theme/TabItem'\n`
    markdownContent = markdownContent.replace(
      frontMatterRegex,
      match => `${match}\n${importTabs}${importTabItem}`
    )

    markdownContent = markdownContent.replace(
      placeholderRegex,
      (match, filePath: string) => {
        const TSX = path.extname(filePath) === '.tsx' ? 'x' : ''
        const TS = `ts${TSX}`
        const JS = `js${TSX}`
        const tsFilePath = path.join('../examples', filePath)
        const jsFilePath = tsFilePath.replace(`.${TS}`, `.${JS}`)

        const tsFileContent = readFileSync(tsFilePath, 'utf-8')
        const jsFileContent = readFileSync(jsFilePath, 'utf-8')

        return `<!-- START: ${filePath} -->

<Tabs
  groupId='language'
  defaultValue='${TS}'
  values={[
    {label: 'TypeScript', value: '${TS}'},
    {label: 'JavaScript', value: '${JS}'},
  ]}>
  <TabItem value='${TS}'>

  \`\`\`${TS} title="${filePath}"
  ${tsFileContent}
  \`\`\`
  </TabItem>
  <TabItem value='${JS}'>

  \`\`\`${JS} title="${filePath.replace(`.${TS}`, `.${JS}`)}"
  ${jsFileContent}
  \`\`\`
  </TabItem>
</Tabs>

  <!-- END: ${filePath} -->`
      }
    )
    writeFileSync(markdownFilePath, markdownContent)
  })
  done()
})
