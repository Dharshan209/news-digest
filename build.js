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

// Build JS bundle
console.log('Building JS...');
try {
  await esbuild.build({
    entryPoints: ['./src/main.jsx'],
    bundle: true,
    minify: true,
    splitting: false,
    format: 'esm',
    outfile: './dist/main.js',
    loader: {
      '.js': 'jsx',
      '.jsx': 'jsx',
      '.svg': 'file',
      '.png': 'file',
      '.jpg': 'file',
      '.gif': 'file',
    },
    define: {
      'process.env.NODE_ENV': '"production"',
      'global': 'window',
    },
    platform: 'browser',
    sourcemap: false,
    target: 'es2020',
    resolveExtensions: ['.js', '.jsx', '.json'],
    external: ['*.woff', '*.woff2', '*.ttf', '*.eot'],
  });
  console.log('Build complete');
} catch (error) {
  console.error('Build failed:', error);
  process.exit(1);
}