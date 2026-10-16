const mongoose = require('mongoose');

const databaseConnectionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  engine: {
    type: String,
    enum: ['postgresql', 'mysql'],
    required: true
  },
  host: {
    type: String,
    required: true
  },
  port: {
    type: Number,
    required: true
  },
  databaseName: {
    type: String,
    required: true
  },
  username: {
    type: String,
    required: true
  },
  encryptedPassword: {
    type: String,
    required: true
  },
  iv: {
    type: String,
    required: true
  },
  sslMode: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    enum: ['Connected', 'Failed', 'Expired', 'Unauthorized', 'Timeout'],
    default: 'Failed'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('DatabaseConnection', databaseConnectionSchema);
