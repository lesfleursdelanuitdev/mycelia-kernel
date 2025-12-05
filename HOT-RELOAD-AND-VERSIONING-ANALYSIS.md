# Hot Reload and Versioning Analysis

**Date:** December 5, 2025  
**Status:** Feature Proposal Analysis

---

## Executive Summary

**Hot Reload:** ⚠️ **CONDITIONALLY RECOMMEND** - Add as opt-in development feature  
**Versioning:** ✅ **STRONGLY RECOMMEND** - Low risk, high value addition

---

## 1. Hot Reload Analysis

### Current State

The infrastructure for hot reload partially exists:

```javascript
// ✅ Facets can be overwritten
export const useRouter = createHook({
  kind: 'router',
  overwrite: true,  // ← Already supported
  fn: (ctx, api, subsystem) => { /* ... */ }
});

// ✅ FacetManager disposes old facets
if (this.#facets.has(kind)) {
  const canOverwrite = facet.shouldOverwrite?.() === true;
  if (canOverwrite) {
    // Dispose all existing facets
    for (const oldFacet of existingFacets) {
      oldFacet?.dispose?.(this.#subsystem);
    }
  }
}
```

**Missing pieces:**
- No API to hot reload after `build()` completes
- No state migration strategy
- No reload lifecycle hooks
- No dependency re-resolution

### Feasibility Assessment

#### ✅ What Works in Current Architecture

1. **Disposal Mechanism**: Facets have `dispose()` lifecycle
2. **Overwrite Support**: FacetManager handles replacement
3. **Transactional Builds**: Build system has rollback on failure
4. **Dependency Resolution**: Topological sorting exists

#### ⚠️ Challenges

1. **State Management**
   ```javascript
   // Example: Queue has pending messages
   const oldQueue = subsystem.queue;
   // Hot reload router...
   const newQueue = subsystem.queue; // Different instance!
   // What happens to pending messages in oldQueue?
   ```

2. **In-Flight Operations**
   ```javascript
   // Message being processed
   await oldRouter.route(message);
   // Hot reload happens mid-processing
   // Handler references might break
   ```

3. **Dependency Invalidation**
   ```javascript
   // Scheduler depends on queue
   useScheduler.required = ['queue'];
   // If queue is reloaded, should scheduler reload?
   ```

4. **Identity Continuity**
   ```javascript
   // Subsystem has identity attached
   subsystem.identity = createIdentity(pkr);
   // Hot reload must preserve identity
   ```

### Proposed Implementation

#### Design: "Rebuild" API

```javascript
class BaseSubsystem {
  /**
   * Rebuild the subsystem with new or updated hooks.
   * 
   * ⚠️ EXPERIMENTAL: Use only in development or with extreme caution
   * 
   * @param {Array} newHooks - Hooks to add/replace
   * @param {Object} options - Rebuild options
   * @param {boolean} options.preserveState - Attempt to migrate state (default: false)
   * @param {boolean} options.force - Force rebuild even if risky (default: false)
   * @returns {Promise<void>}
   */
  async rebuild(newHooks = [], options = {}) {
    if (!this._isBuilt) {
      throw new Error('Cannot rebuild: subsystem not yet built');
    }
    
    // Safety check: warn about risks
    if (!options.force && this.hasInFlightOperations()) {
      throw new Error('Cannot rebuild: operations in progress. Use force: true to override.');
    }
    
    // 1. Snapshot current state (if preserveState)
    const state = options.preserveState ? this.captureState() : null;
    
    // 2. Pause message processing
    await this.pause();
    
    // 3. Identify hooks to reload
    const hooksToReload = this.identifyChangedHooks(newHooks);
    
    // 4. Calculate affected facets (including dependents)
    const affectedFacets = this.calculateAffectedFacets(hooksToReload);
    
    // 5. Dispose affected facets in reverse dependency order
    await this.disposeAffectedFacets(affectedFacets);
    
    // 6. Re-execute hooks and create new facets
    const newFacets = await this.executeHooks(hooksToReload);
    
    // 7. Initialize and attach new facets
    await this.initializeNewFacets(newFacets);
    
    // 8. Restore state (if preserveState)
    if (state) {
      await this.restoreState(state);
    }
    
    // 9. Resume processing
    await this.resume();
    
    // 10. Emit rebuild event
    this.emit('rebuild', { affectedFacets, newFacets });
  }
  
  /**
   * Check if subsystem has operations in progress
   */
  hasInFlightOperations() {
    const queue = this.find('queue');
    const processor = this.find('processor');
    
    // Check if queue has pending messages
    if (queue && queue.size() > 0) {
      return true;
    }
    
    // Check if processor is actively processing
    if (processor && processor.isProcessing()) {
      return true;
    }
    
    return false;
  }
}
```

#### State Migration Strategy

```javascript
// Facets can implement state migration
class Facet {
  /**
   * Capture state before hot reload
   * @returns {Object} Serializable state object
   */
  captureState() {
    return null; // Default: no state
  }
  
  /**
   * Restore state after hot reload
   * @param {Object} state - Previously captured state
   */
  restoreState(state) {
    // Default: no-op
  }
}

// Example: Queue with state migration
export const useQueue = createHook({
  kind: 'queue',
  fn: (ctx, api, subsystem) => {
    let queue = [];
    
    return new Facet('queue')
      .add({
        enqueue(msg) { queue.push(msg); },
        dequeue() { return queue.shift(); },
        size() { return queue.length; }
      })
      .captureState(() => ({
        pending: queue.map(msg => msg.serialize())
      }))
      .restoreState((state) => {
        queue = state.pending.map(data => Message.deserialize(data));
      });
  }
});
```

### Recommendation: CONDITIONAL YES

**Recommend adding hot reload with these constraints:**

1. **Development Mode Only (Default)**
   ```javascript
   // Only allow rebuild in development
   async rebuild(newHooks, options = {}) {
     if (process.env.NODE_ENV === 'production' && !options.allowInProduction) {
       throw new Error('Hot reload disabled in production. Set allowInProduction: true to override.');
     }
     // ...
   }
   ```

2. **Opt-In Feature**
   - Not enabled by default
   - Clear warnings about risks
   - Documented limitations

3. **Limited Scope**
   - Start with stateless facets only
   - Add state migration incrementally
   - Clear documentation on which hooks support hot reload

4. **Safety Mechanisms**
   - Check for in-flight operations
   - Require explicit confirmation for risky reloads
   - Emit events for monitoring

**Priority:** LOW (nice-to-have for development)

---

## 2. Versioning Analysis

### Current State

**No versioning infrastructure:**

```javascript
// Current hook definition
export const useRouter = createHook({
  kind: 'router',
  required: ['statistics'],
  source: import.meta.url,
  fn: (ctx, api, subsystem) => { /* ... */ }
});

// No version field ❌
// No compatibility checking ❌
// No deprecation warnings ❌
```

### Benefits of Versioning

#### 1. Compatibility Checking

```javascript
export const useScheduler = createHook({
  kind: 'scheduler',
  version: '2.0.0',
  required: {
    'queue': '^1.5.0',      // Requires queue >= 1.5.0, < 2.0.0
    'processor': '~1.2.3'   // Requires processor ~1.2.3
  },
  fn: (ctx, api, subsystem) => { /* ... */ }
});

// At build time:
// ✅ Check that queue version satisfies ^1.5.0
// ✅ Check that processor version satisfies ~1.2.3
// ❌ Throw error if dependencies don't meet requirements
```

#### 2. Deprecation Warnings

```javascript
export const useOldQueue = createHook({
  kind: 'queue',
  version: '1.0.0',
  deprecated: {
    since: '1.5.0',
    message: 'Use useQueue v2.0+ with improved performance',
    replacement: 'useQueueV2'
  },
  fn: (ctx, api, subsystem) => { /* ... */ }
});

// At build time:
// ⚠️ Warning: useOldQueue is deprecated since v1.5.0
// ⚠️ Use useQueueV2 instead
```

#### 3. Breaking Change Detection

```javascript
// v1.0.0
export const useRouter = createHook({
  kind: 'router',
  version: '1.5.0',
  fn: (ctx, api, subsystem) => {
    return new Facet('router').add({
      route(path, handler) { /* ... */ }
    });
  }
});

// v2.0.0 - Breaking change: route() signature changed
export const useRouter = createHook({
  kind: 'router',
  version: '2.0.0',
  breaking: {
    from: '1.x',
    changes: [
      'route() now requires options parameter',
      'Removed deprecated match() method'
    ]
  },
  fn: (ctx, api, subsystem) => {
    return new Facet('router').add({
      route(path, handler, options) { /* ... */ } // New signature
    });
  }
});
```

#### 4. Feature Detection

```javascript
// Check if a feature is available
if (subsystem.hasFeature('router', '>=2.0.0')) {
  // Use v2 features
  subsystem.router.route(path, handler, { async: true });
} else {
  // Fall back to v1 API
  subsystem.router.route(path, handler);
}
```

### Proposed Implementation

#### Phase 1: Basic Versioning

```javascript
// createHook with version support
export function createHook({ 
  kind, 
  version,        // NEW: Semver string
  overwrite = false, 
  required = [], 
  attach = false, 
  source, 
  fn, 
  contract = null 
}) {
  // Validate version
  if (version && !isValidSemver(version)) {
    throw new Error(`createHook: invalid semver version "${version}"`);
  }

  const hook = function(ctx, api, subsystem) {
    return fn(ctx, api, subsystem);
  };

  hook.kind = kind;
  hook.version = version || '0.0.0'; // Default version
  hook.overwrite = overwrite;
  hook.required = Array.isArray(required) ? [...required] : [];
  hook.attach = attach;
  hook.source = source;
  hook.contract = contract || null;

  return hook;
}
```

#### Phase 2: Dependency Version Checking

```javascript
// Enhanced required dependencies
export const useScheduler = createHook({
  kind: 'scheduler',
  version: '2.0.0',
  required: {
    // String: just kind
    'statistics': true,
    
    // Object: kind + version range
    'queue': { version: '^1.5.0' },
    'processor': { version: '~1.2.0', optional: false }
  },
  fn: (ctx, api, subsystem) => { /* ... */ }
});

// Version checking in builder
function validateDependencies(hook, availableFacets) {
  for (const [kind, req] of Object.entries(hook.required)) {
    const facet = availableFacets[kind];
    
    if (!facet) {
      if (!req.optional) {
        throw new Error(`Hook ${hook.kind} requires ${kind} but not found`);
      }
      continue;
    }
    
    // Check version if specified
    if (req.version) {
      const facetVersion = facet.getVersion();
      if (!satisfiesRange(facetVersion, req.version)) {
        throw new Error(
          `Hook ${hook.kind}@${hook.version} requires ${kind}@${req.version} ` +
          `but found ${kind}@${facetVersion}`
        );
      }
    }
  }
}
```

#### Phase 3: Deprecation Support

```javascript
export const useOldRouter = createHook({
  kind: 'router',
  version: '1.5.0',
  deprecated: {
    since: '1.5.0',
    until: '3.0.0',           // Will be removed in v3.0.0
    message: 'Use useRouterV2 for better performance',
    replacement: 'useRouterV2',
    docs: 'https://docs.example.com/migration/router-v2'
  },
  fn: (ctx, api, subsystem) => { /* ... */ }
});

// At build time
function checkDeprecation(hook) {
  if (hook.deprecated) {
    console.warn(
      `⚠️  Hook ${hook.kind}@${hook.version} is deprecated since ${hook.deprecated.since}\n` +
      `   ${hook.deprecated.message}\n` +
      `   Replacement: ${hook.deprecated.replacement}\n` +
      `   Docs: ${hook.deprecated.docs}`
    );
  }
}
```

#### Phase 4: Facet Version Metadata

```javascript
class Facet {
  constructor(kind, options = {}) {
    this.#kind = kind;
    this.#version = options.version || '0.0.0';
    // ...
  }
  
  getVersion() {
    return this.#version;
  }
}

// In hooks
export const useRouter = createHook({
  kind: 'router',
  version: '2.0.0',
  fn: (ctx, api, subsystem) => {
    return new Facet('router', { 
      version: '2.0.0',  // Pass through from hook
      attach: true 
    })
    .add({ /* ... */ });
  }
});
```

### Recommendation: STRONG YES

**Strongly recommend adding versioning:**

1. **High Value**
   - Prevents compatibility issues
   - Enables safe upgrades
   - Better developer experience
   - Easier maintenance

2. **Low Risk**
   - Purely additive (backward compatible)
   - No breaking changes to existing code
   - Can be optional initially

3. **Easy Implementation**
   - Metadata-only changes
   - Build-time validation
   - No runtime overhead

4. **Industry Standard**
   - npm uses semver
   - Plugin systems expect versioning
   - Users already understand semver

**Priority:** HIGH (should be added soon)

---

## 3. Implementation Roadmap

### Phase 1: Versioning (PRIORITY)

**Timeline:** 2-3 days

1. Add `version` field to `createHook()`
2. Add `version` field to `Facet` class
3. Update all core hooks with version '1.0.0'
4. Add semver validation utility
5. Add version to hook metadata extraction
6. Update documentation

**Deliverables:**
- ✅ All hooks have versions
- ✅ Facets expose version via `getVersion()`
- ✅ Documentation updated

### Phase 2: Dependency Version Checking

**Timeline:** 3-5 days

1. Support object format for `required` dependencies
2. Add semver range checking utility
3. Validate dependency versions at build time
4. Add helpful error messages with version mismatches
5. Add tests for version validation

**Deliverables:**
- ✅ Hooks can specify version ranges for dependencies
- ✅ Build fails with clear error if versions incompatible
- ✅ Comprehensive tests

### Phase 3: Deprecation Support

**Timeline:** 2-3 days

1. Add `deprecated` field to hook metadata
2. Add deprecation checking in builder
3. Emit warnings for deprecated hooks
4. Add documentation for deprecation process

**Deliverables:**
- ✅ Hooks can mark themselves as deprecated
- ✅ Build emits warnings for deprecated hooks
- ✅ Migration guide for deprecated hooks

### Phase 4: Hot Reload (OPTIONAL)

**Timeline:** 1-2 weeks

1. Add `rebuild()` method to BaseSubsystem
2. Implement state capture/restore interface
3. Add dependency invalidation logic
4. Add safety checks and guards
5. Extensive testing with stateless facets
6. Add state migration for core facets
7. Documentation with warnings

**Deliverables:**
- ✅ Hot reload works for stateless facets
- ✅ State migration works for queue/router
- ✅ Comprehensive safety checks
- ✅ Clear documentation of limitations

---

## 4. Comparison

| Feature | Value | Risk | Effort | Priority |
|---------|-------|------|--------|----------|
| **Versioning** | HIGH | LOW | LOW | ⭐⭐⭐ HIGH |
| **Hot Reload** | MEDIUM | HIGH | HIGH | ⭐ LOW |

### Versioning Pros
✅ Industry standard practice  
✅ Prevents breaking changes  
✅ Easy to implement  
✅ Low risk  
✅ Backward compatible  
✅ Improves developer experience  

### Versioning Cons
❌ Adds metadata maintenance burden  
❌ Need to follow semver discipline  

### Hot Reload Pros
✅ Faster development iteration  
✅ No restart needed  
✅ Can enable A/B testing  
✅ Useful for monitoring plugins  

### Hot Reload Cons
❌ Complex state management  
❌ Risk of state corruption  
❌ Race conditions possible  
❌ Not suitable for all plugins  
❌ High implementation effort  
❌ Requires careful testing  

---

## 5. Recommendations Summary

### ✅ DO ADD: Versioning

**Implementation:** Phases 1-3 (6-11 days)

Versioning is a **must-have** feature for any mature plugin system:
- Low risk, high value
- Industry standard
- Prevents future compatibility issues
- Easy to implement

### ⚠️ MAYBE ADD: Hot Reload

**Implementation:** Phase 4 (1-2 weeks)

Hot reload is a **nice-to-have** feature:
- Higher risk, moderate value
- Useful primarily for development
- Requires significant effort
- Should be opt-in and clearly documented

**Recommendation:** Add versioning first, then evaluate whether hot reload is worth the effort based on user demand.

---

## 6. Code Examples

### Example 1: Versioned Hook

```javascript
export const useRouter = createHook({
  kind: 'router',
  version: '2.1.0',
  required: {
    'statistics': { version: '^1.0.0' },
    'queue': { version: '^1.5.0' }
  },
  attach: true,
  source: import.meta.url,
  fn: (ctx, api, subsystem) => {
    return new Facet('router', { 
      version: '2.1.0',
      attach: true 
    })
    .add({
      route(path, handler, options = {}) {
        // v2.1.0 implementation
      }
    });
  }
});
```

### Example 2: Deprecated Hook

```javascript
export const useOldQueue = createHook({
  kind: 'queue',
  version: '1.5.0',
  deprecated: {
    since: '1.5.0',
    until: '3.0.0',
    message: 'Use useQueueV2 for improved performance and features',
    replacement: 'useQueueV2',
    docs: 'https://docs.mycelia.io/migration/queue-v2'
  },
  fn: (ctx, api, subsystem) => { /* old implementation */ }
});
```

### Example 3: Hot Reload (if implemented)

```javascript
// Development mode: hot reload router
if (import.meta.hot) {
  import.meta.hot.accept('./use-router-v2.js', async (newModule) => {
    const newUseRouter = newModule.useRouter;
    
    // Hot reload the router hook
    await subsystem.rebuild([newUseRouter], {
      preserveState: false,  // Router is stateless
      force: false           // Safety check for in-flight operations
    });
    
    console.log('✅ Router hot reloaded successfully');
  });
}
```

---

## 7. Conclusion

**Recommendation: Add Versioning Now, Consider Hot Reload Later**

1. **Implement versioning in Phases 1-3** (HIGH PRIORITY)
   - Essential for long-term maintainability
   - Low risk, high value
   - Should be done before 1.0 release

2. **Consider hot reload later** (LOW PRIORITY)
   - Useful but not essential
   - Complex implementation
   - Wait for user demand
   - Focus on dev tooling first

**Next Steps:**
1. ✅ Get stakeholder approval for versioning
2. ✅ Create implementation plan for Phases 1-3
3. ✅ Update all core hooks with version 1.0.0
4. ✅ Add semver validation utilities
5. ✅ Update documentation
6. ⏳ Defer hot reload decision until after versioning is complete

