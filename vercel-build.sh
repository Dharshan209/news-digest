#!/bin/bash
# Install dependencies without optional dependencies
npm install --no-optional

# Run the build
export NODE_OPTIONS="--max_old_space_size=4096 --openssl-legacy-provider"
npx vite build --no-optimize