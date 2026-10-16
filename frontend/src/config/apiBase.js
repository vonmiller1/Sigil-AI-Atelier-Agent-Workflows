const DEFAULT_API_BASE = 'http://localhost:5000';

export const API_BASE_URL = (process.env.REACT_APP_API_BASE_URL || DEFAULT_API_BASE).replace(
  /\/+$/,
  ''
);

/**
 * Build an absolute API URL from a path starting with `/api/...`.
 */
export function apiUrl(path) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
}

export default API_BASE_URL;
