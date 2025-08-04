const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');

module.exports = {
  mode: 'production',
  target: 'electron-renderer',
  entry: {
    renderer: './src/renderer/renderer.js',
    'ai-integration': './src/ai-integration.js',
  },
  output: {
    filename: '[name].[contenthash].js',
    path: path.resolve(__dirname, 'dist'),
    clean: true,
  },
  optimization: {
    minimize: true,
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          compress: {
            drop_console: true,
            drop_debugger: true,
            pure_funcs: ['console.log', 'console.info', 'console.debug'],
          },
          mangle: true,
        },
      }),
    ],
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        // Split vendor chunks by size
        vendorLarge: {
          test: /[\\/]node_modules[\\/](monaco-editor|@xterm|puppeteer)[\\/]/,
          name: 'vendor-large',
          priority: 20,
        },
        vendorReact: {
          test: /[\\/]node_modules[\\/](react|react-dom)[\\/]/,
          name: 'vendor-react',
          priority: 15,
        },
        vendorCommon: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendor-common',
          priority: 10,
        },
        // Async chunks for code splitting
        asyncCommon: {
          chunks: 'async',
          minChunks: 2,
          name: 'async-common',
        },
      },
    },
    runtimeChunk: 'single',
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              ['@babel/preset-env', {
                modules: false,
                targets: {
                  electron: '37'
                }
              }]
            ],
            plugins: [
              '@babel/plugin-syntax-dynamic-import',
              '@babel/plugin-transform-modules-commonjs'
            ],
          },
        },
      },
    ],
  },
  plugins: [
    process.env.ANALYZE && new BundleAnalyzerPlugin({
      analyzerMode: 'static',
      reportFilename: 'bundle-report.html',
    }),
  ].filter(Boolean),
};
