# Prisma Injection Design - Event-Driven vs Hook-Based

## Overview

This document explores design options for injecting Prisma into subsystems. The question: **Should we create a Prisma wrapper that listens to `kernel://event/subsystem-registered` and automatically injects Prisma?**

**Current State:**
- Kernel emits `kernel://event/subsystem-registered` when a subsystem is registered
- Event includes: `subsystem`, `wrapper`, `subsystemName`, `subsystemPath`, `options`, `timestamp`
- MessageSystem has `listenerOn()` method to register event handlers

---

## Design Options

### Option A: Event-Driven Automatic Injection (Proposed)

**Approach:** Create a Prisma wrapper that listens to `kernel://event/subsystem-registered` and automatically injects Prisma into all subsystems.

**Implementation:**
```javascript
// PrismaWrapper listens to subsystem-registered events
class PrismaWrapper {
  constructor(prismaClient) {
    this.prisma = prismaClient;
    this.injectedSubsystems = new Set();
  }

  async initialize(messageSystem) {
    // Register listener for subsystem-registered events
    await messageSystem.listenerOn('kernel', 'kernel://event/subsystem-registered', 
      async (message) => {
        const { subsystem, subsystemName } = message.getBody();
        
        // Inject Prisma into subsystem
        await this.injectPrisma(subsystem, subsystemName);
      }
    );
  }

  async injectPrisma(subsystem, subsystemName) {
    // Check if subsystem needs Prisma (via metadata or config)
    if (this.shouldInjectPrisma(subsystem, subsystemName)) {
      // Inject Prisma as a facet or property
      subsystem.prisma = this.prisma;
      // Or add as facet
      subsystem.find('prisma') || subsystem.addFacet('prisma', { prisma: this.prisma });
      
      this.injectedSubsystems.add(subsystemName);
    }
  }

  shouldInjectPrisma(subsystem, subsystemName) {
    // Check if subsystem opts-in to Prisma
    return subsystem.config?.prisma?.enabled || 
           subsystem.metadata?.needsPrisma ||
           subsystemName === 'db'; // DBSubsystem always needs Prisma
  }
}
```

**Pros:**
- ✅ Automatic - no manual setup needed
- ✅ Event-driven - fits Mycelia architecture
- ✅ Centralized - one place manages Prisma injection
- ✅ Can be opt-in via metadata/config

**Cons:**
- ❌ **Not all subsystems need Prisma** - wasteful injection
- ❌ **Timing issues** - what if Prisma isn't ready when subsystem registers?
- ❌ **Violates explicit dependencies** - hidden dependency injection
- ❌ **Hard to debug** - not obvious which subsystems have Prisma
- ❌ **Order dependency** - PrismaWrapper must be initialized before subsystems register
- ❌ **No way to opt-out** - all subsystems get Prisma (unless filtered)
- ❌ **Breaks Mycelia pattern** - Mycelia uses hooks, not property injection

---

### Option B: Hook-Based Injection (Recommended)

**Approach:** Subsystems explicitly use `usePrisma` hook if they need Prisma.

**Implementation:**
```javascript
// usePrisma hook
export const usePrisma = createHook({
  kind: 'prisma',
  required: [],
  attach: true,
  fn: (ctx, api, subsystem) => {
    // Get Prisma from context or global registry
    const prisma = ctx.prisma || getPrismaFromRegistry();
    
    if (!prisma) {
      throw new Error(`Prisma not available. Ensure Prisma is initialized before using usePrisma hook.`);
    }

    return new Facet('prisma', { attach: true, source: import.meta.url })
      .add({
        prisma: prisma,
        model: (modelName) => prisma[modelName],
        transaction: (callback) => prisma.$transaction(callback),
        disconnect: () => prisma.$disconnect()
      });
  }
});

// Usage in subsystem
class UserSubsystem extends BaseSubsystem {
  constructor(name, options) {
    super(name, options);
    this.use(usePrisma); // Explicit opt-in
  }

  async handleGetUser(message) {
    const prismaFacet = this.find('prisma');
    const user = await prismaFacet.prisma.user.findUnique({
      where: { id: message.body.userId }
    });
    return user;
  }
}
```

**Pros:**
- ✅ **Explicit dependencies** - clear which subsystems need Prisma
- ✅ **Consistent with Mycelia** - uses hook pattern
- ✅ **Opt-in** - only subsystems that need Prisma use it
- ✅ **No timing issues** - hook executes during build, after Prisma is ready
- ✅ **Easy to debug** - can check if facet exists
- ✅ **Type-safe** - facet contract validation
- ✅ **Flexible** - can get Prisma from context or registry

**Cons:**
- ❌ Requires manual hook registration (but this is explicit and clear)

---

### Option C: Context-Based Injection

**Approach:** Prisma available in `ctx` if configured, subsystems access via `ctx.prisma`.

**Implementation:**
```javascript
// Bootstrap sets Prisma in context
const messageSystem = new MessageSystem('app', {
  config: {
    prisma: {
      databaseUrl: process.env.DATABASE_URL
    }
  }
});

// Prisma initialized and added to context
const prisma = new PrismaClient();
messageSystem.ctx.prisma = prisma;

// Subsystems access via ctx in hooks
export const usePrisma = createHook({
  kind: 'prisma',
  fn: (ctx, api, subsystem) => {
    const prisma = ctx.prisma;
    if (!prisma) {
      throw new Error('Prisma not available in context');
    }
    return new Facet('prisma', { attach: true })
      .add({ prisma });
  }
});
```

**Pros:**
- ✅ Centralized configuration
- ✅ Available to all subsystems via context
- ✅ Still uses hook pattern

**Cons:**
- ❌ Still requires explicit hook usage
- ❌ Context pollution (not all subsystems need Prisma)

---

### Option D: Hybrid - Event-Driven Opt-In

**Approach:** Listen to `subsystem-registered` event, but only inject if subsystem explicitly opts-in.

**Implementation:**
```javascript
class PrismaInjector {
  constructor(prismaClient) {
    this.prisma = prismaClient;
  }

  async initialize(messageSystem) {
    // Register listener
    await messageSystem.listenerOn('kernel', 'kernel://event/subsystem-registered',
      async (message) => {
        const { subsystem, subsystemName, options } = message.getBody();
        
        // Only inject if subsystem opts-in
        if (options?.injectPrisma || subsystem.metadata?.needsPrisma) {
          // Add Prisma as facet after subsystem is built
          const prismaFacet = new Facet('prisma', { attach: true })
            .add({ prisma: this.prisma });
          
          subsystem.__facets.add(prismaFacet);
        }
      }
    );
  }
}

// Usage - subsystem opts-in during registration
const userSubsystem = new UserSubsystem('users', { ms: messageSystem });
await messageSystem.registerSubsystem(userSubsystem, {
  injectPrisma: true  // Opt-in flag
});
```

**Pros:**
- ✅ Event-driven
- ✅ Opt-in (explicit)
- ✅ Can inject after registration

**Cons:**
- ❌ **Injection happens after build** - subsystem already built, can't use in constructor
- ❌ **Breaks hook pattern** - facets should be added during build, not after
- ❌ **Timing issues** - subsystem might try to use Prisma before injection
- ❌ **Inconsistent** - mixing event-driven injection with hook-based architecture

---

## Recommended Approach: Option B (Hook-Based)

### Why Hook-Based is Best

1. **Consistent with Mycelia Architecture**
   - Mycelia uses hooks for all subsystem extensions
   - Facets are created during build phase
   - Explicit dependency declaration

2. **Explicit Dependencies**
   - Clear which subsystems need Prisma
   - Easy to see dependencies at a glance
   - No hidden injection

3. **No Timing Issues**
   - Hooks execute during build, after Prisma is initialized
   - Facets are available immediately after build
   - No race conditions

4. **Type Safety**
   - Facet contracts validate Prisma facet
   - Runtime checks ensure Prisma is available
   - Better error messages

5. **Flexibility**
   - Can get Prisma from context, registry, or create new instance
   - Can configure per-subsystem
   - Easy to mock for testing

### Implementation Pattern

```javascript
// 1. Initialize Prisma (in bootstrap)
const prisma = new PrismaClient();
await prisma.$connect();

// 2. Store in MessageSystem context or registry
messageSystem.ctx.prisma = prisma;
// Or
PrismaRegistry.set(prisma);

// 3. Subsystems opt-in via hook
class UserSubsystem extends BaseSubsystem {
  constructor(name, options) {
    super(name, options);
    this.use(usePrisma); // Explicit opt-in
  }
}

// 4. Use Prisma in subsystem
async handleGetUser(message) {
  const prismaFacet = this.find('prisma');
  if (!prismaFacet) {
    throw new Error('Prisma facet not found. Did you use usePrisma hook?');
  }
  
  return await prismaFacet.prisma.user.findUnique({
    where: { id: message.body.userId }
  });
}
```

---

## Event-Driven Use Cases

While hook-based is recommended for Prisma injection, event-driven patterns are useful for:

### 1. Audit Logging

```javascript
// AuditSubsystem listens to subsystem-registered events
await messageSystem.listenerOn('kernel', 'kernel://event/subsystem-registered',
  async (message) => {
    const { subsystemName, timestamp } = message.getBody();
    await auditLog.record('subsystem-registered', {
      subsystem: subsystemName,
      timestamp
    });
  }
);
```

### 2. Monitoring/Telemetry

```javascript
// MetricsSubsystem tracks subsystem registrations
await messageSystem.listenerOn('kernel', 'kernel://event/subsystem-registered',
  async (message) => {
    metrics.increment('subsystems.registered');
    metrics.gauge('subsystems.total', messageSystem.getSubsystemCount());
  }
);
```

### 3. Dependency Graph Building

```javascript
// DependencyTracker builds graph of subsystem relationships
await messageSystem.listenerOn('kernel', 'kernel://event/subsystem-registered',
  async (message) => {
    const { subsystem, options } = message.getBody();
    dependencyGraph.addNode(subsystem.name, {
      dependencies: options.dependencies || []
    });
  }
);
```

### 4. Health Checks

```javascript
// HealthCheckSubsystem monitors subsystem health
await messageSystem.listenerOn('kernel', 'kernel://event/subsystem-registered',
  async (message) => {
    const { subsystemName } = message.getBody();
    healthCheck.register(subsystemName, {
      check: async () => {
        const subsystem = messageSystem.find(subsystemName);
        return subsystem ? 'healthy' : 'unhealthy';
      }
    });
  }
);
```

---

## Design Decision Matrix

| Criteria | Event-Driven | Hook-Based | Context-Based | Hybrid |
|----------|-------------|------------|---------------|---------|
| **Consistency with Mycelia** | ⚠️ Medium | ✅ High | ✅ High | ⚠️ Medium |
| **Explicit Dependencies** | ❌ Low | ✅ High | ⚠️ Medium | ⚠️ Medium |
| **Timing Safety** | ❌ Low | ✅ High | ✅ High | ❌ Low |
| **Type Safety** | ❌ Low | ✅ High | ⚠️ Medium | ❌ Low |
| **Flexibility** | ⚠️ Medium | ✅ High | ⚠️ Medium | ⚠️ Medium |
| **Debugging** | ❌ Low | ✅ High | ⚠️ Medium | ❌ Low |
| **Opt-in/Opt-out** | ⚠️ Medium | ✅ High | ❌ Low | ⚠️ Medium |

---

## Recommendation

**Use Hook-Based Injection (Option B)** for Prisma:

1. **Create `usePrisma` hook** that subsystems can opt-in to
2. **Store Prisma in context or registry** during bootstrap
3. **Subsystems explicitly use hook** if they need Prisma
4. **Use events for other purposes** (audit, monitoring, health checks)

**Rationale:**
- Consistent with Mycelia's hook-based architecture
- Explicit dependencies are easier to understand and debug
- No timing issues or race conditions
- Type-safe with facet contracts
- Flexible and testable

**Event-Driven Pattern is Better For:**
- Cross-cutting concerns (audit, monitoring, telemetry)
- Side effects that don't affect subsystem functionality
- Building dependency graphs
- Health check registration

---

## Implementation Example

### Bootstrap with Prisma

```javascript
import { MessageSystem } from './mycelia-kernel-v2/models/message-system/message-system.v2.mycelia.js';
import { PrismaClient } from '@prisma/client';

// Initialize Prisma
const prisma = new PrismaClient();
await prisma.$connect();

// Create MessageSystem with Prisma in context
const messageSystem = new MessageSystem('app', {
  config: {
    prisma: {
      databaseUrl: process.env.DATABASE_URL
    }
  }
});

// Add Prisma to context (available to all subsystems)
messageSystem.ctx.prisma = prisma;

await messageSystem.bootstrap();

// Register subsystems (they opt-in to Prisma via usePrisma hook)
const userSubsystem = new UserSubsystem('users', { ms: messageSystem });
await messageSystem.registerSubsystem(userSubsystem);
```

### Subsystem with Prisma

```javascript
import { BaseSubsystem } from './base-subsystem/base.subsystem.mycelia.js';
import { usePrisma } from './hooks/prisma/use-prisma.mycelia.js';

export class UserSubsystem extends BaseSubsystem {
  constructor(name, options) {
    super(name, options);
    this.use(usePrisma); // Explicit opt-in
  }

  async handleGetUser(message) {
    const prismaFacet = this.find('prisma');
    return await prismaFacet.prisma.user.findUnique({
      where: { id: message.body.userId }
    });
  }
}
```

---

## Summary

**Answer to the Question:** 

**No, we should NOT use event-driven automatic injection for Prisma.**

**Instead:**
- ✅ Use **hook-based injection** (`usePrisma` hook)
- ✅ Subsystems **explicitly opt-in** by using the hook
- ✅ Prisma available in **context or registry**
- ✅ **Event-driven patterns** are better for cross-cutting concerns (audit, monitoring, health checks)

**Why:**
- Consistent with Mycelia architecture
- Explicit dependencies
- No timing issues
- Type-safe
- Easy to debug

---

**Document Created:** January 2025

