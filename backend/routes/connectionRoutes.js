const express = require('express');
const router = express.Router();
const axios = require('axios');
const User = require('../models/User');
const { protect } = require('../middleware/authMiddleware');

/**
 * Mask API keys for frontend exposure
 * @param {string} key - Raw API key.
 * @returns {string} Masked string sk-...****
 */
const maskApiKey = (key) => {
  if (!key) return '';
  if (key.length <= 8) return '••••••••';
  return `${key.substring(0, 5)}...${key.substring(key.length - 4)}`;
};

/**
 * @desc    Save/Create provider connection key
 * @route   POST /api/connections
 * @access  Private
 */
router.post('/', protect, async (req, res) => {
  try {
    const { providerName, apiKey, baseUrl } = req.body;

    if (!providerName || !apiKey) {
      return res.status(400).json({ success: false, message: 'Please provide providerName and apiKey' });
    }

    // 1. Verify connection key by hitting Python ai_engine microservice
    try {
      const pyResponse = await axios.post('http://localhost:8000/api/ai/models/fetch-catalog', {
        provider_name: providerName,
        api_key: apiKey,
        custom_base_url: baseUrl || null
      }, { timeout: 12000 });

      // If validation did not result in a clean success
      if (pyResponse.status !== 200) {
        return res.status(401).json({ success: false, message: 'Verification failed: invalid API key provided' });
      }
    } catch (err) {
      console.error(`ai_engine validation crash: ${err.message}`);
      const errMessage = err.response?.data?.detail || 'Visual authentication key validation failed. Please check your credentials.';
      return res.status(401).json({ success: false, message: errMessage });
    }

    // 2. Load user document and write the connection settings
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User profile not found' });
    }

    // Check if connection already exists, if so update it; otherwise append
    const existingIndex = user.connections.findIndex(c => c.providerName === providerName);
    if (existingIndex > -1) {
      user.connections[existingIndex] = { providerName, apiKey, baseUrl };
    } else {
      user.connections.push({ providerName, apiKey, baseUrl });
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Provider connection key verified and saved successfully',
      connection: {
        providerName,
        apiKey: maskApiKey(apiKey),
        baseUrl
      }
    });

  } catch (error) {
    res.status(500).json({ success: false, message: `Server error: ${error.message}` });
  }
});

/**
 * @desc    Get user's active saved connection keys
 * @route   GET /api/connections
 * @access  Private
 */
router.get('/', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User profile not found' });
    }

    // Mask all secret API keys before exposing them
    const safeConnections = user.connections.map(c => ({
      id: c._id,
      providerName: c.providerName,
      apiKey: maskApiKey(c.apiKey),
      baseUrl: c.baseUrl
    }));

    res.status(200).json({
      success: true,
      connections: safeConnections
    });

  } catch (error) {
    res.status(500).json({ success: false, message: `Server error: ${error.message}` });
  }
});

/**
 * @desc    Fetch available models for a specific saved connection
 * @route   GET /api/connections/:id/models
 * @access  Private
 */
router.get('/:id/models', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User profile not found' });
    }

    // Find the specific connection by ID
    const connection = user.connections.id(req.params.id);
    if (!connection) {
      return res.status(404).json({ success: false, message: 'Connection not found' });
    }

    // Call Python ai_engine microservice to fetch catalog
    try {
      const pyResponse = await axios.post('http://localhost:8000/api/ai/models/fetch-catalog', {
        provider_name: connection.providerName,
        api_key: connection.apiKey,
        custom_base_url: connection.baseUrl || null
      }, { timeout: 12000 });

      if (pyResponse.status !== 200) {
        return res.status(400).json({ success: false, message: 'Failed to fetch catalog from provider' });
      }

      // Return the catalog data returned by Python
      res.status(200).json({
        success: true,
        models: pyResponse.data.models || pyResponse.data
      });
    } catch (err) {
      console.error(`ai_engine fetch-catalog crash for connection ${req.params.id}: ${err.message}`);
      const errMessage = err.response?.data?.detail || 'Failed to fetch model catalog. Please check your credentials or provider status.';
      return res.status(400).json({ success: false, message: errMessage });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: `Server error: ${error.message}` });
  }
});

/**
 * @desc    Test a specific model availability for a saved connection
 * @route   POST /api/connections/:id/test-model
 * @access  Private
 */
router.post('/:id/test-model', protect, async (req, res) => {
  try {
    const { modelId } = req.body;
    if (!modelId) {
      return res.status(400).json({ success: false, message: 'Please provide a modelId to test.' });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User profile not found' });
    }

    const connection = user.connections.id(req.params.id);
    if (!connection) {
      return res.status(404).json({ success: false, message: 'Connection not found' });
    }

    try {
      const pyResponse = await axios.post('http://localhost:8000/api/ai/models/test-model', {
        provider_name: connection.providerName,
        api_key: connection.apiKey,
        custom_base_url: connection.baseUrl || null,
        model_id: modelId
      }, { timeout: 12000 });

      if (pyResponse.status === 200) {
        return res.status(200).json({ success: true, message: 'Model verified successfully.' });
      }
    } catch (err) {
      console.error(`ai_engine test-model crash for connection ${req.params.id}: ${err.message}`);
      const errMessage = err.response?.data?.detail || 'Failed to contact model endpoint. Please verify connection credentials.';
      const statusCode = err.response?.status || 400;
      return res.status(statusCode).json({ success: false, message: errMessage, code: statusCode });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: `Server error: ${error.message}` });
  }
});

/**
 * @desc    Chat with a specific model for a saved connection
 * @route   POST /api/connections/:id/chat
 * @access  Private
 */
router.post('/:id/chat', protect, async (req, res) => {
  try {
    const { modelId, messages, tools, instructions, active_kb_ids, active_db_ids } = req.body;
    if (!modelId || !messages) {
      return res.status(400).json({ success: false, message: 'Please provide modelId and messages.' });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User profile not found' });
    }

    const connection = user.connections.id(req.params.id);
    if (!connection) {
      return res.status(404).json({ success: false, message: 'Connection not found' });
    }

    // Determine if we should route to the agent run engine (if instructions or tools are present)
    const isAgentRequest = Array.isArray(tools) || typeof instructions === 'string';

    if (isAgentRequest) {
      // 1. Extract last user message content as the prompt
      const lastUserMessage = [...messages].reverse().find(msg => msg.role === 'user');
      const prompt = lastUserMessage ? lastUserMessage.content : '';

      try {
        // 2. Set streaming headers for Server-Sent Events
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        // 3. Server-to-server POST request with responseType: 'stream'
        const pyResponse = await axios.post('http://localhost:8000/api/engine/run', {
          prompt: prompt,
          agent_config: {
            instructions: instructions || '',
            tools: tools || [],
            model_id: modelId,
            provider_name: connection.providerName,
            api_key: connection.apiKey,
            custom_base_url: connection.baseUrl || null,
            active_kb_ids: active_kb_ids || [],
            active_db_ids: active_db_ids || []
          },
          auth_vault: user.oauth_vault || {}
        }, { responseType: 'stream', timeout: 60000 });

        // 4. Pipe raw stream directly to client
        pyResponse.data.pipe(res);
        return;
      } catch (err) {
        console.error(`ai_engine agent run stream crash for connection ${req.params.id}: ${err.message}`);
        if (res.headersSent) {
          res.write(`data: ${JSON.stringify({ type: 'error', message: err.message })}\n\n`);
          return res.end();
        }
        const errMessage = err.response?.data?.detail || 'Failed to contact model endpoint. Please verify connection credentials.';
        const statusCode = err.response?.status || 500;
        return res.status(statusCode).json({ success: false, message: errMessage });
      }
    } else {
      // Fallback: standard simple model completion (non-agentic/non-streaming)
      try {
        const pyResponse = await axios.post('http://localhost:8000/api/ai/models/chat', {
          provider_name: connection.providerName,
          api_key: connection.apiKey,
          custom_base_url: connection.baseUrl || null,
          model_id: modelId,
          messages: messages
        }, { timeout: 30000 });

        if (pyResponse.status === 200) {
          return res.status(200).json({ success: true, data: pyResponse.data?.data || pyResponse.data });
        }
      } catch (err) {
        console.error(`ai_engine chat crash for connection ${req.params.id}: ${err.message}`);
        const errMessage = err.response?.data?.detail || 'Failed to contact model endpoint. Please verify connection credentials.';
        const statusCode = err.response?.status || 500;
        return res.status(statusCode).json({ success: false, message: errMessage });
      }
    }
  } catch (error) {
    res.status(500).json({ success: false, message: `Server error: ${error.message}` });
  }
});

module.exports = router;
