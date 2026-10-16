const mongoose = require('mongoose');

const agentSchema = new mongoose.Schema({
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
  description: {
    type: String
  },
  connectionId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  modelId: {
    type: String,
    required: true
  },
  instructions: {
    type: String,
    default: "You are a helpful AI assistant."
  },
  tools: {
    type: [String],
    default: []
  },
  knowledge: {
    type: [String],
    default: []
  },
  memory: {
    memoryType: {
      type: String,
      enum: ['off', 'sliding_window', 'summarization'],
      default: 'sliding_window'
    },
    windowSize: {
      type: Number,
      default: 10
    }
  },
  guardrails: {
    strictness: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium'
    },
    blockPii: {
      type: Boolean,
      default: false
    }
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Agent', agentSchema);
