import * as esbuild from 'esbuild';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Create dist directory if it doesn't exist
if (!fs.existsSync('./dist')) {
  fs.mkdirSync('./dist', { recursive: true });
}

// Copy static files
fs.copyFileSync('./index.html', './dist/index.html');
if (fs.existsSync('./public')) {
  const publicFiles = fs.readdirSync('./public');
  for (const file of publicFiles) {
    const srcPath = path.join('./public', file);
    const destPath = path.join('./dist', file);
    if (fs.lstatSync(srcPath).isDirectory()) {
      fs.cpSync(srcPath, destPath, { recursive: true });
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// Process CSS
fs.copyFileSync('./src/index.css', './dist/index.css');

// Also copy any other CSS files that may be imported
if (fs.existsSync('./style.css')) {
  fs.copyFileSync('./style.css', './dist/style.css');
}

// Build JS bundle
console.log('Building JS...');
try {
  // Process CSS first with PostCSS
  console.log('Processing CSS...');
  
  // Build JS bundle
  // First generate a package list from node_modules
  console.log('Reading dependencies from package.json...');
  const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
  
  // Simple bundling configuration
  const result = await esbuild.build({
    entryPoints: ['./src/main.jsx'],
    bundle: true,
    minify: true,
    splitting: false,
    format: 'esm',
    outfile: './dist/main.js',
    loader: {
      '.js': 'jsx',
      '.jsx': 'jsx',
      '.svg': 'dataurl',
      '.png': 'dataurl',
      '.jpg': 'dataurl',
      '.gif': 'dataurl',
    },
    define: {
      'process.env.NODE_ENV': '"production"',
      'global': 'window',
      'process.env.VITE_NHOST_SUBDOMAIN': process.env.VITE_NHOST_SUBDOMAIN ? `"${process.env.VITE_NHOST_SUBDOMAIN}"` : '""',
      'process.env.VITE_NHOST_REGION': process.env.VITE_NHOST_REGION ? `"${process.env.VITE_NHOST_REGION}"` : '""',
    },
    platform: 'browser',
    sourcemap: false,
    target: 'es2020',
    resolveExtensions: ['.js', '.jsx', '.json', '.mjs'],
    external: ['*.woff', '*.woff2', '*.ttf', '*.eot'],
    logLevel: 'info',
    metafile: true,
    nodePaths: ['node_modules'],
  });
  
  console.log('Build complete');
  
  // Write the metafile for debugging
  fs.writeFileSync('./dist/meta.json', JSON.stringify(result.metafile, null, 2));
} catch (error) {
  console.error('Build failed:', error);
  process.exit(1);
}