import postcss from 'postcss';
import autoprefixer from 'autoprefixer';
import tailwindcss from 'tailwindcss';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function processCss() {
  try {
    console.log('Processing CSS with PostCSS...');
    
    // Ensure dist directories exist
    if (!fs.existsSync(path.join(__dirname, 'dist'))) {
      fs.mkdirSync(path.join(__dirname, 'dist'), { recursive: true });
    }
    if (!fs.existsSync(path.join(__dirname, 'dist/assets'))) {
      fs.mkdirSync(path.join(__dirname, 'dist/assets'), { recursive: true });
    }
    
    const srcCssPath = path.join(__dirname, 'src/index.css');
    const distCssPath = path.join(__dirname, 'dist/index.css');
    const assetsCssPath = path.join(__dirname, 'dist/assets/index.css');
    
    // Read the source CSS
    const css = fs.readFileSync(srcCssPath, 'utf8');
    
    // Process with PostCSS
    const result = await postcss([
      tailwindcss,
      autoprefixer
    ]).process(css, {
      from: srcCssPath,
      to: distCssPath
    });
    
    // Write to both locations for better path resolution
    fs.writeFileSync(distCssPath, result.css);
    fs.writeFileSync(assetsCssPath, result.css);
    
    console.log('CSS processing completed - wrote to:');
    console.log('- ' + distCssPath);
    console.log('- ' + assetsCssPath);
  } catch (error) {
    console.error('CSS processing failed:', error);
    throw error; // Re-throw to ensure build fails if CSS processing fails
  }
}

processCss().catch(err => {
  console.error('Unhandled error in CSS processing:', err);
  process.exit(1);
});