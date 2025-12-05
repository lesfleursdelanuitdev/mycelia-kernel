import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MessageSystem } from '../../models/message-system/message-system.v2.mycelia.js';
import { WebSocketSubsystem } from '../../models/websocket-subsystem/websocket.subsystem.mycelia.js';
import { BaseSubsystem } from '../../models/base-subsystem/base.subsystem.mycelia.js';
import { createSynchronousDefaultHooks } from '../../models/defaults/default-hooks.mycelia.js';

const WEBSOCKET_TEST_PORT = 8081;

describe('WebSocketSubsystem Integration', () => {
  let messageSystem;
  let websocketSubsystem;
  let testSubsystem;

  beforeEach(async () => {
    // Create MessageSystem
    messageSystem = new MessageSystem('test-ms');
    await messageSystem.bootstrap();

    // Create test subsystem with a handler
    // Use defaultHooks option instead of .use() to ensure hooks are properly set
    testSubsystem = new BaseSubsystem('test-service', {
      ms: messageSystem,
      defaultHooks: createSynchronousDefaultHooks()
    });
    
    testSubsystem.onInit(() => {
      // Register a test handler
      testSubsystem.registerRoute('test-service://echo', async (message) => {
        return {
          success: true,
          data: {
            echo: message.body.input,
            received: true
          }
        };
      });
    });
    
    await testSubsystem.build();

    await messageSystem.registerSubsystem(testSubsystem);

    // Create WebSocketSubsystem
    websocketSubsystem = new WebSocketSubsystem('websocket', {
      ms: messageSystem,
      config: {
        websocket: {
          type: 'ws',
          port: WEBSOCKET_TEST_PORT,
          host: 'localhost',
          path: '/ws',
          routing: {
            defaultPath: 'test-service://echo'
          }
        }
      },
      debug: false
    });

    await websocketSubsystem.build();
  });

  afterEach(async () => {
    // Stop WebSocket server
    const websocket = websocketSubsystem?.find('websocket');
    if (websocket && websocket.isRunning()) {
      await websocket.stop();
    }

    // Cleanup
    if (testSubsystem) {
      await testSubsystem.dispose();
    }
    if (messageSystem) {
      await messageSystem.dispose();
    }
  });

  it('starts and stops WebSocket server', async () => {
    const websocket = websocketSubsystem.find('websocket');
    
    expect(websocket.isRunning()).toBe(false);
    
    await websocket.start();
    expect(websocket.isRunning()).toBe(true);
    expect(websocket.getPort()).toBe(WEBSOCKET_TEST_PORT);
    
    await websocket.stop();
    expect(websocket.isRunning()).toBe(false);
  });

  it('handles WebSocket connections', async () => {
    // Dynamically import WebSocket to avoid parsing issues
    const { WebSocket } = await import('ws');
    
    const websocket = websocketSubsystem.find('websocket');
    await websocket.start();

    let connectionReceived = false;
    websocket.onConnection((connection) => {
      connectionReceived = true;
      expect(connection.id).toBeDefined();
      expect(connection.isOpen()).toBe(true);
    });

    // Connect client
    const client = new WebSocket(`ws://localhost:${WEBSOCKET_TEST_PORT}/ws`);
    
    await new Promise((resolve) => {
      client.on('open', () => {
        resolve();
      });
    });

    // Wait a bit for connection handler
    await new Promise(resolve => setTimeout(resolve, 50));
    
    expect(connectionReceived).toBe(true);
    expect(websocket.getConnectionCount()).toBe(1);

    client.close();
    await new Promise(resolve => setTimeout(resolve, 50));
  });

  it('routes WebSocket messages to Mycelia handlers', async () => {
    // Dynamically import WebSocket
    const { WebSocket } = await import('ws');
    
    const websocket = websocketSubsystem.find('websocket');
    await websocket.start();

    // Connect client
    const client = new WebSocket(`ws://localhost:${WEBSOCKET_TEST_PORT}/ws`);
    
    await new Promise((resolve) => {
      client.on('open', resolve);
    });

    // Wait for connection to be registered
    await new Promise(resolve => setTimeout(resolve, 50));

    // Send message
    const message = {
      path: 'test-service://echo',
      body: {
        input: 'Hello WebSocket!'
      },
      correlationId: 'test-correlation-1'
    };

    const response = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Timeout waiting for response'));
      }, 5000);

      client.on('message', (data) => {
        try {
          const parsed = JSON.parse(data.toString());
          clearTimeout(timeout);
          resolve(parsed);
        } catch (error) {
          clearTimeout(timeout);
          reject(error);
        }
      });

      client.send(JSON.stringify(message));
    });

    // Debug: log the response
    if (!response.success) {
      console.log('WebSocket response:', JSON.stringify(response, null, 2));
    }
    
    if (!response.success) {
      console.log('WebSocket response:', JSON.stringify(response, null, 2));
    }
    
    expect(response.success).toBe(true);
    expect(response.data.echo).toBe('Hello WebSocket!');
    expect(response.correlationId).toBe('test-correlation-1');

    client.close();
    await new Promise(resolve => setTimeout(resolve, 50));
  });
});
