# Channels

## Overview

Channels are long-lived communication paths used for multi-party communication. They provide a persistent route for sending and receiving messages, making them ideal for command replies and ongoing communication between subsystems.

## Characteristics

### Long-Lived
- Channels persist across multiple messages
- Created once and reused for multiple communications
- Managed by ChannelManagerSubsystem

### Multi-Party
- Multiple participants can use the same channel
- Owner controls access and participant management
- Access control via PKR-based permissions

### Route-Based
- Channels have persistent routes (e.g., `subsystem://channel/replies`)
- Routes are registered and remain active
- Messages routed to channels via standard routing

### Owner-Controlled
- Channel owner (PKR) controls access
- Owner can add/remove participants
- Owner can manage channel metadata

## How Channels Work

### 1. Channel Creation

Channels are created using the `useChannels` hook:

```javascript
// Create channel with local name
const channel = subsystem.channels.create('data-replies', {
  participants: [clientPkr],
  metadata: { description: 'Data processing replies' }
});

// Channel route: subsystem://channel/data-replies
console.log(channel.route);
```

### 2. Channel Route Registration

Channel routes must be registered to handle incoming messages:

```javascript
// Register route handler for channel
subsystem.registerRoute('subsystem://channel/data-replies', async (message) => {
  // Handle messages on this channel
  console.log('Received on channel:', message.getBody());
});
```

### 3. Channel Usage

Channels are used for sending and receiving messages:

```javascript
// Send message to channel
await subsystem.send('subsystem://channel/data-replies', {
  result: 'Operation completed'
});

// Receive messages via route handler
subsystem.registerRoute('subsystem://channel/data-replies', async (message) => {
  const result = message.getBody();
  // Process result
});
```

## How Commands Use Channels

Commands use channels for reply handling:

### Command Registration with Channel

```javascript
// Register command with automatic channel creation
subsystem.commands.register('processData', {
  path: 'processor://data/process',
  createChannel: true,  // Automatically create reply channel
  channelOptions: {
    participants: [clientPkr],
    metadata: { description: 'Data processing replies' }
  }
});

// Channel created: subsystem://channel/command/processData
```

### Command Execution with Channel

```javascript
// Send command
const result = await subsystem.commands.send('processData', {
  data: [1, 2, 3, 4, 5]
});

// Response arrives on channel: subsystem://channel/command/processData
// CommandManager handles correlation and promise resolution
```

### Channel Route Handler for Commands

```javascript
// Register route handler for command reply channel
subsystem.registerRoute('subsystem://channel/command/processData', (responseMessage) => {
  // CommandManager handles correlation and promise resolution
  subsystem.requests.commandManager.handleCommandReply(responseMessage);
});
```

## How Requests Use Channels

Command requests use channels for replies:

### Command Request with Channel

```javascript
// Command request uses channel for replies
await subsystem.requests
  .command()
  .with({
    replyTo: 'subsystem://channel/replies',  // Channel route
    timeout: 10000
  })
  .forMessage(commandMessage)
  .send();

// Response sent to channel route
// ResponseManagerSubsystem tracks timeout
// CommandManager handles correlation
```

### Channel-Based Response Handling

```javascript
// Register channel route for command replies
subsystem.registerRoute('subsystem://channel/replies', (responseMessage) => {
  // CommandManager matches correlationId
  subsystem.requests.commandManager.handleCommandReply(responseMessage);
});
```

## Channel Management

### Creating Channels

```javascript
// Create channel with local name
const channel = subsystem.channels.create('replies', {
  participants: [otherPkr],
  metadata: { description: 'Reply channel' }
});

// Create channel with explicit route
const channel = subsystem.channels.createWithRoute('custom://special/channel', {
  participants: [otherPkr],
  metadata: { description: 'Special channel' }
});
```

### Accessing Channels

```javascript
// Get channel by name or route
const channel = subsystem.channels.get('replies');
// or
const channel = subsystem.channels.get('subsystem://channel/replies');

// List all channels
const channels = subsystem.channels.list();
```

### Channel Properties

```javascript
const channel = subsystem.channels.create('replies');

// Channel properties
console.log(channel.route);        // 'subsystem://channel/replies'
console.log(channel.ownerPkr);    // Owner's PKR
console.log(channel.participants); // Set of participant PKRs
console.log(channel.metadata);    // Channel metadata
```

## Channel Lifecycle

```
1. Channel Creation
   ├─> Create channel via useChannels hook
   ├─> Channel registered with ChannelManagerSubsystem
   └─> Route: subsystem://channel/<name>

2. Route Registration
   └─> Register route handler for channel route

3. Channel Usage
   ├─> Send messages to channel route
   └─> Receive messages via route handler

4. Channel Management
   ├─> Add/remove participants
   ├─> Update metadata
   └─> Access control via owner PKR

5. Channel Cleanup (if needed)
   └─> Unregister route handler
```

## Channel Patterns

### Command Reply Channel

```javascript
// Create reply channel for commands
const replyChannel = subsystem.channels.create('command-replies', {
  participants: [clientPkr],
  metadata: { description: 'Command replies' }
});

// Register command with channel
subsystem.commands.register('processData', {
  path: 'processor://data/process',
  replyChannel: replyChannel.route
});

// Register route handler
subsystem.registerRoute(replyChannel.route, (responseMessage) => {
  subsystem.requests.commandManager.handleCommandReply(responseMessage);
});
```

### Shared Reply Channel

```javascript
// Create shared reply channel for multiple commands
const sharedChannel = subsystem.channels.create('shared-replies', {
  participants: [clientPkr]
});

// Multiple commands use same channel
subsystem.commands.register('command1', {
  path: 'processor://command1',
  replyChannel: sharedChannel.route
});

subsystem.commands.register('command2', {
  path: 'processor://command2',
  replyChannel: sharedChannel.route
});

// Single route handler for all commands
subsystem.registerRoute(sharedChannel.route, (responseMessage) => {
  subsystem.requests.commandManager.handleCommandReply(responseMessage);
});
```

### Multi-Party Channel

```javascript
// Create channel with multiple participants
const channel = subsystem.channels.create('multi-party', {
  participants: [pkr1, pkr2, pkr3],
  metadata: { description: 'Multi-party communication' }
});

// All participants can send/receive on this channel
await subsystem.send(channel.route, {
  message: 'Hello from participant 1'
});
```

## Best Practices

### 1. Use Descriptive Channel Names
Use clear, descriptive names for channels:

```javascript
// Good: Descriptive names
subsystem.channels.create('command-replies');
subsystem.channels.create('data-processing-replies');
subsystem.channels.create('user-notifications');

// Less ideal: Generic names
subsystem.channels.create('replies');
subsystem.channels.create('channel1');
```

### 2. Set Appropriate Participants
Only include necessary participants:

```javascript
// Good: Specific participants
subsystem.channels.create('secure-replies', {
  participants: [authorizedPkr1, authorizedPkr2]
});

// Less ideal: Too many participants
subsystem.channels.create('replies', {
  participants: [pkr1, pkr2, pkr3, pkr4, pkr5, ...]  // Too many!
});
```

### 3. Register Route Handlers
Always register route handlers for channels:

```javascript
// Create channel
const channel = subsystem.channels.create('replies');

// Register route handler
subsystem.registerRoute(channel.route, async (message) => {
  // Handle messages on channel
  await processMessage(message);
});
```

### 4. Use Metadata for Documentation
Add metadata to channels for documentation:

```javascript
subsystem.channels.create('command-replies', {
  participants: [clientPkr],
  metadata: {
    description: 'Replies for command operations',
    created: new Date().toISOString(),
    version: '1.0'
  }
});
```

## Channels vs Temporary Routes

| Aspect | Channels | Temporary Routes |
|--------|----------|------------------|
| **Lifetime** | Long-lived | Short-lived |
| **Use Case** | Commands, ongoing communication | Queries, one-shot requests |
| **Management** | ChannelManagerSubsystem | Automatic cleanup |
| **Participants** | Multi-party | Single party |
| **Route** | Persistent | Temporary |

## See Also

- [Communication Types Supported](./COMMUNICATION-TYPES-SUPPORTED.md) - Overview of all communication types
- [useChannels Hook](../hooks/channels/USE-CHANNELS.md) - Hook API documentation
- [Commands Guide](./COMMANDS.md) - How commands use channels
- [Requests Guide](./REQUESTS.md) - How requests use channels
- [When to Use What](./WHEN-TO-USE-WHAT.md) - Decision guide



