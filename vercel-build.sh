#!/bin/bash
set -e

# Install dependencies without optional dependencies
npm install --no-optional

# Find rollup native.js file path
ROLLUP_NATIVE_PATH=$(find ./node_modules/rollup -name "native.js" | grep -v esm)

if [ -n "$ROLLUP_NATIVE_PATH" ]; then
  echo "Found Rollup native.js at: $ROLLUP_NATIVE_PATH"
  
  # Create backup
  cp $ROLLUP_NATIVE_PATH ${ROLLUP_NATIVE_PATH}.backup
  
  # Patch the file to avoid the error with missing native module
  cat > $ROLLUP_NATIVE_PATH << 'EOF'
'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

function getDefaultExportFromCjs (x) {
	return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
}

// This is a patched version that avoids the native module error
const nonnative = {
  isNativeExt: false,
  loadBindings() {
    return {
      getDefaultExportFromCjs
    };
  }
};

exports.getDefaultExportFromCjs = getDefaultExportFromCjs;
exports.nonnative = nonnative;
EOF

  echo "Patched Rollup native.js to avoid native module error"
else
  echo "Could not find Rollup native.js"
  exit 1
fi

# Run the build with increased memory
export NODE_OPTIONS="--max-old-space-size=3584"
npx vite build