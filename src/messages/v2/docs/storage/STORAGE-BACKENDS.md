# Storage Backends - Usage Examples

## Overview

Mycelia Kernel supports multiple storage backends for different environments and use cases. This document provides comprehensive usage examples for each storage backend.

**Supported Backends:**
- **SQLite** - File-based relational database for Node.js
- **IndexedDB** - Browser-native database for browser environments
- **Memory** - In-memory storage for testing and development

## Storage Backend Selection

The storage backend can be selected automatically or explicitly:

### Automatic Selection (`backend: 'auto'`)

```javascript
const dbSubsystem = new DBSubsystem('db', {
  ms: messageSystem,
  config: {
    storage: {
      backend: 'auto'  // Auto-detects based on environment
    }
  }
});
```

**Auto-Detection Rules:**
- **Node.js environment**: Uses SQLite
- **Browser environment**: Uses IndexedDB
- **Fallback**: Uses Memory storage

### Explicit Selection

```javascript
// SQLite (Node.js)
const dbSubsystem = new DBSubsystem('db', {
  ms: messageSystem,
  config: {
    storage: {
      backend: 'sqlite',
      dbPath: './data/app.db'
    }
  }
});

// IndexedDB (Browser)
const dbSubsystem = new DBSubsystem('db', {
  ms: messageSystem,
  config: {
    storage: {
      backend: 'indexeddb',
      dbName: 'mycelia-storage'
    }
  }
});

// Memory (Testing)
const dbSubsystem = new DBSubsystem('db', {
  ms: messageSystem,
  config: {
    storage: {
      backend: 'memory',
      capacity: 10000
    }
  }
});
```

## SQLite Storage Backend

### Overview

SQLite is a file-based relational database suitable for Node.js environments. It provides ACID transactions, SQL queries, and persistent storage.

**Use Cases:**
- Server-side applications
- Desktop applications
- Embedded systems
- Single-file database requirements

### Basic Setup

```javascript
import { DBSubsystem } from './db-subsystem/db.subsystem.mycelia.js';
import { MessageSystem } from './message-system/message-system.v2.mycelia.js';

const messageSystem = new MessageSystem('app');
await messageSystem.bootstrap();

const dbSubsystem = new DBSubsystem('db', {
  ms: messageSystem,
  config: {
    storage: {
      backend: 'sqlite',
      dbPath: './data/app.db',
      walMode: true,  // Enable Write-Ahead Logging
      synchronous: 'NORMAL',  // 'OFF', 'NORMAL', or 'FULL'
      busyTimeout: 5000,  // 5 seconds
      migrate: true  // Run migrations on startup
    }
  }
});

await dbSubsystem.build();
```

### Configuration Options

```javascript
{
  storage: {
    backend: 'sqlite',
    dbPath: './data/app.db',  // Database file path
    walMode: true,  // Enable WAL mode (recommended)
    synchronous: 'NORMAL',  // Synchronization mode
    busyTimeout: 5000,  // Busy timeout in milliseconds
    migrate: true,  // Run migrations on startup
    debug: false  // Enable SQL logging
  }
}
```

### Basic Operations

```javascript
import { Message } from './message/message.mycelia.js';

// Store data
const setMessage = new Message('db://set', {
  key: 'user:123',
  value: {
    id: '123',
    name: 'Alice',
    email: 'alice@example.com'
  },
  namespace: 'users'
});

const setResult = await messageSystem.send(setMessage);
console.log(setResult.success); // true

// Retrieve data
const getMessage = new Message('db://get', {
  key: 'user:123',
  namespace: 'users'
});

const getResult = await messageSystem.send(getMessage);
console.log(getResult.data); // { id: '123', name: 'Alice', ... }

// Delete data
const deleteMessage = new Message('db://delete', {
  key: 'user:123',
  namespace: 'users'
});

await messageSystem.send(deleteMessage);

// Check if key exists
const hasMessage = new Message('db://has', {
  key: 'user:123',
  namespace: 'users'
});

const hasResult = await messageSystem.send(hasMessage);
console.log(hasResult.exists); // true or false
```

### Using Namespaces

```javascript
// Store in different namespaces
await messageSystem.send(new Message('db://set', {
  key: 'user:123',
  value: userData,
  namespace: 'users'
}));

await messageSystem.send(new Message('db://set', {
  key: 'session:456',
  value: sessionData,
  namespace: 'sessions'
}));

// List keys in namespace
const listMessage = new Message('db://list', {
  namespace: 'users',
  limit: 10,
  offset: 0
});

const listResult = await messageSystem.send(listMessage);
console.log(listResult.keys); // ['user:123', 'user:456', ...]
```

### Query Operations

```javascript
// Query with filters
const queryMessage = new Message('db://query', {
  filter: [
    { field: 'age', operator: 'gte', value: 18 },
    { field: 'status', operator: 'eq', value: 'active' }
  ],
  namespace: 'users'
});

const queryResult = await messageSystem.send(queryMessage);
console.log(queryResult.results); // Array of matching entries

// Count entries
const countMessage = new Message('db://count', {
  namespace: 'users',
  filter: { field: 'status', operator: 'eq', value: 'active' }
});

const countResult = await messageSystem.send(countMessage);
console.log(countResult.count); // Number of active users
```

### Batch Operations

```javascript
// Set multiple values
const setManyMessage = new Message('db://setMany', {
  entries: [
    { key: 'user:1', value: user1, options: { namespace: 'users' } },
    { key: 'user:2', value: user2, options: { namespace: 'users' } },
    { key: 'user:3', value: user3, options: { namespace: 'users' } }
  ]
});

const setManyResult = await messageSystem.send(setManyMessage);
console.log(setManyResult.results); // Map of results

// Get multiple values
const getManyMessage = new Message('db://getMany', {
  keys: ['user:1', 'user:2', 'user:3'],
  namespace: 'users'
});

const getManyResult = await messageSystem.send(getManyMessage);
console.log(getManyResult.data); // Map of key-value pairs

// Delete multiple keys
const deleteManyMessage = new Message('db://deleteMany', {
  keys: ['user:1', 'user:2', 'user:3'],
  namespace: 'users'
});

await messageSystem.send(deleteManyMessage);
```

### Transactions

```javascript
// Begin transaction
const beginMessage = new Message('db://transaction', {
  action: 'begin'
});

const beginResult = await messageSystem.send(beginMessage);
const transactionId = beginResult.transactionId;

// Perform operations within transaction
await messageSystem.send(new Message('db://set', {
  key: 'user:1',
  value: user1,
  namespace: 'users',
  transactionId
}));

await messageSystem.send(new Message('db://set', {
  key: 'user:2',
  value: user2,
  namespace: 'users',
  transactionId
}));

// Commit transaction
const commitMessage = new Message('db://transaction', {
  action: 'commit',
  transactionId
});

await messageSystem.send(commitMessage);

// Or rollback on error
const rollbackMessage = new Message('db://transaction', {
  action: 'rollback',
  transactionId
});

await messageSystem.send(rollbackMessage);
```

### Metadata Management

```javascript
// Set metadata
await messageSystem.send(new Message('db://setMetadata', {
  key: 'user:123',
  namespace: 'users',
  metadata: {
    tags: ['premium', 'verified'],
    lastUpdated: Date.now()
  }
}));

// Get metadata
const getMetadataMessage = new Message('db://getMetadata', {
  key: 'user:123',
  namespace: 'users'
});

const metadataResult = await messageSystem.send(getMetadataMessage);
console.log(metadataResult.metadata); // { tags: [...], lastUpdated: ... }
```

### Direct Storage Access

```javascript
// Access storage facet directly
const storage = dbSubsystem.find('storage');

// Direct operations
await storage.set('user:123', userData, { namespace: 'users' });
const result = await storage.get('user:123', { namespace: 'users' });
await storage.delete('user:123', { namespace: 'users' });

// Query
const queryResult = await storage.query(
  [{ field: 'age', operator: 'gte', value: 18 }],
  { namespace: 'users' }
);

// Batch operations
await storage.setMany([
  { key: 'user:1', value: user1, options: { namespace: 'users' } },
  { key: 'user:2', value: user2, options: { namespace: 'users' } }
], { namespace: 'users' });
```

## IndexedDB Storage Backend

### Overview

IndexedDB is a browser-native database suitable for client-side applications. It provides large storage capacity, indexed queries, and persistent storage.

**Use Cases:**
- Browser-based applications
- Progressive Web Apps (PWAs)
- Client-side data caching
- Offline-first applications

### Basic Setup

```javascript
import { DBSubsystem } from './db-subsystem/db.subsystem.mycelia.js';
import { MessageSystem } from './message-system/message-system.v2.mycelia.js';

const messageSystem = new MessageSystem('app');
await messageSystem.bootstrap();

const dbSubsystem = new DBSubsystem('db', {
  ms: messageSystem,
  config: {
    storage: {
      backend: 'indexeddb',
      dbName: 'mycelia-storage',
      dbVersion: 1,
      migrate: true
    }
  }
});

await dbSubsystem.build();
```

### Configuration Options

```javascript
{
  storage: {
    backend: 'indexeddb',
    dbName: 'mycelia-storage',  // Database name
    dbVersion: 1,  // Database version (for migrations)
    migrate: true,  // Run migrations on startup
    debug: false  // Enable debug logging
  }
}
```

### Basic Operations

```javascript
// Store data
await messageSystem.send(new Message('db://set', {
  key: 'user:123',
  value: {
    id: '123',
    name: 'Alice',
    email: 'alice@example.com'
  },
  namespace: 'users'
}));

// Retrieve data
const getResult = await messageSystem.send(new Message('db://get', {
  key: 'user:123',
  namespace: 'users'
}));

// Delete data
await messageSystem.send(new Message('db://delete', {
  key: 'user:123',
  namespace: 'users'
}));
```

### Query Operations

```javascript
// Query with filters
const queryResult = await messageSystem.send(new Message('db://query', {
  filter: [
    { field: 'age', operator: 'gte', value: 18 }
  ],
  namespace: 'users'
}));

console.log(queryResult.results); // Array of matching entries
```

### Namespace Management

```javascript
// Create namespace
await messageSystem.send(new Message('db://createNamespace', {
  name: 'users',
  metadata: { description: 'User data' }
}));

// List namespaces
const listNamespacesResult = await messageSystem.send(new Message('db://listNamespaces', {}));
console.log(listNamespacesResult.namespaces); // ['default', 'users', ...]

// Delete namespace (with recursive option)
await messageSystem.send(new Message('db://deleteNamespace', {
  name: 'users',
  recursive: true  // Delete all keys in namespace
}));
```

### Direct Storage Access

```javascript
// Access storage facet directly
const storage = dbSubsystem.find('storage');

// Operations
await storage.set('user:123', userData, { namespace: 'users' });
const result = await storage.get('user:123', { namespace: 'users' });

// Query
const queryResult = await storage.query(
  [{ field: 'age', operator: 'gte', value: 18 }],
  { namespace: 'users' }
);
```

## Memory Storage Backend

### Overview

Memory storage is an in-memory storage backend suitable for testing and development. Data is not persisted and is lost when the process ends.

**Use Cases:**
- Unit testing
- Development and prototyping
- Caching
- Temporary data storage

### Basic Setup

```javascript
import { DBSubsystem } from './db-subsystem/db.subsystem.mycelia.js';
import { MessageSystem } from './message-system/message-system.v2.mycelia.js';

const messageSystem = new MessageSystem('app');
await messageSystem.bootstrap();

const dbSubsystem = new DBSubsystem('db', {
  ms: messageSystem,
  config: {
    storage: {
      backend: 'memory',
      capacity: 10000  // Maximum number of entries
    }
  }
});

await dbSubsystem.build();
```

### Configuration Options

```javascript
{
  storage: {
    backend: 'memory',
    capacity: 10000  // Maximum number of entries (optional)
  }
}
```

### Basic Operations

```javascript
// Store data
await messageSystem.send(new Message('db://set', {
  key: 'user:123',
  value: {
    id: '123',
    name: 'Alice'
  },
  namespace: 'users'
}));

// Retrieve data
const getResult = await messageSystem.send(new Message('db://get', {
  key: 'user:123',
  namespace: 'users'
}));

// Clear all data
await messageSystem.send(new Message('db://clear', {
  namespace: 'users'  // Clear specific namespace, or omit to clear all
}));
```

### Direct Storage Access

```javascript
// Access storage facet directly
const storage = dbSubsystem.find('storage');

// Operations
await storage.set('user:123', userData, { namespace: 'users' });
const result = await storage.get('user:123', { namespace: 'users' });

// Clear
await storage.clear({ namespace: 'users' });
```

## Common Patterns

### Using with AuthSubsystem

```javascript
// AuthSubsystem uses DBSubsystem for storage
const authSubsystem = new AuthSubsystem('auth', {
  ms: messageSystem,
  config: {
    storage: {
      backend: 'sqlite',  // Use SQLite for production
      dbPath: './data/auth.db'
    }
  }
});

await authSubsystem.build();
```

### Environment-Based Selection

```javascript
function getStorageConfig() {
  if (typeof window !== 'undefined') {
    // Browser environment
    return {
      backend: 'indexeddb',
      dbName: 'mycelia-storage'
    };
  } else {
    // Node.js environment
    return {
      backend: 'sqlite',
      dbPath: './data/app.db'
    };
  }
}

const dbSubsystem = new DBSubsystem('db', {
  ms: messageSystem,
  config: {
    storage: getStorageConfig()
  }
});
```

### Testing with Memory Storage

```javascript
// Use memory storage for tests
describe('My Feature', () => {
  let dbSubsystem;

  beforeEach(async () => {
    dbSubsystem = new DBSubsystem('db', {
      ms: messageSystem,
      config: {
        storage: {
          backend: 'memory'  // Fast, no persistence
        }
      }
    });
    await dbSubsystem.build();
  });

  afterEach(async () => {
    await dbSubsystem.dispose();
  });

  it('should store and retrieve data', async () => {
    await messageSystem.send(new Message('db://set', {
      key: 'test:1',
      value: { data: 'test' }
    }));

    const result = await messageSystem.send(new Message('db://get', {
      key: 'test:1'
    }));

    expect(result.data).toEqual({ data: 'test' });
  });
});
```

### Error Handling

```javascript
try {
  const result = await messageSystem.send(new Message('db://set', {
    key: 'user:123',
    value: userData
  }));

  if (!result.success) {
    console.error('Storage error:', result.error);
    // Handle error
  }
} catch (error) {
  console.error('Unexpected error:', error);
  // Handle unexpected error
}
```

## Performance Considerations

### SQLite

- **WAL Mode**: Enable for better concurrency
- **Synchronous Mode**: Use `'NORMAL'` for balance between safety and performance
- **Prepared Statements**: Automatically used for better performance
- **Batch Operations**: Use `setMany`/`getMany` for multiple operations

### IndexedDB

- **Transactions**: Use transactions for multiple operations
- **Indexes**: Queries use indexes automatically
- **Batch Operations**: Use `setMany`/`getMany` for better performance

### Memory

- **Capacity Limits**: Set appropriate capacity limits
- **Fast Operations**: Use for high-frequency operations
- **No Persistence**: Remember data is lost on process end

## Best Practices

1. **Namespace Organization**
   - Use namespaces to organize data logically
   - Keep namespace names consistent across your application

2. **Error Handling**
   - Always check `success` property in responses
   - Handle storage errors gracefully
   - Log errors for debugging

3. **Transactions**
   - Use transactions for related operations
   - Always commit or rollback transactions
   - Set appropriate transaction timeouts

4. **Query Optimization**
   - Use specific filters to reduce query results
   - Use indexes when available (IndexedDB)
   - Limit query results with `limit` option

5. **Testing**
   - Use memory storage for unit tests
   - Use SQLite/IndexedDB for integration tests
   - Clean up test data after tests

## Related Documentation

- [DBSubsystem](./models/db-subsystem/DB-SUBSYSTEM.md) - Database subsystem documentation
- [Storage Contract Design](../../../../STORAGE-CONTRACT-DESIGN.md) - Storage contract specification
- [SQLite Storage Adapter Plan](../../../../SQLITE-STORAGE-ADAPTER-PLAN.md) - SQLite implementation details
- [IndexedDB Storage Adapter Plan](../../../../INDEXEDDB-STORAGE-ADAPTER-PLAN.md) - IndexedDB implementation details



