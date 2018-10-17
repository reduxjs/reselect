import babel from '@rollup/plugin-babel'

export default {
  input: 'src/index.js',
  output: {
    file: 'dist/reselect.js',
    format: 'umd',
    name: 'Reselect'
  },
  plugins: [
    babel({
      babelHelpers: 'bundled'
    })
  ]
}
