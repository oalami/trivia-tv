const express = require('express');
const webpackDevMiddleware = require('webpack-dev-middleware');
const webpack = require('webpack');
const webpackConfig = require('./webpack-dev.config.js');
const app = express();

const compiler = webpack(webpackConfig);

app.use(webpackDevMiddleware(compiler, {
  // hot: true,
  // filename: 'bundle.js',
  publicPath: '/js',
  stats: {
    colors: true,
  },
  // historyApiFallback: true,
}));

app.use(express.static(__dirname + '/public'));

const server = app.listen(3000, function() {
  const host = server.address().address;
  const port = server.address().port;
  console.log('Example app listening at http://%s:%s', host, port);
});
