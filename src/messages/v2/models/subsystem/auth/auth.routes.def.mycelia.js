/**
 * Auth Route Definitions
 * 
 * Defines the route paths used by AuthSubsystem to handle authentication operation messages.
 * These routes are registered internally by AuthSubsystem and handle incoming messages
 * from other subsystems that want to perform authentication operations.
 */

export const AUTH_ROUTES = {
  'login': {
    path: 'auth://login',
    description: 'Authenticate a user and create a session',
    metadata: {
      type: 'command',
      purpose: 'authentication'
    },
    extractData: (body) => ({
      strategy: body.strategy || 'password',
      credentials: body.credentials || {},
      options: body.options || {}
    }),
    handlerMethod: 'handleLogin',
    buildResponse: (data) => ({ strategy: data.strategy })
  },
  'logout': {
    path: 'auth://logout',
    description: 'Destroy a session and invalidate tokens',
    metadata: {
      type: 'command',
      purpose: 'authentication'
    },
    extractData: (body) => ({
      sessionId: body.sessionId,
      options: body.options || {}
    }),
    handlerMethod: 'handleLogout',
    buildResponse: (data) => ({ sessionId: data.sessionId })
  },
  'register': {
    path: 'auth://register',
    description: 'Register a new user account',
    metadata: {
      type: 'command',
      purpose: 'authentication'
    },
    extractData: (body) => ({
      username: body.username,
      password: body.password,
      email: body.email,
      metadata: body.metadata || {}
    }),
    handlerMethod: 'handleRegister',
    buildResponse: (data) => ({ username: data.username }),
    validate: (data) => {
      if (!data.username) {
        return { success: false, error: 'Username is required' };
      }
      if (!data.password) {
        return { success: false, error: 'Password is required' };
      }
      if (!data.email) {
        return { success: false, error: 'Email is required' };
      }
      return null;
    }
  },
  'refresh': {
    path: 'auth://refresh',
    description: 'Generate a new access token from a refresh token',
    metadata: {
      type: 'command',
      purpose: 'authentication'
    },
    extractData: (body) => ({
      refreshToken: body.refreshToken
    }),
    handlerMethod: 'handleRefresh',
    buildResponse: (data) => ({ refreshToken: data.refreshToken }),
    validate: (data) => {
      if (!data.refreshToken) {
        return { success: false, error: 'Refresh token is required' };
      }
      return null;
    }
  },
  'validate': {
    path: 'auth://validate',
    description: 'Validate a token or session',
    metadata: {
      type: 'query',
      purpose: 'authentication'
    },
    extractData: (body) => ({
      token: body.token,
      sessionId: body.sessionId,
      type: body.type || 'token'
    }),
    handlerMethod: 'handleValidate',
    buildResponse: (data) => ({ type: data.type })
  },
  'status': {
    path: 'auth://status',
    description: 'Get authentication status for a user or session',
    metadata: {
      type: 'query',
      purpose: 'authentication'
    },
    extractData: (body) => ({
      userId: body.userId,
      sessionId: body.sessionId,
      includeSessions: body.includeSessions || false,
      includeTokens: body.includeTokens || false
    }),
    handlerMethod: 'handleStatus',
    buildResponse: (data) => ({ userId: data.userId, sessionId: data.sessionId })
  }
};


