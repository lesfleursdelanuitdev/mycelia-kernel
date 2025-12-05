# Routing Grammar Rationale

## Introduction

This document explains the design decisions that led to the routing grammar used in the Mycelia Kernel. It describes the basic structure of route paths and the specific pattern for resource routing, explaining how routes are structured to enable flexible, predictable message routing.

## URI Inspiration

### Why URIs?

The routing grammar in the Mycelia Kernel was inspired by **Uniform Resource Identifiers (URIs)** used by web browsers. This choice was made for two key reasons:

#### 1. Familiar Interface

URIs are a familiar interface that everyone who has used a computer can understand:

```javascript
// Browser URI
'https://example.com/path/to/resource'

// Mycelia Kernel route
'canvas://layers/create'
```

**Benefits:**
- ✅ **Universal Understanding**: Developers already know how URIs work
- ✅ **Intuitive**: The structure is immediately recognizable
- ✅ **No Learning Curve**: Developers can start using routes without extensive training
- ✅ **Consistent Mental Model**: Same mental model as web development

#### 2. Battle-Tested Grammar

URIs represent a battle-tested routing grammar that has been proven over decades:

**History:**
- URIs were standardized in **RFC 3986** (2005)
- Used by billions of users daily
- Proven to scale to the largest systems (the entire web)
- Handles edge cases and special characters
- Supports hierarchical structures naturally

**Benefits:**
- ✅ **Proven Scalability**: Handles systems of any size
- ✅ **Well-Documented**: Extensive documentation and standards
- ✅ **Edge Cases Handled**: Special characters, encoding, etc. are well-understood
- ✅ **Tooling Support**: Existing tools and libraries can be adapted
- ✅ **Standards Compliance**: Follows established patterns

### URI Structure in Mycelia Kernel

The Mycelia Kernel adapts URI structure for internal routing:

```
Browser URI:        https://example.com/path/to/resource
Mycelia Route:      canvas://layers/create
                    │      │   │
                    │      │   └─ Path (resource location)
                    │      └─ Separator (://)
                    └─ Subsystem (like domain)
```

**Key Similarities:**
- **Scheme/Subsystem**: Both use a prefix to identify the target (`https://` vs `canvas://`)
- **Hierarchical Paths**: Both use `/` to separate path segments
- **Resource Identification**: Both identify specific resources through paths
- **Query Support**: Both support query parameters (though implemented differently)

**Key Differences:**
- **Internal vs External**: Mycelia routes are internal to the system, not exposed to browsers
- **Subsystem vs Domain**: Uses subsystem names instead of domain names
- **Message-Based**: Routes are used for message routing, not HTTP requests

## Basic Route Path Structure

### Route Path Components

Route paths in the Mycelia Kernel follow a hierarchical structure:

```
subsystem://path/to/resource
```

Where:
- **`subsystem`**: The subsystem name (determines routing destination)
- **`://`**: Separator indicating subsystem boundary
- **`path/to/resource`**: The route path within the subsystem

### Route Path Examples

```javascript
// Simple static route
'canvas://layers/create'

// Parameterized route
'canvas://layers/{id}/update'

// Query route (always uses query/* pattern)
'storage://query/files'

// Resource route (uses res.type pattern, always at end of path)
'canvas://res.type.cache.name.lines'
```

## Query Route Pattern

### Query Route Specification

Queries always follow a specific route pattern based on the subsystem hierarchy:

#### Top-Level Subsystems

For top-level subsystems, queries use the pattern:

```
subsystem://query/*
```

Where:
- **`subsystem`**: The subsystem name
- **`query`**: Literal keyword indicating this is a query route
- **`*`**: Wildcard matching any query operation

**Examples:**
```javascript
// Query on top-level canvas subsystem
'canvas://query/layers'
'canvas://query/statistics'
'canvas://query/*'

// Query on top-level storage subsystem
'storage://query/files'
'storage://query/directories'
```

#### Child Subsystems

For child subsystems, queries use the pattern:

```
subsystem://child1/.../descN/query/*
```

Where:
- **`subsystem`**: The parent subsystem name
- **`child1/.../descN`**: Path to the child subsystem (one or more levels)
- **`query`**: Literal keyword indicating this is a query route
- **`*`**: Wildcard matching any query operation

**Examples:**
```javascript
// Query on child subsystem
'canvas://scene/query/layers'
'canvas://scene/graph/query/nodes'

// Query on nested child subsystem
'kernel://cache/manager/query/statistics'
```

### Query Route Rules

**Important Constraints:**
- ✅ **Subsystems cannot be named "query"**: The name "query" is reserved for query routes
- ✅ **Child subsystems cannot be named "query"**: Prevents ambiguity with query routes
- ✅ **Query always appears before the wildcard**: Pattern is always `query/*` or `query/<operation>`

**Invalid Examples:**
```javascript
// ❌ Invalid: Cannot name a subsystem "query"
'query://something'

// ❌ Invalid: Cannot name a child subsystem "query"
'canvas://query/something'  // This is a query route, not a child subsystem

// ❌ Invalid: Query must come before wildcard
'canvas://*/query'
```

## Resource Routing Pattern

### The Resource Pattern

Resources in the Mycelia Kernel follow a specific routing pattern that **always appears at the end of a path**:

```
res.type.:type.name.:name
```

Where:
- **`res.type`**: Literal prefix indicating this is a resource route
- **`:type`**: Resource type parameter (e.g., `cache`, `layer`, `document`)
- **`name`**: Literal separator
- **`:name`**: Resource name parameter (e.g., `lines`, `background`, `my-doc`)

**Key Characteristics:**
- **Always at End**: Resource patterns always appear at the end of the path
- **Signifies Ownership**: The path before the resource pattern indicates who the resource belongs to

### Pattern Breakdown

```
res.type.:type.name.:name
│   │    │   │   │   │
│   │    │   │   │   └─ Resource name parameter
│   │    │   │   └─ Literal "name" separator
│   │    │   └─ Resource type parameter
│   │    └─ Literal "type" separator
│   └─ Literal "res" prefix
└─ Resource route indicator
```

### Resource Ownership

The path before the resource pattern indicates ownership:

```javascript
// Resource belongs to top-level canvas subsystem
'canvas://res.type.cache.name.lines'
// This is a canvas cache named "lines"

// Resource belongs to canvas scene child subsystem
'canvas://scene/res.type.cache.name.lines'
// This is a cache named "lines" that belongs to the canvas scene graph

// Resource belongs to nested child subsystem
'canvas://scene/graph/res.type.cache.name.lines'
// This is a cache named "lines" that belongs to the canvas scene graph
```

### Examples

#### Example 1: Top-Level Resource

```javascript
// Cache resource belonging to canvas subsystem
'canvas://res.type.cache.name.lines'
// Type: cache, Name: lines, Owner: canvas subsystem
```

#### Example 2: Child Subsystem Resource

```javascript
// Cache resource belonging to canvas scene child subsystem
'canvas://scene/res.type.cache.name.lines'
// Type: cache, Name: lines, Owner: canvas://scene child subsystem
```

#### Example 3: Nested Child Subsystem Resource

```javascript
// Cache resource belonging to nested child subsystem
'canvas://scene/graph/res.type.cache.name.lines'
// Type: cache, Name: lines, Owner: canvas://scene/graph child subsystem
```

#### Example 4: Different Resource Types

```javascript
// Layer resource
'canvas://res.type.layer.name.background'

// Document resource
'storage://res.type.document.name.my-doc'

// User resource
'api://res.type.user.name.user-123'
```

## Why These Patterns?

### Query Pattern Benefits

The query pattern provides:

**Benefits:**
- ✅ **Consistent Location**: Queries always use `query/*` pattern
- ✅ **Hierarchical Support**: Works for both top-level and child subsystems
- ✅ **Clear Intent**: Pattern clearly indicates this is a query operation
- ✅ **Reserved Namespace**: "query" is reserved, preventing conflicts

### Resource Pattern Benefits

The resource pattern provides:

**Benefits:**
- ✅ **Ownership Clarity**: Path clearly shows who owns the resource
- ✅ **Hierarchical Resources**: Resources can belong to any level of subsystem hierarchy
- ✅ **Consistent Structure**: All resources use the same pattern
- ✅ **Easy to Parse**: Pattern is easy to parse and validate
- ✅ **Self-Documenting**: Pattern clearly shows resource type, name, and owner

## Route Registration

### Registering Query Routes

Subsystems register query routes using the `query/*` pattern:

```javascript
// Register query route handler
subsystem.router.registerRoute('query/*', async (message, params, options) => {
  const path = message.getPath();
  // Extract operation from path (e.g., 'query/layers' -> 'layers')
  const operation = path.split('/').slice(1).join('/');
  return await handleQuery(operation, message);
});
```

### Registering Resource Routes

Subsystems register resource routes using the pattern:

```javascript
// Register resource route handler
subsystem.router.registerRoute('res.type.:type.name.:name', async (message, params, options) => {
  const { type, name } = params;
  // Handle resource operation for type:type, name:name
  const body = message.getBody();
  return await handleResource(type, name, body);
});
```

### Route Matching

When a message arrives with path `canvas://res.type.cache.name.lines`:

1. **Extract Subsystem**: `canvas` → routes to canvas subsystem
2. **Match Pattern**: `res.type.:type.name.:name` matches
3. **Extract Parameters**: 
   - `type` = `'cache'`
   - `name` = `'lines'`
4. **Determine Owner**: Path before resource pattern indicates ownership (canvas subsystem)
5. **Call Handler**: Handler receives `params = { type: 'cache', name: 'lines' }`

When a message arrives with path `canvas://scene/res.type.cache.name.lines`:

1. **Extract Subsystem**: `canvas` → routes to canvas subsystem
2. **Route to Child**: `scene` → routes to canvas://scene child subsystem
3. **Match Pattern**: `res.type.:type.name.:name` matches
4. **Extract Parameters**: 
   - `type` = `'cache'`
   - `name` = `'lines'`
5. **Determine Owner**: Path before resource pattern indicates ownership (canvas://scene child subsystem)
6. **Call Handler**: Handler receives `params = { type: 'cache', name: 'lines' }`

## Comparison with Other Patterns

### Static Routes

```javascript
// Static route: specific, not flexible
'canvas://layers/background/get'
```

**Limitations:**
- ❌ Must register route for each resource
- ❌ Doesn't scale to many resources
- ❌ Hard to maintain

### Parameterized Routes

```javascript
// Parameterized route: more flexible
'canvas://layers/{name}/get'
```

**Limitations:**
- ❌ Doesn't specify resource type
- ❌ Less structured
- ❌ Harder to validate

### Resource Pattern

```javascript
// Resource pattern: structured and flexible, shows ownership
'canvas://res.type.cache.name.lines'              // Belongs to canvas
'canvas://scene/res.type.cache.name.lines'        // Belongs to canvas scene
```

**Advantages:**
- ✅ Specifies resource type explicitly
- ✅ Shows resource ownership through path
- ✅ Structured and predictable
- ✅ Easy to validate and parse
- ✅ Scales to many resources
- ✅ Supports hierarchical ownership

## Real-World Usage

### Example: Canvas Subsystem

```javascript
class CanvasSubsystem extends BaseSubsystem {
  async build() {
    await super.build();
    
    // Register query routes
    this.router.registerRoute('query/*', async (message, params) => {
      const path = message.getPath();
      const operation = path.split('/').slice(1).join('/');
      return await this.handleQuery(operation, message);
    });
    
    // Register resource routes
    this.router.registerRoute('res.type.:type.name.:name', async (message, params) => {
      const { type, name } = params;
      const body = message.getBody();
      return await this.handleResource(type, name, body);
    });
  }
  
  async handleQuery(operation, message) {
    // Handle query operations
    switch (operation) {
      case 'layers':
        return await this.getLayers();
      case 'statistics':
        return await this.getStatistics();
      default:
        throw new Error(`Unknown query operation: ${operation}`);
    }
  }
  
  async handleResource(type, name, data) {
    // Handle resource operations
    // The path before the resource pattern indicates ownership
    return this.resources.get(`${type}:${name}`);
  }
}
```

### Client Usage

```javascript
// Query layers from canvas subsystem
const query = messageFactory.createQuery('canvas://query/layers');
const layers = await messageSystem.send(query);

// Access cache resource belonging to canvas
const cacheQuery = messageFactory.createQuery('canvas://res.type.cache.name.lines');
const cache = await messageSystem.send(cacheQuery);

// Access cache resource belonging to canvas scene child subsystem
const sceneCacheQuery = messageFactory.createQuery('canvas://scene/res.type.cache.name.lines');
const sceneCache = await messageSystem.send(sceneCacheQuery);
```

## Pattern Validation

### Valid Query Routes

```javascript
// ✅ Valid: Top-level query
'canvas://query/layers'
'storage://query/files'

// ✅ Valid: Child subsystem query
'canvas://scene/query/layers'
'kernel://cache/query/statistics'

// ✅ Valid: Nested child subsystem query
'canvas://scene/graph/query/nodes'
```

### Invalid Query Routes

```javascript
// ❌ Invalid: Cannot name subsystem "query"
'query://something'

// ❌ Invalid: Cannot name child subsystem "query"
'canvas://query/something'  // This is a query route, not a child subsystem

// ❌ Invalid: Query must come before wildcard
'canvas://*/query'
```

### Valid Resource Routes

```javascript
// ✅ Valid: Top-level resource
'canvas://res.type.cache.name.lines'
'storage://res.type.document.name.my-doc'

// ✅ Valid: Child subsystem resource
'canvas://scene/res.type.cache.name.lines'
'kernel://cache/res.type.store.name.data'

// ✅ Valid: Nested child subsystem resource
'canvas://scene/graph/res.type.cache.name.lines'
```

### Invalid Resource Routes

```javascript
// ❌ Invalid: Resource pattern not at end
'canvas://res.type.cache.name.lines/extra'

// ❌ Invalid: Missing resource name
'canvas://res.type.cache.name'

// ❌ Invalid: Missing resource type
'canvas://res.type.name.lines'
```

## Integration of Patterns

### Query Routes and Resource Routes

Query routes and resource routes serve different purposes but can be used in the same subsystem:

```javascript
// Query route: Query operations on the subsystem
const query = messageFactory.createQuery('canvas://query/layers');
const layers = await messageSystem.send(query);

// Resource route: Access resources owned by the subsystem
const resourceQuery = messageFactory.createQuery('canvas://res.type.cache.name.lines');
const cache = await messageSystem.send(resourceQuery);

// Resource route in child subsystem
const sceneResourceQuery = messageFactory.createQuery('canvas://scene/res.type.cache.name.lines');
const sceneCache = await messageSystem.send(sceneResourceQuery);

// Resource route with command
const resourceCommand = messageFactory.createCommand('canvas://res.type.cache.name.lines', {
  data: cacheData
});
await messageSystem.send(resourceCommand);
```

**Key Differences:**
- **Query Routes** (`query/*`): Always processed synchronously, used for querying subsystem data
- **Resource Routes** (`res.type.:type.name.:name`): Can be used with both commands and queries, always at end of path, indicates ownership
- **Message Type**: Command vs query determines synchronous vs asynchronous processing for resource routes
- **Ownership**: Resource patterns always appear at the end of paths and indicate who owns the resource

## Summary

The routing grammar in the Mycelia Kernel provides:

1. **Basic Structure**: `subsystem://path/to/resource` format for all routes
2. **Query Pattern**: `subsystem://query/*` for top-level subsystems, `subsystem://child1/.../descN/query/*` for child subsystems
3. **Resource Pattern**: `res.type.:type.name.:name` always at the end of paths, indicating resource ownership
4. **Ownership Clarity**: Path before resource pattern shows who owns the resource
5. **Hierarchical Support**: Both patterns work with top-level and nested child subsystems
6. **Reserved Names**: Subsystems and child subsystems cannot be named "query"
7. **Predictable Structure**: Consistent, parseable route patterns
8. **Scalability**: Patterns scale to many resources and queries without route explosion

This grammar enables flexible, predictable message routing while maintaining structure and consistency across the system. The query pattern provides a standardized way to query subsystems, while the resource pattern provides a standardized way to identify and access resources with clear ownership semantics.

## Related Documentation

- [useRouter Hook](./hooks/router/USE-ROUTER.md) - Route registration and matching
- [SubsystemRouter](./hooks/router/SUBSYSTEM-ROUTER.md) - Router implementation
- [Message System Rationale](./MESSAGE-SYSTEM-RATIONALE.md) - Message-driven architecture rationale
- [RouteEntry](./hooks/router/ROUTE-ENTRY.md) - Individual route representation

