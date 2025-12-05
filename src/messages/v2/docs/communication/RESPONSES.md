# Responses

## Overview

Responses are messages sent in reply to commands and requests. They integrate with ResponseManagerSubsystem for timeout handling, correlation tracking, and reply routing. The response system ensures reliable delivery and proper error handling for asynchronous operations.

## Characteristics

### Correlation Tracking
- Responses are correlated with original requests using correlation IDs
- ResponseManagerSubsystem tracks pending responses
- Automatic matching of responses to requests

### Timeout Handling
- ResponseManagerSubsystem handles timeouts centrally
- Synthetic timeout responses emitted when commands time out
- Timeout responses include error metadata

### Reply Routing
- Responses routed to replyTo channels or temporary routes
- Reply paths resolved from multiple sources
- Automatic routing via kernel

### Response Validation
- ResponseManagerSubsystem validates incoming responses
- Checks correlation state before routing
- Prevents duplicate or invalid responses

## How Responses Work

### 1. Response Registration

When a command is sent with `responseRequired`, ResponseManagerSubsystem registers it:

```javascript
// Command sent with responseRequired
await subsystem.requests
  .command()
  .with({
    replyTo: 'subsystem://channel/replies',
    timeout: 10000
  })
  .forMessage(commandMessage)
  .send();

// ResponseManagerSubsystem automatically:
// 1. Registers pending response
// 2. Starts timeout timer
// 3. Tracks correlationId
```

### 2. Response Sending

Responses are sent using the `useResponses` hook:

```javascript
// Send success response
await subsystem.responses.sendSuccess(originalMessage, {
  userId: '123',
  username: 'alice'
});

// Send error response
await subsystem.responses.sendError(originalMessage, {
  error: 'User not found'
});
```

### 3. Reply Path Resolution

The response system resolves reply paths from multiple sources:

1. **ResponseManagerSubsystem**: Lookup pending response by correlationId
2. **Message Metadata**: Extract from `message.meta.replyTo`
3. **Message Body**: Extract from `message.body.replyTo`
4. **Configuration**: Use `defaultReplyPath` from config

```javascript
// Response path resolution priority:
// 1. ResponseManagerSubsystem.getReplyPathFor(correlationId)
// 2. message.meta.replyTo
// 3. message.body.replyTo
// 4. config.defaultReplyPath
```

### 4. Response Validation

ResponseManagerSubsystem validates responses before routing:

```javascript
// ResponseManagerSubsystem.validateResponse(responseMessage)
// 1. Extract correlationId from response
// 2. Lookup pending response entry
// 3. Check if already resolved
// 4. Validate correlation state
// 5. Route if valid
```

### 5. Timeout Handling

If a timeout occurs, ResponseManagerSubsystem emits a synthetic response:

```javascript
// Timeout response format
{
  path: replyTo,  // Original replyTo path
  body: {
    timeout: timeoutMs,
    correlationId: correlationId,
    reason: 'Command timed out',
    inReplyTo: correlationId
  },
  meta: {
    isResponse: true,
    success: false,
    inReplyTo: correlationId,
    error: {
      kind: 'timeout',
      message: 'Command timed out',
      timeoutMs: timeoutMs
    }
  }
}
```

## ResponseManagerSubsystem Integration

### Registration

ResponseManagerSubsystem registers pending responses:

```javascript
// Called automatically by KernelSubsystem.sendProtected()
responseManager.registerResponseRequiredFor(ownerPkr, message, {
  replyTo: 'subsystem://channel/replies',
  timeout: 10000
});
```

### Timeout Detection

ResponseManagerSubsystem detects timeouts:

```javascript
// Timeout timer fires
async #onTimeout(entry) {
  // Emit synthetic timeout response
  await this.#emitTimeoutResponse(entry);
}
```

### Response Validation

ResponseManagerSubsystem validates responses:

```javascript
// Validate incoming response
const isValid = responseManager.validateResponse(responseMessage);

if (isValid) {
  // Route response
  await kernel.sendProtected(responseMessage);
} else {
  // Reject invalid response
  logger.warn('Invalid response rejected');
}
```

## Response Sending Patterns

### Success Response

```javascript
// Using useResponses hook
await subsystem.responses.sendSuccess(originalMessage, {
  result: 'Operation completed',
  data: { /* result data */ }
});

// Response includes:
// - path: resolved replyTo
// - inReplyTo: original message ID
// - body: success payload
// - meta.isResponse: true
// - meta.success: true
```

### Error Response

```javascript
// Using useResponses hook
await subsystem.responses.sendError(originalMessage, {
  error: 'Operation failed',
  details: { /* error details */ }
});

// Response includes:
// - path: resolved replyTo
// - inReplyTo: original message ID
// - body: error payload
// - meta.isResponse: true
// - meta.success: false
```

### Generic Response

```javascript
// Using useResponses hook
await subsystem.responses.sendResponse({
  path: 'subsystem://channel/replies',
  inReplyTo: originalMessage.getId(),
  payload: { /* response data */ },
  success: true,
  options: { /* additional options */ }
});
```

## Timeout Handling

### Timeout Detection

ResponseManagerSubsystem detects timeouts:

1. **Timer Started**: When response is registered
2. **Timer Fires**: After timeout duration
3. **Timeout Check**: Verify response not already received
4. **Synthetic Response**: Emit timeout response

### Timeout Response

Timeout responses are synthetic messages:

```javascript
{
  path: replyTo,  // Original replyTo
  body: {
    timeout: 10000,
    correlationId: 'msg-123',
    reason: 'Command timed out',
    inReplyTo: 'msg-123'
  },
  meta: {
    isResponse: true,
    success: false,
    inReplyTo: 'msg-123',
    error: {
      kind: 'timeout',
      message: 'Command timed out after 10000ms',
      timeoutMs: 10000
    }
  }
}
```

### Timeout Handling in Commands

Commands handle timeout responses:

```javascript
const response = await subsystem.commands.send('processData', payload);

if (response.meta?.isResponse && !response.meta?.success) {
  if (response.body?.error?.kind === 'timeout') {
    console.error('Command timed out:', response.body.error);
  }
}
```

## ReplyTo Routing

### Channel-Based Replies

Commands use channels for replies:

```javascript
// Command with channel reply
await subsystem.commands.send('processData', payload, {
  replyChannel: 'subsystem://channel/replies'
});

// Response sent to channel
await subsystem.responses.sendSuccess(originalMessage, result);
// -> Routed to 'subsystem://channel/replies'
```

### Temporary Route Replies

One-shot requests use temporary routes:

```javascript
// One-shot request
await subsystem.requests
  .oneShot()
  .with({ handler: ... })
  .forMessage(message)
  .send();

// Response sent to temporary route
// -> Automatically routed to temporary route handler
```

## Response Lifecycle

```
1. Command/Request Sent
   ├─> Message sent with responseRequired
   └─> ResponseManagerSubsystem registers pending response

2. Timeout Timer Started
   └─> Timer started for timeout duration

3. Command Processing
   └─> Destination subsystem processes command

4. Response Sending
   ├─> Response sent via useResponses hook
   ├─> Reply path resolved
   └─> Response routed to replyTo

5. Response Validation
   ├─> ResponseManagerSubsystem validates response
   └─> Checks correlation state

6. Response Delivery
   ├─> Response delivered to reply channel/route
   └─> CommandManager resolves promise

7. Timeout (if applicable)
   ├─> Timer fires
   ├─> Synthetic timeout response emitted
   └─> CommandManager resolves with timeout
```

## Best Practices

### 1. Always Send Responses
Always send responses for commands that require them:

```javascript
// Good: Send response
subsystem.registerRoute('processor://data/process', async (message) => {
  const result = await processData(message.getBody());
  await subsystem.responses.sendSuccess(message, result);
});

// Bad: No response sent
subsystem.registerRoute('processor://data/process', async (message) => {
  await processData(message.getBody());
  // No response - command will timeout!
});
```

### 2. Handle Timeouts
Always check for timeout responses:

```javascript
const response = await subsystem.commands.send('processData', payload);

if (response.meta?.isResponse && !response.meta?.success) {
  if (response.body?.error?.kind === 'timeout') {
    // Handle timeout
    console.error('Operation timed out');
  } else {
    // Handle other errors
    console.error('Operation failed:', response.body?.error);
  }
}
```

### 3. Use Appropriate Timeouts
Set timeouts that match operation duration:

```javascript
// Quick operations
await subsystem.commands.send('quickOp', payload, {
  timeout: 1000  // 1 second
});

// Long operations
await subsystem.commands.send('longOp', payload, {
  timeout: 60000  // 60 seconds
});
```

### 4. Include Correlation Information
Always include correlation IDs in responses:

```javascript
await subsystem.responses.sendSuccess(originalMessage, result);
// Automatically includes:
// - inReplyTo: originalMessage.getId()
// - meta.inReplyTo: correlationId
```

## See Also

- [Communication Types Supported](./COMMUNICATION-TYPES-SUPPORTED.md) - Overview of all communication types
- [sendProtected](./SEND-PROTECTED.md) - Secure messaging mechanism used by all communication types
- [useResponses Hook](../hooks/responses/USE-RESPONSES.md) - Hook API documentation
- [ResponseManagerSubsystem](../models/kernel-subsystem/response-manager-subsystem/RESPONSE-MANAGER-SUBSYSTEM.md) - Response manager implementation
- [Commands Guide](./COMMANDS.md) - Command communication patterns
- [Requests Guide](./REQUESTS.md) - Request/response foundation

