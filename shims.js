// Shims and polyfills to make modules work
export const require = (moduleName) => {
  if (typeof window !== 'undefined') {
    if (moduleName === 'jwt-decode' && window.jwt_decode) {
      return window.jwt_decode;
    }
    if (moduleName === 'react' && window.React) {
      return window.React;
    }
    if (moduleName === 'react-dom' && window.ReactDOM) {
      return window.ReactDOM;
    }
    if (moduleName === 'react-dom/client' && window.ReactDOM) {
      return {
        createRoot: window.ReactDOM.createRoot
      };
    }
    if (moduleName === 'react-router-dom' && window.ReactRouterDOM) {
      return window.ReactRouterDOM;
    }
  }
  
  // Default implementation
  if (moduleName === 'jwt-decode') {
    return function(token) {
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
    };
  }
  
  console.error(`Module not found: ${moduleName}`);
  throw new Error(`Module not found: ${moduleName}`);
};

// Global polyfills
if (typeof window !== 'undefined') {
  // Make sure React is available
  window.React = window.React || {};
  
  // Make sure ReactDOM is available
  window.ReactDOM = window.ReactDOM || {
    createRoot: function() {
      console.error('ReactDOM.createRoot polyfill called');
      return {
        render: function() {
          console.error('ReactDOM root.render polyfill called');
        }
      };
    }
  };
  
  // Make sure ReactRouterDOM is available
  window.ReactRouterDOM = window.ReactRouterDOM || {};
  
  // Ensure environment variables
  window.env = window.env || {
    VITE_NHOST_SUBDOMAIN: "",
    VITE_NHOST_REGION: ""
  };
}