const express = require('express');
const router = express.Router();
const { registerUser, loginUser } = require('../controllers/authController');

const { protect } = require('../middleware/authMiddleware');

const { OAuth2Client } = require('google-auth-library');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// User authentication routes
router.post('/signup', registerUser);
router.post('/login', loginUser);

const getGoogleRedirectUri = () => {
  const backendUrl = process.env.BACKEND_URL || 'http://localhost:5000';
  return (process.env.Gmail_REDIRECT_URI || '').replace('${BACKEND_URL}', backendUrl);
};

const getMicrosoftRedirectUri = () => {
  const backendUrl = process.env.BACKEND_URL || 'http://localhost:5000';
  return (process.env.MS_REDIRECT_URI || '').replace('${BACKEND_URL}', backendUrl);
};

// Google OAuth Authorization code redirect URL generator
router.get('/google', async (req, res) => {
  try {
    const token = req.query.token;
    if (!token) {
      return res.status(401).send("Authorization token is required");
    }

    try {
      jwt.verify(token, process.env.JWT_SECRET || 'yakkay_default_jwt_secret_key_123_abc');
    } catch (err) {
      return res.status(401).send("Invalid or expired authorization token");
    }

    const oauth2Client = new OAuth2Client(
      process.env.Gmail_ClientID,
      process.env.Gmail_ClientSecret,
      getGoogleRedirectUri()
    );

    const authorizeUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: [
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/gmail.modify'
      ],
      state: token
    });

    res.redirect(authorizeUrl);
  } catch (error) {
    res.status(500).send(`Server error initiating Google authentication: ${error.message}`);
  }
});

// Google OAuth Callback redirection handler
router.get('/google/callback', async (req, res) => {
  try {
    const { code, state } = req.query;
    if (!code || !state) {
      return res.status(400).send("Callback parameters 'code' and 'state' are required");
    }

    let decoded;
    try {
      decoded = jwt.verify(state, process.env.JWT_SECRET || 'yakkay_default_jwt_secret_key_123_abc');
    } catch (err) {
      return res.status(401).send("Invalid or expired OAuth state parameter (JWT verification failed)");
    }

    const userId = decoded.id;

    const oauth2Client = new OAuth2Client(
      process.env.Gmail_ClientID,
      process.env.Gmail_ClientSecret,
      getGoogleRedirectUri()
    );

    const { tokens } = await oauth2Client.getToken(code);
    
    const userInfoResponse = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`
      }
    });
    const email = userInfoResponse.data.email;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).send("User not found");
    }

    user.oauth_vault = user.oauth_vault || {};
    user.oauth_vault.google = {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token || (user.oauth_vault.google ? user.oauth_vault.google.refresh_token : null),
      email: email,
      expiry: tokens.expiry_date
    };
    user.markModified('oauth_vault');
    await user.save();

    res.send("<script>window.close();</script>");
  } catch (error) {
    console.error('Google Callback Error:', error);
    res.status(500).send(`Server error during Google callback: ${error.message}`);
  }
});

// Microsoft OAuth Authorization code redirect URL generator
router.get('/microsoft', async (req, res) => {
  try {
    const token = req.query.token;
    if (!token) {
      return res.status(401).send("Authorization token is required");
    }

    try {
      jwt.verify(token, process.env.JWT_SECRET || 'yakkay_default_jwt_secret_key_123_abc');
    } catch (err) {
      return res.status(401).send("Invalid or expired authorization token");
    }

    const clientId = process.env.MS_ClientID;
    const redirectUri = encodeURIComponent(getMicrosoftRedirectUri());
    const scope = encodeURIComponent('offline_access User.Read Mail.ReadWrite Mail.Send');
    const state = encodeURIComponent(token);

    const authorizeUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${clientId}&response_type=code&redirect_uri=${redirectUri}&response_mode=query&scope=${scope}&state=${state}`;

    res.redirect(authorizeUrl);
  } catch (error) {
    res.status(500).send(`Server error initiating Microsoft authentication: ${error.message}`);
  }
});

// Microsoft OAuth Callback redirection handler
router.get('/microsoft/callback', async (req, res) => {
  try {
    const { code, state } = req.query;
    if (!code || !state) {
      return res.status(400).send("Callback parameters 'code' and 'state' are required");
    }

    let decoded;
    try {
      decoded = jwt.verify(state, process.env.JWT_SECRET || 'yakkay_default_jwt_secret_key_123_abc');
    } catch (err) {
      return res.status(401).send("Invalid or expired OAuth state parameter (JWT verification failed)");
    }

    const userId = decoded.id;

    const params = new URLSearchParams();
    params.append('client_id', process.env.MS_ClientID);
    params.append('scope', 'offline_access User.Read Mail.ReadWrite Mail.Send');
    params.append('code', code);
    params.append('redirect_uri', getMicrosoftRedirectUri());
    params.append('grant_type', 'authorization_code');
    params.append('client_secret', process.env.MS_SecretID);

    const tokenResponse = await axios.post('https://login.microsoftonline.com/common/oauth2/v2.0/token', params, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    const tokens = tokenResponse.data;

    const meResponse = await axios.get('https://graph.microsoft.com/v1.0/me', {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`
      }
    });
    const email = meResponse.data.mail || meResponse.data.userPrincipalName;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).send("User not found");
    }

    user.oauth_vault = user.oauth_vault || {};
    user.oauth_vault.microsoft = {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token || (user.oauth_vault.microsoft ? user.oauth_vault.microsoft.refresh_token : null),
      email: email,
      expiry: Date.now() + (tokens.expires_in * 1000)
    };
    user.markModified('oauth_vault');
    await user.save();

    res.send("<script>window.close();</script>");
  } catch (error) {
    console.error('Microsoft Callback Error:', error.response?.data || error.message);
    res.status(500).send(`Server error during Microsoft callback: ${error.message}`);
  }
});

// Disconnect Google
router.delete('/google', protect, async (req, res) => {
  try {
    const user = req.user;
    user.oauth_vault = user.oauth_vault || {};
    user.oauth_vault.google = {
      access_token: null,
      refresh_token: null,
      email: null,
      expiry: null
    };
    user.markModified('oauth_vault');
    await user.save();
    res.status(200).json({
      success: true,
      message: 'Google account disconnected successfully',
      oauth_vault: user.oauth_vault
    });
  } catch (error) {
    res.status(500).json({ success: false, message: `Server error: ${error.message}` });
  }
});

// Disconnect Microsoft
router.delete('/microsoft', protect, async (req, res) => {
  try {
    const user = req.user;
    user.oauth_vault = user.oauth_vault || {};
    user.oauth_vault.microsoft = {
      access_token: null,
      refresh_token: null,
      email: null,
      expiry: null
    };
    user.markModified('oauth_vault');
    await user.save();
    res.status(200).json({
      success: true,
      message: 'Microsoft account disconnected successfully',
      oauth_vault: user.oauth_vault
    });
  } catch (error) {
    res.status(500).json({ success: false, message: `Server error: ${error.message}` });
  }
});

module.exports = router;
