# Storage Contract Design

## Overview

This document designs a **Storage Contract** for the Mycelia Kernel persistence layer. The contract will define a standardized interface for storage facets, enabling swappable storage backends (memory, file system, databases, etc.) while maintaining a consistent API.

## Location

**Contract File:**
```
src/messages/v2/models/facet-contract/storage.contract.mycelia.js
```

**Storage Hooks Directory:**
```
src/messages/v2/hooks/storage/
```

**Storage Models Directory:**
```
src/messages/v2/models/storage/
```

## Design Principles

1. **Backend Agnostic**: Contract defines interface, not implementation
2. **Swappable Implementations**: Can swap storage backends without changing client code
3. **Security Integration**: Works with existing security layer (PKR, Principal, RWS)
4. **Namespace Support**: Supports logical separation of data (collections, domains, etc.)
5. **Async Operations**: All operations are async to support various backends
6. **Transaction Support**: Optional transaction support for atomic operations
7. **Query Capabilities**: Basic query/filter capabilities
8. **Metadata Support**: Store metadata alongside data

## Storage Contract Definition

### Required Methods

#### Core CRUD Operations

1. **`get(key, options = {})`**
   - Retrieve a value by key
   - Returns: `Promise<{success: boolean, data?: any, error?: Error}>`
   - Options: `{namespace?: string, includeMetadata?: boolean}`

2. **`set(key, value, options = {})`**
   - Store a value by key
   - Returns: `Promise<{success: boolean, error?: Error}>`
   - Options: `{namespace?: string, metadata?: Object, overwrite?: boolean}`

3. **`delete(key, options = {})`**
   - Delete a value by key
   - Returns: `Promise<{success: boolean, error?: Error}>`
   - Options: `{namespace?: string}`

4. **`has(key, options = {})`**
   - Check if a key exists
   - Returns: `Promise<{success: boolean, exists: boolean, error?: Error}>`
   - Options: `{namespace?: string}`

#### Batch Operations

5. **`getMany(keys, options = {})`**
   - Retrieve multiple values by keys
   - Returns: `Promise<{success: boolean, data: Map<string, any>, errors?: Map<string, Error>}>`
   - Options: `{namespace?: string, includeMetadata?: boolean}`

6. **`setMany(entries, options = {})`**
   - Store multiple key-value pairs
   - Returns: `Promise<{success: boolean, results: Map<string, {success: boolean, error?: Error}>, errors?: Error[]}>`
   - Options: `{namespace?: string, metadata?: Object, overwrite?: boolean}`

7. **`deleteMany(keys, options = {})`**
   - Delete multiple keys
   - Returns: `Promise<{success: boolean, results: Map<string, {success: boolean, error?: Error}>, errors?: Error[]}>`
   - Options: `{namespace?: string}`

#### Query Operations

8. **`list(options = {})`**
   - List all keys (or keys matching pattern)
   - Returns: `Promise<{success: boolean, keys: string[], error?: Error}>`
   - Options: `{namespace?: string, pattern?: string, limit?: number, offset?: number}`

9. **`query(filter, options = {})`**
   - Query values by filter criteria
   - Returns: `Promise<{success: boolean, results: Array<{key: string, value: any, metadata?: Object}>, error?: Error}>`
   - Options: `{namespace?: string, limit?: number, offset?: number, sort?: {field: string, order: 'asc'|'desc'}}`
   - Filter: `{field: string, operator: 'eq'|'ne'|'gt'|'gte'|'lt'|'lte'|'contains'|'startsWith'|'endsWith', value: any}`

10. **`count(options = {})`**
    - Count keys/entries
    - Returns: `Promise<{success: boolean, count: number, error?: Error}>`
    - Options: `{namespace?: string, filter?: Filter}`

#### Namespace Operations

11. **`createNamespace(name, options = {})`**
    - Create a new namespace/collection
    - Returns: `Promise<{success: boolean, error?: Error}>`
    - Options: `{metadata?: Object}`

12. **`deleteNamespace(name, options = {})`**
    - Delete a namespace/collection
    - Returns: `Promise<{success: boolean, error?: Error}>`
    - Options: `{recursive?: boolean}` (delete all keys in namespace)

13. **`listNamespaces(options = {})`**
    - List all namespaces
    - Returns: `Promise<{success: boolean, namespaces: string[], error?: Error}>`

#### Transaction Operations (Optional)

14. **`beginTransaction(options = {})`**
    - Begin a transaction
    - Returns: `Promise<{success: boolean, transactionId?: string, error?: Error}>`
    - Options: `{isolation?: 'read-committed'|'read-uncommitted'|'serializable'}`

15. **`commit(transactionId, options = {})`**
    - Commit a transaction
    - Returns: `Promise<{success: boolean, error?: Error}>`

16. **`rollback(transactionId, options = {})`**
    - Rollback a transaction
    - Returns: `Promise<{success: boolean, error?: Error}>`

#### Metadata Operations

17. **`getMetadata(key, options = {})`**
    - Get metadata for a key
    - Returns: `Promise<{success: boolean, metadata?: Object, error?: Error}>`
    - Options: `{namespace?: string}`

18. **`setMetadata(key, metadata, options = {})`**
    - Set metadata for a key
    - Returns: `Promise<{success: boolean, error?: Error}>`
    - Options: `{namespace?: string, merge?: boolean}`

#### Utility Operations

19. **`clear(options = {})`**
    - Clear all data (or data in namespace)
    - Returns: `Promise<{success: boolean, error?: Error}>`
    - Options: `{namespace?: string}`

20. **`getStatus(options = {})`**
    - Get storage status/health
    - Returns: `Promise<{success: boolean, status: {healthy: boolean, size?: number, capacity?: number, namespaces?: number}, error?: Error}>`

### Required Properties

1. **`_storageBackend`**
   - Internal storage backend instance
   - Used by hooks for direct backend access if needed
   - Type: `Object` (implementation-specific)

2. **`_config`**
   - Storage configuration
   - Type: `Object`
   - Contains: `{backend: string, options: Object}`

### Optional Properties

1. **`supportsTransactions`**
   - Whether backend supports transactions
   - Type: `boolean`
   - Default: `false`

2. **`supportsQuery`**
   - Whether backend supports query operations
   - Type: `boolean`
   - Default: `true`

3. **`supportsMetadata`**
   - Whether backend supports metadata
   - Type: `boolean`
   - Default: `true`

## Contract Validation

### Custom Validation Rules

1. **Backend Validation**
   - `_storageBackend` must be an object (not null or primitive)
   - `_storageBackend` must have required methods if they're not implemented in the facet

2. **Method Signature Validation**
   - All methods must return Promises
   - All methods must accept `options` parameter (can be empty object)
   - Return values must match expected structure

3. **Namespace Validation**
   - Namespace strings must be non-empty
   - Namespace strings should not contain reserved characters (e.g., `/`, `:`, `*`)

## Storage Backend Types

### 1. Memory Storage
- **Hook**: `useMemoryStorage`
- **Use Case**: Testing, caching, temporary data
- **Features**: Fast, no persistence, limited by memory

### 2. File System Storage
- **Hook**: `useFileStorage`
- **Use Case**: Local file system, single-node deployments
- **Features**: Persistent, file-based, directory structure

### 3. IndexedDB Storage (Browser)
- **Hook**: `useIndexedDBStorage`
- **Use Case**: Browser-based applications
- **Features**: Browser-native, large storage capacity, indexed

### 4. SQLite Storage
- **Hook**: `useSQLiteStorage`
- **Use Case**: Embedded database, single-file storage
- **Features**: SQL queries, ACID transactions, relational

### 5. PostgreSQL Storage
- **Hook**: `usePostgreSQLStorage`
- **Use Case**: Production deployments, multi-node
- **Features**: Full SQL, ACID transactions, scalable

### 6. MongoDB Storage
- **Hook**: `useMongoDBStorage`
- **Use Case**: Document-based storage, flexible schema
- **Features**: Document queries, flexible schema, horizontal scaling

### 7. Redis Storage
- **Hook**: `useRedisStorage`
- **Use Case**: Caching, high-performance, distributed
- **Features**: In-memory, fast, pub/sub support

## Security Integration

### Principal-Based Access Control

Storage operations should integrate with the existing security layer:

1. **Storage Keys and Namespaces**
   - Keys can be scoped to principals: `principal://{pkr}/data/{key}`
   - Namespaces can be principal-specific: `principal://{pkr}/namespace/{name}`

2. **Access Control**
   - Storage operations check RWS permissions
   - Read operations require `read` permission
   - Write operations require `write` permission
   - Namespace operations require appropriate permissions

3. **Security Profile Integration**
   - Profiles can define storage scopes: `"storage://namespace/{name}": "rw"`
   - Profile application grants storage permissions

### Example Security Flow

```javascript
// Storage key format with principal
const key = `principal://${principalPkr.publicKey}/data/user-profile`;

// Storage operation checks permissions
await storage.set(key, profileData, {
  namespace: `principal://${principalPkr.publicKey}`,
  metadata: { principal: principalPkr }
});
```

## Hook Structure

### useStorage Hook Pattern

```javascript
export const useStorage = createHook({
  kind: 'storage',
  overwrite: false,
  required: [], // May require 'principals' for security
  attach: true,
  source: import.meta.url,
  contract: 'storage',
  fn: (ctx, api, subsystem) => {
    const config = ctx.config?.storage || {};
    const backend = createStorageBackend(config);
    
    return new Facet('storage', { attach: true, source: import.meta.url, contract: 'storage' })
      .add({
        // Implement all required methods
        async get(key, options = {}) { ... },
        async set(key, value, options = {}) { ... },
        // ... other methods
        
        // Required properties
        _storageBackend: backend,
        _config: config,
        
        // Optional properties
        supportsTransactions: backend.supportsTransactions || false,
        supportsQuery: backend.supportsQuery !== false,
        supportsMetadata: backend.supportsMetadata !== false
      });
  }
});
```

## Usage Examples

### Basic Usage

```javascript
// In subsystem
await subsystem
  .use(useMemoryStorage, { capacity: 10000 })
  .build();

// Store data
await subsystem.storage.set('user:123', { name: 'John', age: 30 });

// Retrieve data
const result = await subsystem.storage.get('user:123');
console.log(result.data); // { name: 'John', age: 30 }

// Delete data
await subsystem.storage.delete('user:123');
```

### Namespace Usage

```javascript
// Store in namespace
await subsystem.storage.set('user:123', userData, {
  namespace: 'users'
});

// List all users
const result = await subsystem.storage.list({ namespace: 'users' });
console.log(result.keys); // ['user:123', 'user:456', ...]

// Query users
const queryResult = await subsystem.storage.query(
  { field: 'age', operator: 'gte', value: 18 },
  { namespace: 'users' }
);
```

### Batch Operations

```javascript
// Set multiple values
await subsystem.storage.setMany([
  { key: 'user:1', value: user1 },
  { key: 'user:2', value: user2 },
  { key: 'user:3', value: user3 }
], { namespace: 'users' });

// Get multiple values
const result = await subsystem.storage.getMany(
  ['user:1', 'user:2', 'user:3'],
  { namespace: 'users' }
);
```

### Transaction Usage (if supported)

```javascript
if (subsystem.storage.supportsTransactions) {
  const tx = await subsystem.storage.beginTransaction();
  
  try {
    await subsystem.storage.set('key1', value1, { transactionId: tx.transactionId });
    await subsystem.storage.set('key2', value2, { transactionId: tx.transactionId });
    await subsystem.storage.commit(tx.transactionId);
  } catch (error) {
    await subsystem.storage.rollback(tx.transactionId);
  }
}
```

## Integration Points

### 1. Message System Integration

Storage can be accessed via messages:

```javascript
// Register storage routes
subsystem.registerRoute('storage://get', async (message) => {
  return await subsystem.storage.get(message.body.key, message.body.options);
});

subsystem.registerRoute('storage://set', async (message) => {
  return await subsystem.storage.set(
    message.body.key,
    message.body.value,
    message.body.options
  );
});
```

### 2. Kernel Subsystem Integration

Storage could be a kernel child subsystem:

```javascript
// In useKernelServices
{
  name: 'storage',
  SubsystemClass: StorageSubsystem,
  config: {
    storage: {
      backend: 'memory', // or 'file', 'sqlite', etc.
      options: { ... }
    }
  }
}
```

### 3. Observability Integration

Storage operations can be profiled:

```javascript
await subsystem.profiler.time('storage.get', async () => {
  return await subsystem.storage.get(key);
});
```

## File Structure

```
src/messages/v2/
├── models/
│   ├── facet-contract/
│   │   └── storage.contract.mycelia.js          # Contract definition
│   └── storage/
│       ├── storage-entry.mycelia.js             # Storage entry model
│       ├── storage-query.mycelia.js             # Query/filter model
│       └── storage-transaction.mycelia.js       # Transaction model
├── hooks/
│   └── storage/
│       ├── use-storage.mycelia.js               # Base storage hook (abstract)
│       ├── memory/
│       │   └── use-memory-storage.mycelia.js   # Memory backend
│       ├── file/
│       │   └── use-file-storage.mycelia.js      # File system backend
│       ├── indexeddb/
│       │   └── use-indexeddb-storage.mycelia.js # IndexedDB backend
│       ├── sqlite/
│       │   └── use-sqlite-storage.mycelia.js   # SQLite backend
│       └── postgres/
│           └── use-postgres-storage.mycelia.js  # PostgreSQL backend
└── models/
    └── kernel-subsystem/
        └── storage-subsystem/
            └── storage.subsystem.mycelia.js     # Optional kernel child subsystem
```

## Design Decisions

### 1. Why Namespace Support?

- **Logical Separation**: Allows organizing data by domain, feature, or principal
- **Multi-tenancy**: Supports multiple tenants in single storage backend
- **Security**: Enables principal-based data isolation
- **Flexibility**: Backends can implement namespaces differently (directories, tables, collections)

### 2. Why Optional Transactions?

- **Backend Diversity**: Not all backends support transactions (e.g., simple file storage)
- **Performance**: Some use cases don't need transactions
- **Flexibility**: Backends can opt-in to transaction support

### 3. Why Metadata Support?

- **Audit Trail**: Track creation time, modification time, principal
- **Indexing**: Store index information for query optimization
- **Custom Attributes**: Store backend-specific information
- **Versioning**: Support data versioning if needed

### 4. Why Batch Operations?

- **Performance**: Reduce round-trips for multiple operations
- **Atomicity**: Some backends can make batch operations atomic
- **Efficiency**: Better for bulk operations

### 5. Why Query Support?

- **Flexibility**: Enable complex data retrieval patterns
- **Efficiency**: Avoid loading all data to filter
- **Backend Optimization**: Backends can optimize queries (indexes, etc.)

## Next Steps

1. **Implement Contract**: Create `storage.contract.mycelia.js`
2. **Implement Memory Backend**: Start with `useMemoryStorage` (simplest)
3. **Add Tests**: Unit tests for contract, integration tests for backends
4. **Documentation**: Add storage documentation to docs
5. **Security Integration**: Integrate with Principal/RWS system
6. **Additional Backends**: Implement file, SQLite, etc. as needed

## Open Questions

1. **Versioning**: Should storage support data versioning/history?
2. **Replication**: Should storage support replication/sync?
3. **Caching**: Should storage include caching layer?
4. **Compression**: Should storage support compression?
5. **Encryption**: Should storage support encryption at rest?
6. **Migration**: How should schema/data migrations be handled?

