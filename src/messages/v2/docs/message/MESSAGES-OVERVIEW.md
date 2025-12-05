# Messages Overview

## Introduction

The Mycelia Kernel uses a **message-driven architecture** where subsystems communicate through messages. Messages are the primary mechanism for inter-subsystem communication, enabling loose coupling, asynchronous processing, and a flexible routing system.

## What are Messages?

Messages are structured data objects that:

- **Carry Information**: Contain payload data and metadata
- **Route to Subsystems**: Include paths that determine routing
- **Support Queries**: Can be queries that return synchronous results
- **Track State**: Include metadata for tracing, timing, and processing
- **Enable Communication**: Allow subsystems to interact without direct references

## Message System Architecture

The message system consists of several key components:

### MessageSystem

The `MessageSystem` class is the central coordinator that:

- **Manages Subsystems**: Maintains a registry of all registered subsystems
- **Routes Messages**: Routes messages to appropriate subsystems based on paths
- **Coordinates Scheduling**: Manages global scheduling to allocate processing time
- **Provides Kernel**: Creates and manages the kernel subsystem for system-level operations

### Message Router

The `MessageRouter` class routes messages to subsystems:

- **Path-Based Routing**: Extracts subsystem names from message paths
- **Kernel Handling**: Special handling for `kernel://` messages
- **Query Support**: Handles query messages with synchronous results
- **Error Handling**: Provides detailed routing error information

### Message Registry

The `MessageSystemRegistry` maintains a registry of subsystems:

- **Subsystem Storage**: Stores subsystems by name
- **Kernel Protection**: Hides kernel from find/get operations
- **Iteration Support**: Provides iteration over all subsystems

### Global Scheduler

The `GlobalScheduler` manages time allocation:

- **Time Slicing**: Allocates time slices to subsystems
- **Scheduling Strategies**: Supports multiple scheduling algorithms
- **Performance Monitoring**: Tracks scheduling statistics

## Message Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    Message Flow                            │
└─────────────────────────────────────────────────────────────┘

1. Message Creation
   │
   ▼
2. MessageSystem.send(message)
   │
   ▼
3. MessageRouter.route(message)
   │  ├─ Extract subsystem name from path
   │  ├─ Find target subsystem
   │  └─ Route to subsystem
   │
   ▼
4. Subsystem.accept(message)
   │  ├─ Check if query (synchronous)
   │  ├─ Process immediately OR
   │  └─ Enqueue for later processing
   │
   ▼
5. Subsystem Processing
   │  ├─ Router matches routes
   │  ├─ Handler executes
   │  └─ Result returned
   │
   ▼
6. Response (if query)
```

## Message Structure

### Message Path

Messages include a path that determines routing:

- **Format**: `subsystem://path/to/action`
- **Examples**:
  - `kernel://error/record/internal`
  - `canvas://layers/create`
  - `storage://files/read`

### Message Payload

Messages carry payload data:

```javascript
const message = new Message('canvas://layers/create', {
  name: 'background',
  type: 'image',
  data: imageData
});
```

### Message Metadata

Messages include metadata for:

- **Tracing**: Message ID, caller information
- **Timing**: Timestamps, processing duration
- **Routing**: Path, subsystem information
- **Processing**: Flags, options

## Message Types

### Standard Messages

Standard messages are processed asynchronously:

- **Queued**: Added to subsystem queue
- **Processed Later**: Handled by scheduler
- **No Immediate Response**: Fire-and-forget

### Query Messages

Query messages return synchronous results:

- **Processed Immediately**: Bypass queue
- **Synchronous Response**: Return result directly
- **Query Handlers**: Use query handler system

```javascript
const message = new Message('canvas://layers/query/all');
message.setQuery(true);

const result = await messageSystem.send(message);
console.log(result.data); // Query result
```

## Routing

### Path-Based Routing

Messages are routed based on their path:

```
Message Path: canvas://layers/create
              │      │
              │      └─ Action path
              └─ Subsystem name
```

### Kernel Messages

Kernel messages (`kernel://*`) are handled specially:

- **Immediate Processing**: Processed synchronously
- **No Queuing**: Bypass queue and scheduler
- **System Operations**: Access control, error management

### Subsystem Routing

Subsystems use internal routers to match routes:

- **Route Patterns**: Pattern matching for paths
- **Route Handlers**: Handler functions for matched routes
- **Route Priority**: Priority-based route selection

## Message Processing

### Asynchronous Processing

Standard messages are processed asynchronously:

1. **Accept**: Message accepted into subsystem
2. **Queue**: Added to subsystem queue
3. **Schedule**: Scheduler allocates time
4. **Process**: Handler executes
5. **Complete**: Processing complete

### Synchronous Processing

Query messages are processed synchronously:

1. **Accept**: Message accepted
2. **Route**: Router matches route
3. **Execute**: Handler executes immediately
4. **Return**: Result returned synchronously

## Global Scheduling

The global scheduler manages time allocation:

### Scheduling Strategies

- **Round-Robin**: Equal time allocation in circular order
- **Priority-Based**: Allocate time based on subsystem priority
- **Load-Based**: Allocate more time to subsystems with more work
- **Adaptive**: Dynamically switches strategies based on utilization

### Time Slicing

- **Time Slice Duration**: Configurable duration per subsystem
- **Fair Allocation**: Ensures all subsystems get processing time
- **Performance Monitoring**: Tracks scheduling statistics

## Kernel Subsystem

The kernel subsystem provides system-level operations:

### Access Control

- **Identity Management**: Principal registry
- **Resource Management**: Resource creation and access
- **Friend Management**: Trusted peer relationships

### Error Management

- **Error Recording**: Normalized error records
- **Error Querying**: Query recent errors by type
- **Error Classification**: Automatic error classification

## Usage Patterns

### Creating Messages

```javascript
import { Message } from './models/message/message.mycelia.js';

// Standard message
const message = new Message('canvas://layers/create', {
  name: 'background',
  type: 'image'
});

// Query message
const query = new Message('canvas://layers/query/all');
query.setQuery(true);
```

### Sending Messages

```javascript
// Via MessageSystem
await messageSystem.send(message);

// Via Subsystem
await subsystem.accept(message);
```

### Handling Messages

```javascript
// Register route handler
subsystem.registerRoute('canvas://layers/create', async (message, params) => {
  const { name, type } = message.payload;
  // Create layer
  return { success: true, layerId: newLayerId };
});
```

### Query Messages

```javascript
// Create query
const query = new Message('canvas://layers/query/all');
query.setQuery(true);

// Send and get result
const result = await messageSystem.send(query);
console.log(result.data); // Query result
```

## Best Practices

### Message Design

1. **Clear Paths**: Use descriptive, hierarchical paths
2. **Structured Payloads**: Use consistent payload structures
3. **Appropriate Types**: Use queries for synchronous operations
4. **Metadata**: Include relevant metadata for tracing

### Routing

1. **Pattern Matching**: Use route patterns for flexibility
2. **Priority**: Set route priorities appropriately
3. **Error Handling**: Handle routing errors gracefully
4. **Validation**: Validate message payloads in handlers

### Performance

1. **Batch Operations**: Batch related messages when possible
2. **Query Optimization**: Use queries for synchronous needs
3. **Queue Management**: Monitor queue sizes and adjust capacity
4. **Scheduling**: Choose appropriate scheduling strategies

## Related Documentation

- [Message System](./MESSAGE-SYSTEM.md) - Central coordinator for message-driven architecture
- [Message](./MESSAGE.md) - Message class for inter-subsystem communication
- [Message Factory](./MESSAGE-FACTORY.md) - Centralized factory for creating messages
- [Message Metadata](./MESSAGE-METADATA.md) - Message metadata with fixed and mutable data
- [Message Metadata Utils](./MESSAGE-METADATA-UTILS.md) - Utilities for building message metadata
- [Message Router](../hooks/message-system-router/MESSAGE-ROUTER.md) - Message router class implementation
- [Message System Registry](../hooks/message-system-registry/MESSAGE-SYSTEM-REGISTRY.md) - Subsystem registry class implementation
- [Global Scheduler](../hooks/global-scheduler/GLOBAL-SCHEDULER.md) - Global scheduler class implementation
- [useMessages Hook](../hooks/messages/USE-MESSAGES.md) - Message creation functionality





