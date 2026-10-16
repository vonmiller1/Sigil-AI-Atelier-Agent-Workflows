const express = require('express');
const router = express.Router();
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');
const { v4: uuidv4 } = require('uuid');
const KnowledgeBase = require('../models/KnowledgeBase');
const { protect } = require('../middleware/authMiddleware');

// Configure multer to store uploaded files in memory
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 } // 25MB limit
});

/**
 * @desc    Upload PDF and ingest into Knowledge Base
 * @route   POST /api/knowledge/upload
 * @access  Private
 */
router.post('/upload', protect, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please upload a PDF file' });
    }

    const indexName = req.body.name || req.file.originalname.replace(/\.pdf$/i, '');
    const kb_id = uuidv4();

    // 1. Create a pending database record in MongoDB
    const kbRecord = await KnowledgeBase.create({
      userId: req.user.id,
      name: indexName,
      kb_id: kb_id,
      status: 'ingesting'
    });

    // 2. Prepare multipart form data for FastAPI
    const form = new FormData();
    form.append('kb_id', kb_id);
    form.append('file', req.file.buffer, {
      filename: req.file.originalname,
      contentType: req.file.mimetype
    });

    try {
      const response = await axios.post('http://localhost:8000/api/engine/knowledge/ingest', form, {
        headers: {
          ...form.getHeaders()
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
        timeout: 15000 // Short timeout since FastAPI returns immediately
      });

      if (response.status === 200 && response.data.success) {
        // Ingestion started successfully, status remains 'ingesting'
        return res.status(200).json({
          success: true,
          message: 'Knowledge Base creation and indexing initiated in background',
          data: kbRecord
        });
      } else {
        throw new Error(response.data.message || 'Ingestion endpoint failed to initialize');
      }
    } catch (err) {
      console.error(`FastAPI Ingestion failed to initialize for kb_id ${kb_id}:`, err.message);
      
      // Update MongoDB status to failed
      kbRecord.status = 'failed';
      await kbRecord.save();

      const errMsg = err.response?.data?.detail || err.message || 'Failed to initialize indexing engine.';
      return res.status(500).json({
        success: false,
        message: `RAG Ingestion Engine Error: ${errMsg}`,
        data: kbRecord
      });
    }

  } catch (error) {
    console.error('Express upload error:', error.message);
    res.status(500).json({ success: false, message: `Server error: ${error.message}` });
  }
});

/**
 * @desc    Update Knowledge Base ingestion status (Internal Webhook from FastAPI)
 * @route   POST /api/knowledge/status
 * @access  Public (Internal)
 */
router.post('/status', async (req, res) => {
  try {
    const { kb_id, status, error } = req.body;
    if (!kb_id || !status) {
      return res.status(400).json({ success: false, message: 'kb_id and status are required' });
    }

    const kbRecord = await KnowledgeBase.findOne({ kb_id });
    if (!kbRecord) {
      return res.status(404).json({ success: false, message: 'Knowledge Base index not found' });
    }

    kbRecord.status = status;
    await kbRecord.save();

    console.log(`Knowledge Base index ${kb_id} status updated to ${status}` + (error ? `. Error: ${error}` : ''));
    return res.status(200).json({ success: true, message: 'Status updated successfully' });
  } catch (error) {
    console.error('Status update error:', error.message);
    res.status(500).json({ success: false, message: `Server error: ${error.message}` });
  }
});

/**
 * @desc    Get user's Knowledge Bases
 * @route   GET /api/knowledge
 * @access  Private
 */
router.get('/', protect, async (req, res) => {
  try {
    const kbs = await KnowledgeBase.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      count: kbs.length,
      data: kbs
    });
  } catch (error) {
    res.status(500).json({ success: false, message: `Server error: ${error.message}` });
  }
});

/**
 * @desc    Delete a Knowledge Base
 * @route   DELETE /api/knowledge/:id
 * @access  Private
 */
router.delete('/:id', protect, async (req, res) => {
  try {
    const kb = await KnowledgeBase.findById(req.params.id);
    if (!kb) {
      return res.status(404).json({ success: false, message: 'Knowledge Base not found' });
    }

    // Check ownership
    if (kb.userId.toString() !== req.user.id) {
      return res.status(401).json({ success: false, message: 'Not authorized' });
    }

    // Call FastAPI to clean up local vector indexes and BM25 pickles
    try {
      await axios.delete(`http://localhost:8000/api/engine/knowledge/${kb.kb_id}`, { timeout: 15000 });
    } catch (err) {
      console.warn(`FastAPI index deletion cleanup failed for ${kb.kb_id}:`, err.message);
    }

    await kb.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Knowledge Base deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: `Server error: ${error.message}` });
  }
});

module.exports = router;
