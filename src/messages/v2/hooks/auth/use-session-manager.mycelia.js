/**
 * useSessionManager Hook
 * 
 * Provides session lifecycle management functionality.
 */

import { Facet } from 'mycelia-kernel-plugin/core';
import { createHook } from '../create-hook.mycelia.js';
import { getDebugFlag } from '../../utils/debug-flag.utils.mycelia.js';
import { createLogger } from '../../utils/logger.utils.mycelia.js';
import { findFacet } from '../../utils/find-facet.utils.mycelia.js';

export const useSessionManager = createHook({
  kind: 'sessionManager',
  version: '1.0.0',
  overwrite: false,
  required: ['authStorage'],
  attach: true,
  source: import.meta.url,
  contract: null,
  fn: (ctx, api, subsystem) => {
    const { name } = api;
    const config = ctx.config?.sessions || {};
    const debug = getDebugFlag(config, ctx);
    const logger = createLogger(debug, `useSessionManager ${name}`);

    // Find authStorage facet
    const authStorageResult = findFacet(api.__facets, 'authStorage');
    if (!authStorageResult) {
      throw new Error(`useSessionManager ${name}: authStorage facet not found. useAuthStorage must be added before useSessionManager.`);
    }

    const authStorage = authStorageResult.facet;

    const defaultDuration = config.defaultDuration || 3600000; // 1 hour
    const maxDuration = config.maxDuration || 86400000; // 24 hours
    const cleanupInterval = config.cleanupInterval || 3600000; // 1 hour

    let cleanupTimer = null;
    
    // Track active session count per user
    // Map<userId, number> - number of active (non-expired) sessions
    const activeSessionCounts = new Map();

    /**
     * Start periodic cleanup of expired sessions
     */
    function startCleanup() {
      if (cleanupTimer) {
        return; // Already started
      }

      cleanupTimer = setInterval(async () => {
        try {
          await cleanupExpiredSessions();
        } catch (error) {
          logger.error('Session cleanup error:', error);
        }
      }, cleanupInterval);

      if (debug) {
        logger.log('Session cleanup started');
      }
    }

    /**
     * Stop periodic cleanup
     */
    function stopCleanup() {
      if (cleanupTimer) {
        clearInterval(cleanupTimer);
        cleanupTimer = null;
        if (debug) {
          logger.log('Session cleanup stopped');
        }
      }
    }

    /**
     * Get active session count for a user
     * @param {string} userId - User ID
     * @returns {Promise<{success: boolean, count: number, error?: Error}>}
     */
    async function getActiveSessionCount(userId) {
      try {
        const sessionsResult = await authStorage.getSessionsByUserId(userId);
        if (!sessionsResult.success) {
          return { success: false, count: 0, error: sessionsResult.error };
        }

        const now = Date.now();
        const activeCount = (sessionsResult.data || []).filter(
          session => !session.expiresAt || session.expiresAt > now
        ).length;

        // Update cache
        activeSessionCounts.set(userId, activeCount);

        return { success: true, count: activeCount };
      } catch (error) {
        logger.error('Get active session count error:', error);
        return { success: false, count: 0, error };
      }
    }

    /**
     * Create a new session
     * @param {string} userId - User ID
     * @param {Object} [options={}] - Session options
     * @param {number} [options.duration] - Session duration in milliseconds
     * @param {Object} [options.metadata={}] - Additional metadata
     * @returns {Promise<{success: boolean, data?: Object, error?: Error}>}
     */
    async function createSession(userId, options = {}) {
      try {
        const duration = Math.min(options.duration || defaultDuration, maxDuration);
        const expiresAt = Date.now() + duration;

        const sessionResult = await authStorage.createSession({
          userId,
          expiresAt,
          metadata: options.metadata || {}
        });

        if (!sessionResult.success) {
          return sessionResult;
        }

        // Update active session count
        const countResult = await getActiveSessionCount(userId);
        const wasFirstSession = countResult.count === 1;

        // Start cleanup if not already started
        if (!cleanupTimer) {
          startCleanup();
        }

        return {
          ...sessionResult,
          wasFirstSession // Indicates if this was the first active session
        };
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
        const sessionResult = await authStorage.getSession(sessionId);
        if (!sessionResult.success) {
          return sessionResult;
        }

        const session = sessionResult.data;

        // Check if expired
        if (session.expiresAt && session.expiresAt < Date.now()) {
          // Auto-delete expired session
          await authStorage.deleteSession(sessionId);
          return { success: false, error: new Error('Session expired') };
        }

        return sessionResult;
      } catch (error) {
        logger.error('Get session error:', error);
        return { success: false, error };
      }
    }

    /**
     * Refresh session expiration
     * @param {string} sessionId - Session ID
     * @param {number} [duration] - New duration in milliseconds
     * @returns {Promise<{success: boolean, data?: Object, error?: Error}>}
     */
    async function refreshSession(sessionId, duration) {
      try {
        const sessionResult = await getSession(sessionId);
        if (!sessionResult.success) {
          return sessionResult;
        }

        const session = sessionResult.data;
        const newDuration = Math.min(duration || defaultDuration, maxDuration);
        const newExpiresAt = Date.now() + newDuration;

        return await authStorage.updateSession(sessionId, {
          expiresAt: newExpiresAt,
          lastActivityAt: Date.now()
        });
      } catch (error) {
        logger.error('Refresh session error:', error);
        return { success: false, error };
      }
    }

    /**
     * Destroy a session
     * @param {string} sessionId - Session ID
     * @returns {Promise<{success: boolean, wasLastSession?: boolean, userId?: string, error?: Error}>}
     */
    async function destroySession(sessionId) {
      try {
        // Get session first to get userId
        const sessionResult = await authStorage.getSession(sessionId);
        if (!sessionResult.success) {
          return sessionResult;
        }

        const userId = sessionResult.data.userId;

        // Delete the session
        const deleteResult = await authStorage.deleteSession(sessionId);
        if (!deleteResult.success) {
          return deleteResult;
        }

        // Update active session count
        const countResult = await getActiveSessionCount(userId);
        const wasLastSession = countResult.count === 0;

        return {
          ...deleteResult,
          wasLastSession, // Indicates if this was the last active session
          userId
        };
      } catch (error) {
        logger.error('Destroy session error:', error);
        return { success: false, error };
      }
    }

    /**
     * Destroy all sessions for a user
     * @param {string} userId - User ID
     * @returns {Promise<{success: boolean, count?: number, error?: Error}>}
     */
    async function destroyUserSessions(userId) {
      try {
        const sessionsResult = await authStorage.getSessionsByUserId(userId);
        if (!sessionsResult.success) {
          return sessionsResult;
        }

        const sessions = sessionsResult.data || [];
        let count = 0;

        for (const session of sessions) {
          const deleteResult = await authStorage.deleteSession(session.id);
          if (deleteResult.success) {
            count++;
          }
        }

        return { success: true, count };
      } catch (error) {
        logger.error('Destroy user sessions error:', error);
        return { success: false, error };
      }
    }

    /**
     * Cleanup expired sessions
     * @returns {Promise<{success: boolean, count?: number, error?: Error}>}
     */
    async function cleanupExpiredSessions() {
      try {
        // This is a simplified cleanup - in production, you might want to
        // query all sessions and filter expired ones
        // For now, we rely on getSession to auto-delete expired sessions
        
        if (debug) {
          logger.log('Session cleanup completed');
        }

        return { success: true, count: 0 };
      } catch (error) {
        logger.error('Cleanup expired sessions error:', error);
        return { success: false, error };
      }
    }

    // Start cleanup on initialization
    subsystem.onInit(() => {
      startCleanup();
    });

    // Stop cleanup on disposal
    subsystem.onDispose(() => {
      stopCleanup();
    });

    return new Facet('sessionManager', { attach: true, source: import.meta.url })
      .add({
        createSession,
        getSession,
        refreshSession,
        destroySession,
        destroyUserSessions,
        cleanupExpiredSessions,
        getActiveSessionCount
      });
  }
});

