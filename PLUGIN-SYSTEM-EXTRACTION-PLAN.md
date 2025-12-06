# Plugin System Extraction Plan

**Purpose:** Extract the hook-based plugin system from Mycelia Kernel into a standalone, open-source package.

**Goal:** Create a new repository containing only the plugin system, independent of message-driven architecture, security, and other Mycelia-specific features.

---

## Executive Summary

The plugin system consists of:
- **Hook Factory** (`createHook`) - Creates composable plugin factories
- **Facet System** - Plugin instances with lifecycle management
- **FacetManager** - Plugin registry with transaction support
- **SubsystemBuilder** - Dependency-aware build orchestrator
- **BaseSubsystem** - Base class for plugin containers
- **StandalonePluginSystem** - Standalone plugin system (no message processing)

**Key Features to Preserve:**
- Dependency resolution (DAG-based)
- Transaction safety (atomic installation with rollback)
- Lifecycle management (onInit/onDispose)
- Facet contracts (optional validation)
- Standalone mode

**Features to Remove:**
- Message-driven architecture
- Security system (PKR, RWS)
- Message routing
- Storage backends
- Server adapters
- Kernel subsystem
- All Mycelia-specific integrations

---

## Phase 1: Repository Setup

### 1.1 Create New Repository
- **Name:** `@mycelia/plugin-system` or `mycelia-plugin-system`
- **License:** MIT (same as current)
- **Type:** ES Module
- **Node Version:** >=18.0.0

### 1.2 Package Structure
```
mycelia-plugin-system/
├── src/
│   ├── core/
│   │   ├── create-hook.js          # Hook factory
│   │   ├── facet.js                # Facet class
│   │   └── index.js                # Core exports
│   ├── manager/
│   │   ├── facet-manager.js        # Plugin registry
│   │   ├── facet-manager-transaction.js  # Transaction support
│   │   └── index.js
│   ├── builder/
│   │   ├── subsystem-builder.js    # Build orchestrator
│   │   ├── dependency-graph.js     # Dependency resolution
│   │   ├── dependency-graph-cache.js  # Caching
│   │   ├── hook-processor.js      # Hook execution
│   │   ├── facet-validator.js     # Contract validation
│   │   ├── context-resolver.js    # Context building
│   │   └── index.js
│   ├── system/
│   │   ├── base-subsystem.js       # Base class (simplified)
│   │   ├── standalone-plugin-system.js  # Standalone mode
│   │   └── index.js
│   ├── contract/
│   │   ├── facet-contract.js       # Contract base
│   │   ├── facet-contract-registry.js  # Contract registry
│   │   ├── index.js                # Default registry with all contracts
│   │   └── contracts/              # All contract implementations
│   │       ├── hierarchy.contract.js
│   │       ├── listeners.contract.js
│   │       ├── processor.contract.js
│   │       ├── queue.contract.js
│   │       ├── router.contract.js
│   │       ├── scheduler.contract.js
│   │       ├── server.contract.js
│   │       ├── storage.contract.js
│   │       └── websocket.contract.js
│   ├── utils/
│   │   ├── logger.js               # Logging utilities
│   │   ├── semver.js               # Version validation
│   │   ├── debug-flag.js           # Debug utilities
│   │   └── find-facet.js          # Facet lookup utilities
│   └── index.js                    # Main entry point
├── examples/
│   ├── basic/
│   ├── with-dependencies/
│   ├── lifecycle/
│   └── contracts/
├── tests/
│   ├── unit/
│   ├── integration/
│   └── examples/
├── docs/
│   ├── README.md
│   ├── API.md
│   ├── HOOKS.md
│   ├── FACETS.md
│   └── EXAMPLES.md
├── package.json
├── README.md
└── LICENSE
```

---

## Phase 2: Code Extraction

### 2.1 Core Components (Must Extract)

#### 2.1.1 Hook System
**Files to Copy:**
- `src/messages/v2/hooks/create-hook.mycelia.js` → `src/core/create-hook.js`
- `src/messages/v2/models/facet-manager/facet.mycelia.js` → `src/core/facet.js`

**Modifications:**
- Remove `.mycelia.js` suffix
- Update imports to new structure
- Remove any Mycelia-specific references

#### 2.1.2 Facet Manager
**Files to Copy:**
- `src/messages/v2/models/facet-manager/facet-manager.mycelia.js` → `src/manager/facet-manager.js`
- `src/messages/v2/models/facet-manager/facet-manager-transaction.mycelia.js` → `src/manager/facet-manager-transaction.js`

**Modifications:**
- Remove message system dependencies
- Simplify context structure (remove `ms` requirement)

#### 2.1.3 Subsystem Builder
**Files to Copy:**
- `src/messages/v2/models/subsystem-builder/subsystem-builder.mycelia.js` → `src/builder/subsystem-builder.js`
- `src/messages/v2/models/subsystem-builder/dependency-graph.utils.mycelia.js` → `src/builder/dependency-graph.js`
- `src/messages/v2/models/subsystem-builder/dependency-graph-cache.mycelia.js` → `src/builder/dependency-graph-cache.js`
- `src/messages/v2/models/subsystem-builder/hook-processor.utils.mycelia.js` → `src/builder/hook-processor.js`
- `src/messages/v2/models/subsystem-builder/facet-validator.utils.mycelia.js` → `src/builder/facet-validator.js`
- `src/messages/v2/models/subsystem-builder/context-resolver.utils.mycelia.js` → `src/builder/context-resolver.js`
- `src/messages/v2/models/subsystem-builder/subsystem-builder.utils.mycelia.js` → `src/builder/utils.js`

**Modifications:**
- Remove kernel injection logic
- Simplify context to just `config` and `debug`
- Remove message system references

#### 2.1.4 Base Subsystem
**Files to Copy:**
- `src/messages/v2/models/base-subsystem/base.subsystem.mycelia.js` → `src/system/base-subsystem.js`
- `src/messages/v2/models/base-subsystem/base-subsystem.utils.mycelia.js` → `src/system/base-subsystem.utils.js`

**Modifications:**
- **CRITICAL:** Remove `options.ms` requirement (make optional or remove)
- Remove `accept()`, `process()`, `pause()`, `resume()` methods (or make them no-ops)
- Remove message system integration
- Simplify context structure
- Keep hierarchy support (optional)

#### 2.1.5 Standalone Plugin System
**Files to Copy:**
- `src/messages/v2/models/standalone-plugin-system/standalone-plugin-system.mycelia.js` → `src/system/standalone-plugin-system.js`

**Modifications:**
- Remove `useListeners` dependency (or make it optional)
- Simplify to pure plugin system

#### 2.1.6 Facet Contracts (REQUIRED - Complete System)
**Files to Copy:**
- `src/messages/v2/models/facet-contract/facet-contract.mycelia.js` → `src/contract/facet-contract.js`
- `src/messages/v2/models/facet-contract/facet-contract-registry.mycelia.js` → `src/contract/facet-contract-registry.js`
- `src/messages/v2/models/facet-contract/index.js` → `src/contract/index.js`

**All Contract Implementations (Include ALL):**
- `src/messages/v2/models/facet-contract/hierarchy.contract.mycelia.js` → `src/contract/contracts/hierarchy.contract.js`
- `src/messages/v2/models/facet-contract/listeners.contract.mycelia.js` → `src/contract/contracts/listeners.contract.js`
- `src/messages/v2/models/facet-contract/processor.contract.mycelia.js` → `src/contract/contracts/processor.contract.js` (Mycelia-specific, but keep as example)
- `src/messages/v2/models/facet-contract/queue.contract.mycelia.js` → `src/contract/contracts/queue.contract.js` (Mycelia-specific, but keep as example)
- `src/messages/v2/models/facet-contract/router.contract.mycelia.js` → `src/contract/contracts/router.contract.js` (Mycelia-specific, but keep as example)
- `src/messages/v2/models/facet-contract/scheduler.contract.mycelia.js` → `src/contract/contracts/scheduler.contract.js` (Mycelia-specific, but keep as example)
- `src/messages/v2/models/facet-contract/server.contract.mycelia.js` → `src/contract/contracts/server.contract.js` (Mycelia-specific, but keep as example)
- `src/messages/v2/models/facet-contract/storage.contract.mycelia.js` → `src/contract/contracts/storage.contract.js` (Mycelia-specific, but keep as example)
- `src/messages/v2/models/facet-contract/websocket.contract.mycelia.js` → `src/contract/contracts/websocket.contract.js` (Mycelia-specific, but keep as example)

**Contract Integration:**
- `src/messages/v2/models/subsystem-builder/facet-validator.utils.mycelia.js` → `src/builder/facet-validator.js` (uses contracts)

**Modifications:**
- Keep ALL contracts (including Mycelia-specific ones) as examples
- Update `index.js` to export all contracts
- Note which contracts are generic (hierarchy, listeners) vs examples (router, queue, etc.)
- Update imports in all contract files
- Ensure facet-validator integration works correctly

#### 2.1.7 Utilities
**Files to Copy:**
- `src/messages/v2/utils/logger.utils.mycelia.js` → `src/utils/logger.js`
- `src/messages/v2/utils/semver.utils.mycelia.js` → `src/utils/semver.js`
- `src/messages/v2/utils/debug-flag.utils.mycelia.js` → `src/utils/debug-flag.js`
- `src/messages/v2/utils/find-facet.utils.mycelia.js` → `src/utils/find-facet.js` (if exists)

**Modifications:**
- Remove Mycelia-specific logging
- Keep generic logging utilities

### 2.2 Contract Tests (REQUIRED)

**Files to Copy:**
- `src/messages/v2/models/facet-contract/__tests__/facet-contract.test.js` → `tests/unit/contract/facet-contract.test.js`
- `src/messages/v2/models/facet-contract/__tests__/facet-contract-registry.test.js` → `tests/unit/contract/facet-contract-registry.test.js`
- `src/messages/v2/models/facet-contract/__tests__/index.test.js` → `tests/unit/contract/index.test.js`
- `src/messages/v2/models/facet-contract/__tests__/contracts.behavior.test.js` → `tests/unit/contract/contracts.behavior.test.js`
- `src/messages/v2/models/facet-contract/__tests__/storage.contract.test.js` → `tests/unit/contract/storage.contract.test.js`
- `src/messages/v2/models/facet-contract/__tests__/websocket.contract.test.js` → `tests/unit/contract/websocket.contract.test.js`

**Modifications:**
- Remove message system dependencies from tests
- Update imports
- Ensure all contract tests pass

### 2.3 Default Hooks (Simplify)

**File to Modify:**
- `src/messages/v2/models/defaults/default-hooks.mycelia.js` → `src/system/default-hooks.js`

**Modifications:**
- Remove all message-specific hooks (useRouter, useQueue, useMessages, etc.)
- Keep only `FACET_KINDS` constants that are plugin-system related
- Or remove entirely if not needed for standalone system

---

## Phase 3: Code Modifications

### 3.1 Remove Message System Dependencies

**In BaseSubsystem:**
```javascript
// BEFORE:
constructor(name, options = {}) {
  if (!options.ms)
    throw new Error('BaseSubsystem: options.ms is required');
  this.messageSystem = options.ms;
  this.ctx.ms = options.ms;
}

// AFTER:
constructor(name, options = {}) {
  // ms is optional for standalone plugin system
  this.messageSystem = options.ms || null;
  this.ctx.ms = options.ms || null;
}
```

**In Context:**
```javascript
// BEFORE:
ctx = {
  ms: messageSystem,
  config: {},
  debug: false
}

// AFTER:
ctx = {
  config: {},
  debug: false,
  // Optional: parent context for hierarchy
  parent: null
}
```

### 3.2 Simplify StandalonePluginSystem

**Remove useListeners dependency:**
```javascript
// BEFORE:
this.defaults = [useListeners];

// AFTER:
this.defaults = []; // Or make it configurable
```

### 3.3 Update All Imports

**Pattern:**
- `'../../models/facet-manager/facet-manager.mycelia.js'` → `'../manager/facet-manager.js'`
- Remove `.mycelia.js` suffix throughout
- Update relative paths to new structure

### 3.4 Remove Mycelia-Specific Code

**Remove:**
- All references to `MessageSystem`
- All references to `Message`
- All security-related code
- All storage hooks
- All server hooks
- All router hooks (unless creating minimal examples)

---

## Phase 4: Testing Strategy

### 4.1 Copy Relevant Tests

**Test Files to Copy:**
- `src/messages/v2/models/facet-manager/__tests__/*` → `tests/unit/manager/`
- `src/messages/v2/models/subsystem-builder/__tests__/*` → `tests/unit/builder/`
- `src/messages/v2/models/base-subsystem/__tests__/*` → `tests/unit/system/`
- `src/messages/v2/models/standalone-plugin-system/__tests__/*` → `tests/unit/system/`
- `src/messages/v2/models/facet-contract/__tests__/*` → `tests/unit/contract/` (ALL contract tests)
- `src/messages/v2/hooks/__tests__/create-hook.*` → `tests/unit/core/`

**Modifications:**
- Remove message system setup from tests
- Remove security-related tests
- Update imports
- Simplify test contexts

### 4.2 Create New Integration Tests

**Test Scenarios:**
- Basic plugin registration
- Dependency resolution
- Lifecycle management (onInit/onDispose)
- Transaction rollback on failure
- Multiple plugins of same kind
- Contract validation
- Standalone plugin system usage

### 4.3 Example-Based Tests

**Create tests from examples:**
- `tests/examples/basic.test.js`
- `tests/examples/dependencies.test.js`
- `tests/examples/lifecycle.test.js`
- `tests/examples/contracts.test.js`

---

## Phase 5: Documentation

### 5.1 Core Documentation Files

**Files to Create/Adapt:**
- `README.md` - Main documentation
- `docs/API.md` - Complete API reference
- `docs/HOOKS.md` - Hook system guide
- `docs/FACETS.md` - Facet system guide
- `docs/EXAMPLES.md` - Usage examples
- `docs/ARCHITECTURE.md` - System architecture
- `docs/CONTRACTS.md` - Contract system guide

**Source Material:**
- `docs/architecture/PLUGIN-SYSTEM-ANALYSIS.md` → `docs/ARCHITECTURE.md`
- `src/messages/v2/docs/hooks/HOOKS.md` → `docs/HOOKS.md`
- `src/messages/v2/docs/hooks/HOOKS-AND-FACETS-OVERVIEW.md` → `docs/FACETS.md`

### 5.2 Update Documentation

**Remove References To:**
- MessageSystem
- Message-driven architecture
- Security system
- Mycelia-specific features

**Add:**
- Standalone usage examples
- Generic plugin examples
- Comparison with other plugin systems (from PLUGIN-SYSTEM-ANALYSIS.md)

---

## Phase 6: Examples

### 6.1 Basic Example
**File:** `examples/basic/index.js`
```javascript
import { StandalonePluginSystem } from '@mycelia/plugin-system';
import { useDatabase } from './plugins/use-database.js';

const system = new StandalonePluginSystem('my-app', {
  config: {
    database: { host: 'localhost' }
  }
});

system.use(useDatabase).build();

const db = system.find('database');
```

### 6.2 With Dependencies
**File:** `examples/with-dependencies/index.js`
- Show plugin with dependencies
- Demonstrate automatic resolution

### 6.3 Lifecycle
**File:** `examples/lifecycle/index.js`
- Show onInit/onDispose
- Resource management

### 6.4 Contracts
**File:** `examples/contracts/index.js`
- Show contract validation
- Custom contracts
- Using defaultContractRegistry
- Creating custom contracts
- Enforcing contracts on facets

---

## Phase 7: Package Configuration

### 7.1 package.json

```json
{
  "name": "@mycelia/plugin-system",
  "version": "1.0.0",
  "description": "A sophisticated, dependency-aware plugin system with transaction safety",
  "type": "module",
  "main": "./src/index.js",
  "exports": {
    ".": "./src/index.js",
    "./core": "./src/core/index.js",
    "./manager": "./src/manager/index.js",
    "./builder": "./src/builder/index.js",
    "./system": "./src/system/index.js",
    "./contract": "./src/contract/index.js"
  },
  "files": [
    "src/",
    "README.md",
    "LICENSE"
  ],
  "keywords": [
    "plugin-system",
    "hooks",
    "facets",
    "dependency-injection",
    "lifecycle",
    "composable"
  ],
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest watch",
    "docs": "node scripts/generate-docs.js"
  },
  "devDependencies": {
    "vitest": "^2.1.5"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
```

### 7.2 Entry Points

**src/index.js:**
```javascript
// Main exports
export { createHook } from './core/create-hook.js';
export { Facet } from './core/facet.js';
export { FacetManager } from './manager/facet-manager.js';
export { BaseSubsystem } from './system/base-subsystem.js';
export { StandalonePluginSystem } from './system/standalone-plugin-system.js';
export { SubsystemBuilder } from './builder/subsystem-builder.js';
export { FacetContract, createFacetContract } from './contract/facet-contract.js';
export { FacetContractRegistry } from './contract/facet-contract-registry.js';
export { defaultContractRegistry } from './contract/index.js';
// Export all contracts (users can pick and choose)
export * from './contract/contracts/index.js';
```

---

## Phase 8: Migration Checklist

### 8.1 Code Extraction
- [ ] Copy core files (createHook, Facet)
- [ ] Copy manager files (FacetManager, Transaction)
- [ ] Copy builder files (SubsystemBuilder, utilities, facet-validator)
- [ ] Copy system files (BaseSubsystem, StandalonePluginSystem)
- [ ] Copy ALL contract files (core + all implementations)
- [ ] Copy contract index.js with default registry
- [ ] Copy utility files

### 8.2 Code Modifications
- [ ] Remove message system dependencies
- [ ] Remove security dependencies
- [ ] Simplify BaseSubsystem constructor
- [ ] Update all imports
- [ ] Remove `.mycelia.js` suffixes
- [ ] Simplify context structure
- [ ] Remove Mycelia-specific code

### 8.3 Testing
- [ ] Copy relevant unit tests
- [ ] Copy ALL contract tests
- [ ] Modify tests to remove dependencies
- [ ] Create integration tests
- [ ] Create example-based tests
- [ ] Ensure all tests pass (including contract tests)

### 8.4 Documentation
- [ ] Create README.md
- [ ] Create API documentation
- [ ] Create usage guides
- [ ] Create examples
- [ ] Remove Mycelia-specific references
- [ ] Add comparison with other systems

### 8.5 Examples
- [ ] Create basic example
- [ ] Create dependency example
- [ ] Create lifecycle example
- [ ] Create contract example
- [ ] Ensure examples work

### 8.6 Package Setup
- [ ] Create package.json
- [ ] Set up entry points
- [ ] Configure exports
- [ ] Set up build (if needed)
- [ ] Set up testing
- [ ] Set up linting

### 8.7 Final Checks
- [ ] All imports resolve correctly
- [ ] All tests pass
- [ ] Examples work
- [ ] Documentation is complete
- [ ] No Mycelia-specific code remains
- [ ] License and attribution correct

---

## Phase 9: Naming and Branding

### 9.1 Package Name Options
- `@mycelia/plugin-system` (scoped, recommended)
- `mycelia-plugin-system` (unscoped)
- `@mycelia/hooks` (alternative)
- `plugin-system-core` (generic)

### 9.2 Repository Name
- `mycelia-plugin-system`
- `plugin-system` (if generic enough)

### 9.3 Documentation Branding
- Keep "Mycelia" in attribution
- Make it clear this is the plugin system extracted from Mycelia Kernel
- Add link back to main Mycelia Kernel project

---

## Phase 10: Release Strategy

### 10.1 Versioning
- Start at `1.0.0` (mature system)
- Follow semantic versioning
- Document breaking changes

### 10.2 Initial Release
- Complete extraction
- All tests passing
- Documentation complete
- Examples working
- README with clear getting started

### 10.3 Future Maintenance
- Keep in sync with improvements to plugin system in main repo
- Consider if changes should be backported
- Document relationship between repos

---

## Dependencies Analysis

### Internal Dependencies (Keep)
- FacetManager → Facet
- SubsystemBuilder → FacetManager, DependencyGraph
- BaseSubsystem → SubsystemBuilder, FacetManager
- StandalonePluginSystem → BaseSubsystem

### External Dependencies (Remove)
- MessageSystem (not needed)
- Message class (not needed)
- Security system (not needed)
- Storage backends (not needed)
- Server adapters (not needed)

### Utility Dependencies (Keep/Simplify)
- Logger utilities (keep, simplify)
- Semver utilities (keep)
- Debug utilities (keep)
- Find facet utilities (keep if exists)

---

## Risk Assessment

### High Risk
- **BaseSubsystem dependencies:** May have hidden dependencies on message system
- **Context structure:** Changing context may break existing hooks
- **Test coverage:** Need to ensure all critical paths are tested

### Medium Risk
- **Import paths:** Many files to update
- **Documentation:** Need to ensure no Mycelia-specific references remain
- **Examples:** Need to create meaningful standalone examples

### Low Risk
- **Core hook/facet system:** Well-isolated
- **FacetManager:** Independent of message system
- **SubsystemBuilder:** Can work standalone

---

## Timeline Estimate

- **Phase 1-2 (Setup & Extraction):** 2-3 days
- **Phase 3 (Modifications):** 3-4 days
- **Phase 4 (Testing):** 2-3 days
- **Phase 5 (Documentation):** 2-3 days
- **Phase 6 (Examples):** 1-2 days
- **Phase 7-8 (Package & Migration):** 1-2 days
- **Phase 9-10 (Branding & Release):** 1 day

**Total:** ~12-18 days of focused work

---

## Success Criteria

✅ **Code Quality:**
- All tests pass
- No Mycelia-specific dependencies
- Clean, well-documented code
- Examples work out of the box

✅ **Documentation:**
- Complete API reference
- Clear getting started guide
- Usage examples
- Architecture explanation

✅ **Independence:**
- Can be used without Mycelia Kernel
- No hidden dependencies
- Clear separation of concerns

✅ **Usability:**
- Easy to understand
- Good developer experience
- Helpful error messages
- Type definitions (if TypeScript support added)

---

## Notes

- Keep original Mycelia Kernel repo unchanged
- New repo should be completely independent
- Consider adding TypeScript definitions in future
- May want to add plugin discovery/loading features
- Consider adding plugin versioning support
- Could add plugin marketplace/registry concept later

---

**Document Version:** 1.0  
**Created:** 2025-01-27  
**Status:** Planning Phase

