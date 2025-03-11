// Fallback build script in case the Vite build fails
import * as esbuild from 'esbuild';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Setup paths
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distFolder = path.join(__dirname, 'dist');

// Create dist directory
if (!fs.existsSync(distFolder)) {
  fs.mkdirSync(distFolder, { recursive: true });
}

console.log('Starting alternative build process');

// Copy static files
console.log('Copying static files...');
fs.copyFileSync(path.join(__dirname, 'index.html'), path.join(distFolder, 'index.html'));

// Copy public folder
const publicFolder = path.join(__dirname, 'public');
if (fs.existsSync(publicFolder)) {
  const publicFiles = fs.readdirSync(publicFolder);
  for (const file of publicFiles) {
    try {
      const srcPath = path.join(publicFolder, file);
      const destPath = path.join(distFolder, file);
      if (fs.lstatSync(srcPath).isDirectory()) {
        fs.cpSync(srcPath, destPath, { recursive: true });
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    } catch (err) {
      console.error(`Error copying public file ${file}: ${err.message}`);
    }
  }
}

// Build with esbuild
try {
  console.log('Building JS bundle...');
  await esbuild.build({
    entryPoints: [path.join(__dirname, 'src/main.jsx')],
    bundle: true,
    minify: true,
    format: 'esm',
    target: 'es2020',
    outfile: path.join(distFolder, 'assets/main.js'),
    define: {
      'process.env.NODE_ENV': '"production"',
    },
    loader: {
      '.js': 'jsx',
      '.jsx': 'jsx',
      '.svg': 'file',
      '.png': 'file',
      '.jpg': 'file',
    },
    publicPath: '/assets/',
    assetNames: '[name]-[hash]',
    jsx: 'automatic'
  });
  
  // Copy CSS
  if (fs.existsSync(path.join(__dirname, 'src/index.css'))) {
    console.log('Copying CSS...');
    
    // Create assets directory if it doesn't exist
    const assetsDir = path.join(distFolder, 'assets');
    if (!fs.existsSync(assetsDir)) {
      fs.mkdirSync(assetsDir, { recursive: true });
    }
    
    fs.copyFileSync(
      path.join(__dirname, 'src/index.css'),
      path.join(distFolder, 'assets/index.css')
    );
    
    // Update index.html to reference the css file
    let indexHtml = fs.readFileSync(path.join(distFolder, 'index.html'), 'utf8');
    indexHtml = indexHtml.replace(
      '</head>',
      '  <link rel="stylesheet" href="/assets/index.css">\n</head>'
    );
    indexHtml = indexHtml.replace(
      '<script type="module" src="/src/main.jsx"></script>',
      '<script type="module" src="/assets/main.js"></script>'
    );
    fs.writeFileSync(path.join(distFolder, 'index.html'), indexHtml);
  }
  
  console.log('Build completed successfully');
  
} catch (error) {
  console.error('Build failed:', error);
  process.exit(1);
}