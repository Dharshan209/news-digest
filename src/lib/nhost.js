import { NhostClient } from '@nhost/nhost-js';

// Get env variables from window.env (set in index.html) or fall back to process.env
const getEnv = (key, fallback) => {
  if (typeof window !== 'undefined' && window.env && window.env[key]) {
    return window.env[key];
  }
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key];
  }
  return fallback;
};

const nhost = new NhostClient({
  subdomain: getEnv('VITE_NHOST_SUBDOMAIN', 'local'),
  region: getEnv('VITE_NHOST_REGION', 'eu-central-1')
});

export { nhost };