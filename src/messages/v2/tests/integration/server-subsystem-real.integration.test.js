/**
 * Real Server Subsystem Integration Tests
 * 
 * Tests the ServerSubsystem with actual HTTP servers (Fastify and Express).
 * These tests start real HTTP servers, make HTTP requests, and verify responses.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MessageSystem } from '../../models/message-system/message-system.v2.mycelia.js';
import { ServerSubsystem } from '../../models/server-subsystem/server.subsystem.mycelia.js';
import { BaseSubsystem } from '../../models/base-subsystem/base.subsystem.mycelia.js';
import { createCanonicalDefaultHooks } from '../../models/defaults/default-hooks.mycelia.js';
import { Message } from '../../models/message/message.mycelia.js';
import { SERVER_ROUTES } from '../../models/server-subsystem/server.routes.def.mycelia.js';

const HOST = '127.0.0.1';
const FASTIFY_TEST_PORT = 5058;
const EXPRESS_TEST_PORT = 5059;

/**
 * Helper to create a message with processImmediately flag
 * This ensures the message is processed synchronously and returns the handler result
 */
function createImmediateMessage(path, body, meta = {}) {
  return new Message(path, body, {
    processImmediately: true,
    ...meta
  });
}

/**
 * Helper to get server address from server facet
 * Works for both Fastify and Express
 */
function getServerAddress(serverFacet) {
  // Try getAddress() first (works for both)
  const address = serverFacet.getAddress();
  if (address) {
    return address;
  }
  
  // Fallback for Fastify: access server directly
  const info = serverFacet?._server?.server?.address();
  if (info && typeof info.port === 'number') {
    const addr = info.address === '::' ? HOST : info.address;
    return `http://${addr}:${info.port}`;
  }
  
  throw new Error('Server is not running');
}

/**
 * Helper to stop server safely
 */
async function stopServer(serverFacet) {
  if (!serverFacet || !serverFacet.isRunning()) {
    return;
  }
  try {
    await serverFacet.stop();
  } catch (error) {
    // Ignore shutdown errors to avoid masking test expectations
    console.warn('Error stopping server:', error.message);
  }
}

/**
 * Create a test subsystem with routes for testing
 */
class TestServiceSubsystem extends BaseSubsystem {
  constructor(name, options) {
    super(name, { ...options, defaultHooks: createCanonicalDefaultHooks() });
    
    this.onInit(() => {
      // Register test routes
      const router = this.find('router');
      if (!router) {
        throw new Error('TestServiceSubsystem: router facet not found');
      }
      
      router.registerRoute('test-service://get/status', async (message) => {
        return { success: true, status: 'ok', timestamp: Date.now() };
      });
      
      router.registerRoute('test-service://post/data', async (message) => {
        const body = message.getBody();
        return { success: true, received: body, echo: body };
      });
      
      router.registerRoute('test-service://get/user/{id}', async (message, params) => {
        const { id } = params;
        return { success: true, user: { id, name: `User ${id}` } };
      });
      
      router.registerRoute('test-service://post/error', async () => {
        return { success: false, statusCode: 500, error: 'Test error' };
      });
      
      router.registerRoute('test-service://get/query', async (message) => {
        const meta = message.getMeta();
        const query = meta && typeof meta.getCustomMutableField === 'function'
          ? meta.getCustomMutableField('query') || {}
          : {};
        return { success: true, query };
      });
    });
  }
}

describe('ServerSubsystem Real HTTP Integration - Fastify', () => {
  let messageSystem;
  let serverSubsystem;
  let testService;
  let serverFacet;
  let baseUrl;
  const FASTIFY_START_OPTIONS = { host: HOST, port: FASTIFY_TEST_PORT };

  beforeEach(async () => {
    // Create MessageSystem
    messageSystem = new MessageSystem('test-ms', { debug: false });
    await messageSystem.bootstrap();
    
    // Create test service subsystem
    testService = new TestServiceSubsystem('test-service', { ms: messageSystem });
    await messageSystem.registerSubsystem(testService);
    
    // Create server subsystem with Fastify
    // Use port 0 to let OS assign an available port
    serverSubsystem = new ServerSubsystem('server', {
      ms: messageSystem,
      config: {
        server: {
          type: 'fastify',
          host: HOST,
          port: FASTIFY_TEST_PORT,
        },
      },
      debug: false,
    });
    
    await messageSystem.registerSubsystem(serverSubsystem);
    serverFacet = serverSubsystem.find('server');
    
    // Verify server subsystem is registered
    expect(messageSystem.hasSubsystem('server')).toBe(true);
  });

  afterEach(async () => {
    await stopServer(serverFacet);
    if (serverSubsystem) await serverSubsystem.dispose();
    if (testService) await testService.dispose();
    if (messageSystem) {
      messageSystem.stopScheduler();
      await messageSystem.dispose();
    }
  });

  describe('Route Registration', () => {
    it('registers a Mycelia route and serves HTTP GET requests', async () => {
      // Register route via message (with processImmediately for synchronous processing)
      const registerMessage = createImmediateMessage(SERVER_ROUTES.registerMycelia.path, {
        myceliaPath: 'test-service://get/status',
        httpMethod: 'GET',
        httpPath: '/status',
      });
      
      const result = await messageSystem.send(registerMessage);
      if (!result.success) {
        console.error('Routing result:', JSON.stringify(result, null, 2));
      }
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.result).toBeDefined();
        if (result.result) {
          expect(result.result.processed).toBe(true);
          expect(result.result.result).toBeDefined();
          if (result.result.result) {
            expect(result.result.result.success).toBe(true);
          }
        }
      }
      
      // Start server (port 0 = OS assigns available port)
      await serverFacet.start(FASTIFY_START_OPTIONS);
      baseUrl = getServerAddress(serverFacet);
      
      // Make HTTP request
      const response = await fetch(`${baseUrl}/status`);
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.status).toBe('ok');
      expect(data.timestamp).toBeDefined();
    });

    it('registers a Mycelia route and serves HTTP POST requests with body', async () => {
      // Register route
      const registerMessage = createImmediateMessage(SERVER_ROUTES.registerMycelia.path, {
        myceliaPath: 'test-service://post/data',
        httpMethod: 'POST',
        httpPath: '/data',
      });
      
      await messageSystem.send(registerMessage);
      
      // Start server (port 0 = OS assigns available port)
      await serverFacet.start(FASTIFY_START_OPTIONS);
      baseUrl = getServerAddress(serverFacet);
      
      // Make HTTP POST request
      const payload = { name: 'test', value: 42 };
      const response = await fetch(`${baseUrl}/data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.received).toEqual(payload);
      expect(data.echo).toEqual(payload);
    });

    it('registers a route with path parameters', async () => {
      // Register route with path parameter
      const registerMessage = createImmediateMessage(SERVER_ROUTES.registerMycelia.path, {
        myceliaPath: 'test-service://get/user/{id}',
        httpMethod: 'GET',
        httpPath: '/users/:id',
      });
      
      await messageSystem.send(registerMessage);
      
      // Start server (port 0 = OS assigns available port)
      await serverFacet.start(FASTIFY_START_OPTIONS);
      baseUrl = getServerAddress(serverFacet);
      
      // Make HTTP request with path parameter
      const response = await fetch(`${baseUrl}/users/123`);
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.user.id).toBe('123');
      expect(data.user.name).toBe('User 123');
    });

    it('handles query parameters', async () => {
      // Register route
      const registerMessage = createImmediateMessage(SERVER_ROUTES.registerMycelia.path, {
        myceliaPath: 'test-service://get/query',
        httpMethod: 'GET',
        httpPath: '/query',
      });
      
      await messageSystem.send(registerMessage);
      
      // Start server (port 0 = OS assigns available port)
      await serverFacet.start(FASTIFY_START_OPTIONS);
      baseUrl = getServerAddress(serverFacet);
      
      // Make HTTP request with query parameters
      const response = await fetch(`${baseUrl}/query?foo=bar&baz=qux`);
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.query.foo).toBe('bar');
      expect(data.query.baz).toBe('qux');
    });
  });

  describe('Command Registration', () => {
    it('registers a Mycelia command as HTTP endpoint', async () => {
      // Register command
      const registerMessage = createImmediateMessage(SERVER_ROUTES.registerCommand.path, {
        commandName: 'test-service://command/createItem',
        httpMethod: 'POST',
        httpPath: '/items',
      });
      
      // First, register the command handler in test service
      const router = testService.find('router');
      router.registerRoute('test-service://command/createItem', async (message) => {
        return { success: true, created: message.getBody() };
      });
      
      await messageSystem.send(registerMessage);
      
      // Start server (port 0 = OS assigns available port)
      await serverFacet.start(FASTIFY_START_OPTIONS);
      baseUrl = getServerAddress(serverFacet);
      
      // Make HTTP request
      const payload = { name: 'New Item' };
      const response = await fetch(`${baseUrl}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.created).toEqual(payload);
    });
  });

  describe('Query Registration', () => {
    it('registers a Mycelia query as HTTP endpoint', async () => {
      // Register query
      const registerMessage = createImmediateMessage(SERVER_ROUTES.registerQuery.path, {
        queryName: 'test-service://query/getStatus',
        httpMethod: 'GET',
        httpPath: '/api/status',
      });
      
      // First, register the query handler in test service
      const router = testService.find('router');
      router.registerRoute('test-service://query/getStatus', async () => {
        return { success: true, status: 'operational' };
      });
      
      await messageSystem.send(registerMessage);
      
      // Start server (port 0 = OS assigns available port)
      await serverFacet.start(FASTIFY_START_OPTIONS);
      baseUrl = getServerAddress(serverFacet);
      
      // Make HTTP request
      const response = await fetch(`${baseUrl}/api/status`);
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.status).toBe('operational');
    });
  });

  describe('Batch Registration', () => {
    it('registers multiple routes via batch message', async () => {
      // Register batch routes
      const batchMessage = createImmediateMessage(SERVER_ROUTES.registerBatch.path, {
        routes: [
          {
            type: 'route',
            myceliaPath: 'test-service://get/status',
            httpMethod: 'GET',
            httpPath: '/status',
          },
          {
            type: 'route',
            myceliaPath: 'test-service://post/data',
            httpMethod: 'POST',
            httpPath: '/data',
          },
        ],
      });
      
      const result = await messageSystem.send(batchMessage);
      expect(result.success).toBe(true);
      expect(result.result).toBeDefined();
      expect(result.result.processed).toBe(true);
      expect(result.result.result.success).toBe(true);
      expect(result.result.result.registered).toBe(2);
      
      // Start server (port 0 = OS assigns available port)
      await serverFacet.start(FASTIFY_START_OPTIONS);
      baseUrl = getServerAddress(serverFacet);
      
      // Test GET route
      const getResponse = await fetch(`${baseUrl}/status`);
      expect(getResponse.status).toBe(200);
      const getData = await getResponse.json();
      expect(getData.success).toBe(true);
      
      // Test POST route
      const payload = { test: 'data' };
      const postResponse = await fetch(`${baseUrl}/data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      expect(postResponse.status).toBe(200);
      const postData = await postResponse.json();
      expect(postData.success).toBe(true);
      expect(postData.received).toEqual(payload);
    });
  });

  describe('Error Handling', () => {
    it('handles route handler errors and returns 500', async () => {
      // Register error route
      const registerMessage = createImmediateMessage(SERVER_ROUTES.registerMycelia.path, {
        myceliaPath: 'test-service://post/error',
        httpMethod: 'POST',
        httpPath: '/error',
      });
      
      await messageSystem.send(registerMessage);
      
      // Start server (port 0 = OS assigns available port)
      await serverFacet.start(FASTIFY_START_OPTIONS);
      baseUrl = getServerAddress(serverFacet);
      
      // Make HTTP request that triggers error
      const response = await fetch(`${baseUrl}/error`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      
      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBeDefined();
    });

    it('returns 404 for unregistered routes', async () => {
      // Start server without registering any routes
      await serverFacet.start(FASTIFY_START_OPTIONS);
      baseUrl = getServerAddress(serverFacet);
      
      // Make HTTP request to unregistered route
      const response = await fetch(`${baseUrl}/not-found`);
      expect(response.status).toBe(404);
    });
  });

  describe('Server Lifecycle', () => {
    it('can start and stop server multiple times', async () => {
      // Register route
      const registerMessage = createImmediateMessage(SERVER_ROUTES.registerMycelia.path, {
        myceliaPath: 'test-service://get/status',
        httpMethod: 'GET',
        httpPath: '/status',
      });
      
      await messageSystem.send(registerMessage);
      
      // Start server first time
      await serverFacet.start(FASTIFY_START_OPTIONS);
      baseUrl = getServerAddress(serverFacet);
      
      let response = await fetch(`${baseUrl}/status`);
      expect(response.status).toBe(200);
      
      // Stop server
      await serverFacet.stop();
      expect(serverFacet.isRunning()).toBe(false);
      
      // Re-register route for second server instance
      await messageSystem.send(registerMessage);
      
      // Start server second time (OS will assign new port)
      await serverFacet.start(FASTIFY_START_OPTIONS);
      baseUrl = getServerAddress(serverFacet);
      
      response = await fetch(`${baseUrl}/status`);
      expect(response.status).toBe(200);
    });
  });
});

describe('ServerSubsystem Real HTTP Integration - Express', () => {
  let messageSystem;
  let serverSubsystem;
  let testService;
  let serverFacet;
  let baseUrl;
  const EXPRESS_START_OPTIONS = { host: HOST, port: EXPRESS_TEST_PORT };

  beforeEach(async () => {
    // Create MessageSystem
    messageSystem = new MessageSystem('test-ms', { debug: false });
    await messageSystem.bootstrap();
    
    // Create test service subsystem
    testService = new TestServiceSubsystem('test-service', { ms: messageSystem });
    await messageSystem.registerSubsystem(testService);
    
    // Create server subsystem with Express
    // Use port 0 to let OS assign an available port
    serverSubsystem = new ServerSubsystem('server', {
      ms: messageSystem,
      config: {
        server: {
          type: 'express',
          host: HOST,
          port: EXPRESS_TEST_PORT,
        },
      },
      debug: false,
    });
    
    await messageSystem.registerSubsystem(serverSubsystem);
    serverFacet = serverSubsystem.find('server');
    
    // Verify server subsystem is registered
    expect(messageSystem.hasSubsystem('server')).toBe(true);
  });

  afterEach(async () => {
    await stopServer(serverFacet);
    if (serverSubsystem) await serverSubsystem.dispose();
    if (testService) await testService.dispose();
    if (messageSystem) {
      messageSystem.stopScheduler();
      await messageSystem.dispose();
    }
  });

  describe('Route Registration', () => {
    it('registers a Mycelia route and serves HTTP GET requests', async () => {
      // Register route via message (with processImmediately for synchronous processing)
      const registerMessage = createImmediateMessage(SERVER_ROUTES.registerMycelia.path, {
        myceliaPath: 'test-service://get/status',
        httpMethod: 'GET',
        httpPath: '/status',
      });
      
      const result = await messageSystem.send(registerMessage);
      if (!result.success) {
        console.error('Routing result:', JSON.stringify(result, null, 2));
      }
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.result).toBeDefined();
        if (result.result) {
          expect(result.result.processed).toBe(true);
          expect(result.result.result).toBeDefined();
          if (result.result.result) {
            expect(result.result.result.success).toBe(true);
          }
        }
      }
      
      // Start server (port 0 = OS assigns available port)
      await serverFacet.start(EXPRESS_START_OPTIONS);
      baseUrl = getServerAddress(serverFacet);
      
      // Make HTTP request
      const response = await fetch(`${baseUrl}/status`);
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.status).toBe('ok');
      expect(data.timestamp).toBeDefined();
    });

    it('registers a Mycelia route and serves HTTP POST requests with body', async () => {
      // Register route
      const registerMessage = createImmediateMessage(SERVER_ROUTES.registerMycelia.path, {
        myceliaPath: 'test-service://post/data',
        httpMethod: 'POST',
        httpPath: '/data',
      });
      
      await messageSystem.send(registerMessage);
      
      // Start server (port 0 = OS assigns available port)
      await serverFacet.start(EXPRESS_START_OPTIONS);
      baseUrl = getServerAddress(serverFacet);
      
      // Make HTTP POST request
      const payload = { name: 'test', value: 42 };
      const response = await fetch(`${baseUrl}/data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.received).toEqual(payload);
      expect(data.echo).toEqual(payload);
    });

    it('registers a route with path parameters', async () => {
      // Register route with path parameter
      const registerMessage = createImmediateMessage(SERVER_ROUTES.registerMycelia.path, {
        myceliaPath: 'test-service://get/user/{id}',
        httpMethod: 'GET',
        httpPath: '/users/:id',
      });
      
      await messageSystem.send(registerMessage);
      
      // Start server (port 0 = OS assigns available port)
      await serverFacet.start(EXPRESS_START_OPTIONS);
      baseUrl = getServerAddress(serverFacet);
      
      // Make HTTP request with path parameter
      const response = await fetch(`${baseUrl}/users/456`);
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.user.id).toBe('456');
      expect(data.user.name).toBe('User 456');
    });

    it('handles query parameters', async () => {
      // Register route
      const registerMessage = createImmediateMessage(SERVER_ROUTES.registerMycelia.path, {
        myceliaPath: 'test-service://get/query',
        httpMethod: 'GET',
        httpPath: '/query',
      });
      
      await messageSystem.send(registerMessage);
      
      // Start server (port 0 = OS assigns available port)
      await serverFacet.start(EXPRESS_START_OPTIONS);
      baseUrl = getServerAddress(serverFacet);
      
      // Make HTTP request with query parameters
      const response = await fetch(`${baseUrl}/query?foo=bar&baz=qux`);
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.query.foo).toBe('bar');
      expect(data.query.baz).toBe('qux');
    });
  });

  describe('Command Registration', () => {
    it('registers a Mycelia command as HTTP endpoint', async () => {
      // Register command
      const registerMessage = createImmediateMessage(SERVER_ROUTES.registerCommand.path, {
        commandName: 'test-service://command/createItem',
        httpMethod: 'POST',
        httpPath: '/items',
      });
      
      // First, register the command handler in test service
      const router = testService.find('router');
      router.registerRoute('test-service://command/createItem', async (message) => {
        return { success: true, created: message.getBody() };
      });
      
      await messageSystem.send(registerMessage);
      
      // Start server (port 0 = OS assigns available port)
      await serverFacet.start(EXPRESS_START_OPTIONS);
      baseUrl = getServerAddress(serverFacet);
      
      // Make HTTP request
      const payload = { name: 'New Item' };
      const response = await fetch(`${baseUrl}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.created).toEqual(payload);
    });
  });

  describe('Query Registration', () => {
    it('registers a Mycelia query as HTTP endpoint', async () => {
      // Register query
      const registerMessage = createImmediateMessage(SERVER_ROUTES.registerQuery.path, {
        queryName: 'test-service://query/getStatus',
        httpMethod: 'GET',
        httpPath: '/api/status',
      });
      
      // First, register the query handler in test service
      const router = testService.find('router');
      router.registerRoute('test-service://query/getStatus', async () => {
        return { success: true, status: 'operational' };
      });
      
      await messageSystem.send(registerMessage);
      
      // Start server (port 0 = OS assigns available port)
      await serverFacet.start(EXPRESS_START_OPTIONS);
      baseUrl = getServerAddress(serverFacet);
      
      // Make HTTP request
      const response = await fetch(`${baseUrl}/api/status`);
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.status).toBe('operational');
    });
  });

  describe('Batch Registration', () => {
    it('registers multiple routes via batch message', async () => {
      // Register batch routes
      const batchMessage = createImmediateMessage(SERVER_ROUTES.registerBatch.path, {
        routes: [
          {
            type: 'route',
            myceliaPath: 'test-service://get/status',
            httpMethod: 'GET',
            httpPath: '/status',
          },
          {
            type: 'route',
            myceliaPath: 'test-service://post/data',
            httpMethod: 'POST',
            httpPath: '/data',
          },
        ],
      });
      
      const result = await messageSystem.send(batchMessage);
      expect(result.success).toBe(true);
      expect(result.result).toBeDefined();
      expect(result.result.processed).toBe(true);
      expect(result.result.result.success).toBe(true);
      expect(result.result.result.registered).toBe(2);
      
      // Start server (port 0 = OS assigns available port)
      await serverFacet.start(EXPRESS_START_OPTIONS);
      baseUrl = getServerAddress(serverFacet);
      
      // Test GET route
      const getResponse = await fetch(`${baseUrl}/status`);
      expect(getResponse.status).toBe(200);
      const getData = await getResponse.json();
      expect(getData.success).toBe(true);
      
      // Test POST route
      const payload = { test: 'data' };
      const postResponse = await fetch(`${baseUrl}/data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      expect(postResponse.status).toBe(200);
      const postData = await postResponse.json();
      expect(postData.success).toBe(true);
      expect(postData.received).toEqual(payload);
    });
  });

  describe('Error Handling', () => {
    it('handles route handler errors and returns 500', async () => {
      // Register error route
      const registerMessage = createImmediateMessage(SERVER_ROUTES.registerMycelia.path, {
        myceliaPath: 'test-service://post/error',
        httpMethod: 'POST',
        httpPath: '/error',
      });
      
      await messageSystem.send(registerMessage);
      
      // Start server (port 0 = OS assigns available port)
      await serverFacet.start(EXPRESS_START_OPTIONS);
      baseUrl = getServerAddress(serverFacet);
      
      // Make HTTP request that triggers error
      const response = await fetch(`${baseUrl}/error`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      
      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBeDefined();
    });

    it('returns 404 for unregistered routes', async () => {
      // Start server without registering any routes
      await serverFacet.start(EXPRESS_START_OPTIONS);
      baseUrl = getServerAddress(serverFacet);
      
      // Make HTTP request to unregistered route
      const response = await fetch(`${baseUrl}/not-found`);
      expect(response.status).toBe(404);
    });
  });

  describe('Server Lifecycle', () => {
    it('can start and stop server multiple times', async () => {
      // Register route
      const registerMessage = createImmediateMessage(SERVER_ROUTES.registerMycelia.path, {
        myceliaPath: 'test-service://get/status',
        httpMethod: 'GET',
        httpPath: '/status',
      });
      
      await messageSystem.send(registerMessage);
      
      // Start server first time
      await serverFacet.start(EXPRESS_START_OPTIONS);
      baseUrl = getServerAddress(serverFacet);
      
      let response = await fetch(`${baseUrl}/status`);
      expect(response.status).toBe(200);
      
      // Stop server
      await serverFacet.stop();
      expect(serverFacet.isRunning()).toBe(false);
      
      // Start server second time (OS will assign new port)
      await serverFacet.start(EXPRESS_START_OPTIONS);
      baseUrl = getServerAddress(serverFacet);
      
      response = await fetch(`${baseUrl}/status`);
      expect(response.status).toBe(200);
    });
  });
});

