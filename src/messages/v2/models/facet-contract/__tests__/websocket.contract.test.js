import { describe, it, expect } from 'vitest';
import { websocketContract } from '../websocket.contract.mycelia.js';

describe('websocketContract', () => {
  it('validates required methods', () => {
    const facet = {
      // Lifecycle
      start: () => {},
      stop: () => {},
      isRunning: () => {},
      
      // Server Info
      getAddress: () => {},
      getPort: () => {},
      
      // Connection Management
      getConnection: () => {},
      getAllConnections: () => {},
      getConnectionCount: () => {},
      closeConnection: () => {},
      
      // Message Sending
      send: () => {},
      broadcast: () => {},
      
      // Connection Lifecycle Handlers
      onConnection: () => {},
      onDisconnection: () => {},
      onError: () => {},
      
      // Message Routing
      registerMessageHandler: () => {},
      routeMessage: () => {},
      
      // Required properties
      _server: {},
      _isRunning: false,
      _connections: new Map()
    };
    
    expect(() => websocketContract.enforce({}, {}, {}, facet)).not.toThrow();
  });

  it('throws error if required method is missing', () => {
    const facet = {
      start: () => {},
      // Missing stop()
      isRunning: () => {},
      // ... other methods
      _server: {},
      _isRunning: false,
      _connections: new Map()
    };
    
    expect(() => websocketContract.enforce({}, {}, {}, facet)).toThrow(/stop/);
  });

  it('validates _server is an object', () => {
    const facet = {
      start: () => {},
      stop: () => {},
      isRunning: () => {},
      getAddress: () => {},
      getPort: () => {},
      getConnection: () => {},
      getAllConnections: () => {},
      getConnectionCount: () => {},
      closeConnection: () => {},
      send: () => {},
      broadcast: () => {},
      onConnection: () => {},
      onDisconnection: () => {},
      onError: () => {},
      registerMessageHandler: () => {},
      routeMessage: () => {},
      _server: null, // Invalid
      _isRunning: false,
      _connections: new Map()
    };
    
    expect(() => websocketContract.enforce({}, {}, {}, facet)).toThrow(/_server must be an object/);
  });

  it('validates _isRunning is a boolean', () => {
    const facet = {
      start: () => {},
      stop: () => {},
      isRunning: () => {},
      getAddress: () => {},
      getPort: () => {},
      getConnection: () => {},
      getAllConnections: () => {},
      getConnectionCount: () => {},
      closeConnection: () => {},
      send: () => {},
      broadcast: () => {},
      onConnection: () => {},
      onDisconnection: () => {},
      onError: () => {},
      registerMessageHandler: () => {},
      routeMessage: () => {},
      _server: {},
      _isRunning: 'true', // Invalid
      _connections: new Map()
    };
    
    expect(() => websocketContract.enforce({}, {}, {}, facet)).toThrow(/_isRunning must be a boolean/);
  });

  it('validates _connections exists', () => {
    const facet = {
      start: () => {},
      stop: () => {},
      isRunning: () => {},
      getAddress: () => {},
      getPort: () => {},
      getConnection: () => {},
      getAllConnections: () => {},
      getConnectionCount: () => {},
      closeConnection: () => {},
      send: () => {},
      broadcast: () => {},
      onConnection: () => {},
      onDisconnection: () => {},
      onError: () => {},
      registerMessageHandler: () => {},
      routeMessage: () => {},
      _server: {},
      _isRunning: false,
      _connections: null // Invalid
    };
    
    expect(() => websocketContract.enforce({}, {}, {}, facet)).toThrow(/_connections must be defined/);
  });
});



