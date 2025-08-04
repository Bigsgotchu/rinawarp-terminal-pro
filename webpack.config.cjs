/*
 * 🧜‍♀️ This file has been automatically modernized by RinaWarp Terminal
 * 1 deprecated pattern(s) replaced with modern alternatives
 * Please review and test the changes
 */

const path = require('node:path');

module.exports = {
  mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
  target: 'electron-renderer',
  entry: {
    renderer: './src/renderer/renderer.js',
    'ai-integration': './src/ai-integration.js',
  },
  output: {
    filename: '[name].bundle.js',
    path: path.resolve(__dirname, 'dist'),
    publicPath: '/',
    clean: true,
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env'],
            plugins: ['@babel/plugin-transform-modules-commonjs'],
          },
        },
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader', 'postcss-loader'],
      },
      {
        test: /\.(png|svg|jpg|jpeg|gif)$/i,
        type: 'asset/resource',
      },
      {
        test: /\.(woff|woff2|eot|ttf|otf)$/i,
        type: 'asset/resource',
      },
      {
        test: /\.html$/,
        use: 'html-loader',
      },
    ],
  },
  resolve: {
    extensions: ['.js', '.json', '.ts'],
    modules: ['node_modules'],
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@components': path.resolve(__dirname, 'src/components'),
      '@renderer': path.resolve(__dirname, 'src/renderer'),
      '@ai': path.resolve(__dirname, 'src/ai'),
      '@utils': path.resolve(__dirname, 'src/utils'),
      // XTerm aliases for better resolution
      '@xterm/xterm': path.resolve(__dirname, 'node_modules/@xterm/xterm'),
      '@xterm/addon-fit': path.resolve(__dirname, 'node_modules/@xterm/addon-fit'),
      '@xterm/addon-web-links': path.resolve(__dirname, 'node_modules/@xterm/addon-web-links'),
    },
    fallback: {
      fs: false,
      path: require.resolve('path-browserify'),
      os: require.resolve('os-browserify/browser'),
      crypto: require.resolve('crypto-browserify'),
      stream: require.resolve('stream-browserify'),
      util: require.resolve('util'),
      buffer: require.resolve('buffer'),
      process: require.resolve('process/browser.js'),
      child_process: false,
      net: false,
      tls: false,
      readline: false,
    },
  },
  plugins: [
    new (require('webpack').DefinePlugin)({
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
      'process.env.ELECTRON_ENV': JSON.stringify(process.env.ELECTRON_ENV || 'renderer'),
    }),
    new (require('webpack').ProvidePlugin)({
      Buffer: ['buffer', 'Buffer'],
      process: 'process/browser.js',
    }),
  ],
  devServer: {
    static: {
      directory: path.join(__dirname, 'dist'),
    },
    compress: true,
    port: 3000,
    historyApiFallback: true,
    hot: true,
  },
  devtool: 'source-map',
  optimization: {
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        vendor: {
          test: /[\/\\]node_modules[\/\\]/,
          name: 'vendors',
          chunks: 'all',
        },
      },
    },
  },
};
