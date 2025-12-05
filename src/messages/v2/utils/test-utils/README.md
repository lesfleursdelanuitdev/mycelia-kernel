# Test Utilities

This directory contains comprehensive testing utilities for the Mycelia Kernel package.

## Structure

```
test-utils/
├── core/
│   ├── kernel-test-context.mycelia.js    # Kernel and identity testing
│   ├── result-assertions.mycelia.js       # Result assertion helpers
│   └── permission-helpers.mycelia.js       # Permission testing helpers
├── contexts/
│   ├── profile-test-context.mycelia.js    # Security profile testing
│   ├── router-test-context.mycelia.js     # Router and scope testing
│   └── rws-test-context.mycelia.js        # ReaderWriterSet testing
└── index.js                                # Main exports
```

## Usage

All utilities are exported from the main `test-utils.mycelia.js` file:

```javascript
import {
  // Core utilities
  KernelTestContext,
  expectSuccess,
  expectFailure,
  extractData,
  extractId,
  expectPermissionDenied,
  expectAccessGranted,
  
  // Context utilities
  ProfileTestContext,
  RouterTestContext,
  RWSTestContext,
  
  // Existing utilities
  createTestMessageSystem,
  createTestMessage,
  processMessageImmediately,
  createMockPkr
} from 'mycelia-kernel-v2/utils/test-utils.mycelia.js';
```

## Core Utilities

### KernelTestContext

Provides validated access to kernel and its services:

```javascript
const kernelCtx = KernelTestContext.fromMessageSystem(messageSystem);

// Verify kernel identity
const validation = kernelCtx.verifyIdentity();
expect(validation.success).toBe(true);

// Get kernel PKR
const kernelPkr = kernelCtx.pkr;

// Grant permissions
kernelCtx.grantPermissionOnSubsystem('workspace', userPkr, 'rw');

// Get subsystem RWS
const rws = kernelCtx.getSubsystemRWS('workspace');
```

### Result Assertions

Simplify result checking:

```javascript
const result = await processMessageImmediately(kernel, userPkr, message);

// Assert success
expectSuccess(result);

// Extract data with fallback paths
const workspace = extractData(result, ['data.workspace', 'workspace']);

// Extract ID
const id = extractId(result);

// Extract error
const error = extractError(result);
```

### Permission Helpers

Test permission checks:

```javascript
// Test permission denial
await expectPermissionDenied(
  () => processMessageImmediately(kernel, studentPkr, message),
  { errorPattern: /Permission denied/ }
);

// Test access granted
await expectAccessGranted(
  () => processMessageImmediately(kernel, teacherPkr, message)
);

// Test scope requirement
await expectScopeRequired(
  'workspace:create',
  () => processMessageImmediately(kernel, studentPkr, message)
);
```

## Context Utilities

### ProfileTestContext

Test security profiles:

```javascript
const profileCtx = new ProfileTestContext(kernel);

// Create profile
profileCtx.createProfile('teacher', {
  'workspace:create': 'rwg',
  'workspace:read': 'rwg'
});

// Apply profile
profileCtx.applyProfileToPrincipal('teacher', userPkr);

// Verify profile
expect(profileCtx.verifyProfileExists('teacher')).toBe(true);
expect(profileCtx.verifyProfileGrants('teacher', 'workspace:create')).toBe('rwg');
```

### RouterTestContext

Test router functionality:

```javascript
const routerCtx = new RouterTestContext(workspaceSubsystem);

// Register route with scope
routerCtx.registerRouteWithScope(
  'workspace://create',
  async (msg) => ({ success: true }),
  'workspace:create',
  'write'
);

// Test route
const result = await routerCtx.testRoute('workspace://create', userPkr, {
  name: 'Test Workspace'
});

// Verify scope check
expect(routerCtx.verifyScopeCheck('workspace://create', userPkr, 'workspace:create')).toBe(true);
```

### RWSTestContext

Test ReaderWriterSet permissions:

```javascript
const rwsCtx = new RWSTestContext(principalsRegistry);

// Grant permissions
rwsCtx.grantWrite(kernelPkr, workspacePkr, userPkr);

// Verify permissions
expect(rwsCtx.canWrite(workspacePkr, userPkr)).toBe(true);
expect(rwsCtx.canRead(workspacePkr, userPkr)).toBe(true);

// Get permission status
const status = rwsCtx.verifyPermissions(workspacePkr, userPkr);
expect(status.canWrite).toBe(true);
```

## Complete Example

```javascript
import { describe, it, expect, beforeAll } from 'vitest';
import {
  createTestMessageSystem,
  createTestMessage,
  processMessageImmediately,
  KernelTestContext,
  ProfileTestContext,
  expectSuccess,
  expectPermissionDenied,
  extractData,
  createMockPkr
} from 'mycelia-kernel-v2/utils/test-utils.mycelia.js';

describe('WorkspaceSubsystem with Security', () => {
  let messageSystem, kernelCtx, profileCtx;
  let teacherPkr, studentPkr;

  beforeAll(async () => {
    messageSystem = await createTestMessageSystem();
    kernelCtx = KernelTestContext.fromMessageSystem(messageSystem);
    profileCtx = new ProfileTestContext(kernelCtx.kernel);
    
    // Create profiles
    profileCtx.createProfile('teacher', {
      'workspace:create': 'rwg',
      'workspace:read': 'rwg'
    });
    
    profileCtx.createProfile('student', {
      'workspace:read': 'r'
    });
    
    // Create users
    teacherPkr = createMockPkr('friend', { name: 'teacher' });
    studentPkr = createMockPkr('friend', { name: 'student' });
    
    // Apply profiles
    profileCtx.applyProfileToPrincipal('teacher', teacherPkr);
    profileCtx.applyProfileToPrincipal('student', studentPkr);
  });

  it('should allow teacher to create workspace', async () => {
    const message = createTestMessage('workspace://create', {
      name: 'Teacher Workspace'
    });
    
    const result = await processMessageImmediately(
      kernelCtx.kernel,
      teacherPkr,
      message
    );
    
    expectSuccess(result);
    const workspace = extractData(result, ['data.workspace', 'workspace']);
    expect(workspace.name).toBe('Teacher Workspace');
  });

  it('should deny student from creating workspace', async () => {
    const message = createTestMessage('workspace://create', {
      name: 'Student Workspace'
    });
    
    await expectPermissionDenied(
      () => processMessageImmediately(kernelCtx.kernel, studentPkr, message),
      { errorPattern: /Permission denied|scope/ }
    );
  });
});
```

## API Reference

See the individual files for detailed API documentation:
- `core/kernel-test-context.mycelia.js` - KernelTestContext class
- `core/result-assertions.mycelia.js` - Result assertion functions
- `core/permission-helpers.mycelia.js` - Permission testing functions
- `contexts/profile-test-context.mycelia.js` - ProfileTestContext class
- `contexts/router-test-context.mycelia.js` - RouterTestContext class
- `contexts/rws-test-context.mycelia.js` - RWSTestContext class

