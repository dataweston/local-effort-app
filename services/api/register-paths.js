const Module = require('module');
const path = require('path');

const aliasMap = {
  '@local-office/labeler': path.join(__dirname, 'test/stubs/@local-office/labeler.js'),
  '@local-office/db': path.join(__dirname, 'test/stubs/@local-office/db.js'),
  '@nestjs/common': path.join(__dirname, 'test/stubs/@nestjs/common.js'),
  bullmq: path.join(__dirname, 'test/stubs/bullmq.js')
};

const originalResolve = Module._resolveFilename;

Module._resolveFilename = function patchedResolve(request, parent, isMain, options) {
  if (aliasMap[request]) {
    const aliased = aliasMap[request];
    return originalResolve.call(this, aliased, parent, isMain, options);
  }

  return originalResolve.call(this, request, parent, isMain, options);
};
