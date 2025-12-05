/**
 * Auth Subsystem
 * 
 * Message-driven authentication and authorization subsystem for Mycelia Kernel.
 * Provides user authentication, session management, and token-based authentication.
 */

import { BaseSubsystem } from '../../base-subsystem/base.subsystem.mycelia.js';
import { createCanonicalDefaultHooks } from '../../defaults/default-hooks.mycelia.js';
import { useDBStorage } from '../../../hooks/db/use-db-storage.mycelia.js';
import { useAuthStorage } from '../../../hooks/auth/use-auth-storage.mycelia.js';
import { usePrisma } from '../../../hooks/prisma/use-prisma.mycelia.js';
import { usePrismaAuthStorage } from '../../../hooks/auth/use-prisma-auth-storage.mycelia.js';
import { usePasswordManager } from '../../../hooks/auth/use-password-manager.mycelia.js';
import { useTokenManager } from '../../../hooks/auth/use-token-manager.mycelia.js';
import { useSessionManager } from '../../../hooks/auth/use-session-manager.mycelia.js';
import { useAuthStrategies } from '../../../hooks/auth/use-auth-strategies.mycelia.js';
import { AUTH_ROUTES } from './auth.routes.def.mycelia.js';
import { createLogger } from '../../../utils/logger.utils.mycelia.js';
import { getDebugFlag } from '../../../utils/debug-flag.utils.mycelia.js';
import { Message } from '../../message/message.mycelia.js';

/**
 * Auth Subsystem
 * 
 * Provides message-driven authentication operations including:
 * - User registration (auth://register)
 * - User login (auth://login)
 * - User logout (auth://logout)
 * - Token refresh (auth://refresh)
 * - Token/session validation (auth://validate)
 * - Authentication status (auth://status)
 * 
 * @example
 * const authSubsystem = new AuthSubsystem('auth', {
 *   ms: messageSystem,
 *   config: {
 *     storage: {
 *       backend: 'sqlite',
 *       dbPath: './data/auth.db'
 *     },
 *     password: {
 *       minLength: 8,
 *       bcryptRounds: 10
 *     },
 *     tokens: {
 *       accessTokenExpiry: 3600000,
 *       refreshTokenExpiry: 604800000
 *     }
 *   }
 * });
 * 
 * await authSubsystem.build();
 */
export class AuthSubsystem extends BaseSubsystem {
  /**
   * @param {string} name - Subsystem name (typically 'auth')
   * @param {Object} options - Configuration options
   * @param {Object} options.ms - MessageSystem instance (required)
   * @param {Object} [options.config={}] - Configuration object
   * @param {Object} [options.config.storage={}] - Storage backend configuration
   * @param {Object} [options.config.password={}] - Password configuration
   * @param {Object} [options.config.tokens={}] - Token configuration
   * @param {Object} [options.config.sessions={}] - Session configuration
   * @param {Object} [options.config.accessControl] - AccessControlSubsystem reference (optional, will try to get from kernel)
   * @param {boolean} [options.debug=false] - Enable debug logging
   */
  constructor(name = 'auth', options = {}) {
    super(name, options);
    
    const debug = getDebugFlag({}, options);
    this.logger = createLogger(debug, `AuthSubsystem ${name}`);
    
    // Use canonical defaults (includes router, messages, etc.)
    this.defaultHooks = createCanonicalDefaultHooks();
    
    // Check if Prisma storage is configured
    const storageConfig = options.config?.storage || {};
    const usePrismaStorage = storageConfig.backend === 'prisma' || storageConfig.prisma?.client;
    
    // Install hooks (order matters - storage first, then others that depend on it)
    if (usePrismaStorage) {
      // Use Prisma directly for auth storage
      this.use(usePrisma, {
        config: {
          prisma: {
            client: storageConfig.prisma?.client,
          }
        }
      });
      this.use(usePrismaAuthStorage);
    } else {
      // Use generic storage backend
      this.use(useDBStorage);
      this.use(useAuthStorage);
    }
    
    this.use(usePasswordManager);
    this.use(useTokenManager);
    this.use(useSessionManager);
    this.use(useAuthStrategies);
    
    // Store AccessControlSubsystem reference (will be set during initialization)
    this.#accessControl = options.config?.accessControl || null;
    
    // Register routes that handle authentication operation messages from other subsystems
    this.onInit(() => {
      // Register all routes from AUTH_ROUTES definitions
      for (const routeDef of Object.values(AUTH_ROUTES)) {
        // eslint-disable-next-line no-unused-vars
        this.registerRoute(routeDef.path, async (message, params, routeOptions) => {
          // Run validation if provided
          const data = routeDef.extractData(message.body);
          
          if (routeDef.validate) {
            const validationError = routeDef.validate(data);
            if (validationError) {
              return validationError;
            }
          }
          
          // Call the appropriate handler method
          const handler = this[routeDef.handlerMethod].bind(this);
          const result = await handler(message);
          
          return result;
        });
      }

      if (this.logger.debug) {
        this.logger.log('Registered authentication message handlers');
      }
    });
  }

  #accessControl = null;

  /**
   * Emit an auth event
   * @private
   * @param {string} eventPath - Event path (e.g., 'event://auth/login/success')
   * @param {Object} data - Event data
   */
  #emitAuthEvent(eventPath, data) {
    const listeners = this.find('listeners');
    if (listeners && listeners.hasListeners()) {
      const eventMessage = new Message(eventPath, {
        timestamp: Date.now(),
        subsystem: 'auth',
        ...data
      });
      listeners.emit(eventPath, eventMessage);
    }
  }

  /**
   * Get AccessControlSubsystem reference
   * Tries to get from kernel if not already set
   * @returns {AccessControlSubsystem|null}
   */
  getAccessControl() {
    if (this.#accessControl) {
      return this.#accessControl;
    }

    // Try to get from kernel via message system
    // Note: MessageSystem has private #kernel, so we try to access it via registry
    // or wait for it to be passed via config
    try {
      if (this.messageSystem) {
        // Try to get kernel subsystem from registry
        const registry = this.messageSystem.find('messageSystemRegistry');
        if (registry) {
          const kernelWrapper = registry.get('kernel');
          if (kernelWrapper && kernelWrapper._subsystem) {
            const kernel = kernelWrapper._subsystem;
            if (typeof kernel.getAccessControl === 'function') {
              this.#accessControl = kernel.getAccessControl();
              return this.#accessControl;
            }
          }
        }
      }
    } catch (error) {
      // Kernel not available or no access control
      if (this.logger.debug) {
        this.logger.warn('AccessControlSubsystem not available:', error);
      }
    }

    return null;
  }

  /**
   * Handle auth://register message
   * @private
   */
  async handleRegister(message) {
    try {
      const { username, password, email, metadata = {} } = message.body || {};
      
      if (!username || !password || !email) {
        return { success: false, error: new Error('Username, password, and email are required') };
      }

      const passwordManager = this.find('passwordManager');
      const authStorage = this.find('authStorage');
      if (!passwordManager || !authStorage) {
        return { success: false, error: new Error('Required facets not found') };
      }

      // Validate password strength
      const passwordValidation = passwordManager.validatePasswordStrength(password);
      if (!passwordValidation.valid) {
        return { success: false, error: new Error(`Password validation failed: ${passwordValidation.errors.join(', ')}`) };
      }

      // Hash password
      const passwordHash = await passwordManager.hashPassword(password);

      // Create user
      const userResult = await authStorage.createUser({
        username,
        email,
        passwordHash,
        metadata
      });

      if (!userResult.success) {
        return userResult;
      }

      const user = userResult.data;

      // Create Friend principal for the user
      // Use username as endpoint (stable & unique identifier)
      // Store email in metadata (may change)
      const accessControl = this.getAccessControl();
      let friend = null;
      if (accessControl) {
        try {
          friend = accessControl.createFriend(username, {
            endpoint: username, // Use username as stable endpoint
            metadata: {
              userId: user.id,
              email: user.email, // Email in metadata (may change)
              ...metadata
            }
          });

          // Link Friend to user
          user.friend = friend;
          user.pkr = friend.identity.pkr;

          // Update user with Friend reference
          await authStorage.updateUser(user.id, {
            friendId: friend.identity.pkr.uuid,
            pkr: friend.identity.pkr
          });
        } catch (error) {
          // If Friend creation fails, continue without it
          // User can still be created, but won't have identity
          if (this.logger.debug) {
            this.logger.warn('Failed to create Friend principal for user:', error);
          }
        }
      }

      // Emit registration event
      this.#emitAuthEvent('event://auth/register', {
        userId: user.id,
        username: user.username,
        email: user.email,
        friendId: friend ? friend.identity.pkr.uuid : null
      });

      // Return user data (without password hash)
      const { passwordHash: _, ...userData } = user;
      return {
        success: true,
        data: {
          user: userData,
          friend: friend ? {
            name: friend.name,
            pkr: friend.identity.pkr,
            identity: friend.identity
          } : null
        }
      };
    } catch (error) {
      this.logger.error('Register error:', error);
      // Emit registration failure event
      this.#emitAuthEvent('event://auth/register/failure', {
        error: error.message,
        username: message.body?.username
      });
      return { success: false, error };
    }
  }

  /**
   * Handle auth://login message
   * @private
   */
  async handleLogin(message) {
    try {
      const { strategy = 'password', credentials = {}, options = {} } = message.body || {};
      
      const authStrategies = this.find('authStrategies');
      const sessionManager = this.find('sessionManager');
      const tokenManager = this.find('tokenManager');
      const authStorage = this.find('authStorage');

      if (!authStrategies || !sessionManager || !tokenManager || !authStorage) {
        return { success: false, error: new Error('Required facets not found') };
      }

      // Authenticate using strategy
      const authResult = await authStrategies.authenticate(strategy, credentials);
      if (!authResult.success || !authResult.user) {
        // Emit login failure event
        this.#emitAuthEvent('event://auth/login/failure', {
          strategy,
          error: authResult.error?.message || 'Authentication failed',
          username: credentials.username || credentials.apiKey ? 'provided' : 'unknown'
        });
        return { success: false, error: authResult.error || new Error('Authentication failed') };
      }

      const user = authResult.user;

      // Create session
      const sessionDuration = options.sessionDuration || options.rememberMe ? 86400000 : 3600000;
      const sessionResult = await sessionManager.createSession(user.id, {
        duration: sessionDuration,
        metadata: options.metadata || {}
      });

      if (!sessionResult.success) {
        // Emit login failure event (session creation failed)
        this.#emitAuthEvent('event://auth/login/failure', {
          strategy,
          userId: user.id,
          username: user.username,
          error: 'Session creation failed'
        });
        return sessionResult;
      }

      const session = sessionResult.data;
      const wasFirstSession = sessionResult.wasFirstSession || false;

      // Generate tokens
      const accessTokenResult = await tokenManager.generateAccessToken(user.id, {
        payload: { username: user.username }
      });
      const refreshTokenResult = await tokenManager.generateRefreshToken(user.id);

      if (!accessTokenResult.success || !refreshTokenResult.success) {
        // Clean up session if token generation fails
        await sessionManager.destroySession(session.id);
        return { success: false, error: new Error('Failed to generate tokens') };
      }

      // Get user's Friend if available and manage connection state
      let friend = null;
      const accessControl = this.getAccessControl();
      if (accessControl && (user.friendId || user.pkr)) {
        // Friend should already exist from registration
        // Try to get the Friend instance
        try {
          // Note: This assumes we can retrieve the Friend by its ID or PKR
          // The exact method depends on AccessControlSubsystem API
          // For now, we'll use the stored pkr if available
          if (user.pkr) {
            friend = { pkr: user.pkr };
            
            // If this is the first active session, connect the friend
            if (wasFirstSession && typeof accessControl.getFriend === 'function') {
              const friendInstance = accessControl.getFriend(user.pkr);
              if (friendInstance && typeof friendInstance.connect === 'function') {
                friendInstance.connect();
                if (this.logger.debug) {
                  this.logger.log(`Friend ${user.username} connected (first active session)`);
                }
              }
            }
          }
        } catch (error) {
          if (this.logger.debug) {
            this.logger.warn('Could not manage Friend connection state:', error);
          }
        }
      }

      // Emit login success event
      this.#emitAuthEvent('event://auth/login/success', {
        userId: user.id,
        username: user.username,
        strategy,
        sessionId: session.id,
        wasFirstSession
      });

      // Return authentication result
      const { passwordHash: _, ...userData } = user;
      return {
        success: true,
        data: {
          user: userData,
          friend,
          session: {
            id: session.id,
            expiresAt: session.expiresAt
          },
          tokens: {
            accessToken: accessTokenResult.token,
            refreshToken: refreshTokenResult.token,
            expiresAt: accessTokenResult.expiresAt
          }
        }
      };
    } catch (error) {
      this.logger.error('Login error:', error);
      // Emit login failure event
      this.#emitAuthEvent('event://auth/login/failure', {
        strategy: message.body?.strategy || 'unknown',
        error: error.message
      });
      return { success: false, error };
    }
  }

  /**
   * Handle auth://logout message
   * @private
   */
  async handleLogout(message) {
    try {
      const { sessionId, options = {} } = message.body || {};
      
      const sessionManager = this.find('sessionManager');
      const authStorage = this.find('authStorage');

      if (!sessionManager || !authStorage) {
        return { success: false, error: new Error('Required facets not found') };
      }

      let tokensRevoked = 0;

      if (sessionId) {
        // Destroy specific session
        const destroyResult = await sessionManager.destroySession(sessionId);
        if (!destroyResult.success) {
          return destroyResult;
        }

        const userId = destroyResult.userId;
        const wasLastSession = destroyResult.wasLastSession || false;

        // If this was the last active session, disconnect the friend
        if (wasLastSession) {
          const accessControl = this.getAccessControl();
          if (accessControl) {
            try {
              // Get user to retrieve Friend info
              const userResult = await authStorage.getUserById(userId);
              if (userResult.success && userResult.data.pkr) {
                if (typeof accessControl.getFriend === 'function') {
                  const friendInstance = accessControl.getFriend(userResult.data.pkr);
                  if (friendInstance && typeof friendInstance.disconnect === 'function') {
                    friendInstance.disconnect();
                    if (this.logger.debug) {
                      this.logger.log(`Friend ${userResult.data.username} disconnected (last active session destroyed)`);
                    }
                  }
                }
              }
            } catch (error) {
              if (this.logger.debug) {
                this.logger.warn('Could not manage Friend disconnection state:', error);
              }
            }
          }
        }

        // Revoke all tokens if requested
        if (options.revokeAllTokens && userId) {
          // Get all user sessions to revoke their tokens
          const sessionsResult = await authStorage.getSessionsByUserId(userId);
          if (sessionsResult.success) {
            // Revoke tokens for all sessions (simplified - in production, track tokens per session)
            tokensRevoked = sessionsResult.data.length;
          }
        }

        // Emit logout event
        this.#emitAuthEvent('event://auth/logout', {
          userId,
          sessionId,
          wasLastSession,
          tokensRevoked: options.revokeAllTokens ? tokensRevoked : 0
        });
      } else {
        return { success: false, error: new Error('Session ID is required') };
      }

      return {
        success: true,
        data: {
          sessionDestroyed: true,
          tokensRevoked
        }
      };
    } catch (error) {
      this.logger.error('Logout error:', error);
      return { success: false, error };
    }
  }

  /**
   * Handle auth://refresh message
   * @private
   */
  async handleRefresh(message) {
    try {
      const { refreshToken } = message.body || {};
      
      if (!refreshToken) {
        return { success: false, error: new Error('Refresh token is required') };
      }

      const tokenManager = this.find('tokenManager');
      if (!tokenManager) {
        return { success: false, error: new Error('Token manager facet not found') };
      }

      // Refresh token
      const result = await tokenManager.refreshToken(refreshToken);
      return result;
    } catch (error) {
      this.logger.error('Refresh error:', error);
      return { success: false, error };
    }
  }

  /**
   * Handle auth://validate message
   * @private
   */
  async handleValidate(message) {
    try {
      const { token, sessionId, type = 'token' } = message.body || {};
      
      if (type === 'session') {
        const sessionManager = this.find('sessionManager');
        if (!sessionManager) {
          return { success: false, error: new Error('Session manager facet not found') };
        }

        if (!sessionId) {
          return { success: false, error: new Error('Session ID is required for session validation') };
        }

        const sessionResult = await sessionManager.getSession(sessionId);
        if (!sessionResult.success) {
          return { success: true, valid: false };
        }

        const session = sessionResult.data;
        return {
          success: true,
          data: {
            valid: true,
            userId: session.userId,
            expiresAt: session.expiresAt
          }
        };
      } else {
        const tokenManager = this.find('tokenManager');
        if (!tokenManager) {
          return { success: false, error: new Error('Token manager facet not found') };
        }

        if (!token) {
          return { success: false, error: new Error('Token is required for token validation') };
        }

        const validationResult = await tokenManager.validateToken(token);
        if (!validationResult.success) {
          return validationResult;
        }

        return {
          success: true,
          data: {
            valid: validationResult.valid,
            userId: validationResult.data?.userId || null,
            expiresAt: validationResult.data?.expiresAt || null
          }
        };
      }
    } catch (error) {
      this.logger.error('Validate error:', error);
      return { success: false, error };
    }
  }

  /**
   * Handle auth://status message
   * @private
   */
  async handleStatus(message) {
    try {
      const { userId, sessionId, includeSessions = false, includeTokens = false } = message.body || {};
      
      const authStorage = this.find('authStorage');
      const sessionManager = this.find('sessionManager');

      if (!authStorage || !sessionManager) {
        return { success: false, error: new Error('Required facets not found') };
      }

      let targetUserId = userId;

      // If sessionId provided, get userId from session
      if (sessionId && !targetUserId) {
        const sessionResult = await sessionManager.getSession(sessionId);
        if (sessionResult.success && sessionResult.data) {
          targetUserId = sessionResult.data.userId;
        } else {
          return { success: false, error: new Error('Invalid session ID') };
        }
      }

      if (!targetUserId) {
        return { success: false, error: new Error('User ID or session ID is required') };
      }

      // Get user
      const userResult = await authStorage.getUserById(targetUserId);
      if (!userResult.success) {
        return userResult;
      }

      const result = {
        success: true,
        data: {
          authenticated: true,
          userId: targetUserId
        }
      };

      if (includeSessions) {
        const sessionsResult = await authStorage.getSessionsByUserId(targetUserId);
        if (sessionsResult.success) {
          result.data.sessions = sessionsResult.data.map(s => ({
            id: s.id,
            createdAt: s.createdAt,
            expiresAt: s.expiresAt,
            lastActivityAt: s.lastActivityAt
          }));
        }
      }

      if (includeTokens) {
        // Note: Token listing would require additional storage methods
        // For now, we'll skip this
        result.data.tokens = [];
      }

      return result;
    } catch (error) {
      this.logger.error('Status error:', error);
      return { success: false, error };
    }
  }
}

