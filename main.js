// This file is a legacy entry point which redirects to the proper entry point
console.log('Redirecting to the React application entry point...');

// Check if we're in a development environment
if (import.meta && import.meta.hot) {
  console.log('Development mode detected, loading src/main.jsx...');
  import('./src/main.jsx').catch(err => {
    console.error('Failed to load React application:', err);
    document.querySelector('#root').innerHTML = `
      <div style="color: red; padding: 20px; font-family: sans-serif;">
        <h1>Application Error</h1>
        <p>The application failed to load:</p>
        <pre>${err.message}</pre>
      </div>
    `;
  });
} else {
  // In production, the app should already be bundled properly
  console.log('Production mode detected, React app should load via index.html...');
}
