import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WebSocketConnection } from '../websocket-connection.mycelia.js';

describe('WebSocketConnection', () => {
  let mockSocket;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockSocket = {
      readyState: 1, // WebSocket.OPEN
      send: vi.fn((data, callback) => {
        if (callback) callback();
      }),
      close: vi.fn(),
      ping: vi.fn()
    };
  });

  it('creates connection with socket', () => {
    const connection = new WebSocketConnection(mockSocket);
    
    expect(connection.socket).toBe(mockSocket);
    expect(connection.id).toBeDefined();
    expect(connection.metadata).toEqual({});
    expect(connection.connectedAt).toBeInstanceOf(Date);
    expect(connection.lastActivity).toBeInstanceOf(Date);
  });

  it('generates unique connection IDs', () => {
    const conn1 = new WebSocketConnection(mockSocket);
    const conn2 = new WebSocketConnection(mockSocket);
    
    expect(conn1.id).not.toBe(conn2.id);
  });

  it('accepts custom connection ID', () => {
    const connection = new WebSocketConnection(mockSocket, { id: 'custom-id' });
    
    expect(connection.id).toBe('custom-id');
  });

  it('accepts custom metadata', () => {
    const metadata = { userId: 'user-123', session: 'session-456' };
    const connection = new WebSocketConnection(mockSocket, { metadata });
    
    expect(connection.metadata).toEqual(metadata);
  });

  it('sends string messages', async () => {
    const connection = new WebSocketConnection(mockSocket);
    
    await connection.send('Hello');
    
    expect(mockSocket.send).toHaveBeenCalledWith('Hello', expect.any(Function));
  });

  it('sends object messages as JSON', async () => {
    const connection = new WebSocketConnection(mockSocket);
    
    await connection.send({ message: 'Hello', data: { foo: 'bar' } });
    
    expect(mockSocket.send).toHaveBeenCalledWith(
      JSON.stringify({ message: 'Hello', data: { foo: 'bar' } }),
      expect.any(Function)
    );
  });

  it('updates lastActivity on send', async () => {
    const connection = new WebSocketConnection(mockSocket);
    const initialActivity = connection.lastActivity;
    
    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 10));
    
    await connection.send('test');
    
    expect(connection.lastActivity.getTime()).toBeGreaterThan(initialActivity.getTime());
  });

  it('throws error if sending to closed connection', async () => {
    const connection = new WebSocketConnection(mockSocket);
    connection._isClosed = true;
    
    await expect(connection.send('test')).rejects.toThrow(/closed connection/);
  });

  it('throws error if socket is not open', async () => {
    mockSocket.readyState = 3; // WebSocket.CLOSED
    const connection = new WebSocketConnection(mockSocket);
    
    await expect(connection.send('test')).rejects.toThrow(/not open/);
  });

  it('closes connection', () => {
    const connection = new WebSocketConnection(mockSocket);
    
    connection.close(1000, 'Normal closure');
    
    expect(mockSocket.close).toHaveBeenCalledWith(1000, 'Normal closure');
    expect(connection._isClosed).toBe(true);
  });

  it('does not close already closed connection', () => {
    const connection = new WebSocketConnection(mockSocket);
    connection._isClosed = true;
    
    connection.close();
    
    expect(mockSocket.close).not.toHaveBeenCalled();
  });

  it('pings connection if supported', () => {
    const connection = new WebSocketConnection(mockSocket);
    
    connection.ping();
    
    expect(mockSocket.ping).toHaveBeenCalled();
  });

  it('checks if connection is closed', () => {
    const connection = new WebSocketConnection(mockSocket);
    
    expect(connection.isClosed()).toBe(false);
    
    connection._isClosed = true;
    expect(connection.isClosed()).toBe(true);
  });

  it('checks if connection is open', () => {
    const connection = new WebSocketConnection(mockSocket);
    
    expect(connection.isOpen()).toBe(true);
    
    connection._isClosed = true;
    expect(connection.isOpen()).toBe(false);
    
    connection._isClosed = false;
    mockSocket.readyState = 3; // CLOSED
    expect(connection.isOpen()).toBe(false);
  });

  it('updates activity timestamp', () => {
    const connection = new WebSocketConnection(mockSocket);
    const initialActivity = connection.lastActivity;
    
    // Wait a bit
    setTimeout(() => {
      connection.updateActivity();
      expect(connection.lastActivity.getTime()).toBeGreaterThan(initialActivity.getTime());
    }, 10);
  });

  it('calculates connection age', () => {
    const connection = new WebSocketConnection(mockSocket);
    
    const age = connection.getAge();
    expect(age).toBeGreaterThanOrEqual(0);
  });

  it('calculates time since last activity', () => {
    const connection = new WebSocketConnection(mockSocket);
    
    const timeSince = connection.getTimeSinceLastActivity();
    expect(timeSince).toBeGreaterThanOrEqual(0);
  });
});




