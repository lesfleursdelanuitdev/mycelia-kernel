# Server Contract Implementation - File Structure

## Files to Create

### 1. Facet Contract

**File:** `models/facet-contract/server.contract.mycelia.js`
- Defines the `ServerContract` interface
- Specifies required methods and properties
- Includes custom validation logic
- Exports `serverContract` for registration

**Update:** `models/facet-contract/index.js`
- Import `serverContract`
- Register it in `defaultContractRegistry`
- Export it for external use

---

### 2. Fastify Server Hook

**File:** `hooks/server/use-fastify-server.mycelia.js`
- Implements `ServerContract` using Fastify
- Creates `server` facet with all required methods
- Handles lifecycle (start, stop, isRunning)
- Implements route registration (single and batch)
- Implements middleware registration
- Implements error handling
- Implements Mycelia route integration (registerMyceliaRoute, registerMyceliaCommand, registerMyceliaQuery)
- Uses `ctx.config.server` for configuration

---

### 3. Express Server Hook

**File:** `hooks/server/use-express-server.mycelia.js`
- Implements `ServerContract` using Express
- Creates `server` facet with all required methods
- Handles lifecycle (start, stop, isRunning)
- Implements route registration (single and batch)
- Implements middleware registration
- Implements error handling
- Implements Mycelia route integration (registerMyceliaRoute, registerMyceliaCommand, registerMyceliaQuery)
- Uses `ctx.config.server` for configuration

---

### 4. Server Subsystem

**File:** `models/server-subsystem/server.subsystem.mycelia.js`
- Extends `BaseSubsystem`
- Uses either `useFastifyServer` or `useExpressServer` based on `config.server.type`
- Registers internal routes to handle registration messages:
  - `route/register-mycelia` → calls `server.registerMyceliaRoute()`
  - `route/register-command` → calls `server.registerMyceliaCommand()`
  - `route/register-query` → calls `server.registerMyceliaQuery()`
  - `route/register-batch` → calls `server.registerMyceliaRoutes()`
- Implements `onInit()` to register these routes
- Name is always `'server'`

---

### 5. Server Routes Hook

**File:** `hooks/server-routes/use-server-routes.mycelia.js`
- Helper hook for other subsystems (not ServerSubsystem)
- Requires `router` and `messages` facets
- Provides helper methods:
  - `registerMyceliaRoute(myceliaPath, httpMethod, httpPath, options)`
  - `registerMyceliaCommand(commandName, httpMethod, httpPath, options)`
  - `registerMyceliaQuery(queryName, httpMethod, httpPath, options)`
  - `registerMyceliaRoutes(routes)` (batch)
- Constructs messages and sends them to `server://route/register-*` paths
- Uses `ctx.config.serverRoutes` for configuration (debug flag)

---

## Complete File Tree

```
/apps/mycelia-kernel/src/messages/v2/
├── models/
│   ├── facet-contract/
│   │   ├── server.contract.mycelia.js          [NEW]
│   │   └── index.js                             [UPDATE - register serverContract]
│   │
│   └── server-subsystem/
│       └── server.subsystem.mycelia.js          [NEW]
│
└── hooks/
    ├── server/
    │   ├── use-fastify-server.mycelia.js        [NEW]
    │   └── use-express-server.mycelia.js        [NEW]
    │
    └── server-routes/
        └── use-server-routes.mycelia.js         [NEW]
```

---

## File Details

### `models/facet-contract/server.contract.mycelia.js`
- **Purpose**: Define the ServerContract interface
- **Exports**: `serverContract` (FacetContract instance)
- **Dependencies**: `createFacetContract` from `./facet-contract.mycelia.js`

### `models/facet-contract/index.js` (UPDATE)
- **Changes**: 
  - Import `serverContract`
  - Register in `defaultContractRegistry`
  - Export `serverContract`

### `hooks/server/use-fastify-server.mycelia.js`
- **Purpose**: Fastify implementation of ServerContract
- **Exports**: `useFastifyServer` hook
- **Dependencies**: 
  - `createHook` from `../create-hook.mycelia.js`
  - `Facet` from `../../models/facet-manager/facet.mycelia.js`
  - Fastify library (external dependency)
- **Configuration**: `ctx.config.server` (port, host, fastify-specific options)

### `hooks/server/use-express-server.mycelia.js`
- **Purpose**: Express implementation of ServerContract
- **Exports**: `useExpressServer` hook
- **Dependencies**:
  - `createHook` from `../create-hook.mycelia.js`
  - `Facet` from `../../models/facet-manager/facet.mycelia.js`
  - Express library (external dependency)
- **Configuration**: `ctx.config.server` (port, host, express-specific options)

### `models/server-subsystem/server.subsystem.mycelia.js`
- **Purpose**: Subsystem that manages HTTP server and handles route registration messages
- **Exports**: `ServerSubsystem` class
- **Extends**: `BaseSubsystem`
- **Dependencies**:
  - `BaseSubsystem` from `../base-subsystem/base.subsystem.mycelia.js`
  - `useFastifyServer` from `../../hooks/server/use-fastify-server.mycelia.js`
  - `useExpressServer` from `../../hooks/server/use-express-server.mycelia.js`
- **Configuration**: `config.server.type` ('fastify' | 'express')
- **Name**: Always `'server'`

### `hooks/server-routes/use-server-routes.mycelia.js`
- **Purpose**: Helper hook for other subsystems to register routes via messages
- **Exports**: `useServerRoutes` hook
- **Dependencies**:
  - `createHook` from `../create-hook.mycelia.js`
  - `Facet` from `../../models/facet-manager/facet.mycelia.js`
- **Required Facets**: `router`, `messages`
- **Configuration**: `ctx.config.serverRoutes` (debug flag)

---

## Summary

**Total New Files:** 5
- 1 facet contract
- 2 server hooks (Fastify, Express)
- 1 subsystem
- 1 helper hook

**Total Updated Files:** 1
- 1 contract registry index

**Total:** 6 files (5 new, 1 update)


