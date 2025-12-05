# Mycelia Kernel v2 Documentation

## What is Mycelia Kernel?

Mycelia Kernel is a flexible, composable architecture framework for building message-driven systems. It provides a foundation for creating modular, extensible applications with built-in support for plugin systems, security, messaging, and more.

**Key Philosophy:** Mycelia Kernel is designed as a collection of independent, composable parts that can be used together or separately, depending on your needs. You don't need to use everything—pick and choose the components that fit your use case.

### Independent Components

Mycelia Kernel offers several parts that can be used independently:

1. **A Plugin System** - Hooks, facets, BaseSubsystem, Standalone Plugin System, Builder and build tools
   - Extensible plugin architecture with hooks and facets
   - BaseSubsystem as the core building block
   - Standalone plugin system for non-message-driven applications
   - Builder system with dependency resolution and contract validation

2. **A Security System** - Identity, access control, principals, and permissions
   - Public Key Record (PKR) based identity
   - Principal management and registry
   - Fine-grained access control with ReaderWriterSet
   - Identity wrappers for permission-checked access

3. **A Message Object** - Structured message class for inter-subsystem communication
   - Message class with path-based routing
   - Message metadata and factory
   - Support for commands, queries, and events
   - Message validation and serialization

4. **A Message System** - Central coordinator for message-driven architecture
   - Message routing between subsystems
   - Subsystem registry and management
   - Global scheduling for time allocation
   - Kernel subsystem for system-level operations

5. **An Event Listener** - Event/listener system via the useListeners hook
   - Event emission and subscription
   - Listener management with policies
   - Event routing and filtering
   - Integration with message processing

6. **A Hierarchy** - Parent-child subsystem relationships
   - Hierarchical subsystem structure
   - Child subsystem registry
   - Traversal and query capabilities
   - Lifecycle management for child subsystems

7. **Statistics** - Statistics tracking via the useStatistics hook
   - Event counting and tracking
   - Performance metrics
   - Custom statistic definitions
   - Statistics aggregation and reporting

8. **A Router** - Route registration and matching via the useRouter hook
   - Pattern-based route matching
   - Route caching for performance
   - Route registration and unregistration
   - Integration with message processing

Each component can be used independently or combined to create a full message-driven system. See the [Standalone Plugin System](./STANDALONE-PLUGIN-SYSTEM.md) documentation for examples of using components without the full MessageSystem.

## Table of Contents

### 🏛️ Architecture Rationale

- [Hooks and Facets Rationale](./HOOKS-AND-FACETS-RATIONALE.md) - Design decisions and rationale for the hooks and facets architecture
- [Facet Contracts Rationale](./FACET-CONTRACTS-RATIONALE.md) - Design decisions and rationale for the facet contracts system
- [Message System Rationale](./MESSAGE-SYSTEM-RATIONALE.md) - Design decisions and rationale for the message-driven architecture
- [Routing Grammar Rationale](./ROUTING-GRAMMAR-RATIONALE.md) - Design decisions and rationale for the routing grammar and resource pattern

### 🏗️ Core Concepts

- [Base Subsystem](./BASE-SUBSYSTEM.md) - Core building block for all subsystems
- [Kernel Subsystem](./KERNEL-SUBSYSTEM.md) - Root kernel subsystem for system-level operations
- [Message System](./message/MESSAGE-SYSTEM.md) - Central coordinator for message-driven architecture
- [Configuration System](./configuration/CONFIGURATION-SYSTEM.md) - Optional centralized configuration system
- [Configuration Examples](./configuration/CONFIGURATION-EXAMPLES.md) - Complete configuration examples
- [Standalone Plugin System](./STANDALONE-PLUGIN-SYSTEM.md) - Using BaseSubsystem as a standalone plugin system

### 🧪 Testing

- [Testing Utilities](./testing/TESTING-UTILITIES.md) - Test utilities for subsystems, messages, and PKRs
- [Testing Guide](./testing/TESTING-GUIDE.md) - Comprehensive testing guide
- [Test Examples](./testing/TEST-EXAMPLES.md) - Complete test examples

### 💬 Subsystem Communication

- [Communication Types Supported](./communication/COMMUNICATION-TYPES-SUPPORTED.md) - Overview of all communication patterns
- [sendProtected](./communication/SEND-PROTECTED.md) - Secure messaging mechanism used by all communication types
- [Commands](./communication/COMMANDS.md) - Asynchronous command execution with channel-based replies
- [Queries](./communication/QUERIES.md) - Synchronous read-only data retrieval
- [Events](./communication/EVENTS.md) - One-to-many event broadcasting and subscription
- [Requests](./communication/REQUESTS.md) - Request/response foundation and how queries/commands use it
- [Responses](./communication/RESPONSES.md) - Response handling and ResponseManagerSubsystem integration
- [Channels](./communication/CHANNELS.md) - Channel-based communication for commands and requests
- [When to Use What](./communication/WHEN-TO-USE-WHAT.md) - Decision guide for choosing communication patterns

### 🔧 Kernel Subsystems

- [Channel Manager Subsystem](./models/kernel-subsystem/channel-manager-subsystem/CHANNEL-MANAGER-SUBSYSTEM.md) - Kernel subsystem for managing communication channels
- [Channel Class](./models/kernel-subsystem/channel-manager-subsystem/CHANNEL.md) - Channel class for multi-party communication
- [Response Manager Subsystem](./models/kernel-subsystem/response-manager-subsystem/RESPONSE-MANAGER-SUBSYSTEM.md) - Kernel subsystem for tracking response-required commands
- [Pending Response Class](./models/kernel-subsystem/response-manager-subsystem/PENDING-RESPONSE.md) - Internal class for tracking pending responses

### 🌐 Server Subsystems

- [ServerSubsystem](./models/server-subsystem/SERVER-SUBSYSTEM.md) - HTTP server subsystem with Fastify/Express/Hono support
- [Web Server Adapters](./models/server-subsystem/WEB-SERVER-ADAPTERS.md) - Available web server adapters (Fastify, Express, Hono) and how to use them

### 💾 Database Subsystems

- [DBSubsystem](./models/db-subsystem/DB-SUBSYSTEM.md) - Message-driven database abstraction layer with SQLite/IndexedDB/Memory support

### 🔨 Builder

- [Builder Overview](./BUILDER-OVERVIEW.md) - High-level overview of the build system
- [How Builder Works](./HOW-BUILDER-WORKS.md) - Detailed explanation of the build process
- [Build Diagrams](./BUILD-DIAGRAMS.md) - Visual representations of the build process
- [Subsystem Builder](./SUBSYSTEM-BUILDER.md) - Orchestrates the subsystem build process
- [Subsystem Build Utils](./SUBSYSTEM-BUILD-UTILS.md) - Two-phase build system utilities
- [Dependency Graph Cache](./DEPENDENCY-GRAPH-CACHE.md) - LRU cache for dependency graph results

### 📨 Messages

- [Messages Overview](./message/MESSAGES-OVERVIEW.md) - High-level overview of the message system
- [Message System](./message/MESSAGE-SYSTEM.md) - Central coordinator for message-driven architecture
- [Message](./message/MESSAGE.md) - Message class for inter-subsystem communication
- [Message Factory](./message/MESSAGE-FACTORY.md) - Centralized factory for creating messages
- [Message Metadata](./message/MESSAGE-METADATA.md) - Message metadata with fixed and mutable data
- [Message Metadata Utils](./message/MESSAGE-METADATA-UTILS.md) - Utilities for building message metadata

### 🛣️ Routing

- [Route Handlers](./routing/ROUTE-HANDLERS.md) - Route handler function signature and options
- [Route Metadata](./routing/ROUTE-METADATA.md) - Route metadata including permission requirements

### 🪝 Hooks and Facets

- [Hooks and Facets Overview](./hooks/HOOKS-AND-FACETS-OVERVIEW.md) - High-level overview of hooks and facets
- [Hooks](./hooks/HOOKS.md) - Understanding hooks and how they work
- [Facets](./hooks/FACETS.md) - Facet objects and their lifecycle
- [Facet Manager](./hooks/FACET-MANAGER.md) - How facets are managed
- [Facet Manager Transaction](./hooks/FACET-MANAGER-TRANSACTION.md) - Transactional facet operations
- [Facet Init Callback](./hooks/FACET-INIT-CALLBACK.md) - Facet initialization interface
- [Default Hooks](./DEFAULT-HOOKS.md) - Pre-configured hook sets

### 📋 Facet Contracts

- [Facet Contracts Overview](./FACET-CONTRACTS-OVERVIEW.md) - High-level overview of the facet contract system
- [Facet Contracts and Adapters](./FACET-CONTRACTS-AND-ADAPTERS.md) - Understanding adapters as contract implementations
- [Facet Contract Enforcement](./FACET-CONTRACT-ENFORCEMENT.md) - How contracts are enforced during the build process
- [Facet Contract](./FACET-CONTRACT.md) - Creating and using facet contracts for validation
- [Facet Contract Registry](./FACET-CONTRACT-REGISTRY.md) - Managing and enforcing contracts through the registry
- [Default Contracts](./DEFAULT-CONTRACTS.md) - Documentation for all default facet contracts
- [Server Contract](./models/facet-contract/SERVER-CONTRACT.md) - HTTP server contract interface

### 📥 Hook Function Parameters

- [Hook Function Context](./hooks/HOOK-FUNCTION-CONTEXT.md) - The `ctx` parameter
- [Hook Function API Parameter](./hooks/HOOK-FUNCTION-API-PARAM.md) - The `api` parameter
- [Hook Function Subsystem Parameter](./hooks/HOOK-FUNCTION-SUBSYSTEM-PARAM.md) - The `subsystem` parameter

### 🔒 Security System

- [Security System Overview](./security/README.md) - Identity and access control framework
- [Public Key Record (PKR)](./security/PUBLIC-KEY-RECORD.md) - Immutable identity references
- [Principal](./security/PRINCIPAL.md) - Internal entity representation
- [Principal Registry](./security/PRINCIPAL-REGISTRY.md) - Centralized principal management
- [Access Control Subsystem](./security/ACCESS-CONTROL-SUBSYSTEM.md) - Kernel subsystem for identity and access control
- [ReaderWriterSet](./security/READER-WRITER-SET.md) - Fine-grained access control
- [createIdentity](./security/CREATE-IDENTITY.md) - Identity wrapper factory
- [createFriendIdentity](./security/CREATE-FRIEND-IDENTITY.md) - Friend identity factory
- [Friend](./security/FRIEND.md) - Trusted peer representation
- [Resource](./security/RESOURCE.md) - Managed object representation

### ⚠️ Errors

- [Error Record](./errors/ERROR-RECORD.md) - Normalized error record with metadata
- [Bounded Error Store](./errors/BOUNDED-ERROR-STORE.md) - Fixed-capacity in-memory error store
- [Error Manager Subsystem](./errors/ERROR-MANAGER-SUBSYSTEM.md) - Kernel subsystem for error management

### 🛠️ Utilities

- [Debug Flag Utilities](./DEBUG-FLAG-UTILS.md) - Standardized debug flag extraction
- [Logger Utilities](./LOGGER-UTILS.md) - Logging abstraction for testability
- [Find Facet Utilities](./FIND-FACET-UTILS.md) - Safe facet lookup from FacetManager

### 📊 Observability

- [Distributed Tracing](./observability/TRACING.md) - End-to-end request tracing with trace IDs
- [Structured Logging](./observability/STRUCTURED-LOGGING.md) - JSON-formatted logs with trace IDs and correlation IDs
- [Health Checks](./observability/HEALTH-CHECKS.md) - System and subsystem health monitoring with readiness/liveness endpoints

### 📊 Visual Documentation

- [Diagrams](./DIAGRAMS.md) - Visual representations of system architecture

---

### 📚 Hook Documentation

---

#### Listeners Hook

- [useListeners](./hooks/listeners/USE-LISTENERS.md) - Listener management functionality
- [ListenerManager](./hooks/listeners/LISTENER-MANAGER.md) - Core listener management class
- [Listener Manager Policies](./hooks/listeners/LISTENER-MANAGER-POLICIES.md) - Pluggable registration policies
- [Listeners Configuration](./hooks/listeners/CONFIG.md) - Configuration options and values

#### Hierarchy Hook

- [useHierarchy](./hooks/hierarchy/USE-HIERARCHY.md) - Child subsystem management
- [ChildSubsystemRegistry](./hooks/hierarchy/CHILD-SUBSYSTEM-REGISTRY.md) - Child subsystem registry implementation

#### Messages Hook

- [useMessages](./hooks/messages/USE-MESSAGES.md) - Message creation functionality

#### Requests Hook

- [useRequests](./hooks/requests/USE-REQUESTS.md) - Request/response functionality with fluent API
- [RequestBuilder](./hooks/requests/REQUEST-BUILDER.md) - Request builder class for chaining requests
- [Request Core](./hooks/requests/REQUEST-CORE.md) - Core request/response implementation

#### Message Processor Hook

- [useMessageProcessor](./hooks/message-processor/USE-MESSAGE-PROCESSOR.md) - Core message processing functionality
- [processMessage](./hooks/message-processor/PROCESS-MESSAGE.md) - Message processing utility
- [acceptMessage](./hooks/message-processor/ACCEPT-MESSAGE.md) - Message acceptance utility

#### Queries Hook

- [useQueries](./hooks/queries/USE-QUERIES.md) - Query handler functionality
- [QueryHandlerManager](./hooks/queries/QUERY-HANDLER-MANAGER.md) - Query handler management
- [BaseQueryHandler](./hooks/queries/BASE-QUERY-HANDLER.md) - Base class for query handlers

#### Commands Hook

- [useCommands](./hooks/commands/USE-COMMANDS.md) - Command execution functionality with channel-based replies

#### Queue Hook

- [useQueue](./hooks/queue/USE-QUEUE.md) - Queue management functionality
- [SubsystemQueueManager](./hooks/queue/SUBSYSTEM-QUEUE-MANAGER.md) - Queue manager implementation
- [BoundedQueue](./hooks/queue/BOUNDED-QUEUE.md) - Bounded queue with overflow policies

#### Router Hook

- [useRouter](./hooks/router/USE-ROUTER.md) - Route registration and matching
- [SubsystemRouter](./hooks/router/SUBSYSTEM-ROUTER.md) - Router implementation
- [RouteEntry](./hooks/router/ROUTE-ENTRY.md) - Individual route representation
- [RouteCache](./hooks/router/ROUTE-CACHE.md) - LRU cache for route matches

#### Message System Router Hook

- [useMessageSystemRouter](./hooks/message-system-router/USE-MESSAGE-SYSTEM-ROUTER.md) - Message routing to subsystems based on paths
- [MessageRouter](./hooks/message-system-router/MESSAGE-ROUTER.md) - Message router class implementation

#### Message System Registry Hook

- [useMessageSystemRegistry](./hooks/message-system-registry/USE-MESSAGE-SYSTEM-REGISTRY.md) - Subsystem registry management
- [MessageSystemRegistry](./hooks/message-system-registry/MESSAGE-SYSTEM-REGISTRY.md) - Subsystem registry class implementation

#### Global Scheduler Hook

- [useGlobalScheduler](./hooks/global-scheduler/USE-GLOBAL-SCHEDULER.md) - Global scheduling functionality for MessageSystem
- [GlobalScheduler](./hooks/global-scheduler/GLOBAL-SCHEDULER.md) - Global scheduler class implementation
- [Global Scheduling Strategies](./hooks/global-scheduler/GLOBAL-SCHEDULING-STRATEGIES.md) - Pluggable global scheduling strategies

#### Scheduler Hook

- [useScheduler](./hooks/scheduler/USE-SCHEDULER.md) - Message scheduling functionality
- [SubsystemScheduler](./hooks/scheduler/SUBSYSTEM-SCHEDULER.md) - Scheduler implementation
- [Message Scheduling Strategies](./hooks/scheduler/MESSAGE-SCHEDULING-STRATEGIES.md) - Pluggable scheduling strategies

#### Statistics Hook

- [useStatistics](./hooks/statistics/USE-STATISTICS.md) - Statistics tracking functionality
- [SubsystemStatistics](./hooks/statistics/SUBSYSTEM-STATISTICS.md) - Statistics implementation

#### Health Check Hook

- [useHealthCheck](./hooks/health/USE-HEALTH-CHECK.md) - Health check functionality
- [HealthStatus](./models/health/HEALTH-STATUS.md) - Health status model

#### Synchronous Hook

- [useSynchronous](./hooks/synchronous/USE-SYNCHRONOUS.md) - Immediate (synchronous) message processing functionality

#### Principals Hook

- [usePrincipals](./hooks/principals/USE-PRINCIPALS.md) - Principal registry functionality

#### Error Classifier Hook

- [useErrorClassifier](./hooks/error-classifier/USE-ERROR-CLASSIFIER.md) - Error classification and normalization functionality

#### Bounded Error Store Hook

- [useBoundedErrorStore](./hooks/bounded-error-store/USE-BOUNDED-ERROR-STORE.md) - Bounded error store functionality

#### Kernel Services Hook

- [useKernelServices](./hooks/kernel-services/USE-KERNEL-SERVICES.md) - Kernel child subsystem installation

#### Channels Hook

- [useChannels](./hooks/channels/USE-CHANNELS.md) - Channel management functionality

#### Responses Hook

- [useResponses](./hooks/responses/USE-RESPONSES.md) - Response sending functionality

#### Server Hooks

- [useFastifyServer](./hooks/server/USE-FASTIFY-SERVER.md) - HTTP server functionality using Fastify
- [useExpressServer](./hooks/server/USE-EXPRESS-SERVER.md) - HTTP server functionality using Express
- useHonoServer - HTTP server functionality using Hono (see [Web Server Adapters](./models/server-subsystem/WEB-SERVER-ADAPTERS.md) for usage)
- [useServerRoutes](./hooks/server-routes/USE-SERVER-ROUTES.md) - Helper hook for registering routes on ServerSubsystem

---

## Quick Start

1. Start with [Base Subsystem](./BASE-SUBSYSTEM.md) to understand the core architecture
2. Read [Hooks](./hooks/HOOKS.md) to learn how to extend functionality
3. Check [Default Hooks](./DEFAULT-HOOKS.md) for pre-configured hook sets
4. See [Standalone Plugin System](./STANDALONE-PLUGIN-SYSTEM.md) if you want to use the system without the full MessageSystem

---

## Documentation Structure

### Core Documentation
Core classes and utilities that form the foundation of the system.

### Hooks and Facets
Documentation for the hook-based extension system, including how to create and use hooks and facets.

### Hook Function Parameters
Detailed documentation for the parameters passed to hook functions (`ctx`, `api`, `subsystem`).

### Hook Documentation
Comprehensive documentation for each hook and its related classes, including usage patterns, configuration options, and best practices. Organized by hook category (Listeners, Hierarchy, Message Processor, Queries, Queue, Router, Scheduler, Statistics, Principals).

### Security System
Complete documentation for the identity and access control framework, including PKR-based identity, principal management, and fine-grained permissions through ReaderWriterSet.

### Utilities
Helper utilities for common tasks like debug flag extraction and logging.

### Visual Documentation
Diagrams and visual representations to help understand the architecture.

