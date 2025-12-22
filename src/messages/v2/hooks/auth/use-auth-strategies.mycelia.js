/**
 * useAuthStrategies Hook
 * 
 * Provides pluggable authentication strategies (password, OAuth, API key, etc.).
 */

import { Facet } from 'mycelia-kernel-plugin/core';
import { createHook } from '../create-hook.mycelia.js';
import { getDebugFlag } from '../../utils/debug-flag.utils.mycelia.js';
import { createLogger } from '../../utils/logger.utils.mycelia.js';
import { findFacet } from '../../utils/find-facet.utils.mycelia.js';

export const useAuthStrategies = createHook({
  kind: 'authStrategies',
  version: '1.0.0',
  overwrite: false,
  required: ['authStorage', 'passwordManager', 'tokenManager'],
  attach: true,
  source: import.meta.url,
  contract: null,
  fn: (ctx, api, subsystem) => {
    const { name } = api;
    const config = ctx.config?.strategies || {};
    const debug = getDebugFlag(config, ctx);
    const logger = createLogger(debug, `useAuthStrategies ${name}`);

    // Find required facets
    const authStorageResult = findFacet(api.__facets, 'authStorage');
    const passwordManagerResult = findFacet(api.__facets, 'passwordManager');
    const tokenManagerResult = findFacet(api.__facets, 'tokenManager');

    if (!authStorageResult || !passwordManagerResult || !tokenManagerResult) {
      throw new Error(`useAuthStrategies ${name}: required facets not found. Ensure useAuthStorage, usePasswordManager, and useTokenManager are added.`);
    }

    const authStorage = authStorageResult.facet;
    const passwordManager = passwordManagerResult.facet;
    const tokenManager = tokenManagerResult.facet;

    const strategies = new Map();

    /**
     * Password authentication strategy
     * @param {Object} credentials - Credentials
     * @param {string} credentials.username - Username
     * @param {string} credentials.password - Password
     * @returns {Promise<{success: boolean, user?: Object, error?: Error}>}
     */
    async function passwordStrategy(credentials) {
      try {
        const { username, password } = credentials;

        if (!username || !password) {
          return { success: false, error: new Error('Username and password are required') };
        }

        // Get user
        const userResult = await authStorage.getUser(username);
        if (!userResult.success || !userResult.data) {
          return { success: false, error: new Error('Invalid username or password') };
        }

        const user = userResult.data;

        // Verify password
        const isValid = await passwordManager.verifyPassword(password, user.passwordHash);
        if (!isValid) {
          return { success: false, error: new Error('Invalid username or password') };
        }

        // Update last login
        await authStorage.updateUser(user.id, { lastLoginAt: Date.now() });

        return { success: true, user };
      } catch (error) {
        logger.error('Password strategy error:', error);
        return { success: false, error };
      }
    }

    /**
     * API key authentication strategy
     * @param {Object} credentials - Credentials
     * @param {string} credentials.apiKey - API key
     * @returns {Promise<{success: boolean, user?: Object, error?: Error}>}
     */
    async function apiKeyStrategy(credentials) {
      try {
        const { apiKey } = credentials;

        if (!apiKey) {
          return { success: false, error: new Error('API key is required') };
        }

        // Validate token
        const validationResult = await tokenManager.validateToken(apiKey, 'apiKey');
        if (!validationResult.success || !validationResult.valid) {
          return { success: false, error: new Error('Invalid API key') };
        }

        const userId = validationResult.data.userId;

        // Get user
        const userResult = await authStorage.getUserById(userId);
        if (!userResult.success || !userResult.data) {
          return { success: false, error: new Error('User not found') };
        }

        const user = userResult.data;

        return { success: true, user };
      } catch (error) {
        logger.error('API key strategy error:', error);
        return { success: false, error };
      }
    }

    /**
     * Token authentication strategy
     * @param {Object} credentials - Credentials
     * @param {string} credentials.token - Token
     * @returns {Promise<{success: boolean, user?: Object, error?: Error}>}
     */
    async function tokenStrategy(credentials) {
      try {
        const { token } = credentials;

        if (!token) {
          return { success: false, error: new Error('Token is required') };
        }

        // Validate token
        const validationResult = await tokenManager.validateToken(token);
        if (!validationResult.success || !validationResult.valid) {
          return { success: false, error: new Error('Invalid token') };
        }

        const userId = validationResult.data.userId;

        // Get user
        const userResult = await authStorage.getUserById(userId);
        if (!userResult.success || !userResult.data) {
          return { success: false, error: new Error('User not found') };
        }

        const user = userResult.data;

        return { success: true, user };
      } catch (error) {
        logger.error('Token strategy error:', error);
        return { success: false, error };
      }
    }

    // Register built-in strategies
    strategies.set('password', passwordStrategy);
    strategies.set('apiKey', apiKeyStrategy);
    strategies.set('token', tokenStrategy);

    /**
     * Register a custom strategy
     * @param {string} name - Strategy name
     * @param {Function} strategy - Strategy function
     */
    function registerStrategy(name, strategy) {
      if (!name || typeof name !== 'string') {
        throw new Error('Strategy name must be a non-empty string');
      }

      if (typeof strategy !== 'function') {
        throw new Error('Strategy must be a function');
      }

      strategies.set(name, strategy);

      if (debug) {
        logger.log(`Registered authentication strategy: ${name}`);
      }
    }

    /**
     * Authenticate using a strategy
     * @param {string} strategyName - Strategy name
     * @param {Object} credentials - Credentials
     * @returns {Promise<{success: boolean, user?: Object, error?: Error}>}
     */
    async function authenticate(strategyName, credentials) {
      try {
        const strategy = strategies.get(strategyName);
        if (!strategy) {
          return { success: false, error: new Error(`Unknown authentication strategy: ${strategyName}`) };
        }

        return await strategy(credentials);
      } catch (error) {
        logger.error(`Authentication error (strategy: ${strategyName}):`, error);
        return { success: false, error };
      }
    }

    /**
     * Get a registered strategy
     * @param {string} name - Strategy name
     * @returns {Function|null} Strategy function or null
     */
    function getStrategy(name) {
      return strategies.get(name) || null;
    }

    return new Facet('authStrategies', { attach: true, source: import.meta.url })
      .add({
        registerStrategy,
        authenticate,
        getStrategy
      });
  }
});

