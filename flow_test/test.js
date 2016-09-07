var run = require('child_process').execSync

try {
  run('./node_modules/flow-bin/cli.js ./flow_test/should_pass')
}
catch(e) {
  // eslint-disable-next-line no-console
  console.log('Typing error: valid flow typings failed to lint')
  process.exit(1)
}

try {
  run('./node_modules/flow-bin/cli.js ./flow_test/should_fail')
}
catch(e) {
  process.exit(0)
}

// eslint-disable-next-line no-console
console.log('Typing error: invalid flow typings successfully compiled')
process.exit(1)
