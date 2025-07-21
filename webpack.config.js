import path from 'path';
import webpack from 'webpack';
import { fileURLToPath } from 'url';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import MiniCssExtractPlugin from 'mini-css-extract-plugin';
import CopyWebpackPlugin from 'copy-webpack-plugin';
import { CleanWebpackPlugin } from 'clean-webpack-plugin';
import TerserPlugin from 'terser-webpack-plugin';
import CssMinimizerPlugin from 'css-minimizer-webpack-plugin';
import MonacoWebpackPlugin from 'monaco-editor-webpack-plugin';
import { BundleAnalyzerPlugin } from 'webpack-bundle-analyzer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isDev = process.env.NODE_ENV === 'development';
const isProd = process.env.NODE_ENV === 'production';
const isAnalyze = process.env.ANALYZE === 'true';

export default {
  mode: isProd ? 'production' : 'development',
  
  // Entry point consolidation strategy
  entry: {
    // Main terminal entry point - single consolidated entry
    'terminal': {
      import: './src/entries/terminal-main.js',
      dependOn: 'vendor'
    },
    // AI features - lazy loaded
    'ai-assistant': {
      import: './src/entries/ai-assistant.js',
      dependOn: 'vendor'
    },
    // System monitoring - lazy loaded
    'system-vitals': {
      import: './src/entries/system-vitals.js',
      dependOn: 'vendor'
    },
    // Voice features - lazy loaded
    'voice-engine': {
      import: './src/entries/voice-engine.js',
      dependOn: 'vendor'
    },
    // Plugin system - lazy loaded
    'plugin-system': {
      import: './src/entries/plugin-system.js',
      dependOn: 'vendor'
    },
    // Vendor bundle - shared dependencies
    'vendor': {
      import: './src/entries/vendor.js'
    }
  },

  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: isProd ? '[name].[contenthash].js' : '[name].js',
    chunkFilename: isProd ? '[name].[contenthash].chunk.js' : '[name].chunk.js',
    assetModuleFilename: 'assets/[name].[hash][ext][query]',
    library: {
      name: 'RinaWarp',
      type: 'umd',
      umdNamedDefine: true
    },
    globalObject: 'typeof self !== \'undefined\' ? self : this',
    clean: true,
    publicPath: '/'
  },

  resolve: {
    extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@components': path.resolve(__dirname, 'src/components'),
      '@utils': path.resolve(__dirname, 'src/utils'),
      '@renderer': path.resolve(__dirname, 'src/renderer'),
      '@plugins': path.resolve(__dirname, 'src/plugins'),
      '@ai': path.resolve(__dirname, 'src/ai'),
      '@overlays': path.resolve(__dirname, 'src/overlays'),
      '@voice': path.resolve(__dirname, 'src/voice-enhancements')
    },
    fallback: {
      // Node.js polyfills for browser
      "crypto": "crypto-browserify",
      "stream": "stream-browserify",
      "path": "path-browserify",
      "os": "os-browserify",
      "buffer": "buffer",
      "process": "process/browser",
      "util": "util",
      "assert": "assert",
      "url": "url",
      "querystring": "querystring-es3",
      "fs": false,
      "child_process": false,
      "net": false,
      "tls": false,
      "http": false,
      "https": false,
      "zlib": false
    }
  },

  module: {
    rules: [
      {
        test: /\.m?js$/,
        resolve: {
          fullySpecified: false
        }
      },
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              ['@babel/preset-env', {
                targets: {
                  browsers: ['> 0.5%', 'last 2 versions', 'not dead']
                },
                modules: false,
                useBuiltIns: 'usage',
                corejs: { version: 3, proposals: true }
              }]
            ],
            plugins: [
              '@babel/plugin-syntax-dynamic-import'
            ],
            cacheDirectory: true
          }
        }
      },
      {
        test: /\.(ts|tsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              '@babel/preset-typescript',
              ['@babel/preset-env', {
                targets: {
                  browsers: ['> 0.5%', 'last 2 versions', 'not dead']
                },
                modules: false
              }]
            ],
            cacheDirectory: true
          }
        }
      },
      {
        test: /\.css$/,
        use: [
          isDev ? 'style-loader' : MiniCssExtractPlugin.loader,
          {
            loader: 'css-loader',
            options: {
              importLoaders: 1,
              sourceMap: true
            }
          },
          {
            loader: 'postcss-loader',
            options: {
              sourceMap: true
            }
          }
        ]
      },
      {
        test: /\.(scss|sass)$/,
        use: [
          isDev ? 'style-loader' : MiniCssExtractPlugin.loader,
          'css-loader',
          'postcss-loader',
          'sass-loader'
        ]
      },
      {
        test: /\.(png|svg|jpg|jpeg|gif|webp)$/i,
        type: 'asset/resource',
        generator: {
          filename: 'images/[name].[hash][ext]'
        }
      },
      {
        test: /\.(woff|woff2|eot|ttf|otf)$/i,
        type: 'asset/resource',
        generator: {
          filename: 'fonts/[name].[hash][ext]'
        }
      },
      {
        test: /\.(mp3|wav|ogg|mp4|avi|mov)$/i,
        type: 'asset/resource',
        generator: {
          filename: 'media/[name].[hash][ext]'
        }
      },
      {
        test: /\.worker\.(js|ts)$/,
        use: {
          loader: 'worker-loader',
          options: {
            filename: 'workers/[name].[contenthash].worker.js',
            chunkFilename: 'workers/[id].[contenthash].worker.js'
          }
        }
      },
      {
        test: /\.txt$/,
        type: 'asset/source'
      },
      {
        test: /\.json5$/,
        loader: 'json5-loader',
        type: 'javascript/auto'
      }
    ]
  },

  plugins: [
    new CleanWebpackPlugin(),
    
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
      'process.env.BUILD_DATE': JSON.stringify(new Date().toISOString()),
      'global': 'globalThis',
      '__VERSION__': JSON.stringify('1.0.19')
    }),
    
    new webpack.ProvidePlugin({
      Buffer: ['buffer', 'Buffer'],
      process: 'process'
    }),
    
    // HTML template for terminal
    new HtmlWebpackPlugin({
      template: './src/templates/terminal.html',
      filename: 'terminal.html',
      chunks: ['vendor', 'terminal'],
      inject: 'body',
      minify: isProd ? {
        removeComments: true,
        collapseWhitespace: true,
        removeAttributeQuotes: true
      } : false
    }),
    
    // CSS extraction for production
    new MiniCssExtractPlugin({
      filename: isProd ? 'css/[name].[contenthash].css' : 'css/[name].css',
      chunkFilename: isProd ? 'css/[name].[contenthash].chunk.css' : 'css/[name].chunk.css',
      ignoreOrder: false
    }),
    
    // Monaco Editor support
    new MonacoWebpackPlugin({
      languages: ['javascript', 'typescript', 'json', 'html', 'css', 'shell', 'python', 'go', 'rust'],
      features: ['!gotoSymbol', '!hover', '!folding', '!outline']
    }),
    
    // Copy static assets
    new CopyWebpackPlugin({
      patterns: [
        {
          from: 'public/assets',
          to: 'assets',
          globOptions: {
            ignore: ['**/*.txt']
          }
        },
        {
          from: 'src/renderer/voice-manifest.json',
          to: 'voice-manifest.json'
        }
      ]
    }),
    
    // Bundle analyzer for development
    ...(isAnalyze ? [new BundleAnalyzerPlugin({
      analyzerMode: 'server',
      openAnalyzer: true,
      analyzerPort: 8888
    })] : [])
  ],

  optimization: {
    minimize: isProd,
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          compress: {
            drop_console: isProd,
            drop_debugger: isProd,
            pure_funcs: ['console.log', 'console.info', 'console.debug'],
            pure_getters: true,
            unsafe: true,
            unsafe_comps: true,
            passes: 3
          },
          format: {
            comments: false
          },
          mangle: {
            safari10: true
          }
        },
        extractComments: false
      }),
      new CssMinimizerPlugin({
        minimizerOptions: {
          preset: ['advanced', {
            autoprefixer: { add: true },
            discardComments: { removeAll: true },
            discardUnused: { fontFace: false },
            mergeIdents: true,
            reduceIdents: true
          }]
        }
      })
    ],
    
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        // Vendor libraries
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all',
          priority: 20
        },
        // XTerm.js specific bundle
        xterm: {
          test: /[\\/]node_modules[\\/]@?xterm/,
          name: 'xterm',
          chunks: 'all',
          priority: 30
        },
        // Monaco Editor specific bundle
        monaco: {
          test: /[\\/]node_modules[\\/]monaco-editor/,
          name: 'monaco',
          chunks: 'all',
          priority: 30
        },
        // Common code from src
        common: {
          test: /[\\/]src[\\/]/,
          name: 'common',
          minChunks: 2,
          chunks: 'all',
          priority: 10,
          enforce: true
        },
        // AI related modules
        ai: {
          test: /[\\/]src[\\/]ai[\\/]/,
          name: 'ai-modules',
          chunks: 'all',
          priority: 15
        },
        // Plugin system
        plugins: {
          test: /[\\/]src[\\/]plugins[\\/]/,
          name: 'plugin-modules',
          chunks: 'all',
          priority: 15
        }
      }
    },
    
    // Runtime chunk for better caching
    runtimeChunk: {
      name: 'runtime'
    },
    
    // Module concatenation
    concatenateModules: isProd,
    
    // Side effects
    sideEffects: false
  },

  // Source maps configuration
  devtool: isDev ? 'eval-source-map' : 'source-map',
  
  // Development server configuration
  devServer: {
    static: {
      directory: path.join(__dirname, 'dist'),
      publicPath: '/'
    },
    compress: true,
    port: 3000,
    hot: true,
    open: true,
    historyApiFallback: {
      index: '/terminal.html'
    },
    client: {
      logging: 'warn',
      overlay: {
        errors: true,
        warnings: false
      }
    },
    devMiddleware: {
      stats: 'minimal'
    }
  },

  target: 'web',
  
  externals: {
    // Don't bundle electron APIs - they'll be provided by the runtime
    'electron': 'commonjs2 electron'
  },
  
  // Performance configuration and budgets
  performance: {
    hints: isProd ? 'error' : false,
    maxAssetSize: 245760, // 240 KiB
    maxEntrypointSize: 358400, // 350 KiB
    assetFilter: function(assetFilename) {
      // Exclude map files and images from performance checks
      return !assetFilename.endsWith('.map') && 
             !assetFilename.match(/\.(png|jpg|gif|svg)$/)
    }
  },

  // Performance budgets
  budget: {
    // Initial JavaScript bundle size (includes main chunk and runtime)
    initialJavaScript: {
      maxSize: 358400, // 350 KiB
      warning: 307200 // 300 KiB
    },
    // Initial CSS bundle size
    initialCSS: {
      maxSize: 51200, // 50 KiB
      warning: 40960 // 40 KiB
    },
    // All JavaScript assets combined
    totalJavaScript: {
      maxSize: 512000, // 500 KiB
      warning: 460800 // 450 KiB
    },
    // All assets combined (excluding source maps)
    total: {
      maxSize: 1048576, // 1 MiB
      warning: 921600 // 900 KiB
    }
  },
  
  // Stats configuration
  stats: {
    colors: true,
    modules: false,
    children: false,
    chunks: false,
    chunkModules: false
  }
};
