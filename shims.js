// Shims and polyfills to make modules work
export const require = (moduleName) => {
  if (typeof window !== 'undefined') {
    if (moduleName === 'jwt-decode' && window.jwt_decode) {
      return window.jwt_decode;
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
  
  throw new Error(`Module not found: ${moduleName}`);
};