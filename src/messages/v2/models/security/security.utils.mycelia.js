/**
 * Security Utilities
 * 
 * Utility functions and constants for security-related operations in the Mycelia system.
 */

/**
 * PRINCIPAL_KINDS
 * 
 * Constants mapping for principal kind identifiers.
 * These constants should be used instead of string literals throughout the system
 * to ensure type safety and prevent typos.
 */
export const PRINCIPAL_KINDS = {
  KERNEL: 'kernel',
  TOP_LEVEL: 'topLevel',
  CHILD: 'child',
  FRIEND: 'friend',
  RESOURCE: 'resource',
};

/**
 * Generate a UUID v4 compatible with both Node.js and browser environments
 * Uses Web Crypto API (crypto.getRandomValues) which is available in browsers and Node.js 15+
 * 
 * @returns {string} A UUID v4 string in the format 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'
 */
export function randomUUID() {
  // Use Web Crypto API (available in browsers and Node.js 15+)
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    // Set version (4) and variant bits
    bytes[6] = (bytes[6] & 0x0f) | 0x40; // Version 4
    bytes[8] = (bytes[8] & 0x3f) | 0x80; // Variant 10
    // Convert to UUID string format
    const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
    return [
      hex.slice(0, 8),
      hex.slice(8, 12),
      hex.slice(12, 16),
      hex.slice(16, 20),
      hex.slice(20, 32)
    ].join('-');
  }
  // Fallback for older environments (less secure, but works)
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

