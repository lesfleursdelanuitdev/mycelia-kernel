# Events

## Overview

Events provide a one-to-many communication pattern for broadcasting messages to multiple subscribers. They use a publisher/subscriber model where events are emitted and any number of listeners can subscribe to receive them.

**Standard EventEmitter API:** Mycelia's event system provides the same familiar API as Node.js EventEmitter:
- `on(path, handler)` - Register a listener
- `off(path, handler)` - Unregister a listener
- `emit(path, message)` - Emit an event

This makes Mycelia's events **comparable to standard event systems** (like EventEmitter) while providing additional features like pattern matching, handler groups, and registration policies.

## Characteristics

### One-to-Many Pattern
- Single event emission reaches multiple subscribers
- Multiple listeners can subscribe to the same event
- Decoupled publisher and subscribers

### Fire-and-Forget
- Events are sent without expecting responses
- No reply channels or response handling
- Publisher doesn't wait for subscribers

### Path-Based Routing
- Events are routed by message path
- Listeners subscribe to specific paths or patterns
- Wildcard patterns supported

### Optional Activation
- Listeners can be enabled/disabled dynamically
- Registration policies control listener behavior
- Flexible subscription management

## How Events Work

### 1. Listener Registration

Listeners are registered for specific message paths:

```javascript
// Enable listeners
subsystem.listeners.enableListeners();

// Register a listener
subsystem.listeners.on('user/created', async (message) => {
  console.log('User created:', message.getBody());
});

// Register multiple handlers as a group
subsystem.listeners.on('user/updated', [
  async (message) => { /* handler 1 */ },
  async (message) => { /* handler 2 */ }
]);
```

### 2. Event Emission

Events can be emitted in two ways:

**Method 1: Using `emit()` (Standard EventEmitter API)**
```javascript
// Enable listeners
subsystem.listeners.enableListeners();

// Register listeners
subsystem.listeners.on('user/created', (message) => {
  console.log('User created:', message.getBody());
});

// Emit event directly
const message = new Message('user/created', {
  userId: '123',
  username: 'alice'
});
const notified = subsystem.listeners.emit('user/created', message);
// Returns: number of listeners notified
```

**Method 2: Using `send()` (Message Routing)**
```javascript
// Emit an event via message routing
await subsystem.send('user/created', {
  userId: '123',
  username: 'alice'
});

// All listeners registered for 'user/created' will receive this message
```

**Note:** The `emit()` method provides the standard EventEmitter API and is the recommended way to emit events directly to listeners. The `send()` method routes messages through the normal message routing system.

### 3. Listener Processing

When a message matches a listener's path:

1. **Message Routing**: Message is routed to matching listeners
2. **Listener Execution**: All matching listeners are executed
3. **No Response**: Listeners don't send responses
4. **Fire-and-Forget**: Publisher continues without waiting

### 4. Registration Policies

Different policies control listener registration:

```javascript
// Multiple listeners per path (default)
subsystem.listeners.enableListeners({
  registrationPolicy: 'multiple'
});

// Single listener per path
subsystem.listeners.enableListeners({
  registrationPolicy: 'single'
});

// Replace existing listener
subsystem.listeners.enableListeners({
  registrationPolicy: 'replace'
});

// Limited listeners per path
subsystem.listeners.enableListeners({
  registrationPolicy: 'limited',
  policyOptions: { maxListeners: 5 }
});
```

## Event Patterns

### Simple Event

```javascript
// Enable listeners
subsystem.listeners.enableListeners();

// Subscriber
subsystem.listeners.on('user/created', async (message) => {
  const { userId, username } = message.getBody();
  console.log(`User ${username} (${userId}) was created`);
});

// Publisher - Method 1: Using emit() (standard EventEmitter API)
const message = new Message('user/created', {
  userId: '123',
  username: 'alice'
});
subsystem.listeners.emit('user/created', message);

// Publisher - Method 2: Using send() (message routing)
await subsystem.send('user/created', {
  userId: '123',
  username: 'alice'
});
```

### Multiple Subscribers

```javascript
// Multiple subscribers for the same event
subsystem.listeners.on('user/created', async (message) => {
  // Subscriber 1: Send welcome email
  await sendWelcomeEmail(message.getBody());
});

subsystem.listeners.on('user/created', async (message) => {
  // Subscriber 2: Update analytics
  await updateAnalytics(message.getBody());
});

subsystem.listeners.on('user/created', async (message) => {
  // Subscriber 3: Log event
  console.log('User created event:', message.getBody());
});
```

### Pattern-Based Listeners

```javascript
// Listen to all user events
subsystem.listeners.on('user/*', async (message) => {
  console.log('User event:', message.getPath(), message.getBody());
});

// Listen to all events
subsystem.listeners.on('*', async (message) => {
  console.log('Any event:', message.getPath());
});
```

## Event Lifecycle

```
1. Listener Registration
   └─> Register listeners for specific paths

2. Event Emission
   ├─> Publisher sends message to event path
   └─> Message routed through normal routing

3. Listener Matching
   ├─> Router matches message path to listener paths
   └─> All matching listeners identified

4. Listener Execution
   ├─> Each matching listener executed
   ├─> Listeners run independently
   └─> No response expected

5. Completion
   └─> Publisher continues (fire-and-forget)
```

## Best Practices

### 1. Use Descriptive Paths
Use clear, hierarchical paths for events:

```javascript
// Good: Clear, hierarchical paths
subsystem.send('user/created', data);
subsystem.send('user/updated', data);
subsystem.send('order/completed', data);

// Less ideal: Flat paths
subsystem.send('userCreated', data);
subsystem.send('userUpdated', data);
```

### 2. Keep Listeners Fast
Listeners should execute quickly:

```javascript
// Good: Fast listener
subsystem.listeners.on('user/created', async (message) => {
  await this.cache.invalidate('users');
});

// Avoid: Slow listener (blocks other listeners)
subsystem.listeners.on('user/created', async (message) => {
  await slowDatabaseOperation();  // Blocks other listeners!
});
```

### 3. Handle Errors in Listeners
Don't let listener errors propagate:

```javascript
subsystem.listeners.on('user/created', async (message) => {
  try {
    await processUserCreated(message.getBody());
  } catch (error) {
    console.error('Listener error:', error);
    // Don't throw - other listeners should still execute
  }
});
```

### 4. Use Appropriate Policies
Choose registration policies that match your use case:

```javascript
// Multiple handlers for same event
subsystem.listeners.enableListeners({
  registrationPolicy: 'multiple'  // Allow multiple listeners
});

// Single handler per event
subsystem.listeners.enableListeners({
  registrationPolicy: 'single'  // Only one listener
});
```

## Events vs Commands vs Queries

| Aspect | Events | Commands | Queries |
|--------|--------|----------|---------|
| **Pattern** | One-to-many | One-to-one | One-to-one |
| **Response** | None | Async | Immediate |
| **Use Case** | Broadcasting | Long operations | Read operations |
| **Subscribers** | Multiple | Single | Single |
| **Coupling** | Decoupled | Coupled | Coupled |

For more details, see [When to Use What](./WHEN-TO-USE-WHAT.md).

## Use Cases

### State Change Notifications
```javascript
// Notify all subscribers when state changes
subsystem.listeners.on('canvas/layer/added', async (message) => {
  await this.updateUI(message.getBody());
});

await subsystem.send('canvas/layer/added', {
  layerId: 'layer-123',
  type: 'image'
});
```

### System-Wide Announcements
```javascript
// Broadcast system-wide announcements
subsystem.listeners.on('system/maintenance', async (message) => {
  await this.showMaintenanceNotice(message.getBody());
});

await subsystem.send('system/maintenance', {
  message: 'System maintenance scheduled',
  startTime: '2024-01-01T00:00:00Z'
});
```

### Observer Pattern
```javascript
// Implement observer pattern
class DataModel {
  constructor(subsystem) {
    this.subsystem = subsystem;
    this.data = {};
  }
  
  update(key, value) {
    this.data[key] = value;
    // Notify all observers
    this.subsystem.send('data/updated', { key, value });
  }
}

// Observer
subsystem.listeners.on('data/updated', async (message) => {
  const { key, value } = message.getBody();
  await this.refreshView(key, value);
});
```

## See Also

- [Communication Types Supported](./COMMUNICATION-TYPES-SUPPORTED.md) - Overview of all communication types
- [useListeners Hook](../hooks/listeners/USE-LISTENERS.md) - Hook API documentation
- [MessageSystem](../message/MESSAGE-SYSTEM.md) - Central coordinator with `listenerOn()` and `listenerOff()` methods
- [When to Use What](./WHEN-TO-USE-WHAT.md) - Decision guide


