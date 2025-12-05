/**
 * usePrismaAuthStorage Hook
 * 
 * Provides Prisma-based storage for users, sessions, and tokens.
 * Uses Prisma directly to store auth data in database tables.
 */

import { Facet } from '../../models/facet-manager/facet.mycelia.js';
import { createHook } from '../create-hook.mycelia.js';
import { getDebugFlag } from '../../utils/debug-flag.utils.mycelia.js';
import { createLogger } from '../../utils/logger.utils.mycelia.js';
import crypto from 'crypto';

export const usePrismaAuthStorage = createHook({
  kind: 'authStorage',
  version: '1.0.0',
  overwrite: false,
  required: ['prisma', 'storage'],
  attach: true,
  source: import.meta.url,
  contract: null,
  fn: (ctx, api, subsystem) => {
    const { name } = api;
    const config = ctx.config?.storage || {};
    const debug = getDebugFlag(config, ctx);
    const logger = createLogger(debug, `usePrismaAuthStorage ${name}`);

    // Get Prisma client from prisma facet
    const prismaFacet = subsystem.find('prisma');
    if (!prismaFacet || !prismaFacet.prisma) {
      throw new Error(`usePrismaAuthStorage ${name}: prisma facet not found. Ensure usePrisma hook is added before usePrismaAuthStorage.`);
    }

    const prisma = prismaFacet.prisma;

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
        const existingUser = await prisma.user.findFirst({
          where: {
            OR: [
              { username },
              { email }
            ]
          }
        });

        if (existingUser) {
          return { success: false, error: new Error(`User with username "${username}" or email "${email}" already exists`) };
        }

        // Create user in Prisma
        const user = await prisma.user.create({
          data: {
            username,
            email,
            passwordHash,
            name: metadata.name || username,
            role: metadata.role || 'student',
            metadata: JSON.stringify(metadata),
          }
        });

        // Convert Prisma user to auth storage format
        const userResult = {
          id: user.id,
          username: user.username,
          email: user.email,
          passwordHash: user.passwordHash,
          metadata: metadata,
          createdAt: user.createdAt.getTime(),
          updatedAt: user.updatedAt.getTime(),
          lastLoginAt: user.lastLoginAt ? user.lastLoginAt.getTime() : null
        };

        return { success: true, data: userResult };
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

        const user = await prisma.user.findUnique({
          where: { username }
        });

        if (!user) {
          return { success: false, error: new Error(`User "${username}" not found`) };
        }

        // Parse metadata
        let metadata = {};
        try {
          metadata = user.metadata ? JSON.parse(user.metadata) : {};
        } catch (e) {
          // If metadata is not valid JSON, use empty object
          metadata = {};
        }

        const userResult = {
          id: user.id,
          username: user.username,
          email: user.email,
          passwordHash: user.passwordHash,
          metadata: metadata,
          createdAt: user.createdAt.getTime(),
          updatedAt: user.updatedAt.getTime(),
          lastLoginAt: user.lastLoginAt ? user.lastLoginAt.getTime() : null
        };

        return { success: true, data: userResult };
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

        const user = await prisma.user.findUnique({
          where: { id: userId }
        });

        if (!user) {
          return { success: false, error: new Error(`User with ID "${userId}" not found`) };
        }

        // Parse metadata
        let metadata = {};
        try {
          metadata = user.metadata ? JSON.parse(user.metadata) : {};
        } catch (e) {
          metadata = {};
        }

        const userResult = {
          id: user.id,
          username: user.username,
          email: user.email,
          passwordHash: user.passwordHash,
          metadata: metadata,
          createdAt: user.createdAt.getTime(),
          updatedAt: user.updatedAt.getTime(),
          lastLoginAt: user.lastLoginAt ? user.lastLoginAt.getTime() : null
        };

        return { success: true, data: userResult };
      } catch (error) {
        logger.error('Get user by ID error:', error);
        return { success: false, error };
      }
    }

    /**
     * Update user
     * @param {string} userId - User ID
     * @param {Object} updates - Updates to apply
     * @returns {Promise<{success: boolean, data?: Object, error?: Error}>}
     */
    async function updateUser(userId, updates) {
      try {
        if (!userId) {
          return { success: false, error: new Error('User ID is required') };
        }

        // Get existing user to merge metadata
        const existingUser = await prisma.user.findUnique({
          where: { id: userId }
        });

        if (!existingUser) {
          return { success: false, error: new Error(`User with ID "${userId}" not found`) };
        }

        // Parse existing metadata
        let metadata = {};
        try {
          metadata = existingUser.metadata ? JSON.parse(existingUser.metadata) : {};
        } catch (e) {
          metadata = {};
        }

        // Merge updates
        const updateData = {};
        if (updates.username !== undefined) updateData.username = updates.username;
        if (updates.email !== undefined) updateData.email = updates.email;
        if (updates.passwordHash !== undefined) updateData.passwordHash = updates.passwordHash;
        if (updates.name !== undefined) updateData.name = updates.name;
        if (updates.role !== undefined) updateData.role = updates.role;
        if (updates.metadata !== undefined) {
          metadata = { ...metadata, ...updates.metadata };
          updateData.metadata = JSON.stringify(metadata);
        }
        if (updates.lastLoginAt !== undefined) {
          updateData.lastLoginAt = updates.lastLoginAt ? new Date(updates.lastLoginAt) : null;
        }

        const user = await prisma.user.update({
          where: { id: userId },
          data: updateData
        });

        // Convert back to auth storage format
        let userMetadata = {};
        try {
          userMetadata = user.metadata ? JSON.parse(user.metadata) : {};
        } catch (e) {
          userMetadata = {};
        }

        const userResult = {
          id: user.id,
          username: user.username,
          email: user.email,
          passwordHash: user.passwordHash,
          metadata: userMetadata,
          createdAt: user.createdAt.getTime(),
          updatedAt: user.updatedAt.getTime(),
          lastLoginAt: user.lastLoginAt ? user.lastLoginAt.getTime() : null
        };

        return { success: true, data: userResult };
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
        if (!userId) {
          return { success: false, error: new Error('User ID is required') };
        }

        await prisma.user.delete({
          where: { id: userId }
        });

        return { success: true };
      } catch (error) {
        logger.error('Delete user error:', error);
        return { success: false, error };
      }
    }

    // For sessions and tokens, we'll use the storage backend (PrismaStorageBackend)
    // since they don't need to be in specific tables
    const storageFacet = subsystem.find('storage');
    if (!storageFacet) {
      throw new Error(`usePrismaAuthStorage ${name}: storage facet not found. Ensure storage hook is added.`);
    }

    const storage = storageFacet;
    const namespace = config.namespace || 'auth';

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

        const sessionId = `${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
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
        if (!sessionId) {
          return { success: false, error: new Error('Session ID is required') };
        }

        await storage.delete(`session:${sessionId}`, { namespace });

        return { success: true };
      } catch (error) {
        logger.error('Delete session error:', error);
        return { success: false, error };
      }
    }

    /**
     * Get sessions by user ID
     * @param {string} userId - User ID
     * @returns {Promise<{success: boolean, data?: Object[], error?: Error}>}
     */
    async function getSessionsByUserId(userId) {
      try {
        if (!userId) {
          return { success: false, error: new Error('User ID is required') };
        }

        // Query storage for sessions with this userId
        const result = await storage.query({
          key: { $like: 'session:%' },
          value: { userId }
        }, { namespace });

        if (!result.success) {
          return { success: false, error: result.error || new Error('Failed to query sessions') };
        }

        const sessions = result.results.map(r => r.value).filter(s => s && s.userId === userId);

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
     * @param {string} tokenData.token - Token value
     * @param {string} tokenData.type - Token type
     * @param {number} [tokenData.expiresAt] - Expiration timestamp
     * @param {Object} [tokenData.metadata={}] - Additional metadata
     * @returns {Promise<{success: boolean, data?: Object, error?: Error}>}
     */
    async function createToken(tokenData) {
      try {
        const { userId, token, type, expiresAt, metadata = {} } = tokenData;

        if (!userId || !token || !type) {
          return { success: false, error: new Error('User ID, token, and type are required') };
        }

        const tokenId = `${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
        const now = Date.now();

        const tokenRecord = {
          id: tokenId,
          userId,
          token,
          type,
          expiresAt: expiresAt || null,
          createdAt: now,
          revoked: false,
          metadata
        };

        await storage.set(`token:${token}`, tokenRecord, { namespace });
        await storage.set(`token:id:${tokenId}`, tokenRecord, { namespace });

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

