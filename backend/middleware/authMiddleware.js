const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { getJwtSecret } = require('../utils/jwtSecret');

/**
 * Protect routes by validating JWT from incoming Authorization header
 */
const protect = async (req, res, next) => {
  let token;

  // Check for Token in Authorization Bearer format
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      // Extract Token (format: Bearer <token>)
      token = req.headers.authorization.split(' ')[1];

      // Decode and verify token
      const decoded = jwt.verify(token, getJwtSecret());

      // Fetch user profile from database (excluding password field) and append to req.user
      req.user = await User.findById(decoded.id).select('-password');

      if (!req.user) {
        return res.status(401).json({ success: false, message: 'Authorization failed: user not found' });
      }

      return next();
    } catch (error) {
      console.error(`Auth Middleware Error: ${error.message}`);
      return res.status(401).json({ success: false, message: 'Authorization failed: invalid token signature' });
    }
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Authorization failed: no token provided' });
  }
};

module.exports = { protect };
