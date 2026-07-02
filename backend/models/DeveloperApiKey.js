const mongoose = require('mongoose');

const developerApiKeySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  hashedKey: {
    type: String,
    required: true,
    unique: true
  },
  prefix: {
    type: String,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  entityType: {
    type: String,
    enum: ['agent', 'workflow'],
    required: true
  },
  entityId: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('DeveloperApiKey', developerApiKeySchema);
