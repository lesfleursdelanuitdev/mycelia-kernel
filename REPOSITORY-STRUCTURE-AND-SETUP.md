# Repository Structure and Setup Guide

## What You're Saying

You want to create a **new, separate repository** for the plugin system at:

```
/apps/
├── mycelia-kernel/                    # Existing repo (stays unchanged)
│   ├── src/
│   ├── docs/
│   └── ...
│
└── mycelia-kernel-plugin-system/      # NEW repo (plugin system only)
    ├── src/
    ├── tests/
    ├── examples/
    ├── docs/
    └── ...
```

**Key Points:**
- Two separate repositories at the same level
- `mycelia-kernel` remains unchanged (full system)
- `mycelia-kernel-plugin-system` is the extracted plugin system
- They are independent - no git submodules or dependencies between them
- The plugin system can be open-sourced independently

---

## Directory Structure

### Current Structure (mycelia-kernel)
```
/apps/mycelia-kernel/
├── src/
│   └── messages/
│       └── v2/
│           ├── hooks/
│           ├── models/
│           │   ├── base-subsystem/
│           │   ├── facet-manager/
│           │   ├── facet-contract/
│           │   ├── subsystem-builder/
│           │   ├── standalone-plugin-system/
│           │   ├── message-system/        # NOT extracted
│           │   ├── security/              # NOT extracted
│           │   └── ...
│           └── utils/
└── ...
```

### New Structure (mycelia-kernel-plugin-system)
```
/apps/mycelia-kernel-plugin-system/
├── src/
│   ├── core/
│   │   ├── create-hook.js
│   │   ├── facet.js
│   │   └── index.js
│   ├── manager/
│   │   ├── facet-manager.js
│   │   ├── facet-manager-transaction.js
│   │   └── index.js
│   ├── builder/
│   │   ├── subsystem-builder.js
│   │   ├── dependency-graph.js
│   │   ├── dependency-graph-cache.js
│   │   ├── hook-processor.js
│   │   ├── facet-validator.js
│   │   ├── context-resolver.js
│   │   ├── utils.js
│   │   └── index.js
│   ├── system/
│   │   ├── base-subsystem.js
│   │   ├── base-subsystem.utils.js
│   │   ├── standalone-plugin-system.js
│   │   └── index.js
│   ├── contract/
│   │   ├── facet-contract.js
│   │   ├── facet-contract-registry.js
│   │   ├── index.js
│   │   └── contracts/
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
│   │   ├── logger.js
│   │   ├── semver.js
│   │   ├── debug-flag.js
│   │   └── find-facet.js
│   └── index.js
├── tests/
│   ├── unit/
│   │   ├── core/
│   │   ├── manager/
│   │   ├── builder/
│   │   ├── system/
│   │   └── contract/
│   ├── integration/
│   └── examples/
├── examples/
│   ├── basic/
│   ├── with-dependencies/
│   ├── lifecycle/
│   └── contracts/
├── docs/
│   ├── README.md
│   ├── API.md
│   ├── HOOKS.md
│   ├── FACETS.md
│   ├── CONTRACTS.md
│   └── ARCHITECTURE.md
├── package.json
├── README.md
└── LICENSE
```

---

## What Needs to Be Done

### Step 1: Create New Repository Directory

```bash
# Create the new directory
mkdir /apps/mycelia-kernel-plugin-system
cd /apps/mycelia-kernel-plugin-system

# Initialize git repository
git init
```

### Step 2: Copy Files (Manual Process)

You'll need to:

1. **Copy core files** from `mycelia-kernel/src/messages/v2/` to new structure
2. **Rename files** (remove `.mycelia.js` suffix)
3. **Update imports** in all files
4. **Modify code** to remove message system dependencies

**Example Copy Process:**

```bash
# Example: Copy create-hook
cp /apps/mycelia-kernel/src/messages/v2/hooks/create-hook.mycelia.js \
   /apps/mycelia-kernel-plugin-system/src/core/create-hook.js

# Example: Copy facet-manager
cp /apps/mycelia-kernel/src/messages/v2/models/facet-manager/facet-manager.mycelia.js \
   /apps/mycelia-kernel-plugin-system/src/manager/facet-manager.js
```

### Step 3: Modify Code Structure

**Example: Before (mycelia-kernel)**
```javascript
// src/messages/v2/hooks/create-hook.mycelia.js
import { isValidSemver } from '../utils/semver.utils.mycelia.js';

export function createHook({ kind, version, ... }) {
  // ...
}
```

**Example: After (mycelia-kernel-plugin-system)**
```javascript
// src/core/create-hook.js
import { isValidSemver } from '../utils/semver.js';

export function createHook({ kind, version, ... }) {
  // ...
}
```

### Step 4: Update BaseSubsystem

**Example: Before (mycelia-kernel)**
```javascript
// src/messages/v2/models/base-subsystem/base.subsystem.mycelia.js
constructor(name, options = {}) {
  if (!options.ms)
    throw new Error('BaseSubsystem: options.ms is required');
  this.messageSystem = options.ms;
  this.ctx.ms = options.ms;
}
```

**Example: After (mycelia-kernel-plugin-system)**
```javascript
// src/system/base-subsystem.js
constructor(name, options = {}) {
  // ms is optional for standalone plugin system
  this.messageSystem = options.ms || null;
  this.ctx.ms = options.ms || null;
  // Simplified context
  this.ctx.config = options.config || {};
  this.ctx.debug = !!options.debug;
}
```

### Step 5: Update Imports Throughout

**Example Import Updates:**

```javascript
// BEFORE (mycelia-kernel):
import { FacetManager } from '../facet-manager/facet-manager.mycelia.js';
import { SubsystemBuilder } from '../subsystem-builder/subsystem-builder.mycelia.js';
import { createHook } from '../../hooks/create-hook.mycelia.js';

// AFTER (mycelia-kernel-plugin-system):
import { FacetManager } from '../manager/facet-manager.js';
import { SubsystemBuilder } from '../builder/subsystem-builder.js';
import { createHook } from '../core/create-hook.js';
```

### Step 6: Create Entry Points

**Example: Main Entry Point**
```javascript
// src/index.js
export { createHook } from './core/create-hook.js';
export { Facet } from './core/facet.js';
export { FacetManager } from './manager/facet-manager.js';
export { BaseSubsystem } from './system/base-subsystem.js';
export { StandalonePluginSystem } from './system/standalone-plugin-system.js';
export { SubsystemBuilder } from './builder/subsystem-builder.js';
export { FacetContract, createFacetContract } from './contract/facet-contract.js';
export { FacetContractRegistry, defaultContractRegistry } from './contract/index.js';
```

**Example: Package Exports**
```javascript
// package.json
{
  "name": "@mycelia/plugin-system",
  "version": "1.0.0",
  "main": "./src/index.js",
  "exports": {
    ".": "./src/index.js",
    "./core": "./src/core/index.js",
    "./manager": "./src/manager/index.js",
    "./builder": "./src/builder/index.js",
    "./system": "./src/system/index.js",
    "./contract": "./src/contract/index.js",
    "./contract/contracts": "./src/contract/contracts/index.js"
  }
}
```

### Step 7: Create Examples

**Example: Basic Usage**
```javascript
// examples/basic/index.js
import { StandalonePluginSystem } from '@mycelia/plugin-system';
import { useDatabase } from './plugins/use-database.js';

const system = new StandalonePluginSystem('my-app', {
  config: {
    database: { host: 'localhost' }
  }
});

system.use(useDatabase).build();

const db = system.find('database');
await db.query('SELECT * FROM users');
```

### Step 8: Update Tests

**Example: Test File Update**
```javascript
// BEFORE (mycelia-kernel):
import { createTestMessageSystem } from '../../utils/test-utils.mycelia.js';
import { BaseSubsystem } from '../base-subsystem/base.subsystem.mycelia.js';

test('builds subsystem', async () => {
  const ms = createTestMessageSystem();
  const subsystem = new BaseSubsystem('test', { ms });
  // ...
});

// AFTER (mycelia-kernel-plugin-system):
import { BaseSubsystem } from '../system/base-subsystem.js';

test('builds subsystem', async () => {
  const subsystem = new BaseSubsystem('test', { 
    ms: null  // Optional for standalone
  });
  // ...
});
```

---

## File Mapping Examples

### Core Files

| Source (mycelia-kernel) | Destination (plugin-system) |
|------------------------|----------------------------|
| `src/messages/v2/hooks/create-hook.mycelia.js` | `src/core/create-hook.js` |
| `src/messages/v2/models/facet-manager/facet.mycelia.js` | `src/core/facet.js` |

### Manager Files

| Source | Destination |
|--------|-------------|
| `src/messages/v2/models/facet-manager/facet-manager.mycelia.js` | `src/manager/facet-manager.js` |
| `src/messages/v2/models/facet-manager/facet-manager-transaction.mycelia.js` | `src/manager/facet-manager-transaction.js` |

### Builder Files

| Source | Destination |
|--------|-------------|
| `src/messages/v2/models/subsystem-builder/subsystem-builder.mycelia.js` | `src/builder/subsystem-builder.js` |
| `src/messages/v2/models/subsystem-builder/dependency-graph.utils.mycelia.js` | `src/builder/dependency-graph.js` |
| `src/messages/v2/models/subsystem-builder/facet-validator.utils.mycelia.js` | `src/builder/facet-validator.js` |

### System Files

| Source | Destination |
|--------|-------------|
| `src/messages/v2/models/base-subsystem/base.subsystem.mycelia.js` | `src/system/base-subsystem.js` |
| `src/messages/v2/models/standalone-plugin-system/standalone-plugin-system.mycelia.js` | `src/system/standalone-plugin-system.js` |

### Contract Files

| Source | Destination |
|--------|-------------|
| `src/messages/v2/models/facet-contract/facet-contract.mycelia.js` | `src/contract/facet-contract.js` |
| `src/messages/v2/models/facet-contract/index.js` | `src/contract/index.js` |
| `src/messages/v2/models/facet-contract/hierarchy.contract.mycelia.js` | `src/contract/contracts/hierarchy.contract.js` |
| `src/messages/v2/models/facet-contract/listeners.contract.mycelia.js` | `src/contract/contracts/listeners.contract.js` |
| ... (all other contracts) | `src/contract/contracts/...` |

---

## Key Modifications Needed

### 1. Remove Message System Dependencies

**Example: BaseSubsystem Constructor**
```javascript
// BEFORE:
constructor(name, options = {}) {
  if (!options.ms)
    throw new Error('BaseSubsystem: options.ms is required');
  this.messageSystem = options.ms;
}

// AFTER:
constructor(name, options = {}) {
  // ms is optional - can be null for standalone plugin system
  this.messageSystem = options.ms || null;
}
```

### 2. Simplify Context

**Example: Context Structure**
```javascript
// BEFORE:
ctx = {
  ms: messageSystem,      // Remove
  config: {},
  debug: false,
  graphCache: cache,
  kernel: kernel          // Remove
}

// AFTER:
ctx = {
  config: {},
  debug: false,
  graphCache: cache,     // Keep for builder
  parent: null            // For hierarchy
}
```

### 3. Remove Message Processing Methods

**Example: BaseSubsystem Methods**
```javascript
// BEFORE:
async accept(message, options) { /* ... */ }
async process(timeSlice) { /* ... */ }

// AFTER:
async accept(_message, _options) {
  // No-op for standalone plugin system
}
async process(_timeSlice) {
  return null; // No-op
}
```

### 4. Update Contract Imports

**Example: Contract File Imports**
```javascript
// BEFORE:
import { createFacetContract } from './facet-contract.mycelia.js';

// AFTER:
import { createFacetContract } from '../facet-contract.js';
```

---

## Relationship Between Repos

### Independence

```
mycelia-kernel (Full System)
├── Uses plugin system internally
├── Has message system
├── Has security system
└── Has all hooks

mycelia-kernel-plugin-system (Extracted)
├── Standalone plugin system
├── No message system
├── No security system
└── Just the core plugin architecture
```

### Future Sync Strategy

**Option 1: Manual Sync**
- When plugin system improves in main repo, manually port changes
- Keep both repos independent

**Option 2: Shared Code (Advanced)**
- Could use git submodules (not recommended for this case)
- Could use npm packages (plugin system as dependency of main repo)

**Option 3: One-Way Extraction**
- Extract once, maintain separately
- Main repo continues using its own plugin system
- Plugin system repo evolves independently

---

## Summary

**What You're Creating:**
- A new repository at `/apps/mycelia-kernel-plugin-system`
- Same level as `/apps/mycelia-kernel`
- Independent, standalone plugin system
- Can be open-sourced separately

**What Needs to Happen:**
1. Create directory structure
2. Copy files from mycelia-kernel
3. Rename files (remove `.mycelia.js`)
4. Update all imports
5. Modify code to remove message system dependencies
6. Create entry points and package.json
7. Update tests
8. Create examples
9. Create documentation

**Key Changes:**
- Remove `options.ms` requirement
- Simplify context structure
- Remove message processing methods
- Update all import paths
- Keep all contract files

---

**Next Steps:**
1. Create the new directory
2. Set up basic structure
3. Start copying and modifying files
4. Test as you go
5. Create examples
6. Write documentation

