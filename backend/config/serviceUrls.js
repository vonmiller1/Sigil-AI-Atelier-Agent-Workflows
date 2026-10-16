/**
 * Normalized service base URLs for proxies to the FastAPI engine and OAuth redirects.
 */
function trimTrailingSlash(url) {
  return url.replace(/\/+$/, '');
}

function getBackendUrl() {
  return trimTrailingSlash(process.env.BACKEND_URL || 'http://localhost:5000');
}

function getPythonEngineUrl() {
  return trimTrailingSlash(process.env.PYTHON_ENGINE_URL || 'http://localhost:8000');
}

module.exports = { getBackendUrl, getPythonEngineUrl };
