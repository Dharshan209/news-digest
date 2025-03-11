#!/bin/bash
set -e

echo "Starting minimal build process..."

# Install dependencies without optional dependencies
echo "Installing dependencies..."
npm install --no-optional --prefer-offline

# Make sure we have esbuild and jwt-decode
echo "Ensuring build dependencies are installed..."
npm install --no-save esbuild jwt-decode@3.1.2

# Set environment variables from Vercel
if [ -n "$VERCEL_ENV" ]; then
  echo "Setting up environment variables for Vercel deployment..."
  # If env vars are provided by Vercel, they should be used
  export VITE_NHOST_SUBDOMAIN=${VITE_NHOST_SUBDOMAIN:-""}
  export VITE_NHOST_REGION=${VITE_NHOST_REGION:-""}
fi

# Run the custom build script (no rollup)
echo "Running custom build..."
node build.mjs

# Use static HTML instead of modifying the original
echo "Using static HTML file..."
cp index.static.html dist/index.html

# Create a .vercel/output directory to ensure Vercel deployment works
echo "Setting up Vercel deployment structure..."
mkdir -p .vercel/output/static
cp -r dist/* .vercel/output/static/

# Create Vercel config
cat > .vercel/output/config.json << 'EOF'
{
  "version": 3,
  "routes": [
    { "handle": "filesystem" },
    { "src": "/assets/(.*)", "headers": { "cache-control": "public, max-age=31536000, immutable" } },
    { "src": "/(.*)", "dest": "/index.html" }
  ]
}
EOF

echo "Build completed successfully!"