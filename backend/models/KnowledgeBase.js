const mongoose = require('mongoose');

const knowledgeBaseSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  kb_id: {
    type: String,
    required: true,
    unique: true
  },
  status: {
    type: String,
    enum: ['ingesting', 'ready', 'failed'],
    default: 'ingesting'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('KnowledgeBase', knowledgeBaseSchema);
