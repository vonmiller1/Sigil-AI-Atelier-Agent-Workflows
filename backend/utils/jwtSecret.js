const DEV_FALLBACK_SECRET = 'yakkay_default_jwt_secret_key_123_abc';

/**
 * Returns the JWT signing secret. Production deployments must set JWT_SECRET explicitly.
 */
function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  const isProduction = process.env.NODE_ENV === 'production';

  if (isProduction) {
    if (!secret) {
      throw new Error('JWT_SECRET is required when NODE_ENV is production.');
    }
    if (secret === DEV_FALLBACK_SECRET) {
      throw new Error('JWT_SECRET must not use the built-in development fallback in production.');
    }
    return secret;
  }

  return secret || DEV_FALLBACK_SECRET;
}

module.exports = { getJwtSecret };
