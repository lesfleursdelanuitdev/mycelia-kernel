# Queries

## Overview

Queries are synchronous, read-only operations that retrieve data immediately. They bypass the message queue and use one-shot requests for immediate response, making them ideal for data retrieval and status checks.

## Characteristics

### Synchronous Execution
- Queries execute immediately without queuing
- Responses are returned synchronously via promises
- No waiting for message queue processing

### Read-Only Operations
- Queries should not mutate subsystem state
- Designed for data retrieval and inspection
- No side effects expected

### One-Shot Requests
- Queries use temporary routes for replies
- Routes are automatically created and cleaned up
- No channel management required

### Immediate Response
- Responses arrive immediately (no async delay)
- Promise resolves with query result
- No timeout handling needed (local timeout only)

## How Queries Work

### 1. Query Registration

Queries are registered as route handlers:

```javascript
// Register a named query
subsystem.queries.register('getUser', async (message, params) => {
  const userId = message.getBody().userId;
  return {
    success: true,
    data: await getUserData(userId)
  };
});

// Register a query on a specific path
subsystem.queries.registerRoute('user/:id', async (message, params) => {
  return {
    success: true,
    data: await getUserData(params.id)
  };
});
```

### 2. Query Execution

Queries are executed using the `ask()` method:

```javascript
// Using registered name
const result = await subsystem.queries.ask('getUser', {
  userId: '123'
});

// Using direct path
const result = await subsystem.queries.ask('user/123');
```

### 3. Underlying Mechanism

Queries use the `useRequests` hook with the `oneShot` type:

```javascript
// Internally, queries use:
subsystem.requests
  .oneShot()
  .with({
    handler: async (response) => response.getBody(),
    timeout: 5000
  })
  .forMessage(queryMessage)
  .send();
```

### 4. Route Resolution

Query paths are resolved automatically:

```javascript
// Short name -> query/<name>
subsystem.queries.ask('getUser')  
// Resolves to: 'query/getUser'

// Full path -> pass through
subsystem.queries.ask('user://query/getUser')
// Passes through as-is
```

### 5. Response Handling

Responses are handled immediately:

1. **Query Sent**: Message sent via `identity.sendProtected()`
2. **Temporary Route**: One-shot request creates temporary reply route
3. **Query Processing**: Destination subsystem processes query immediately
4. **Response Sending**: Response sent to temporary route
5. **Promise Resolution**: Promise resolves with response body

## Query Handler Pattern

### Handler Signature

Query handlers follow a standard signature:

```javascript
async function queryHandler(message, params, routeOptions) {
  // message: The query message
  // params: Route parameters (if using parameterized routes)
  // routeOptions: Route metadata and options
  
  // Return query result
  return {
    success: true,
    data: /* query result */
  };
}
```

### Handler Best Practices

1. **Read-Only**: Don't mutate subsystem state
2. **Fast**: Keep queries fast (they block the caller)
3. **Error Handling**: Return error objects, don't throw
4. **Validation**: Validate input parameters

```javascript
subsystem.queries.register('getUser', async (message, params) => {
  const { userId } = message.getBody();
  
  // Validate input
  if (!userId) {
    return {
      success: false,
      error: 'userId is required'
    };
  }
  
  try {
    // Read-only operation
    const user = await getUserData(userId);
    return {
      success: true,
      data: user
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
});
```

## Query Lifecycle

```
1. Query Registration
   └─> Register route handler for query path

2. Query Execution
   ├─> Resolve query path (name -> query/<name>)
   ├─> Create query message
   └─> Use RequestBuilder (oneShot type)

3. Temporary Route Creation
   └─> One-shot request creates temporary reply route

4. Query Processing
   ├─> Message routed to query handler
   └─> Handler executes immediately (no queue)

5. Response Sending
   ├─> Response sent to temporary route
   └─> Temporary route handler processes response

6. Promise Resolution
   └─> Promise resolves with response body

7. Cleanup
   └─> Temporary route automatically removed
```

## Best Practices

### 1. Use Named Queries
Register queries with logical names:

```javascript
// Good: Named query
subsystem.queries.register('getUser', handler);
await subsystem.queries.ask('getUser', { userId: '123' });

// Less ideal: Direct path
await subsystem.queries.ask('query/getUser', { userId: '123' });
```

### 2. Keep Queries Fast
Queries block the caller, so keep them fast:

```javascript
// Good: Fast, cached lookup
subsystem.queries.register('getStatus', async (message) => {
  return { status: this.cachedStatus };
});

// Avoid: Slow database query
subsystem.queries.register('getUser', async (message) => {
  return await slowDatabaseQuery();  // Blocks caller!
});
```

### 3. Return Consistent Format
Use consistent response format:

```javascript
// Success response
return {
  success: true,
  data: result
};

// Error response
return {
  success: false,
  error: errorMessage
};
```

### 4. Handle Errors Gracefully
Don't throw errors, return error objects:

```javascript
subsystem.queries.register('getUser', async (message) => {
  try {
    const user = await getUserData(message.getBody().userId);
    return { success: true, data: user };
  } catch (error) {
    return { 
      success: false, 
      error: error.message 
    };
  }
});
```

## Error Handling

Queries handle errors through response objects:

### Handler Errors
Errors returned by query handlers:

```javascript
const result = await subsystem.queries.ask('getUser', { userId: '123' });

if (!result.success) {
  console.error('Query failed:', result.error);
}
```

### Timeout Errors
Local timeout errors (from one-shot request):

```javascript
try {
  const result = await subsystem.queries.ask('getUser', { userId: '123' });
} catch (error) {
  // Timeout or send error
  console.error('Query timeout:', error);
}
```

## Queries vs Commands

| Aspect | Queries | Commands |
|--------|---------|----------|
| **Execution** | Synchronous | Asynchronous |
| **Response** | Immediate | Channel-based |
| **Timeout** | Local | ResponseManager |
| **Use Case** | Read operations | Long operations |
| **Queue** | Bypasses queue | Goes through queue |
| **Pattern** | Request-response | Fire-and-forget |

For more details, see [When to Use What](./WHEN-TO-USE-WHAT.md).

## Performance Considerations

### Queue Bypass
Queries bypass the message queue for immediate processing:

- **Benefit**: Faster response times
- **Trade-off**: Handler must be fast (blocks caller)
- **Use Case**: Read-only, fast operations

### Temporary Routes
One-shot requests create temporary routes:

- **Benefit**: No channel management needed
- **Trade-off**: Route creation overhead
- **Use Case**: One-time queries

## See Also

- [Communication Types Supported](./COMMUNICATION-TYPES-SUPPORTED.md) - Overview of all communication types
- [sendProtected](./SEND-PROTECTED.md) - Secure messaging mechanism used by all communication types
- [useQueries Hook](../hooks/queries/USE-QUERIES.md) - Hook API documentation
- [Requests Guide](./REQUESTS.md) - How queries use requests
- [When to Use What](./WHEN-TO-USE-WHAT.md) - Decision guide

