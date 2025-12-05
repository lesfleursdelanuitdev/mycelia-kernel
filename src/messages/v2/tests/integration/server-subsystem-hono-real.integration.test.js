/**
 * Real Server Subsystem Integration Tests - Hono
 * 
 * Tests the ServerSubsystem with actual HTTP server using Hono.
 * These tests start real HTTP servers, make HTTP requests, and verify responses.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import axios from 'axios';
import { MessageSystem } from '../../models/message-system/message-system.v2.mycelia.js';
import { ServerSubsystem } from '../../models/server-subsystem/server.subsystem.mycelia.js';
import { BaseSubsystem } from '../../models/base-subsystem/base.subsystem.mycelia.js';
import { createCanonicalDefaultHooks } from '../../models/defaults/default-hooks.mycelia.js';
import { Message } from '../../models/message/message.mycelia.js';
import { SERVER_ROUTES } from '../../models/server-subsystem/server.routes.def.mycelia.js';

const HOST = '127.0.0.1';
const HONO_TEST_PORT = 5061;

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
 */
function getServerAddress(serverFacet) {
  // Try getAddress() first (works for both)
  const address = serverFacet.getAddress();
  if (address) {
    return address;
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

describe('ServerSubsystem Real HTTP Integration - Hono', () => {
  let messageSystem;
  let serverSubsystem;
  let testService;
  let serverFacet;
  let baseUrl;
  const HONO_START_OPTIONS = { host: HOST, port: HONO_TEST_PORT };

  beforeEach(async () => {
    // Create MessageSystem
    messageSystem = new MessageSystem('test-ms', { debug: false });
    await messageSystem.bootstrap();
    
    // Create test service subsystem
    testService = new TestServiceSubsystem('test-service', { ms: messageSystem });
    await messageSystem.registerSubsystem(testService);
    
    // Create server subsystem with Hono
    serverSubsystem = new ServerSubsystem('server', {
      ms: messageSystem,
      config: {
        server: {
          type: 'hono',
          host: HOST,
          port: HONO_TEST_PORT,
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
      
      // Start server
      await serverFacet.start(HONO_START_OPTIONS);
      baseUrl = getServerAddress(serverFacet);
      
      // Make HTTP request
      const response = await axios.get(`${baseUrl}/status`);
      expect(response.status).toBe(200);
      
      const data = response.data;
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
      
      // Start server
      await serverFacet.start(HONO_START_OPTIONS);
      baseUrl = getServerAddress(serverFacet);
      
      // Make HTTP POST request
      const payload = { name: 'test', value: 42 };
      const response = await axios.post(`${baseUrl}/data`, payload, {
        headers: { 'Content-Type': 'application/json' },
      });
      
      expect(response.status).toBe(200);
      const data = response.data;
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
      
      // Start server
      await serverFacet.start(HONO_START_OPTIONS);
      baseUrl = getServerAddress(serverFacet);
      
      // Make HTTP request with path parameter
      const response = await axios.get(`${baseUrl}/users/789`);
      expect(response.status).toBe(200);
      
      const data = response.data;
      expect(data.success).toBe(true);
      expect(data.user.id).toBe('789');
      expect(data.user.name).toBe('User 789');
    });

    it('handles query parameters', async () => {
      // Register route
      const registerMessage = createImmediateMessage(SERVER_ROUTES.registerMycelia.path, {
        myceliaPath: 'test-service://get/query',
        httpMethod: 'GET',
        httpPath: '/query',
      });
      
      await messageSystem.send(registerMessage);
      
      // Start server
      await serverFacet.start(HONO_START_OPTIONS);
      baseUrl = getServerAddress(serverFacet);
      
      // Make HTTP request with query parameters
      const response = await axios.get(`${baseUrl}/query?foo=bar&baz=qux`);
      expect(response.status).toBe(200);
      
      const data = response.data;
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
      
      // Start server
      await serverFacet.start(HONO_START_OPTIONS);
      baseUrl = getServerAddress(serverFacet);
      
      // Make HTTP request
      const payload = { name: 'New Item' };
      const response = await axios.post(`${baseUrl}/items`, payload, {
        headers: { 'Content-Type': 'application/json' },
      });
      
      expect(response.status).toBe(200);
      const data = response.data;
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
      
      // Start server
      await serverFacet.start(HONO_START_OPTIONS);
      baseUrl = getServerAddress(serverFacet);
      
      // Make HTTP request
      const response = await axios.get(`${baseUrl}/api/status`);
      expect(response.status).toBe(200);
      
      const data = response.data;
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
      
      // Start server
      await serverFacet.start(HONO_START_OPTIONS);
      baseUrl = getServerAddress(serverFacet);
      
      // Test GET route
      const getResponse = await axios.get(`${baseUrl}/status`);
      expect(getResponse.status).toBe(200);
      const getData = getResponse.data;
      expect(getData.success).toBe(true);
      
      // Test POST route
      const payload = { test: 'data' };
      const postResponse = await axios.post(`${baseUrl}/data`, payload, {
        headers: { 'Content-Type': 'application/json' },
      });
      expect(postResponse.status).toBe(200);
      const postData = postResponse.data;
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
      
      // Start server
      await serverFacet.start(HONO_START_OPTIONS);
      baseUrl = getServerAddress(serverFacet);
      
      // Make HTTP request that triggers error
      let response;
      try {
        response = await axios.post(`${baseUrl}/error`, {}, {
          headers: { 'Content-Type': 'application/json' },
        });
        // If no error thrown, check status
        expect(response.status).toBe(500);
      } catch (error) {
        // Axios throws for 4xx/5xx, but we can access response
        if (error.response) {
          response = error.response;
          expect(response.status).toBe(500);
        } else {
          throw error;
        }
      }
      const data = response.data;
      expect(data.error).toBeDefined();
    });

    it('returns 404 for unregistered routes', async () => {
      // Start server without registering any routes
      await serverFacet.start(HONO_START_OPTIONS);
      baseUrl = getServerAddress(serverFacet);
      
      // Make HTTP request to unregistered route
      let response;
      try {
        response = await axios.get(`${baseUrl}/not-found`);
        expect(response.status).toBe(404);
      } catch (error) {
        // Axios throws for 4xx/5xx, but we can access response
        if (error.response) {
          response = error.response;
          expect(response.status).toBe(404);
        } else {
          throw error;
        }
      }
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
      await serverFacet.start(HONO_START_OPTIONS);
      baseUrl = getServerAddress(serverFacet);
      
      let response = await axios.get(`${baseUrl}/status`);
      expect(response.status).toBe(200);
      
      // Stop server
      await serverFacet.stop();
      expect(serverFacet.isRunning()).toBe(false);
      
      // Re-register route for second server instance
      await messageSystem.send(registerMessage);
      
      // Start server second time
      await serverFacet.start(HONO_START_OPTIONS);
      baseUrl = getServerAddress(serverFacet);
      
      response = await axios.get(`${baseUrl}/status`);
      expect(response.status).toBe(200);
    });
  });
});

