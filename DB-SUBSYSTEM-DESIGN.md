# DB Subsystem Design

## Overview

The DB Subsystem provides a message-driven database abstraction layer for Mycelia Kernel. It enables database operations (queries, transactions, migrations) to be performed through the message system, making database access consistent with the framework's architecture.

## Design Goals

1. **Message-Driven**: All database operations should be accessible via messages
2. **Backend Agnostic**: Support multiple storage backends (SQLite, IndexedDB, Memory, future: PostgreSQL, MySQL)
3. **Transaction Support**: Provide transaction management at the subsystem level
4. **Migration Management**: Handle database schema migrations
5. **Query Builder**: Provide a fluent query builder interface
6. **Integration**: Seamlessly integrate with existing storage hooks and MessageSystem

## Architecture Options

### Option A: Subsystem Wrapper (Recommended)

A dedicated `DBSubsystem` that:
- Wraps storage hooks (`useSQLiteStorage`, `useIndexedDBStorage`, etc.)
- Provides message-based database operations
- Manages connections and transactions
- Handles migrations

**Pros:**
- Clean separation of concerns
- Consistent with ServerSubsystem pattern
- Easy to extend with new backends
- Message-driven interface

**Cons:**
- Additional abstraction layer
- Potential performance overhead

### Option B: Enhanced Storage Hook

Extend existing storage hooks to support message-based operations directly.

**Pros:**
- No additional subsystem needed
- Direct access to storage

**Cons:**
- Mixes concerns (storage vs. database operations)
- Less flexible for complex database operations
- Doesn't follow subsystem pattern

### Option C: Hybrid Approach

Storage hooks provide low-level storage, DB Subsystem provides high-level database operations.

**Pros:**
- Best of both worlds
- Clear separation: storage (low-level) vs. database (high-level)

**Cons:**
- More complex architecture
- Potential duplication

## Recommended Architecture: Option A

### Structure

```
DBSubsystem (BaseSubsystem)
├── useStorage (wraps useSQLiteStorage/useIndexedDBStorage)
├── useMigrations
├── useQueryBuilder
├── useTransactions
└── Message Handlers
    ├── db.query
    ├── db.execute
    ├── db.transaction
    ├── db.migrate
    └── db.status
```

### Components

#### 1. DBSubsystem Class

```javascript
class DBSubsystem extends BaseSubsystem {
  constructor(name, options) {
    super(name, {
      ms: options.ms,
      config: {
        storage: options.storage, // Storage backend config
        migrations: options.migrations,
        ...
      }
    });
  }
  
  async build() {
    return this
      .use(useStorage) // Wraps appropriate storage hook
      .use(useMigrations)
      .use(useQueryBuilder)
      .use(useTransactions)
      .build();
  }
}
```

#### 2. Storage Backend Selection

The subsystem should automatically select the appropriate storage backend based on:
- Environment (Node.js → SQLite, Browser → IndexedDB)
- Configuration (explicit backend selection)
- Availability (fallback to Memory if others unavailable)

```javascript
function selectStorageBackend(config, ctx) {
  if (config.backend === 'sqlite' && isNodeJS()) {
    return useSQLiteStorage;
  }
  if (config.backend === 'indexeddb' && isBrowser()) {
    return useIndexedDBStorage;
  }
  if (config.backend === 'memory') {
    return useMemoryStorage;
  }
  // Auto-detect
  if (isNodeJS()) {
    return useSQLiteStorage;
  }
  if (isBrowser()) {
    return useIndexedDBStorage;
  }
  return useMemoryStorage; // Fallback
}
```

#### 3. Message Handlers

##### db.query
Execute a query and return results.

```javascript
{
  type: 'db.query',
  body: {
    query: 'SELECT * FROM users WHERE age > ?',
    params: [18],
    options: {
      namespace: 'default',
      timeout: 5000
    }
  }
}
```

##### db.execute
Execute a write operation (INSERT, UPDATE, DELETE).

```javascript
{
  type: 'db.execute',
  body: {
    query: 'INSERT INTO users (name, email) VALUES (?, ?)',
    params: ['John', 'john@example.com'],
    options: {
      namespace: 'default',
      transactionId: 'tx_123' // Optional
    }
  }
}
```

##### db.transaction
Begin, commit, or rollback a transaction.

```javascript
// Begin
{
  type: 'db.transaction',
  body: {
    action: 'begin',
    options: {
      stores: ['storage_entries'],
      mode: 'readwrite'
    }
  }
}

// Commit
{
  type: 'db.transaction',
  body: {
    action: 'commit',
    transactionId: 'tx_123'
  }
}

// Rollback
{
  type: 'db.transaction',
  body: {
    action: 'rollback',
    transactionId: 'tx_123'
  }
}
```

##### db.migrate
Run database migrations.

```javascript
{
  type: 'db.migrate',
  body: {
    direction: 'up', // or 'down'
    version: 2, // Optional: specific version
    options: {
      dryRun: false
    }
  }
}
```

##### db.status
Get database status and health.

```javascript
{
  type: 'db.status',
  body: {
    includeStats: true
  }
}
```

#### 4. Query Builder Hook (`useQueryBuilder`)

Provides a fluent query builder interface:

```javascript
const query = subsystem.db
  .select('users')
  .where('age', '>', 18)
  .orderBy('name', 'ASC')
  .limit(10)
  .build();

const result = await subsystem.send({
  type: 'db.query',
  body: query
});
```

Or direct execution:

```javascript
const result = await subsystem.db
  .select('users')
  .where('age', '>', 18)
  .execute();
```

#### 5. Migration Hook (`useMigrations`)

Manages database schema migrations:

```javascript
// Migration files
// migrations/001_create_users.js
export default {
  up: async (db) => {
    await db.execute(`
      CREATE TABLE users (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE
      )
    `);
  },
  down: async (db) => {
    await db.execute('DROP TABLE users');
  }
};
```

Migration registry:

```javascript
subsystem.migrations.register({
  version: 1,
  name: 'create_users',
  up: async (db) => { ... },
  down: async (db) => { ... }
});
```

#### 6. Transaction Hook (`useTransactions`)

Manages transactions at the subsystem level:

```javascript
// Begin transaction
const tx = await subsystem.transactions.begin();

// Execute operations
await subsystem.send({
  type: 'db.execute',
  body: { query: '...', options: { transactionId: tx.id } }
});

// Commit or rollback
await subsystem.transactions.commit(tx.id);
```

## Integration Points

### 1. MessageSystem Integration

The DB Subsystem should:
- Register message handlers for database operations
- Support both synchronous and asynchronous message processing
- Integrate with routing and scheduling

### 2. Storage Hook Integration

The DB Subsystem wraps storage hooks:
- Uses storage hooks for low-level operations
- Provides high-level database operations on top
- Maintains compatibility with storage contract

### 3. Security Integration

Database operations should respect:
- Principal-based access control
- Resource-based permissions
- Security profiles

```javascript
// Example: Check permission before query
const hasPermission = await subsystem.security.check(
  principal,
  'db://query/users',
  'read'
);
```

### 4. Observability Integration

Database operations should emit:
- Traces for query execution
- Metrics for query performance
- Logs for debugging

## Configuration

```javascript
const dbSubsystem = new DBSubsystem('db', {
  ms: messageSystem,
  config: {
    // Storage backend configuration
    storage: {
      backend: 'sqlite', // 'sqlite' | 'indexeddb' | 'memory' | 'auto'
      dbPath: './data/app.db', // For SQLite
      dbName: 'app-db', // For IndexedDB
      // ... other storage config
    },
    
    // Migration configuration
    migrations: {
      directory: './migrations',
      tableName: 'schema_migrations',
      autoRun: true, // Run migrations on startup
    },
    
    // Query configuration
    query: {
      defaultTimeout: 5000,
      maxResults: 1000,
      enableQueryBuilder: true,
    },
    
    // Transaction configuration
    transactions: {
      defaultTimeout: 30000,
      maxConcurrent: 10,
    },
    
    // Observability
    observability: {
      traceQueries: true,
      logSlowQueries: true,
      slowQueryThreshold: 1000, // ms
    }
  }
});
```

## Message Flow Examples

### Example 1: Simple Query

```
Client → MessageSystem → DBSubsystem
  ↓
  Route: 'db.query'
  ↓
  Handler: executeQuery()
  ↓
  Storage Hook: query()
  ↓
  Backend: SQLite/IndexedDB
  ↓
  Response → Client
```

### Example 2: Transaction

```
Client → MessageSystem → DBSubsystem
  ↓
  Route: 'db.transaction' (begin)
  ↓
  Handler: beginTransaction()
  ↓
  Storage Hook: beginTransaction()
  ↓
  Transaction ID returned
  ↓
  Client → 'db.execute' (with transactionId)
  ↓
  Handler: executeInTransaction()
  ↓
  Storage Hook: set() (with transaction)
  ↓
  Client → 'db.transaction' (commit)
  ↓
  Handler: commitTransaction()
  ↓
  Storage Hook: commit()
```

### Example 3: Migration

```
Client → MessageSystem → DBSubsystem
  ↓
  Route: 'db.migrate'
  ↓
  Handler: runMigrations()
  ↓
  Load migration files
  ↓
  For each migration:
    Storage Hook: execute()
  ↓
  Update migration version
  ↓
  Response → Client
```

## Query Builder API

### Select Queries

```javascript
// Simple select
await subsystem.db
  .select('users')
  .where('active', true)
  .execute();

// Complex select
await subsystem.db
  .select('users', ['id', 'name', 'email'])
  .where('age', '>', 18)
  .where('city', 'IN', ['NYC', 'LA'])
  .orderBy('name', 'ASC')
  .limit(10)
  .offset(0)
  .execute();

// Joins (if backend supports)
await subsystem.db
  .select('users')
  .join('profiles', 'users.id', 'profiles.user_id')
  .where('users.active', true)
  .execute();
```

### Insert Queries

```javascript
// Single insert
await subsystem.db
  .insert('users')
  .values({ name: 'John', email: 'john@example.com' })
  .execute();

// Batch insert
await subsystem.db
  .insert('users')
  .values([
    { name: 'John', email: 'john@example.com' },
    { name: 'Jane', email: 'jane@example.com' }
  ])
  .execute();
```

### Update Queries

```javascript
await subsystem.db
  .update('users')
  .set({ active: true, updatedAt: Date.now() })
  .where('id', 123)
  .execute();
```

### Delete Queries

```javascript
await subsystem.db
  .delete('users')
  .where('inactive_since', '<', Date.now() - 365 * 24 * 60 * 60 * 1000)
  .execute();
```

## Migration System

### Migration File Structure

```javascript
// migrations/001_create_users.js
export default {
  version: 1,
  name: 'create_users',
  up: async (db) => {
    await db.execute(`
      CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `);
    
    await db.execute(`
      CREATE INDEX idx_users_email ON users(email)
    `);
  },
  down: async (db) => {
    await db.execute('DROP INDEX idx_users_email');
    await db.execute('DROP TABLE users');
  }
};
```

### Migration Management

```javascript
// Register migrations
subsystem.migrations.register({
  version: 1,
  name: 'create_users',
  up: async (db) => { ... },
  down: async (db) => { ... }
});

// Run migrations
await subsystem.send({
  type: 'db.migrate',
  body: { direction: 'up' }
});

// Check migration status
const status = await subsystem.migrations.getStatus();
// { currentVersion: 3, pendingMigrations: [], appliedMigrations: [1, 2, 3] }
```

## Error Handling

### Error Types

```javascript
class DBError extends Error {
  constructor(message, code, details) {
    super(message);
    this.code = code; // 'QUERY_ERROR', 'TRANSACTION_ERROR', etc.
    this.details = details;
  }
}

class QueryError extends DBError {
  constructor(message, query, params) {
    super(message, 'QUERY_ERROR', { query, params });
  }
}

class TransactionError extends DBError {
  constructor(message, transactionId) {
    super(message, 'TRANSACTION_ERROR', { transactionId });
  }
}
```

### Error Responses

```javascript
// Query error
{
  success: false,
  error: {
    code: 'QUERY_ERROR',
    message: 'Syntax error in query',
    details: {
      query: 'SELECT * FROM users WHERE',
      params: []
    }
  }
}

// Transaction error
{
  success: false,
  error: {
    code: 'TRANSACTION_ERROR',
    message: 'Transaction timeout',
    details: {
      transactionId: 'tx_123',
      timeout: 30000
    }
  }
}
```

## Performance Considerations

### 1. Connection Pooling

For future SQL backends (PostgreSQL, MySQL):
- Maintain connection pools
- Reuse connections for queries
- Handle connection lifecycle

### 2. Query Caching

Optional query result caching:
```javascript
const result = await subsystem.db
  .select('users')
  .where('id', 123)
  .cache(3600) // Cache for 1 hour
  .execute();
```

### 3. Prepared Statements

Leverage prepared statements where possible:
- SQLite: Already uses prepared statements
- IndexedDB: Not applicable
- Future SQL backends: Use prepared statements

### 4. Batch Operations

Support batch operations for efficiency:
```javascript
await subsystem.db
  .batch([
    { type: 'insert', table: 'users', values: {...} },
    { type: 'update', table: 'users', set: {...}, where: {...} }
  ])
  .execute();
```

## Security Considerations

### 1. SQL Injection Prevention

- Always use parameterized queries
- Validate query structure
- Sanitize user input

### 2. Access Control

- Check permissions before executing queries
- Support row-level security
- Audit database operations

### 3. Data Encryption

- Support encrypted storage backends
- Encrypt sensitive data at rest
- Support encrypted connections (future)

## Testing Strategy

### Unit Tests

- Test query builder
- Test migration system
- Test transaction management
- Test error handling

### Integration Tests

- Test with real storage backends
- Test message handling
- Test transaction rollback
- Test migration up/down

### Performance Tests

- Benchmark query execution
- Test concurrent transactions
- Test migration performance
- Test large result sets

## Future Enhancements

### 1. Additional Backends

- PostgreSQL adapter
- MySQL/MariaDB adapter
- MongoDB adapter (document store)
- Redis adapter (key-value)

### 2. Advanced Features

- Connection pooling
- Read replicas
- Query optimization
- Database sharding

### 3. ORM Integration

- Entity mapping
- Relationships
- Lazy loading
- Change tracking

### 4. GraphQL Integration

- GraphQL query translation
- Resolver generation
- Schema introspection

## Implementation Phases

### Phase 1: Core Subsystem (MVP)

- [ ] DBSubsystem class
- [ ] Storage backend selection
- [ ] Basic message handlers (query, execute)
- [ ] Transaction support
- [ ] Error handling

### Phase 2: Query Builder

- [ ] Fluent query builder API
- [ ] Select, Insert, Update, Delete builders
- [ ] Query validation
- [ ] Query execution

### Phase 3: Migrations

- [ ] Migration file system
- [ ] Migration registry
- [ ] Up/down migration support
- [ ] Migration versioning

### Phase 4: Advanced Features

- [ ] Query caching
- [ ] Batch operations
- [ ] Performance monitoring
- [ ] Security enhancements

### Phase 5: Additional Backends

- [ ] PostgreSQL adapter
- [ ] MySQL adapter
- [ ] Other backends as needed

## File Structure

```
src/messages/v2/
├── models/
│   └── subsystem/
│       └── db/
│           ├── db-subsystem.mycelia.js
│           └── __tests__/
│               └── db-subsystem.test.js
├── hooks/
│   └── db/
│       ├── use-db-storage.mycelia.js
│       ├── use-query-builder.mycelia.js
│       ├── use-migrations.mycelia.js
│       ├── use-transactions.mycelia.js
│       └── __tests__/
│           ├── use-query-builder.test.js
│           ├── use-migrations.test.js
│           └── use-transactions.test.js
└── messages/
    └── db/
        ├── db-query.message.mycelia.js
        ├── db-execute.message.mycelia.js
        ├── db-transaction.message.mycelia.js
        ├── db-migrate.message.mycelia.js
        └── db-status.message.mycelia.js
```

## Summary

The DB Subsystem provides a message-driven database abstraction layer that:

1. **Wraps storage hooks** to provide high-level database operations
2. **Supports multiple backends** (SQLite, IndexedDB, Memory, future backends)
3. **Provides message-based interface** consistent with Mycelia architecture
4. **Includes query builder** for fluent query construction
5. **Manages migrations** for schema versioning
6. **Handles transactions** at the subsystem level
7. **Integrates with security** and observability systems

This design maintains consistency with existing Mycelia patterns (ServerSubsystem, WebSocketSubsystem) while providing a powerful and flexible database abstraction layer.

