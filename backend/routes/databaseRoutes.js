const express = require('express');
const router = express.Router();
const axios = require('axios');
const DatabaseConnection = require('../models/DatabaseConnection');
const { protect } = require('../middleware/authMiddleware');
const { encrypt } = require('../utils/cryptoUtils');

const PYTHON_ENGINE_URL = 'http://localhost:8000';

/**
 * Helper to call FastAPI connection test endpoint.
 */
async function testDbConnection({ engine, host, port, databaseName, username, password, sslMode }) {
  try {
    const response = await axios.post(`${PYTHON_ENGINE_URL}/api/engine/database/test`, {
      engine,
      host,
      port: Number(port),
      databaseName,
      username,
      password,
      sslMode: Boolean(sslMode)
    }, { timeout: 10000 });

    return {
      success: response.data.success,
      message: response.data.message || 'Connection verified successfully.'
    };
  } catch (error) {
    const errorMsg = error.response?.data?.detail || error.message || 'Database test connection failed.';
    return {
      success: false,
      message: errorMsg
    };
  }
}

/**
 * @desc    Test connection credentials (Proxy to FastAPI)
 * @route   POST /api/databases/test
 * @access  Private
 */
router.post('/test', protect, async (req, res) => {
  const { engine, host, port, databaseName, username, password, sslMode } = req.body;

  if (!engine || !host || !port || !databaseName || !username) {
    return res.status(400).json({ success: false, message: 'All connection fields except password are required.' });
  }

  const passwordVal = password === undefined || password === null ? "" : password;

  const result = await testDbConnection({ engine, host, port, databaseName, username, password: passwordVal, sslMode });
  if (result.success) {
    return res.status(200).json(result);
  } else {
    return res.status(400).json(result);
  }
});

/**
 * @desc    Save connection (after verifying and encrypting password)
 * @route   POST /api/databases/save
 * @access  Private
 */
router.post('/save', protect, async (req, res) => {
  try {
    const { name, engine, host, port, databaseName, username, password, sslMode } = req.body;

    if (!name || !engine || !host || !port || !databaseName || !username) {
      return res.status(400).json({ success: false, message: 'All connection fields except password are required.' });
    }

    const passwordVal = password === undefined || password === null ? "" : password;

    // 1. Verify connection credentials via FastAPI test endpoint
    const testResult = await testDbConnection({ engine, host, port, databaseName, username, password: passwordVal, sslMode });
    if (!testResult.success) {
      return res.status(400).json({
        success: false,
        message: `Failed to save connection: ${testResult.message}`
      });
    }

    // 2. Encrypt the password using our crypto utility
    const { encryptedText, iv } = encrypt(passwordVal);

    // 3. Save connection document to MongoDB
    const connection = await DatabaseConnection.create({
      userId: req.user.id,
      name,
      engine,
      host,
      port: Number(port),
      databaseName,
      username,
      encryptedPassword: encryptedText,
      iv,
      sslMode: Boolean(sslMode),
      status: 'Connected'
    });

    // Don't return secrets in the response
    const responseData = connection.toObject();
    delete responseData.encryptedPassword;
    delete responseData.iv;

    res.status(201).json({
      success: true,
      message: 'Database connection verified and saved successfully.',
      data: responseData
    });
  } catch (error) {
    console.error('Error saving database connection:', error.message);
    res.status(500).json({ success: false, message: `Server error: ${error.message}` });
  }
});

/**
 * @desc    Update credentials / Secret Rotation
 * @route   PUT /api/databases/:id/credentials
 * @access  Private
 */
router.put('/:id/credentials', protect, async (req, res) => {
  try {
    const { password } = req.body;
    if (password === undefined || password === null) {
      return res.status(400).json({ success: false, message: 'Password is required for rotation (can be empty string).' });
    }

    const connection = await DatabaseConnection.findById(req.params.id);
    if (!connection) {
      return res.status(404).json({ success: false, message: 'Connection not found.' });
    }

    // Check ownership
    if (connection.userId.toString() !== req.user.id) {
      return res.status(401).json({ success: false, message: 'Not authorized.' });
    }

    // Test with the new password
    const testResult = await testDbConnection({
      engine: connection.engine,
      host: connection.host,
      port: connection.port,
      databaseName: connection.databaseName,
      username: connection.username,
      password: password,
      sslMode: connection.sslMode
    });

    if (!testResult.success) {
      connection.status = 'Failed';
      await connection.save();
      return res.status(400).json({
        success: false,
        message: `Credential update failed connection verification: ${testResult.message}`
      });
    }

    // Encrypt new password
    const { encryptedText, iv } = encrypt(password);
    connection.encryptedPassword = encryptedText;
    connection.iv = iv;
    connection.status = 'Connected';
    
    await connection.save();

    res.status(200).json({
      success: true,
      message: 'Database connection credentials rotated and verified successfully.'
    });
  } catch (error) {
    console.error('Error rotating database credentials:', error.message);
    res.status(500).json({ success: false, message: `Server error: ${error.message}` });
  }
});

/**
 * @desc    Get user's database connections (Omit secrets)
 * @route   GET /api/databases
 * @access  Private
 */
router.get('/', protect, async (req, res) => {
  try {
    const connections = await DatabaseConnection.find({ userId: req.user.id })
      .select('-encryptedPassword -iv')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: connections.length,
      data: connections
    });
  } catch (error) {
    res.status(500).json({ success: false, message: `Server error: ${error.message}` });
  }
});

/**
 * @desc    Get a single database connection (Omit secrets)
 * @route   GET /api/databases/:id
 * @access  Private
 */
router.get('/:id', protect, async (req, res) => {
  try {
    const connection = await DatabaseConnection.findOne({ _id: req.params.id, userId: req.user.id })
      .select('-encryptedPassword -iv');

    if (!connection) {
      return res.status(404).json({ success: false, message: 'Database connection not found.' });
    }

    res.status(200).json({
      success: true,
      data: connection
    });
  } catch (error) {
    res.status(500).json({ success: false, message: `Server error: ${error.message}` });
  }
});

/**
 * @desc    Get database schema reflection (Proxy to FastAPI)
 * @route   GET /api/databases/:id/schema
 * @access  Private
 */
router.get('/:id/schema', protect, async (req, res) => {
  try {
    const connection = await DatabaseConnection.findOne({ _id: req.params.id, userId: req.user.id });
    if (!connection) {
      return res.status(404).json({ success: false, message: 'Database connection not found.' });
    }

    const nocache = req.query.nocache === 'true';

    try {
      const response = await axios.get(`${PYTHON_ENGINE_URL}/api/engine/database/${connection._id}/schema`, {
        params: { nocache },
        timeout: 120000 // 120s timeout for initial large reflections
      });
      return res.status(200).json(response.data);
    } catch (proxyError) {
      const status = proxyError.response?.status || 502;
      const errorMsg = proxyError.response?.data?.detail || proxyError.message || 'FastAPI engine request failed';
      console.error('Error proxying database schema request:', errorMsg);
      return res.status(status).json({
        success: false,
        message: `Schema reflection failed: ${errorMsg}`
      });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: `Server error: ${error.message}` });
  }
});

/**
 * @desc    Delete a database connection
 * @route   DELETE /api/databases/:id
 * @access  Private
 */
router.delete('/:id', protect, async (req, res) => {
  try {
    const connection = await DatabaseConnection.findById(req.params.id);
    if (!connection) {
      return res.status(404).json({ success: false, message: 'Database connection not found.' });
    }

    // Check ownership
    if (connection.userId.toString() !== req.user.id) {
      return res.status(401).json({ success: false, message: 'Not authorized.' });
    }

    await connection.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Database connection deleted successfully.'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: `Server error: ${error.message}` });
  }
});

module.exports = router;
