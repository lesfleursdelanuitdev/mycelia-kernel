# Pending Response Class

## Overview

The **PendingResponse** class is an internal record for a response-required command. It tracks pending responses with correlation IDs, owner PKRs, reply-to paths, and timeouts.

**Key Features:**
- **Correlation Tracking**: Tracks correlation ID for response matching
- **Timeout Management**: Manages timeout timers for commands
- **State Tracking**: Tracks resolved and timed-out states
- **Snapshot Support**: Provides snapshot for introspection

## What is PendingResponse?

`PendingResponse` is an internal class used by `ResponseManagerSubsystem` to track individual response-required commands. It provides:
- Correlation ID tracking
- Timeout timer management
- State tracking (resolved, timed out)
- Snapshot for debugging/introspection

## Constructor

### Signature

```javascript
new PendingResponse({ correlationId, ownerPkr, replyTo, timeoutMs = null })
```

### Parameters

#### `correlationId` (string, required)

Correlation ID (typically message ID).

**Validation:**
- Must be a non-empty string
- Throws `Error` if invalid

#### `ownerPkr` (PKR, required)

Owner's Public Key Record.

**Validation:**
- Must be provided
- Throws `Error` if missing

#### `replyTo` (string, required)

Reply-to path for the response.

**Validation:**
- Must be a non-empty string
- Throws `Error` if invalid

#### `timeoutMs` (number, optional)

Timeout in milliseconds. If not provided or <= 0, no timeout is set.

**Default:** `null`

**Validation:**
- Must be a positive number to set timeout
- `null` or `<= 0` means no timeout

**Example:**
```javascript
const pending = new PendingResponse({
  correlationId: 'msg-123',
  ownerPkr: ownerPkr,
  replyTo: 'canvas://channel/replies',
  timeoutMs: 5000
});
```

## Properties

### `correlationId` (string, read-only)

Correlation ID for matching responses. Set during construction.

### `ownerPkr` (PKR, read-only)

Owner's Public Key Record. Set during construction.

### `replyTo` (string, read-only)

Reply-to path for the response. Set during construction.

### `timeoutMs` (number | null, read-only)

Timeout in milliseconds. `null` if no timeout. Set during construction.

### `timerId` (number | null, read-write)

Timeout timer ID. Set when timeout is started, cleared when timeout is cleared.

### `createdAt` (number, read-only)

Timestamp when the pending response was created. Set during construction.

### `resolved` (boolean, read-write)

Whether the pending response has been resolved. Set to `true` when response arrives.

### `timedOut` (boolean, read-write)

Whether the pending response has timed out. Set to `true` when timeout fires.

## Methods

### `startTimeout(onTimeout)`

Start the timeout timer.

**Signature:**
```javascript
startTimeout(onTimeout) => void
```

**Parameters:**
- `onTimeout` (Function, required) - Callback to invoke when timeout occurs

**Behavior:**
- Only starts if `timeoutMs` is set and timer is not already running
- Sets `timerId` with `setTimeout()`
- Calls `onTimeout(this)` when timeout fires

**Example:**
```javascript
pending.startTimeout((entry) => {
  console.log('Timeout fired for:', entry.correlationId);
});
```

### `clearTimeout()`

Clear the timeout timer.

**Signature:**
```javascript
clearTimeout() => void
```

**Behavior:**
- Clears the timeout timer if it exists
- Sets `timerId` to `null`

**Example:**
```javascript
pending.clearTimeout();
```

### `snapshot()`

Get a snapshot of the pending response state.

**Signature:**
```javascript
snapshot() => Object
```

**Returns:** `Object` - Snapshot object with:
- `correlationId` (string) - Correlation ID
- `ownerPkr` (PKR) - Owner's PKR
- `replyTo` (string) - Reply-to path
- `timeoutMs` (number | null) - Timeout in milliseconds
- `createdAt` (number) - Creation timestamp
- `resolved` (boolean) - Whether resolved
- `timedOut` (boolean) - Whether timed out

**Example:**
```javascript
const snapshot = pending.snapshot();
console.log('Pending response snapshot:', snapshot);
// {
//   correlationId: 'msg-123',
//   ownerPkr: ownerPkr,
//   replyTo: 'canvas://channel/replies',
//   timeoutMs: 5000,
//   createdAt: 1234567890,
//   resolved: false,
//   timedOut: false
// }
```

## Usage Patterns

### Pattern 1: Create and Start Timeout

```javascript
// Create pending response
const pending = new PendingResponse({
  correlationId: 'msg-123',
  ownerPkr: ownerPkr,
  replyTo: 'canvas://channel/replies',
  timeoutMs: 5000
});

// Start timeout
pending.startTimeout((entry) => {
  console.log('Timeout fired for:', entry.correlationId);
  // Handle timeout...
});

// Later, if response arrives before timeout
pending.resolved = true;
pending.clearTimeout();
```

### Pattern 2: No Timeout

```javascript
// Create pending response without timeout
const pending = new PendingResponse({
  correlationId: 'msg-123',
  ownerPkr: ownerPkr,
  replyTo: 'canvas://channel/replies',
  timeoutMs: null  // No timeout
});

// startTimeout() will not start a timer
pending.startTimeout(() => {});
// Timer not started (timeoutMs is null)
```

### Pattern 3: State Tracking

```javascript
// Check state
if (pending.resolved) {
  console.log('Response already received');
} else if (pending.timedOut) {
  console.log('Response timed out');
} else {
  console.log('Still waiting for response');
}

// Get snapshot for debugging
const snapshot = pending.snapshot();
console.log('Current state:', snapshot);
```

## Integration with ResponseManagerSubsystem

PendingResponse instances are created and managed by `ResponseManagerSubsystem`:

```javascript
// ResponseManagerSubsystem creates PendingResponse internally
const pending = responseManager.registerResponseRequiredFor(
  ownerPkr,
  message,
  { replyTo: '...', timeout: 5000 }
);

// PendingResponse is managed by ResponseManagerSubsystem
// Timeout is automatically started
// State is automatically updated when response arrives
```

## Best Practices

1. **Use ResponseManagerSubsystem**: Create pending responses via `ResponseManagerSubsystem.registerResponseRequiredFor()`
2. **Set Timeouts**: Provide reasonable timeouts for commands
3. **Check State**: Use `resolved` and `timedOut` properties to check state
4. **Snapshot for Debugging**: Use `snapshot()` for debugging or logging
5. **Clear Timeouts**: Always clear timeout when response arrives

## See Also

- [Response Manager Subsystem](./RESPONSE-MANAGER-SUBSYSTEM.md) - Subsystem that manages pending responses
- [Kernel Subsystem](../../KERNEL-SUBSYSTEM.md) - Kernel subsystem with response management
- [useResponses Hook](../../../hooks/responses/USE-RESPONSES.md) - Hook for sending responses




