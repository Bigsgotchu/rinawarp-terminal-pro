import path from 'path';
import webpack from 'webpack';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default {
  mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
  
  entry: {
    'test-environment': './src/testing/test-environment.js',
    'system-vitals': './src/overlays/SystemVitals.js',
    'error-triage': './src/utils/error-triage-system.js',
    'main-bundle': './src/renderer/renderer.js'
  },

  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].bundle.js',
    library: {
      name: '[name]',
      type: 'umd',
      export: 'default'
    },
    globalObject: 'this',
    clean: true
  },

  resolve: {
    extensions: ['.js', '.jsx', '.ts', '.tsx'],
    fallback: {
      // Node.js polyfills for browser
      "crypto": "crypto-browserify",
      "stream": "stream-browserify",
      "path": "path-browserify",
      "os": "os-browserify",
      "buffer": "buffer",
      "process": "process/browser",
      "util": "util",
      "fs": false,
      "child_process": false,
      "net": false,
      "tls": false
    }
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
                targets: {
                  browsers: ['> 1%', 'last 2 versions']
                },
                modules: false
              }]
            ]
          }
        }
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader', 'postcss-loader']
      },
      {
        test: /\.(png|svg|jpg|jpeg|gif)$/i,
        type: 'asset/resource'
      }
    ]
  },

  plugins: [
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
      'global': 'globalThis'
    }),
    new webpack.ProvidePlugin({
      Buffer: ['buffer', 'Buffer'],
      process: 'process/browser'
    })
  ],

  optimization: {
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all'
        },
        common: {
          name: 'common',
          minChunks: 2,
          chunks: 'all',
          enforce: true
        }
      }
    }
  },

  devtool: process.env.NODE_ENV === 'production' ? 'source-map' : 'eval-source-map',
  
  devServer: {
    static: {
      directory: path.join(__dirname, 'dist')
    },
    compress: true,
    port: 8080,
    hot: true,
    open: true
  },

  target: 'web',
  
  externals: {
    // Don't bundle electron APIs - they'll be provided by the runtime
    'electron': 'commonjs2 electron'
  }
};
