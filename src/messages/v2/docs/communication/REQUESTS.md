# Requests

## Overview

Requests provide the foundation for request/response communication patterns in the Mycelia system. They support two execution types: one-shot requests (temporary routes) and command requests (channel-based). Both queries and commands use requests under the hood.

## Request Types

### One-Shot Requests

One-shot requests use temporary routes for replies:

- **Temporary Route**: Automatically created for each request
- **Automatic Cleanup**: Route removed after response or timeout
- **Immediate Response**: Response arrives on temporary route
- **Use Case**: Queries, one-time requests

### Command Requests

Command requests use channels for replies:

- **Channel-Based**: Long-lived channels for replies
- **ResponseManager**: Timeout handling via ResponseManagerSubsystem
- **Async Response**: Responses arrive asynchronously on channel
- **Use Case**: Commands, long-running operations

## How Requests Work

### RequestBuilder API

Requests use a fluent builder API:

```javascript
// One-shot request
const result = await subsystem.requests
  .oneShot()
  .with({
    handler: async (response) => response.getBody(),
    timeout: 5000
  })
  .forMessage(message)
  .send();

// Command request
const result = await subsystem.requests
  .command()
  .with({
    replyTo: 'subsystem://channel/replies',
    timeout: 10000
  })
  .forMessage(message)
  .send();
```

### One-Shot Request Flow

```
1. Request Creation
   ├─> Create RequestBuilder (oneShot type)
   └─> Configure with handler and timeout

2. Temporary Route Creation
   ├─> Generate unique temporary route
   └─> Register route handler

3. Message Sending
   ├─> Send message via identity.sendProtected()
   └─> Include replyTo: temporary route

4. Response Handling
   ├─> Response arrives on temporary route
   ├─> Handler processes response
   └─> Promise resolves with handler result

5. Cleanup
   └─> Temporary route automatically removed
```

### Command Request Flow

```
1. Request Creation
   ├─> Create RequestBuilder (command type)
   └─> Configure with replyTo channel and timeout

2. Message Sending
   ├─> Send message via identity.sendProtected()
   └─> Include responseRequired: { replyTo, timeout }

3. ResponseManager Registration
   ├─> ResponseManagerSubsystem registers pending response
   └─> Timeout timer started

4. Response Handling
   ├─> Response arrives on reply channel
   ├─> CommandManager matches correlationId
   └─> Promise resolves with response

5. Timeout Handling (if applicable)
   ├─> ResponseManager detects timeout
   ├─> Emits synthetic timeout response
   └─> Promise resolves with timeout response
```

## How Queries Use Requests

Queries use one-shot requests internally:

```javascript
// Query execution
await subsystem.queries.ask('getUser', { userId: '123' });

// Internally uses:
await subsystem.requests
  .oneShot()
  .with({
    handler: async (response) => response.getBody(),
    timeout: 5000
  })
  .forMessage(queryMessage)
  .send();
```

### Query Request Characteristics

- **Type**: One-shot (temporary route)
- **Handler**: Extracts response body
- **Timeout**: Local timeout (default 5 seconds)
- **Cleanup**: Automatic route cleanup

## How Commands Use Requests

Commands use command requests internally:

```javascript
// Command execution
await subsystem.commands.send('processData', { data: [1, 2, 3] });

// Internally uses:
await subsystem.requests
  .command()
  .with({
    replyTo: replyChannel,
    timeout: 10000
  })
  .forMessage(commandMessage)
  .send();
```

### Command Request Characteristics

- **Type**: Command (channel-based)
- **Reply Channel**: Long-lived channel route
- **Timeout**: ResponseManagerSubsystem timeout
- **Response Handling**: Via CommandManager

## Request Options

### One-Shot Options

```javascript
subsystem.requests
  .oneShot()
  .with({
    handler: async (response) => {
      // Process response
      return response.getBody();
    },
    timeout: 5000,  // Local timeout
    replyTo: 'custom://reply/route'  // Override default
  })
  .forMessage(message)
  .send();
```

### Command Options

```javascript
subsystem.requests
  .command()
  .with({
    replyTo: 'subsystem://channel/replies',  // Required
    timeout: 10000,  // ResponseManager timeout
    sendOptions: {  // Additional sendProtected options
      priority: 'high'
    }
  })
  .forMessage(message)
  .send();
```

## Direct Request Usage

While queries and commands provide higher-level APIs, you can use requests directly:

### Direct One-Shot Request

```javascript
const message = subsystem.messages.create('processor://data/process', {
  data: [1, 2, 3]
});

const result = await subsystem.requests
  .oneShot()
  .with({
    handler: async (response) => {
      if (response.meta?.isResponse && !response.meta?.success) {
        throw new Error(response.body?.error || 'Request failed');
      }
      return response.getBody();
    },
    timeout: 5000
  })
  .forMessage(message)
  .send();
```

### Direct Command Request

```javascript
const message = subsystem.messages.create('processor://data/process', {
  data: [1, 2, 3]
});

// Register reply channel route
subsystem.registerRoute('subsystem://channel/replies', (responseMessage) => {
  subsystem.requests.commandManager.handleCommandReply(responseMessage);
});

const result = await subsystem.requests
  .command()
  .with({
    replyTo: 'subsystem://channel/replies',
    timeout: 10000
  })
  .forMessage(message)
  .send();
```

## Request Lifecycle

### One-Shot Request Lifecycle

```
1. Request Creation
   └─> RequestBuilder created with oneShot type

2. Temporary Route Registration
   ├─> Generate unique route ID
   ├─> Register temporary route handler
   └─> Store handler for response

3. Message Sending
   ├─> Create message with replyTo: temporary route
   └─> Send via identity.sendProtected()

4. Response Arrival
   ├─> Response routed to temporary route
   ├─> Handler processes response
   └─> Promise resolves

5. Cleanup
   ├─> Unregister temporary route
   └─> Clean up handler
```

### Command Request Lifecycle

```
1. Request Creation
   └─> RequestBuilder created with command type

2. Message Sending
   ├─> Create message
   └─> Send via identity.sendProtected() with responseRequired

3. ResponseManager Registration
   ├─> ResponseManagerSubsystem registers pending response
   └─> Timeout timer started

4. Response Arrival
   ├─> Response arrives on reply channel
   ├─> CommandManager matches correlationId
   └─> Promise resolves

5. Timeout (if applicable)
   ├─> ResponseManager detects timeout
   ├─> Emits synthetic timeout response
   └─> Promise resolves with timeout
```

## Best Practices

### 1. Use Higher-Level APIs When Possible
Prefer queries and commands over direct requests:

```javascript
// Good: Use queries
await subsystem.queries.ask('getUser', { userId: '123' });

// Less ideal: Direct request
await subsystem.requests.oneShot()...
```

### 2. Set Appropriate Timeouts
Match timeout to operation duration:

```javascript
// Quick operations
.with({ timeout: 1000 })

// Long operations
.with({ timeout: 60000 })
```

### 3. Handle Errors Properly
Always handle errors in handlers:

```javascript
.with({
  handler: async (response) => {
    if (response.meta?.isResponse && !response.meta?.success) {
      throw new Error(response.body?.error || 'Request failed');
    }
    return response.getBody();
  }
})
```

### 4. Clean Up Resources
One-shot requests clean up automatically, but command requests require channel route registration:

```javascript
// Register reply channel route before sending command
subsystem.registerRoute('subsystem://channel/replies', (responseMessage) => {
  subsystem.requests.commandManager.handleCommandReply(responseMessage);
});
```

## See Also

- [Communication Types Supported](./COMMUNICATION-TYPES-SUPPORTED.md) - Overview of all communication types
- [sendProtected](./SEND-PROTECTED.md) - Secure messaging mechanism used by all communication types
- [useRequests Hook](../hooks/requests/USE-REQUESTS.md) - Hook API documentation
- [Commands Guide](./COMMANDS.md) - How commands use requests
- [Queries Guide](./QUERIES.md) - How queries use requests
- [Channels Guide](./CHANNELS.md) - Channel-based communication
- [Responses Guide](./RESPONSES.md) - Response handling

