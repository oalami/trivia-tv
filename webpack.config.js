const path = require('path');

module.exports = {
  context: path.join(__dirname, 'src'),
  entry: {
    tv: './tv.js',
    phone: './phone.js',
    host: './host.js',
  },
  output: {
    path: path.join(__dirname, 'public/js'),
    filename: '[name]-bundle.js',
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: ['babel-loader'],
      },
    ],
  },
  resolve: {
    modules: [
      path.join(__dirname, 'node_modules'),
    ],
  },
};
