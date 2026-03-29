const Module = require('node:module');
const path = require('node:path');

const DIST_ROOT = path.join(__dirname, '..', '..', 'dist') + path.sep;

function withPatchedLoad(stubVscode, loadModule) {
  const originalLoad = Module._load;
  Module._load = function patchedLoad(request, parent, isMain) {
    if (request === 'vscode') {
      return stubVscode;
    }
    return originalLoad.call(this, request, parent, isMain);
  };

  try {
    return loadModule();
  } finally {
    Module._load = originalLoad;
  }
}

function purgeModule(modulePath) {
  const resolved = require.resolve(modulePath);
  for (const cacheKey of Object.keys(require.cache)) {
    if (cacheKey.startsWith(DIST_ROOT)) {
      delete require.cache[cacheKey];
    }
  }
  delete require.cache[resolved];
}

function loadWithVscodeStub(modulePath, stubVscode) {
  purgeModule(modulePath);
  return withPatchedLoad(stubVscode, () => require(modulePath));
}

module.exports = {
  loadWithVscodeStub,
};
