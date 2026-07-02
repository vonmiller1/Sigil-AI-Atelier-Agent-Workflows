const express = require('express');
const router = express.Router();
const { updateSettings, getUserProfile } = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');

// Route for updating theme and font preferences: PATCH /api/user/settings
router.patch('/settings', protect, updateSettings);

// Route for getting user profile: GET /api/user/profile
router.get('/profile', protect, getUserProfile);

module.exports = router;
