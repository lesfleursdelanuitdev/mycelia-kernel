# RequestBuilder Adaptation Plan

## Overview

This document outlines the plan for adapting the `RequestBuilder` class to support a more flexible fluent API with multiple request types ('oneShot' and 'command'). The new builder uses dependency injection and a different method chain pattern.

## Location

**Target File:** `/apps/mycelia-kernel/src/messages/v2/hooks/requests/request-builder.mycelia.js`

**Will Overwrite:** Existing RequestBuilder implementation

## Current State vs. Desired State

### Current RequestBuilder (v2)

**Constructor:**
```javascript
constructor(subsystem, handler)
```

**API Pattern:**
```javascript
subsystem.requests.request(handler).on(message, timeoutOrOptions)
```

**Features:**
- Takes handler in constructor
- Executes immediately with `on(message, timeoutOrOptions)`
- Only supports oneShot type (implicit)
- Handler is required at construction time

### Desired RequestBuilder (New)

**Constructor:**
```javascript
constructor({ type, subsystem, performRequest, commandManager })
```

**API Pattern:**
```javascript
subsystem.requests.oneShot().with(options).forMessage(message).send()
subsystem.requests.command().with(options).forMessage(message).send()
```

**Features:**
- Dependency injection pattern
- Supports multiple types: 'oneShot' and 'command'
- Fluent builder: `with()` → `forMessage()` → `send()`
- Handler passed in options (for oneShot type)
- More flexible configuration

## Required Changes

### 1. Constructor Adaptation

**Current:**
```javascript
constructor(subsystem, handler) {
  this.subsystem = subsystem;
  this.handler = handler;
}
```

**New:**
```javascript
constructor({ type, subsystem, performRequest, commandManager }) {
  this.#type = type;
  this.#subsystem = subsystem;
  this.#performRequest = performRequest;
  this.#commandManager = commandManager;
  this.#options = {};
  this.#message = null;
}
```

**Key Changes:**
- Use private fields (`#type`, `#subsystem`, etc.)
- Dependency injection for `performRequest` and `commandManager`
- Store `type` to determine behavior
- Initialize `#options` and `#message` to null

### 2. Add `with()` Method

**New Method:**
```javascript
with(options = {}) {
  this.#options = { ...(this.#options || {}), ...(options || {}) };
  return this;
}
```

**Purpose:**
- Merge options into builder state
- Returns `this` for chaining
- Allows incremental option building

### 3. Add `forMessage()` Method

**New Method:**
```javascript
forMessage(message) {
  this.#message = message;
  return this;
}
```

**Purpose:**
- Set the message to send
- Returns `this` for chaining
- Validates message in `send()` method

### 4. Replace `on()` with `send()` Method

**Current:**
```javascript
on(message, timeoutOrOptions) {
  return performRequest(this.subsystem, this.handler, message, timeoutOrOptions);
}
```

**New:**
```javascript
async send() {
  const type = this.#type;
  const subsystem = this.#subsystem;
  const message = this.#message;
  const options = this.#options || {};

  if (!message) {
    throw new Error('RequestBuilder.send: no message provided. Call forMessage() first.');
  }

  switch (type) {
    case 'oneShot': {
      // Delegate to performRequest
      const handler = options.handler;
      if (typeof handler !== 'function') {
        throw new Error('RequestBuilder(oneShot).send: options.handler (function) is required.');
      }
      
      // v2: Adapt options (replyTo instead of replyPath)
      const { timeout, replyTo, ...sendOptions } = options;
      return this.#performRequest(subsystem, handler, message, {
        timeout,
        replyTo,
        ...sendOptions
      });
    }
    
    case 'command': {
      if (!this.#commandManager) {
        throw new Error('RequestBuilder(command).send: CommandManager is not available.');
      }
      return this.#commandManager.sendCommand({
        message,
        options
      });
    }
    
    default:
      throw new Error(`RequestBuilder.send: unknown request type "${type}".`);
  }
}
```

**Key Changes:**
- No parameters (uses builder state)
- Validates message is set
- Switch on type to determine behavior
- For 'oneShot': extracts handler from options, delegates to performRequest
- For 'command': delegates to CommandManager
- v2: Use `replyTo` instead of `replyPath` in options

### 5. Update useRequests Hook

**Current:**
```javascript
request(handler) {
  return new RequestBuilder(subsystem, handler);
}
```

**New:**
```javascript
oneShot() {
  return new RequestBuilder({
    type: 'oneShot',
    subsystem,
    performRequest,
    commandManager
  });
},

command() {
  return new RequestBuilder({
    type: 'command',
    subsystem,
    performRequest,
    commandManager
  });
}
```

**Key Changes:**
- Replace `request(handler)` with `oneShot()` and `command()`
- Pass `performRequest` function reference
- Pass `commandManager` instance
- Handler moved to options (for oneShot)

## API Migration

### Old API (Current)

```javascript
// One-shot request
const result = await subsystem.requests
  .request(async (response) => response.getBody())
  .on(message, 5000);
```

### New API (Desired)

```javascript
// One-shot request
const result = await subsystem.requests
  .oneShot()
  .with({ handler: async (response) => response.getBody(), timeout: 5000 })
  .forMessage(message)
  .send();

// Command request
const response = await subsystem.requests
  .command()
  .with({ replyTo: 'subsystem://channel/replies', timeout: 5000 })
  .forMessage(commandMessage)
  .send();
```

## Implementation Steps

### Phase 1: RequestBuilder Core
1. Update constructor to dependency injection pattern
2. Convert to private fields (`#type`, `#subsystem`, `#performRequest`, `#commandManager`, `#options`, `#message`)
3. Add `with(options)` method
4. Add `forMessage(message)` method
5. Replace `on()` with `send()` method
6. Implement type switching logic

### Phase 2: Options Adaptation
7. Adapt 'oneShot' options handling (use `replyTo` instead of `replyPath`)
8. Ensure handler is extracted from options
9. Pass correct options to `performRequest`
10. Pass correct options to `commandManager.sendCommand`

### Phase 3: useRequests Hook Integration
11. Import `performRequest` function
12. Replace `request(handler)` with `oneShot()` method
13. Add `command()` method
14. Pass dependencies to RequestBuilder constructor

### Phase 4: Testing & Documentation
15. Test oneShot type
16. Test command type
17. Test error cases
18. Update documentation

## Detailed Implementation

### RequestBuilder Class Structure

```javascript
export class RequestBuilder {
  #type;              // 'oneShot' | 'command'
  #subsystem;         // BaseSubsystem instance
  #performRequest;    // performRequest function reference
  #commandManager;    // CommandManager instance
  #options = {};      // Builder options
  #message = null;    // Message to send

  constructor({ type, subsystem, performRequest, commandManager }) {
    // Validation and initialization
  }

  with(options = {}) {
    // Merge options
  }

  forMessage(message) {
    // Set message
  }

  async send() {
    // Execute based on type
  }
}
```

### useRequests Hook Changes

**Before:**
```javascript
request(handler) {
  return new RequestBuilder(subsystem, handler);
}
```

**After:**
```javascript
import { performRequest } from './request-core.mycelia.js';

// In facet.add():
oneShot() {
  return new RequestBuilder({
    type: 'oneShot',
    subsystem,
    performRequest,
    commandManager
  });
},

command() {
  return new RequestBuilder({
    type: 'command',
    subsystem,
    performRequest,
    commandManager
  });
}
```

## Breaking Changes

### API Change

**Old Pattern (Breaking):**
```javascript
subsystem.requests.request(handler).on(message, timeout)
```

**New Pattern:**
```javascript
subsystem.requests.oneShot().with({ handler, timeout }).forMessage(message).send()
```

**Migration Path:**
- Old code using `request(handler).on(message, timeout)` will break
- Need to update to new fluent API
- Handler moves from constructor to options

### Options Change

**Old:**
- `replyPath` option (in performRequest)

**New:**
- `replyTo` option (matches v2 kernel expectations)

## Key Adaptations Summary

### ✅ No Changes Needed
- Private field pattern (already using `#`)
- Error handling pattern (throws - compatible)
- Promise-based API (compatible)

### 🔄 Changes Required
1. **Constructor**: Dependency injection pattern
2. **API Methods**: `on()` → `with()` + `forMessage()` + `send()`
3. **Type Support**: Add 'command' type alongside 'oneShot'
4. **Handler Location**: Move from constructor to options
5. **useRequests Hook**: Replace `request()` with `oneShot()` and `command()`
6. **Options**: Use `replyTo` instead of `replyPath` for v2 compatibility

## Success Criteria

✅ RequestBuilder uses dependency injection
✅ Supports both 'oneShot' and 'command' types
✅ Fluent API: `with()` → `forMessage()` → `send()`
✅ Handler passed in options (not constructor)
✅ useRequests hook provides `oneShot()` and `command()` methods
✅ Options use `replyTo` (v2 compatible)
✅ No linter errors

## Usage Examples (After Implementation)

### Example 1: One-Shot Request

```javascript
const result = await subsystem.requests
  .oneShot()
  .with({
    handler: async (responseMessage, params, options) => {
      return responseMessage.getBody();
    },
    timeout: 5000
  })
  .forMessage(requestMessage)
  .send();
```

### Example 2: One-Shot with Explicit Reply Path

```javascript
const result = await subsystem.requests
  .oneShot()
  .with({
    handler: async (response) => response.getBody(),
    timeout: 10000,
    replyTo: 'custom://reply/path'
  })
  .forMessage(message)
  .send();
```

### Example 3: Command Request

```javascript
const response = await subsystem.requests
  .command()
  .with({
    replyTo: 'subsystem://channel/replies',
    timeout: 5000
  })
  .forMessage(commandMessage)
  .send();

// Handle reply on channel
subsystem.registerRoute('subsystem://channel/replies', (responseMessage) => {
  subsystem.requests.commandManager.handleCommandReply(responseMessage);
});
```

### Example 4: Incremental Option Building

```javascript
const builder = subsystem.requests
  .oneShot()
  .with({ timeout: 5000 })
  .with({ handler: async (r) => r.getBody() }); // Can chain multiple with() calls

const result = await builder.forMessage(message).send();
```

## Open Questions

1. **Backward Compatibility**: Should we maintain the old `request(handler).on()` API?
   - **Option A**: Remove old API (breaking change)
   - **Option B**: Keep both APIs (more complex)
   - **Recommendation**: Option A - clean break, document migration

2. **Handler Validation**: When should handler be validated?
   - **Option A**: In `with()` method (early validation)
   - **Option B**: In `send()` method (lazy validation)
   - **Recommendation**: Option B - allows incremental building

3. **Default Type**: Should there be a default type if not specified?
   - **Recommendation**: No - explicit is better, use `oneShot()` or `command()`

4. **Options Merging**: Should `with()` merge or replace?
   - **Current Plan**: Merge (spread operator)
   - **Recommendation**: Keep merge behavior

## Notes

- The new API is more flexible and supports multiple request types
- Dependency injection makes testing easier
- Fluent API allows incremental configuration
- Breaking change is acceptable for better API design
- CommandManager integration is seamless




