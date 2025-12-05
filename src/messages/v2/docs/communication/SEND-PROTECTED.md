# sendProtected

## Overview

`sendProtected` is the secure messaging mechanism used by all communication types in the Mycelia v2 message system. It provides caller authentication, prevents spoofing, enforces access control, and manages response tracking. All messages sent through the system ultimately go through `sendProtected`, which is wrapped by the kernel to ensure security guarantees.

## How sendProtected Works

### Two-Level Architecture

`sendProtected` operates at two levels:

1. **Identity Level** (`identity.sendProtected()`): Convenience wrapper that automatically passes the owner's PKR
2. **Kernel Level** (`kernel.sendProtected()`): Core security enforcement and message routing

### Identity.sendProtected()

The identity wrapper provides a convenient API:

```javascript
// Identity automatically passes owner's PKR
await subsystem.identity.sendProtected(message, options);
// Internally calls: kernel.sendProtected(ownerPkr, message, options)
```

**Implementation:**
```javascript
async function sendProtected(message, options = {}) {
  return kernel.sendProtected(ownerPkr, message, options);
}
```

**Benefits:**
- Automatically uses the subsystem's PKR
- No need to manually pass PKR
- Cleaner API for subsystems

### Kernel.sendProtected()

The kernel provides the core security enforcement:

```javascript
await kernel.sendProtected(callerPkr, message, options);
```

**Security Features:**
1. **Caller ID Injection**: Kernel sets `callerId` from provided PKR (cannot be spoofed)
2. **Caller ID Set By**: Kernel sets `callerIdSetBy` to kernel's PKR (proves authenticity)
3. **Spoofing Prevention**: Any user-provided `callerId` is stripped
4. **Channel ACL Enforcement**: Automatically enforces channel access control
5. **Response Management**: Registers and validates response-required messages

## Security Guarantees

### 1. Caller Authentication

The kernel ensures caller authentication by:

- **Validating PKR**: Verifies the provided PKR is valid
- **Injecting Caller ID**: Sets `callerId` to the provided PKR
- **Setting Authenticator**: Sets `callerIdSetBy` to kernel's PKR
- **Stripping User Input**: Removes any user-provided `callerId` to prevent spoofing

```javascript
// User-provided callerId is stripped
await kernel.sendProtected(pkr, message, {
  callerId: maliciousPkr  // ❌ This is stripped and ignored
});

// Kernel sets authentic callerId
// options.callerId = pkr (from parameter)
// options.callerIdSetBy = kernel.identity.pkr
```

### 2. Spoofing Prevention

The kernel prevents caller ID spoofing:

```javascript
// SECURITY: Strip any callerId from user-provided options
const { callerId, ...sanitizedOptions } = options;
if (callerId !== undefined && this.debug) {
  console.warn('callerId stripped from sendProtected() options - callerId is set by kernel');
}

// Kernel sets authentic callerId
sanitizedOptions.callerId = pkr;
sanitizedOptions.callerIdSetBy = this.identity.pkr;
```

**Why This Matters:**
- Prevents subsystems from impersonating other subsystems
- Ensures receivers can trust the `callerId` in message options
- Enables secure permission checks based on authenticated caller

### 3. Channel Access Control

The kernel enforces channel access control automatically:

```javascript
// For channel paths, kernel enforces ACL
if (this.#isChannelPath(path)) {
  this.#enforceChannelAccessIfChannel(pkr, path);
  // Throws error if caller is not authorized
}
```

**Access Control Checks:**
- Verifies caller is channel owner OR
- Verifies caller is a channel participant
- Throws error if unauthorized

**One-Shot Paths:**
- Temporary routes skip channel ACL (they're not channels)
- Allows one-shot requests to work without channel setup

### 4. Response Management

The kernel manages response tracking:

```javascript
// Register response-required if needed
if (options.responseRequired) {
  this.#registerResponseIfRequired(pkr, message, options);
  // ResponseManagerSubsystem tracks pending response
}

// Validate responses
if (options.isResponse) {
  responseManager.handleResponse(message);
  // Validates correlation and state
}
```

**Response Features:**
- Automatic registration of pending responses
- Timeout tracking via ResponseManagerSubsystem
- Response validation before routing
- Synthetic timeout responses

## Kernel Wrapping Process

The kernel wraps `sendProtected` to ensure security:

### Step 1: Validation

```javascript
// Validate kernel has identity
if (!this.identity || !this.identity.pkr) {
  throw new Error('Kernel must have an identity with PKR');
}

// Validate caller PKR
if (!pkr) {
  throw new Error('pkr is required');
}
```

### Step 2: Security Sanitization

```javascript
// Strip any user-provided callerId (prevent spoofing)
const { callerId, ...sanitizedOptions } = options;

// Set authentic callerId
sanitizedOptions.callerId = pkr;
sanitizedOptions.callerIdSetBy = this.identity.pkr;
```

### Step 3: Response Management

```javascript
// Handle response messages
if (sanitizedOptions.isResponse) {
  responseManager.handleResponse(message);
  // Validates correlation state
}

// Register response-required
if (sanitizedOptions.responseRequired) {
  this.#registerResponseIfRequired(pkr, message, sanitizedOptions);
}
```

### Step 4: Access Control Enforcement

```javascript
// Enforce channel ACL if channel path
this.#enforceChannelAccessIfChannel(pkr, path);
// Throws error if unauthorized
```

### Step 5: Message Routing

```javascript
// Route message through MessageSystem router
return await routerFacet.route(message, sanitizedOptions);
```

## Usage in Communication Types

### Events

```javascript
// Events use sendProtected internally
await subsystem.send('user/created', userData);
// → identity.sendProtected(message)
// → kernel.sendProtected(pkr, message)
```

### Commands

```javascript
// Commands use sendProtected via RequestBuilder
await subsystem.commands.send('processData', payload);
// → requests.command().forMessage(msg).send()
// → CommandManager.sendCommand()
// → identity.sendProtected(message, { responseRequired: {...} })
// → kernel.sendProtected(pkr, message, { responseRequired: {...} })
```

### Queries

```javascript
// Queries use sendProtected via RequestBuilder
await subsystem.queries.ask('getUser', { userId: '123' });
// → requests.oneShot().forMessage(msg).send()
// → performRequest()
// → identity.sendProtected(message)
// → kernel.sendProtected(pkr, message)
```

### Requests

```javascript
// Requests use sendProtected directly
await subsystem.requests
  .oneShot()
  .forMessage(message)
  .send();
// → performRequest()
// → identity.sendProtected(message)
// → kernel.sendProtected(pkr, message)
```

### Responses

```javascript
// Responses use sendProtected
await subsystem.responses.sendSuccess(originalMessage, result);
// → identity.sendProtected(responseMessage, { isResponse: true })
// → kernel.sendProtected(pkr, responseMessage, { isResponse: true })
```

## Security Flow

```
1. Subsystem calls identity.sendProtected(message, options)
   └─> Identity wrapper passes ownerPkr automatically

2. Identity calls kernel.sendProtected(ownerPkr, message, options)
   └─> Kernel receives PKR and message

3. Kernel validates and sanitizes
   ├─> Validates kernel identity
   ├─> Validates caller PKR
   ├─> Strips user-provided callerId (prevent spoofing)
   ├─> Sets authentic callerId = pkr
   └─> Sets callerIdSetBy = kernel.identity.pkr

4. Kernel enforces security
   ├─> Channel ACL enforcement (if channel path)
   ├─> Response management (if responseRequired or isResponse)
   └─> Message validation

5. Kernel routes message
   └─> MessageSystem router routes with authenticated options

6. Target subsystem receives
   ├─> message with authenticated callerId
   ├─> options.callerId (authenticated PKR)
   └─> options.callerIdSetBy (kernel PKR - proves authenticity)
```

## Permission Checks

Receivers can trust `callerId` because:

1. **Kernel Sets It**: Only kernel can set `callerId` (user input is stripped)
2. **Kernel Proves It**: `callerIdSetBy` is kernel's PKR (proves kernel set it)
3. **Permission Validation**: Receivers can check `callerIdSetBy` is kernel:

```javascript
// Receiver can trust callerId
subsystem.registerRoute('resource://read', async (message, params, options) => {
  // Verify callerIdSetBy is kernel
  if (!isKernel(options.callerIdSetBy)) {
    throw new Error('Permission denied: callerIdSetBy is not kernel');
  }
  
  // Use authenticated callerId for permission checks
  const callerPkr = options.callerId;
  if (!resource.canRead(callerPkr)) {
    throw new Error('Permission denied: read access required');
  }
  
  // Process request...
});
```

## Channel Access Control

The kernel automatically enforces channel ACL for channel-based messages:

```javascript
// Kernel checks if path is a registered channel
const channelManager = this.getChannelManager();
if (channelManager) {
  const channel = channelManager.getChannel(path);
  if (channel) {
    // Verify caller has access
    const ok = channelManager.verifyAccess(path, pkr);
    if (!ok) {
      throw new Error(`caller is not authorized to use channel "${path}"`);
    }
  }
}
```

**Access Rules:**
- Channel owner can always use the channel
- Channel participants can use the channel
- Others cannot use the channel (throws error)

**One-Shot Paths:**
- Temporary routes (pattern: `{subsystem}://request/oneShot/{messageId}`) skip channel ACL
- These are not channels, so no ACL check is needed
- Kernel detects one-shot paths and routes directly without ACL check

**Implementation Details:**
- Kernel checks if path matches a registered channel via `channelManager.getChannel(path)`
- If channel exists, verifies access via `channelManager.verifyAccess(path, pkr)`
- If not a channel or no channel manager, ACL check is skipped (no-op)
- One-shot paths are detected and skip ACL enforcement

## Response Management

The kernel manages response tracking:

### Response Registration

```javascript
// Kernel registers pending response
if (options.responseRequired) {
  responseManager.registerResponseRequiredFor(pkr, message, {
    replyTo: options.responseRequired.replyTo,
    timeout: options.responseRequired.timeout
  });
}
```

**Features:**
- Tracks correlationId and replyTo
- Starts timeout timer
- Enables timeout response generation

### Response Validation

```javascript
// Kernel validates incoming responses
if (options.isResponse) {
  responseManager.handleResponse(message);
  // Validates correlation state
  // Prevents duplicate responses
}
```

## Best Practices

### 1. Always Use Identity.sendProtected()

Use `identity.sendProtected()` instead of calling kernel directly:

```javascript
// Good: Use identity wrapper
await subsystem.identity.sendProtected(message, options);

// Avoid: Calling kernel directly (unless you have a specific reason)
await kernel.sendProtected(subsystem.identity.pkr, message, options);
```

### 2. Trust callerId in Receivers

Receivers can trust `callerId` because kernel sets it:

```javascript
// Trust callerId (kernel guarantees authenticity)
const callerPkr = options.callerId;
if (!resource.canRead(callerPkr)) {
  throw new Error('Permission denied');
}
```

### 3. Verify callerIdSetBy

Always verify `callerIdSetBy` is kernel for security-critical operations:

```javascript
// Verify kernel set the callerId
if (!isKernel(options.callerIdSetBy)) {
  throw new Error('Security violation: callerId not set by kernel');
}
```

### 4. Don't Try to Spoof callerId

User-provided `callerId` is always stripped:

```javascript
// This will be stripped and ignored
await kernel.sendProtected(pkr, message, {
  callerId: maliciousPkr  // ❌ Stripped by kernel
});
```

## Error Handling

### Missing Kernel Identity

```javascript
try {
  await kernel.sendProtected(pkr, message);
} catch (error) {
  // "Kernel must have an identity with PKR. Ensure kernel is bootstrapped."
}
```

**Solution:** Bootstrap kernel before sending messages.

### Unauthorized Channel Access

```javascript
try {
  await kernel.sendProtected(unauthorizedPkr, message);
} catch (error) {
  // "caller is not authorized to use channel "subsystem://channel/name"."
}
```

**Solution:** Ensure caller is channel owner or participant.

### Invalid PKR

```javascript
try {
  await kernel.sendProtected(null, message);
} catch (error) {
  // "pkr is required"
}
```

**Solution:** Provide valid PKR.

## See Also

- [Communication Types Supported](./COMMUNICATION-TYPES-SUPPORTED.md) - Overview of all communication types
- [Kernel Subsystem](../../KERNEL-SUBSYSTEM.md) - Kernel subsystem documentation
- [createIdentity](../../security/CREATE-IDENTITY.md) - Identity creation and sendProtected wrapper
- [Commands Guide](./COMMANDS.md) - How commands use sendProtected
- [Queries Guide](./QUERIES.md) - How queries use sendProtected
- [Requests Guide](./REQUESTS.md) - How requests use sendProtected
- [Responses Guide](./RESPONSES.md) - How responses use sendProtected

