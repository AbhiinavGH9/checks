module.exports = {
  plugins: [
    require('postcss-preset-env')({
      autoprefixer: { grid: 'autoplace' },
      features: {
        'color-functional-notation': true
      }
    })
  ]
}
