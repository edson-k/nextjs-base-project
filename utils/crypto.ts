import crypto from 'crypto';

const VERSION = 'v2';
const IV_LENGTH = 12; // GCM nonce
const LEGACY_ALGORITHM = 'aes256';

// Any string works as secret; the AES key is derived from it with SHA-256.
const deriveKey = (key: string) => crypto.createHash('sha256').update(key).digest();

/**
 * Encrypts with AES-256-GCM (authenticated). Output: v2:<iv>:<tag>:<ciphertext> (hex).
 */
export const symmetricEncrypt = function (text: string, key: string) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-gcm', deriveKey(key), iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [VERSION, iv.toString('hex'), tag.toString('hex'), encrypted.toString('hex')].join(':');
};

/**
 * Decrypts v2 (GCM) values and legacy AES-256-CBC values (iv:ciphertext) created before the upgrade.
 */
export const symmetricDecrypt = function (text: string, key: string) {
  const components = text.split(':');

  if (components[0] === VERSION && components.length === 4) {
    const [, iv, tag, data] = components;
    const decipher = crypto.createDecipheriv('aes-256-gcm', deriveKey(key), Buffer.from(iv, 'hex'));
    decipher.setAuthTag(Buffer.from(tag, 'hex'));
    return Buffer.concat([decipher.update(Buffer.from(data, 'hex')), decipher.final()]).toString('utf8');
  }

  // legacy
  const _key = Buffer.from(key, 'latin1');
  const iv = Buffer.from(components.shift() || '', 'hex');
  const decipher = crypto.createDecipheriv(LEGACY_ALGORITHM, _key, iv);
  let deciphered = decipher.update(components.join(':'), 'hex', 'utf8');
  deciphered += decipher.final('utf8');
  return deciphered;
};
