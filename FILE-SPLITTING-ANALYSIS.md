# File Splitting Analysis

**Analysis Date:** November 29, 2025  
**Purpose:** Identify files that would benefit from being split into smaller, more focused modules

---

## Summary

This document identifies **10 files** that would benefit from splitting, ranging from **390 to 925 lines**. The analysis includes:
- Current file size and responsibilities
- Proposed splitting strategy
- Benefits of splitting
- Priority level

---

## High Priority Files (Should Split)

### 1. `listener-manager.mycelia.js` - **925 lines** 🔴 **CRITICAL**

**Location:** `src/messages/v2/hooks/listeners/listener-manager.mycelia.js`

**Current Responsibilities:**
- Listener registration (on, off, once)
- Pattern matching for listeners
- Handler group management (onSuccess, onFailure, onTimeout)
- Policy management (multiple, single, etc.)
- Statistics tracking
- Notification dispatching
- Path pattern compilation and matching

**Proposed Split:**

```
listener-manager/
├── listener-manager.mycelia.js          # Main class (200 lines)
├── listener-registry.mycelia.js          # Listener storage and lookup (150 lines)
├── pattern-matcher.mycelia.js           # Pattern compilation and matching (200 lines)
├── handler-group-manager.mycelia.js      # Handler group management (150 lines)
├── listener-policies.mycelia.js         # Policy enforcement (already exists, may need expansion)
└── listener-statistics.mycelia.js       # Statistics tracking (75 lines)
```

**Benefits:**
- ✅ Single Responsibility Principle
- ✅ Easier testing of individual components
- ✅ Better code organization
- ✅ Reduced cognitive load

**Priority:** **HIGH** - This is the largest file and handles multiple distinct responsibilities

---

### 2. `kernel.subsystem.mycelia.js` - **506 lines** 🟠 **HIGH**

**Location:** `src/messages/v2/models/kernel-subsystem/kernel.subsystem.mycelia.js`

**Current Responsibilities:**
- Kernel subsystem initialization
- Child subsystem getters (getAccessControl, getErrorManager, etc.)
- Subsystem registration with access control
- Protected message sending
- Channel access control
- Response management
- Wrapper object creation

**Proposed Split:**

```
kernel-subsystem/
├── kernel.subsystem.mycelia.js          # Main class (150 lines)
├── kernel-child-accessors.mycelia.js    # Child subsystem getters (100 lines)
├── kernel-registration.mycelia.js       # registerSubsystem logic (150 lines)
├── kernel-protected-messaging.mycelia.js # sendProtected logic (100 lines)
└── kernel-wrapper.mycelia.js            # Wrapper object creation (100 lines)
```

**Benefits:**
- ✅ Clearer separation of concerns
- ✅ Easier to test individual features
- ✅ Better maintainability
- ✅ Reduced file complexity

**Priority:** **HIGH** - Core system file with multiple responsibilities

---

### 3. `subsystem-builder.utils.mycelia.js` - **479 lines** 🟠 **HIGH**

**Location:** `src/messages/v2/models/subsystem-builder/subsystem-builder.utils.mycelia.js`

**Current Responsibilities:**
- Context resolution (resolveCtx)
- Dependency graph caching
- Hook verification (verifySubsystemBuild)
- Facet validation
- Subsystem building (buildSubsystem)
- Topological sorting
- Deep merge utilities

**Proposed Split:**

```
subsystem-builder/
├── subsystem-builder.utils.mycelia.js   # Main exports (50 lines)
├── context-resolver.mycelia.js          # Context resolution (75 lines)
├── hook-verifier.mycelia.js             # Hook verification (150 lines)
├── facet-validator.mycelia.js           # Facet validation (100 lines)
├── subsystem-builder-core.mycelia.js    # buildSubsystem logic (100 lines)
└── dependency-sorter.mycelia.js         # Topological sorting (50 lines)
```

**Benefits:**
- ✅ Better testability
- ✅ Clearer responsibilities
- ✅ Easier to understand build process
- ✅ Reusable utilities

**Priority:** **HIGH** - Critical build system component

---

## Medium Priority Files (Should Consider Splitting)

### 4. `response-manager.subsystem.mycelia.js` - **428 lines** 🟡 **MEDIUM**

**Location:** `src/messages/v2/models/kernel-subsystem/response-manager-subsystem/response-manager.subsystem.mycelia.js`

**Current Responsibilities:**
- Pending response tracking
- Response timeout handling
- Response matching (correlation ID)
- Response cleanup
- Statistics tracking

**Proposed Split:**

```
response-manager-subsystem/
├── response-manager.subsystem.mycelia.js # Main class (150 lines)
├── pending-response-store.mycelia.js     # Response storage (100 lines)
├── response-matcher.mycelia.js          # Correlation ID matching (100 lines)
└── response-timeout-handler.mycelia.js  # Timeout management (78 lines)
```

**Priority:** **MEDIUM** - Well-organized but could benefit from splitting

---

### 5. `use-hono-server.mycelia.js` - **424 lines** 🟡 **MEDIUM**

**Location:** `src/messages/v2/hooks/server/use-hono-server.mycelia.js`

**Current Responsibilities:**
- Hook factory function
- Server lifecycle (start, stop)
- Route registration (get, post, put, delete, all)
- Mycelia route registration
- Error handling
- Middleware support

**Note:** Similar structure to `use-express-server.mycelia.js` (411 lines) and `use-fastify-server.mycelia.js` (392 lines)

**Proposed Split:**

```
server/
├── use-hono-server.mycelia.js           # Hook factory (150 lines)
├── hono-server-lifecycle.mycelia.js     # Start/stop logic (100 lines)
├── hono-route-registry.mycelia.js       # Route registration (100 lines)
└── hono-mycelia-integration.mycelia.js  # Mycelia route handling (74 lines)
```

**Benefits:**
- ✅ Consistent pattern across all three server adapters
- ✅ Easier to maintain
- ✅ Better testability

**Priority:** **MEDIUM** - Consider splitting all three server adapters together for consistency

---

### 6. `subsystem-scheduler.mycelia.js` - **418 lines** 🟡 **MEDIUM**

**Location:** `src/messages/v2/hooks/scheduler/subsystem-scheduler.mycelia.js`

**Current Responsibilities:**
- Time slice management
- Message queue processing
- Scheduling strategies
- Statistics tracking
- Pause/resume functionality

**Proposed Split:**

```
scheduler/
├── subsystem-scheduler.mycelia.js        # Main class (150 lines)
├── time-slice-manager.mycelia.js        # Time slice logic (100 lines)
├── scheduler-strategies.mycelia.js      # Strategy implementations (100 lines)
└── scheduler-statistics.mycelia.js      # Statistics tracking (68 lines)
```

**Priority:** **MEDIUM** - Well-organized but could be more modular

---

### 7. `message.mycelia.js` - **413 lines** 🟡 **MEDIUM**

**Location:** `src/messages/v2/models/message/message.mycelia.js`

**Current Responsibilities:**
- Message construction
- Path validation and parsing
- Metadata access
- Body access
- Serialization
- Subsystem extraction
- Utility methods

**Proposed Split:**

```
message/
├── message.mycelia.js                   # Main class (150 lines)
├── message-path-utils.mycelia.js        # Path parsing and validation (100 lines)
├── message-serialization.mycelia.js     # Serialization logic (100 lines)
└── message-utilities.mycelia.js         # Utility methods (63 lines)
```

**Priority:** **MEDIUM** - Core class but could be more modular

---

### 8. `use-express-server.mycelia.js` - **411 lines** 🟡 **MEDIUM**

**Location:** `src/messages/v2/hooks/server/use-express-server.mycelia.js`

**Similar to `use-hono-server.mycelia.js`** - same splitting strategy applies.

**Priority:** **MEDIUM** - Split together with other server adapters for consistency

---

### 9. `use-fastify-server.mycelia.js` - **392 lines** 🟡 **MEDIUM**

**Location:** `src/messages/v2/hooks/server/use-fastify-server.mycelia.js`

**Similar to `use-hono-server.mycelia.js`** - same splitting strategy applies.

**Priority:** **MEDIUM** - Split together with other server adapters for consistency

---

### 10. `global-scheduler.mycelia.js` - **390 lines** 🟡 **MEDIUM**

**Location:** `src/messages/v2/models/message-system/global-scheduler.mycelia.js`

**Current Responsibilities:**
- Global scheduling coordination
- Strategy management
- Time slice allocation
- Statistics tracking
- Subsystem registration for scheduling

**Proposed Split:**

```
message-system/
├── global-scheduler.mycelia.js          # Main class (150 lines)
├── scheduling-strategies.mycelia.js     # Strategy implementations (100 lines)
├── time-allocation.mycelia.js          # Time slice allocation (100 lines)
└── scheduler-coordination.mycelia.js    # Coordination logic (40 lines)
```

**Priority:** **MEDIUM** - Well-organized but could benefit from splitting

---

## Splitting Strategy Recommendations

### 1. Extract Utilities First

For files with utility functions mixed with core logic:
- Extract pure utility functions to separate files
- Keep core class logic in main file
- Example: `message-path-utils.mycelia.js`, `context-resolver.mycelia.js`

### 2. Extract Strategy/Policy Patterns

For files with pluggable strategies or policies:
- Extract strategy implementations
- Keep strategy registry in main file
- Example: `listener-policies.mycelia.js`, `scheduling-strategies.mycelia.js`

### 3. Extract Storage/Registry Logic

For files managing state or registries:
- Extract storage/registry classes
- Keep coordination logic in main file
- Example: `listener-registry.mycelia.js`, `pending-response-store.mycelia.js`

### 4. Extract Lifecycle Management

For files with complex lifecycle:
- Extract lifecycle methods
- Keep main class focused on coordination
- Example: `server-lifecycle.mycelia.js`, `scheduler-lifecycle.mycelia.js`

---

## Implementation Priority

### Phase 1: Critical Files (Do First)
1. ✅ `listener-manager.mycelia.js` (925 lines) - **HIGHEST PRIORITY**
2. ✅ `kernel.subsystem.mycelia.js` (506 lines)
3. ✅ `subsystem-builder.utils.mycelia.js` (479 lines)

### Phase 2: Server Adapters (Do Together)
4. ✅ `use-hono-server.mycelia.js` (424 lines)
5. ✅ `use-express-server.mycelia.js` (411 lines)
6. ✅ `use-fastify-server.mycelia.js` (392 lines)

### Phase 3: Remaining Files
7. ✅ `response-manager.subsystem.mycelia.js` (428 lines)
8. ✅ `subsystem-scheduler.mycelia.js` (418 lines)
9. ✅ `message.mycelia.js` (413 lines)
10. ✅ `global-scheduler.mycelia.js` (390 lines)

---

## Benefits of Splitting

### 1. Improved Maintainability
- Smaller files are easier to understand
- Changes are localized to specific files
- Reduced merge conflicts

### 2. Better Testability
- Individual components can be tested in isolation
- Mock dependencies more easily
- Clearer test organization

### 3. Enhanced Readability
- Clearer file purposes
- Easier to find specific functionality
- Reduced cognitive load

### 4. Better Code Organization
- Logical grouping of related functionality
- Easier navigation
- Clearer module boundaries

### 5. Reusability
- Extracted utilities can be reused
- Components can be used independently
- Better separation of concerns

---

## Risks and Considerations

### 1. Import Complexity
- **Risk:** More files = more imports
- **Mitigation:** Use index files for clean exports
- **Example:** `listener-manager/index.js` exports all components

### 2. Circular Dependencies
- **Risk:** Splitting may create circular dependencies
- **Mitigation:** Careful dependency analysis before splitting
- **Solution:** Use dependency injection where needed

### 3. Breaking Changes
- **Risk:** Splitting may break existing code
- **Mitigation:** Maintain backward compatibility with re-exports
- **Solution:** Gradual migration with deprecation warnings

### 4. Testing Overhead
- **Risk:** More files = more test files
- **Mitigation:** Tests should be easier to write and maintain
- **Solution:** Focused unit tests for each component

---

## Example: ListenerManager Split

### Before (925 lines)
```javascript
// listener-manager.mycelia.js - 925 lines
export class ListenerManager {
  // Registration logic
  // Pattern matching
  // Handler groups
  // Policies
  // Statistics
  // Notification
  // ... 900+ more lines
}
```

### After (Split)
```javascript
// listener-manager.mycelia.js - 200 lines
import { ListenerRegistry } from './listener-registry.mycelia.js';
import { PatternMatcher } from './pattern-matcher.mycelia.js';
import { HandlerGroupManager } from './handler-group-manager.mycelia.js';

export class ListenerManager {
  constructor(options) {
    this.registry = new ListenerRegistry(options);
    this.patternMatcher = new PatternMatcher(options);
    this.handlerGroups = new HandlerGroupManager(options);
  }
  // Coordination logic only
}

// listener-registry.mycelia.js - 150 lines
export class ListenerRegistry {
  // Storage and lookup logic
}

// pattern-matcher.mycelia.js - 200 lines
export class PatternMatcher {
  // Pattern compilation and matching
}

// handler-group-manager.mycelia.js - 150 lines
export class HandlerGroupManager {
  // Handler group management
}
```

---

## Conclusion

**10 files** have been identified as candidates for splitting, with **3 high-priority files** that should be addressed first:

1. **listener-manager.mycelia.js** (925 lines) - **CRITICAL**
2. **kernel.subsystem.mycelia.js** (506 lines) - **HIGH**
3. **subsystem-builder.utils.mycelia.js** (479 lines) - **HIGH**

Splitting these files will improve:
- ✅ Maintainability
- ✅ Testability
- ✅ Readability
- ✅ Code organization
- ✅ Reusability

**Recommended Approach:**
1. Start with `listener-manager.mycelia.js` (biggest impact)
2. Then split `kernel.subsystem.mycelia.js` (core system)
3. Then split `subsystem-builder.utils.mycelia.js` (build system)
4. Finally, split server adapters together for consistency

---

**Analysis Completed:** November 29, 2025

