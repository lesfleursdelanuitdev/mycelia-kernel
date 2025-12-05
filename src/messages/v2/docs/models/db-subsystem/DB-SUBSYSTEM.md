# DBSubsystem

## Overview

The **DBSubsystem** is a dedicated subsystem that extends `BaseSubsystem` and provides a message-driven database abstraction layer for Mycelia Kernel. It enables database operations (queries, transactions, migrations) to be performed through the message system, making database access consistent with the framework's architecture.

**Key Features:**
- **Message-Driven Database Operations**: All database operations accessible via messages
- **Backend Agnostic**: Supports multiple storage backends (SQLite, IndexedDB, Memory)
- **Transaction Management**: Provides transaction management at the subsystem level
- **Migration Management**: Handles database schema migrations
- **Query Builder**: Provides a fluent query builder interface
- **Storage Abstraction**: Seamlessly integrates with existing storage hooks

## Storage Backends

The DBSubsystem supports three storage backends:

- **SQLite** (`better-sqlite3`): File-based relational database for Node.js environments
- **IndexedDB**: Browser-native, client-side database for browser environments
- **Memory**: In-memory storage for testing and development

The backend is automatically selected based on the environment and configuration. See [Storage Backend Selection](#storage-backend-selection) for details.

## Class Definition

```javascript
import { DBSubsystem } from './db-subsystem/db.subsystem.mycelia.js';

const dbSubsystem = new DBSubsystem('db', {
  ms: messageSystem,
  config: {
    storage: {
      backend: 'auto',  // or 'sqlite', 'indexeddb', 'memory'
      dbPath: './data/app.db'  // For SQLite
    },
    migrations: {
      directory: './migrations',
      autoRun: true
    }
  }
});

await dbSubsystem.build();
```

## Constructor

### Signature

```javascript
new DBSubsystem(name = 'db', options = {})
```

### Parameters

#### `name` (string, default: `'db'`)

The subsystem name. Typically `'db'` for consistency.

**Validation:**
- Must be a non-empty string
- Throws `Error` if invalid

#### `options` (object, required)

Configuration options for the subsystem.

**Required:**
- `ms` (MessageSystem): MessageSystem instance (required)

**Optional:**
- `config.storage.backend` (string, default: `'auto'`): Storage backend - `'sqlite'`, `'indexeddb'`, `'memory'`, or `'auto'`
- `config.storage.dbPath` (string, default: `'./data/storage.db'`): Database file path (for SQLite)
- `config.storage.dbName` (string, default: `'mycelia-storage'`): Database name (for IndexedDB)
- `config.migrations.directory` (string, optional): Migration directory path
- `config.migrations.autoRun` (boolean, default: `true`): Run migrations on startup
- `config.query.defaultTimeout` (number, default: `5000`): Default query timeout (ms)
- `config.transactions.defaultTimeout` (number, default: `30000`): Default transaction timeout (ms)
- `debug` (boolean, default: `false`): Enable debug logging

**Example:**
```javascript
const dbSubsystem = new DBSubsystem('db', {
  ms: messageSystem,
  config: {
    storage: {
      backend: 'sqlite',
      dbPath: './data/app.db'
    },
    migrations: {
      directory: './migrations',
      autoRun: true
    },
    query: {
      defaultTimeout: 10000
    },
    transactions: {
      defaultTimeout: 60000
    }
  },
  debug: true
});
```

## Storage Backend Selection

The DBSubsystem automatically selects the storage backend based on environment and configuration:

### Automatic Selection (`backend: 'auto'`)

- **Node.js environment**: Uses SQLite
- **Browser environment**: Uses IndexedDB
- **Fallback**: Uses Memory storage

### Manual Selection

You can explicitly specify the backend:

**SQLite (Node.js):**
```javascript
const dbSubsystem = new DBSubsystem('db', {
  ms: messageSystem,
  config: {
    storage: {
      backend: 'sqlite',
      dbPath: './data/app.db',
      walMode: true,
      synchronous: 'NORMAL'
    }
  }
});
```

**IndexedDB (Browser):**
```javascript
const dbSubsystem = new DBSubsystem('db', {
  ms: messageSystem,
  config: {
    storage: {
      backend: 'indexeddb',
      dbName: 'mycelia-storage',
      dbVersion: 1
    }
  }
});
```

**Memory (Testing/Development):**
```javascript
const dbSubsystem = new DBSubsystem('db', {
  ms: messageSystem,
  config: {
    storage: {
      backend: 'memory'
    }
  }
});
```

## Message Handlers

The DBSubsystem registers message handlers for database operations. All handlers use the `db://` protocol prefix.

### `db://query` - Execute a SELECT Query

Execute a read-only query to retrieve data.

**Message Format:**
```javascript
{
  path: 'db://query',
  body: {
    query: Array | Object,  // Query filter or array of filter conditions
    params: Array,           // Optional query parameters
    options: {               // Optional query options
      namespace: 'default',
      limit: 100,
      offset: 0
    }
  }
}
```

**Response:**
```javascript
{
  success: true,
  results: [
    {
      key: 'user:123',
      value: { name: 'John', age: 30 },
      metadata: { createdAt: 1234567890 }
    }
  ]
}
```

**Example:**
```javascript
const message = new Message('db://query', {
  query: [
    { field: 'key', operator: 'startsWith', value: 'user:' },
    { field: 'value.age', operator: 'gte', value: 18 }
  ],
  options: {
    namespace: 'users',
    limit: 50
  }
});

const result = await messageSystem.send(message);
if (result.success) {
  console.log('Found users:', result.data.results);
}
```

### `db://execute` - Execute a Write Operation

Execute a write operation (INSERT, UPDATE, DELETE).

**Message Format:**
```javascript
{
  path: 'db://execute',
  body: {
    query: 'INSERT' | 'UPDATE' | 'DELETE',  // Operation type
    params: Array,                          // Parameters: [key, value] or [key]
    options: {                              // Optional write options
      namespace: 'default',
      overwrite: true
    }
  }
}
```

**Response:**
```javascript
{
  success: true,
  affectedRows: 1
}
```

**Example - INSERT:**
```javascript
const message = new Message('db://execute', {
  query: 'INSERT',
  params: ['user:123', { name: 'John', age: 30 }],
  options: {
    namespace: 'users'
  }
});

const result = await messageSystem.send(message);
if (result.success) {
  console.log('Inserted:', result.data.affectedRows, 'rows');
}
```

**Example - UPDATE:**
```javascript
const message = new Message('db://execute', {
  query: 'UPDATE',
  params: ['user:123', { name: 'Jane', age: 31 }],
  options: {
    namespace: 'users'
  }
});

const result = await messageSystem.send(message);
```

**Example - DELETE:**
```javascript
const message = new Message('db://execute', {
  query: 'DELETE',
  params: ['user:123'],
  options: {
    namespace: 'users'
  }
});

const result = await messageSystem.send(message);
```

### `db://transaction` - Transaction Management

Begin, commit, or rollback a transaction.

**Message Format:**
```javascript
{
  path: 'db://transaction',
  body: {
    action: 'begin' | 'commit' | 'rollback',
    transactionId: string,  // Required for commit/rollback
    options: {}             // Optional transaction options
  }
}
```

**Response (begin):**
```javascript
{
  success: true,
  transactionId: 'txn_1234567890'
}
```

**Response (commit/rollback):**
```javascript
{
  success: true
}
```

**Example - Transaction:**
```javascript
// Begin transaction
const beginMsg = new Message('db://transaction', {
  action: 'begin',
  options: {}
});

const beginResult = await messageSystem.send(beginMsg);
const transactionId = beginResult.data.transactionId;

// Execute operations within transaction
const insertMsg = new Message('db://execute', {
  query: 'INSERT',
  params: ['user:123', { name: 'John' }],
  options: { transactionId }
});

await messageSystem.send(insertMsg);

// Commit transaction
const commitMsg = new Message('db://transaction', {
  action: 'commit',
  transactionId
});

const commitResult = await messageSystem.send(commitMsg);
```

### `db://migrate` - Schema Migrations

Run database schema migrations.

**Message Format:**
```javascript
{
  path: 'db://migrate',
  body: {
    direction: 'up' | 'down',  // Migration direction
    version: number,             // Optional: specific version to migrate to
    options: {}                  // Optional migration options
  }
}
```

**Response:**
```javascript
{
  success: true,
  version: 2,
  applied: ['001_create_users', '002_add_indexes']
}
```

**Example:**
```javascript
// Run all pending migrations
const message = new Message('db://migrate', {
  direction: 'up',
  options: {}
});

const result = await messageSystem.send(message);
if (result.success) {
  console.log('Applied migrations:', result.data.applied);
}

// Rollback to specific version
const rollbackMsg = new Message('db://migrate', {
  direction: 'down',
  version: 1,
  options: {}
});

await messageSystem.send(rollbackMsg);
```

### `db://status` - Database Status

Get database status and health information.

**Message Format:**
```javascript
{
  path: 'db://status',
  body: {
    includeStats: boolean  // Include detailed statistics
  }
}
```

**Response:**
```javascript
{
  success: true,
  status: {
    healthy: true,
    size: 1000,
    namespaces: 3
  },
  migrations: {  // If includeStats is true
    currentVersion: 2,
    pending: 0
  }
}
```

**Example:**
```javascript
const message = new Message('db://status', {
  includeStats: true
});

const result = await messageSystem.send(message);
if (result.success) {
  console.log('Database status:', result.data.status);
  console.log('Migrations:', result.data.migrations);
}
```

## Facets

The DBSubsystem provides several facets that can be accessed directly:

### `storage` Facet

Provides direct access to the storage backend. Implements the [Storage Contract](../../facet-contract/STORAGE-CONTRACT.md).

**Methods:**
- `get(key, options)` - Get a value by key
- `set(key, value, options)` - Set a value by key
- `delete(key, options)` - Delete a key
- `has(key, options)` - Check if key exists
- `query(filter, options)` - Query with filter
- `count(options)` - Count entries
- `beginTransaction(options)` - Begin transaction
- `commit(transactionId, options)` - Commit transaction
- `rollback(transactionId, options)` - Rollback transaction
- `getStatus(options)` - Get storage status

**Example:**
```javascript
const storage = dbSubsystem.find('storage');

// Direct storage access
const result = await storage.get('user:123', { namespace: 'users' });
if (result.success) {
  console.log('User:', result.data);
}
```

### `queryBuilder` Facet

Provides query builder functionality for database operations.

**Methods:**
- `executeQuery(query, params, options)` - Execute a SELECT query
- `executeWrite(query, params, options)` - Execute a write operation
- `builder()` - Get a fluent query builder instance

**Example:**
```javascript
const queryBuilder = dbSubsystem.find('queryBuilder');

// Execute query
const result = await queryBuilder.executeQuery(
  [{ field: 'key', operator: 'startsWith', value: 'user:' }],
  [],
  { namespace: 'users' }
);

// Use fluent builder
const builder = queryBuilder.builder();
const users = await builder
  .select('*')
  .from('users')
  .where('age', '>=', 18)
  .limit(10)
  .execute();
```

### `transactions` Facet

Provides transaction management functionality.

**Methods:**
- `begin(options)` - Begin a transaction
- `commit(transactionId, options)` - Commit a transaction
- `rollback(transactionId, options)` - Rollback a transaction
- `getStatus(transactionId)` - Get transaction status

**Example:**
```javascript
const transactions = dbSubsystem.find('transactions');

// Begin transaction
const beginResult = await transactions.begin({});
const transactionId = beginResult.transactionId;

// Use transaction in operations
await storage.set('key1', 'value1', { transactionId });
await storage.set('key2', 'value2', { transactionId });

// Commit
await transactions.commit(transactionId);
```

### `migrations` Facet

Provides migration management functionality.

**Methods:**
- `migrateUp(version, options)` - Run migrations up
- `migrateDown(version, options)` - Run migrations down
- `getStatus()` - Get migration status
- `list()` - List all migrations

**Example:**
```javascript
const migrations = dbSubsystem.find('migrations');

// Get migration status
const status = await migrations.getStatus();
console.log('Current version:', status.currentVersion);
console.log('Pending migrations:', status.pending);

// Run migrations
const result = await migrations.migrateUp();
if (result.success) {
  console.log('Applied:', result.applied);
}
```

## Lifecycle Methods

### `onInit()`

Initializes the subsystem and registers message handlers for database operations.

**Signature:**
```javascript
async onInit() => Promise<void>
```

**Behavior:**
- Registers route handlers for:
  - `db://query` - Query execution
  - `db://execute` - Write operations
  - `db://transaction` - Transaction management
  - `db://migrate` - Schema migrations
  - `db://status` - Database status

**Note:** This is called automatically during `build()`.

## Usage Examples

### Basic Setup

```javascript
import { MessageSystem } from './message-system/message-system.mycelia.js';
import { DBSubsystem } from './db-subsystem/db.subsystem.mycelia.js';

// Create message system
const messageSystem = new MessageSystem('app', { debug: false });
await messageSystem.bootstrap();

// Create DB subsystem
const dbSubsystem = new DBSubsystem('db', {
  ms: messageSystem,
  config: {
    storage: {
      backend: 'auto',
      dbPath: './data/app.db'
    },
    migrations: {
      directory: './migrations',
      autoRun: true
    }
  }
});

// Build subsystem
await dbSubsystem.build();

// Register with message system
await messageSystem.registerSubsystem(dbSubsystem);
```

### Querying Data

```javascript
// Query users older than 18
const message = new Message('db://query', {
  query: [
    { field: 'value.age', operator: 'gte', value: 18 }
  ],
  options: {
    namespace: 'users',
    limit: 100
  }
});

const result = await messageSystem.send(message);
if (result.success) {
  const users = result.data.results;
  console.log(`Found ${users.length} users`);
}
```

### Inserting Data

```javascript
// Insert a new user
const message = new Message('db://execute', {
  query: 'INSERT',
  params: ['user:123', {
    name: 'John Doe',
    email: 'john@example.com',
    age: 30
  }],
  options: {
    namespace: 'users'
  }
});

const result = await messageSystem.send(message);
if (result.success) {
  console.log('User inserted successfully');
}
```

### Using Transactions

```javascript
// Begin transaction
const beginMsg = new Message('db://transaction', {
  action: 'begin'
});

const beginResult = await messageSystem.send(beginMsg);
const transactionId = beginResult.data.transactionId;

try {
  // Insert multiple records
  await messageSystem.send(new Message('db://execute', {
    query: 'INSERT',
    params: ['user:1', { name: 'Alice' }],
    options: { transactionId, namespace: 'users' }
  }));

  await messageSystem.send(new Message('db://execute', {
    query: 'INSERT',
    params: ['user:2', { name: 'Bob' }],
    options: { transactionId, namespace: 'users' }
  }));

  // Commit
  await messageSystem.send(new Message('db://transaction', {
    action: 'commit',
    transactionId
  }));
} catch (error) {
  // Rollback on error
  await messageSystem.send(new Message('db://transaction', {
    action: 'rollback',
    transactionId
  }));
}
```

### Direct Facet Access

```javascript
// Access storage facet directly
const storage = dbSubsystem.find('storage');

// Get value
const result = await storage.get('user:123', { namespace: 'users' });
if (result.success) {
  console.log('User:', result.data);
}

// Set value
await storage.set('user:123', {
  name: 'John',
  age: 30
}, { namespace: 'users' });

// Query
const queryResult = await storage.query(
  [{ field: 'value.age', operator: 'gte', value: 18 }],
  { namespace: 'users' }
);
```

## Integration with Other Subsystems

The DBSubsystem can be used by other subsystems through the message system:

```javascript
// From another subsystem
class UserSubsystem extends BaseSubsystem {
  async handleGetUser(message) {
    const dbMessage = new Message('db://query', {
      query: [{ field: 'key', operator: 'eq', value: message.body.userId }],
      options: { namespace: 'users' }
    });

    const result = await this.messageSystem.send(dbMessage);
    return result;
  }
}
```

## Error Handling

All database operations return a result object with a `success` flag:

```javascript
const result = await messageSystem.send(message);

if (!result.success) {
  console.error('Database error:', result.error);
  // Handle error
} else {
  // Use result.data
  console.log('Success:', result.data);
}
```

## Configuration Reference

### Storage Configuration

```javascript
config: {
  storage: {
    backend: 'auto' | 'sqlite' | 'indexeddb' | 'memory',
    
    // SQLite options
    dbPath: './data/storage.db',
    walMode: true,
    synchronous: 'NORMAL',
    busyTimeout: 5000,
    
    // IndexedDB options
    dbName: 'mycelia-storage',
    dbVersion: 1
  }
}
```

### Migrations Configuration

```javascript
config: {
  migrations: {
    directory: './migrations',  // Migration files directory
    autoRun: true                // Run migrations on startup
  }
}
```

### Query Configuration

```javascript
config: {
  query: {
    defaultTimeout: 5000  // Default query timeout in milliseconds
  }
}
```

### Transactions Configuration

```javascript
config: {
  transactions: {
    defaultTimeout: 30000  // Default transaction timeout in milliseconds
  }
}
```

## Best Practices

1. **Use Messages for Cross-Subsystem Communication**: Always use messages (`db://query`, `db://execute`, etc.) when accessing the database from other subsystems.

2. **Use Facets for Internal Operations**: When working within the DBSubsystem or its hooks, use facets directly for better performance.

3. **Handle Errors Gracefully**: Always check the `success` flag in responses and handle errors appropriately.

4. **Use Transactions for Multiple Operations**: When performing multiple related operations, wrap them in a transaction to ensure atomicity.

5. **Namespace Your Data**: Use namespaces to organize data logically (e.g., `'users'`, `'products'`, `'orders'`).

6. **Run Migrations on Startup**: Set `autoRun: true` in migrations config to ensure schema is up-to-date.

7. **Choose Appropriate Backend**: Use SQLite for Node.js, IndexedDB for browsers, and Memory for testing.

## See Also

- [BaseSubsystem](../BASE-SUBSYSTEM.md) - Base class documentation
- [Storage Contract](../facet-contract/STORAGE-CONTRACT.md) - Storage contract specification
- [Message System](../../message/MESSAGE-SYSTEM.md) - Message system documentation
- [DB Subsystem Design](../../../../DB-SUBSYSTEM-DESIGN.md) - Design document

