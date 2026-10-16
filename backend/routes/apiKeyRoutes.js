const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const DeveloperApiKey = require('../models/DeveloperApiKey');
const { protect } = require('../middleware/authMiddleware');

/**
 * @desc    Generate a new developer API key
 * @route   POST /api/api-keys
 * @access  Private
 */
router.post('/', protect, async (req, res) => {
  try {
    const { name, entityType, entityId } = req.body;

    if (!name || !entityType || !entityId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please provide name, entityType (agent or workflow), and entityId.' 
      });
    }

    if (!['agent', 'workflow'].includes(entityType)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid entityType. Must be either agent or workflow.' 
      });
    }

    // 1. Generate 24-byte random hex key prefixed with sk_live_
    const randomHex = crypto.randomBytes(24).toString('hex');
    const rawKey = `sk_live_${randomHex}`;

    // 2. Compute SHA-256 hash
    const hashedKey = crypto.createHash('sha256').update(rawKey).digest('hex');

    // 3. Create preview prefix: first 12 characters + ... + last 4 characters
    const prefix = `${rawKey.substring(0, 12)}...${rawKey.substring(rawKey.length - 4)}`;

    // 4. Save to database
    const apiKey = await DeveloperApiKey.create({
      userId: req.user.id,
      name,
      hashedKey,
      prefix,
      entityType,
      entityId,
      isActive: true
    });

    // 5. Return payload, returning rawKey ONLY this once
    res.status(201).json({
      success: true,
      data: {
        id: apiKey._id,
        name: apiKey.name,
        rawKey,
        prefix: apiKey.prefix,
        entityType: apiKey.entityType,
        entityId: apiKey.entityId,
        createdAt: apiKey.createdAt
      }
    });

  } catch (error) {
    console.error('Error generating API key:', error.message);
    res.status(500).json({ success: false, message: `Server error: ${error.message}` });
  }
});

/**
 * @desc    Get active API keys scoped to an agent or workflow
 * @route   GET /api/api-keys
 * @access  Private
 */
router.get('/', protect, async (req, res) => {
  try {
    const { entityType, entityId } = req.query;

    const query = { userId: req.user.id };
    if (entityType) query.entityType = entityType;
    if (entityId) query.entityId = entityId;

    // Retrieve active keys, omitting the hashedKey for security
    const apiKeys = await DeveloperApiKey.find(query)
      .select('-hashedKey')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: apiKeys.length,
      data: apiKeys
    });

  } catch (error) {
    console.error('Error fetching API keys:', error.message);
    res.status(500).json({ success: false, message: `Server error: ${error.message}` });
  }
});

/**
 * @desc    Revoke/Delete a developer API key
 * @route   DELETE /api/api-keys/:id
 * @access  Private
 */
router.delete('/:id', protect, async (req, res) => {
  try {
    const apiKey = await DeveloperApiKey.findById(req.params.id);
    if (!apiKey) {
      return res.status(404).json({ success: false, message: 'API Key not found.' });
    }

    // Verify ownership
    if (apiKey.userId.toString() !== req.user.id) {
      return res.status(401).json({ success: false, message: 'Not authorized.' });
    }

    await apiKey.deleteOne();

    res.status(200).json({
      success: true,
      message: 'API Key revoked and deleted successfully.'
    });

  } catch (error) {
    console.error('Error revoking API key:', error.message);
    res.status(500).json({ success: false, message: `Server error: ${error.message}` });
  }
});

module.exports = router;
