# Railway Cache Configuration

## Cache Directories
- `.cache`
- `node_modules`
- `.webpack`
- `dist`

## Environment Variables
- `NODE_OPTIONS=--max-old-space-size=4096`
- `NPM_CONFIG_CACHE=.cache/npm`
- `WEBPACK_CACHE_DIRECTORY=.cache/webpack`

## Build Command
```bash
npm run cache:create && npm run install:cache && npm run build:cache
```

## Cache Benefits
- **Faster builds**: Reuse compiled assets and dependencies
- **Reduced bandwidth**: Skip re-downloading unchanged dependencies  
- **Better performance**: Webpack filesystem cache speeds up rebuilds
- **Cost optimization**: Shorter build times reduce compute costs
