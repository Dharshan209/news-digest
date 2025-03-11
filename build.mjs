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
    // Use CDN for React to reduce build complexity
    const injectCDN = `
// Import React from CDN
import React from 'https://esm.sh/react@18.2.0';
import ReactDOM from 'https://esm.sh/react-dom@18.2.0/client';
`;

    // Pre-process main.jsx to use CDN imports
    let mainJsContent = fs.readFileSync(path.join(__dirname, 'src/main.jsx'), 'utf8');
    
    // Backup original file
    fs.writeFileSync(path.join(__dirname, 'src/main.jsx.backup'), mainJsContent);
    
    // Use ESM imports for React
    mainJsContent = mainJsContent
      .replace(/import React from ['"]react['"]/g, '// import React from "react"')
      .replace(/import ReactDOM from ['"]react-dom\/client['"]/g, '// import ReactDOM from "react-dom/client"');
    
    // Add CDN imports at the top
    mainJsContent = injectCDN + mainJsContent;
    
    // Write temp file
    fs.writeFileSync(path.join(__dirname, 'src/main.jsx.temp'), mainJsContent);
    
    // Build with the temporary file
    await esbuild.build({
      entryPoints: [path.join(__dirname, 'src/main.jsx.temp')],
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
      external: [
        'react', 
        'react-dom', 
        'react-dom/client'
      ],
    });
    
    // Restore original file
    fs.copyFileSync(path.join(__dirname, 'src/main.jsx.backup'), path.join(__dirname, 'src/main.jsx'));
    fs.unlinkSync(path.join(__dirname, 'src/main.jsx.backup'));
    fs.unlinkSync(path.join(__dirname, 'src/main.jsx.temp'));
    
    console.log('JS build complete');
  } catch (error) {
    console.error('JS build failed:', error);
    // Clean up temp files
    if (fs.existsSync(path.join(__dirname, 'src/main.jsx.backup'))) {
      fs.copyFileSync(path.join(__dirname, 'src/main.jsx.backup'), path.join(__dirname, 'src/main.jsx'));
      fs.unlinkSync(path.join(__dirname, 'src/main.jsx.backup'));
    }
    if (fs.existsSync(path.join(__dirname, 'src/main.jsx.temp'))) {
      fs.unlinkSync(path.join(__dirname, 'src/main.jsx.temp'));
    }
    throw error;
  }
}

// Process HTML
function processHtml() {
  console.log('Processing HTML...');
  try {
    let html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
    
    // Create a new HTML file with the correct references
    const newHtml = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>NewsDigest - Your Personalized News Experience</title>
    <link rel="stylesheet" href="/assets/index.css">
    ${fs.existsSync(path.join(__dirname, 'style.css')) ? '<link rel="stylesheet" href="/assets/style.css">' : ''}
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/assets/main.js"></script>
  </body>
</html>`;
    
    fs.writeFileSync(path.join(distFolder, 'index.html'), newHtml);
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