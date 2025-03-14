import * as esbuild from 'esbuild';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Handle jwt-decode package alias
const jwtDecodePlugin = {
  name: 'jwt-decode-resolver',
  setup(build) {
    // Intercept imports to jwt-decode
    build.onResolve({ filter: /^jwt-decode$/ }, args => {
      return { 
        path: path.resolve(__dirname, 'jwt-decoder.js')
      };
    });
  }
};

// Setup paths
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distFolder = path.join(__dirname, 'dist');
const assetsFolder = path.join(distFolder, 'assets');

// Ensure output directories exist
if (!fs.existsSync(distFolder)) {
  fs.mkdirSync(distFolder, { recursive: true });
}
if (!fs.existsSync(assetsFolder)) {
  fs.mkdirSync(assetsFolder, { recursive: true });
}

// Process CSS - handle imports
function processCss() {
  console.log('Processing CSS...');
  try {
    // Copy all CSS files we find
    if (fs.existsSync(path.join(__dirname, 'src/index.css'))) {
      fs.copyFileSync(
        path.join(__dirname, 'src/index.css'),
        path.join(assetsFolder, 'index.css')
      );
      
      // Also create a copy in the root assets directory for proper path references
      fs.copyFileSync(
        path.join(__dirname, 'src/index.css'),
        path.join(distFolder, 'index.css')
      );
    }
    
    // Also copy any other CSS files
    if (fs.existsSync(path.join(__dirname, 'style.css'))) {
      fs.copyFileSync(
        path.join(__dirname, 'style.css'),
        path.join(assetsFolder, 'style.css')
      );
      
      // Also create a copy in the root assets directory for proper path references
      fs.copyFileSync(
        path.join(__dirname, 'style.css'),
        path.join(distFolder, 'style.css')
      );
    }
    
    // If we have node_modules/tailwindcss, include those styles
    const tailwindPath = path.join(__dirname, 'node_modules/tailwindcss/dist/tailwind.min.css');
    if (fs.existsSync(tailwindPath)) {
      fs.copyFileSync(
        tailwindPath,
        path.join(assetsFolder, 'tailwind.min.css')
      );
    }
    
    console.log('CSS processing complete');
  } catch (error) {
    console.error('CSS processing failed:', error);
    throw error;
  }
}

// Build JavaScript with esbuild
async function buildJs() {
  console.log('Building JS bundle...');
  try {
    await esbuild.build({
      entryPoints: [path.join(__dirname, 'src/main.jsx')],
      bundle: true,
      minify: true,
      format: 'iife',
      target: 'es2020',
      outfile: path.join(assetsFolder, 'main.js'),
      define: {
        'process.env.NODE_ENV': '"production"',
        'process.env.VITE_NHOST_SUBDOMAIN': `"${process.env.VITE_NHOST_SUBDOMAIN || ''}"`,
        'process.env.VITE_NHOST_REGION': `"${process.env.VITE_NHOST_REGION || ''}"`,
      },
      loader: {
        '.js': 'jsx',
        '.jsx': 'jsx',
        '.svg': 'dataurl',
        '.png': 'dataurl',
        '.jpg': 'dataurl',
        '.gif': 'dataurl',
      },
      jsx: 'automatic',
      sourcemap: false,
      metafile: true,
      platform: 'browser',
      plugins: [jwtDecodePlugin],
      external: [], // Don't mark anything as external to ensure proper bundling
      inject: [
        path.join(__dirname, 'shims.js'), // Inject shims for global polyfills
        path.join(__dirname, 'fix-styles.js') // Inject style fixes
      ]
    });
    
    console.log('JS build complete');
  } catch (error) {
    console.error('JS build failed:', error);
    throw error;
  }
}

// Process HTML
function processHtml() {
  console.log('HTML processing skipped - using static HTML file instead');
}

// Copy static assets
function copyStaticAssets() {
  console.log('Copying static assets...');
  try {
    // Copy public folder contents
    const publicFolder = path.join(__dirname, 'public');
    if (fs.existsSync(publicFolder)) {
      const files = fs.readdirSync(publicFolder);
      for (const file of files) {
        const srcPath = path.join(publicFolder, file);
        const destPath = path.join(distFolder, file);
        
        if (fs.statSync(srcPath).isDirectory()) {
          fs.cpSync(srcPath, destPath, { recursive: true });
        } else {
          fs.copyFileSync(srcPath, destPath);
        }
      }
    }
    
    // Create _redirects file for SPA routing
    fs.writeFileSync(
      path.join(distFolder, '_redirects'),
      '/*    /index.html   200'
    );
    
    console.log('Static assets copied');
  } catch (error) {
    console.error('Error copying static assets:', error);
    throw error;
  }
}

// Main build function
async function build() {
  try {
    processCss();
    await buildJs();
    processHtml();
    copyStaticAssets();
    console.log('Build completed successfully!');
  } catch (error) {
    console.error('Build failed:', error);
    process.exit(1);
  }
}

build();