/**
 * useAuthStorage Hook
 * 
 * Provides storage for users, sessions, and tokens.
 * Uses the storage facet (from DBSubsystem or direct storage) to persist auth data.
 */

import { Facet } from '../../models/facet-manager/facet.mycelia.js';
import { createHook } from '../create-hook.mycelia.js';
import { getDebugFlag } from '../../utils/debug-flag.utils.mycelia.js';
import { createLogger } from '../../utils/logger.utils.mycelia.js';
import { findFacet } from '../../utils/find-facet.utils.mycelia.js';
import crypto from 'crypto';

export const useAuthStorage = createHook({
  kind: 'authStorage',
  version: '1.0.0',
  overwrite: false,
  required: ['storage'],
  attach: true,
  source: import.meta.url,
  contract: null,
  fn: (ctx, api, subsystem) => {
    const { name } = api;
    const config = ctx.config?.storage || {};
    const debug = getDebugFlag(config, ctx);
    const logger = createLogger(debug, `useAuthStorage ${name}`);

    // Find storage facet
    const storageResult = findFacet(api.__facets, 'storage');
    if (!storageResult) {
      throw new Error(`useAuthStorage ${name}: storage facet not found. Storage hook must be added before useAuthStorage.`);
    }

    const storage = storageResult.facet;
    const namespace = config.namespace || 'auth';

    /**
     * Generate a unique ID
     * @returns {string} Unique ID
     */
    function generateId() {
      return `${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
    }

    /**
     * Create a new user
     * @param {Object} userData - User data
     * @param {string} userData.username - Username
     * @param {string} userData.email - Email
     * @param {string} userData.passwordHash - Hashed password
     * @param {Object} [userData.metadata={}] - Additional metadata
     * @returns {Promise<{success: boolean, data?: Object, error?: Error}>}
     */
    async function createUser(userData) {
      try {
        const { username, email, passwordHash, metadata = {} } = userData;

        if (!username || !email || !passwordHash) {
          return { success: false, error: new Error('Username, email, and passwordHash are required') };
        }

        // Check if user already exists
        const existingUser = await getUser(username);
        if (existingUser.success && existingUser.data) {
          return { success: false, error: new Error(`User "${username}" already exists`) };
        }

        const userId = generateId();
        const now = Date.now();

        const user = {
          id: userId,
          username,
          email,
          passwordHash,
          metadata,
          createdAt: now,
          updatedAt: now,
          lastLoginAt: null
        };

        const result = await storage.set(`user:${username}`, user, { namespace });
        if (!result.success) {
          return { success: false, error: result.error || new Error('Failed to create user') };
        }

        // Also store by ID for quick lookup
        await storage.set(`user:id:${userId}`, user, { namespace });

        return { success: true, data: user };
      } catch (error) {
        logger.error('Create user error:', error);
        return { success: false, error };
      }
    }

    /**
     * Get user by username
     * @param {string} username - Username
     * @returns {Promise<{success: boolean, data?: Object, error?: Error}>}
     */
    async function getUser(username) {
      try {
        if (!username) {
          return { success: false, error: new Error('Username is required') };
        }

        const result = await storage.get(`user:${username}`, { namespace });
        if (!result.success) {
          return { success: false, error: result.error || new Error(`User "${username}" not found`) };
        }

        return { success: true, data: result.data };
      } catch (error) {
        logger.error('Get user error:', error);
        return { success: false, error };
      }
    }

    /**
     * Get user by ID
     * @param {string} userId - User ID
     * @returns {Promise<{success: boolean, data?: Object, error?: Error}>}
     */
    async function getUserById(userId) {
      try {
        if (!userId) {
          return { success: false, error: new Error('User ID is required') };
        }

        const result = await storage.get(`user:id:${userId}`, { namespace });
        if (!result.success) {
          return { success: false, error: result.error || new Error(`User with ID "${userId}" not found`) };
        }

        return { success: true, data: result.data };
      } catch (error) {
        logger.error('Get user by ID error:', error);
        return { success: false, error };
      }
    }

    /**
     * Update user data
     * @param {string} userId - User ID
     * @param {Object} updates - Updates to apply
     * @returns {Promise<{success: boolean, data?: Object, error?: Error}>}
     */
    async function updateUser(userId, updates) {
      try {
        const userResult = await getUserById(userId);
        if (!userResult.success) {
          return userResult;
        }

        const user = userResult.data;
        const updatedUser = {
          ...user,
          ...updates,
          updatedAt: Date.now()
        };

        // Update both indexes
        await storage.set(`user:${user.username}`, updatedUser, { namespace });
        await storage.set(`user:id:${userId}`, updatedUser, { namespace });

        return { success: true, data: updatedUser };
      } catch (error) {
        logger.error('Update user error:', error);
        return { success: false, error };
      }
    }

    /**
     * Delete user
     * @param {string} userId - User ID
     * @returns {Promise<{success: boolean, error?: Error}>}
     */
    async function deleteUser(userId) {
      try {
        const userResult = await getUserById(userId);
        if (!userResult.success) {
          return userResult;
        }

        const user = userResult.data;

        // Delete both indexes
        await storage.delete(`user:${user.username}`, { namespace });
        await storage.delete(`user:id:${userId}`, { namespace });

        return { success: true };
      } catch (error) {
        logger.error('Delete user error:', error);
        return { success: false, error };
      }
    }

    /**
     * Create a session
     * @param {Object} sessionData - Session data
     * @param {string} sessionData.userId - User ID
     * @param {number} [sessionData.expiresAt] - Expiration timestamp
     * @param {Object} [sessionData.metadata={}] - Additional metadata
     * @returns {Promise<{success: boolean, data?: Object, error?: Error}>}
     */
    async function createSession(sessionData) {
      try {
        const { userId, expiresAt, metadata = {} } = sessionData;

        if (!userId) {
          return { success: false, error: new Error('User ID is required') };
        }

        const sessionId = generateId();
        const now = Date.now();

        const session = {
          id: sessionId,
          userId,
          expiresAt: expiresAt || (now + 3600000), // Default 1 hour
          createdAt: now,
          lastActivityAt: now,
          metadata
        };

        const result = await storage.set(`session:${sessionId}`, session, { namespace });
        if (!result.success) {
          return { success: false, error: result.error || new Error('Failed to create session') };
        }

        // Index by userId for quick lookup
        const userSessionsKey = `session:user:${userId}`;
        const userSessionsResult = await storage.get(userSessionsKey, { namespace });
        const userSessions = userSessionsResult.success && userSessionsResult.data 
          ? userSessionsResult.data 
          : [];
        userSessions.push(sessionId);
        await storage.set(userSessionsKey, userSessions, { namespace });

        return { success: true, data: session };
      } catch (error) {
        logger.error('Create session error:', error);
        return { success: false, error };
      }
    }

    /**
     * Get session by ID
     * @param {string} sessionId - Session ID
     * @returns {Promise<{success: boolean, data?: Object, error?: Error}>}
     */
    async function getSession(sessionId) {
      try {
        if (!sessionId) {
          return { success: false, error: new Error('Session ID is required') };
        }

        const result = await storage.get(`session:${sessionId}`, { namespace });
        if (!result.success) {
          return { success: false, error: result.error || new Error(`Session "${sessionId}" not found`) };
        }

        return { success: true, data: result.data };
      } catch (error) {
        logger.error('Get session error:', error);
        return { success: false, error };
      }
    }

    /**
     * Update session
     * @param {string} sessionId - Session ID
     * @param {Object} updates - Updates to apply
     * @returns {Promise<{success: boolean, data?: Object, error?: Error}>}
     */
    async function updateSession(sessionId, updates) {
      try {
        const sessionResult = await getSession(sessionId);
        if (!sessionResult.success) {
          return sessionResult;
        }

        const session = sessionResult.data;
        const updatedSession = {
          ...session,
          ...updates,
          lastActivityAt: Date.now()
        };

        await storage.set(`session:${sessionId}`, updatedSession, { namespace });

        return { success: true, data: updatedSession };
      } catch (error) {
        logger.error('Update session error:', error);
        return { success: false, error };
      }
    }

    /**
     * Delete session
     * @param {string} sessionId - Session ID
     * @returns {Promise<{success: boolean, error?: Error}>}
     */
    async function deleteSession(sessionId) {
      try {
        const sessionResult = await getSession(sessionId);
        if (!sessionResult.success) {
          return sessionResult;
        }

        const session = sessionResult.data;

        // Delete session
        await storage.delete(`session:${sessionId}`, { namespace });

        // Remove from user's session list
        const userSessionsKey = `session:user:${session.userId}`;
        const userSessionsResult = await storage.get(userSessionsKey, { namespace });
        if (userSessionsResult.success && userSessionsResult.data) {
          const userSessions = userSessionsResult.data.filter(id => id !== sessionId);
          await storage.set(userSessionsKey, userSessions, { namespace });
        }

        return { success: true };
      } catch (error) {
        logger.error('Delete session error:', error);
        return { success: false, error };
      }
    }

    /**
     * Get all sessions for a user
     * @param {string} userId - User ID
     * @returns {Promise<{success: boolean, data?: Array, error?: Error}>}
     */
    async function getSessionsByUserId(userId) {
      try {
        const userSessionsKey = `session:user:${userId}`;
        const userSessionsResult = await storage.get(userSessionsKey, { namespace });
        
        if (!userSessionsResult.success || !userSessionsResult.data) {
          return { success: true, data: [] };
        }

        const sessionIds = userSessionsResult.data;
        const sessions = [];

        for (const sessionId of sessionIds) {
          const sessionResult = await getSession(sessionId);
          if (sessionResult.success && sessionResult.data) {
            sessions.push(sessionResult.data);
          }
        }

        return { success: true, data: sessions };
      } catch (error) {
        logger.error('Get sessions by user ID error:', error);
        return { success: false, error };
      }
    }

    /**
     * Create a token
     * @param {Object} tokenData - Token data
     * @param {string} tokenData.userId - User ID
     * @param {string} tokenData.type - Token type ('access', 'refresh', 'apiKey')
     * @param {string} [tokenData.token] - Token value (if not provided, will be generated)
     * @param {number} [tokenData.expiresAt] - Expiration timestamp
     * @param {Object} [tokenData.metadata={}] - Additional metadata
     * @returns {Promise<{success: boolean, data?: Object, error?: Error}>}
     */
    async function createToken(tokenData) {
      try {
        const { userId, type, token, expiresAt, metadata = {} } = tokenData;

        if (!userId || !type) {
          return { success: false, error: new Error('User ID and token type are required') };
        }

        const tokenId = generateId();
        const tokenValue = token || generateId();
        const now = Date.now();

        const tokenRecord = {
          id: tokenId,
          userId,
          type,
          token: tokenValue,
          expiresAt: expiresAt || null,
          createdAt: now,
          revoked: false,
          metadata
        };

        // Store by token value for quick lookup
        const result = await storage.set(`token:${tokenValue}`, tokenRecord, { namespace });
        if (!result.success) {
          return { success: false, error: result.error || new Error('Failed to create token') };
        }

        // Also store by ID
        await storage.set(`token:id:${tokenId}`, tokenRecord, { namespace });

        // Index by userId
        const userTokensKey = `token:user:${userId}`;
        const userTokensResult = await storage.get(userTokensKey, { namespace });
        const userTokens = userTokensResult.success && userTokensResult.data 
          ? userTokensResult.data 
          : [];
        userTokens.push(tokenId);
        await storage.set(userTokensKey, userTokens, { namespace });

        return { success: true, data: tokenRecord };
      } catch (error) {
        logger.error('Create token error:', error);
        return { success: false, error };
      }
    }

    /**
     * Get token by ID
     * @param {string} tokenId - Token ID
     * @returns {Promise<{success: boolean, data?: Object, error?: Error}>}
     */
    async function getToken(tokenId) {
      try {
        if (!tokenId) {
          return { success: false, error: new Error('Token ID is required') };
        }

        const result = await storage.get(`token:id:${tokenId}`, { namespace });
        if (!result.success) {
          return { success: false, error: result.error || new Error(`Token "${tokenId}" not found`) };
        }

        return { success: true, data: result.data };
      } catch (error) {
        logger.error('Get token error:', error);
        return { success: false, error };
      }
    }

    /**
     * Get token by token value
     * @param {string} token - Token value
     * @returns {Promise<{success: boolean, data?: Object, error?: Error}>}
     */
    async function getTokenByValue(token) {
      try {
        if (!token) {
          return { success: false, error: new Error('Token is required') };
        }

        const result = await storage.get(`token:${token}`, { namespace });
        if (!result.success) {
          return { success: false, error: result.error || new Error('Token not found') };
        }

        return { success: true, data: result.data };
      } catch (error) {
        logger.error('Get token by value error:', error);
        return { success: false, error };
      }
    }

    /**
     * Validate token
     * @param {string} token - Token value
     * @returns {Promise<{success: boolean, valid?: boolean, data?: Object, error?: Error}>}
     */
    async function validateToken(token) {
      try {
        const tokenResult = await getTokenByValue(token);
        if (!tokenResult.success) {
          return { success: true, valid: false };
        }

        const tokenRecord = tokenResult.data;

        // Check if revoked
        if (tokenRecord.revoked) {
          return { success: true, valid: false, data: tokenRecord };
        }

        // Check if expired
        if (tokenRecord.expiresAt && tokenRecord.expiresAt < Date.now()) {
          return { success: true, valid: false, data: tokenRecord };
        }

        return { success: true, valid: true, data: tokenRecord };
      } catch (error) {
        logger.error('Validate token error:', error);
        return { success: false, error };
      }
    }

    /**
     * Revoke token
     * @param {string} tokenId - Token ID
     * @returns {Promise<{success: boolean, error?: Error}>}
     */
    async function revokeToken(tokenId) {
      try {
        const tokenResult = await getToken(tokenId);
        if (!tokenResult.success) {
          return tokenResult;
        }

        const token = tokenResult.data;
        token.revoked = true;

        // Update both indexes
        await storage.set(`token:${token.token}`, token, { namespace });
        await storage.set(`token:id:${tokenId}`, token, { namespace });

        return { success: true };
      } catch (error) {
        logger.error('Revoke token error:', error);
        return { success: false, error };
      }
    }

    return new Facet('authStorage', { attach: true, source: import.meta.url })
      .add({
        createUser,
        getUser,
        getUserById,
        updateUser,
        deleteUser,
        createSession,
        getSession,
        updateSession,
        deleteSession,
        getSessionsByUserId,
        createToken,
        getToken,
        getTokenByValue,
        validateToken,
        revokeToken
      });
  }
});

