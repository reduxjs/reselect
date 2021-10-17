const { NODE_ENV, BABEL_ENV } = process.env
const cjs = NODE_ENV === 'test' || BABEL_ENV === 'commonjs'

module.exports = {
  presets: [
    [
      '@babel/preset-env',
      {
        targets: {
          ie: 11
        },
        loose: true,
        modules: cjs ? 'cjs' : false
      }
    ],
    '@babel/preset-typescript'
  ],
  plugins: [cjs && ['@babel/transform-modules-commonjs']].filter(Boolean)
}
