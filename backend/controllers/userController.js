const User = require('../models/User');

/**
 * @desc    Update user visual layout settings (theme and font)
 * @route   PATCH /api/user/settings
 * @access  Private
 */
const updateSettings = async (req, res) => {
  try {
    const { theme, font } = req.body;

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Initialize settings if they do not exist
    if (!user.settings) {
      user.settings = { theme: 'default', font: 'Inter' };
    }

    if (theme) user.settings.theme = theme;
    if (font) user.settings.font = font;

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Settings updated successfully',
      settings: user.settings,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: `Server error: ${error.message}` });
  }
};

/**
 * @desc    Get user profile including oauth_vault
 * @route   GET /api/user/profile
 * @access  Private
 */
const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.status(200).json({
      success: true,
      user
    });
  } catch (error) {
    res.status(500).json({ success: false, message: `Server error: ${error.message}` });
  }
};

module.exports = {
  updateSettings,
  getUserProfile,
};
