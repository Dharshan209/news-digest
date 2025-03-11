// Create a script to add JWT decode functionality directly in HTML
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distFolder = path.join(__dirname, 'dist');

// JWT decode script to inject
const jwtDecodeScript = `
<script>
// JWT decode polyfill
window.jwtDecode = function(token) {
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
// Expose for modules that use it
window.jwt_decode = window.jwtDecode;
</script>
`;

// Process the HTML file
try {
  const htmlPath = path.join(distFolder, 'index.html');
  let html = fs.readFileSync(htmlPath, 'utf8');
  
  // Add the JWT decode script right after the opening body tag
  html = html.replace('<body>', '<body>' + jwtDecodeScript);
  
  // Fix the module script to be nomodule to avoid MIME type issues
  html = html.replace(
    '<script type="module" src="/assets/main.js"></script>',
    '<script src="/assets/main.js"></script>'
  );
  
  fs.writeFileSync(htmlPath, html);
  console.log('Added JWT decode polyfill to HTML');
} catch (error) {
  console.error('Failed to process HTML:', error);
  process.exit(1);
}