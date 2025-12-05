# Test Examples

Complete, working examples of testing Mycelia Kernel subsystems.

## Example 1: Basic Subsystem Test

```javascript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  createTestMessageSystem,
  createTestSubsystem,
  createMockPkr,
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

  beforeAll(async () => {
    messageSystem = await createTestMessageSystem();
    kernel = messageSystem.getKernel();

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

    userPkr = createMockPkr('friend', { name: 'test-user' });
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

## Example 2: Testing with Authentication

```javascript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  createTestMessageSystem,
  createTestSubsystem,
  createTestUser,
  createTestMessage,
  processMessageImmediately,
  cleanupTestResources
} from 'mycelia-kernel-v2/utils/test-utils.mycelia.js';
import { AuthSubsystem } from 'mycelia-kernel-v2';
import { WorkspaceSubsystem } from './workspace.subsystem.mycelia.js';
import { userPkrMapping } from './lib/user-pkr-mapping.mycelia.js';

describe('WorkspaceSubsystem with Auth', () => {
  let messageSystem;
  let kernel;
  let userPkr;
  let userId;

  beforeAll(async () => {
    messageSystem = await createTestMessageSystem();
    kernel = messageSystem.getKernel();

    // Register auth subsystem
    await createTestSubsystem(
      messageSystem,
      'auth',
      AuthSubsystem,
      {
        storage: {
          backend: 'prisma',
          prisma: { client: prismaClient }
        }
      }
    );

    // Register workspace subsystem
    await createTestSubsystem(
      messageSystem,
      'workspace',
      WorkspaceSubsystem,
      {
        prisma: { client: prismaClient }
      }
    );

    // Create test user
    const userData = await createTestUser(
      messageSystem,
      {
        username: 'testuser',
        email: 'test@example.com',
        password: 'TestPassword123!',
        metadata: { role: 'teacher' }
      },
      userPkrMapping
    );

    userPkr = userData.pkr;
    userId = userData.userId;
  });

  afterAll(async () => {
    await cleanupTestResources(messageSystem);
  });

  it('should create workspace for authenticated user', async () => {
    const message = createTestMessage('workspace://create', {
      name: 'Test Workspace'
    });

    const result = await processMessageImmediately(
      kernel,
      userPkr,
      message
    );

    expect(result.success).toBe(true);
    expect(result.data.ownerId).toBe(userId);
  });
});
```

## Example 3: Testing Permissions

```javascript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  createTestMessageSystem,
  createTestSubsystem,
  createTestUser,
  createMockPkr,
  createTestMessage,
  processMessageImmediately,
  cleanupTestResources
} from 'mycelia-kernel-v2/utils/test-utils.mycelia.js';
import { userPkrMapping } from './lib/user-pkr-mapping.mycelia.js';

describe('Workspace Permissions', () => {
  let messageSystem;
  let kernel;
  let teacherPkr;
  let studentPkr;
  let workspaceId;

  beforeAll(async () => {
    messageSystem = await createTestMessageSystem();
    kernel = messageSystem.getKernel();

    // Setup subsystems and users...
    const teacherData = await createTestUser(
      messageSystem,
      {
        username: 'teacher',
        email: 'teacher@example.com',
        password: 'Password123!',
        metadata: { role: 'teacher' }
      },
      userPkrMapping
    );
    teacherPkr = teacherData.pkr;

    const studentData = await createTestUser(
      messageSystem,
      {
        username: 'student',
        email: 'student@example.com',
        password: 'Password123!',
        metadata: { role: 'student' }
      },
      userPkrMapping
    );
    studentPkr = studentData.pkr;

    // Create a workspace as teacher
    const createMessage = createTestMessage('workspace://create', {
      name: 'Test Workspace'
    });
    const createResult = await processMessageImmediately(
      kernel,
      teacherPkr,
      createMessage
    );
    workspaceId = createResult.data.id;
  });

  afterAll(async () => {
    await cleanupTestResources(messageSystem);
  });

  it('should allow teacher to create workspace', async () => {
    const message = createTestMessage('workspace://create', {
      name: 'Teacher Workspace'
    });

    const result = await processMessageImmediately(
      kernel,
      teacherPkr,
      message
    );

    expect(result.success).toBe(true);
  });

  it('should deny student from creating workspace', async () => {
    const message = createTestMessage('workspace://create', {
      name: 'Student Workspace'
    });

    await expect(
      processMessageImmediately(kernel, studentPkr, message)
    ).rejects.toThrow(/Permission denied|scope/);
  });
});
```

## Example 4: Testing Error Cases

```javascript
describe('Workspace Error Handling', () => {
  let messageSystem;
  let kernel;
  let userPkr;

  beforeAll(async () => {
    messageSystem = await createTestMessageSystem();
    kernel = messageSystem.getKernel();
    userPkr = createMockPkr('friend', { name: 'test-user' });
  });

  it('should require workspace name', async () => {
    const message = createTestMessage('workspace://create', {
      // Missing name
    });

    await expect(
      processMessageImmediately(kernel, userPkr, message)
    ).rejects.toThrow(/name.*required/);
  });

  it('should handle duplicate workspace names', async () => {
    const message = createTestMessage('workspace://create', {
      name: 'Duplicate Workspace'
    });

    // Create first workspace
    await processMessageImmediately(kernel, userPkr, message);

    // Try to create duplicate (if your system prevents this)
    // await expect(
    //   processMessageImmediately(kernel, userPkr, message)
    // ).rejects.toThrow(/already exists/);
  });
});
```

## Example 5: Testing with Mocks

```javascript
import { describe, it, expect, beforeAll, vi } from 'vitest';
import {
  createTestMessageSystem,
  createMockSubsystem,
  createMockPkr
} from 'mycelia-kernel-v2/utils/test-utils.mycelia.js';

describe('Subsystem with Mocked Dependencies', () => {
  it('should use mocked storage', async () => {
    const mockStorage = createMockSubsystem('storage', {
      get: vi.fn().mockResolvedValue({ success: true, data: 'test-data' }),
      set: vi.fn().mockResolvedValue({ success: true })
    });

    // Use mockStorage in your test
    const data = await mockStorage.get('test-key');
    expect(data.data).toBe('test-data');
  });
});
```

## See Also

- [Testing Utilities](./TESTING-UTILITIES.md) - Available utilities
- [Testing Guide](./TESTING-GUIDE.md) - Comprehensive guide
- [Testing Patterns](./TESTING-PATTERNS.md) - Common patterns

