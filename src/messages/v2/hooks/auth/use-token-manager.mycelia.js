/**
 * useTokenManager Hook
 * 
 * Provides JWT and custom token generation and validation functionality.
 */

import { Facet } from 'mycelia-kernel-plugin/core';
import { createHook } from '../create-hook.mycelia.js';
import { getDebugFlag } from '../../utils/debug-flag.utils.mycelia.js';
import { createLogger } from '../../utils/logger.utils.mycelia.js';
import { findFacet } from '../../utils/find-facet.utils.mycelia.js';
import crypto from 'crypto';

export const useTokenManager = createHook({
  kind: 'tokenManager',
  version: '1.0.0',
  overwrite: false,
  required: ['authStorage'],
  attach: true,
  source: import.meta.url,
  contract: null,
  fn: (ctx, api, subsystem) => {
    const { name } = api;
    const config = ctx.config?.tokens || {};
    const debug = getDebugFlag(config, ctx);
    const logger = createLogger(debug, `useTokenManager ${name}`);

    // Find authStorage facet
    const authStorageResult = findFacet(api.__facets, 'authStorage');
    if (!authStorageResult) {
      throw new Error(`useTokenManager ${name}: authStorage facet not found. useAuthStorage must be added before useTokenManager.`);
    }

    const authStorage = authStorageResult.facet;

    const accessTokenExpiry = config.accessTokenExpiry || 3600000; // 1 hour
    const refreshTokenExpiry = config.refreshTokenExpiry || 604800000; // 7 days
    const signingKey = config.signingKey || 'default-secret-key-change-in-production';
    const algorithm = config.algorithm || 'HS256';

    /**
     * Base64 URL encode
     * @param {string} str - String to encode
     * @returns {string} Encoded string
     */
    function base64UrlEncode(str) {
      return Buffer.from(str)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
    }

    /**
     * Base64 URL decode
     * @param {string} str - String to decode
     * @returns {string} Decoded string
     */
    function base64UrlDecode(str) {
      str = str.replace(/-/g, '+').replace(/_/g, '/');
      while (str.length % 4) {
        str += '=';
      }
      return Buffer.from(str, 'base64').toString('utf-8');
    }

    /**
     * Sign JWT token
     * @param {string} payload - Token payload
     * @param {string} secret - Signing secret
     * @returns {string} Signature
     */
    function signToken(payload, secret) {
      const hmac = crypto.createHmac('sha256', secret);
      hmac.update(payload);
      return base64UrlEncode(hmac.digest('base64'));
    }

    /**
     * Verify JWT token signature
     * @param {string} payload - Token payload
     * @param {string} signature - Token signature
     * @param {string} secret - Signing secret
     * @returns {boolean} True if signature is valid
     */
    function verifySignature(payload, signature, secret) {
      const expectedSignature = signToken(payload, secret);
      return signature === expectedSignature;
    }

    /**
     * Generate access token (JWT)
     * @param {string} userId - User ID
     * @param {Object} [options={}] - Token options
     * @param {number} [options.expiresIn] - Expiration time in milliseconds
     * @param {Object} [options.payload={}] - Additional payload data
     * @returns {Promise<{success: boolean, token?: string, expiresAt?: number, error?: Error}>}
     */
    async function generateAccessToken(userId, options = {}) {
      try {
        const expiresIn = options.expiresIn || accessTokenExpiry;
        const now = Date.now();
        const expiresAt = now + expiresIn;

        const payload = {
          sub: userId,
          iat: Math.floor(now / 1000),
          exp: Math.floor(expiresAt / 1000),
          type: 'access',
          ...options.payload
        };

        const header = {
          alg: algorithm,
          typ: 'JWT'
        };

        const encodedHeader = base64UrlEncode(JSON.stringify(header));
        const encodedPayload = base64UrlEncode(JSON.stringify(payload));
        const signature = signToken(`${encodedHeader}.${encodedPayload}`, signingKey);

        const token = `${encodedHeader}.${encodedPayload}.${signature}`;

        // Store token in authStorage
        await authStorage.createToken({
          userId,
          type: 'access',
          token,
          expiresAt,
          metadata: options.payload || {}
        });

        return { success: true, token, expiresAt };
      } catch (error) {
        logger.error('Generate access token error:', error);
        return { success: false, error };
      }
    }

    /**
     * Generate refresh token
     * @param {string} userId - User ID
     * @param {Object} [options={}] - Token options
     * @param {number} [options.expiresIn] - Expiration time in milliseconds
     * @returns {Promise<{success: boolean, token?: string, expiresAt?: number, error?: Error}>}
     */
    async function generateRefreshToken(userId, options = {}) {
      try {
        const expiresIn = options.expiresIn || refreshTokenExpiry;
        const now = Date.now();
        const expiresAt = now + expiresIn;

        // Generate a random token (not JWT for refresh tokens)
        const token = crypto.randomBytes(32).toString('hex');

        // Store token in authStorage
        await authStorage.createToken({
          userId,
          type: 'refresh',
          token,
          expiresAt,
          metadata: {}
        });

        return { success: true, token, expiresAt };
      } catch (error) {
        logger.error('Generate refresh token error:', error);
        return { success: false, error };
      }
    }

    /**
     * Generate API key
     * @param {string} userId - User ID
     * @param {Object} [options={}] - API key options
     * @param {number} [options.expiresIn] - Expiration time in milliseconds (null for no expiration)
     * @param {Object} [options.metadata={}] - Additional metadata
     * @returns {Promise<{success: boolean, apiKey?: string, expiresAt?: number, error?: Error}>}
     */
    async function generateApiKey(userId, options = {}) {
      try {
        const expiresIn = options.expiresIn;
        const expiresAt = expiresIn ? Date.now() + expiresIn : null;

        // Generate API key with prefix
        const randomPart = crypto.randomBytes(16).toString('hex');
        const apiKey = `mycelia_${randomPart}`;

        // Store token in authStorage
        await authStorage.createToken({
          userId,
          type: 'apiKey',
          token: apiKey,
          expiresAt,
          metadata: options.metadata || {}
        });

        return { success: true, apiKey, expiresAt };
      } catch (error) {
        logger.error('Generate API key error:', error);
        return { success: false, error };
      }
    }

    /**
     * Validate and decode token
     * @param {string} token - Token to validate
     * @param {string} [expectedType] - Expected token type
     * @returns {Promise<{success: boolean, valid?: boolean, data?: Object, error?: Error}>}
     */
    async function validateToken(token, expectedType) {
      try {
        if (!token || typeof token !== 'string') {
          return { success: true, valid: false };
        }

        // Check if it's a JWT (has dots)
        if (token.includes('.')) {
          const parts = token.split('.');
          if (parts.length !== 3) {
            return { success: true, valid: false };
          }

          const [encodedHeader, encodedPayload, signature] = parts;

          try {
            // Decode payload
            const payload = JSON.parse(base64UrlDecode(encodedPayload));

            // Check expiration
            if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
              return { success: true, valid: false, data: { expired: true } };
            }

            // Verify signature
            const payloadToVerify = `${encodedHeader}.${encodedPayload}`;
            if (!verifySignature(payloadToVerify, signature, signingKey)) {
              return { success: true, valid: false, data: { invalidSignature: true } };
            }

            // Check type if expected
            if (expectedType && payload.type !== expectedType) {
              return { success: true, valid: false, data: { wrongType: true } };
            }

            // Also check in storage (for revocation)
            const storageResult = await authStorage.validateToken(token);
            if (!storageResult.success || !storageResult.valid) {
              return { success: true, valid: false, data: { revoked: true } };
            }

            return {
              success: true,
              valid: true,
              data: {
                userId: payload.sub,
                type: payload.type,
                expiresAt: payload.exp ? payload.exp * 1000 : null,
                payload
              }
            };
          } catch (error) {
            return { success: true, valid: false };
          }
        } else {
          // Non-JWT token (refresh token, API key)
          const storageResult = await authStorage.validateToken(token);
          if (!storageResult.success) {
            return { success: false, error: storageResult.error };
          }

          if (!storageResult.valid) {
            return { success: true, valid: false, data: storageResult.data };
          }

          const tokenRecord = storageResult.data;

          // Check type if expected
          if (expectedType && tokenRecord.type !== expectedType) {
            return { success: true, valid: false, data: { wrongType: true } };
          }

          return {
            success: true,
            valid: true,
            data: {
              userId: tokenRecord.userId,
              type: tokenRecord.type,
              expiresAt: tokenRecord.expiresAt,
              tokenRecord
            }
          };
        }
      } catch (error) {
        logger.error('Validate token error:', error);
        return { success: false, error };
      }
    }

    /**
     * Refresh token (generate new access token from refresh token)
     * @param {string} refreshToken - Refresh token
     * @param {Object} [options={}] - Token options
     * @returns {Promise<{success: boolean, accessToken?: string, expiresAt?: number, error?: Error}>}
     */
    async function refreshToken(refreshToken, options = {}) {
      try {
        // Validate refresh token
        const validationResult = await validateToken(refreshToken, 'refresh');
        if (!validationResult.success || !validationResult.valid) {
          return { success: false, error: new Error('Invalid refresh token') };
        }

        const userId = validationResult.data.userId;

        // Generate new access token
        const accessTokenResult = await generateAccessToken(userId, options);
        if (!accessTokenResult.success) {
          return accessTokenResult;
        }

        return {
          success: true,
          accessToken: accessTokenResult.token,
          expiresAt: accessTokenResult.expiresAt
        };
      } catch (error) {
        logger.error('Refresh token error:', error);
        return { success: false, error };
      }
    }

    /**
     * Revoke token
     * @param {string} token - Token to revoke
     * @returns {Promise<{success: boolean, error?: Error}>}
     */
    async function revokeToken(token) {
      try {
        // Get token from storage
        const tokenResult = await authStorage.getTokenByValue(token);
        if (!tokenResult.success) {
          return { success: false, error: new Error('Token not found') };
        }

        // Revoke token
        const revokeResult = await authStorage.revokeToken(tokenResult.data.id);
        return revokeResult;
      } catch (error) {
        logger.error('Revoke token error:', error);
        return { success: false, error };
      }
    }

    return new Facet('tokenManager', { attach: true, source: import.meta.url })
      .add({
        generateAccessToken,
        generateRefreshToken,
        generateApiKey,
        validateToken,
        refreshToken,
        revokeToken
      });
  }
});

