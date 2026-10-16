const crypto = require('crypto');

/**
 * Derives a 32-byte key from the configured ENCRYPTION_KEY using SHA-256.
 * This guarantees we always have exactly 32 bytes for aes-256-gcm.
 */
function getCipherKey() {
  const secret = process.env.ENCRYPTION_KEY;
  if (!secret) {
    throw new Error('ENCRYPTION_KEY is not defined in the environment variables.');
  }
  return crypto.createHash('sha256').update(secret).digest();
}

/**
 * Encrypts cleartext using AES-256-GCM.
 * Returns the concatenated ciphertext + authTag, and the initialization vector (IV).
 * 
 * @param {string} text - The cleartext to encrypt
 * @returns {object} { encryptedText: string, iv: string }
 */
function encrypt(text) {
  const val = text || '';
  
  const iv = crypto.randomBytes(12);
  const key = getCipherKey();
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  
  let encrypted = cipher.update(val, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag().toString('hex'); // 16 bytes = 32 hex chars
  
  return {
    encryptedText: encrypted + authTag,
    iv: iv.toString('hex')
  };
}

/**
 * Decrypts ciphertext using AES-256-GCM.
 * Expects the concatenated ciphertext + authTag, and the initialization vector (IV) in hex.
 * 
 * @param {string} encryptedText - The concatenated ciphertext + authTag in hex
 * @param {string} ivHex - The initialization vector in hex
 * @returns {string} The decrypted cleartext
 */
function decrypt(encryptedText, ivHex) {
  if (!ivHex) return '';
  const val = encryptedText || '';
  
  const key = getCipherKey();
  const iv = Buffer.from(ivHex, 'hex');
  
  // authTag is always the last 16 bytes = 32 hex characters
  const authTagLength = 32;
  if (val.length < authTagLength) {
    throw new Error('Invalid encrypted text format: too short to contain authentication tag.');
  }
  
  const cipherTextHex = val.slice(0, -authTagLength);
  const authTagHex = val.slice(-authTagLength);
  
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
  
  let decrypted = decipher.update(cipherTextHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

module.exports = {
  encrypt,
  decrypt
};
