const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const connectionSchema = new mongoose.Schema({
  providerName: {
    type: String,
    required: [true, 'Please provide a provider name'],
  },
  apiKey: {
    type: String,
    required: [true, 'Please provide an API key'],
  },
  baseUrl: {
    type: String,
    default: null,
  }
});

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide a name'],
    trim: true,
  },
  email: {
    type: String,
    required: [true, 'Please provide an email address'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please fill a valid email address',
    ],
  },
  password: {
    type: String,
    required: [true, 'Please provide a password'],
    minlength: [8, 'Password must be at least 8 characters'],
  },
  settings: {
    theme: {
      type: String,
      default: 'default',
    },
    font: {
      type: String,
      default: 'Inter',
    }
  },
  connections: [connectionSchema],
  oauth_vault: {
    google: {
      access_token: { type: String, default: null },
      refresh_token: { type: String, default: null },
      email: { type: String, default: null },
      expiry: { type: Number, default: null }
    },
    microsoft: {
      access_token: { type: String, default: null },
      refresh_token: { type: String, default: null },
      email: { type: String, default: null },
      expiry: { type: Number, default: null }
    }
  }
}, {
  timestamps: true,
});

// Pre-save hook to hash password automatically before saving to database
userSchema.pre('save', async function () {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password')) {
    return;
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Method to compare entered password with the hashed password in database
userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', userSchema);

module.exports = User;
