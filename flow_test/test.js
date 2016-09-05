var run = require('child_process').execSync

try {
  run('./node_modules/flow-bin/cli.js ./flow-test/shoud_pass', {
    cwd: '.'
  })
}
catch(e) {
  // eslint-disable-next-line no-console
  console.log('Typing error: valid flow typings failed to lint')
  process.exit(1)
}

try {
  run('./node_modules/flow-bin/cli ./flow-test/shoud_fail')
}
catch(e) {
  process.exit(0)
}

// eslint-disable-next-line no-console
console.log('Typing error: invalid flow typings successfully compiled')
process.exit(1)
