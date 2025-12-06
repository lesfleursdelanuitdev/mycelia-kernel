/**
 * DB Route Definitions
 * 
 * Defines the route paths used by DBSubsystem to handle database operation messages.
 * These routes are registered internally by DBSubsystem and handle incoming messages
 * from other subsystems that want to perform database operations.
 */

export const DB_ROUTES = {
  'query': {
    path: 'db://query',
    description: 'Execute a SELECT query',
    metadata: {
      type: 'query',
      purpose: 'database-query'
    },
    extractData: (body) => ({ 
      query: body.query, 
      params: body.params || [], 
      options: body.options || {} 
    }),
    handlerMethod: 'handleQuery',
    buildResponse: (data) => ({ query: data.query })
  },
  'execute': {
    path: 'db://execute',
    description: 'Execute a write operation (INSERT, UPDATE, DELETE)',
    metadata: {
      type: 'command',
      purpose: 'database-write'
    },
    extractData: (body) => ({ 
      query: body.query, 
      params: body.params || [], 
      options: body.options || {} 
    }),
    handlerMethod: 'handleExecute',
    buildResponse: (data) => ({ query: data.query })
  },
  'transaction': {
    path: 'db://transaction',
    description: 'Begin, commit, or rollback a transaction',
    metadata: {
      type: 'command',
      purpose: 'database-transaction'
    },
    extractData: (body) => ({ 
      action: body.action, 
      transactionId: body.transactionId, 
      options: body.options || {} 
    }),
    handlerMethod: 'handleTransaction',
    buildResponse: (data) => ({ 
      action: data.action, 
      transactionId: data.transactionId 
    }),
    validate: (data) => {
      if (!data.action) {
        return { success: false, error: 'Transaction action is required' };
      }
      if (data.action !== 'begin' && !data.transactionId) {
        return { success: false, error: 'Transaction ID is required for commit/rollback' };
      }
      return null;
    }
  },
  'migrate': {
    path: 'db://migrate',
    description: 'Run database schema migrations',
    metadata: {
      type: 'command',
      purpose: 'database-migration'
    },
    extractData: (body) => ({ 
      direction: body.direction || 'up', 
      version: body.version, 
      options: body.options || {} 
    }),
    handlerMethod: 'handleMigrate',
    buildResponse: (data) => ({ 
      direction: data.direction, 
      version: data.version 
    }),
    validate: (data) => {
      if (data.direction && !['up', 'down'].includes(data.direction)) {
        return { success: false, error: 'Migration direction must be "up" or "down"' };
      }
      return null;
    }
  },
  'status': {
    path: 'db://status',
    description: 'Get database status and health',
    metadata: {
      type: 'query',
      purpose: 'database-status'
    },
    extractData: (body) => ({ 
      includeStats: body.includeStats || false 
    }),
    handlerMethod: 'handleStatus',
    buildResponse: (data) => ({ includeStats: data.includeStats })
  }
};




