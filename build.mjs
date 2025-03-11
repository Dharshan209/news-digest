import * as esbuild from 'esbuild';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

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
    }
    
    // Also copy any other CSS files
    if (fs.existsSync(path.join(__dirname, 'style.css'))) {
      fs.copyFileSync(
        path.join(__dirname, 'style.css'),
        path.join(assetsFolder, 'style.css')
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
    // First create alias for problematic modules
    console.log('Creating module aliases...');
    
    // Create a shim for jwt-decode
    if (!fs.existsSync('./node_modules/jwt-decode')) {
      console.log('Creating jwt-decode shim...');
      // Make sure directory exists
      if (!fs.existsSync('./node_modules/jwt-decode')) {
        fs.mkdirSync('./node_modules/jwt-decode', { recursive: true });
      }
      
      // Write a simple shim
      fs.writeFileSync('./node_modules/jwt-decode/index.js', `
        // Simple jwt-decode shim
        export default function jwtDecode(token) {
          try {
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
              return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));
            return JSON.parse(jsonPayload);
          } catch (e) {
            console.error('Error decoding token:', e);
            return {};
          }
        }
      `);
      
      // Create a package.json for the shim
      fs.writeFileSync('./node_modules/jwt-decode/package.json', JSON.stringify({
        name: 'jwt-decode',
        version: '3.1.2',
        main: 'index.js',
        type: 'module'
      }));
    }
    
    await esbuild.build({
      entryPoints: [path.join(__dirname, 'src/main.jsx')],
      bundle: true,
      minify: true,
      format: 'esm',
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
      alias: {
        'jwt-decode': './node_modules/jwt-decode/index.js'
      },
    });
    
    console.log('JS build complete');
  } catch (error) {
    console.error('JS build failed:', error);
    throw error;
  }
}

// Process HTML
function processHtml() {
  console.log('Processing HTML...');
  try {
    let html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
    
    // Modify the HTML to use the correct asset paths
    html = html.replace(
      '<script type="module" src="/src/main.jsx"></script>',
      '<script type="module" src="/assets/main.js"></script>'
    );
    
    // Add CSS link
    html = html.replace(
      '</head>',
      '  <link rel="stylesheet" href="/assets/index.css">\n</head>'
    );
    
    // Add style.css if it exists
    if (fs.existsSync(path.join(__dirname, 'style.css'))) {
      html = html.replace(
        '</head>',
        '  <link rel="stylesheet" href="/assets/style.css">\n</head>'
      );
    }
    
    fs.writeFileSync(path.join(distFolder, 'index.html'), html);
    console.log('HTML processing complete');
  } catch (error) {
    console.error('HTML processing failed:', error);
    throw error;
  }
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