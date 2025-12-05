/**
 * WebSocket Route Definitions
 * 
 * Defines the route paths used by WebSocketSubsystem to handle WebSocket operations.
 * These routes are registered internally by WebSocketSubsystem and handle incoming messages
 * from other subsystems that want to interact with WebSocket connections.
 */

export const WEBSOCKET_ROUTES = {
  'send': {
    path: 'websocket://send',
    description: 'Send message to specific WebSocket connection',
    metadata: {
      type: 'route',
      purpose: 'websocket-operation'
    },
    extractData: (body) => ({ connectionId: body.connectionId, message: body.message }),
    websocketMethod: 'send',
    buildResponse: (data) => ({ connectionId: data.connectionId, sent: true }),
    validate: (data) => {
      if (!data.connectionId) {
        return { success: false, error: 'connectionId is required' };
      }
      if (data.message === undefined) {
        return { success: false, error: 'message is required' };
      }
      return null;
    }
  },
  'broadcast': {
    path: 'websocket://broadcast',
    description: 'Broadcast message to all or filtered WebSocket connections',
    metadata: {
      type: 'route',
      purpose: 'websocket-operation'
    },
    extractData: (body) => ({ message: body.message, filter: body.filter }),
    websocketMethod: 'broadcast',
    buildResponse: () => ({ broadcast: true }),
    validate: (data) => {
      if (data.message === undefined) {
        return { success: false, error: 'message is required' };
      }
      return null;
    }
  },
  'closeConnection': {
    path: 'websocket://close',
    description: 'Close a specific WebSocket connection',
    metadata: {
      type: 'route',
      purpose: 'websocket-operation'
    },
    extractData: (body) => ({ connectionId: body.connectionId, code: body.code, reason: body.reason }),
    websocketMethod: 'closeConnection',
    buildResponse: (data) => ({ connectionId: data.connectionId, closed: true }),
    validate: (data) => {
      if (!data.connectionId) {
        return { success: false, error: 'connectionId is required' };
      }
      return null;
    }
  }
};

