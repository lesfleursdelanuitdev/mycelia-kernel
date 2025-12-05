# Testing Utilities

## Overview

Mycelia Kernel provides comprehensive testing utilities to simplify testing of subsystems, messages, and the overall system. These utilities reduce boilerplate and make tests more readable and maintainable.

## Quick Start

```javascript
import {
  createMockPkr,
  createTestMessage,
  createTestMessageSystem,
  createTestSubsystem,
  processMessageImmediately
} from 'mycelia-kernel-v2/utils/test-utils.mycelia.js';

describe('MySubsystem', () => {
  let messageSystem;
  let subsystem;
  let userPkr;

  beforeAll(async () => {
    // Create test MessageSystem
    messageSystem = await createTestMessageSystem();
    
    // Create test subsystem
    subsystem = await createTestSubsystem(
      messageSystem,
      'my-subsystem',
      MySubsystem,
      { /* config */ }
    );
    
    // Create mock user PKR
    userPkr = createMockPkr('friend', { name: 'test-user' });
  });

  it('should handle messages', async () => {
    const message = createTestMessage('my-subsystem://action', { data: 'test' });
    const result = await processMessageImmediately(
      messageSystem.getKernel(),
      userPkr,
      message
    );
    
    expect(result.success).toBe(true);
  });
});
```

## Mock PKR Generators

### `createMockPkr(kind, options)`

Creates a mock PKR for testing. PKRs are used throughout Mycelia for identity and authentication.

**Parameters:**
- `kind` (string, default: `'friend'`) - Principal kind: `'kernel'`, `'topLevel'`, `'child'`, `'friend'`, `'resource'`
- `options` (object, optional):
  - `uuid` (string) - UUID (auto-generated if not provided)
  - `name` (string) - Name (optional)
  - `publicKey` (symbol) - Public key symbol (auto-generated if not provided)
  - `minter` (symbol) - Minter key (optional)
  - `expiration` (string) - Expiration time (default: `'1 week'`)

**Returns:** `PKR` - Mock PKR instance

**Examples:**

```javascript
// Basic friend PKR (most common for user testing)
const userPkr = createMockPkr('friend', { name: 'test-user' });

// Custom PKR with specific UUID
const subsystemPkr = createMockPkr('topLevel', {
  uuid: 'subsystem-123',
  name: 'my-subsystem'
});

// PKR with custom expiration
const shortLivedPkr = createMockPkr('friend', {
  name: 'temp-user',
  expiration: '1 hour'
});
```

### `createMockPkrs(count, kind, options)`

Creates multiple mock PKRs at once.

**Parameters:**
- `count` (number) - Number of PKRs to create
- `kind` (string, default: `'friend'`) - Principal kind
- `options` (object, optional) - Base options for all PKRs

**Returns:** `PKR[]` - Array of mock PKRs

**Example:**

```javascript
// Create 3 user PKRs
const userPkrs = createMockPkrs(3, 'friend', { name: 'user' });
// Returns PKRs with names: 'user-0', 'user-1', 'user-2'
```

## Message Creation Helpers

### `createTestMessage(path, body, meta)`

Creates a test message with the specified path, body, and metadata.

**Parameters:**
- `path` (string) - Message path (e.g., `'workspace://create'`)
- `body` (any, default: `{}`) - Message body
- `meta` (object, default: `{}`) - Message metadata

**Returns:** `Message` - Message instance

**Example:**

```javascript
const message = createTestMessage('workspace://create', {
  name: 'Test Workspace',
  description: 'A test workspace'
});
```

### `createImmediateMessage(path, body, meta)`

Creates a message that will be processed immediately, bypassing the queue.

**Parameters:**
- `path` (string) - Message path
- `body` (any, default: `{}`) - Message body
- `meta` (object, default: `{}`) - Message metadata

**Returns:** `Message` - Message instance with `processImmediately` flag

**Example:**

```javascript
// Message will be processed synchronously
const message = createImmediateMessage('workspace://create', {
  name: 'Test Workspace'
});
```

## MessageSystem Testing

### `createTestMessageSystem(options)`

Creates and bootstraps a MessageSystem for testing.

**Parameters:**
- `options` (object, optional):
  - `name` (string, default: `'test-app'`) - System name
  - `debug` (boolean, default: `true`) - Enable debug mode

**Returns:** `Promise<MessageSystem>` - Bootstrapped MessageSystem instance

**Example:**

```javascript
const messageSystem = await createTestMessageSystem({
  name: 'test-app',
  debug: true
});
```

### `createTestSubsystem(messageSystem, name, SubsystemClass, config)`

Creates and registers a test subsystem.

**Parameters:**
- `messageSystem` (MessageSystem) - MessageSystem instance
- `name` (string) - Subsystem name
- `SubsystemClass` (typeof BaseSubsystem) - Subsystem class constructor
- `config` (object, default: `{}`) - Subsystem configuration

**Returns:** `Promise<BaseSubsystem>` - Registered subsystem instance

**Example:**

```javascript
const workspaceSubsystem = await createTestSubsystem(
  messageSystem,
  'workspace',
  WorkspaceSubsystem,
  {
    prisma: {
      client: prismaClient
    }
  }
);
```

## Message Processing Helpers

### `processMessageImmediately(kernel, callerPkr, message)`

Processes a message immediately using `kernel.sendProtected`, bypassing the queue.

**Parameters:**
- `kernel` (KernelSubsystem) - Kernel subsystem instance
- `callerPkr` (PKR) - Caller's PKR
- `message` (Message) - Message to process

**Returns:** `Promise<any>` - Handler result

**Example:**

```javascript
const result = await processMessageImmediately(
  messageSystem.getKernel(),
  userPkr,
  createTestMessage('workspace://create', { name: 'Test' })
);

expect(result.success).toBe(true);
```

### `extractHandlerResult(routingResult)`

Extracts the handler result from a routing result, handling nested result structures.

**Parameters:**
- `routingResult` (Object) - Result from message routing

**Returns:** `any` - Extracted handler result

**Example:**

```javascript
const routingResult = await kernel.sendProtected(pkr, message);
const handlerResult = extractHandlerResult(routingResult);
```

## User Testing Helpers

### `createTestUser(messageSystem, userData, pkrMapping)`

Creates a test user via AuthSubsystem and returns user data with PKR.

**Parameters:**
- `messageSystem` (MessageSystem) - MessageSystem instance
- `userData` (object):
  - `username` (string) - Username
  - `email` (string) - Email
  - `password` (string) - Password
  - `metadata` (object, optional) - User metadata
- `pkrMapping` (object, optional) - PKR mapping object for storing mapping

**Returns:** `Promise<{user: Object, pkr: PKR, userId: string, role: string}>`

**Example:**

```javascript
const { user, pkr, userId, role } = await createTestUser(
  messageSystem,
  {
    username: 'testuser',
    email: 'test@example.com',
    password: 'TestPassword123!',
    metadata: { role: 'teacher' }
  },
  userPkrMapping // Optional: store PKR mapping
);
```

## Utility Functions

### `waitFor(condition, options)`

Waits for a condition to be true. Useful for testing async operations.

**Parameters:**
- `condition` (Function) - Function that returns true when condition is met
- `options` (object, optional):
  - `timeout` (number, default: `5000`) - Timeout in milliseconds
  - `interval` (number, default: `100`) - Check interval in milliseconds

**Returns:** `Promise<void>`

**Throws:** `Error` if timeout is reached

**Example:**

```javascript
await waitFor(() => subsystem.find('router') !== null);
```

### `createMockSubsystem(name, facets)`

Creates a mock subsystem for testing dependencies.

**Parameters:**
- `name` (string) - Subsystem name
- `facets` (object, default: `{}`) - Facets to add to the mock

**Returns:** `Object` - Mock subsystem object

**Example:**

```javascript
const mockStorage = createMockSubsystem('storage', {
  get: async (key) => ({ success: true, data: mockData[key] }),
  set: async (key, value) => ({ success: true })
});
```

### `cleanupTestResources(messageSystem)`

Disposes MessageSystem and cleans up test resources.

**Parameters:**
- `messageSystem` (MessageSystem) - MessageSystem instance to dispose

**Returns:** `Promise<void>`

**Example:**

```javascript
afterAll(async () => {
  await cleanupTestResources(messageSystem);
});
```

## Complete Test Example

```javascript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  createTestMessageSystem,
  createTestSubsystem,
  createMockPkr,
  createTestUser,
  createTestMessage,
  processMessageImmediately,
  cleanupTestResources
} from 'mycelia-kernel-v2/utils/test-utils.mycelia.js';
import { WorkspaceSubsystem } from './workspace.subsystem.mycelia.js';

describe('WorkspaceSubsystem', () => {
  let messageSystem;
  let workspaceSubsystem;
  let kernel;
  let userPkr;
  let userId;

  beforeAll(async () => {
    // Create test MessageSystem
    messageSystem = await createTestMessageSystem();
    kernel = messageSystem.getKernel();

    // Create workspace subsystem
    workspaceSubsystem = await createTestSubsystem(
      messageSystem,
      'workspace',
      WorkspaceSubsystem,
      {
        prisma: {
          client: prismaClient
        }
      }
    );

    // Create test user
    const userData = await createTestUser(messageSystem, {
      username: 'testuser',
      email: 'test@example.com',
      password: 'TestPassword123!',
      metadata: { role: 'teacher' }
    }, userPkrMapping);

    userPkr = userData.pkr;
    userId = userData.userId;
  });

  afterAll(async () => {
    await cleanupTestResources(messageSystem);
  });

  it('should create a workspace', async () => {
    const message = createTestMessage('workspace://create', {
      name: 'Test Workspace',
      description: 'A test workspace'
    });

    const result = await processMessageImmediately(
      kernel,
      userPkr,
      message
    );

    expect(result.success).toBe(true);
    expect(result.data.name).toBe('Test Workspace');
  });
});
```

## Best Practices

1. **Use Mock PKRs**: Always use `createMockPkr` instead of manually creating PKRs
2. **Use Test Helpers**: Use `createTestMessage` and `processMessageImmediately` for consistency
3. **Clean Up**: Always call `cleanupTestResources` in `afterAll`
4. **Isolate Tests**: Create a new MessageSystem for each test suite
5. **Use Immediate Messages**: Use `createImmediateMessage` for synchronous testing

## Common Patterns

### Testing Route Handlers

```javascript
it('should handle route', async () => {
  const message = createTestMessage('subsystem://route', { data: 'test' });
  const result = await processMessageImmediately(kernel, userPkr, message);
  expect(result.success).toBe(true);
});
```

### Testing with Multiple Users

```javascript
const [user1Pkr, user2Pkr] = createMockPkrs(2, 'friend', { name: 'user' });

// Test user 1 can access
const result1 = await processMessageImmediately(kernel, user1Pkr, message);
expect(result1.success).toBe(true);

// Test user 2 cannot access
await expect(
  processMessageImmediately(kernel, user2Pkr, message)
).rejects.toThrow();
```

### Testing Subsystem Dependencies

```javascript
const mockStorage = createMockSubsystem('storage', {
  get: async (key) => ({ success: true, data: testData[key] })
});

// Use mock in test
```

## Result Assertion Helpers

### `expectSuccess(result, message)`

Asserts that a result is successful.

**Parameters:**
- `result` (any) - Result object to check
- `message` (string, optional) - Custom error message

**Throws:** `Error` if result is not defined or not successful

**Example:**

```javascript
const result = await processMessageImmediately(kernel, userPkr, message);
expectSuccess(result);
```

### `expectFailure(result, expectedError, message)`

Asserts that a result failed.

**Parameters:**
- `result` (any) - Result object to check
- `expectedError` (string|RegExp, optional) - Expected error message or pattern
- `message` (string, optional) - Custom error message

**Example:**

```javascript
const result = await processMessageImmediately(kernel, userPkr, message);
expectFailure(result, /Permission denied/);
```

### `extractData(result, paths)`

Extracts data from result with multiple fallback paths.

**Parameters:**
- `result` (any) - Result object
- `paths` (string[]|string) - Array of paths to try, or single path string

**Returns:** `any` - Extracted data, or null if not found

**Example:**

```javascript
const workspace = extractData(result, ['data.workspace', 'workspace', 'data']);
const id = extractData(result, 'data.id');
```

### `extractId(result, paths)`

Extracts ID from result using common ID paths.

**Parameters:**
- `result` (any) - Result object
- `paths` (string[]|string, optional) - Optional paths to try

**Returns:** `string|null` - Extracted ID

**Example:**

```javascript
const id = extractId(result);
const workspaceId = extractId(result, ['data.workspace.id', 'workspace.id']);
```

### `extractError(result)`

Extracts error message from result.

**Parameters:**
- `result` (any) - Result object

**Returns:** `string|null` - Error message

**Example:**

```javascript
const error = extractError(result);
```

## Permission Testing Helpers

### `expectPermissionDenied(fn, options)`

Asserts that an operation is denied (permission error).

**Parameters:**
- `fn` (Function) - Async function to execute
- `options` (object, optional):
  - `errorPattern` (string|RegExp) - Expected error pattern
  - `message` (string) - Custom error message

**Returns:** `Promise<void>`

**Example:**

```javascript
await expectPermissionDenied(
  () => processMessageImmediately(kernel, studentPkr, message),
  { errorPattern: /Permission denied|scope/ }
);
```

### `expectAccessGranted(fn, options)`

Asserts that an operation is granted (succeeds).

**Parameters:**
- `fn` (Function) - Async function to execute
- `options` (object, optional):
  - `message` (string) - Custom error message

**Returns:** `Promise<any>` - Result of the operation

**Example:**

```javascript
const result = await expectAccessGranted(
  () => processMessageImmediately(kernel, userPkr, message)
);
```

### `expectScopeRequired(scope, fn, options)`

Asserts that a specific scope is required.

**Parameters:**
- `scope` (string) - Expected scope name
- `fn` (Function) - Async function to execute
- `options` (object, optional) - Additional options

**Returns:** `Promise<void>`

**Example:**

```javascript
await expectScopeRequired(
  'workspace:create',
  () => processMessageImmediately(kernel, studentPkr, message)
);
```

## See Also

- [Testing Guide](./TESTING-GUIDE.md) - Comprehensive testing guide
- [Test Examples](./TEST-EXAMPLES.md) - More test examples
- [Additional Testing Utilities](./ADDITIONAL-TESTING-UTILITIES.md) - More utility proposals
- [PKR Documentation](../security/PUBLIC-KEY-RECORD.md) - Understanding PKRs
- [Message Documentation](../message/MESSAGE.md) - Understanding messages

