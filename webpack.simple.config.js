import path from 'path';
import webpack from 'webpack';
import { fileURLToPath } from 'url';
import HtmlWebpackPlugin from 'html-webpack-plugin';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default {
  mode: 'development',

  entry: {
    vendor: './src/entries/vendor.js',
    terminal: './src/entries/terminal-main.js',
  },

  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
    clean: true,
  },

  resolve: {
    extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@utils': path.resolve(__dirname, 'src/utils'),
      '@renderer': path.resolve(__dirname, 'src/renderer'),
    },
    fallback: {
      crypto: 'crypto-browserify',
      stream: 'stream-browserify',
      path: 'path-browserify',
      os: 'os-browserify',
      buffer: 'buffer',
      process: 'process/browser',
      util: 'util',
      fs: false,
      child_process: false,
      net: false,
      tls: false,
    },
  },

  module: {
    rules: [
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              [
                '@babel/preset-env',
                {
                  targets: { browsers: ['> 1%', 'last 2 versions'] },
                },
              ],
            ],
          },
        },
      },
    ],
  },

  plugins: [
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify('development'),
      __VERSION__: JSON.stringify('1.0.19'),
    }),

    new webpack.ProvidePlugin({
      Buffer: ['buffer', 'Buffer'],
      process: 'process',
    }),

    new HtmlWebpackPlugin({
      template: './src/templates/terminal.html',
      filename: 'terminal.html',
    }),
  ],

  devtool: 'eval-source-map',
};
