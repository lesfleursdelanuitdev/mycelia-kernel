# Testing Guide

## Overview

This guide provides comprehensive information on testing Mycelia Kernel applications, including patterns, best practices, and common scenarios.

## Table of Contents

1. [Testing Utilities](./TESTING-UTILITIES.md) - Available test utilities
2. [Test Examples](./TEST-EXAMPLES.md) - Complete test examples
3. [Testing Patterns](./TESTING-PATTERNS.md) - Common testing patterns
4. [Mocking Strategies](./MOCKING-STRATEGIES.md) - How to mock subsystems and dependencies

## Quick Start

### Basic Test Setup

```javascript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  createTestMessageSystem,
  createMockPkr,
  createTestMessage,
  processMessageImmediately,
  cleanupTestResources
} from 'mycelia-kernel-v2/utils/test-utils.mycelia.js';

describe('MySubsystem', () => {
  let messageSystem;
  let kernel;
  let userPkr;

  beforeAll(async () => {
    messageSystem = await createTestMessageSystem();
    kernel = messageSystem.getKernel();
    userPkr = createMockPkr('friend', { name: 'test-user' });
  });

  afterAll(async () => {
    await cleanupTestResources(messageSystem);
  });

  it('should handle messages', async () => {
    const message = createTestMessage('subsystem://action', { data: 'test' });
    const result = await processMessageImmediately(kernel, userPkr, message);
    expect(result.success).toBe(true);
  });
});
```

## Testing Strategies

### Unit Testing

Test individual subsystems in isolation:

```javascript
describe('WorkspaceSubsystem', () => {
  let subsystem;

  beforeAll(async () => {
    const messageSystem = await createTestMessageSystem();
    subsystem = await createTestSubsystem(
      messageSystem,
      'workspace',
      WorkspaceSubsystem,
      { prisma: { client: mockPrisma } }
    );
  });

  it('should register routes', () => {
    const router = subsystem.find('router');
    expect(router.hasRoute('workspace://create')).toBe(true);
  });
});
```

### Integration Testing

Test subsystems working together:

```javascript
describe('Workspace and Auth Integration', () => {
  let messageSystem;
  let authSubsystem;
  let workspaceSubsystem;
  let userPkr;

  beforeAll(async () => {
    messageSystem = await createTestMessageSystem();
    
    // Register auth subsystem
    authSubsystem = await createTestSubsystem(
      messageSystem,
      'auth',
      AuthSubsystem,
      { /* config */ }
    );

    // Register workspace subsystem (depends on auth)
    workspaceSubsystem = await createTestSubsystem(
      messageSystem,
      'workspace',
      WorkspaceSubsystem,
      { /* config */ }
    );

    // Create test user
    const userData = await createTestUser(messageSystem, {
      username: 'testuser',
      email: 'test@example.com',
      password: 'TestPassword123!'
    });
    userPkr = userData.pkr;
  });

  it('should create workspace for authenticated user', async () => {
    const message = createTestMessage('workspace://create', {
      name: 'Test Workspace'
    });
    const result = await processMessageImmediately(
      messageSystem.getKernel(),
      userPkr,
      message
    );
    expect(result.success).toBe(true);
  });
});
```

## Common Testing Scenarios

### Testing Authentication

```javascript
it('should require authentication', async () => {
  const message = createTestMessage('workspace://create', {
    name: 'Test Workspace'
  });

  // Test without PKR (should fail)
  await expect(
    processMessageImmediately(kernel, null, message)
  ).rejects.toThrow();
});
```

### Testing Permissions

```javascript
it('should enforce permissions', async () => {
  const teacherPkr = createMockPkr('friend', { name: 'teacher' });
  const studentPkr = createMockPkr('friend', { name: 'student' });

  const message = createTestMessage('workspace://create', {
    name: 'Test Workspace'
  });

  // Teacher can create
  const teacherResult = await processMessageImmediately(
    kernel,
    teacherPkr,
    message
  );
  expect(teacherResult.success).toBe(true);

  // Student cannot create
  await expect(
    processMessageImmediately(kernel, studentPkr, message)
  ).rejects.toThrow(/Permission denied/);
});
```

### Testing Error Handling

```javascript
it('should handle errors gracefully', async () => {
  const message = createTestMessage('workspace://create', {
    // Missing required field
  });

  await expect(
    processMessageImmediately(kernel, userPkr, message)
  ).rejects.toThrow(/required/);
});
```

## Best Practices

1. **Isolate Tests**: Each test should be independent
2. **Clean Up**: Always dispose MessageSystem in `afterAll`
3. **Use Mocks**: Mock external dependencies (databases, APIs)
4. **Test Edge Cases**: Test error conditions and boundary cases
5. **Use Descriptive Names**: Test names should clearly describe what they test

## See Also

- [Testing Utilities](./TESTING-UTILITIES.md) - Available utilities
- [Test Examples](./TEST-EXAMPLES.md) - Complete examples
- [Testing Patterns](./TESTING-PATTERNS.md) - Common patterns


