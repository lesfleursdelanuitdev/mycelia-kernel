# Additional Testing Utilities Proposal

## Overview

Based on real-world usage analysis and test patterns, here are additional testing utilities that would be valuable:

## 1. Result Assertion Helpers

**Problem**: Repetitive patterns for asserting message results:
```javascript
expect(result).toBeDefined();
expect(result.success).toBe(true);
const workspace = result.data?.workspace || result.workspace;
```

**Proposed Utilities**:
- `expectSuccess(result)` - Asserts result is defined and successful
- `expectFailure(result, expectedError?)` - Asserts result failed
- `extractData(result, path?)` - Extracts data with fallback paths
- `expectData(result, path, matcher)` - Asserts data at path matches

**Example**:
```javascript
const result = await processMessageImmediately(kernel, userPkr, message);
expectSuccess(result);
const workspace = extractData(result, ['data.workspace', 'workspace']);
expect(workspace.name).toBe('Test Workspace');
```

## 2. Permission Testing Helpers

**Problem**: Repetitive permission denial testing:
```javascript
await expect(
  processMessageImmediately(kernel, studentPkr, message)
).rejects.toThrow(/Permission denied|scope/);
```

**Proposed Utilities**:
- `expectPermissionDenied(fn, options?)` - Asserts operation is denied
- `expectAccessGranted(fn, options?)` - Asserts operation succeeds
- `expectScopeRequired(scope, fn)` - Asserts specific scope is required

**Example**:
```javascript
await expectPermissionDenied(
  () => processMessageImmediately(kernel, studentPkr, createMessage),
  { errorPattern: /Permission denied|scope/ }
);
```

## 3. Route Testing Helpers

**Problem**: Common patterns for testing CRUD routes:
- Create → Read → Update → Delete
- Testing with different roles
- Testing error cases

**Proposed Utilities**:
- `testRouteCRUD(options)` - Tests full CRUD cycle
- `testRouteWithRoles(route, roles, options)` - Tests route with multiple roles
- `testRouteErrors(route, errorCases)` - Tests error handling

**Example**:
```javascript
await testRouteCRUD({
  kernel,
  userPkr,
  basePath: 'workspace://',
  createData: { name: 'Test Workspace' },
  updateData: { name: 'Updated' },
  extractId: (result) => extractData(result, ['data.workspace', 'workspace']).id
});
```

## 4. Database/Prisma Test Utilities

**Problem**: Setting up test databases, transactions, fixtures

**Proposed Utilities**:
- `createTestDatabase(options?)` - Creates isolated test database
- `withTransaction(fn)` - Runs test in transaction (rollback after)
- `seedTestData(schema)` - Seeds test data
- `cleanupTestDatabase()` - Cleans up test database

**Example**:
```javascript
beforeAll(async () => {
  await createTestDatabase({ schema: 'test' });
  await seedTestData({ users: 5, workspaces: 3 });
});

afterAll(async () => {
  await cleanupTestDatabase();
});
```

## 5. Message Result Extraction Helpers

**Problem**: Repetitive data extraction with fallbacks:
```javascript
const workspace = result.data?.workspace || result.workspace || result.data;
```

**Proposed Utilities**:
- `extractData(result, paths)` - Extract with multiple fallback paths
- `extractId(result, paths?)` - Extract ID from result
- `extractError(result)` - Extract error message

**Example**:
```javascript
const workspace = extractData(result, [
  'data.workspace',
  'workspace',
  'data'
]);
const workspaceId = extractId(result, ['data.workspace.id', 'workspace.id']);
```

## 6. Test Data Factories

**Problem**: Generating consistent test data

**Proposed Utilities**:
- `createWorkspaceData(overrides?)` - Factory for workspace data
- `createUserData(overrides?)` - Factory for user data
- `createMessageData(path, overrides?)` - Factory for message data

**Example**:
```javascript
const workspaceData = createWorkspaceData({
  name: 'Custom Name',
  // Other fields use defaults
});
```

## 7. Snapshot Testing Utilities

**Problem**: Testing message/state snapshots

**Proposed Utilities**:
- `snapshotMessage(message)` - Create snapshot of message
- `expectMessageSnapshot(message, snapshot)` - Compare message to snapshot
- `snapshotSubsystemState(subsystem)` - Snapshot subsystem state

**Example**:
```javascript
const snapshot = snapshotMessage(message);
expectMessageSnapshot(message, snapshot);
```

## 8. Async Testing Helpers

**Problem**: Testing async operations and timing

**Proposed Utilities**:
- `waitForMessage(messageSystem, predicate, timeout?)` - Wait for message matching predicate
- `waitForSubsystemReady(subsystem, timeout?)` - Wait for subsystem to be ready
- `withTimeout(promise, timeout, message?)` - Add timeout to promise

**Example**:
```javascript
await waitForMessage(
  messageSystem,
  (msg) => msg.path === 'workspace://created',
  { timeout: 5000 }
);
```

## 9. Mock Message System Helpers

**Problem**: Creating minimal message systems for unit tests

**Proposed Utilities**:
- `createMinimalMessageSystem(options?)` - Minimal MS for unit tests
- `mockSubsystem(name, handlers)` - Mock subsystem with handlers
- `mockRoute(subsystem, path, handler)` - Mock specific route

**Example**:
```javascript
const messageSystem = await createMinimalMessageSystem();
const mockWorkspace = mockSubsystem('workspace', {
  'workspace://create': async (msg) => ({ success: true, data: { id: '123' } })
});
```

## 10. Test Isolation Utilities

**Problem**: Ensuring test isolation

**Proposed Utilities**:
- `isolateTest(fn)` - Run test in isolated context
- `resetTestState(messageSystem)` - Reset message system state
- `clearTestData()` - Clear all test data

**Example**:
```javascript
it('should be isolated', async () => {
  await isolateTest(async () => {
    // Test code here
  });
});
```

## Priority Recommendations

### High Priority (Most Valuable)

1. **Result Assertion Helpers** - Used in every test
2. **Permission Testing Helpers** - Common pattern, reduces boilerplate
3. **Message Result Extraction Helpers** - Eliminates repetitive fallback logic

### Medium Priority

4. **Route Testing Helpers** - Useful for comprehensive route testing
5. **Test Data Factories** - Improves test data consistency
6. **Database/Prisma Test Utilities** - Important for integration tests

### Low Priority (Nice to Have)

7. **Snapshot Testing Utilities** - Useful but less common
8. **Async Testing Helpers** - Extends existing `waitFor`
9. **Mock Message System Helpers** - For advanced mocking scenarios
10. **Test Isolation Utilities** - Advanced use cases

## Implementation Plan

1. **Phase 1**: Result assertion and extraction helpers (most used)
2. **Phase 2**: Permission testing helpers (common pattern)
3. **Phase 3**: Route testing helpers (comprehensive testing)
4. **Phase 4**: Database/Prisma utilities (integration tests)
5. **Phase 5**: Remaining utilities as needed

## Usage Example (After Implementation)

```javascript
import {
  createTestMessageSystem,
  createTestUser,
  createTestMessage,
  processMessageImmediately,
  // New utilities
  expectSuccess,
  extractData,
  expectPermissionDenied,
  testRouteCRUD
} from 'mycelia-kernel-v2/utils/test-utils.mycelia.js';

describe('WorkspaceSubsystem', () => {
  let messageSystem, kernel, userPkr, studentPkr;

  beforeAll(async () => {
    messageSystem = await createTestMessageSystem();
    kernel = messageSystem.getKernel();
    
    const user1 = await createTestUser(messageSystem, {
      username: 'teacher',
      email: 'teacher@example.com',
      password: 'Password123!',
      metadata: { role: 'teacher' }
    });
    userPkr = user1.pkr;
    
    const user2 = await createTestUser(messageSystem, {
      username: 'student',
      email: 'student@example.com',
      password: 'Password123!',
      metadata: { role: 'student' }
    });
    studentPkr = user2.pkr;
  });

  it('should create workspace', async () => {
    const message = createTestMessage('workspace://create', {
      name: 'Test Workspace'
    });
    
    const result = await processMessageImmediately(kernel, userPkr, message);
    expectSuccess(result);
    
    const workspace = extractData(result, ['data.workspace', 'workspace']);
    expect(workspace.name).toBe('Test Workspace');
  });

  it('should deny student creation', async () => {
    const message = createTestMessage('workspace://create', {
      name: 'Student Workspace'
    });
    
    await expectPermissionDenied(
      () => processMessageImmediately(kernel, studentPkr, message)
    );
  });

  // Full CRUD test
  it('should handle full CRUD cycle', async () => {
    await testRouteCRUD({
      kernel,
      userPkr,
      basePath: 'workspace://',
      createData: { name: 'CRUD Test' },
      updateData: { name: 'Updated' },
      extractId: (result) => extractData(result, ['data.workspace', 'workspace']).id
    });
  });
});
```

## Conclusion

These additional utilities would significantly reduce boilerplate and make tests more readable and maintainable. The high-priority items should be implemented first as they address the most common patterns.

