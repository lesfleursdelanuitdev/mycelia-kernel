/**
 * usePasswordManager Hook
 * 
 * Provides password hashing and verification functionality using bcrypt.
 */

import { Facet } from '../../models/facet-manager/facet.mycelia.js';
import { createHook } from '../create-hook.mycelia.js';
import { getDebugFlag } from '../../utils/debug-flag.utils.mycelia.js';
import { createLogger } from '../../utils/logger.utils.mycelia.js';
import crypto from 'crypto';

export const usePasswordManager = createHook({
  kind: 'passwordManager',
  version: '1.0.0',
  overwrite: false,
  required: [],
  attach: true,
  source: import.meta.url,
  contract: null,
  fn: (ctx, api, subsystem) => {
    const { name } = api;
    const config = ctx.config?.password || {};
    const debug = getDebugFlag(config, ctx);
    const logger = createLogger(debug, `usePasswordManager ${name}`);

    const bcryptRounds = config.bcryptRounds || 10;
    const minLength = config.minLength || 8;
    const requireUppercase = config.requireUppercase !== false;
    const requireLowercase = config.requireLowercase !== false;
    const requireNumbers = config.requireNumbers !== false;
    const requireSpecialChars = config.requireSpecialChars !== false;

    // Check if bcrypt is available (Node.js environment)
    let bcrypt = null;
    try {
      // Dynamic import for bcrypt (optional dependency)
      // eslint-disable-next-line no-eval
      bcrypt = eval('require')('bcrypt');
    } catch (error) {
      if (debug) {
        logger.warn('bcrypt not available, using crypto-based hashing');
      }
    }

    /**
     * Hash a password
     * @param {string} password - Plain text password
     * @returns {Promise<string>} Hashed password
     */
    async function hashPassword(password) {
      if (!password || typeof password !== 'string') {
        throw new Error('Password must be a non-empty string');
      }

      if (bcrypt) {
        // Use bcrypt if available
        return await bcrypt.hash(password, bcryptRounds);
      } else {
        // Fallback to crypto-based hashing (for browser environments)
        const salt = crypto.randomBytes(16).toString('hex');
        const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
        return `${salt}:${hash}:pbkdf2`;
      }
    }

    /**
     * Verify a password against a hash
     * @param {string} password - Plain text password
     * @param {string} hash - Hashed password
     * @returns {Promise<boolean>} True if password matches
     */
    async function verifyPassword(password, hash) {
      if (!password || typeof password !== 'string') {
        return false;
      }

      if (!hash || typeof hash !== 'string') {
        return false;
      }

      if (bcrypt) {
        // Use bcrypt if available
        return await bcrypt.compare(password, hash);
      } else {
        // Fallback to crypto-based verification
        if (hash.includes(':pbkdf2')) {
          const [salt, hashValue] = hash.split(':');
          const computedHash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
          return computedHash === hashValue;
        }
        return false;
      }
    }

    /**
     * Generate a secure random password
     * @param {number} [length=16] - Password length
     * @returns {string} Generated password
     */
    function generatePassword(length = 16) {
      const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
      const randomBytes = crypto.randomBytes(length);
      let password = '';
      for (let i = 0; i < length; i++) {
        password += charset[randomBytes[i] % charset.length];
      }
      return password;
    }

    /**
     * Validate password strength
     * @param {string} password - Password to validate
     * @returns {{valid: boolean, errors: string[]}} Validation result
     */
    function validatePasswordStrength(password) {
      const errors = [];

      if (!password || typeof password !== 'string') {
        errors.push('Password must be a string');
        return { valid: false, errors };
      }

      if (password.length < minLength) {
        errors.push(`Password must be at least ${minLength} characters long`);
      }

      if (requireUppercase && !/[A-Z]/.test(password)) {
        errors.push('Password must contain at least one uppercase letter');
      }

      if (requireLowercase && !/[a-z]/.test(password)) {
        errors.push('Password must contain at least one lowercase letter');
      }

      if (requireNumbers && !/[0-9]/.test(password)) {
        errors.push('Password must contain at least one number');
      }

      if (requireSpecialChars && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
        errors.push('Password must contain at least one special character');
      }

      return {
        valid: errors.length === 0,
        errors
      };
    }

    return new Facet('passwordManager', { attach: true, source: import.meta.url })
      .add({
        hashPassword,
        verifyPassword,
        generatePassword,
        validatePasswordStrength
      });
  }
});

