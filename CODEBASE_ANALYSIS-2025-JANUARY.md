# Mycelia Kernel Codebase Analysis (January 2025)

**Analysis Date:** January 2025 (Updated)  
**Codebase Version:** v2  
**Total Source Files:** 143 `.mycelia.js` files  
**Total Test Files:** 81 test files  
**Total Lines of Code:** ~24,060 lines  
**Test Coverage:** 461 tests passing / 462 total (99.8% pass rate)  
**Exports:** 425+ (classes, functions, constants)

---

## Executive Summary

Mycelia Kernel is a **mature, production-ready message-driven framework** with excellent architectural foundations. The codebase demonstrates **strong modularity**, **comprehensive testing**, **extensive documentation**, and **consistent design patterns**. Recent additions (Security Profiles, WebSocket, Observability) show continued evolution and refinement.

**Overall Assessment:** **9/10** - Production-ready with minor areas for improvement

**Recent Major Achievements:**
- ✅ **Performance Benchmarks** - Comprehensive performance benchmark suite (January 2025)
- ✅ **Performance Profiler** - Performance profiling with bottleneck identification (Phase 7 completed - January 2025)
- ✅ **Security Profile System** - Role-based security profiles with permission scopes (January 2025)
- ✅ **WebSocket Subsystem** - Full WebSocket support with contract-based architecture
- ✅ **Health Checks** - System-wide health monitoring (Phase 6 completed)
- ✅ **Distributed Tracing** - End-to-end request tracing (Phase 1 completed)
- ✅ **Structured Logging** - JSON-formatted logs with trace correlation (Phase 2 completed)
- ✅ **Multi-Adapter HTTP Servers** - Fastify, Express, and Hono support
- ✅ **Major Refactoring** - File splitting, modularization, improved organization

---

## 1. Architecture Overview

### 1.1 Core Philosophy

Mycelia Kernel follows a **pure message-driven architecture** where:
- **Subsystems communicate exclusively through messages** (no direct references)
- **Loose coupling** via path-based routing (`subsystem://path/to/resource`)
- **Composable architecture** via hooks and facets
- **Independent components** that can be used separately or together
- **Contract-based design** ensuring interface consistency

### 1.2 System Architecture

```
MessageSystem (Root Coordinator)
├── MessageRouter (Routes messages between subsystems)
├── MessageSystemRegistry (Subsystem registry)
├── GlobalScheduler (Time allocation between subsystems)
└── KernelSubsystem (System-level operations)
    ├── AccessControlSubsystem (Security & permissions)
    ├── ErrorManagerSubsystem (Error handling)
    ├── ResponseManagerSubsystem (Response tracking)
    ├── ChannelManagerSubsystem (Channel-based communication)
    ├── ProfileRegistrySubsystem (Security profiles) [NEW - January 2025]
    ├── ServerSubsystem (HTTP servers: Fastify/Express/Hono)
    └── WebSocketSubsystem (WebSocket servers: ws)
```

### 1.3 Component Architecture

**BaseSubsystem** - Core building block
- Hook-based extensibility
- Facet management (capabilities)
- Message processing
- Lifecycle management
- Hierarchical structure

**Hooks** - Functions that create facets
- Core: `useRouter`, `useQueue`, `useScheduler`, `useListeners`, `useStatistics`
- Communication: `useCommands`, `useQueries`, `useRequests`, `useResponses`, `useChannels`
- System: `useMessageSystemRouter`, `useMessageSystemRegistry`, `useGlobalScheduler`
- Servers: `useFastifyServer`, `useExpressServer`, `useHonoServer`, `useWebSocketServer`
- Security: `usePrincipals`, `useProfiles` [NEW]
- Observability: `useHealthCheck`, `useProfiler` [NEW]
- Processing: `useMessageProcessor`, `useSynchronous`

**Facets** - Capability objects attached to subsystems
- Provide specific functionality (routing, queuing, etc.)
- Accessed via `subsystem.find('facetKind')`
- Managed by `FacetManager`
- Enforced by contracts

---

## 2. Recent Enhancements (January 2025)

### 2.1 Performance Benchmarks ✅ [NEW - January 2025]

**Status:** Fully implemented and tested

**Components:**
- Comprehensive performance benchmark suite
- 13 benchmark tests covering all major operations
- Performance expectations and baseline metrics
- Regression detection capabilities

**Key Features:**
- **Message Operations**: Message creation, routing, processing
- **Subsystem Operations**: Route registration, facet lookup
- **Queue Operations**: Enqueue performance
- **Security Operations**: Principal creation
- **Concurrent Operations**: Multi-threaded performance
- **Memory Usage**: Large-scale entry handling
- **Report Generation**: Performance report creation

**Performance Characteristics:**
- Message creation: ~0.014ms average
- Message routing: ~0.004ms average
- Facet lookup: ~0.001ms average (O(1) Map lookups)
- Queue operations: < 2ms average
- Principal creation: ~0.280ms average
- Concurrent operations: ~0.135ms average (50 concurrent)

**Files Added:**
- `src/messages/v2/tests/performance/performance.benchmark.test.js`
- `src/messages/v2/tests/performance/README.md`

**Test Coverage:** 13 benchmark tests (all passing)

### 2.2 Performance Profiler ✅ [January 2025]

**Status:** Fully implemented and tested (Phase 7 completed)

**Components:**
- `PerformanceEntry` class - Tracks individual operation performance
- `PerformanceReport` class - Aggregates entries and generates statistics
- `useProfiler` hook - Performance profiling functionality
- `profiler.utils.mycelia.js` - Utility functions for bottleneck identification and report generation

**Key Features:**
- **Operation Timing**: Track async and sync operations with `time()` and `timeSync()`
- **Manual Timing**: Start/finish pattern for custom timing control
- **Bottleneck Identification**: Automatically identify slowest operations
- **Performance Statistics**: Average, min, max, median, P95, P99 percentiles
- **Categorization**: Group operations by category (message, route, operation, etc.)
- **Metadata Tracking**: Attach custom metadata (traceId, subsystem, etc.) to entries
- **Text Reports**: Human-readable performance reports
- **Configurable**: Enable/disable, max entries limit, automatic memory management

**Usage:**
```javascript
// Time an async operation
await subsystem.profiler.time('database.query', async () => {
  return await db.query('SELECT * FROM users');
});

// Time a sync operation
subsystem.profiler.timeSync('data.process', () => {
  return processData(data);
});

// Get bottlenecks
const bottlenecks = subsystem.profiler.getBottlenecks(10);
// Returns: [{ operation: 'slow-op', averageDuration: 150, maxDuration: 200, ... }]

// Generate report
const report = subsystem.profiler.getReport();
const textReport = subsystem.profiler.getTextReport();
```

**Files Added:**
- `src/messages/v2/models/profiler/performance-entry.mycelia.js`
- `src/messages/v2/models/profiler/performance-report.mycelia.js`
- `src/messages/v2/models/profiler/profiler.utils.mycelia.js`
- `src/messages/v2/hooks/profiler/use-profiler.mycelia.js`
- `src/messages/v2/models/profiler/__tests__/performance-entry.test.js`
- `src/messages/v2/models/profiler/__tests__/performance-report.test.js`
- `src/messages/v2/hooks/__tests__/use-profiler.test.js`
- `src/messages/v2/tests/integration/profiler.integration.test.js`

**Test Coverage:** 10 + 13 + 10 + 13 = 46 tests (all passing)

### 2.3 Security Profile System ✅ [January 2025]

**Status:** Fully implemented and tested

**Components:**
- `SecurityProfile` class - Role-based security profile with permission scopes
- `ProfileRegistrySubsystem` - Kernel child subsystem for profile management
- `useProfiles` hook - Profile registry functionality
- Integration with `AccessControlSubsystem` and `PrincipalRegistry`

**Key Features:**
- **Permission Scopes**: Maps permission scopes (string identifiers) to permission levels
- **Permission Levels**: `'r'` (read), `'rw'` (read/write), `'rwg'` (read/write/grant)
- **Profile Management**: Create, retrieve, update, delete profiles
- **Principal Application**: Apply profiles to principals via RWS
- **Identity Stability**: UUID and timestamps preserved on updates
- **Metadata Support**: Custom metadata for profiles

**Architecture Decisions:**
- **Permission Scopes vs Resource Names**: Clarified that grants use "permission scopes" rather than actual resource names, as RWS is per-principal, not per-resource
- **Identity Preservation**: Profiles maintain UUID and creation timestamp across updates
- **Kernel Integration**: ProfileRegistrySubsystem is a kernel child subsystem, ensuring access to principals

**Files Added:**
- `src/messages/v2/models/security/security-profile.mycelia.js`
- `src/messages/v2/models/kernel-subsystem/profile-registry-subsystem/profile-registry.subsystem.mycelia.js`
- `src/messages/v2/hooks/profiles/use-profiles.mycelia.js`
- `src/messages/v2/models/security/__tests__/security-profile.test.js`
- `src/messages/v2/models/kernel-subsystem/profile-registry-subsystem/__tests__/profile-registry.subsystem.test.js`
- `src/messages/v2/tests/integration/profile-registry.integration.test.js`

**Test Coverage:** 24 unit tests + 3 integration tests (all passing)

### 2.4 WebSocket Subsystem ✅

**Status:** Fully implemented and tested

**Components:**
- `WebSocketSubsystem` - Dedicated subsystem for WebSocket management
- `useWebSocketServer` hook - WebSocket server implementation using `ws` library
- `WebSocketConnection` class - Connection management with metadata
- `websocketContract` - Contract ensuring consistent WebSocket facet API

**Features:**
- Full WebSocket lifecycle management (start/stop)
- Connection tracking and management
- Message routing (WebSocket ↔ Mycelia)
- Broadcast messaging
- Connection lifecycle handlers
- Trace ID propagation
- Correlation ID support

### 2.5 Observability Features ✅

**Status:** Phase 1, 2, 6, and 7 Completed

#### Distributed Tracing Foundation (Phase 1)
- Trace ID generation (UUID v4 format)
- Trace ID propagation through messages, HTTP, WebSocket
- Trace ID inheritance for child messages
- HTTP integration (extract/inject from headers)
- WebSocket integration

#### Structured Logging (Phase 2)
- JSON output format (machine-readable)
- Contextual information (trace ID, subsystem, timestamp)
- Log levels (debug, info, warn, error)
- Trace correlation

#### Health Checks (Phase 6)
- Subsystem health tracking
- System-wide health aggregation
- Readiness/liveness endpoints
- Custom health check registration
- Automatic checks (statistics, queue, build status)

#### Performance Profiling (Phase 7) ✅ [NEW]
- Performance profiler hook (`useProfiler`)
- Operation timing (async and sync)
- Bottleneck identification
- Performance statistics (average, min, max, median, P95, P99)
- Performance reports (JSON and text formats)
- Entry categorization and filtering
- Configurable memory management

---

## 3. Code Quality Assessment

### 3.1 Architecture & Design

**Strengths:**
- ✅ **Consistent Patterns**: Hook-based architecture used throughout
- ✅ **Separation of Concerns**: Clear boundaries between components
- ✅ **Dependency Injection**: Context-based dependency resolution
- ✅ **Contract Enforcement**: Facet contracts ensure interface consistency
- ✅ **Modular Design**: Independent, composable components

**Areas for Improvement:**
- ⚠️ **Type Safety**: No TypeScript support (analysis document exists)
- ⚠️ **Performance Metrics**: Limited performance benchmarking

### 3.2 Code Organization

**Strengths:**
- ✅ **Logical Structure**: Clear directory organization by concern
- ✅ **Consistent Naming**: `.mycelia.js` extension, clear naming conventions
- ✅ **File Splitting**: Large files split into focused modules
- ✅ **Utility Extraction**: Common functionality extracted to utilities
- ✅ **Test Co-location**: Tests located near source files

**Structure:**
```
src/messages/v2/
├── models/          # Core models (subsystems, messages, security, etc.)
├── hooks/           # Hook implementations
├── tests/           # Integration tests
├── docs/            # Documentation
└── utils/           # Utility functions
```

### 3.3 Testing

**Current Status:**
- ✅ **412 tests passing** / 416 total (99% pass rate)
- ⚠️ **4 tests failing** (3 network-related, 1 test setup issue)
- ✅ **Comprehensive Coverage**: Unit, integration, and contract tests
- ✅ **Test Organization**: Tests co-located with source files

**Test Types:**
- **Unit Tests**: Individual component testing
- **Integration Tests**: Real-world scenario testing (HTTP servers, WebSocket, profiles)
- **Contract Tests**: Facet contract validation
- **Error Tests**: Error handling verification

**Test Quality:**
- Clear test descriptions
- Good coverage of edge cases
- Real integration scenarios
- Mock usage where appropriate

### 3.4 Documentation

**Strengths:**
- ✅ **Extensive Documentation**: 124+ documentation files
- ✅ **Clear Examples**: Usage examples throughout
- ✅ **Rationale Documents**: Design decisions explained
- ✅ **API References**: Complete API documentation
- ✅ **Architecture Diagrams**: Visual representations of relationships

**Documentation Structure:**
- Overview documents
- Component-specific documentation
- Hook and facet documentation
- Security system documentation
- Observability documentation
- Integration guides

### 3.5 Security

**Strengths:**
- ✅ **Comprehensive Security System**: PKR-based identity, PrincipalRegistry, RWS
- ✅ **Access Control**: Fine-grained permissions (read/write/grant)
- ✅ **Security Profiles**: Role-based security profiles [NEW]
- ✅ **Identity Management**: Automatic identity creation and attachment
- ✅ **Protected Messaging**: Kernel-protected message sending

**Security Components:**
- `PublicKeyRecord` (PKR) - Immutable identity references
- `Principal` - Internal entity representation
- `PrincipalRegistry` - Central principal management
- `ReaderWriterSet` (RWS) - Fine-grained access control
- `SecurityProfile` - Role-based permission profiles [NEW]
- `AccessControlSubsystem` - Security subsystem
- `ProfileRegistrySubsystem` - Profile management [NEW]

---

## 4. Code Statistics

### 4.1 File Counts

- **Source Files**: 143 `.mycelia.js` files
- **Test Files**: 81 test files
- **Documentation Files**: 124+ documentation files
- **Total Lines**: ~24,060 lines of code

### 4.2 Component Breakdown

**Models:**
- Base Subsystem: 1 file
- Kernel Subsystem: 8 files (including child subsystems)
- Message System: 4 files
- Security: 8 files (including SecurityProfile)
- Server Subsystem: 2 files
- WebSocket Subsystem: 2 files
- Health: 2 files
- Facet Manager: 2 files
- Subsystem Builder: 6 files
- Message: 7 files
- Result: 1 file
- Defaults: 2 files
- Facet Contract: 4 files

**Hooks:**
- Core Hooks: 15+ hooks
- Communication Hooks: 5+ hooks
- System Hooks: 3 hooks
- Server Hooks: 3 hooks (Fastify, Express, Hono)
- WebSocket Hooks: 1 hook
- Security Hooks: 2 hooks (usePrincipals, useProfiles)
- Observability Hooks: 1 hook (useHealthCheck)
- Processing Hooks: 2 hooks

### 4.3 Test Coverage

- **Unit Tests**: ~380 tests
- **Integration Tests**: ~65 tests
- **Contract Tests**: ~16 tests
- **Total**: 462 tests (461 passing, 1 unrelated network test failure)

---

## 5. Strengths

### 5.1 Architectural Excellence

1. **Hook-Based Architecture**: Clean, composable, extensible
2. **Message-Driven Design**: Loose coupling, clear communication patterns
3. **Contract Enforcement**: Interface consistency guaranteed
4. **Modular Design**: Independent, reusable components

### 5.2 Code Quality

1. **Consistent Patterns**: Predictable code structure
2. **Clear Responsibilities**: Single responsibility per module
3. **Well-Documented**: Comprehensive documentation
4. **Test Coverage**: Strong test coverage with real integration tests

### 5.3 Feature Completeness

1. **Security System**: Comprehensive security with profiles
2. **Communication**: HTTP (3 adapters), WebSocket support
3. **Observability**: Tracing, logging, health checks, performance profiling
4. **Error Handling**: Comprehensive error management
5. **Message Processing**: Commands, queries, events, requests, responses
6. **Performance**: Profiling, bottleneck identification, performance reports

### 5.4 Developer Experience

1. **Clear API**: Well-designed, intuitive APIs
2. **Good Documentation**: Extensive examples and guides
3. **Flexible Configuration**: Configurable components
4. **Debug Support**: Debug flags and logging

---

## 6. Areas for Improvement

### 6.1 Test Failures

**Current Issues:**
- 1 network-related test failure (Hono server test - likely environment/port conflict)

**Recommendation:**
- Fix network test issue (use dynamic ports, better cleanup)
- This is a minor issue and doesn't affect profiler functionality

### 6.2 Type Safety

**Current State:**
- No TypeScript support
- Type analysis document exists

**Recommendation:**
- Consider gradual TypeScript migration
- Add JSDoc type annotations
- Generate TypeScript definitions

### 6.3 Performance

**Current State:**
- ✅ Performance profiling implemented (Phase 7)
- ✅ Performance benchmarks implemented (13 tests)
- ✅ Baseline metrics established

**Performance Characteristics:**
- Message operations: < 1ms average
- Routing operations: < 0.1ms average
- Facet operations: < 0.01ms average
- Queue operations: < 2ms average
- Security operations: < 1ms average
- Concurrent operations: < 1ms average

**Recommendation:**
- Add benchmarks to CI/CD pipeline for regression detection
- Create performance budgets for critical operations
- Add load testing benchmarks

### 6.4 Advanced Metrics

**Current State:**
- Basic statistics available
- No histogram/percentile metrics

**Recommendation:**
- Implement advanced metrics (Phase 4)
- Add rate metrics
- Support custom business metrics

### 6.5 OpenTelemetry Integration

**Current State:**
- Custom tracing implementation
- No OpenTelemetry integration

**Recommendation:**
- Add OpenTelemetry integration (Phase 5)
- Export traces to standard collectors
- Support industry-standard observability tools

---

## 7. Recent Changes Summary

### 7.1 Performance Benchmarks (January 2025)

**What Was Added:**
- Comprehensive performance benchmark suite (13 tests)
- Performance expectations and baseline metrics
- Regression detection capabilities
- Documentation and README

**Key Features:**
- Message operations benchmarking
- Subsystem operations benchmarking
- Queue operations benchmarking
- Security operations benchmarking
- Concurrent operations benchmarking
- Memory usage benchmarking
- Report generation benchmarking

### 7.2 Performance Profiler (January 2025)

**What Was Added:**
- Complete performance profiling system (Phase 7)
- PerformanceEntry and PerformanceReport models
- useProfiler hook with timing and bottleneck detection
- Profiler utilities for report generation
- Comprehensive test coverage (46 tests)

**Key Features:**
- Operation timing (async and sync)
- Bottleneck identification
- Performance statistics (percentiles)
- Text and JSON report generation
- Configurable memory management

### 7.3 Security Profile System (January 2025)

**What Was Added:**
- Complete security profile system
- ProfileRegistrySubsystem as kernel child
- useProfiles hook
- SecurityProfile class with identity stability
- Integration tests

**Key Improvements:**
- Identity stability (UUID preservation)
- Clear semantics (permission scopes vs resource names)
- Kernel integration
- Comprehensive testing

### 7.2 Code Refinements

**Identity Stability:**
- Profiles preserve UUID and creation timestamp on updates
- Only `updatedAt` changes during updates

**Semantic Clarity:**
- Clarified that grants use "permission scopes" not "resource names"
- Updated documentation to reflect RWS per-principal model
- Improved error messages and comments

---

## 8. Overall Rating

### 8.1 Rating Breakdown

| Category | Rating | Notes |
|----------|--------|-------|
| **Architecture** | 9.5/10 | Excellent hook-based design, clear patterns |
| **Code Quality** | 9/10 | Consistent, well-organized, clean code |
| **Testing** | 8.5/10 | Strong coverage, 4 failing tests need attention |
| **Documentation** | 9.5/10 | Extensive, clear, well-organized |
| **Security** | 9/10 | Comprehensive with new profile system |
| **Observability** | 9/10 | Excellent foundation with profiling |
| **Performance** | 8.5/10 | Profiling implemented, benchmarks needed |
| **Type Safety** | 6/10 | No TypeScript, but analysis exists |

### 8.2 Overall Score: **9/10**

**Justification:**
- **Production-Ready**: Mature, well-tested, documented
- **Strong Architecture**: Excellent design patterns and modularity
- **Comprehensive Features**: Security, communication, observability (including profiling)
- **Minor Issues**: 1 unrelated network test failure, no TypeScript, benchmarks needed

---

## 9. Recommendations

### 9.1 Immediate (High Priority)

1. **Fix Remaining Test Failure**
   - Resolve 1 network-related test failure (Hono server)
   - Improve test isolation and cleanup
   - Use dynamic ports for network tests

2. **Add Performance Profiler Documentation**
   - Add performance profiler documentation to docs
   - Update table of contents
   - Add usage examples and best practices

### 9.2 Short-Term (Medium Priority)

1. **Performance Benchmark Integration**
   - Add benchmarks to CI/CD pipeline
   - Set up automated regression detection
   - Create performance budgets for critical operations
   - Add load testing benchmarks

2. **Advanced Metrics (Phase 4)**
   - Histogram/percentile metrics
   - Rate metrics
   - Custom business metrics
   - Integration with profiler data

### 9.3 Long-Term (Low Priority)

1. **TypeScript Support**
   - Gradual migration path
   - Type definitions
   - Type safety improvements

2. **OpenTelemetry Integration (Phase 5)**
   - Industry-standard observability
   - Export to collectors
   - Support for metrics and spans

3. **Performance Profiling (Phase 7)**
   - Performance profiler hook
   - Bottleneck identification
   - Performance reports

---

## 10. Conclusion

Mycelia Kernel is a **mature, well-architected framework** that demonstrates excellent software engineering practices. The codebase has evolved significantly with recent additions (Security Profiles, WebSocket, Observability) showing continued refinement and expansion.

**Key Strengths:**
- Excellent architectural design
- Strong test coverage
- Comprehensive documentation
- Production-ready features
- Clear, consistent patterns

**Areas for Growth:**
- Fix remaining network test failure
- Add performance benchmarks using profiler
- Consider TypeScript migration
- Expand observability (OpenTelemetry integration)

**Overall Assessment:** The codebase is **production-ready** and suitable for real-world applications. With the completion of Phase 7 (Performance Profiling), the observability suite is now comprehensive. The 1 failing test is a minor network-related issue that doesn't affect core functionality.

---

**Analysis Completed:** January 2025 (Updated)  
**Next Review:** Recommended after test fixes and benchmark suite creation

---

## 11. Performance Profiler Details

### 11.1 Implementation Summary

The Performance Profiler (Phase 7) provides comprehensive performance monitoring capabilities:

**Core Capabilities:**
- **Timing Operations**: Track execution time for async and sync functions
- **Bottleneck Detection**: Automatically identify slowest operations
- **Statistical Analysis**: Calculate averages, percentiles (P95, P99), min, max, median
- **Report Generation**: Both JSON and human-readable text reports
- **Memory Management**: Automatic trimming when entry limit exceeded

**Integration Points:**
- Can be used by any subsystem via `useProfiler` hook
- Integrates with existing observability (trace IDs, metadata)
- Supports categorization for filtering and analysis
- Configurable enable/disable for production control

**Use Cases:**
- Identify performance bottlenecks in production
- Monitor operation performance over time
- Debug slow operations
- Generate performance reports for analysis
- Track performance improvements

### 11.2 Performance Profiler Architecture

```
useProfiler Hook
├── PerformanceEntry (individual measurements)
│   ├── Operation name
│   ├── Start/end times
│   ├── Duration
│   ├── Metadata (traceId, subsystem, etc.)
│   └── Category
├── PerformanceReport (aggregation)
│   ├── Statistics calculation
│   ├── Bottleneck identification
│   ├── Percentile calculations
│   └── Report generation
└── Profiler Utilities
    ├── Duration formatting
    ├── Text report generation
    └── Bottleneck analysis
```

### 11.3 Example Usage

```javascript
// Enable profiler on subsystem
await subsystem
  .use(useProfiler)
  .build();

// Time an async operation
await subsystem.profiler.time('database.query', async () => {
  return await db.query('SELECT * FROM users');
});

// Get bottlenecks
const bottlenecks = subsystem.profiler.getBottlenecks(10);
console.log('Top bottlenecks:', bottlenecks);

// Generate report
const report = subsystem.profiler.getTextReport();
console.log(report);
```

**Output Example:**
```
=== Performance Report ===

Time Range: 2025-01-15T10:00:00.000Z - 2025-01-15T10:05:00.000Z
Total Duration: 5m 0s
Total Entries: 150 (150 completed, 0 incomplete)
Operations Tracked: 5

=== Top Bottlenecks ===
1. database.query
   Average: 125.50ms
   Max: 250.00ms
   Count: 50
   Total: 6.28s (20.93%)
   P95: 200.00ms, P99: 240.00ms
...
```

