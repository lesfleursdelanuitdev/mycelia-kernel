# AuthSubsystem

## Overview

The **AuthSubsystem** is a message-driven authentication and authorization subsystem for Mycelia Kernel. It provides user authentication, session management, token-based authentication, and integration with the existing security infrastructure (Friend principals).

**Key Features:**
- **User Registration**: Register new users with password validation and Friend principal creation
- **User Authentication**: Multiple authentication strategies (password, API key, token)
- **Session Management**: Create, refresh, and destroy user sessions
- **Token Management**: JWT access tokens, refresh tokens, and API keys
- **Event Emission**: Emits events for audit logging (`event://auth/login/success`, etc.)
- **Friend Integration**: Automatically creates Friend principals for users
- **Connection State Management**: Manages Friend connection state based on active sessions

## Class Definition

```javascript
import { AuthSubsystem } from './auth-subsystem/auth.subsystem.mycelia.js';

const authSubsystem = new AuthSubsystem('auth', {
  ms: messageSystem,
  config: {
    storage: {
      backend: 'auto',  // or 'sqlite', 'indexeddb', 'memory'
      dbPath: './data/auth.db'  // For SQLite
    },
    password: {
      minLength: 8,
      bcryptRounds: 10
    },
    tokens: {
      accessTokenExpiry: 3600000,  // 1 hour
      refreshTokenExpiry: 604800000,  // 7 days
      signingKey: 'your-secret-key'
    },
    sessions: {
      defaultDuration: 3600000,  // 1 hour
      maxDuration: 86400000  // 24 hours
    }
  }
});

await authSubsystem.build();
```

## Constructor

### Signature

```javascript
new AuthSubsystem(name = 'auth', options = {})
```

### Parameters

#### `name` (string, default: `'auth'`)

The subsystem name. Typically `'auth'` for consistency.

**Validation:**
- Must be a non-empty string
- Throws `Error` if invalid

#### `options` (object, required)

Configuration options for the subsystem.

**Required:**
- `ms` (MessageSystem): MessageSystem instance (required)

**Optional:**
- `config.storage.backend` (string, default: `'auto'`): Storage backend - `'sqlite'`, `'indexeddb'`, `'memory'`, or `'auto'`
- `config.storage.dbPath` (string, default: `'./data/storage.db'`): Database file path (for SQLite)
- `config.password.minLength` (number, default: `8`): Minimum password length
- `config.password.bcryptRounds` (number, default: `10`): Bcrypt rounds for password hashing
- `config.password.requireUppercase` (boolean, default: `true`): Require uppercase letters
- `config.password.requireLowercase` (boolean, default: `true`): Require lowercase letters
- `config.password.requireNumbers` (boolean, default: `true`): Require numbers
- `config.password.requireSpecialChars` (boolean, default: `true`): Require special characters
- `config.tokens.accessTokenExpiry` (number, default: `3600000`): Access token expiry in milliseconds (1 hour)
- `config.tokens.refreshTokenExpiry` (number, default: `604800000`): Refresh token expiry in milliseconds (7 days)
- `config.tokens.signingKey` (string, default: `'default-secret-key-change-in-production'`): JWT signing key
- `config.tokens.algorithm` (string, default: `'HS256'`): JWT algorithm
- `config.sessions.defaultDuration` (number, default: `3600000`): Default session duration in milliseconds (1 hour)
- `config.sessions.maxDuration` (number, default: `86400000`): Maximum session duration in milliseconds (24 hours)
- `config.sessions.cleanupInterval` (number, default: `3600000`): Session cleanup interval in milliseconds (1 hour)
- `config.accessControl` (AccessControlSubsystem, optional): AccessControlSubsystem reference (will try to get from kernel if not provided)
- `debug` (boolean, default: `false`): Enable debug logging

**Example:**
```javascript
const authSubsystem = new AuthSubsystem('auth', {
  ms: messageSystem,
  config: {
    storage: {
      backend: 'sqlite',
      dbPath: './data/auth.db'
    },
    password: {
      minLength: 12,
      bcryptRounds: 12,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSpecialChars: true
    },
    tokens: {
      accessTokenExpiry: 1800000,  // 30 minutes
      refreshTokenExpiry: 2592000000,  // 30 days
      signingKey: process.env.JWT_SECRET
    },
    sessions: {
      defaultDuration: 7200000,  // 2 hours
      maxDuration: 604800000  // 7 days
    }
  },
  debug: true
});
```

## Installed Hooks

The AuthSubsystem automatically installs the following hooks:

1. **`useDBStorage`** - Database storage backend
2. **`useAuthStorage`** - User, session, and token storage
3. **`usePasswordManager`** - Password hashing and verification
4. **`useTokenManager`** - JWT and custom token generation
5. **`useSessionManager`** - Session lifecycle management
6. **`useAuthStrategies`** - Pluggable authentication strategies

## Message Handlers

### `auth://register` - User Registration

Register a new user account with password validation and Friend principal creation.

**Message Format:**
```javascript
{
  path: 'auth://register',
  body: {
    username: 'alice',
    password: 'SecurePass123!',
    email: 'alice@example.com',
    metadata: {
      firstName: 'Alice',
      lastName: 'Smith'
    }
  }
}
```

**Response:**
```javascript
{
  success: true,
  data: {
    user: {
      id: 'user_123',
      username: 'alice',
      email: 'alice@example.com',
      pkr: PKR,  // Friend's Public Key Record
      createdAt: 1234567890,
      updatedAt: 1234567890
    },
    friend: {
      name: 'alice',
      pkr: PKR,
      identity: Identity  // Friend identity wrapper
    }
  }
}
```

**Error Response:**
```javascript
{
  success: false,
  error: Error('Password validation failed: Password must be at least 8 characters long')
}
```

**Events Emitted:**
- `event://auth/register` - Registration successful
- `event://auth/register/failure` - Registration failed

### `auth://login` - User Login

Authenticate a user and create a session with tokens.

**Message Format:**
```javascript
{
  path: 'auth://login',
  body: {
    strategy: 'password',  // or 'apiKey', 'token'
    credentials: {
      username: 'alice',
      password: 'SecurePass123!'
    },
    options: {
      rememberMe: false,
      sessionDuration: 3600000,  // 1 hour
      metadata: {}
    }
  }
}
```

**Response:**
```javascript
{
  success: true,
  data: {
    user: {
      id: 'user_123',
      username: 'alice',
      email: 'alice@example.com',
      pkr: PKR
    },
    friend: {
      pkr: PKR
    },
    session: {
      id: 'session_456',
      expiresAt: 1234567890
    },
    tokens: {
      accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      refreshToken: 'refresh_token_789',
      expiresAt: 1234567890
    }
  }
}
```

**Error Response:**
```javascript
{
  success: false,
  error: Error('Authentication failed')
}
```

**Events Emitted:**
- `event://auth/login/success` - Login successful
- `event://auth/login/failure` - Login failed

**Note:** If this is the user's first active session, `friend.connect()` is automatically called.

### `auth://logout` - User Logout

Destroy a session and optionally revoke all tokens.

**Message Format:**
```javascript
{
  path: 'auth://logout',
  body: {
    sessionId: 'session_456',
    options: {
      revokeAllTokens: false
    }
  }
}
```

**Response:**
```javascript
{
  success: true,
  data: {
    sessionDestroyed: true,
    tokensRevoked: 0
  }
}
```

**Events Emitted:**
- `event://auth/logout` - Logout successful

**Note:** If this was the user's last active session, `friend.disconnect()` is automatically called.

### `auth://refresh` - Refresh Token

Generate a new access token from a refresh token.

**Message Format:**
```javascript
{
  path: 'auth://refresh',
  body: {
    refreshToken: 'refresh_token_789'
  }
}
```

**Response:**
```javascript
{
  success: true,
  data: {
    accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    refreshToken: 'new_refresh_token_abc',
    expiresAt: 1234567890
  }
}
```

**Error Response:**
```javascript
{
  success: false,
  error: Error('Invalid or expired refresh token')
}
```

### `auth://validate` - Validate Token or Session

Validate an access token or session.

**Message Format:**
```javascript
{
  path: 'auth://validate',
  body: {
    token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',  // For token validation
    sessionId: 'session_456',  // For session validation
    type: 'token'  // or 'session'
  }
}
```

**Response:**
```javascript
{
  success: true,
  valid: true,
  userId: 'user_123'
}
```

**Error Response:**
```javascript
{
  success: false,
  valid: false,
  error: Error('Token expired')
}
```

### `auth://status` - Authentication Status

Get authentication status for a user or session.

**Message Format:**
```javascript
{
  path: 'auth://status',
  body: {
    userId: 'user_123',  // or sessionId: 'session_456'
    includeSessions: true,
    includeTokens: false
  }
}
```

**Response:**
```javascript
{
  success: true,
  data: {
    authenticated: true,
    userId: 'user_123',
    username: 'alice',
    email: 'alice@example.com',
    pkr: PKR,
    sessions: [
      {
        id: 'session_456',
        createdAt: 1234567890,
        expiresAt: 1234567890
      }
    ]
  }
}
```

## Facets

The AuthSubsystem provides the following facets (accessible via `subsystem.find('facetName')`):

### `authStorage` Facet

User, session, and token storage operations.

**Methods:**
- `createUser(userData)` - Create a new user
- `getUser(username)` - Get user by username
- `getUserById(userId)` - Get user by ID
- `updateUser(userId, updates)` - Update user
- `deleteUser(userId)` - Delete user
- `createSession(sessionData)` - Create a session
- `getSession(sessionId)` - Get session by ID
- `updateSession(sessionId, updates)` - Update session
- `deleteSession(sessionId)` - Delete session
- `getSessionsByUserId(userId)` - Get all sessions for a user
- `createToken(tokenData)` - Create a token
- `getToken(tokenId)` - Get token by ID
- `validateToken(tokenValue)` - Validate a token
- `revokeToken(tokenId)` - Revoke a token

### `passwordManager` Facet

Password hashing and verification.

**Methods:**
- `hashPassword(password)` - Hash a password
- `verifyPassword(password, hash)` - Verify a password
- `generatePassword(length)` - Generate a secure random password
- `validatePasswordStrength(password)` - Validate password strength

**Example:**
```javascript
const passwordManager = authSubsystem.find('passwordManager');

// Hash password
const hash = await passwordManager.hashPassword('SecurePass123!');

// Verify password
const isValid = await passwordManager.verifyPassword('SecurePass123!', hash);

// Validate strength
const validation = passwordManager.validatePasswordStrength('SecurePass123!');
// { valid: true, errors: [] }
```

### `tokenManager` Facet

JWT and custom token generation and validation.

**Methods:**
- `generateAccessToken(userId, options)` - Generate access token
- `generateRefreshToken(userId, options)` - Generate refresh token
- `generateApiKey(userId, options)` - Generate API key
- `validateToken(token)` - Validate and decode token
- `refreshToken(refreshTokenValue)` - Generate new tokens from refresh token
- `revokeToken(tokenValue)` - Revoke a token

**Example:**
```javascript
const tokenManager = authSubsystem.find('tokenManager');

// Generate access token
const { success, token, expiresAt } = await tokenManager.generateAccessToken('user_123', {
  expiresIn: 1800000,  // 30 minutes
  payload: { username: 'alice' }
});

// Validate token
const { success, userId, type } = await tokenManager.validateToken(token);
```

### `sessionManager` Facet

Session lifecycle management.

**Methods:**
- `createSession(userId, options)` - Create a session (returns `wasFirstSession` flag)
- `getSession(sessionId)` - Get session by ID
- `refreshSession(sessionId, duration)` - Refresh session expiration
- `destroySession(sessionId)` - Destroy a session (returns `wasLastSession` flag and `userId`)
- `destroyUserSessions(userId)` - Destroy all user sessions
- `cleanupExpiredSessions()` - Remove expired sessions
- `getActiveSessionCount(userId)` - Get count of active (non-expired) sessions

**Example:**
```javascript
const sessionManager = authSubsystem.find('sessionManager');

// Create session
const { success, data: session, wasFirstSession } = await sessionManager.createSession('user_123', {
  duration: 3600000,  // 1 hour
  metadata: { ip: '192.168.1.1' }
});

// Get active session count
const { success, count } = await sessionManager.getActiveSessionCount('user_123');
```

### `authStrategies` Facet

Pluggable authentication strategies.

**Methods:**
- `registerStrategy(name, strategy)` - Register a custom strategy
- `authenticate(strategyName, credentials)` - Authenticate using a strategy
- `getStrategy(name)` - Get a registered strategy

**Built-in Strategies:**
- `password` - Username/password authentication
- `apiKey` - API key authentication
- `token` - Token-based authentication

**Example:**
```javascript
const authStrategies = authSubsystem.find('authStrategies');

// Register custom strategy
authStrategies.registerStrategy('oauth', {
  name: 'oauth',
  authenticate: async (credentials, authSubsystem) => {
    // Custom OAuth authentication logic
    return { success: true, user: userData };
  }
});

// Authenticate using strategy
const { success, user } = await authStrategies.authenticate('oauth', {
  provider: 'google',
  code: 'oauth_code'
});
```

## Event Emission

The AuthSubsystem emits events for authentication operations, allowing other subsystems (like AuditSubsystem) to listen and log these events.

### Event Paths

- `event://auth/register` - User registration successful
- `event://auth/register/failure` - User registration failed
- `event://auth/login/success` - User login successful
- `event://auth/login/failure` - User login failed
- `event://auth/logout` - User logout

### Event Data

All events include:
- `timestamp` - Event timestamp
- `subsystem` - Always `'auth'`
- Additional event-specific data (userId, username, sessionId, etc.)

### Listening to Auth Events

```javascript
// In AuditSubsystem
authSubsystem.listeners.on('event://auth/login/success', async (message) => {
  const data = message.getBody();
  await auditStorage.log({
    type: 'login',
    userId: data.userId,
    timestamp: data.timestamp,
    success: true
  });
});
```

## Friend Integration

### Friend Principal Creation

When a user registers, a Friend principal is automatically created:

```javascript
// User registration creates Friend principal
const friend = accessControl.createFriend(username, {
  endpoint: username,  // Use username as stable endpoint
  metadata: {
    userId: user.id,
    email: user.email,  // Email in metadata (may change)
    ...user.metadata
  }
});
```

### Connection State Management

The AuthSubsystem manages Friend connection state based on active session counts:

- **First Active Session**: `friend.connect()` is called when the first active session is created
- **Last Active Session Destroyed**: `friend.disconnect()` is called when the last active session is destroyed

```javascript
// Login creates first session
const sessionResult = await sessionManager.createSession(userId);
if (sessionResult.wasFirstSession) {
  friend.connect(); // Friend becomes connected
}

// Logout destroys last session
const destroyResult = await sessionManager.destroySession(sessionId);
if (destroyResult.wasLastSession) {
  friend.disconnect(); // Friend becomes disconnected
}
```

## Usage Examples

### Basic User Registration and Login

```javascript
import { AuthSubsystem } from './auth-subsystem/auth.subsystem.mycelia.js';
import { MessageSystem } from './message-system/message-system.v2.mycelia.js';
import { Message } from './message/message.mycelia.js';

// Create message system
const messageSystem = new MessageSystem('app');
await messageSystem.bootstrap();

// Create auth subsystem
const authSubsystem = new AuthSubsystem('auth', {
  ms: messageSystem,
  config: {
    storage: {
      backend: 'sqlite',
      dbPath: './data/auth.db'
    }
  }
});
await authSubsystem.build();

// Register user
const registerMessage = new Message('auth://register', {
  username: 'alice',
  password: 'SecurePass123!',
  email: 'alice@example.com'
});

const registerResult = await messageSystem.send(registerMessage);
console.log(registerResult.data.user); // User data

// Login user
const loginMessage = new Message('auth://login', {
  strategy: 'password',
  credentials: {
    username: 'alice',
    password: 'SecurePass123!'
  }
});

const loginResult = await messageSystem.send(loginMessage);
console.log(loginResult.data.tokens.accessToken); // JWT token
```

### Using Facets Directly

```javascript
// Get password manager
const passwordManager = authSubsystem.find('passwordManager');

// Hash password
const hash = await passwordManager.hashPassword('SecurePass123!');

// Verify password
const isValid = await passwordManager.verifyPassword('SecurePass123!', hash);

// Get token manager
const tokenManager = authSubsystem.find('tokenManager');

// Generate API key
const { success, apiKey } = await tokenManager.generateApiKey('user_123', {
  expiresAt: null  // Non-expiring
});

// Validate token
const { success, userId } = await tokenManager.validateToken(apiKey);
```

### Custom Authentication Strategy

```javascript
// Register custom OAuth strategy
const authStrategies = authSubsystem.find('authStrategies');

authStrategies.registerStrategy('oauth', {
  name: 'oauth',
  authenticate: async (credentials, authSubsystem) => {
    const { provider, code } = credentials;
    
    // Exchange OAuth code for user info
    const userInfo = await exchangeOAuthCode(provider, code);
    
    // Get or create user
    const authStorage = authSubsystem.find('authStorage');
    let user = await authStorage.getUser(userInfo.email);
    
    if (!user.success) {
      // Create user if doesn't exist
      const createResult = await authStorage.createUser({
        username: userInfo.email,
        email: userInfo.email,
        metadata: { oauthProvider: provider }
      });
      user = createResult;
    }
    
    return { success: true, user: user.data };
  }
});

// Use OAuth strategy
const loginMessage = new Message('auth://login', {
  strategy: 'oauth',
  credentials: {
    provider: 'google',
    code: 'oauth_code_123'
  }
});
```

## Error Handling

All message handlers return a consistent response format:

```javascript
{
  success: boolean,
  data?: any,
  error?: Error
}
```

**Example Error Handling:**
```javascript
const result = await messageSystem.send(loginMessage);

if (!result.success) {
  console.error('Login failed:', result.error.message);
  // Handle error
} else {
  console.log('Login successful:', result.data.user);
  // Use tokens and session
}
```

## Best Practices

1. **Password Security**
   - Use strong password requirements (minLength: 12, require special chars)
   - Use high bcrypt rounds (12+) in production
   - Never log passwords or password hashes

2. **Token Security**
   - Use strong signing keys (environment variables)
   - Set appropriate token expiry times
   - Revoke tokens on logout if needed

3. **Session Management**
   - Set reasonable session durations
   - Clean up expired sessions regularly
   - Track active sessions for connection state

4. **Event Listening**
   - Listen to auth events for audit logging
   - Don't block event handlers with slow operations
   - Handle event handler errors gracefully

5. **Friend Integration**
   - Username is used as Friend endpoint (stable identifier)
   - Email stored in metadata (may change)
   - Connection state reflects active session count

## Related Documentation

- [AUTH-SYSTEM-DESIGN.md](../../../../../AUTH-SYSTEM-DESIGN.md) - Complete design document
- [DBSubsystem](./db-subsystem/DB-SUBSYSTEM.md) - Database subsystem used for storage
- [AccessControlSubsystem](../security/ACCESS-CONTROL-SUBSYSTEM.md) - Friend principal creation
- [Storage Backends](../storage/STORAGE-BACKENDS.md) - Storage backend usage examples



