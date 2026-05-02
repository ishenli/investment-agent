/**
 * Weixin CDN media encryption utilities
 *
 * WeChat CDN uses AES-128-ECB with PKCS7 padding.
 * Ported from the Python implementation in gateway/platforms/weixin.py.
 */

import crypto from 'node:crypto';

/**
 * PKCS7-pad data to a multiple of blockSize (default 16)
 */
function pkcs7Pad(data: Buffer, blockSize = 16): Buffer {
  const padLen = blockSize - (data.length % blockSize);
  const padding = Buffer.alloc(padLen, padLen);
  return Buffer.concat([data, padding]);
}

/**
 * Remove PKCS7 padding from decrypted data
 */
function pkcs7Unpad(data: Buffer): Buffer {
  if (data.length === 0) return data;
  const padLen = data[data.length - 1];
  if (padLen >= 1 && padLen <= 16) {
    const slice = data.subarray(data.length - padLen);
    if (slice.every((b) => b === padLen)) {
      return data.subarray(0, data.length - padLen);
    }
  }
  return data;
}

/**
 * Encrypt plaintext with AES-128-ECB (PKCS7 padded)
 */
export function aes128EcbEncrypt(plaintext: Buffer, key: Buffer): Buffer {
  const padded = pkcs7Pad(plaintext);
  const cipher = crypto.createCipheriv('aes-128-ecb', key, null);
  cipher.setAutoPadding(false);
  return Buffer.concat([cipher.update(padded), cipher.final()]);
}

/**
 * Decrypt ciphertext with AES-128-ECB (PKCS7 unpadded)
 */
export function aes128EcbDecrypt(ciphertext: Buffer, key: Buffer): Buffer {
  const decipher = crypto.createDecipheriv('aes-128-ecb', key, null);
  decipher.setAutoPadding(false);
  const padded = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return pkcs7Unpad(padded);
}

/**
 * Calculate AES-padded size for a given plaintext size
 * (used when reporting filesize to getuploadurl)
 */
export function aesPaddedSize(size: number): number {
  return Math.ceil((size + 1) / 16) * 16;
}

/**
 * Parse the AES key from a base64-encoded string.
 *
 * iLink API encodes the AES key as base64(hex_string_of_raw_bytes).
 * This function handles both the 16-byte raw key and the 32-byte hex-encoded key.
 */
export function parseAesKey(aesKeyB64: string): Buffer {
  const decoded = Buffer.from(aesKeyB64, 'base64');
  if (decoded.length === 16) {
    return decoded;
  }
  if (decoded.length === 32) {
    // Could be hex-encoded raw key
    const text = decoded.toString('ascii');
    if (/^[0-9a-fA-F]{32}$/.test(text)) {
      return Buffer.from(text, 'hex');
    }
  }
  throw new Error(`Unexpected aes_key format (${decoded.length} decoded bytes)`);
}

/**
 * Generate a random 16-byte AES key
 */
export function generateAesKey(): Buffer {
  return crypto.randomBytes(16);
}

/**
 * Encode AES key for iLink API.
 * iLink expects base64(hex_string) — NOT base64(raw_bytes).
 */
export function encodeAesKeyForApi(rawKey: Buffer): string {
  return Buffer.from(rawKey.toString('hex'), 'ascii').toString('base64');
}
