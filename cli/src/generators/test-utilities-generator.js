/**
 * Test Utilities Generator
 * Generates testing utilities (mock facets, mock subsystems, test helpers)
 */

import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { createDirectory } from '../utils/file-utils.js';

export async function generateTestUtilities(options = {}) {
  const cwd = process.cwd();
  const testUtilsDir = join(cwd, 'src', 'test-utils');

  console.log('Generating test utilities...');

  // Create directory
  if (!existsSync(testUtilsDir)) {
    mkdirSync(testUtilsDir, { recursive: true });
  }

  // Generate mock facets
  const mockFacetsContent = generateMockFacets();
  writeFileSync(join(testUtilsDir, 'mock-facets.mycelia.js'), mockFacetsContent);

  // Generate mock subsystems
  const mockSubsystemsContent = generateMockSubsystems();
  writeFileSync(join(testUtilsDir, 'mock-subsystems.mycelia.js'), mockSubsystemsContent);

  // Generate test helpers
  const testHelpersContent = generateTestHelpers();
  writeFileSync(join(testUtilsDir, 'test-helpers.mycelia.js'), testHelpersContent);

  // Generate index file
  const indexContent = generateIndex();
  writeFileSync(join(testUtilsDir, 'index.mycelia.js'), indexContent);

  console.log(`✅ Test utilities generated: ${testUtilsDir}`);
}

function generateMockFacets() {
  return `/**
 * Mock Facets
 * 
 * Utilities for creating mock facets for testing.
 * Use these when you need to test subsystems without full hook implementations.
 */

import { Facet } from '../../mycelia-kernel-v2/models/facet-manager/facet.mycelia.js';

/**
 * Create a mock router facet
 * @param {Object} [options={}] - Mock options
 * @returns {Facet} Mock router facet
 */
export function createMockRouterFacet(options = {}) {
  const routes = new Map();
  const registeredRoutes = [];

  return new Facet('router', { attach: true, source: import.meta.url })
    .add({
      registerRoute(path, handler, metadata = {}) {
        if (routes.has(path)) {
          throw new Error(\`Route \${path} already registered\`);
        }
        routes.set(path, { handler, metadata });
        registeredRoutes.push({ path, handler, metadata });
        return this;
      },
      hasRoute(path) {
        return routes.has(path);
      },
      getRoute(path) {
        return routes.get(path);
      },
      getAllRoutes() {
        return Array.from(routes.entries());
      },
      clear() {
        routes.clear();
        registeredRoutes.length = 0;
      }
    });
}

/**
 * Create a mock queue facet
 * @param {Object} [options={}] - Mock options
 * @returns {Facet} Mock queue facet
 */
export function createMockQueueFacet(options = {}) {
  const messages = [];
  const maxSize = options.maxSize || 1000;

  return new Facet('queue', { attach: true, source: import.meta.url })
    .add({
      enqueue(message) {
        if (messages.length >= maxSize) {
          throw new Error('Queue is full');
        }
        messages.push(message);
        return true;
      },
      dequeue() {
        return messages.shift() || null;
      },
      peek() {
        return messages[0] || null;
      },
      size() {
        return messages.length;
      },
      isEmpty() {
        return messages.length === 0;
      },
      clear() {
        messages.length = 0;
      },
      getAll() {
        return [...messages];
      }
    });
}

/**
 * Create a mock logger facet
 * @param {Object} [options={}] - Mock options
 * @returns {Facet} Mock logger facet
 */
export function createMockLoggerFacet(options = {}) {
  const logs = [];
  const enabled = options.enabled !== false;

  const log = (level, message, ...args) => {
    if (enabled) {
      logs.push({ level, message, args, timestamp: new Date().toISOString() });
    }
  };

  return new Facet('logger', { attach: true, source: import.meta.url })
    .add({
      debug: (message, ...args) => log('debug', message, ...args),
      info: (message, ...args) => log('info', message, ...args),
      warn: (message, ...args) => log('warn', message, ...args),
      error: (message, ...args) => log('error', message, ...args),
      log: (level, message, ...args) => log(level, message, ...args),
      getLogs() {
        return [...logs];
      },
      clearLogs() {
        logs.length = 0;
      },
      getLogsByLevel(level) {
        return logs.filter(log => log.level === level);
      }
    });
}

/**
 * Create a mock identity facet
 * @param {Object} [options={}] - Mock options
 * @param {Object} [options.pkr] - Mock PKR
 * @returns {Facet} Mock identity facet
 */
export function createMockIdentityFacet(options = {}) {
  const pkr = options.pkr || { uuid: 'test-identity-' + Date.now() };
  const sentMessages = [];

  return new Facet('identity', { attach: true, source: import.meta.url })
    .add({
      pkr,
      async sendProtected(message) {
        sentMessages.push(message);
        // Return a mock result
        return {
          success: true,
          subsystem: message.path.split('://')[0],
          messageId: 'test-msg-' + Date.now(),
          result: { data: 'mock result' }
        };
      },
      getSentMessages() {
        return [...sentMessages];
      },
      clearSentMessages() {
        sentMessages.length = 0;
      }
    });
}

/**
 * Create a generic mock facet
 * @param {string} kind - Facet kind
 * @param {Object} methods - Methods to add to the facet
 * @returns {Facet} Mock facet
 */
export function createMockFacet(kind, methods = {}) {
  return new Facet(kind, { attach: true, source: import.meta.url })
    .add(methods);
}
`;
}

function generateMockSubsystems() {
  return `/**
 * Mock Subsystems
 * 
 * Utilities for creating mock subsystems for testing.
 * Use these when you need to test subsystem interactions without full implementations.
 */

import { BaseSubsystem } from '../../mycelia-kernel-v2/models/base-subsystem/base.subsystem.mycelia.js';
import { createMockRouterFacet, createMockLoggerFacet } from './mock-facets.mycelia.js';

/**
 * Create a mock subsystem
 * @param {string} name - Subsystem name
 * @param {Object} [options={}] - Mock options
 * @param {Object} [options.facets] - Facets to add (default: router, logger)
 * @param {Object} [options.messageSystem] - MessageSystem instance (optional)
 * @returns {BaseSubsystem} Mock subsystem
 */
export function createMockSubsystem(name, options = {}) {
  const { facets = {}, messageSystem = null } = options;
  
  class MockSubsystem extends BaseSubsystem {
    constructor() {
      super(name, { ms: messageSystem });
    }

    async build() {
      await super.build();
      
      // Add default mock facets if not provided
      if (!facets.router) {
        this.api.__facets.router = createMockRouterFacet();
      }
      if (!facets.logger) {
        this.api.__facets.logger = createMockLoggerFacet();
      }
      
      // Add custom facets
      for (const [kind, facet] of Object.entries(facets)) {
        this.api.__facets[kind] = facet;
      }
    }
  }

  return new MockSubsystem();
}

/**
 * Create a minimal test subsystem
 * Useful for testing subsystem interactions without full implementations
 * @param {string} name - Subsystem name
 * @param {Object} [options={}] - Options
 * @returns {BaseSubsystem} Minimal subsystem
 */
export function createMinimalSubsystem(name, options = {}) {
  return createMockSubsystem(name, {
    ...options,
    facets: {
      router: createMockRouterFacet(),
      logger: createMockLoggerFacet(),
      ...options.facets
    }
  });
}
`;
}

function generateTestHelpers() {
  return `/**
 * Test Helpers
 * 
 * Utilities for common testing patterns in Mycelia Kernel.
 */

import { Message } from '../../mycelia-kernel-v2/models/message/message.mycelia.js';
import { MessageSystem } from '../../mycelia-kernel-v2/models/message-system/message-system.v2.mycelia.js';
import { createMockPkr } from '../../mycelia-kernel-v2/utils/test-utils.mycelia.js';

/**
 * Create a test MessageSystem
 * @param {Object} [options={}] - Options
 * @param {boolean} [options.debug=true] - Enable debug mode
 * @returns {Promise<MessageSystem>} Test MessageSystem
 */
export async function createTestMessageSystem(options = {}) {
  const { debug = true } = options;
  const messageSystem = new MessageSystem('test-app', { debug });
  await messageSystem.bootstrap();
  return messageSystem;
}

/**
 * Create a test message
 * @param {string} path - Message path
 * @param {Object} [data={}] - Message data
 * @param {Object} [options={}] - Message options
 * @returns {Message} Test message
 */
export function createTestMessage(path, data = {}, options = {}) {
  return new Message(path, data, options);
}

/**
 * Create a test PKR
 * @param {string} [kind='friend'] - Principal kind
 * @param {Object} [options={}] - PKR options
 * @returns {Object} Test PKR
 */
export function createTestPkr(kind = 'friend', options = {}) {
  return createMockPkr(kind, options);
}

/**
 * Wait for a promise with timeout
 * @param {Promise} promise - Promise to wait for
 * @param {number} timeout - Timeout in ms
 * @returns {Promise} Promise that resolves or rejects with timeout
 */
export function withTimeout(promise, timeout = 5000) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(\`Timeout after \${timeout}ms\`)), timeout)
    )
  ]);
}

/**
 * Create a test context for subsystem testing
 * @param {Object} [options={}] - Options
 * @returns {Promise<Object>} Test context
 */
export async function createTestContext(options = {}) {
  const messageSystem = await createTestMessageSystem(options);
  const kernel = messageSystem.getKernel();
  const userPkr = createTestPkr('friend', { name: 'test-user' });

  return {
    messageSystem,
    kernel,
    userPkr,
    createMessage: (path, data, msgOptions) => createTestMessage(path, data, msgOptions),
    createPkr: (kind, pkrOptions) => createTestPkr(kind, pkrOptions)
  };
}

/**
 * Cleanup test resources
 * @param {MessageSystem} messageSystem - MessageSystem to cleanup
 * @returns {Promise<void>}
 */
export async function cleanupTestResources(messageSystem) {
  if (messageSystem && typeof messageSystem.dispose === 'function') {
    await messageSystem.dispose();
  }
}
`;
}

function generateIndex() {
  return `/**
 * Test Utilities Index
 * 
 * Exports all test utilities for easy importing.
 */

// Mock Facets
export {
  createMockRouterFacet,
  createMockQueueFacet,
  createMockLoggerFacet,
  createMockIdentityFacet,
  createMockFacet
} from './mock-facets.mycelia.js';

// Mock Subsystems
export {
  createMockSubsystem,
  createMinimalSubsystem
} from './mock-subsystems.mycelia.js';

// Test Helpers
export {
  createTestMessageSystem,
  createTestMessage,
  createTestPkr,
  withTimeout,
  createTestContext,
  cleanupTestResources
} from './test-helpers.mycelia.js';
`;
}

