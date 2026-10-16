const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const axios = require('axios');
const DeveloperApiKey = require('../models/DeveloperApiKey');
const Agent = require('../models/Agent');
const User = require('../models/User');
const DatabaseConnection = require('../models/DatabaseConnection');
const KnowledgeBase = require('../models/KnowledgeBase');

const PYTHON_ENGINE_URL = 'http://localhost:8000';

/**
 * @desc    Public streaming chat endpoint for published agents
 * @route   POST /api/v1/public/agents/:agentId/chat/stream
 * @access  Public (Authenticated via Developer Bearer Token)
 */
router.post('/agents/:agentId/chat/stream', async (req, res) => {
  try {
    const { agentId } = req.params;
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Authorization failed: no token provided.' });
    }

    const rawToken = authHeader.split(' ')[1];
    if (!rawToken.startsWith('sk_live_')) {
      return res.status(401).json({ success: false, message: 'Authorization failed: invalid token format.' });
    }

    // 1. Hash incoming token for comparison
    const incomingHashed = crypto.createHash('sha256').update(rawToken).digest('hex');

    // 2. Timing-attack safe key validation
    // Fetch all active developer API keys scoped to this agentId
    const activeKeys = await DeveloperApiKey.find({ entityId: agentId, isActive: true });
    
    let matchedKey = null;
    const incomingBuf = Buffer.from(incomingHashed);

    for (const key of activeKeys) {
      const keyBuf = Buffer.from(key.hashedKey);
      if (incomingBuf.length === keyBuf.length && crypto.timingSafeEqual(incomingBuf, keyBuf)) {
        matchedKey = key;
        break;
      }
    }

    if (!matchedKey) {
      return res.status(401).json({ success: false, message: 'Authorization failed: invalid or inactive API key.' });
    }

    // 3. Scope validation (Double check: must match entityType = 'agent' and entityId)
    if (matchedKey.entityType !== 'agent' || matchedKey.entityId !== agentId) {
      return res.status(403).json({ success: false, message: 'Forbidden: API key is not authorized for this agent.' });
    }

    // 4. Fetch the published Agent
    const agent = await Agent.findById(agentId);
    if (!agent) {
      return res.status(404).json({ success: false, message: 'Agent not found.' });
    }

    // 5. Fetch developer user profile to access connection credentials
    const developer = await User.findById(matchedKey.userId);
    if (!developer) {
      return res.status(404).json({ success: false, message: 'Developer profile not found.' });
    }

    const connection = developer.connections.id(agent.connectionId);
    if (!connection) {
      return res.status(404).json({ success: false, message: 'Model provider connection not found.' });
    }

    const { messages } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ success: false, message: 'Please provide messages array.' });
    }

    const lastUserMessage = [...messages].reverse().find(msg => msg.role === 'user');
    const prompt = lastUserMessage ? lastUserMessage.content : '';

    // 6. Fetch scoped active vector stores and active database connections
    const isObjectId = (str) => /^[0-9a-fA-F]{24}$/.test(str);
    const kbIds = agent.knowledge.filter(id => !isObjectId(id));
    const dbIds = agent.knowledge.filter(id => isObjectId(id));

    const [kbs, dbs] = await Promise.all([
      KnowledgeBase.find({ kb_id: { $in: kbIds }, userId: matchedKey.userId }),
      DatabaseConnection.find({ _id: { $in: dbIds }, userId: matchedKey.userId })
    ]);

    const active_kb_ids = kbs.map(kb => ({ kb_id: kb.kb_id, name: kb.name }));
    const active_db_ids = dbs.map(db => ({ db_id: db._id, name: db.name, engine: db.engine }));

    try {
      // 7. Set streaming headers for Server-Sent Events
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      // 8. Proxy stream to FastAPI engine
      const pyResponse = await axios.post(`${PYTHON_ENGINE_URL}/api/engine/run`, {
        prompt: prompt,
        agent_config: {
          instructions: agent.instructions || '',
          tools: agent.tools || [],
          model_id: agent.modelId,
          provider_name: connection.providerName,
          api_key: connection.apiKey,
          custom_base_url: connection.baseUrl || null,
          active_kb_ids,
          active_db_ids
        },
        auth_vault: developer.oauth_vault || {}
      }, { responseType: 'stream', timeout: 120000 });

      // 9. Pipe stream directly to client
      pyResponse.data.pipe(res);
    } catch (err) {
      console.error(`Public agent run stream crash for agent ${agentId}: ${err.message}`);
      if (res.headersSent) {
        res.write(`data: ${JSON.stringify({ type: 'error', message: err.message })}\n\n`);
        return res.end();
      }
      const errMessage = err.response?.data?.detail || err.message || 'Failed to stream response from Python engine.';
      const statusCode = err.response?.status || 500;
      return res.status(statusCode).json({ success: false, message: errMessage });
    }

  } catch (error) {
    console.error('Public route error:', error.message);
    res.status(500).json({ success: false, message: `Server error: ${error.message}` });
  }
});

module.exports = router;
