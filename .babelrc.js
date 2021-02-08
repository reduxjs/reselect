const { BABEL_ENV, NODE_ENV } = process.env
const cjs = BABEL_ENV === 'cjs' || NODE_ENV === 'test'

module.exports = {
  presets: [
    ['@babel/env', { loose: true, modules: cjs ? 'cjs' : false }]
  ],
}
