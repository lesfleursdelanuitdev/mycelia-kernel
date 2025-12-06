# Facet Contracts Extraction Summary

**Status:** REQUIRED - Complete System Must Be Extracted

---

## Overview

The Facet Contract system is a **complete, standalone validation system** that ensures facets implement expected interfaces. **ALL contract-related code must be extracted**, including both generic contracts and Mycelia-specific examples.

---

## Complete File List

### Core Contract Infrastructure (REQUIRED)

| File | Destination | Purpose |
|------|-------------|---------|
| `facet-contract.mycelia.js` | `src/contract/facet-contract.js` | Base `FacetContract` class and `createFacetContract` factory |
| `facet-contract-registry.mycelia.js` | `src/contract/facet-contract-registry.js` | `FacetContractRegistry` class for managing contracts |
| `index.js` | `src/contract/index.js` | Default registry with all contracts pre-registered |

### All Contract Implementations (REQUIRED - Keep ALL)

| File | Destination | Type | Notes |
|------|-------------|------|-------|
| `hierarchy.contract.mycelia.js` | `src/contract/contracts/hierarchy.contract.js` | Generic | Plugin-system related |
| `listeners.contract.mycelia.js` | `src/contract/contracts/listeners.contract.js` | Generic | Plugin-system related |
| `processor.contract.mycelia.js` | `src/contract/contracts/processor.contract.js` | Example | Mycelia-specific, keep as example |
| `queue.contract.mycelia.js` | `src/contract/contracts/queue.contract.js` | Example | Mycelia-specific, keep as example |
| `router.contract.mycelia.js` | `src/contract/contracts/router.contract.js` | Example | Mycelia-specific, keep as example |
| `scheduler.contract.mycelia.js` | `src/contract/contracts/scheduler.contract.js` | Example | Mycelia-specific, keep as example |
| `server.contract.mycelia.js` | `src/contract/contracts/server.contract.js` | Example | Mycelia-specific, keep as example |
| `storage.contract.mycelia.js` | `src/contract/contracts/storage.contract.js` | Example | Mycelia-specific, keep as example |
| `websocket.contract.mycelia.js` | `src/contract/contracts/websocket.contract.js` | Example | Mycelia-specific, keep as example |

### Contract Integration (REQUIRED)

| File | Destination | Purpose |
|------|-------------|---------|
| `facet-validator.utils.mycelia.js` | `src/builder/facet-validator.js` | Validates facets against contracts during build |

### Contract Tests (REQUIRED - ALL)

| File | Destination | Purpose |
|------|-------------|---------|
| `__tests__/facet-contract.test.js` | `tests/unit/contract/facet-contract.test.js` | Tests for base contract class |
| `__tests__/facet-contract-registry.test.js` | `tests/unit/contract/facet-contract-registry.test.js` | Tests for registry |
| `__tests__/index.test.js` | `tests/unit/contract/index.test.js` | Tests for default registry |
| `__tests__/contracts.behavior.test.js` | `tests/unit/contract/contracts.behavior.test.js` | Behavioral tests |
| `__tests__/storage.contract.test.js` | `tests/unit/contract/storage.contract.test.js` | Storage contract tests |
| `__tests__/websocket.contract.test.js` | `tests/unit/contract/websocket.contract.test.js` | WebSocket contract tests |

---

## Why Include ALL Contracts?

### 1. **Complete System**
The contract system is designed as a complete validation framework. Removing contracts would break the system's integrity.

### 2. **Examples and Documentation**
Mycelia-specific contracts (router, queue, server, etc.) serve as **real-world examples** of how to create contracts. They demonstrate:
- Required methods patterns
- Required properties patterns
- Custom validation functions
- Contract naming conventions

### 3. **Default Registry**
The `index.js` file creates a default registry with all contracts pre-registered. This provides:
- Out-of-the-box contract validation
- Examples users can reference
- A working system immediately

### 4. **No Dependencies**
Contract files have **no dependencies** on:
- Message system
- Security system
- Storage backends
- Server adapters

They are pure validation logic that can work standalone.

---

## Contract Categories

### Generic Contracts (Plugin-System Related)
These contracts are directly relevant to the plugin system:

- **`hierarchy.contract.js`** - Validates hierarchy facets (parent/child relationships)
- **`listeners.contract.js`** - Validates listener management facets

### Example Contracts (Mycelia-Specific)
These contracts are examples but should be kept:

- **`processor.contract.js`** - Example: Message processing contract
- **`queue.contract.js`** - Example: Queue management contract
- **`router.contract.js`** - Example: Routing contract
- **`scheduler.contract.js`** - Example: Scheduling contract
- **`server.contract.js`** - Example: Server adapter contract
- **`storage.contract.js`** - Example: Storage backend contract
- **`websocket.contract.js`** - Example: WebSocket contract

**Why keep examples?**
- Users can see real contract implementations
- Demonstrates best practices
- Shows how to structure contracts
- Provides templates for custom contracts

---

## Integration Points

### 1. Facet Validator
The `facet-validator.js` file uses contracts to validate facets during build:

```javascript
// In facet-validator.js
export function validateFacets(facetsByKind, resolvedCtx, subsystem, contractRegistry) {
  // Uses contractRegistry to enforce contracts
}
```

**Required:** Must extract `facet-validator.js` and ensure it works with the contract system.

### 2. Subsystem Builder
The builder uses facet-validator, which in turn uses contracts:

```
SubsystemBuilder
  → validateFacets()
    → contractRegistry.enforce()
      → FacetContract.enforce()
```

**Required:** Ensure builder integration works correctly.

### 3. Facet Class
Facets can declare contracts via `getContract()` method:

```javascript
const facet = new Facet('router', { contract: 'router' })
  .add({ /* methods */ });
```

**Required:** Ensure Facet class supports contract declaration.

---

## Modifications Required

### 1. Update Imports
All contract files need import path updates:

```javascript
// BEFORE:
import { createFacetContract } from './facet-contract.mycelia.js';

// AFTER:
import { createFacetContract } from '../facet-contract.js';
```

### 2. Update index.js
The `index.js` file imports all contracts. Ensure all imports are updated:

```javascript
// BEFORE:
import { routerContract } from './router.contract.mycelia.js';

// AFTER:
import { routerContract } from './contracts/router.contract.js';
```

### 3. Create contracts/index.js (Optional)
Consider creating a contracts index file for easier imports:

```javascript
// src/contract/contracts/index.js
export { hierarchyContract } from './hierarchy.contract.js';
export { listenersContract } from './listeners.contract.js';
// ... etc
```

### 4. Documentation
Update contract documentation to note:
- Which contracts are generic vs examples
- How to create custom contracts
- How to use the default registry
- How to create custom registries

---

## Export Structure

### Main Entry Point
```javascript
// src/contract/index.js
export { FacetContract, createFacetContract } from './facet-contract.js';
export { FacetContractRegistry } from './facet-contract-registry.js';
export { defaultContractRegistry } from './index.js'; // Pre-registered

// Export all contracts
export * from './contracts/index.js';
```

### Package Exports
```javascript
// package.json
{
  "exports": {
    ".": "./src/index.js",
    "./contract": "./src/contract/index.js",
    "./contract/contracts": "./src/contract/contracts/index.js"
  }
}
```

---

## Testing Strategy

### Unit Tests
- ✅ Test `FacetContract` class
- ✅ Test `FacetContractRegistry` class
- ✅ Test default registry
- ✅ Test contract enforcement
- ✅ Test custom validation
- ✅ Test contract examples

### Integration Tests
- ✅ Test facet-validator with contracts
- ✅ Test builder with contract validation
- ✅ Test contract enforcement during build
- ✅ Test contract errors during build

### Example Tests
- ✅ Test creating custom contracts
- ✅ Test using default registry
- ✅ Test creating custom registry
- ✅ Test contract validation in examples

---

## Verification Checklist

After extraction, verify:

- [ ] All contract files copied (core + all implementations)
- [ ] All contract tests copied
- [ ] All imports updated correctly
- [ ] `index.js` exports all contracts
- [ ] Default registry pre-registers all contracts
- [ ] Facet-validator integration works
- [ ] Builder uses facet-validator correctly
- [ ] All contract tests pass
- [ ] Examples demonstrate contract usage
- [ ] Documentation explains generic vs example contracts

---

## Key Points

1. **ALL contracts must be extracted** - both generic and examples
2. **Contract system is standalone** - no dependencies on message system
3. **Examples are valuable** - show real-world contract patterns
4. **Default registry is important** - provides working system out of box
5. **Integration is critical** - facet-validator must work with contracts
6. **Tests are comprehensive** - all contract tests must pass

---

## Summary

The Facet Contract system is a **complete, self-contained validation framework** that:
- Has no dependencies on Mycelia-specific features
- Provides both generic and example contracts
- Includes comprehensive testing
- Integrates with the builder system
- Can work standalone

**All contract-related code must be extracted** to provide a complete, working plugin system with contract validation.

---

**Last Updated:** 2025-01-27  
**Status:** REQUIRED for extraction

