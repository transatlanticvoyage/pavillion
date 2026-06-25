const path = require('path');
const webpack = require('webpack');

module.exports = {
  mode: 'development',
  entry: './src/react/index.jsx',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'react-bundle.js',
    library: 'PavillionReact',
    libraryTarget: 'umd',
    globalObject: 'this'
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-react']
          }
        }
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader', 'postcss-loader']
      }
    ]
  },
  resolve: {
    extensions: ['.js', '.jsx'],
    fallback: {
      "path": false,
      "fs": false,
      "crypto": false
    }
  },
  plugins: [
    new webpack.DefinePlugin({
      'global': 'window',
      'process.env.NODE_ENV': JSON.stringify('development')
    }),
    new webpack.ProvidePlugin({
      process: 'process/browser',
      Buffer: ['buffer', 'Buffer']
    })
  ],
  target: 'electron-renderer'
};