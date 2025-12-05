# Testing Utilities Plan for Core Package

This document outlines the testing utilities that should be created for the `@mycelia-kernel` package, based on patterns from `math-whiteboard` and identified testing needs.

## Current State

### Existing Utilities (in core)
- ✅ `createMockPkr()` - Create mock PKRs
- ✅ `createTestMessage()` - Create test messages
- ✅ `createTestMessageSystem()` - Bootstrap test MessageSystem
- ✅ `createTestSubsystem()` - Create and register test subsystems
- ✅ `processMessageImmediately()` - Process messages synchronously
- ✅ `waitFor()` - Wait for conditions
- ✅ `cleanupTestResources()` - Cleanup test resources

### Missing Utilities (needed)
- ❌ `KernelTestContext` - Validated kernel access and identity operations
- ❌ Result assertion helpers (`expectSuccess`, `expectFailure`, `extractData`)
- ❌ Permission testing helpers (`expectPermissionDenied`, etc.)
- ❌ Profile testing utilities
- ❌ Router/scope testing utilities
- ❌ RWS testing utilities

---

## 1. KernelTestContext

### Purpose
Provides validated, consistent access to kernel and its services for testing. Based on the utility from `math-whiteboard` but adapted for core package.

### API Design

```javascript
class KernelTestContext {
  // Static factory
  static fromMessageSystem(messageSystem): KernelTestContext
  
  // Getters (validated)
  get kernel(): KernelSubsystem
  get identity(): Identity
  get pkr(): PKR
  get accessControl(): AccessControlSubsystem
  get principalsRegistry(): PrincipalRegistry
  get profileRegistry(): ProfileRegistrySubsystem
  
  // Validation
  verifyIdentity(): ValidationResult
  
  // RWS Operations
  getSubsystemRWS(subsystemName: string): ReaderWriterSet
  grantPermissionOnSubsystem(subsystemName: string, userPkr: PKR, permission: 'r' | 'rw' | 'rwg'): boolean
  canResolvePKR(pkr: PKR): boolean
  isKernel(pkr: PKR): boolean
  
  // Subsystem Access
  getSubsystem(name: string): BaseSubsystem | null
  getTopLevelSubsystems(): BaseSubsystem[]
}
```

### Use Cases
- Validating kernel identity setup
- Testing RWS permissions
- Testing profile application
- Testing scope checking
- Kernel PKR consistency checks

### Example Usage
```javascript
const ctx = KernelTestContext.fromMessageSystem(messageSystem);

// Verify kernel is properly set up
const validation = ctx.verifyIdentity();
expect(validation.success).toBe(true);

// Get subsystem RWS
const workspaceRws = ctx.getSubsystemRWS('workspace');

// Grant permissions
ctx.grantPermissionOnSubsystem('workspace', userPkr, 'rw');
```

---

## 2. Result Assertion Helpers

### Purpose
Simplify common result assertion patterns that appear in every test.

### API Design

```javascript
// Success/Failure Assertions
expectSuccess(result: any, message?: string): void
expectFailure(result: any, expectedError?: RegExp | string, message?: string): void

// Data Extraction
extractData(result: any, paths: string[]): any
extractId(result: any, paths?: string[]): string | null
extractError(result: any): string | null

// Data Assertions
expectData(result: any, path: string, matcher: any): void
expectDataPath(result: any, path: string): void
```

### Use Cases
- Asserting message processing results
- Extracting data with fallback paths
- Validating result structure

### Example Usage
```javascript
const result = await processMessageImmediately(kernel, userPkr, message);
expectSuccess(result);

const workspace = extractData(result, ['data.workspace', 'workspace']);
expect(workspace.name).toBe('Test Workspace');

const workspaceId = extractId(result, ['data.workspace.id', 'workspace.id']);
```

---

## 3. Permission Testing Helpers

### Purpose
Simplify testing permission checks and access control.

### API Design

```javascript
// Permission Assertions
expectPermissionDenied(
  fn: () => Promise<any>,
  options?: {
    errorPattern?: RegExp
    message?: string
  }
): Promise<void>

expectAccessGranted(
  fn: () => Promise<any>,
  options?: {
    message?: string
  }
): Promise<void>

expectScopeRequired(
  scope: string,
  fn: () => Promise<any>,
  options?: {
    errorPattern?: RegExp
  }
): Promise<void>
```

### Use Cases
- Testing scope-based permissions
- Testing RWS permissions
- Testing role-based access

### Example Usage
```javascript
// Test permission denial
await expectPermissionDenied(
  () => processMessageImmediately(kernel, studentPkr, createMessage),
  { errorPattern: /Permission denied|scope/ }
);

// Test access granted
await expectAccessGranted(
  () => processMessageImmediately(kernel, teacherPkr, createMessage)
);
```

---

## 4. ProfileTestContext

### Purpose
Utilities for testing security profiles and profile application.

### API Design

```javascript
class ProfileTestContext {
  constructor(kernel: KernelSubsystem)
  
  // Profile Management
  createProfile(name: string, grants: object | Map, metadata?: object): SecurityProfile
  getProfile(name: string): SecurityProfile | null
  listProfiles(): string[]
  
  // Profile Application
  applyProfileToPrincipal(profileName: string, principalPkr: PKR): ApplicationResult
  removeProfileFromPrincipal(profileName: string, principalPkr: PKR): RemovalResult
  
  // Profile Validation
  verifyProfileExists(name: string): boolean
  verifyProfileGrants(name: string, scope: string): string | null
  verifyProfileApplied(profileName: string, principalPkr: PKR): boolean
}
```

### Use Cases
- Testing profile creation and management
- Testing profile application to principals
- Testing profile-based permissions

### Example Usage
```javascript
const profileCtx = new ProfileTestContext(kernel);

// Create and apply profile
const profile = profileCtx.createProfile('teacher', {
  'workspace:create': 'rwg',
  'workspace:read': 'rwg'
});

const result = profileCtx.applyProfileToPrincipal('teacher', userPkr);
expect(result.success).toBe(true);
```

---

## 5. RouterTestContext

### Purpose
Utilities for testing router functionality, especially scope checking.

### API Design

```javascript
class RouterTestContext {
  constructor(subsystem: BaseSubsystem)
  
  // Route Registration
  registerRoute(path: string, handler: Function, metadata?: object): boolean
  registerRouteWithScope(path: string, handler: Function, scope: string, required: string): boolean
  
  // Route Testing
  testRoute(path: string, callerPkr: PKR, body?: any): Promise<any>
  testRouteWithScope(path: string, callerPkr: PKR, scope: string, body?: any): Promise<any>
  
  // Scope Checking
  verifyScopeCheck(path: string, callerPkr: PKR, scope: string): boolean
  verifyScopeDenied(path: string, callerPkr: PKR, scope: string): boolean
  
  // Route Inspection
  hasRoute(path: string): boolean
  getRouteMetadata(path: string): object | null
}
```

### Use Cases
- Testing route registration
- Testing scope checking
- Testing permission-based routing

### Example Usage
```javascript
const routerCtx = new RouterTestContext(workspaceSubsystem);

// Register route with scope
routerCtx.registerRouteWithScope(
  'workspace://create',
  async (msg) => ({ success: true }),
  'workspace:create',
  'write'
);

// Test scope checking
const hasAccess = routerCtx.verifyScopeCheck('workspace://create', teacherPkr, 'workspace:create');
expect(hasAccess).toBe(true);
```

---

## 6. RWSTestContext

### Purpose
Utilities for testing ReaderWriterSet permissions.

### API Design

```javascript
class RWSTestContext {
  constructor(principalsRegistry: PrincipalRegistry)
  
  // RWS Creation
  createRWS(ownerPkr: PKR): ReaderWriterSet
  
  // Permission Checking
  canRead(ownerPkr: PKR, granteePkr: PKR): boolean
  canWrite(ownerPkr: PKR, granteePkr: PKR): boolean
  canGrant(ownerPkr: PKR, granteePkr: PKR): boolean
  
  // Permission Granting
  grantRead(granterPkr: PKR, ownerPkr: PKR, granteePkr: PKR): boolean
  grantWrite(granterPkr: PKR, ownerPkr: PKR, granteePkr: PKR): boolean
  
  // Permission Removal
  revokeRead(granterPkr: PKR, ownerPkr: PKR, granteePkr: PKR): boolean
  revokeWrite(granterPkr: PKR, ownerPkr: PKR, granteePkr: PKR): boolean
  
  // Validation
  verifyPermissions(ownerPkr: PKR, granteePkr: PKR): PermissionStatus
}
```

### Use Cases
- Testing RWS permissions
- Testing permission granting
- Testing permission removal

### Example Usage
```javascript
const rwsCtx = new RWSTestContext(principalsRegistry);

// Grant and verify permissions
rwsCtx.grantWrite(kernelPkr, workspacePkr, userPkr);
expect(rwsCtx.canWrite(workspacePkr, userPkr)).toBe(true);
```

---

## 7. Message Processing Test Helpers

### Purpose
Utilities for testing message processing and routing.

### API Design

```javascript
// Message Processing
processMessageWithOptions(
  kernel: KernelSubsystem,
  callerPkr: PKR,
  message: Message,
  options?: object
): Promise<any>

// Message Creation Helpers
createCommandMessage(path: string, body?: any, meta?: object): Message
createQueryMessage(path: string, body?: any, meta?: object): Message
createEventMessage(path: string, body?: any, meta?: object): Message

// Message Assertions
expectMessagePath(message: Message, expectedPath: string): void
expectMessageBody(message: Message, matcher: any): void
expectMessageMeta(message: Message, key: string, value: any): void
```

### Use Cases
- Testing different message types
- Testing message processing with options
- Validating message structure

### Example Usage
```javascript
const message = createCommandMessage('workspace://create', {
  name: 'Test Workspace'
});

expectMessagePath(message, 'workspace://create');
expectMessageBody(message, { name: 'Test Workspace' });
```

---

## 8. Test Data Factories

### Purpose
Generate consistent test data for common scenarios.

### API Design

```javascript
// User Data Factory
createUserData(overrides?: object): {
  username: string
  email: string
  password: string
  metadata?: object
}

// Profile Data Factory
createProfileData(overrides?: object): {
  name: string
  grants: object
  metadata?: object
}

// Route Data Factory
createRouteData(overrides?: object): {
  path: string
  handler: Function
  metadata?: object
}

// Message Data Factory
createMessageData(overrides?: object): {
  path: string
  body: any
  meta?: object
}
```

### Use Cases
- Generating test data with defaults
- Ensuring consistent test data structure
- Reducing boilerplate in tests

### Example Usage
```javascript
const userData = createUserData({
  username: 'testuser',
  role: 'teacher'
  // email, password auto-generated
});

const profileData = createProfileData({
  name: 'teacher',
  grants: { 'workspace:create': 'rwg' }
});
```

---

## 9. Integration Test Helpers

### Purpose
Utilities for setting up complete test scenarios.

### API Design

```javascript
// Complete Test Setup
createTestScenario(options?: {
  subsystems?: string[]
  profiles?: Array<{ name: string, grants: object }>
  users?: Array<{ username: string, role: string }>
}): Promise<TestScenario>

// Test Scenario Object
interface TestScenario {
  messageSystem: MessageSystem
  kernel: KernelSubsystem
  kernelCtx: KernelTestContext
  profileCtx: ProfileTestContext
  users: Array<{ user: object, pkr: PKR, userId: string, role: string }>
  subsystems: Map<string, BaseSubsystem>
}
```

### Use Cases
- Setting up complete test environments
- Integration testing
- End-to-end testing

### Example Usage
```javascript
const scenario = await createTestScenario({
  subsystems: ['workspace', 'auth'],
  profiles: [
    { name: 'teacher', grants: { 'workspace:create': 'rwg' } },
    { name: 'student', grants: { 'workspace:read': 'r' } }
  ],
  users: [
    { username: 'teacher1', role: 'teacher' },
    { username: 'student1', role: 'student' }
  ]
});

// Use scenario
const teacher = scenario.users.find(u => u.role === 'teacher');
const result = await processMessageImmediately(
  scenario.kernel,
  teacher.pkr,
  createTestMessage('workspace://create', { name: 'Test' })
);
```

---

## 10. Scope Checking Test Helpers

### Purpose
Utilities specifically for testing scope-based permission checking.

### API Design

```javascript
// Scope Checking Utilities
class ScopeTestContext {
  constructor(kernel: KernelSubsystem, getUserRole: Function)
  
  // Scope Validation
  verifyScopePermission(
    callerPkr: PKR,
    scope: string,
    requiredPermission: 'read' | 'write' | 'grant'
  ): boolean
  
  // Profile Scope Checking
  verifyProfileHasScope(profileName: string, scope: string): string | null
  verifyUserHasScope(userPkr: PKR, scope: string, requiredPermission: string): boolean
  
  // Scope Testing
  testScopeCheck(
    routePath: string,
    callerPkr: PKR,
    expectedResult: 'granted' | 'denied'
  ): Promise<boolean>
}
```

### Use Cases
- Testing scope checking logic
- Testing profile scope validation
- Testing user scope permissions

### Example Usage
```javascript
const scopeCtx = new ScopeTestContext(kernel, getUserRole);

// Verify user has scope
const hasScope = scopeCtx.verifyUserHasScope(
  userPkr,
  'workspace:create',
  'write'
);
expect(hasScope).toBe(true);

// Test scope check on route
const granted = await scopeCtx.testScopeCheck(
  'workspace://create',
  userPkr,
  'granted'
);
expect(granted).toBe(true);
```

---

## Implementation Priority

### Phase 1: Core Utilities (High Priority)
1. **KernelTestContext** ⭐⭐⭐
   - Most valuable for kernel and identity testing
   - Needed for useRouterWithScopes tests
   - Needed for security profile tests

2. **Result Assertion Helpers** ⭐⭐⭐
   - Used in every test
   - Reduces boilerplate significantly
   - Easy to implement

3. **Permission Testing Helpers** ⭐⭐⭐
   - Critical for security testing
   - Common pattern in tests
   - Needed for scope checking tests

### Phase 2: Specialized Contexts (Medium Priority)
4. **ProfileTestContext** ⭐⭐
   - Needed for security profile tests
   - Simplifies profile testing

5. **RouterTestContext** ⭐⭐
   - Needed for useRouterWithScopes tests
   - Simplifies router testing

6. **RWSTestContext** ⭐⭐
   - Needed for RWS permission tests
   - Simplifies permission testing

### Phase 3: Convenience Utilities (Lower Priority)
7. **Message Processing Helpers** ⭐
   - Extends existing utilities
   - Nice to have

8. **Test Data Factories** ⭐
   - Improves test consistency
   - Reduces boilerplate

9. **Integration Test Helpers** ⭐
   - For complex scenarios
   - Advanced use cases

10. **Scope Checking Test Helpers** ⭐
    - Specialized for scope testing
    - Can be part of RouterTestContext

---

## File Structure

```
src/messages/v2/utils/test-utils/
├── index.js                          # Main exports
├── core/
│   ├── kernel-test-context.mycelia.js
│   ├── result-assertions.mycelia.js
│   └── permission-helpers.mycelia.js
├── contexts/
│   ├── profile-test-context.mycelia.js
│   ├── router-test-context.mycelia.js
│   └── rws-test-context.mycelia.js
├── helpers/
│   ├── message-helpers.mycelia.js
│   ├── data-factories.mycelia.js
│   └── integration-helpers.mycelia.js
└── README.md                         # Usage documentation
```

---

## Usage Example (After Implementation)

```javascript
import {
  // Core utilities
  createTestMessageSystem,
  createTestMessage,
  processMessageImmediately,
  
  // New contexts
  KernelTestContext,
  ProfileTestContext,
  RouterTestContext,
  
  // New helpers
  expectSuccess,
  extractData,
  expectPermissionDenied,
  
  // Existing utilities
  createMockPkr
} from 'mycelia-kernel-v2/utils/test-utils.mycelia.js';

describe('WorkspaceSubsystem with Scopes', () => {
  let messageSystem, kernelCtx, profileCtx, routerCtx;
  let teacherPkr, studentPkr;

  beforeAll(async () => {
    messageSystem = await createTestMessageSystem();
    kernelCtx = KernelTestContext.fromMessageSystem(messageSystem);
    profileCtx = new ProfileTestContext(kernelCtx.kernel);
    routerCtx = new RouterTestContext(workspaceSubsystem);
    
    // Create profiles
    profileCtx.createProfile('teacher', {
      'workspace:create': 'rwg',
      'workspace:read': 'rwg'
    });
    
    profileCtx.createProfile('student', {
      'workspace:read': 'r'
    });
    
    // Create users and apply profiles
    const teacher = await createTestUser(messageSystem, {
      username: 'teacher',
      email: 'teacher@example.com',
      password: 'Password123!',
      metadata: { role: 'teacher' }
    });
    teacherPkr = teacher.pkr;
    profileCtx.applyProfileToPrincipal('teacher', teacherPkr);
    
    const student = await createTestUser(messageSystem, {
      username: 'student',
      email: 'student@example.com',
      password: 'Password123!',
      metadata: { role: 'student' }
    });
    studentPkr = student.pkr;
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

  it('should verify scope checking works', async () => {
    const hasAccess = routerCtx.verifyScopeCheck(
      'workspace://create',
      teacherPkr,
      'workspace:create'
    );
    expect(hasAccess).toBe(true);
    
    const denied = routerCtx.verifyScopeDenied(
      'workspace://create',
      studentPkr,
      'workspace:create'
    );
    expect(denied).toBe(true);
  });
});
```

---

## Benefits

1. **Reduced Boilerplate**: Common patterns become one-liners
2. **Consistency**: All tests use same utilities
3. **Readability**: Tests are more declarative
4. **Maintainability**: Changes to patterns only need updates in utilities
5. **Documentation**: Utilities serve as examples
6. **Type Safety**: Can add TypeScript types later

---

## Next Steps

1. **Start with Phase 1**: Implement KernelTestContext, result assertions, and permission helpers
2. **Use in Tests**: Update existing tests to use new utilities
3. **Iterate**: Add Phase 2 utilities based on needs
4. **Document**: Create comprehensive usage documentation

