# Auth System Design

## Overview

The **Auth System** is a comprehensive authentication and authorization framework for the Mycelia Kernel. It extends the existing security infrastructure (PKRs, Principals, AccessControlSubsystem) to provide user authentication, session management, token-based authentication, and integration with external identity providers.

**Key Goals:**
- **User Authentication**: Support multiple authentication methods (password, OAuth, API keys, etc.)
- **Session Management**: Manage user sessions with expiration and refresh
- **Token-Based Auth**: JWT and custom token support for stateless authentication
- **Integration**: Seamlessly integrate with existing PKR/Principal system
- **Friend Principal Mapping**: Users are mapped to Friend principals for consistent identity management
- **Message-Driven**: All operations accessible via messages
- **Extensible**: Support for custom authentication strategies

## User-to-Friend Principal Mapping

**Design Decision:** Users are mapped to Friend principals (`PRINCIPAL_KINDS.FRIEND`) rather than creating a new principal kind.

### Rationale

1. **Reuse Existing Infrastructure**: Friend principals already provide:
   - Identity wrapper creation via `createFriendIdentity()`
   - PKR generation and management
   - Integration with `sendProtected` messaging
   - Trusted peer model

2. **Semantic Alignment**: Friends represent trusted peers in the Mycelia network, which aligns with authenticated users:
   - Users are trusted entities
   - Users can communicate via `sendProtected`
   - Users have their own identity and keys

3. **Consistency**: Using Friend principals maintains consistency with the existing security model:
   - No need for new principal kind
   - Reuses existing `AccessControlSubsystem.createFriend()` method
   - Leverages existing Friend identity wrappers

4. **Simplified Implementation**: 
   - No new principal kind to implement
   - No new identity wrapper type needed
   - Reuses all existing Friend infrastructure

### Implementation

When a user registers:
1. User record is created in storage
2. `AccessControlSubsystem.createFriend()` is called with user's username/email
3. Friend principal is automatically created with:
   - Principal with `PRINCIPAL_KINDS.FRIEND`
   - PKR generation
   - Friend identity wrapper via `createFriendIdentity()`
4. Friend instance is linked to user record
5. User can immediately use `friend.identity.sendProtected()` for secure messaging

### Benefits

- **Automatic Identity Management**: Friend identity wrapper is created automatically
- **PKR Integration**: PKR is generated and managed by existing Principal system
- **Secure Messaging**: Users can immediately use `sendProtected` via Friend identity
- **Connection Tracking**: Friend's `connect()`/`disconnect()` can track login/logout state
- **Cross-System Communication**: Friend model supports future cross-system user communication

## Current Security Infrastructure

The Mycelia Kernel already has a robust security foundation:

### Existing Components
- **PKR (Public Key Record)**: Immutable identity references with expiration
- **Principal**: Internal entity representation (kernel, subsystems, friends, resources)
- **PrincipalRegistry**: Centralized principal management
- **AccessControlSubsystem**: Identity and access control management
- **ReaderWriterSet (RWS)**: Fine-grained permissions (read/write/grant)
- **sendProtected**: Secure messaging with caller authentication
- **Identity Wrappers**: Permission-checked function wrappers

### What's Missing
- **User Authentication**: No user login/logout mechanisms
- **Session Management**: No session tracking or expiration
- **Password Management**: No password hashing/verification
- **Token Generation**: No JWT or custom token support
- **OAuth Integration**: No external identity provider support
- **API Key Management**: No API key generation/validation

## Architecture Options

### Option A: AuthSubsystem (Recommended)

A dedicated `AuthSubsystem` that extends `BaseSubsystem` and provides authentication services.

**Structure:**
```
AuthSubsystem (BaseSubsystem)
├── useAuthStorage (stores users, sessions, tokens)
├── usePasswordManager (password hashing/verification)
├── useTokenManager (JWT/custom token generation/validation)
├── useSessionManager (session lifecycle management)
├── useAuthStrategies (pluggable auth strategies)
└── Message Handlers
    ├── auth://login
    ├── auth://logout
    ├── auth://register
    ├── auth://refresh
    ├── auth://validate
    └── auth://status
```

**Pros:**
- Clean separation of concerns
- Consistent with other subsystems (DBSubsystem, ServerSubsystem)
- Message-driven interface
- Easy to extend with new strategies
- Can integrate with AccessControlSubsystem

**Cons:**
- Additional subsystem layer
- Potential performance overhead

### Option B: Enhanced AccessControlSubsystem

Extend `AccessControlSubsystem` to include authentication capabilities.

**Pros:**
- No additional subsystem needed
- Direct integration with existing access control

**Cons:**
- Mixes concerns (access control vs. authentication)
- Less flexible for complex auth scenarios
- Doesn't follow subsystem pattern

### Option C: Auth Hook

Create hooks that can be used by any subsystem.

**Pros:**
- Flexible, can be used anywhere
- No subsystem overhead

**Cons:**
- Less centralized
- Harder to manage state
- Doesn't provide message-driven interface

## Recommended Architecture: Option A

### Core Components

#### 1. AuthSubsystem Class

```javascript
class AuthSubsystem extends BaseSubsystem {
  constructor(name = 'auth', options = {}) {
    super(name, options);
    
    // Install hooks
    this.use(useAuthStorage);
    this.use(usePasswordManager);
    this.use(useTokenManager);
    this.use(useSessionManager);
    this.use(useAuthStrategies);
    
    // Register message handlers
    this.onInit(() => {
      this.registerRoute('auth://login', this.handleLogin);
      this.registerRoute('auth://logout', this.handleLogout);
      this.registerRoute('auth://register', this.handleRegister);
      this.registerRoute('auth://refresh', this.handleRefresh);
      this.registerRoute('auth://validate', this.handleValidate);
      this.registerRoute('auth://status', this.handleStatus);
    });
  }
}
```

#### 2. useAuthStorage Hook

Provides storage for users, sessions, and tokens. Uses DBSubsystem or direct storage.

**Facet: `authStorage`**
- `createUser(userData)` - Create a new user
- `getUser(username)` - Get user by username
- `getUserById(userId)` - Get user by ID
- `updateUser(userId, updates)` - Update user data
- `deleteUser(userId)` - Delete user
- `createSession(sessionData)` - Create a session
- `getSession(sessionId)` - Get session by ID
- `updateSession(sessionId, updates)` - Update session
- `deleteSession(sessionId)` - Delete session
- `getSessionsByUserId(userId)` - Get all user sessions
- `createToken(tokenData)` - Create a token
- `getToken(tokenId)` - Get token by ID
- `validateToken(token)` - Validate token
- `revokeToken(tokenId)` - Revoke token

#### 3. usePasswordManager Hook

Handles password hashing and verification using bcrypt or similar.

**Facet: `passwordManager`**
- `hashPassword(password)` - Hash a password
- `verifyPassword(password, hash)` - Verify a password
- `generatePassword()` - Generate a secure random password
- `validatePasswordStrength(password)` - Validate password strength

#### 4. useTokenManager Hook

Generates and validates JWT tokens and custom tokens.

**Facet: `tokenManager`**
- `generateAccessToken(userId, options)` - Generate access token (short-lived)
- `generateRefreshToken(userId, options)` - Generate refresh token (long-lived)
- `generateApiKey(userId, options)` - Generate API key
- `validateToken(token)` - Validate and decode token
- `refreshToken(refreshToken)` - Generate new access token from refresh token
- `revokeToken(token)` - Revoke a token

#### 5. useSessionManager Hook

Manages user sessions with expiration and refresh. Tracks active session counts per user for connection state management.

**Facet: `sessionManager`**
- `createSession(userId, options)` - Create a new session (returns `wasFirstSession` flag)
- `getSession(sessionId)` - Get session by ID
- `refreshSession(sessionId)` - Refresh session expiration
- `destroySession(sessionId)` - Destroy a session (returns `wasLastSession` flag and `userId`)
- `destroyUserSessions(userId)` - Destroy all user sessions
- `cleanupExpiredSessions()` - Remove expired sessions
- `getActiveSessionCount(userId)` - Get count of active (non-expired) sessions for a user

#### 6. useAuthStrategies Hook

Pluggable authentication strategies (password, OAuth, API key, etc.).

**Facet: `authStrategies`**
- `registerStrategy(name, strategy)` - Register a custom strategy
- `authenticate(strategyName, credentials)` - Authenticate using a strategy
- `getStrategy(name)` - Get a registered strategy

**Built-in Strategies:**
- `password` - Username/password authentication
- `apiKey` - API key authentication
- `oauth` - OAuth 2.0 authentication (delegates to providers)
- `token` - Token-based authentication

## Message Handlers

### `auth://login` - User Login

Authenticate a user and create a session.

**Message Format:**
```javascript
{
  path: 'auth://login',
  body: {
    strategy: 'password',  // or 'apiKey', 'oauth', etc.
    credentials: {
      username: 'user@example.com',
      password: 'secret123'
    },
    options: {
      rememberMe: false,
      sessionDuration: 3600000  // 1 hour
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
      username: 'user@example.com',
      email: 'user@example.com'
    },
    friend: {
      name: 'user@example.com',
      pkr: PKR,  // Friend's PKR
      identity: Identity  // Friend identity wrapper
    },
    session: {
      id: 'session_456',
      expiresAt: 1234567890
    },
    tokens: {
      accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      refreshToken: 'refresh_token_789'
    }
  }
}
```

**Note:** The response includes the user's Friend instance with PKR and identity wrapper, which can be used for `sendProtected` messaging.

### `auth://logout` - User Logout

Destroy a session and invalidate tokens.

**Message Format:**
```javascript
{
  path: 'auth://logout',
  body: {
    sessionId: 'session_456',  // Optional, uses current session if not provided
    options: {
      revokeAllTokens: false  // Revoke all user tokens
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
    tokensRevoked: 2
  }
}
```

### `auth://register` - User Registration

Register a new user account.

**Message Format:**
```javascript
{
  path: 'auth://register',
  body: {
    username: 'user@example.com',
    password: 'secret123',
    email: 'user@example.com',
    metadata: {
      firstName: 'John',
      lastName: 'Doe'
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
      username: 'user@example.com',
      email: 'user@example.com'
    },
    friend: {
      name: 'user@example.com',
      pkr: PKR,  // Friend's PKR (created automatically)
      identity: Identity  // Friend identity wrapper
    }
  }
}
```

**Note:** Registration automatically creates a Friend principal via `AccessControlSubsystem.createFriend()`, which provides the PKR and identity wrapper.

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
    expiresAt: 1234567890
  }
}
```

### `auth://validate` - Validate Token/Session

Validate a token or session.

**Message Format:**
```javascript
{
  path: 'auth://validate',
  body: {
    token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',  // or sessionId
    type: 'token'  // or 'session'
  }
}
```

**Response:**
```javascript
{
  success: true,
  data: {
    valid: true,
    userId: 'user_123',
    expiresAt: 1234567890
  }
}
```

### `auth://status` - Get Auth Status

Get current authentication status for a user or session.

**Message Format:**
```javascript
{
  path: 'auth://status',
  body: {
    userId: 'user_123',  // or sessionId
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

### Example Event Emission

```javascript
// In handleLogin
this.#emitAuthEvent('event://auth/login/success', {
  userId: user.id,
  username: user.username,
  strategy,
  sessionId: session.id,
  wasFirstSession
});
```

### Listening to Auth Events

Other subsystems can listen to auth events:

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

## Friend Connection State Management

The Auth System manages Friend connection state based on active session counts:

### Connection Rules

1. **First Active Session**: When a user's first active session is created, `friend.connect()` is called
2. **Last Active Session Destroyed**: When a user's last active session is destroyed, `friend.disconnect()` is called

### Implementation

- `SessionManager.getActiveSessionCount(userId)` tracks active (non-expired) sessions
- `createSession()` returns `wasFirstSession` flag
- `destroySession()` returns `wasLastSession` flag and `userId`
- Login handler calls `friend.connect()` when `wasFirstSession === true`
- Logout handler calls `friend.disconnect()` when `wasLastSession === true`

### Example Flow

```javascript
// User logs in (first session)
const sessionResult = await sessionManager.createSession(userId);
if (sessionResult.wasFirstSession) {
  friend.connect(); // Friend becomes connected
}

// User logs out (last session)
const destroyResult = await sessionManager.destroySession(sessionId);
if (destroyResult.wasLastSession) {
  friend.disconnect(); // Friend becomes disconnected
}
```

## Integration with Existing Security System

### Friend Principal Integration

**Users are mapped to Friend principals.** When a user registers, create a Friend principal for them using `AccessControlSubsystem.createFriend()`:

```javascript
// In AuthSubsystem.handleRegister
const user = await authStorage.createUser(userData);

// Create Friend principal for the user
// Use username as endpoint (stable & unique identifier)
// Store email in metadata (may change)
const friend = accessControl.createFriend(user.username, {
  endpoint: user.username,  // Use username as endpoint (stable & unique)
  metadata: {
    userId: user.id,
    email: user.email,  // Email in metadata (may change)
    ...user.metadata
  }
});

// Friend principal automatically:
// 1. Creates a Principal with PRINCIPAL_KINDS.FRIEND
// 2. Generates PKR
// 3. Creates friend identity wrapper
// 4. Attaches identity to friend instance

// Link Friend to user
user.friend = friend;
user.pkr = friend.identity.pkr;
```

**Benefits of using Friend principals:**
- Reuses existing Friend infrastructure
- Automatic identity wrapper creation via `createFriendIdentity()`
- Consistent with trusted peer model
- Supports cross-system communication
- Already integrated with `sendProtected`

### Identity Wrapper Integration

After authentication, the user's Friend already has an identity wrapper:

```javascript
// In AuthSubsystem.handleLogin
const user = await authenticate(credentials);

// User's Friend already has identity wrapper (created during registration)
const identity = user.friend.identity;

// Attach to session for easy access
session.identity = identity;
session.friend = user.friend;
```

**Note:** The Friend's identity is created automatically by `AccessControlSubsystem.createFriend()` using `createFriendIdentity()`, which provides friend-specific identity methods.

### sendProtected Integration

Authenticated users can use `sendProtected` with their Friend identity:

```javascript
// User sends protected message using Friend identity
const result = await user.friend.identity.sendProtected(
  new Message('resource://read', { resourceId: '123' })
);

// Or via session
const result = await session.identity.sendProtected(
  new Message('resource://read', { resourceId: '123' })
);
```

**Note:** Friend identity wrappers automatically pass the Friend's PKR to `kernel.sendProtected()`, so no need to manually pass the PKR.

## Authentication Strategies

### Password Strategy

Standard username/password authentication.

**Flow:**
1. User provides username and password
2. Lookup user by username
3. Verify password hash
4. Create session and tokens
5. Return authentication result

### API Key Strategy

API key-based authentication for programmatic access.

**Flow:**
1. User provides API key
2. Lookup token by API key
3. Validate token (not expired, not revoked)
4. Get associated user
5. Create session (optional)
6. Return authentication result

### OAuth Strategy

OAuth 2.0 authentication with external providers.

**Flow:**
1. User initiates OAuth flow
2. Redirect to OAuth provider
3. Provider redirects back with code
4. Exchange code for access token
5. Get user info from provider
6. Create or link user account
7. Create session and tokens
8. Return authentication result

**Supported Providers:**
- Google
- GitHub
- Microsoft
- Custom OAuth providers

### Token Strategy

Token-based authentication (JWT or custom).

**Flow:**
1. User provides token
2. Validate token signature and expiration
3. Extract user ID from token
4. Get user by ID
5. Create session (optional)
6. Return authentication result

## Session Management

### Session Lifecycle

1. **Creation**: Session created on login
2. **Refresh**: Session expiration extended on activity
3. **Expiration**: Session expires after inactivity
4. **Destruction**: Session destroyed on logout or expiration

### Session Storage

Sessions stored in database with:
- `id`: Unique session ID
- `userId`: Associated user ID
- `createdAt`: Creation timestamp
- `expiresAt`: Expiration timestamp
- `lastActivityAt`: Last activity timestamp
- `metadata`: Additional session data (IP, user agent, etc.)

### Session Cleanup

Periodic cleanup of expired sessions:
- Background job runs every N minutes
- Removes sessions past expiration
- Optionally notifies users of session expiration

## Token Management

### Access Tokens

Short-lived tokens (15 minutes - 1 hour) for API access.

**JWT Structure:**
```json
{
  "sub": "user_123",
  "iat": 1234567890,
  "exp": 1234567890,
  "type": "access"
}
```

### Refresh Tokens

Long-lived tokens (7-30 days) for token refresh.

**Storage:**
- Stored in database (not in JWT)
- Can be revoked
- One-time use (optional)

### API Keys

Long-lived keys for programmatic access.

**Format:**
- `mycelia_<random_string>`
- Stored hashed in database
- Can be scoped to specific permissions

## User Management

### User Model

```javascript
{
  id: 'user_123',
  username: 'user@example.com',  // Used as Friend endpoint (stable & unique)
  email: 'user@example.com',      // Stored in Friend metadata (may change)
  passwordHash: 'bcrypt_hash',
  friend: Friend,  // Associated Friend principal
  pkr: PKR,  // PKR from Friend.identity.pkr
  metadata: {
    firstName: 'John',
    lastName: 'Doe'
  },
  createdAt: 1234567890,
  updatedAt: 1234567890,
  lastLoginAt: 1234567890
}
```

**Note:** Users are represented as Friend principals. The `friend` property contains the Friend instance created via `AccessControlSubsystem.createFriend()`, which includes the identity wrapper and PKR.

### Friend Endpoint Decision

**Decision:** Use `username` as the Friend endpoint (treat username as stable & unique identifier).

**Rationale:**
- Usernames are typically stable identifiers
- Email addresses may change over time
- Username provides better readability than `user:${user.id}`

**Implementation:**
- Friend endpoint = `username`
- Email stored in Friend metadata (may change without affecting endpoint)
- Alternative: `user:${user.id}` for fully stable ID (more opaque, not preferred)

### User Registration

1. Validate input (username, email, password)
2. Check if user exists
3. Hash password
4. Create user record in storage
5. Create Friend principal via `AccessControlSubsystem.createFriend()`
   - Automatically creates Principal with `PRINCIPAL_KINDS.FRIEND`
   - Generates PKR
   - Creates friend identity wrapper
6. Link Friend to user record
7. Return user data (without password and passwordHash)

### User Authentication

1. Lookup user by username/email
2. Verify password hash
3. Update lastLoginAt
4. Get user's Friend instance (created during registration)
5. Optionally call `friend.connect()` to mark as connected
6. Create session (link to Friend identity)
7. Generate tokens
8. Return authentication result (includes Friend and identity)

## Security Considerations

### Password Security

- **Hashing**: Use bcrypt with appropriate cost factor (10-12)
- **Salt**: Automatic salt generation
- **Strength Validation**: Enforce password requirements
- **No Plaintext Storage**: Never store passwords in plaintext

### Token Security

- **Signing**: Use strong signing algorithm (HS256, RS256)
- **Expiration**: Short-lived access tokens
- **Refresh**: Long-lived refresh tokens with rotation
- **Revocation**: Support token revocation
- **Storage**: Store refresh tokens securely

### Session Security

- **HTTPS Only**: Require HTTPS for session cookies
- **HttpOnly**: Set HttpOnly flag on cookies
- **Secure**: Set Secure flag on cookies
- **SameSite**: Use SameSite attribute
- **Expiration**: Automatic expiration
- **Rotation**: Session ID rotation on privilege changes

### API Key Security

- **Hashing**: Store API keys hashed
- **Scoping**: Limit API key permissions
- **Rotation**: Support API key rotation
- **Revocation**: Immediate revocation support

## Configuration

### AuthSubsystem Configuration

```javascript
const authSubsystem = new AuthSubsystem('auth', {
  ms: messageSystem,
  config: {
    // Storage configuration
    storage: {
      backend: 'sqlite',
      dbPath: './data/auth.db'
    },
    
    // Password configuration
    password: {
      minLength: 8,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSpecialChars: true,
      bcryptRounds: 10
    },
    
    // Token configuration
    tokens: {
      accessTokenExpiry: 3600000,  // 1 hour
      refreshTokenExpiry: 604800000,  // 7 days
      signingKey: 'secret_key',
      algorithm: 'HS256'
    },
    
    // Session configuration
    sessions: {
      defaultDuration: 3600000,  // 1 hour
      maxDuration: 86400000,  // 24 hours
      cleanupInterval: 3600000  // 1 hour
    },
    
    // OAuth configuration
    oauth: {
      providers: {
        google: {
          clientId: '...',
          clientSecret: '...',
          redirectUri: '...'
        },
        github: {
          clientId: '...',
          clientSecret: '...',
          redirectUri: '...'
        }
      }
    }
  }
});
```

## Integration Examples

### ServerSubsystem Integration

```javascript
// Register auth routes on ServerSubsystem
serverSubsystem.registerRoute('POST /api/auth/login', async (req, res) => {
  const message = new Message('auth://login', {
    strategy: 'password',
    credentials: req.body
  });
  
  const result = await messageSystem.send(message);
  
  if (result.success) {
    // Set session cookie
    res.cookie('sessionId', result.data.session.id, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict'
    });
    
    res.json({ user: result.data.user });
  } else {
    res.status(401).json({ error: result.error.message });
  }
});
```

### Middleware for Protected Routes

```javascript
// Auth middleware
async function requireAuth(req, res, next) {
  const sessionId = req.cookies.sessionId;
  
  if (!sessionId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  const message = new Message('auth://validate', {
    sessionId,
    type: 'session'
  });
  
  const result = await messageSystem.send(message);
  
  if (result.success && result.data.valid) {
    req.user = result.data.user;
    req.session = result.data.session;
    next();
  } else {
    res.status(401).json({ error: 'Invalid session' });
  }
}
```

## Future Enhancements

### Multi-Factor Authentication (MFA)

- TOTP (Time-based One-Time Password)
- SMS verification
- Email verification
- Hardware tokens

### Social Login

- Additional OAuth providers
- Social account linking
- Profile synchronization

### Advanced Features

- Passwordless authentication
- Biometric authentication
- Device fingerprinting
- Risk-based authentication
- Account recovery flows
- Email verification
- Account locking

## Testing Strategy

### Unit Tests

- Password hashing/verification
- Token generation/validation
- Session management
- Strategy implementations

### Integration Tests

- Full authentication flows
- Session lifecycle
- Token refresh
- OAuth flows

### Security Tests

- Password strength validation
- Token expiration
- Session hijacking prevention
- Brute force protection

## Migration Path

### Phase 1: Core Infrastructure

1. Create AuthSubsystem class
2. Implement useAuthStorage hook
3. Implement usePasswordManager hook
4. Implement basic message handlers

### Phase 2: Authentication

1. Implement password strategy
2. Implement token generation/validation
3. Implement session management
4. Add login/logout handlers

### Phase 3: Advanced Features

1. Add OAuth support
2. Add API key support
3. Add token refresh
4. Add user registration

### Phase 4: Integration

1. Integrate with ServerSubsystem
2. Add middleware support
3. Add event emissions
4. Add monitoring/logging

## Open Questions

1. ~~**User Principal Kind**: Should users have their own principal kind (`PRINCIPAL_KINDS.USER`) or use existing kinds?~~ **RESOLVED**: Users use Friend principals (`PRINCIPAL_KINDS.FRIEND`)
2. **Session Storage**: Should sessions be stored in DBSubsystem or separate storage?
3. **Token Format**: JWT only or support custom token formats?
4. **OAuth Flow**: Server-side only or support client-side OAuth flows?
5. **Password Reset**: Include password reset in initial implementation?
6. **Email Verification**: Include email verification in initial implementation?
7. **Rate Limiting**: Should rate limiting be part of AuthSubsystem or separate?
8. ~~**Audit Logging**: Should authentication events be logged to a separate audit system?~~ **RESOLVED**: Separate AuditSubsystem that listens to auth events. AuthSubsystem emits events like `event://auth/login/success`, `event://auth/login/failure`, `event://auth/register`. This keeps Auth logic focused while providing rich audit trails.
9. ~~**Friend Endpoint**: What should be used as the Friend endpoint for users?~~ **RESOLVED**: Use username as endpoint (treat username as stable & unique). Store email in metadata (may change). Alternative: `user:${user.id}` for fully stable ID, but username is preferred for readability.
10. ~~**Friend Connection State**: Should user Friend instances use `connect()`/`disconnect()` to track login/logout state?~~ **RESOLVED**: Yes. Call `friend.connect()` on first active session creation. Call `friend.disconnect()` when last active session is destroyed. SessionManager maintains active session count per user.

