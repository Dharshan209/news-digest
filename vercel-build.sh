#!/bin/bash
set -e

echo "Starting minimal build process..."

# Install dependencies without optional dependencies
echo "Installing dependencies..."
npm install --no-optional --prefer-offline

# Make sure we have esbuild and jwt-decode
echo "Ensuring build dependencies are installed..."
npm install --no-save esbuild jwt-decode@3.1.2

# Create a node_modules/jwt-decode directory if it doesn't exist
mkdir -p node_modules/jwt-decode

# Create a package.json file in the jwt-decode directory
cat > node_modules/jwt-decode/package.json << 'EOF'
{
  "name": "jwt-decode",
  "version": "3.1.2",
  "main": "index.js"
}
EOF

# Create an index.js file that exports the jwt-decode function
cat > node_modules/jwt-decode/index.js << 'EOF'
// Simple jwt-decode implementation for bundling
module.exports = function(token) {
  try {
    var base64Url = token.split('.')[1];
    var base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    var jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
  } catch (e) {
    console.error('Error decoding token:', e);
    return {};
  }
};
EOF

# Also create modern export version
cat > node_modules/jwt-decode/index.mjs << 'EOF'
// ESM version
export default function decode(token) {
  try {
    var base64Url = token.split('.')[1];
    var base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    var jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
  } catch (e) {
    console.error('Error decoding token:', e);
    return {};
  }
};
EOF

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

# Use static HTML with environment variables
echo "Using static HTML file with environment variables..."
cp index.static.html dist/index.html

# Inject actual environment variables
if [ -n "$VITE_NHOST_SUBDOMAIN" ]; then
  echo "Injecting Nhost subdomain: $VITE_NHOST_SUBDOMAIN"
  # Use compatible sed syntax for both Linux and macOS
  if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    sed -i '' "s/YOUR_SUBDOMAIN_HERE/$VITE_NHOST_SUBDOMAIN/g" dist/index.html
  else
    # Linux (Vercel environment)
    sed -i "s/YOUR_SUBDOMAIN_HERE/$VITE_NHOST_SUBDOMAIN/g" dist/index.html
    # Clean up backup if it was created
    [ -f dist/index.html.bak ] && rm dist/index.html.bak
  fi
fi

# Inject region if provided
if [ -n "$VITE_NHOST_REGION" ]; then
  echo "Injecting Nhost region: $VITE_NHOST_REGION"
  # Use compatible sed syntax for both Linux and macOS
  if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    sed -i '' "s/eu-central-1/$VITE_NHOST_REGION/g" dist/index.html
  else
    # Linux (Vercel environment)
    sed -i "s/eu-central-1/$VITE_NHOST_REGION/g" dist/index.html
    # Clean up backup if it was created
    [ -f dist/index.html.bak ] && rm dist/index.html.bak
  fi
fi

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