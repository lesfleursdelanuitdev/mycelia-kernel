# SQLite Storage Adapter Plan

## Overview

This document plans the implementation of an SQLite storage adapter for the Mycelia Kernel storage system. The adapter will implement the storage contract using SQLite as the backend, providing persistent, file-based storage with ACID transactions.

## Design Goals

1. **Contract Compliance**: Fully implement the storage contract interface
2. **Performance**: Optimize for common operations (get, set, list)
3. **Transactions**: Leverage SQLite's native transaction support
4. **Persistence**: Provide durable storage across application restarts
5. **Simplicity**: Keep the implementation straightforward and maintainable
6. **Migration Support**: Handle schema migrations gracefully

## SQLite Library Choice

### Option 1: `better-sqlite3` (Recommended)
- **Pros**:
  - Synchronous API (simpler for our use case)
  - High performance
  - Full SQLite feature support
  - Active maintenance
  - No native dependencies issues (uses node-gyp)
- **Cons**:
  - Synchronous (but we can wrap in async)
  - Requires native compilation

### Option 2: `sql.js` (WebAssembly)
- **Pros**:
  - Pure JavaScript (no native dependencies)
  - Works in browser environments
  - No compilation needed
- **Cons**:
  - Lower performance than better-sqlite3
  - Larger bundle size
  - Limited to in-memory or ArrayBuffer storage

### Option 3: `sqlite3` (Callback-based)
- **Pros**:
  - Asynchronous API
  - Well-established
- **Cons**:
  - Callback-based (less modern)
  - Lower performance than better-sqlite3
  - More complex error handling

**Decision: Use `better-sqlite3`**
- Best performance
- Synchronous API can be wrapped in async
- Full feature support
- Active maintenance

## Database Schema Design

### Main Storage Table

```sql
CREATE TABLE IF NOT EXISTS storage_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  namespace TEXT NOT NULL DEFAULT 'default',
  key TEXT NOT NULL,
  value TEXT NOT NULL,  -- JSON stringified value
  metadata TEXT,        -- JSON stringified metadata
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE(namespace, key)
);

CREATE INDEX IF NOT EXISTS idx_storage_namespace_key ON storage_entries(namespace, key);
CREATE INDEX IF NOT EXISTS idx_storage_namespace ON storage_entries(namespace);
CREATE INDEX IF NOT EXISTS idx_storage_created_at ON storage_entries(created_at);
CREATE INDEX IF NOT EXISTS idx_storage_updated_at ON storage_entries(updated_at);
```

### Namespaces Table

```sql
CREATE TABLE IF NOT EXISTS storage_namespaces (
  name TEXT PRIMARY KEY,
  metadata TEXT,        -- JSON stringified metadata
  created_at INTEGER NOT NULL
);
```

### Schema Versioning Table

```sql
CREATE TABLE IF NOT EXISTS schema_version (
  version INTEGER PRIMARY KEY,
  applied_at INTEGER NOT NULL
);
```

## Implementation Architecture

### File Structure

```
src/messages/v2/hooks/storage/sqlite/
├── sqlite-storage-backend.mycelia.js    # Main backend implementation
├── sqlite-schema.mycelia.js             # Schema definition and migrations
├── sqlite-query-builder.mycelia.js      # Query builder for filter operations
└── __tests__/
    ├── sqlite-storage-backend.test.js
    ├── sqlite-schema.test.js
    └── sqlite-query-builder.test.js
```

### Class Structure

```javascript
class SQLiteStorageBackend {
  #db;                    // better-sqlite3 Database instance
  #dbPath;                // Path to SQLite database file
  #config;                // Configuration options
  #preparedStatements;    // Cache of prepared statements
  
  constructor(options) {
    // Initialize database connection
    // Run migrations
    // Prepare statements
  }
  
  // Implement all contract methods
  async get(key, options) { ... }
  async set(key, value, options) { ... }
  // ... etc
}
```

## Key Implementation Details

### 1. Connection Management

- **Single Connection**: SQLite works best with a single connection per database file
- **Connection Pooling**: Not needed (SQLite handles concurrency internally)
- **Connection Lifecycle**: Open on construction, close on disposal
- **WAL Mode**: Enable Write-Ahead Logging for better concurrency

```javascript
import Database from 'better-sqlite3';

const db = new Database(dbPath, {
  verbose: config.debug ? console.log : undefined
});

// Enable WAL mode for better concurrency
db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL'); // Balance between safety and performance
```

### 2. Prepared Statements

Cache prepared statements for performance:

```javascript
#preparedStatements = {
  get: db.prepare('SELECT value, metadata FROM storage_entries WHERE namespace = ? AND key = ?'),
  set: db.prepare('INSERT OR REPLACE INTO storage_entries (namespace, key, value, metadata, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'),
  delete: db.prepare('DELETE FROM storage_entries WHERE namespace = ? AND key = ?'),
  has: db.prepare('SELECT 1 FROM storage_entries WHERE namespace = ? AND key = ? LIMIT 1'),
  // ... etc
};
```

### 3. JSON Serialization

- Store values and metadata as JSON strings
- Handle serialization/deserialization transparently
- Support all JSON-serializable types

```javascript
// Serialize
const valueJson = JSON.stringify(value);
const metadataJson = metadata ? JSON.stringify(metadata) : null;

// Deserialize
const value = JSON.parse(row.value);
const metadata = row.metadata ? JSON.parse(row.metadata) : {};
```

### 4. Namespace Implementation

- Use `namespace` column in `storage_entries` table
- Default namespace: `'default'`
- Namespace operations use `storage_namespaces` table
- Foreign key constraints (optional, for data integrity)

### 5. Query/Filter Implementation

Convert StorageQuery filters to SQL WHERE clauses:

```javascript
// Example: { field: 'age', operator: 'gte', value: 18 }
// Becomes: WHERE JSON_EXTRACT(value, '$.age') >= 18

buildWhereClause(filter) {
  const conditions = [];
  const params = [];
  
  for (const f of filter.filters) {
    const { field, operator, value } = f;
    const jsonPath = `JSON_EXTRACT(value, '$.${field}')`;
    
    switch (operator) {
      case 'eq':
        conditions.push(`${jsonPath} = ?`);
        params.push(value);
        break;
      case 'gte':
        conditions.push(`${jsonPath} >= ?`);
        params.push(value);
        break;
      // ... etc
    }
  }
  
  return {
    where: conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '',
    params
  };
}
```

**Note**: SQLite JSON functions require SQLite 3.38+ (2022). For older versions, we may need to:
- Store indexed fields separately
- Use LIKE for string matching
- Load and filter in memory (less efficient)

### 6. Transaction Support

SQLite has excellent transaction support:

```javascript
async beginTransaction(options = {}) {
  const transactionId = `tx_${Date.now()}_${Math.random()}`;
  this.#db.exec('BEGIN TRANSACTION');
  this.#activeTransactions.set(transactionId, true);
  return { success: true, transactionId };
}

async commit(transactionId) {
  if (!this.#activeTransactions.has(transactionId)) {
    return { success: false, error: new Error('Invalid transaction ID') };
  }
  this.#db.exec('COMMIT');
  this.#activeTransactions.delete(transactionId);
  return { success: true };
}

async rollback(transactionId) {
  if (!this.#activeTransactions.has(transactionId)) {
    return { success: false, error: new Error('Invalid transaction ID') };
  }
  this.#db.exec('ROLLBACK');
  this.#activeTransactions.delete(transactionId);
  return { success: true };
}
```

**Transaction Isolation**: SQLite supports:
- `READ UNCOMMITTED` (default)
- `READ COMMITTED`
- `SERIALIZABLE` (recommended for our use case)

### 7. Batch Operations

Optimize batch operations using transactions:

```javascript
async setMany(entries, options = {}) {
  const transaction = await this.beginTransaction();
  const results = new Map();
  const errors = [];
  
  try {
    const stmt = this.#preparedStatements.set;
    const now = Date.now();
    
    for (const entry of entries) {
      try {
        const namespace = entry.options?.namespace || options.namespace || 'default';
        const valueJson = JSON.stringify(entry.value);
        const metadataJson = entry.options?.metadata 
          ? JSON.stringify(entry.options.metadata) 
          : null;
        
        stmt.run(namespace, entry.key, valueJson, metadataJson, now, now);
        results.set(entry.key, { success: true });
      } catch (error) {
        errors.push(error);
        results.set(entry.key, { success: false, error });
      }
    }
    
    await this.commit(transaction.transactionId);
    return { success: errors.length === 0, results, ...(errors.length > 0 && { errors }) };
  } catch (error) {
    await this.rollback(transaction.transactionId);
    throw error;
  }
}
```

### 8. List Operations with Pattern Matching

```javascript
async list(options = {}) {
  const namespace = options.namespace || 'default';
  let query = 'SELECT key FROM storage_entries WHERE namespace = ?';
  const params = [namespace];
  
  if (options.pattern) {
    // Convert pattern to SQL LIKE
    // '*prefix' -> 'prefix%'
    // 'suffix*' -> '%suffix'
    // '*middle*' -> '%middle%'
    const likePattern = options.pattern
      .replace(/^\*/, '%')
      .replace(/\*$/, '%')
      .replace(/\*/g, '%');
    query += ' AND key LIKE ?';
    params.push(likePattern);
  }
  
  query += ' ORDER BY key';
  
  if (options.limit) {
    query += ' LIMIT ?';
    params.push(options.limit);
  }
  
  if (options.offset) {
    query += ' OFFSET ?';
    params.push(options.offset);
  }
  
  const stmt = this.#db.prepare(query);
  const rows = stmt.all(...params);
  return { success: true, keys: rows.map(r => r.key) };
}
```

### 9. Metadata Operations

Store metadata as JSON in separate column:

```javascript
async getMetadata(key, options = {}) {
  const stmt = this.#preparedStatements.getMetadata;
  const row = stmt.get(options.namespace || 'default', key);
  
  if (!row) {
    return { success: false, error: new Error('Key not found') };
  }
  
  const metadata = row.metadata ? JSON.parse(row.metadata) : {};
  return { success: true, metadata };
}
```

### 10. Schema Migrations

```javascript
class SQLiteSchema {
  static getCurrentVersion(db) {
    const row = db.prepare('SELECT MAX(version) as version FROM schema_version').get();
    return row?.version || 0;
  }
  
  static async migrate(db, targetVersion) {
    const currentVersion = this.getCurrentVersion(db);
    
    if (currentVersion >= targetVersion) {
      return; // Already up to date
    }
    
    // Run migrations in order
    for (let version = currentVersion + 1; version <= targetVersion; version++) {
      const migration = this.getMigration(version);
      if (migration) {
        db.exec(migration.up);
        db.prepare('INSERT INTO schema_version (version, applied_at) VALUES (?, ?)')
          .run(version, Date.now());
      }
    }
  }
  
  static getMigration(version) {
    const migrations = {
      1: {
        up: `
          CREATE TABLE IF NOT EXISTS storage_entries (...);
          CREATE TABLE IF NOT EXISTS storage_namespaces (...);
          CREATE TABLE IF NOT EXISTS schema_version (...);
        `
      },
      // Future migrations here
    };
    return migrations[version];
  }
}
```

## Configuration Options

```javascript
{
  storage: {
    backend: 'sqlite',
    options: {
      dbPath: './data/storage.db',        // Database file path
      migrate: true,                      // Run migrations on startup
      walMode: true,                      // Enable WAL mode
      synchronous: 'NORMAL',              // 'OFF', 'NORMAL', 'FULL'
      busyTimeout: 5000,                  // Milliseconds to wait for locks
      prepareCacheSize: 100,              // Prepared statement cache size
      debug: false                        // Enable SQL logging
    }
  }
}
```

## Performance Considerations

### 1. Indexing Strategy
- Index on `(namespace, key)` for fast lookups
- Index on `namespace` for namespace operations
- Index on `created_at` and `updated_at` for time-based queries

### 2. Prepared Statements
- Cache all prepared statements
- Reuse statements across operations
- Limit cache size to prevent memory issues

### 3. Batch Operations
- Use transactions for batch operations
- Consider batching large operations (1000+ entries)

### 4. Connection Settings
- WAL mode for better concurrency
- `synchronous = NORMAL` (balance between safety and performance)
- `busy_timeout` to handle concurrent access

### 5. Query Optimization
- Use indexes for WHERE clauses
- Limit result sets with LIMIT/OFFSET
- Avoid full table scans

## Error Handling

### Common SQLite Errors

1. **SQLITE_BUSY**: Database is locked
   - Retry with exponential backoff
   - Increase `busy_timeout`

2. **SQLITE_CORRUPT**: Database file is corrupted
   - Log error
   - Return error to caller
   - Consider backup/restore

3. **SQLITE_FULL**: Database is full
   - Check disk space
   - Return error to caller

4. **SQLITE_CONSTRAINT**: Constraint violation (e.g., unique key)
   - Handle based on operation
   - Return appropriate error

## Testing Strategy

### Unit Tests
- Test each contract method
- Test error cases
- Test transaction support
- Test query/filter operations

### Integration Tests
- Test with real SQLite database
- Test concurrent operations
- Test transaction rollback
- Test schema migrations

### Performance Tests
- Benchmark against memory storage
- Test batch operations
- Test query performance
- Test concurrent access

## Migration Path

### From Memory Storage
1. Export data from memory storage
2. Import into SQLite storage
3. Verify data integrity
4. Switch to SQLite storage

### Schema Evolution
1. Version schema
2. Run migrations on startup
3. Support rollback (if needed)
4. Document breaking changes

## Security Considerations

1. **SQL Injection**: Use prepared statements (already planned)
2. **File Permissions**: Ensure database file has correct permissions
3. **Path Traversal**: Validate `dbPath` to prevent directory traversal
4. **Data Encryption**: Consider SQLCipher for encrypted storage (future)

## Dependencies

```json
{
  "dependencies": {
    "better-sqlite3": "^9.0.0"
  },
  "devDependencies": {
    "@types/better-sqlite3": "^7.6.0"
  }
}
```

## Implementation Phases

### Phase 1: Core Implementation
- [ ] Install `better-sqlite3`
- [ ] Create `SQLiteStorageBackend` class
- [ ] Implement schema and migrations
- [ ] Implement basic CRUD operations (get, set, delete, has)

### Phase 2: Advanced Features
- [ ] Implement batch operations
- [ ] Implement query/filter operations
- [ ] Implement namespace operations
- [ ] Implement metadata operations

### Phase 3: Transaction Support
- [ ] Implement transaction methods
- [ ] Add transaction support to batch operations
- [ ] Test transaction isolation

### Phase 4: Optimization
- [ ] Add prepared statement caching
- [ ] Optimize indexes
- [ ] Performance tuning
- [ ] Benchmark against memory storage

### Phase 5: Testing & Documentation
- [ ] Unit tests
- [ ] Integration tests
- [ ] Performance tests
- [ ] Documentation
- [ ] Usage examples

## Open Questions

1. **JSON Support**: Should we require SQLite 3.38+ for JSON functions, or support older versions?
   - **Decision**: Support SQLite 3.38+ (better-sqlite3 requires it anyway)

2. **Connection Pooling**: Do we need connection pooling?
   - **Decision**: No, SQLite works best with single connection per file

3. **Backup Strategy**: Should we include backup/restore functionality?
   - **Decision**: Not in initial implementation, document best practices

4. **Encryption**: Should we support SQLCipher?
   - **Decision**: Future enhancement, not in initial implementation

5. **Multiple Databases**: Should we support multiple database files?
   - **Decision**: One database file per storage instance (can create multiple instances)

## Success Criteria

- ✅ All storage contract methods implemented
- ✅ All tests passing
- ✅ Performance comparable to memory storage for single operations
- ✅ Transaction support working correctly
- ✅ Schema migrations working
- ✅ Documentation complete
- ✅ Usage examples provided

## Next Steps

1. Review and approve this plan
2. Install `better-sqlite3` dependency
3. Begin Phase 1 implementation
4. Create initial tests
5. Iterate based on feedback



