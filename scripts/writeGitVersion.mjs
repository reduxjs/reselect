import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const gitRev = process.argv[2]

const packagePath = path.join(__dirname, '../package.json')
const pkg = JSON.parse(fs.readFileSync(packagePath))

pkg.version = `${pkg.version}-${gitRev}`
fs.writeFileSync(packagePath, JSON.stringify(pkg, null, 2))
