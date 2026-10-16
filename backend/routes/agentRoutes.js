const express = require('express');
const router = express.Router();
const { getAgents, createAgent, deleteAgent, updateAgent } = require('../controllers/agentController');
const { protect } = require('../middleware/authMiddleware');

// Secure private endpoints for managing user agents
router.route('/')
  .get(protect, getAgents)
  .post(protect, createAgent);

router.route('/:id')
  .put(protect, updateAgent)
  .delete(protect, deleteAgent);

module.exports = router;
