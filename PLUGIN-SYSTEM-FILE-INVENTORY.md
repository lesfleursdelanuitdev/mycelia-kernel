# Plugin System File Inventory

**Quick reference for files to extract and their destinations**

---

## Core Files (Must Extract)

### Hook System
| Source | Destination | Notes |
|--------|------------|-------|
| `src/messages/v2/hooks/create-hook.mycelia.js` | `src/core/create-hook.js` | Hook factory |
| `src/messages/v2/models/facet-manager/facet.mycelia.js` | `src/core/facet.js` | Facet class |

### Facet Manager
| Source | Destination | Notes |
|--------|------------|-------|
| `src/messages/v2/models/facet-manager/facet-manager.mycelia.js` | `src/manager/facet-manager.js` | Plugin registry |
| `src/messages/v2/models/facet-manager/facet-manager-transaction.mycelia.js` | `src/manager/facet-manager-transaction.js` | Transaction support |

### Subsystem Builder
| Source | Destination | Notes |
|--------|------------|-------|
| `src/messages/v2/models/subsystem-builder/subsystem-builder.mycelia.js` | `src/builder/subsystem-builder.js` | Build orchestrator |
| `src/messages/v2/models/subsystem-builder/dependency-graph.utils.mycelia.js` | `src/builder/dependency-graph.js` | Dependency resolution |
| `src/messages/v2/models/subsystem-builder/dependency-graph-cache.mycelia.js` | `src/builder/dependency-graph-cache.js` | Caching |
| `src/messages/v2/models/subsystem-builder/hook-processor.utils.mycelia.js` | `src/builder/hook-processor.js` | Hook execution |
| `src/messages/v2/models/subsystem-builder/facet-validator.utils.mycelia.js` | `src/builder/facet-validator.js` | Contract validation |
| `src/messages/v2/models/subsystem-builder/context-resolver.utils.mycelia.js` | `src/builder/context-resolver.js` | Context building |
| `src/messages/v2/models/subsystem-builder/subsystem-builder.utils.mycelia.js` | `src/builder/utils.js` | Builder utilities |

### System Classes
| Source | Destination | Notes |
|--------|------------|-------|
| `src/messages/v2/models/base-subsystem/base.subsystem.mycelia.js` | `src/system/base-subsystem.js` | Base class (needs modification) |
| `src/messages/v2/models/base-subsystem/base-subsystem.utils.mycelia.js` | `src/system/base-subsystem.utils.js` | Hierarchy utilities |
| `src/messages/v2/models/standalone-plugin-system/standalone-plugin-system.mycelia.js` | `src/system/standalone-plugin-system.js` | Standalone mode |

### Facet Contracts (REQUIRED - Complete System)
| Source | Destination | Notes |
|--------|------------|-------|
| `src/messages/v2/models/facet-contract/facet-contract.mycelia.js` | `src/contract/facet-contract.js` | Contract base class |
| `src/messages/v2/models/facet-contract/facet-contract-registry.mycelia.js` | `src/contract/facet-contract-registry.js` | Contract registry |
| `src/messages/v2/models/facet-contract/index.js` | `src/contract/index.js` | Default registry with all contracts |
| `src/messages/v2/models/facet-contract/hierarchy.contract.mycelia.js` | `src/contract/contracts/hierarchy.contract.js` | Generic contract |
| `src/messages/v2/models/facet-contract/listeners.contract.mycelia.js` | `src/contract/contracts/listeners.contract.js` | Generic contract |
| `src/messages/v2/models/facet-contract/processor.contract.mycelia.js` | `src/contract/contracts/processor.contract.js` | Example (Mycelia-specific) |
| `src/messages/v2/models/facet-contract/queue.contract.mycelia.js` | `src/contract/contracts/queue.contract.js` | Example (Mycelia-specific) |
| `src/messages/v2/models/facet-contract/router.contract.mycelia.js` | `src/contract/contracts/router.contract.js` | Example (Mycelia-specific) |
| `src/messages/v2/models/facet-contract/scheduler.contract.mycelia.js` | `src/contract/contracts/scheduler.contract.js` | Example (Mycelia-specific) |
| `src/messages/v2/models/facet-contract/server.contract.mycelia.js` | `src/contract/contracts/server.contract.js` | Example (Mycelia-specific) |
| `src/messages/v2/models/facet-contract/storage.contract.mycelia.js` | `src/contract/contracts/storage.contract.js` | Example (Mycelia-specific) |
| `src/messages/v2/models/facet-contract/websocket.contract.mycelia.js` | `src/contract/contracts/websocket.contract.js` | Example (Mycelia-specific) |
| `src/messages/v2/models/subsystem-builder/facet-validator.utils.mycelia.js` | `src/builder/facet-validator.js` | Contract validation integration |

### Utilities
| Source | Destination | Notes |
|--------|------------|-------|
| `src/messages/v2/utils/logger.utils.mycelia.js` | `src/utils/logger.js` | Logging |
| `src/messages/v2/utils/semver.utils.mycelia.js` | `src/utils/semver.js` | Version validation |
| `src/messages/v2/utils/debug-flag.utils.mycelia.js` | `src/utils/debug-flag.js` | Debug utilities |
| `src/messages/v2/utils/find-facet.utils.mycelia.js` | `src/utils/find-facet.js` | Facet lookup (if exists) |

### Defaults (Simplify)
| Source | Destination | Notes |
|--------|------------|-------|
| `src/messages/v2/models/defaults/default-hooks.mycelia.js` | `src/system/default-hooks.js` | Remove message-specific hooks |

---

## Test Files (Extract and Modify)

### Unit Tests
| Source | Destination | Notes |
|--------|------------|-------|
| `src/messages/v2/models/facet-manager/__tests__/*` | `tests/unit/manager/` | Modify to remove message system |
| `src/messages/v2/models/subsystem-builder/__tests__/*` | `tests/unit/builder/` | Modify to remove message system |
| `src/messages/v2/models/base-subsystem/__tests__/*` | `tests/unit/system/` | Modify to remove message system |
| `src/messages/v2/models/standalone-plugin-system/__tests__/*` | `tests/unit/system/` | Modify to remove message system |
| `src/messages/v2/models/facet-contract/__tests__/*` | `tests/unit/contract/` | ALL contract tests (facet-contract, registry, index, behavior, storage, websocket) |
| `src/messages/v2/hooks/__tests__/create-hook.*` | `tests/unit/core/` | Modify to remove message system |

---

## Documentation Files (Adapt)

| Source | Destination | Notes |
|--------|------------|-------|
| `docs/architecture/PLUGIN-SYSTEM-ANALYSIS.md` | `docs/ARCHITECTURE.md` | Remove Mycelia-specific sections |
| `src/messages/v2/docs/hooks/HOOKS.md` | `docs/HOOKS.md` | Remove message system references |
| `src/messages/v2/docs/hooks/HOOKS-AND-FACETS-OVERVIEW.md` | `docs/FACETS.md` | Remove message system references |
| `README.md` (current) | Reference for structure | Create new README for plugin system |

---

## Files to NOT Extract

### Message System (Exclude)
- `src/messages/v2/models/message-system/*`
- `src/messages/v2/models/message/*`
- `src/messages/v2/models/message-router/*`

### Security System (Exclude)
- `src/messages/v2/models/security/*`
- `src/messages/v2/models/kernel-subsystem/*`

### Storage (Exclude)
- `src/messages/v2/hooks/storage/*`
- `src/messages/v2/models/storage/*`

### Server Adapters (Exclude)
- `src/messages/v2/hooks/server/*`
- `src/messages/v2/models/server-subsystem/*`

### Router (Exclude - unless minimal example)
- `src/messages/v2/hooks/router/*`
- `src/messages/v2/models/router/*`

### Message Processing (Exclude)
- `src/messages/v2/hooks/messages/*`
- `src/messages/v2/hooks/queue/*`
- `src/messages/v2/hooks/scheduler/*`
- `src/messages/v2/hooks/message-processor/*`

### Other Mycelia-Specific (Exclude)
- `src/messages/v2/hooks/auth/*`
- `src/messages/v2/hooks/websocket/*`
- `src/messages/v2/hooks/channels/*`
- `src/messages/v2/hooks/commands/*`
- `src/messages/v2/hooks/requests/*`
- `src/messages/v2/hooks/responses/*`
- `src/messages/v2/models/profiler/*`
- `src/messages/v2/models/health/*`
- `src/messages/v2/models/result/*`

---

## Key Modifications Required

### 1. BaseSubsystem
**File:** `src/system/base-subsystem.js`

**Changes:**
- Remove `options.ms` requirement (make optional)
- Remove or no-op `accept()`, `process()`, `pause()`, `resume()`
- Simplify context: `{ config, debug, parent? }`
- Remove message system references

### 2. StandalonePluginSystem
**File:** `src/system/standalone-plugin-system.js`

**Changes:**
- Remove `useListeners` default hook (or make optional)
- Simplify constructor

### 3. Context Structure
**All files using `ctx`**

**Changes:**
```javascript
// BEFORE:
ctx = {
  ms: messageSystem,  // Remove
  config: {},
  debug: false,
  graphCache: cache,
  kernel: kernel      // Remove
}

// AFTER:
ctx = {
  config: {},
  debug: false,
  graphCache: cache,  // Keep for builder
  parent: null        // For hierarchy
}
```

### 4. All Imports
**All files**

**Changes:**
- Remove `.mycelia.js` suffix
- Update relative paths
- Remove message system imports
- Remove security imports

---

## File Count Summary

- **Core Files:** ~15 files
- **Contract Files:** ~12 files (core + all implementations)
- **Test Files:** ~25-35 files (to modify, including all contract tests)
- **Documentation:** ~5 files (to adapt)
- **New Files:** ~10 files (examples, new docs, package.json)

**Total:** ~65-75 files to handle

---

## Import Path Mapping

### Old → New Structure

```
src/messages/v2/hooks/create-hook.mycelia.js
  → src/core/create-hook.js

src/messages/v2/models/facet-manager/facet-manager.mycelia.js
  → src/manager/facet-manager.js

src/messages/v2/models/subsystem-builder/subsystem-builder.mycelia.js
  → src/builder/subsystem-builder.js

src/messages/v2/models/base-subsystem/base.subsystem.mycelia.js
  → src/system/base-subsystem.js

src/messages/v2/utils/logger.utils.mycelia.js
  → src/utils/logger.js
```

### Import Statement Updates

```javascript
// BEFORE:
import { FacetManager } from '../facet-manager/facet-manager.mycelia.js';
import { createHook } from '../../hooks/create-hook.mycelia.js';

// AFTER:
import { FacetManager } from '../manager/facet-manager.js';
import { createHook } from '../core/create-hook.js';
```

---

## Dependency Graph

```
createHook (core)
  ↓
Facet (core)
  ↓
FacetManager (manager)
  ├── FacetManagerTransaction (manager)
  └── Facet (core)
      ↓
SubsystemBuilder (builder)
  ├── DependencyGraph (builder)
  ├── DependencyGraphCache (builder)
  ├── HookProcessor (builder)
  ├── FacetValidator (builder)
  └── ContextResolver (builder)
      ↓
BaseSubsystem (system)
  ├── SubsystemBuilder (builder)
  ├── FacetManager (manager)
  └── BaseSubsystemUtils (system)
      ↓
StandalonePluginSystem (system)
  └── BaseSubsystem (system)
```

---

## Critical Dependencies to Remove

### In BaseSubsystem
- ❌ `options.ms` requirement
- ❌ `MessageSystem` references
- ❌ `accept()`, `process()` methods (or make no-ops)
- ❌ Message routing logic

### In Context
- ❌ `ctx.ms` (message system)
- ❌ `ctx.kernel` (kernel subsystem)
- ✅ Keep `ctx.config`
- ✅ Keep `ctx.debug`
- ✅ Keep `ctx.graphCache` (for builder)

### In Imports
- ❌ All `message-system` imports
- ❌ All `message` imports
- ❌ All `security` imports
- ❌ All `kernel` imports

---

## Verification Checklist

After extraction, verify:

- [ ] No `MessageSystem` references
- [ ] No `Message` class references
- [ ] No security system references
- [ ] No `.mycelia.js` suffixes
- [ ] All imports resolve correctly
- [ ] All contract files included (core + all implementations)
- [ ] Contract index.js exports all contracts
- [ ] Facet-validator integration works
- [ ] All contract tests pass
- [ ] All tests pass
- [ ] Examples work
- [ ] Documentation is complete
- [ ] Package.json is correct
- [ ] Entry points export correctly (including contracts)

---

**Last Updated:** 2025-01-27

