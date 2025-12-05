# IndexedDB Storage Adapter Plan

## Overview

This document plans the implementation of an IndexedDB storage adapter for the Mycelia Kernel storage system. The adapter will implement the storage contract using IndexedDB as the backend, providing persistent, browser-based storage with transaction support.

## Design Goals

1. **Contract Compliance**: Fully implement the storage contract interface
2. **Browser Compatibility**: Work in all modern browsers with IndexedDB support
3. **Performance**: Optimize for common operations (get, set, list)
4. **Transactions**: Leverage IndexedDB's native transaction support
5. **Persistence**: Provide durable storage across browser sessions
6. **Simplicity**: Keep the implementation straightforward and maintainable
7. **Error Handling**: Graceful degradation and clear error messages

## IndexedDB Library Choice

### Option 1: Native IndexedDB API (Recommended)
- **Pros**:
  - No external dependencies
  - Full control over implementation
  - Smaller bundle size
  - Direct access to all IndexedDB features
- **Cons**:
  - More verbose API (promise wrapper needed)
  - Manual transaction management
  - More code to write

### Option 2: `idb` (IndexedDB Wrapper)
- **Pros**:
  - Promise-based API (cleaner than native)
  - Better error handling
  - Active maintenance
- **Cons**:
  - Additional dependency
  - Slightly larger bundle size

### Option 3: `localForage`
- **Pros**:
  - Simple API
  - Fallback to localStorage
- **Cons**:
  - Less control over IndexedDB features
  - May not support all contract methods
  - Different API pattern

**Decision: Use Native IndexedDB API with Promise Wrapper**
- No dependencies
- Full control
- Can create utility wrapper for cleaner code
- Matches our pattern of minimal dependencies

## Database Schema Design

### Object Stores

IndexedDB uses object stores (similar to tables in SQL):

1. **`storage_entries`** - Main storage object store
   - Key: `[namespace, key]` (composite key)
   - Value: `{ value, metadata, createdAt, updatedAt }`
   - Indexes:
     - `namespace` - For namespace queries
     - `createdAt` - For time-based queries
     - `updatedAt` - For time-based queries

2. **`storage_namespaces`** - Namespace metadata
   - Key: `name` (string)
   - Value: `{ metadata, createdAt }`
   - No indexes needed (small dataset)

### IndexedDB Schema Versioning

IndexedDB has built-in versioning:
- Database version starts at 1
- Increment version to trigger `onupgradeneeded` event
- Handle migrations in upgrade handler

### Schema Structure

```javascript
// Database: 'mycelia-storage'
// Version: 1

// Object Store: storage_entries
{
  keyPath: ['namespace', 'key'],  // Composite key
  autoIncrement: false
}

// Indexes on storage_entries:
- namespace: { keyPath: 'namespace', unique: false }
- createdAt: { keyPath: 'createdAt', unique: false }
- updatedAt: { keyPath: 'updatedAt', unique: false }

// Object Store: storage_namespaces
{
  keyPath: 'name',
  autoIncrement: false
}
```

## Implementation Architecture

### File Structure

```
src/messages/v2/hooks/storage/indexeddb/
├── indexeddb-storage-backend.mycelia.js    # Main backend implementation
├── indexeddb-schema.mycelia.js             # Schema definition and migrations
├── indexeddb-utils.mycelia.js              # Promise wrappers and utilities
├── indexeddb-query-handler.mycelia.js      # Query/filter operations
└── __tests__/
    ├── indexeddb-storage-backend.test.js
    ├── indexeddb-schema.test.js
    └── indexeddb-utils.test.js
```

### Class Structure

```javascript
class IndexedDBStorageBackend {
  #db;                    // IDBDatabase instance
  #dbName;                // Database name
  #dbVersion;             // Current database version
  #config;                // Configuration options
  
  constructor(options) {
    // Initialize database connection
    // Run migrations
    // Setup indexes
  }
  
  // Implement all contract methods
  async get(key, options) { ... }
  async set(key, value, options) { ... }
  // ... etc
}
```

## Key Implementation Details

### 1. Database Connection Management

- **Single Connection**: IndexedDB works best with a single connection per database
- **Connection Lifecycle**: Open on first use, keep open for session
- **Error Handling**: Handle connection errors gracefully
- **Version Management**: Track and increment version for migrations

```javascript
async #openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(this.#dbName, this.#dbVersion);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      this.#handleUpgrade(event);
    };
  });
}
```

### 2. Promise Wrapper Utilities

IndexedDB uses event-based API, so we need promise wrappers:

```javascript
// Utility functions
async function openDatabase(name, version, onUpgrade) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(name, version);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => onUpgrade(event);
  });
}

async function getObjectStore(db, storeName, mode = 'readonly') {
  const transaction = db.transaction([storeName], mode);
  return transaction.objectStore(storeName);
}

async function get(store, key) {
  return new Promise((resolve, reject) => {
    const request = store.get(key);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

async function put(store, value, key) {
  return new Promise((resolve, reject) => {
    const request = key ? store.put(value, key) : store.put(value);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

async function delete(store, key) {
  return new Promise((resolve, reject) => {
    const request = store.delete(key);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}
```

### 3. Composite Keys

IndexedDB supports composite keys (arrays):

```javascript
// Store entry with composite key [namespace, key]
const compositeKey = [namespace, key];
await put(store, entry, compositeKey);

// Retrieve entry
const entry = await get(store, [namespace, key]);
```

### 4. Namespace Implementation

- Use composite keys: `[namespace, key]`
- Default namespace: `'default'`
- Namespace operations use separate `storage_namespaces` object store
- Index on `namespace` for efficient namespace queries

### 5. Query/Filter Implementation

IndexedDB supports cursors for iteration:

```javascript
async query(filter, options = {}) {
  const namespace = options.namespace || 'default';
  const store = await this.#getObjectStore('storage_entries', 'readonly');
  const index = store.index('namespace');
  const range = IDBKeyRange.only(namespace);
  
  const results = [];
  return new Promise((resolve, reject) => {
    const request = index.openCursor(range);
    
    request.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        const entry = cursor.value;
        // Apply filter
        if (this.#matchesFilter(entry, filter)) {
          results.push({
            key: entry.key[1], // Second part of composite key
            value: entry.value,
            metadata: entry.metadata
          });
        }
        cursor.continue();
      } else {
        resolve({ success: true, results });
      }
    };
    
    request.onerror = () => reject(request.error);
  });
}
```

**Filter Operators**:
- `eq`: Use `IDBKeyRange.only(value)`
- `gte`, `lte`: Use `IDBKeyRange.bound(lower, upper)`
- `gt`, `lt`: Use `IDBKeyRange.bound(lower, upper, true, true)` (exclusive)
- `contains`, `startsWith`, `endsWith`: Filter in memory after cursor iteration

### 6. Transaction Support

IndexedDB has excellent transaction support:

```javascript
async beginTransaction(options = {}) {
  const transactionId = `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const storeNames = options.stores || ['storage_entries', 'storage_namespaces'];
  const mode = options.mode || 'readwrite';
  
  const transaction = this.#db.transaction(storeNames, mode);
  this.#activeTransactions.set(transactionId, transaction);
  
  return { success: true, transactionId };
}

async commit(transactionId) {
  const transaction = this.#activeTransactions.get(transactionId);
  if (!transaction) {
    return { success: false, error: new Error('Invalid transaction ID') };
  }
  
  // IndexedDB transactions auto-commit when all requests complete
  // We just need to wait for it to complete
  return new Promise((resolve) => {
    transaction.oncomplete = () => {
      this.#activeTransactions.delete(transactionId);
      resolve({ success: true });
    };
    transaction.onerror = () => {
      this.#activeTransactions.delete(transactionId);
      resolve({ success: false, error: transaction.error });
    };
  });
}

async rollback(transactionId) {
  const transaction = this.#activeTransactions.get(transactionId);
  if (!transaction) {
    return { success: false, error: new Error('Invalid transaction ID') };
  }
  
  // IndexedDB transactions auto-rollback on error
  transaction.abort();
  this.#activeTransactions.delete(transactionId);
  return { success: true };
}
```

**Transaction Modes**:
- `readonly`: Read-only access
- `readwrite`: Read and write access
- Transactions auto-commit when all requests complete
- Transactions auto-rollback on error

### 7. Batch Operations

Optimize batch operations using transactions:

```javascript
async setMany(entries, options = {}) {
  const namespace = options.namespace || 'default';
  const store = await this.#getObjectStore('storage_entries', 'readwrite');
  const results = new Map();
  const errors = [];
  
  const transaction = store.transaction;
  const now = Date.now();
  
  for (const entry of entries) {
    try {
      const entryNamespace = entry.options?.namespace || namespace;
      const compositeKey = [entryNamespace, entry.key];
      const value = {
        namespace: entryNamespace,
        key: entry.key,
        value: entry.value,
        metadata: entry.options?.metadata || {},
        createdAt: now,
        updatedAt: now
      };
      
      await put(store, value, compositeKey);
      results.set(entry.key, { success: true });
    } catch (error) {
      errors.push(error);
      results.set(entry.key, { success: false, error });
    }
  }
  
  // Wait for transaction to complete
  await new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
  
  return {
    success: errors.length === 0,
    results,
    ...(errors.length > 0 && { errors })
  };
}
```

### 8. List Operations with Pattern Matching

```javascript
async list(options = {}) {
  const namespace = options.namespace || 'default';
  const store = await this.#getObjectStore('storage_entries', 'readonly');
  const index = store.index('namespace');
  const range = IDBKeyRange.only(namespace);
  
  const keys = [];
  return new Promise((resolve, reject) => {
    const request = index.openCursor(range);
    
    request.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        const key = cursor.key[1]; // Second part of composite key
        
        // Apply pattern matching
        if (!options.pattern || this.#matchesPattern(key, options.pattern)) {
          keys.push(key);
        }
        
        cursor.continue();
      } else {
        // Apply sorting, offset, limit
        const sorted = keys.sort();
        const offset = options.offset || 0;
        const limit = options.limit;
        
        let result = sorted.slice(offset);
        if (limit !== undefined) {
          result = result.slice(0, limit);
        }
        
        resolve({ success: true, keys: result });
      }
    };
    
    request.onerror = () => reject(request.error);
  });
}
```

### 9. Metadata Operations

Store metadata as part of entry object:

```javascript
async getMetadata(key, options = {}) {
  const namespace = options.namespace || 'default';
  const store = await this.#getObjectStore('storage_entries', 'readonly');
  const entry = await get(store, [namespace, key]);
  
  if (!entry) {
    return { success: false, error: new Error('Key not found') };
  }
  
  return { success: true, metadata: entry.metadata || {} };
}
```

### 10. Schema Migrations

```javascript
class IndexedDBSchema {
  static getCurrentVersion() {
    return 1;
  }
  
  static handleUpgrade(event) {
    const db = event.target.result;
    const oldVersion = event.oldVersion;
    const newVersion = event.newVersion;
    
    // Create object stores
    if (!db.objectStoreNames.contains('storage_entries')) {
      const entriesStore = db.createObjectStore('storage_entries', {
        keyPath: ['namespace', 'key']
      });
      
      // Create indexes
      entriesStore.createIndex('namespace', 'namespace', { unique: false });
      entriesStore.createIndex('createdAt', 'createdAt', { unique: false });
      entriesStore.createIndex('updatedAt', 'updatedAt', { unique: false });
    }
    
    if (!db.objectStoreNames.contains('storage_namespaces')) {
      db.createObjectStore('storage_namespaces', {
        keyPath: 'name'
      });
    }
    
    // Future migrations
    // if (oldVersion < 2) {
    //   // Migration logic
    // }
  }
}
```

## Configuration Options

```javascript
{
  storage: {
    backend: 'indexeddb',
    options: {
      dbName: 'mycelia-storage',        // Database name
      dbVersion: 1,                     // Database version
      migrate: true,                    // Run migrations on startup
      debug: false                      // Enable debug logging
    }
  }
}
```

## Performance Considerations

### 1. Indexing Strategy
- Index on `namespace` for fast namespace queries
- Index on `createdAt` and `updatedAt` for time-based queries
- Composite key `[namespace, key]` for fast lookups

### 2. Cursor Operations
- Use cursors for iteration (more efficient than getAll)
- Limit cursor results with `continue()` and counters
- Use indexes for filtered queries

### 3. Batch Operations
- Use single transaction for batch operations
- Group operations by object store
- Minimize transaction scope

### 4. Connection Management
- Keep database connection open for session
- Close on subsystem disposal
- Handle connection errors gracefully

### 5. Query Optimization
- Use indexes for WHERE clauses
- Limit result sets with cursors
- Avoid loading all data into memory

## Browser Compatibility

### Supported Browsers
- Chrome/Edge: Full support
- Firefox: Full support
- Safari: Full support (iOS 10+)
- Opera: Full support

### Feature Detection

```javascript
function isIndexedDBSupported() {
  return typeof indexedDB !== 'undefined' && indexedDB !== null;
}

if (!isIndexedDBSupported()) {
  throw new Error('IndexedDB is not supported in this browser');
}
```

### Storage Limits
- Chrome/Edge: ~60% of disk space (varies)
- Firefox: ~50% of disk space (varies)
- Safari: ~1GB (iOS), ~5GB (macOS)
- Opera: Similar to Chrome

## Error Handling

### Common IndexedDB Errors

1. **QuotaExceededError**: Storage quota exceeded
   - Check available quota
   - Return error to caller
   - Suggest cleanup

2. **InvalidStateError**: Database in invalid state
   - Close and reopen connection
   - Handle gracefully

3. **TransactionInactiveError**: Transaction not active
   - Retry operation
   - Return error to caller

4. **ConstraintError**: Constraint violation (e.g., unique key)
   - Handle based on operation
   - Return appropriate error

### Error Handling Strategy

```javascript
async #handleError(error, operation) {
  if (error.name === 'QuotaExceededError') {
    return {
      success: false,
      error: new Error(`Storage quota exceeded. Please free up space.`)
    };
  }
  
  if (error.name === 'InvalidStateError') {
    // Try to recover
    await this.#reconnect();
    return {
      success: false,
      error: new Error(`Database connection lost. Please retry.`)
    };
  }
  
  return {
    success: false,
    error: new Error(`${operation} failed: ${error.message}`)
  };
}
```

## Testing Strategy

### Unit Tests
- Test each contract method
- Test error cases
- Test transaction support
- Test query/filter operations
- Test browser compatibility

### Integration Tests
- Test with real IndexedDB
- Test concurrent operations
- Test transaction rollback
- Test schema migrations
- Test quota limits

### Browser Tests
- Test in Chrome, Firefox, Safari
- Test on mobile browsers
- Test storage limits
- Test error scenarios

## Migration Path

### From Memory Storage
1. Export data from memory storage
2. Import into IndexedDB storage
3. Verify data integrity
4. Switch to IndexedDB storage

### Schema Evolution
1. Version database schema
2. Handle upgrades in `onupgradeneeded`
3. Support data migration
4. Document breaking changes

## Security Considerations

1. **Same-Origin Policy**: IndexedDB is subject to same-origin policy
2. **Storage Isolation**: Each origin has separate storage
3. **Data Encryption**: Consider encryption for sensitive data (future)
4. **Quota Management**: Monitor and handle quota limits

## Dependencies

```json
{
  "dependencies": {
    // No additional dependencies - uses native IndexedDB
  },
  "devDependencies": {
    // Testing may require browser testing tools
  }
}
```

## Implementation Phases

### Phase 1: Core Implementation
- [ ] Create IndexedDB utility wrappers
- [ ] Create IndexedDBSchema class
- [ ] Create IndexedDBStorageBackend class
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
- [ ] Optimize cursor operations
- [ ] Optimize indexes
- [ ] Performance tuning
- [ ] Benchmark against memory storage

### Phase 5: Testing & Documentation
- [ ] Unit tests
- [ ] Integration tests
- [ ] Browser compatibility tests
- [ ] Documentation
- [ ] Usage examples

## Open Questions

1. **Storage Limits**: How should we handle quota exceeded errors?
   - **Decision**: Return clear error message, suggest cleanup

2. **Connection Management**: Should we keep connection open or open/close per operation?
   - **Decision**: Keep open for session, close on disposal

3. **Transaction Scope**: Should transactions span multiple object stores?
   - **Decision**: Yes, support multi-store transactions

4. **Error Recovery**: How should we handle connection errors?
   - **Decision**: Attempt reconnection, return error if fails

5. **Browser Detection**: Should we detect and warn about unsupported browsers?
   - **Decision**: Yes, throw clear error on initialization

## Success Criteria

- ✅ All storage contract methods implemented
- ✅ All tests passing
- ✅ Performance comparable to memory storage for single operations
- ✅ Transaction support working correctly
- ✅ Schema migrations working
- ✅ Browser compatibility verified
- ✅ Documentation complete
- ✅ Usage examples provided

## Comparison with Other Adapters

### vs Memory Storage
- **Persistence**: IndexedDB persists, Memory doesn't
- **Performance**: Memory is faster, IndexedDB is persistent
- **Use Case**: IndexedDB for browser apps, Memory for testing

### vs SQLite Storage
- **Environment**: IndexedDB for browser, SQLite for Node.js
- **API**: IndexedDB uses object stores, SQLite uses tables
- **Transactions**: Both support transactions
- **Queries**: SQLite has better query support, IndexedDB uses cursors

## Next Steps

1. Review and approve this plan
2. Begin Phase 1 implementation
3. Create initial tests
4. Iterate based on feedback

