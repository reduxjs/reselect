var run = require('child_process').execSync

try {
  run('$(npm bin)/flow ./flow_test/should_pass')
}
catch(e) {
  // eslint-disable-next-line no-console
  console.log('Typing error: valid flow typings in should_pass did not type check')
  process.exit(1)
}

try {
  run('$(npm bin)/flow ./flow_test/should_fail')
}
catch(e) {
  process.exit(0)
}

// eslint-disable-next-line no-console
console.log('Typing error: invalid flow typings in should_fail successfully type checked')
process.exit(1)
