var run = require('child_process').execSync

try {
  run('./node_modules/typescript/bin/tsc ./typescript_test/should_compile/index.ts')
}
catch(e) {
  console.log('Typing error: valid typescript typings failed to compile')
  process.exit(1)
}

try {
  run('./node_modules/typescript/bin/tsc ./typescript_test/should_not_compile/index.ts')
}
catch(e) {
  process.exit(0)
}

console.log('Typing error: invalid typescript typings successfully compiled')
process.exit(1)
