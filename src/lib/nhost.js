import { NhostClient } from '@nhost/nhost-js';

// Get env variables from window.env (set in index.html) or fall back to process.env
const getEnv = (key, fallback) => {
  if (typeof window !== 'undefined' && window.env && window.env[key]) {
    return window.env[key];
  }
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key];
  }
  console.warn(`Environment variable ${key} not found, using fallback value`);
  return fallback;
};

let nhost;

try {
  const subdomain = getEnv('VITE_NHOST_SUBDOMAIN', 'local');
  const region = getEnv('VITE_NHOST_REGION', 'eu-central-1');
  
  if (subdomain === 'YOUR_SUBDOMAIN_HERE') {
    console.warn('Nhost subdomain not properly configured. Authentication will not work correctly.');
  }
  
  nhost = new NhostClient({
    subdomain: subdomain,
    region: region
  });
  
  console.log('Nhost client initialized successfully');
} catch (error) {
  console.error('Failed to initialize Nhost client:', error);
  // Provide fallback client with minimal functionality
  nhost = {
    auth: {
      isAuthenticated: () => false,
      getAuthenticationStatus: () => ({ isAuthenticated: false, isLoading: false }),
      signIn: () => Promise.reject(new Error('Nhost client failed to initialize')),
      signOut: () => Promise.resolve(),
    }
  };
}

export { nhost };