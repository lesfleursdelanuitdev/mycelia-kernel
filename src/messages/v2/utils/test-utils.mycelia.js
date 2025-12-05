/**
 * Test Utilities for Mycelia Kernel
 * 
 * Provides utilities to simplify testing of Mycelia subsystems, including:
 * - Mock PKR generators
 * - Message creation helpers
 * - Subsystem testing utilities
 * - Bootstrap helpers
 * 
 * @example
 * import { createMockPkr, createTestMessage, createTestSubsystem } from './test-utils.mycelia.js';
 * 
 * const userPkr = createMockPkr('friend', { name: 'test-user', uuid: 'user-123' });
 * const message = createTestMessage('workspace://create', { name: 'Test Workspace' });
 */

import { PKR } from '../models/security/public-key-record.mycelia.js';
import { Message } from '../models/message/message.mycelia.js';
import { MessageSystem } from '../models/message-system/message-system.v2.mycelia.js';

/**
 * Principal kinds for PKR creation
 */
export const PRINCIPAL_KINDS = {
  KERNEL: 'kernel',
  TOP_LEVEL: 'topLevel',
  CHILD: 'child',
  FRIEND: 'friend',
  RESOURCE: 'resource'
};

/**
 * Create a PKR for testing
 * 
 * **Enhanced with kernel support**: If a kernel or PrincipalRegistry is provided,
 * this will create a properly registered PKR using the kernel's PrincipalRegistry.
 * Otherwise, it creates a mock PKR (for unit tests without full system setup).
 * 
 * @param {string} kind - Principal kind (default: 'friend')
 * @param {Object} [options={}] - PKR options
 * @param {string} [options.name] - Name (optional)
 * @param {Object} [options.metadata] - Metadata object (optional)
 * @param {KernelSubsystem|PrincipalRegistry|MessageSystem} [options.kernel] - Kernel, PrincipalRegistry, or MessageSystem (for registered PKRs)
 * @param {PKR} [options.owner] - Owner PKR (for child/resource principals)
 * @param {string} [options.uuid] - UUID (only used for mock PKRs, auto-generated if not provided)
 * @param {symbol} [options.publicKey] - Public key symbol (only used for mock PKRs, auto-generated if not provided)
 * @param {symbol} [options.minter] - Minter key (only used for mock PKRs, optional)
 * @param {string} [options.expiration='1 week'] - Expiration time
 * @returns {PKR} PKR instance (registered if kernel provided, mock otherwise)
 * 
 * @example
 * // Basic friend PKR (mock, for unit tests)
 * const userPkr = createMockPkr('friend', { name: 'test-user' });
 * 
 * @example
 * // Registered PKR using kernel (for integration tests)
 * const messageSystem = await createTestMessageSystem();
 * const kernel = messageSystem.getKernel();
 * const userPkr = createMockPkr('friend', { 
 *   name: 'test-user',
 *   kernel: kernel 
 * });
 * 
 * @example
 * // Using PrincipalRegistry directly
 * const registry = kernelCtx.principalsRegistry;
 * const userPkr = createMockPkr('friend', { 
 *   name: 'test-user',
 *   kernel: registry 
 * });
 */
export function createMockPkr(kind = PRINCIPAL_KINDS.FRIEND, options = {}) {
  const {
    name = null,
    metadata = null,
    kernel = null,
    owner = null,
    uuid = null,
    publicKey = null,
    minter = null,
    expiration = '1 week'
  } = options;

  // If kernel/registry is provided, create a registered PKR
  if (kernel) {
    let registry = null;
    
    // Try to get PrincipalRegistry from various sources
    if (kernel.registry && typeof kernel.registry.createPrincipal === 'function') {
      // It's a PrincipalRegistry
      registry = kernel;
    } else if (kernel.find && typeof kernel.find === 'function') {
      // It's a KernelSubsystem or MessageSystem - try to get AccessControl
      const accessControl = kernel.getAccessControl?.() || kernel.find('access-control');
      if (accessControl) {
        const principalsFacet = accessControl.find('principals');
        if (principalsFacet && principalsFacet.registry) {
          registry = principalsFacet.registry;
        }
      }
    } else if (kernel.getKernel && typeof kernel.getKernel === 'function') {
      // It's a MessageSystem - get kernel first
      const kernelInstance = kernel.getKernel();
      if (kernelInstance) {
        const accessControl = kernelInstance.getAccessControl?.();
        if (accessControl) {
          const principalsFacet = accessControl.find('principals');
          if (principalsFacet && principalsFacet.registry) {
            registry = principalsFacet.registry;
          }
        }
      }
    }

    // If we have a registry, create a registered principal
    if (registry && typeof registry.createPrincipal === 'function') {
      try {
        return registry.createPrincipal(kind, {
          name,
          metadata,
          owner
        });
      } catch (err) {
        // If registration fails, fall back to mock PKR
        // This can happen if kernel principal doesn't exist yet, etc.
        console.warn(`createMockPkr: Failed to create registered PKR, falling back to mock: ${err.message}`);
      }
    }
  }

  // Fall back to mock PKR (for unit tests or when kernel is not available)
  const mockUuid = uuid || `test-pkr-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  const mockPublicKey = publicKey || Symbol(`test-public-key-${mockUuid}`);
  
  const pkrOptions = {
    uuid: mockUuid,
    name,
    kind,
    publicKey: mockPublicKey,
    expiration
  };
  
  // Only include minter if it's provided (not null/undefined)
  if (minter !== undefined && minter !== null) {
    pkrOptions.minter = minter;
  }

  return new PKR(pkrOptions);
}

/**
 * Create multiple mock PKRs
 * 
 * @param {number} count - Number of PKRs to create
 * @param {string} [kind='friend'] - Principal kind
 * @param {Object} [options={}] - Base options for all PKRs
 * @returns {PKR[]} Array of mock PKRs
 * 
 * @example
 * const userPkrs = createMockPkrs(3, 'friend', { name: 'user' });
 * // Returns 3 friend PKRs with names: 'user-0', 'user-1', 'user-2'
 */
export function createMockPkrs(count, kind = PRINCIPAL_KINDS.FRIEND, options = {}) {
  const pkrs = [];
  for (let i = 0; i < count; i++) {
    const name = options.name ? `${options.name}-${i}` : null;
    pkrs.push(createMockPkr(kind, {
      ...options,
      name,
      uuid: options.uuid ? `${options.uuid}-${i}` : undefined
    }));
  }
  return pkrs;
}

/**
 * Create a test message
 * 
 * @param {string} path - Message path
 * @param {any} [body={}] - Message body
 * @param {Object} [meta={}] - Message metadata
 * @returns {Message} Message instance
 * 
 * @example
 * const message = createTestMessage('workspace://create', {
 *   name: 'Test Workspace',
 *   description: 'A test workspace'
 * });
 */
export function createTestMessage(path, body = {}, meta = {}) {
  return new Message(path, body, meta);
}

/**
 * Create a test message with processImmediately flag
 * 
 * @param {string} path - Message path
 * @param {any} [body={}] - Message body
 * @param {Object} [meta={}] - Message metadata
 * @returns {Message} Message instance with processImmediately flag
 * 
 * @example
 * const message = createImmediateMessage('workspace://create', { name: 'Test' });
 * // Message will be processed immediately, bypassing queue
 */
export function createImmediateMessage(path, body = {}, meta = {}) {
  const message = new Message(path, body, meta);
  // Set processImmediately flag in mutable metadata
  if (message.meta && typeof message.meta.updateMutable === 'function') {
    message.meta.updateMutable({ processImmediately: true });
  }
  return message;
}

/**
 * Create a test MessageSystem for testing
 * 
 * @param {Object} [options={}] - MessageSystem options
 * @param {string} [options.name='test-app'] - System name
 * @param {boolean} [options.debug=true] - Enable debug mode
 * @returns {Promise<MessageSystem>} Bootstrapped MessageSystem instance
 * 
 * @example
 * const messageSystem = await createTestMessageSystem();
 * const subsystem = await createTestSubsystem(messageSystem, 'test', TestSubsystem);
 */
export async function createTestMessageSystem(options = {}) {
  const {
    name = 'test-app',
    debug = true
  } = options;

  const messageSystem = new MessageSystem(name, { debug });
  await messageSystem.bootstrap();

  // Set kernel on messageSystemRouter
  // Get kernel from router (MessageSystem doesn't expose getKernel directly)
  const routerFacet = messageSystem.find('messageSystemRouter');
  if (routerFacet) {
    const kernel = routerFacet.getKernel?.() || routerFacet._kernel || null;
    if (kernel) {
      routerFacet.setKernel(kernel);
      kernel.setMsRouter?.(routerFacet);
    }
  }

  return messageSystem;
}

/**
 * Create and register a test subsystem
 * 
 * @param {MessageSystem} messageSystem - MessageSystem instance
 * @param {string} name - Subsystem name
 * @param {typeof BaseSubsystem} SubsystemClass - Subsystem class
 * @param {Object} [config={}] - Subsystem configuration
 * @returns {Promise<BaseSubsystem>} Registered subsystem instance
 * 
 * @example
 * const workspaceSubsystem = await createTestSubsystem(
 *   messageSystem,
 *   'workspace',
 *   WorkspaceSubsystem,
 *   { prisma: { client: prismaClient } }
 * );
 */
export async function createTestSubsystem(messageSystem, name, SubsystemClass, config = {}) {
  const subsystem = new SubsystemClass(name, {
    ms: messageSystem,
    config,
    debug: messageSystem.debug
  });

  await messageSystem.registerSubsystem(subsystem);
  return subsystem;
}

/**
 * Extract handler result from routing result
 * Handles nested result structures from message routing
 * 
 * @param {Object} routingResult - Result from message routing
 * @returns {any} Extracted handler result
 * 
 * @example
 * const routingResult = await kernel.sendProtected(pkr, message);
 * const handlerResult = extractHandlerResult(routingResult);
 */
export function extractHandlerResult(routingResult) {
  if (!routingResult) {
    return null;
  }

  // If routing failed, return the error result
  if (!routingResult.success) {
    return routingResult;
  }

  // Unwrap nested result structure: routingResult.result.result
  const routeResult = routingResult.result;
  if (!routeResult) {
    return routingResult;
  }

  // If routeResult has a result property, that's the handler result
  if (routeResult.result !== undefined) {
    return routeResult.result;
  }

  // If routeResult has processed: true, it was processed immediately
  if (routeResult.processed === true) {
    return routeResult.result || routeResult;
  }

  // Otherwise return the routeResult
  return routeResult;
}

/**
 * Process a message immediately using kernel.sendProtected
 * 
 * @param {KernelSubsystem} kernel - Kernel subsystem instance
 * @param {PKR} callerPkr - Caller's PKR
 * @param {Message} message - Message to process
 * @returns {Promise<any>} Handler result
 * 
 * @example
 * const result = await processMessageImmediately(
 *   kernel,
 *   userPkr,
 *   createTestMessage('workspace://create', { name: 'Test' })
 * );
 */
export async function processMessageImmediately(kernel, callerPkr, message) {
  // Mark message to be processed immediately
  if (message && message.meta && typeof message.meta.updateMutable === 'function') {
    message.meta.updateMutable({ processImmediately: true });
  }

  // Use kernel.sendProtected to ensure proper authentication
  const routingResult = await kernel.sendProtected(callerPkr, message);
  return extractHandlerResult(routingResult);
}

/**
 * Create a test user with PKR mapping
 * Useful for testing subsystems that require user authentication
 * 
 * @param {MessageSystem} messageSystem - MessageSystem instance
 * @param {Object} userData - User data
 * @param {string} userData.username - Username
 * @param {string} userData.email - Email
 * @param {string} userData.password - Password
 * @param {Object} [userData.metadata={}] - User metadata
 * @param {Object} [pkrMapping] - PKR mapping object (optional, for storing mapping)
 * @returns {Promise<{user: Object, pkr: PKR, userId: string}>} User data with PKR
 * 
 * @example
 * const { user, pkr, userId } = await createTestUser(messageSystem, {
 *   username: 'testuser',
 *   email: 'test@example.com',
 *   password: 'TestPassword123!',
 *   metadata: { role: 'teacher' }
 * }, userPkrMapping);
 */
export async function createTestUser(messageSystem, userData, pkrMapping = null) {
  const registry = messageSystem.find('messageSystemRegistry');
  const authSubsystem = registry ? registry.get('auth') : null;
  if (!authSubsystem) {
    throw new Error('AuthSubsystem not found. Ensure auth subsystem is registered.');
  }
  const messagesFacet = messageSystem.find('messages');
  
  if (!messagesFacet) {
    throw new Error('Messages facet not found');
  }

  // Create registration message
  const registerMessage = messagesFacet.create('auth://register', userData);
  
  // Process registration
  const processorFacet = authSubsystem.find('processor');
  if (!processorFacet) {
    throw new Error('Processor facet not found on authSubsystem');
  }

  const registerResult = await processorFacet.processMessage(registerMessage);

  if (!registerResult.success) {
    throw new Error(`User registration failed: ${registerResult.error?.message || JSON.stringify(registerResult)}`);
  }

  // Extract user data
  const user = registerResult.data?.user || registerResult.user;
  const userId = user?.id || registerResult.data?.id;
  
  if (!userId) {
    throw new Error(`User ID not found in registration result: ${JSON.stringify(registerResult, null, 2)}`);
  }

  // Extract PKR from friend or create mock
  let pkr = null;
  const friend = registerResult.data?.friend || registerResult.friend;
  if (friend) {
    pkr = friend.pkr || friend.identity?.pkr;
  }

  // If no PKR from friend, create mock PKR
  if (!pkr) {
    pkr = createMockPkr(PRINCIPAL_KINDS.FRIEND, {
      uuid: `test-pkr-${userId}`,
      name: userData.username
    });
  }

  // Extract role
  const role = user?.metadata?.role || user?.role || userData.metadata?.role || 'student';

  // Store mapping if provided
  if (pkrMapping && typeof pkrMapping.setMapping === 'function') {
    pkrMapping.setMapping(pkr, userId, role);
  }

  return {
    user,
    pkr,
    userId,
    role
  };
}

/**
 * Wait for a condition to be true
 * Useful for testing async operations
 * 
 * @param {Function} condition - Function that returns true when condition is met
 * @param {Object} [options={}] - Options
 * @param {number} [options.timeout=5000] - Timeout in milliseconds
 * @param {number} [options.interval=100] - Check interval in milliseconds
 * @returns {Promise<void>}
 * @throws {Error} If timeout is reached
 * 
 * @example
 * await waitFor(() => subsystem.find('router') !== null);
 */
export async function waitFor(condition, options = {}) {
  const {
    timeout = 5000,
    interval = 100
  } = options;

  const startTime = Date.now();

  while (true) {
    if (await condition()) {
      return;
    }

    if (Date.now() - startTime > timeout) {
      throw new Error(`waitFor timeout after ${timeout}ms`);
    }

    await new Promise(resolve => setTimeout(resolve, interval));
  }
}

/**
 * Create a mock subsystem for testing
 * Useful for testing subsystems that depend on other subsystems
 * 
 * @param {string} name - Subsystem name
 * @param {Object} [facets={}] - Facets to add to the mock
 * @returns {Object} Mock subsystem object
 * 
 * @example
 * const mockSubsystem = createMockSubsystem('storage', {
 *   get: async (key) => ({ success: true, data: mockData[key] }),
 *   set: async (key, value) => ({ success: true })
 * });
 */
export function createMockSubsystem(name, facets = {}) {
  const mockSubsystem = {
    name,
    find: (facetName) => facets[facetName] || null,
    has: (facetName) => facetName in facets
  };

  // Add facets as properties
  for (const [facetName, facet] of Object.entries(facets)) {
    mockSubsystem[facetName] = facet;
  }

  return mockSubsystem;
}

/**
 * Cleanup test resources
 * Disposes MessageSystem and cleans up resources
 * 
 * @param {MessageSystem} messageSystem - MessageSystem instance to dispose
 * @returns {Promise<void>}
 * 
 * @example
 * afterAll(async () => {
 *   await cleanupTestResources(messageSystem);
 * });
 */
export async function cleanupTestResources(messageSystem) {
  if (messageSystem && typeof messageSystem.dispose === 'function') {
    await messageSystem.dispose();
  }
}

// ============================================================================
// Result Assertion Helpers
// ============================================================================

/**
 * Assert that a result is successful
 * 
 * @param {any} result - Result object to check
 * @param {string} [message] - Custom error message
 * @throws {Error} If result is not defined or not successful
 * 
 * @example
 * const result = await processMessageImmediately(kernel, pkr, message);
 * expectSuccess(result);
 */
export function expectSuccess(result, message = 'Expected result to be successful') {
  if (result === null || result === undefined) {
    throw new Error(`${message}: result is null or undefined`);
  }
  if (result.success === false) {
    const errorMsg = result.error?.message || result.error || 'Unknown error';
    throw new Error(`${message}: ${errorMsg}`);
  }
  if (result.success !== true && result.success !== undefined) {
    throw new Error(`${message}: result.success is ${result.success}`);
  }
}

/**
 * Assert that a result failed
 * 
 * @param {any} result - Result object to check
 * @param {string|RegExp} [expectedError] - Expected error message or pattern
 * @param {string} [message] - Custom error message
 * @throws {Error} If result is successful or doesn't match expected error
 * 
 * @example
 * const result = await processMessageImmediately(kernel, pkr, message);
 * expectFailure(result, /Permission denied/);
 */
export function expectFailure(result, expectedError = null, message = 'Expected result to fail') {
  if (result === null || result === undefined) {
    throw new Error(`${message}: result is null or undefined`);
  }
  if (result.success === true) {
    throw new Error(`${message}: result was successful but expected failure`);
  }
  if (expectedError) {
    const errorMsg = result.error?.message || result.error || String(result);
    if (typeof expectedError === 'string') {
      if (!errorMsg.includes(expectedError)) {
        throw new Error(`${message}: expected error "${expectedError}" but got "${errorMsg}"`);
      }
    } else if (expectedError instanceof RegExp) {
      if (!expectedError.test(errorMsg)) {
        throw new Error(`${message}: error "${errorMsg}" does not match pattern ${expectedError}`);
      }
    }
  }
}

/**
 * Extract data from result with multiple fallback paths
 * 
 * @param {any} result - Result object
 * @param {string[]|string} paths - Array of paths to try, or single path string
 * @returns {any} Extracted data, or null if not found
 * 
 * @example
 * const workspace = extractData(result, ['data.workspace', 'workspace', 'data']);
 * const id = extractData(result, 'data.id');
 */
export function extractData(result, paths) {
  if (!result) return null;
  
  const pathArray = Array.isArray(paths) ? paths : [paths];
  
  for (const path of pathArray) {
    if (!path) continue;
    
    const parts = path.split('.');
    let value = result;
    
    for (const part of parts) {
      if (value === null || value === undefined) break;
      value = value[part];
    }
    
    if (value !== null && value !== undefined) {
      return value;
    }
  }
  
  return null;
}

/**
 * Assert data at path matches expected value
 * 
 * @param {any} result - Result object
 * @param {string|string[]} path - Path to data (or array of fallback paths)
 * @param {any} expected - Expected value or matcher function
 * @param {string} [message] - Custom error message
 * @throws {Error} If data doesn't match
 * 
 * @example
 * expectData(result, 'data.workspace.name', 'Test Workspace');
 * expectData(result, ['data.workspace', 'workspace'], (w) => w.name === 'Test');
 */
export function expectData(result, path, expected, message = null) {
  const data = extractData(result, path);
  
  if (data === null || data === undefined) {
    const pathStr = Array.isArray(path) ? path.join(' or ') : path;
    throw new Error(message || `Expected data at path "${pathStr}" but found null/undefined`);
  }
  
  if (typeof expected === 'function') {
    if (!expected(data)) {
      throw new Error(message || `Data at path "${path}" did not match predicate`);
    }
  } else {
    // Use deep equality check (simple version)
    if (JSON.stringify(data) !== JSON.stringify(expected)) {
      throw new Error(message || `Expected ${JSON.stringify(expected)} but got ${JSON.stringify(data)}`);
    }
  }
}

/**
 * Extract ID from result
 * 
 * @param {any} result - Result object
 * @param {string[]|string} [paths] - Optional paths to try (default: common ID paths)
 * @returns {string|null} Extracted ID
 * 
 * @example
 * const id = extractId(result);
 * const id = extractId(result, ['data.workspace.id', 'workspace.id', 'id']);
 */
export function extractId(result, paths = null) {
  const defaultPaths = [
    'data.id',
    'id',
    'data.workspace.id',
    'workspace.id',
    'data.user.id',
    'user.id'
  ];
  
  return extractData(result, paths || defaultPaths);
}

/**
 * Extract error message from result
 * 
 * @param {any} result - Result object
 * @returns {string|null} Error message
 * 
 * @example
 * const error = extractError(result);
 */
export function extractError(result) {
  if (!result) return null;
  
  if (result.error) {
    if (typeof result.error === 'string') return result.error;
    if (result.error.message) return result.error.message;
    return String(result.error);
  }
  
  if (result.message) return result.message;
  
  return null;
}

// ============================================================================
// Permission Testing Helpers
// ============================================================================

/**
 * Assert that an operation is denied (permission error)
 * 
 * @param {Function} fn - Async function to execute
 * @param {Object} [options={}] - Options
 * @param {string|RegExp} [options.errorPattern] - Expected error pattern
 * @param {string} [options.message] - Custom error message
 * @returns {Promise<void>}
 * @throws {Error} If operation succeeds or error doesn't match pattern
 * 
 * @example
 * await expectPermissionDenied(
 *   () => processMessageImmediately(kernel, studentPkr, message),
 *   { errorPattern: /Permission denied|scope/ }
 * );
 */
export async function expectPermissionDenied(fn, options = {}) {
  const {
    errorPattern = /Permission denied|Access denied|Not authorized|scope|Forbidden/i,
    message = 'Expected operation to be denied'
  } = options;
  
  try {
    const result = await fn();
    
    // If it didn't throw, check if result indicates failure
    if (result && result.success === false) {
      const errorMsg = extractError(result);
      if (errorPattern && !errorPattern.test(errorMsg || '')) {
        throw new Error(`${message}: operation failed but error "${errorMsg}" doesn't match pattern ${errorPattern}`);
      }
      return; // Successfully denied
    }
    
    // If we got here, operation succeeded when it shouldn't have
    throw new Error(`${message}: operation succeeded but expected permission denial`);
  } catch (error) {
    // Check if error matches pattern
    const errorMsg = error.message || String(error);
    if (errorPattern && !errorPattern.test(errorMsg)) {
      throw new Error(`${message}: got error "${errorMsg}" but expected pattern ${errorPattern}`);
    }
    // Error matches pattern, test passes
  }
}

/**
 * Assert that an operation is granted (succeeds)
 * 
 * @param {Function} fn - Async function to execute
 * @param {Object} [options={}] - Options
 * @param {string} [options.message] - Custom error message
 * @returns {Promise<any>} Result of the operation
 * @throws {Error} If operation fails
 * 
 * @example
 * const result = await expectAccessGranted(
 *   () => processMessageImmediately(kernel, userPkr, message)
 * );
 */
export async function expectAccessGranted(fn, options = {}) {
  const {
    message = 'Expected operation to be granted'
  } = options;
  
  try {
    const result = await fn();
    
    if (result && result.success === false) {
      const errorMsg = extractError(result);
      throw new Error(`${message}: operation failed with "${errorMsg}"`);
    }
    
    return result;
  } catch (error) {
    if (error.message && error.message.includes(message)) {
      throw error; // Re-throw our custom error
    }
    throw new Error(`${message}: operation threw error: ${error.message || error}`);
  }
}

/**
 * Assert that a specific scope is required
 * 
 * @param {string} scope - Expected scope name
 * @param {Function} fn - Async function to execute
 * @param {Object} [options={}] - Options
 * @returns {Promise<void>}
 * @throws {Error} If operation succeeds or wrong scope error
 * 
 * @example
 * await expectScopeRequired(
 *   'workspace:create',
 *   () => processMessageImmediately(kernel, studentPkr, message)
 * );
 */
export async function expectScopeRequired(scope, fn, options = {}) {
  const {
    message = `Expected scope "${scope}" to be required`
  } = options;
  
  const scopePattern = new RegExp(scope.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  
  await expectPermissionDenied(fn, {
    errorPattern: scopePattern,
    message
  });
}

// ============================================================================
// Re-export new test utilities from test-utils directory
// ============================================================================

// Core utilities
export { KernelTestContext } from './test-utils/core/kernel-test-context.mycelia.js';

// Context utilities
export { ProfileTestContext } from './test-utils/contexts/profile-test-context.mycelia.js';
export { RouterTestContext } from './test-utils/contexts/router-test-context.mycelia.js';
export { RWSTestContext } from './test-utils/contexts/rws-test-context.mycelia.js';

