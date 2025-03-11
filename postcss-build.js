import postcss from 'postcss';
import autoprefixer from 'autoprefixer';
import tailwindcss from 'tailwindcss';
import fs from 'fs';

async function processCss() {
  try {
    console.log('Processing CSS with PostCSS...');
    const css = fs.readFileSync('./src/index.css', 'utf8');
    
    const result = await postcss([
      tailwindcss,
      autoprefixer
    ]).process(css, {
      from: './src/index.css',
      to: './dist/index.css'
    });
    
    fs.writeFileSync('./dist/index.css', result.css);
    console.log('CSS processing completed');
  } catch (error) {
    console.error('CSS processing failed:', error);
  }
}

processCss();