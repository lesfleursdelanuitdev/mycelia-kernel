# Changelog

All notable changes to Mycelia Kernel will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.6.8] - 2025-01-XX

### Added
- **Multiple Granters Support** - Enhanced ReaderWriterSet to support multiple users with grant permission
  - Added `addGranter()` and `removeGranter()` methods to ReaderWriterSet
  - Added `hasGranter()` and `granterCount()` introspection methods
  - Updated `canGrant()` to check granters set in addition to owner and kernel
  - Enables multiple tree owners or co-administrators to delegate permissions
  - Added comprehensive tests for multiple granters functionality
- **Permission Inheritance** - Added optional permission inheritance for hierarchical resources
  - Added `inherit` option to `canRead()`, `canWrite()`, and `canGrant()` methods in createIdentity
  - Automatically checks parent resource permissions when own permission check fails
  - Recursively traverses resource hierarchy up to root
  - Enables tree owners to automatically have permissions on all child resources
  - Added comprehensive inheritance tests covering single and multi-level hierarchies
- **JWT to PKR Integration** - Extended useTokenManager to seamlessly map JWTs to Mycelia PKRs
  - Added `getOrCreateFriendForUser()` method to auto-create Friend principals
  - Added `includePKR` option to `validateToken()` method
  - Automatically creates Friend principal for authenticated users when PKR is requested
  - Caches user-to-friend mappings for performance
  - Checks for existing Friends before creating new ones
  - Enables seamless integration of external authentication with Mycelia's security system

### Changed
- **ReaderWriterSet** - Updated to support multiple granters
  - `canGrant()` now checks granters set in addition to owner and kernel
  - `clone()`, `toRecord()`, and `toString()` now include granters
- **createIdentity** - Enhanced permission query methods
  - `canRead()`, `canWrite()`, and `canGrant()` now accept optional `options` parameter
  - Added `inherit` option for hierarchical permission checking
- **useTokenManager** - Extended token validation
  - `validateToken()` now accepts optional `options` parameter with `includePKR` flag
  - Returns PKR and Friend in validation result when `includePKR: true`

### Documentation
- Updated `CREATE-IDENTITY.md` with permission inheritance documentation and examples
- Updated `READER-WRITER-SET.md` with multiple granters documentation

## [1.6.6] - 2025-01-12

### Added
- **Comprehensive Exports** - Exported all hooks, models, and utilities from main package
  - All 46 hooks now exported (including `useCommands`, `useKernelServices`, `useProfiles`, `usePrincipals`, `useErrorClassifier`, `useBoundedErrorStore`, `useDBTransactions`, `useDBMigrations`, `useDBQueryBuilder`)
  - All server hooks exported (`useExpressServer`, `useFastifyServer`, `useHonoServer`, `useServerRoutes`)
  - All websocket hooks exported (`useWebSocketServer`)
  - All kernel subsystems exported (`ErrorManagerSubsystem`, `ChannelManagerSubsystem`, `ResponseManagerSubsystem`)
  - All security models exported (`PKR`, `ReaderWriterSet`, `PrincipalRegistry`)
  - All utility functions exported (message pooling, semver, structured logging, tracing, test contexts)
  - Total: 120+ exports available from main package
- **CLI Testing Support** - Added test utilities and test file generation to CLI
  - `mycelia-kernel generate test-utilities` - Generates mock facets, mock subsystems, and test helpers
  - `mycelia-kernel generate test <Subsystem>` - Generates test file scaffolding for subsystems
  - Includes mock facets (router, queue, logger, identity), mock subsystems, and test helpers
- **README Updates** - Enhanced documentation with proper messaging patterns
  - Added section on correct way to send messages from subsystems using `subsystem.identity.sendProtected()`
  - Clarified security benefits and why this pattern is required
  - Updated Quick Start to emphasize CLI usage

### Changed
- **README** - Updated to prominently feature CLI tools and proper messaging patterns
  - CLI tools section added early in documentation
  - Clear examples of correct vs. incorrect message sending patterns
  - Emphasis on security and proper subsystem communication

## [1.6.5] - 2025-01-12

### Added
- **Hook Creation Utilities Exports** - Exported `createHook`, `getDebugFlag`, `createLogger`, and `Facet` from main package
  - Enables external projects to create custom hooks
  - `createHook` - Factory function for creating hooks
  - `getDebugFlag` - Utility for extracting debug flags from config/context
  - `createLogger` - Utility for creating debug-aware loggers
  - `Facet` - Facet class for hook return values (ensures same instance as hook processor)
  - Improves extensibility and allows gateway projects to create project-specific hooks
  - Fixes `instanceof Facet` checks by ensuring external hooks use the same Facet class instance

## [1.6.4] - 2025-01-12

### Added
- **useExtractHandlerResult Hook** - New utility hook for extracting handler results from routing results
  - Handles nested result structures from MessageSystem router
  - Supports MessageSystem router results, accepted structures, data wrappers, and error results
  - Provides `extract()` method with configurable error handling
  - Provides `extractSafe()` convenience method for non-throwing extraction
  - Useful for HTTP gateways and API adapters that need to normalize routing results

## [1.6.3] - 2025-01-12

### Fixed
- **useSynchronous Hook** - Fixed handling of frozen meta objects
  - Now uses `updateMutable()` when available to set `processImmediately` flag
  - Gracefully handles frozen meta objects without throwing errors
  - Improves compatibility with strict message metadata implementations

### Added
- **Export useRequests Hook** - Added `useRequests` to main package exports
  - Required by `useQueries` hook for query functionality
  - Enables subsystems to use request/response patterns

## [1.6.0] - 2025-01-11

### Added
- **Production-Safe Kernel Access** - Added `getKernelForInit()` method for production-safe initialization
  - Always returns kernel instance (unlike `getKernel()` which requires debug mode)
  - Intended for initialization, setup, and configuration tasks
  - Enables profile initialization without debug mode
- **Profile Initialization Helper** - Added `initializeProfiles()` method to MessageSystem
  - Production-safe convenience method for initializing security profiles
  - Works in both production and development environments
  - Eliminates need for debug mode just to set up profiles
- **Enhanced Exports** - Added more classes to main package exports:
  - `KernelSubsystem` - Kernel subsystem class
  - `ProfileRegistrySubsystem` - Profile registry subsystem
  - `AccessControlSubsystem` - Access control subsystem
  - `SecurityProfile` - Security profile model
  - `Principal` - Principal model
- **Production Patterns Documentation** - Added comprehensive guide for production vs development patterns
  - When to use debug mode vs production-safe methods
  - Best practices for initialization
  - Migration guide from debug mode patterns

### Changed
- Improved developer experience with better exports and production-safe initialization
- Enhanced documentation for production use cases

### Migration Guide
If you're using debug mode for profile initialization, you can now use production-safe methods:

```javascript
// Before (requires debug mode)
const messageSystem = new MessageSystem('app', { debug: true });
await messageSystem.bootstrap();
const kernel = messageSystem.getKernel();
const profileRegistry = kernel.getProfileRegistry();
await profileRegistry.createProfile('user', {...});

// After (production-safe)
const messageSystem = new MessageSystem('app');
await messageSystem.bootstrap();
await messageSystem.initializeProfiles({
  'user': {...}
});
```

## [1.5.0] - 2025-01-11

### Added
- **Exported MessageSystem** - Added `MessageSystem` class to main package exports
  - Enables direct import: `import { MessageSystem } from 'mycelia-kernel'`
  - Previously required deep path imports or subpath exports
- **Exported Message** - Added `Message` class to main package exports
  - Enables direct import: `import { Message } from 'mycelia-kernel'`
  - Simplifies message creation in consuming applications

### Changed
- Improved package exports for better developer experience
- All core classes now available from main package entry point

### Migration Guide
If you were using deep imports, you can now use the main export:
```javascript
// Before
import { MessageSystem } from 'mycelia-kernel/src/messages/v2/models/message-system/message-system.v2.mycelia.js';
import { Message } from 'mycelia-kernel/src/messages/v2/models/message/message.mycelia.js';

// After
import { MessageSystem, Message } from 'mycelia-kernel';
```

## [1.4.7] - 2025-01-27

### Fixed
- Fixed server facet immutability issues in Fastify, Express, Hono, and WebSocket hooks
  - Server hooks now use closure variables instead of direct property assignment
  - Resolves "Cannot assign to read only property '_server'" errors
- Fixed use-kernel-services test mock structure to provide proper messageSystem reference
- Improved WebSocket test cleanup procedures to prevent port conflicts
- All 711 tests now passing (previously 26 failures)

### Changed
- Server facet state management now uses getters to access closure variables
- Improved test reliability with better cleanup procedures

## [1.1.0] - 2025-12-05

### ⚡ Performance Improvements

**Major Queue Performance Boost** - 16x faster queue operations!

- **Integrated CircularBuffer** - Replaced array-based queue with high-performance circular buffer
- **O(1) Dequeue** - Eliminated O(n) `Array.shift()` overhead
- **50,000+ ops/sec** - Queue performance improved from ~3,000 to 50,000+ operations per second
- **Better memory characteristics** - Predictable memory usage and improved garbage collection
- **16x faster** - Large queues (1000+ items) see dramatic speed improvements

#### Technical Details

- `BoundedQueue` now uses `CircularBuffer` internally
- Enqueue: O(1) → O(1) (same)
- Dequeue: O(n) → O(1) (**16x faster for large queues**)
- Memory: Variable → Predictable (**better for GC**)
- All 713 tests pass - fully backward compatible

#### Benchmark Results

| Queue Size | Array-based | CircularBuffer | Speedup |
|-----------|-------------|----------------|---------|
| 100 items | 3,092 ops/sec | 37,766 ops/sec | **12.21x** |
| 1,000 items | 2,996 ops/sec | 48,803 ops/sec | **16.29x** |

### 🔧 Breaking Changes

None - fully backward compatible API.

---

## [1.0.0] - 2025-12-05

### 🎉 Initial Release

#### Added
- **Message-Driven Architecture** - Pure message-based communication system
- **Hook System** - Composable plugin architecture with 30+ hooks
- **Security System** - PKR-based identity, RWS permissions, scope-based access
- **Multi-Backend Storage** - SQLite, IndexedDB, Memory adapters
- **HTTP Server Support** - Fastify, Express, Hono adapters
- **WebSocket Support** - Real-time bidirectional communication
- **Router System** - URI-based message routing with parameter extraction
- **Queue System** - Bounded queues with overflow policies
- **Observability** - Distributed tracing, structured logging, health checks
- **Performance** - Circular buffer implementation, 50k+ ops/sec
- **Testing** - 713 tests with 99.8% pass rate
- **Documentation** - 150+ documentation files

#### Technical Details
- 301 JavaScript files
- 98 test files
- 20+ design patterns implemented
- Comprehensive benchmark suite
- Production-ready code quality (9.2/10 rating)

### 🏗️ Architecture Highlights

**Core Patterns:**
- Hook Pattern for composability
- Strategy Pattern for pluggable algorithms
- Factory Pattern for object creation
- Repository Pattern for storage abstraction
- Adapter Pattern for multi-backend support

**Key Features:**
- Zero direct references between subsystems
- Path-based addressing: `subsystem://path/to/resource`
- Built-in deadlock prevention
- Automatic dependency resolution
- Hot-reload support with versioning

### 📦 Package Information

**Name:** `mycelia-kernel`  
**Version:** `1.0.0`  
**License:** MIT  
**Repository:** https://github.com/lesfleursdelanuitdev/mycelia-kernel

### 🚀 Getting Started

```bash
npm install mycelia-kernel
```

See [README.md](./README.md) for quick start guide.

---

## [Unreleased]

### Planned Features
- TypeScript support
- Additional storage adapters (PostgreSQL, MongoDB)
- GraphQL support
- Enhanced WebSocket features
- Performance optimizations
- Additional authentication strategies

---

[1.0.0]: https://github.com/lesfleursdelanuitdev/mycelia-kernel/releases/tag/v1.0.0

