/**
 * Webpack Configuration for Visual Command Builder Production Build
 * Optimizes and bundles the command builder assets
 */

import path from 'path';
import { fileURLToPath } from 'url';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import MiniCssExtractPlugin from 'mini-css-extract-plugin';
import CssMinimizerPlugin from 'css-minimizer-webpack-plugin';
import TerserPlugin from 'terser-webpack-plugin';
import { CleanWebpackPlugin } from 'clean-webpack-plugin';
import CopyWebpackPlugin from 'copy-webpack-plugin';
import { BundleAnalyzerPlugin } from 'webpack-bundle-analyzer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isProduction = process.env.NODE_ENV === 'production';
const analyzeBundle = process.env.ANALYZE === 'true';

export default {
  mode: isProduction ? 'production' : 'development',

  entry: {
    // Visual Command Builder entries
    'command-builder': './src/renderer/visual-command-builder.js',
    'command-builder-integration': './src/renderer/command-builder-integration.js',
    'command-builder-titlebar': './src/renderer/command-builder-titlebar-integration.js',

    // Main terminal entry
    'terminal-main': './src/renderer/renderer.js',

    // Contextual tips (since they work together)
    'contextual-tips': './src/renderer/contextual-tips-system.js',
  },

  output: {
    path: path.resolve(__dirname, 'dist/renderer'),
    filename: isProduction ? '[name].[contenthash:8].js' : '[name].js',
    chunkFilename: isProduction ? '[name].[contenthash:8].chunk.js' : '[name].chunk.js',
    clean: true,
    publicPath: './',
    library: {
      type: 'module',
    },
  },

  experiments: {
    outputModule: true,
  },

  optimization: {
    minimize: isProduction,
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          compress: {
            drop_console: isProduction,
            drop_debugger: isProduction,
            passes: 2,
          },
          mangle: {
            safari10: true,
          },
          format: {
            comments: false,
            safari10: true,
          },
        },
        extractComments: false,
      }),
      new CssMinimizerPlugin({
        minimizerOptions: {
          preset: [
            'default',
            {
              discardComments: { removeAll: true },
              normalizeWhitespace: true,
              colormin: true,
              convertValues: true,
              discardDuplicates: true,
              mergeLonghand: true,
              mergeRules: true,
              minifyFontValues: true,
              minifyGradients: true,
              minifyParams: true,
              minifySelectors: true,
              reduceIdents: false, // Keep animation names readable
              reduceTransforms: true,
              svgo: true,
            },
          ],
        },
      }),
    ],

    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        // Vendor libraries
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          priority: 10,
          reuseExistingChunk: true,
        },

        // Common RinaWarp modules
        common: {
          name: 'common',
          minChunks: 2,
          priority: 5,
          reuseExistingChunk: true,
        },

        // Command Builder specific
        commandBuilder: {
          test: /visual-command-builder|command-builder-integration/,
          name: 'command-builder',
          priority: 20,
          reuseExistingChunk: true,
        },
      },
    },

    runtimeChunk: {
      name: 'runtime',
    },
  },

  module: {
    rules: [
      // JavaScript/ES Modules
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
                  targets: {
                    electron: '28.0.0',
                  },
                  modules: false,
                  useBuiltIns: 'usage',
                  corejs: 3,
                },
              ],
            ],
            plugins: [
              '@babel/plugin-syntax-dynamic-import',
              [
                '@babel/plugin-transform-runtime',
                {
                  regenerator: true,
                },
              ],
            ],
          },
        },
      },

      // CSS Processing
      {
        test: /\.css$/,
        use: [
          isProduction ? MiniCssExtractPlugin.loader : 'style-loader',
          {
            loader: 'css-loader',
            options: {
              sourceMap: !isProduction,
              importLoaders: 1,
            },
          },
          {
            loader: 'postcss-loader',
            options: {
              postcssOptions: {
                plugins: ['autoprefixer', ...(isProduction ? ['cssnano'] : [])],
              },
            },
          },
        ],
      },

      // Images and Icons
      {
        test: /\.(png|jpe?g|gif|svg|ico)$/i,
        type: 'asset',
        parser: {
          dataUrlCondition: {
            maxSize: 8 * 1024, // 8KB
          },
        },
        generator: {
          filename: 'images/[name].[hash:8][ext]',
        },
      },

      // Fonts
      {
        test: /\.(woff|woff2|eot|ttf|otf)$/i,
        type: 'asset/resource',
        generator: {
          filename: 'fonts/[name].[hash:8][ext]',
        },
      },
    ],
  },

  plugins: [
    new CleanWebpackPlugin(),

    // Extract CSS
    ...(isProduction
      ? [
          new MiniCssExtractPlugin({
            filename: '[name].[contenthash:8].css',
            chunkFilename: '[name].[contenthash:8].css',
          }),
        ]
      : []),

    // HTML Templates
    new HtmlWebpackPlugin({
      template: './src/renderer/index.html',
      filename: 'index.html',
      chunks: [
        'runtime',
        'vendors',
        'common',
        'terminal-main',
        'command-builder',
        'contextual-tips',
      ],
      minify: isProduction
        ? {
            removeComments: true,
            collapseWhitespace: true,
            removeRedundantAttributes: true,
            useShortDoctype: true,
            removeEmptyAttributes: true,
            removeStyleLinkTypeAttributes: true,
            keepClosingSlash: true,
            minifyJS: true,
            minifyCSS: true,
            minifyURLs: true,
          }
        : false,
    }),

    // Test page for development
    ...(isProduction
      ? []
      : [
          new HtmlWebpackPlugin({
            template: './test-command-builder.html',
            filename: 'test-command-builder.html',
            chunks: ['runtime', 'command-builder'],
            minify: false,
          }),
        ]),

    // Copy static assets
    new CopyWebpackPlugin({
      patterns: [
        {
          from: 'public',
          to: '../public',
          globOptions: {
            ignore: ['**/*.html'],
          },
        },
        {
          from: 'styles',
          to: '../styles',
        },
      ],
    }),

    // Bundle analyzer (optional)
    ...(analyzeBundle
      ? [
          new BundleAnalyzerPlugin({
            analyzerMode: 'static',
            openAnalyzer: false,
            reportFilename: '../bundle-analysis.html',
          }),
        ]
      : []),

    // Production optimizations
    ...(isProduction
      ? [
          new (class CommandBuilderOptimizationPlugin {
            apply(compiler) {
              compiler.hooks.compilation.tap('CommandBuilderOptimization', compilation => {
                compilation.hooks.afterOptimizeAssets.tap('CommandBuilderOptimization', () => {
                  console.log('🧜‍♀️ Optimizing Visual Command Builder assets...');

                  // Log asset sizes
                  const assets = compilation.getAssets();
                  const commandBuilderAssets = assets.filter(
                    asset =>
                      asset.name.includes('command-builder') ||
                      asset.name.includes('visual-command-builder')
                  );

                  if (commandBuilderAssets.length > 0) {
                    console.log('📊 Command Builder Assets:');
                    commandBuilderAssets.forEach(asset => {
                      const sizeKB = Math.round((asset.source.size() / 1024) * 100) / 100;
                      console.log(`  ✅ ${asset.name}: ${sizeKB}KB`);
                    });
                  }
                });
              });
            }
          })(),
        ]
      : []),
  ],

  resolve: {
    extensions: ['.js', '.json'],
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@renderer': path.resolve(__dirname, 'src/renderer'),
      '@styles': path.resolve(__dirname, 'styles'),
    },
    fallback: {
      path: require.resolve('path-browserify'),
      os: require.resolve('os-browserify/browser'),
      crypto: require.resolve('crypto-browserify'),
      stream: require.resolve('stream-browserify'),
      buffer: require.resolve('buffer'),
      process: require.resolve('process/browser'),
      util: require.resolve('util'),
    },
  },

  target: 'electron-renderer',

  devtool: isProduction ? 'source-map' : 'eval-cheap-module-source-map',

  stats: {
    colors: true,
    modules: false,
    children: false,
    chunks: false,
    chunkModules: false,
    entrypoints: false,
  },

  performance: {
    hints: isProduction ? 'warning' : false,
    maxEntrypointSize: 512000, // 500KB
    maxAssetSize: 512000, // 500KB
  },
};
