# When to Use What

## Decision Guide

This guide helps you choose the right communication pattern for your use case. Each pattern has specific characteristics and is optimized for different scenarios.

## Quick Decision Tree

```
Need to broadcast to multiple subscribers?
├─ Yes → Use Events (useListeners)
└─ No → Continue...

Need immediate response?
├─ Yes → Use Queries (useQueries)
└─ No → Continue...

Operation is read-only?
├─ Yes → Use Queries (useQueries)
└─ No → Continue...

Operation may take a long time?
├─ Yes → Use Commands (useCommands)
└─ No → Use Queries (useQueries) or Commands (useCommands)
```

## Detailed Comparison

### Events vs Commands vs Queries

| Criteria | Events | Commands | Queries |
|----------|--------|----------|---------|
| **Pattern** | One-to-many | One-to-one | One-to-one |
| **Response** | None | Async (channel) | Immediate |
| **Execution** | Fire-and-forget | Async | Sync |
| **Queue** | Normal | Normal | Bypassed |
| **Timeout** | N/A | ResponseManager | Local |
| **Use Case** | Broadcasting | Long operations | Read operations |
| **State Change** | No | Yes | No (read-only) |

## Use Events When...

### ✅ Broadcasting State Changes
```javascript
// Notify all subscribers when state changes
subsystem.listeners.on('canvas/layer/added', async (message) => {
  await this.updateUI(message.getBody());
});

await subsystem.send('canvas/layer/added', {
  layerId: 'layer-123'
});
```

### ✅ Decoupled Communication
```javascript
// Publisher doesn't need to know about subscribers
await subsystem.send('user/created', userData);

// Multiple independent subscribers
subsystem.listeners.on('user/created', async (m) => { /* email */ });
subsystem.listeners.on('user/created', async (m) => { /* analytics */ });
subsystem.listeners.on('user/created', async (m) => { /* logging */ });
```

### ✅ System-Wide Announcements
```javascript
// Broadcast system-wide announcements
await subsystem.send('system/maintenance', {
  message: 'Maintenance scheduled',
  startTime: '2024-01-01T00:00:00Z'
});
```

### ❌ Don't Use Events When...
- You need a response
- You need to know if operation succeeded
- You need timeout handling
- You need one-to-one communication

## Use Commands When...

### ✅ Long-Running Operations
```javascript
// Operation may take time
subsystem.commands.register('processLargeFile', {
  path: 'processor://file/process',
  timeout: 60000  // 60 seconds
});

await subsystem.commands.send('processLargeFile', {
  fileId: 'file-123'
});
```

### ✅ Operations Requiring Timeout Handling
```javascript
// Need centralized timeout management
subsystem.commands.register('externalApiCall', {
  path: 'api://external/call',
  timeout: 10000  // ResponseManager handles timeout
});
```

### ✅ Asynchronous Task Execution
```javascript
// Fire-and-forget with async response
await subsystem.commands.send('generateReport', {
  reportId: 'report-123'
});

// Response arrives later on reply channel
```

### ✅ State-Modifying Operations
```javascript
// Operations that change state
subsystem.commands.register('updateUser', {
  path: 'user://update',
  timeout: 5000
});

await subsystem.commands.send('updateUser', {
  userId: '123',
  updates: { name: 'Alice' }
});
```

### ❌ Don't Use Commands When...
- You need immediate response
- Operation is read-only
- Operation is very fast (< 100ms)
- You don't need timeout handling

## Use Queries When...

### ✅ Read-Only Operations
```javascript
// Retrieve data without modifying state
subsystem.queries.register('getUser', async (message) => {
  const { userId } = message.getBody();
  return {
    success: true,
    data: await getUserData(userId)
  };
});

const result = await subsystem.queries.ask('getUser', { userId: '123' });
```

### ✅ Immediate Response Needed
```javascript
// Need response immediately
const status = await subsystem.queries.ask('getStatus');
// Response arrives immediately, no async delay
```

### ✅ Fast Operations
```javascript
// Fast lookups, cached data
subsystem.queries.register('getCachedData', async (message) => {
  return {
    success: true,
    data: this.cache.get(message.getBody().key)
  };
});
```

### ✅ Status Checks
```javascript
// Check system status
const isReady = await subsystem.queries.ask('isReady');
const health = await subsystem.queries.ask('getHealth');
```

### ❌ Don't Use Queries When...
- Operation modifies state
- Operation may take a long time
- You need timeout handling via ResponseManager
- Operation should go through message queue

## Use Requests Directly When...

### ✅ Building Custom Patterns
```javascript
// Custom request/response pattern
await subsystem.requests
  .oneShot()
  .with({
    handler: async (response) => {
      // Custom response handling
      return processResponse(response);
    },
    timeout: 5000
  })
  .forMessage(message)
  .send();
```

### ✅ Need Fine-Grained Control
```javascript
// Need control over request options
await subsystem.requests
  .command()
  .with({
    replyTo: customReplyChannel,
    timeout: customTimeout,
    sendOptions: { priority: 'high' }
  })
  .forMessage(message)
  .send();
```

### ❌ Don't Use Requests Directly When...
- Queries or commands fit your use case
- You don't need custom handling
- Higher-level APIs are sufficient

## Use Channels When...

### ✅ Command Replies
```javascript
// Commands need reply channels
subsystem.commands.register('processData', {
  path: 'processor://data/process',
  createChannel: true  // Automatic channel creation
});
```

### ✅ Ongoing Communication
```javascript
// Multiple messages on same channel
const channel = subsystem.channels.create('ongoing-communication', {
  participants: [otherPkr]
});

// Send multiple messages
await subsystem.send(channel.route, message1);
await subsystem.send(channel.route, message2);
await subsystem.send(channel.route, message3);
```

### ✅ Multi-Party Communication
```javascript
// Multiple participants
const channel = subsystem.channels.create('multi-party', {
  participants: [pkr1, pkr2, pkr3]
});
```

### ❌ Don't Use Channels When...
- One-time communication (use temporary routes)
- Query responses (use one-shot requests)
- Simple request/response (use queries)

## Decision Matrix

| Scenario | Recommended Pattern | Reason |
|----------|---------------------|--------|
| Broadcast state change | Events | One-to-many, no response needed |
| Get user data | Queries | Read-only, immediate response |
| Process large file | Commands | Long-running, async response |
| Update user profile | Commands | State-modifying, may take time |
| Check system status | Queries | Read-only, fast, immediate |
| Send notification | Events | One-to-many, fire-and-forget |
| Generate report | Commands | Long-running, async response |
| Get cached value | Queries | Read-only, fast, immediate |
| Multi-party chat | Channels | Ongoing, multi-party |
| Command replies | Channels | Long-lived, command responses |

## Performance Considerations

### Queries (Fastest for Reads)
- Bypass message queue
- Immediate execution
- Best for: Fast read operations

### Commands (Best for Long Operations)
- Go through message queue
- Async response handling
- Best for: Long-running operations

### Events (Best for Broadcasting)
- Normal queue processing
- Multiple subscribers
- Best for: Broadcasting

### Channels (Best for Ongoing Communication)
- Persistent routes
- Reusable for multiple messages
- Best for: Command replies, ongoing communication

## Error Handling Considerations

### Queries
- Local timeout handling
- Errors returned in response
- Fast failure detection

### Commands
- ResponseManager timeout handling
- Timeout responses via kernel
- Errors in response or timeout

### Events
- No error handling (fire-and-forget)
- Errors in listeners don't affect publisher
- Listener errors should be handled internally

## See Also

- [Communication Types Supported](./COMMUNICATION-TYPES-SUPPORTED.md) - Overview of all communication types
- [Events Guide](./EVENTS.md) - Event communication patterns
- [Commands Guide](./COMMANDS.md) - Command communication patterns
- [Queries Guide](./QUERIES.md) - Query communication patterns
- [Requests Guide](./REQUESTS.md) - Request/response foundation
- [Channels Guide](./CHANNELS.md) - Channel-based communication
- [Responses Guide](./RESPONSES.md) - Response handling



