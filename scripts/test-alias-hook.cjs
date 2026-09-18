/**
 * Resolves the project's `@/*` path alias for the compiled feature tests.
 *
 * The app relies on the `@/*` alias from tsconfig.json, which TypeScript emits
 * unchanged. Node cannot resolve it on its own, so the focused test run loads
 * this hook and rewrites those specifiers to the compiled test output.
 */
const Module = require('module');
const path = require('path');

const TEST_BUILD_ROOT = path.resolve(__dirname, '..', '.test-build');
const originalResolveFilename = Module._resolveFilename;

Module._resolveFilename = function resolveWithAlias(request, ...rest) {
  const nextRequest = request.startsWith('@/')
    ? path.join(TEST_BUILD_ROOT, request.slice(2))
    : request;

  return originalResolveFilename.call(this, nextRequest, ...rest);
};
