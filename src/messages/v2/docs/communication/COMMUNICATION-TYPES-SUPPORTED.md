# Communication Types Supported

## Overview

The Mycelia v2 message system supports multiple communication patterns for inter-subsystem interaction. Each pattern is designed for specific use cases and provides different guarantees, performance characteristics, and integration points.

**All communication types use `sendProtected` under the hood** - a secure messaging mechanism that ensures caller authentication, prevents spoofing, and enforces access control. The kernel wraps `sendProtected` to provide security guarantees including caller ID injection, channel access control, and response management.

For details on how `sendProtected` works and how the kernel ensures security, see [sendProtected](./SEND-PROTECTED.md).

## Supported Communication Types

### 1. **Events** (via `useListeners`)

**Purpose:** One-to-many event broadcasting and subscription

**Characteristics:**
- Publisher/subscriber pattern
- Fire-and-forget semantics
- Multiple subscribers can receive the same event
- No response expected
- Event-driven architecture support

**Use Cases:**
- State change notifications
- System-wide announcements
- Decoupled event broadcasting
- Observer pattern implementation

**Documentation:**
- [Events Guide](./EVENTS.md) - Detailed event communication patterns
- [useListeners Hook](../hooks/listeners/USE-LISTENERS.md) - Hook API documentation

---

### 2. **Commands** (via `useCommands`)

**Purpose:** Asynchronous command execution with channel-based replies

**Characteristics:**
- One-to-one command/response pattern
- Channel-based reply mechanism
- Timeout handling via ResponseManagerSubsystem
- Long-running operation support
- Fire-and-forget with async response

**Use Cases:**
- Long-running operations
- Operations requiring timeout handling
- Asynchronous task execution
- Operations where immediate response isn't needed

**Documentation:**
- [Commands Guide](./COMMANDS.md) - Detailed command communication patterns
- [useCommands Hook](../hooks/commands/USE-COMMANDS.md) - Hook API documentation

---

### 3. **Queries** (via `useQueries`)

**Purpose:** Synchronous read-only data retrieval

**Characteristics:**
- One-to-one request/response pattern
- Synchronous execution (via one-shot requests)
- Immediate response expected
- Read-only operations
- Bypasses message queue

**Use Cases:**
- Data retrieval
- Status checks
- Read-only operations
- Immediate response needed
- Simple lookups

**Documentation:**
- [Queries Guide](./QUERIES.md) - Detailed query communication patterns
- [useQueries Hook](../hooks/queries/USE-QUERIES.md) - Hook API documentation

---

### 4. **Requests** (via `useRequests`)

**Purpose:** Generic request/response mechanism with multiple execution patterns

**Characteristics:**
- Foundation for queries and commands
- Supports one-shot (temporary routes) and command (channels) types
- Fluent builder API
- Promise-based responses
- Automatic route management

**Use Cases:**
- Direct request/response operations
- Building custom communication patterns
- Underlying mechanism for queries and commands

**Documentation:**
- [Requests Guide](./REQUESTS.md) - How requests work and how queries/commands use them
- [useRequests Hook](../hooks/requests/USE-REQUESTS.md) - Hook API documentation

---

### 5. **Responses** (via `useResponses`)

**Purpose:** Response sending and routing

**Characteristics:**
- Response message creation
- Integration with ResponseManagerSubsystem
- Timeout handling
- ReplyTo channel routing
- Correlation ID management

**Use Cases:**
- Sending responses to commands
- Handling replyTo channels
- Response routing
- Timeout response handling

**Documentation:**
- [Responses Guide](./RESPONSES.md) - Response handling and ResponseManagerSubsystem integration
- [useResponses Hook](../hooks/responses/USE-RESPONSES.md) - Hook API documentation

---

## Communication Pattern Relationships

```
Events (useListeners)
  └─> One-to-many broadcasting

Queries (useQueries)
  └─> Uses Requests (one-shot type)
      └─> Temporary route registration
      └─> Immediate response

Commands (useCommands)
  └─> Uses Requests (command type)
      └─> Uses Channels for replies
      └─> Uses ResponseManagerSubsystem for timeouts
      └─> Uses Responses for reply handling

Requests (useRequests)
  ├─> One-shot type (temporary routes)
  └─> Command type (channels)

Responses (useResponses)
  └─> Integrates with ResponseManagerSubsystem
      └─> Timeout handling
      └─> ReplyTo routing
```

## Quick Comparison

| Type | Pattern | Response | Timeout | Use Case |
|------|---------|----------|---------|----------|
| **Events** | One-to-many | None | N/A | Broadcasting |
| **Queries** | One-to-one | Immediate | Local | Read operations |
| **Commands** | One-to-one | Async | ResponseManager | Long operations |
| **Requests** | One-to-one | Promise | Configurable | Generic requests |
| **Responses** | One-to-one | N/A | ResponseManager | Reply handling |

## Choosing the Right Pattern

For detailed guidance on when to use each communication type, see:

- [When to Use What](./WHEN-TO-USE-WHAT.md) - Decision guide for choosing communication patterns

## Integration Points

All communication types integrate with:

- **Message System**: Core message routing and delivery
- **Router**: Route registration and matching
- **Channels**: Long-lived communication channels (commands)
- **ResponseManagerSubsystem**: Timeout and response tracking (commands, responses)
- **Identity System**: Secure message sending via `identity.sendProtected()`
- **Kernel**: All messages are sent through `kernel.sendProtected()` which provides security guarantees

## Underlying Security Mechanism

**All communication types use `sendProtected` under the hood:**

- **Events**: Sent via `identity.sendProtected()` → `kernel.sendProtected()`
- **Commands**: Sent via `identity.sendProtected()` → `kernel.sendProtected()`
- **Queries**: Sent via `identity.sendProtected()` → `kernel.sendProtected()`
- **Requests**: Sent via `identity.sendProtected()` → `kernel.sendProtected()`
- **Responses**: Sent via `identity.sendProtected()` → `kernel.sendProtected()`

The kernel wraps `sendProtected` to ensure:
- **Caller Authentication**: Caller ID is injected by kernel (cannot be spoofed)
- **Access Control**: Channel ACL enforcement for channel-based messages
- **Response Management**: Automatic registration and validation of response-required messages
- **Security Guarantees**: All messages are authenticated and validated before routing

For detailed information, see [sendProtected](./SEND-PROTECTED.md).

## See Also

- [Commands Guide](./COMMANDS.md) - Detailed command patterns
- [Queries Guide](./QUERIES.md) - Detailed query patterns
- [Events Guide](./EVENTS.md) - Detailed event patterns
- [Requests Guide](./REQUESTS.md) - Request/response foundation
- [Responses Guide](./RESPONSES.md) - Response handling
- [Channels Guide](./CHANNELS.md) - Channel-based communication
- [When to Use What](./WHEN-TO-USE-WHAT.md) - Decision guide

