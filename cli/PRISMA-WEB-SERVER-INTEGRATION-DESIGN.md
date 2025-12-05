# Prisma + Web Server Integration Design for Mycelia Kernel

## Overview

This document designs how to integrate **Prisma with PostgreSQL** and a **web server** into Mycelia Kernel. This enables full-stack applications with:
- **Prisma ORM** for type-safe database access
- **PostgreSQL** as the database backend
- **Web Server** (Fastify/Express/Hono) for HTTP endpoints
- **Message-Driven Architecture** connecting all components

**Use Cases:**
- Full-stack React applications
- REST APIs
- GraphQL APIs (via Prisma)
- Microservices with database access
- Server-side rendering applications

---

## Architecture Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Mycelia Kernel                          │
│                                                             │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐ │
│  │   React UI   │    │  Web Server   │    │   DBSubsystem│ │
│  │  (Frontend)  │◄───┤  (Backend)   │◄───┤  (Prisma)    │ │
│  └──────────────┘    └──────────────┘    └──────────────┘ │
│         │                    │                    │         │
│         └────────────────────┼────────────────────┘         │
│                              │                              │
│                    ┌─────────▼─────────┐                    │
│                    │  MessageSystem    │                    │
│                    │  (Coordinator)    │                    │
│                    └───────────────────┘                    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │   PostgreSQL     │
                    │   (Database)     │
                    └──────────────────┘
```

### Component Flow

1. **React UI** → Sends HTTP requests to Web Server
2. **Web Server** → Receives HTTP requests, converts to Mycelia messages
3. **Mycelia Messages** → Route to appropriate subsystems
4. **DBSubsystem** → Uses Prisma to query PostgreSQL
5. **Prisma** → Executes queries, returns results
6. **Results** → Flow back through messages → Web Server → React UI

---

## 1. Prisma Integration with DBSubsystem

### 1.1 Architecture Option: Prisma Storage Backend

**Decision:** Add Prisma as a new storage backend to `DBSubsystem`, similar to SQLite/IndexedDB backends.

**Rationale:**
- Consistent with existing backend pattern
- Reuses DBSubsystem message handlers
- No need to create new subsystem
- Easy to switch between backends

### 1.2 Implementation Structure

```
DBSubsystem
├── Storage Backend Selection
│   ├── SQLite (existing)
│   ├── IndexedDB (existing)
│   ├── Memory (existing)
│   └── Prisma (NEW) ← Add this
│
└── Message Handlers (reused)
    ├── db://query
    ├── db://execute
    ├── db://transaction
    └── db://migrate
```

### 1.3 Prisma Storage Backend Hook

**File:** `src/messages/v2/hooks/storage/prisma/use-prisma-storage.mycelia.js`

**Purpose:** Creates a Prisma-based storage backend facet

**Key Features:**
- Wraps Prisma Client
- Implements StorageContract interface
- Handles connection pooling
- Supports transactions
- Type-safe queries via Prisma

**Generated Code Structure:**
```javascript
import { PrismaClient } from '@prisma/client';
import { createHook } from '../../../facet-contract/hook-factory.mycelia.js';

export const usePrismaStorage = createHook({
  kind: 'prismaStorage',
  required: [],
  attach: true,
  fn: (ctx, api, subsystem) => {
    const config = ctx.config?.storage?.prisma || {};
    const prisma = new PrismaClient({
      datasources: {
        db: {
          url: config.databaseUrl || process.env.DATABASE_URL
        }
      },
      log: config.log || ['error', 'warn']
    });

    return {
      // StorageContract methods
      get(key, options) { /* ... */ },
      set(key, value, options) { /* ... */ },
      delete(key, options) { /* ... */ },
      query(filter, options) { /* ... */ },
      
      // Prisma-specific methods
      prisma: prisma,  // Direct Prisma Client access
      model(modelName) { return prisma[modelName]; },
      transaction(callback) { return prisma.$transaction(callback); },
      disconnect() { return prisma.$disconnect(); }
    };
  }
});
```

### 1.4 Prisma Adapter for DBSubsystem

**File:** `src/messages/v2/hooks/storage/prisma/prisma-storage-backend.mycelia.js`

**Purpose:** Implements StorageContract using Prisma

**Key Methods:**
- `get(key, options)` - Query by key (using Prisma model)
- `set(key, value, options)` - Create/update record
- `delete(key, options)` - Delete record
- `query(filter, options)` - Complex queries using Prisma
- `transaction()` - Prisma transactions

**Example Implementation:**
```javascript
export class PrismaStorageBackend {
  constructor(options = {}) {
    this.prisma = new PrismaClient({
      datasources: {
        db: { url: options.databaseUrl || process.env.DATABASE_URL }
      }
    });
    this.modelName = options.modelName || 'StorageEntry'; // Prisma model name
  }

  async get(key, options = {}) {
    try {
      const model = this.prisma[this.modelName];
      const record = await model.findUnique({
        where: { key: key }
      });
      
      if (!record) {
        return { success: false, error: new Error(`Key "${key}" not found`) };
      }
      
      return { success: true, data: record.value };
    } catch (error) {
      return { success: false, error };
    }
  }

  async set(key, value, options = {}) {
    try {
      const model = this.prisma[this.modelName];
      const record = await model.upsert({
        where: { key: key },
        update: { value: value, updatedAt: new Date() },
        create: { key: key, value: value, createdAt: new Date(), updatedAt: new Date() }
      });
      
      return { success: true, data: record };
    } catch (error) {
      return { success: false, error };
    }
  }

  // ... other methods
}
```

### 1.5 DBSubsystem Configuration for Prisma

**Usage:**
```javascript
const dbSubsystem = new DBSubsystem('db', {
  ms: messageSystem,
  config: {
    storage: {
      backend: 'prisma',  // NEW: Prisma backend
      prisma: {
        databaseUrl: process.env.DATABASE_URL,
        modelName: 'StorageEntry',  // Prisma model to use
        log: ['error', 'warn', 'query']  // Prisma logging
      }
    }
  }
});
```

### 1.6 Prisma Schema Integration

**File:** `prisma/schema.prisma`

**Purpose:** Define Prisma schema for Mycelia storage

**Example Schema:**
```prisma
// Prisma schema for Mycelia Kernel storage
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// Storage entries (for DBSubsystem storage operations)
model StorageEntry {
  id        String   @id @default(cuid())
  namespace String   @default("default")
  key       String
  value     Json
  metadata  Json?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([namespace, key])
  @@index([namespace])
  @@index([key])
}

// Example: User model (for application data)
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

---

## 2. Web Server Integration

### 2.1 Existing ServerSubsystem

**Current State:** `ServerSubsystem` already exists and supports Fastify, Express, and Hono.

**What We Need:** Connect ServerSubsystem to DBSubsystem via messages.

### 2.2 HTTP Route → Message Flow

**Pattern:** HTTP routes convert to Mycelia messages, which route to DBSubsystem.

```
HTTP Request
    ↓
ServerSubsystem (HTTP Handler)
    ↓
Create Message (db://query, db://execute, etc.)
    ↓
MessageSystem (Route Message)
    ↓
DBSubsystem (Handle Message)
    ↓
Prisma (Execute Query)
    ↓
PostgreSQL (Return Data)
    ↓
Response flows back through chain
```

### 2.3 Example: HTTP Route Handler

**File:** `src/subsystems/api/api.routes.def.mycelia.js`

**Purpose:** Define HTTP routes that use DBSubsystem

**Example:**
```javascript
export const API_ROUTES = [
  {
    name: 'getUsers',
    path: '/api/users',
    method: 'GET',
    description: 'Get all users',
    handler: async (req, res, context) => {
      // Create message to query users
      const message = new Message('db://query', {
        model: 'User',
        action: 'findMany',
        where: {},
        include: {}
      });

      // Send message to DBSubsystem
      const result = await context.messageSystem.send(message);
      
      // Return HTTP response
      return {
        success: true,
        statusCode: 200,
        body: result.body.data
      };
    }
  },
  {
    name: 'createUser',
    path: '/api/users',
    method: 'POST',
    description: 'Create a new user',
    handler: async (req, res, context) => {
      const { email, name } = req.body;

      // Create message to create user
      const message = new Message('db://execute', {
        model: 'User',
        action: 'create',
        data: { email, name }
      });

      const result = await context.messageSystem.send(message);
      
      return {
        success: true,
        statusCode: 201,
        body: result.body.data
      };
    }
  }
];
```

### 2.4 Direct Prisma Access from Routes

**Alternative Pattern:** Routes can access Prisma directly via DBSubsystem facet.

**Example:**
```javascript
{
  name: 'getUser',
  path: '/api/users/:id',
  method: 'GET',
  handler: async (req, res, context) => {
    // Get DBSubsystem
    const dbSubsystem = context.messageSystem.find('db');
    const dbFacet = dbSubsystem.find('prismaStorage');
    
    // Use Prisma directly
    const user = await dbFacet.prisma.user.findUnique({
      where: { id: req.params.id }
    });
    
    return {
      success: true,
      statusCode: 200,
      body: user
    };
  }
}
```

---

## 3. Full-Stack Integration Pattern

### 3.1 Server Bootstrap

**File:** `server/bootstrap.js`

**Purpose:** Bootstrap Mycelia Kernel with Prisma and Web Server

**Generated Code:**
```javascript
import { MessageSystem } from './mycelia-kernel-v2/models/message-system/message-system.v2.mycelia.js';
import { DBSubsystem } from './mycelia-kernel-v2/models/subsystem/db/db.subsystem.mycelia.js';
import { ServerSubsystem } from './mycelia-kernel-v2/models/server-subsystem/server.subsystem.mycelia.js';

/**
 * Bootstrap Mycelia Kernel with Prisma and Web Server
 */
export async function bootstrap() {
  // Create MessageSystem
  const messageSystem = new MessageSystem('my-app', {
    debug: process.env.NODE_ENV === 'development'
  });

  // Bootstrap kernel
  await messageSystem.bootstrap();

  // Register DBSubsystem with Prisma
  const dbSubsystem = new DBSubsystem('db', {
    ms: messageSystem,
    config: {
      storage: {
        backend: 'prisma',
        prisma: {
          databaseUrl: process.env.DATABASE_URL,
          log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error']
        }
      }
    }
  });
  await messageSystem.registerSubsystem(dbSubsystem);

  // Register ServerSubsystem
  const serverSubsystem = new ServerSubsystem('server', {
    ms: messageSystem,
    config: {
      server: {
        type: 'fastify',  // or 'express' or 'hono'
        port: process.env.PORT || 3000,
        host: '0.0.0.0'
      }
    }
  });
  await messageSystem.registerSubsystem(serverSubsystem);

  // Start server
  const serverFacet = serverSubsystem.find('server');
  await serverFacet.start();

  console.log(`Server running on ${serverFacet.getAddress()}`);

  return { messageSystem, dbSubsystem, serverSubsystem };
}
```

### 3.2 React Frontend Integration

**File:** `src/mycelia/hooks/useAPI.js`

**Purpose:** React hook to call API endpoints

**Generated Code:**
```javascript
import { useState, useCallback } from 'react';

/**
 * useAPI - Hook to call API endpoints
 * @param {string} baseURL - Base URL for API (default: /api)
 */
export function useAPI(baseURL = '/api') {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const request = useCallback(async (endpoint, options = {}) => {
    setLoading(true);
    setError(null);

    try {
      const url = `${baseURL}${endpoint}`;
      const response = await fetch(url, {
        method: options.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        },
        body: options.body ? JSON.stringify(options.body) : undefined
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (err) {
      setError(err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [baseURL]);

  return { request, loading, error };
}
```

**Usage in React Component:**
```javascript
import { useAPI } from '../mycelia/hooks/useAPI.js';
import { useEffect, useState } from 'react';

function UserList() {
  const { request, loading, error } = useAPI();
  const [users, setUsers] = useState([]);

  useEffect(() => {
    async function fetchUsers() {
      const data = await request('/users');
      if (data) setUsers(data);
    }
    fetchUsers();
  }, []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <ul>
      {users.map(user => (
        <li key={user.id}>{user.name} ({user.email})</li>
      ))}
    </ul>
  );
}
```

---

## 4. Template Structure

### 4.1 Full-Stack Template Structure

```
<project-name>/
├── prisma/
│   ├── schema.prisma           # Prisma schema
│   ├── migrations/             # Prisma migrations
│   └── seed.js                 # Database seed script
│
├── server/
│   ├── bootstrap.js            # Server bootstrap (Mycelia + Prisma + Web Server)
│   ├── subsystems/
│   │   └── api/
│   │       ├── api.subsystem.mycelia.js
│   │       └── api.routes.def.mycelia.js
│   └── index.js                # Server entry point
│
├── src/                        # React frontend
│   ├── mycelia/
│   │   ├── bootstrap.js        # Client-side Mycelia (if needed)
│   │   ├── context.jsx
│   │   └── hooks/
│   │       ├── useAPI.js       # NEW: API hook
│   │       └── ...
│   ├── components/
│   ├── pages/
│   └── main.jsx
│
├── mycelia-kernel-v2/          # Mycelia Kernel source
├── package.json
├── .env                        # Environment variables
└── README.md
```

### 4.2 Environment Variables

**File:** `.env`

```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/mydb?schema=public"

# Server
PORT=3000
NODE_ENV=development

# Mycelia
MYCELIA_DEBUG=true
```

### 4.3 Package.json Dependencies

**File:** `package.json`

```json
{
  "name": "mycelia-prisma-app",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "concurrently \"npm run dev:server\" \"npm run dev:client\"",
    "dev:server": "node --watch server/index.js",
    "dev:client": "vite",
    "build": "npm run build:client && npm run build:server",
    "build:client": "vite build",
    "build:server": "echo 'Server build (if needed)'",
    "db:generate": "prisma generate",
    "db:migrate": "prisma migrate dev",
    "db:seed": "node prisma/seed.js",
    "db:studio": "prisma studio"
  },
  "dependencies": {
    "@prisma/client": "^5.0.0",
    "react": "^19.1.1",
    "react-dom": "^19.1.1",
    "react-router-dom": "^7.9.5"
  },
  "devDependencies": {
    "@prisma/client": "^5.0.0",
    "prisma": "^5.0.0",
    "concurrently": "^8.0.0",
    "@vitejs/plugin-react": "^5.0.4",
    "vite": "^7.1.7"
  }
}
```

---

## 5. Usage Examples

### 5.1 Create User via API

**HTTP Request:**
```bash
POST /api/users
Content-Type: application/json

{
  "email": "user@example.com",
  "name": "John Doe"
}
```

**Flow:**
1. ServerSubsystem receives HTTP request
2. Route handler creates message: `db://execute` with Prisma `create` action
3. DBSubsystem receives message
4. Prisma executes: `prisma.user.create({ data: { email, name } })`
5. PostgreSQL inserts record
6. Response flows back: `{ success: true, data: { id, email, name } }`
7. HTTP response: `201 Created` with user data

### 5.2 Query Users via API

**HTTP Request:**
```bash
GET /api/users?email=user@example.com
```

**Flow:**
1. ServerSubsystem receives HTTP request
2. Route handler creates message: `db://query` with Prisma `findMany` action
3. DBSubsystem receives message
4. Prisma executes: `prisma.user.findMany({ where: { email } })`
5. PostgreSQL queries database
6. Response flows back: `{ success: true, data: [users] }`
7. HTTP response: `200 OK` with users array

### 5.3 Transaction Example

**HTTP Request:**
```bash
POST /api/users/:id/transfer
Content-Type: application/json

{
  "toUserId": "user2",
  "amount": 100
}
```

**Flow:**
1. ServerSubsystem receives HTTP request
2. Route handler creates message: `db://transaction`
3. DBSubsystem receives message
4. Prisma executes transaction:
   ```javascript
   await prisma.$transaction(async (tx) => {
     await tx.user.update({ where: { id }, data: { balance: { decrement: amount } } });
     await tx.user.update({ where: { id: toUserId }, data: { balance: { increment: amount } } });
   });
   ```
5. PostgreSQL executes transaction atomically
6. Response flows back: `{ success: true }`
7. HTTP response: `200 OK`

---

## 6. Design Decisions

### 6.1 Why Prisma as Storage Backend?

**Decision:** Add Prisma as a DBSubsystem storage backend

**Rationale:**
- Consistent with existing pattern (SQLite, IndexedDB, Memory)
- Reuses DBSubsystem message handlers
- Easy to switch between backends
- No need for new subsystem

**Alternative Considered:**
- Separate PrismaSubsystem (more complex, duplicates functionality)

### 6.2 Why Message-Driven API?

**Decision:** HTTP routes convert to Mycelia messages

**Rationale:**
- Consistent with Mycelia architecture
- All subsystems communicate via messages
- Easy to add middleware, logging, etc.
- Decouples HTTP from database

**Alternative Considered:**
- Direct Prisma access from routes (faster, but breaks message-driven pattern)

### 6.3 Why Both Patterns?

**Decision:** Support both message-driven and direct Prisma access

**Rationale:**
- Message-driven for consistency and middleware
- Direct access for performance-critical paths
- Developer choice based on use case

---

## 7. Implementation Steps

### 7.1 Phase 1: Prisma Storage Backend

1. Create `use-prisma-storage.mycelia.js` hook
2. Create `prisma-storage-backend.mycelia.js` adapter
3. Update DBSubsystem to support `backend: 'prisma'`
4. Add Prisma schema for storage
5. Test with simple get/set operations

### 7.2 Phase 2: Web Server Integration

1. Create API subsystem with routes
2. Implement route handlers that use DBSubsystem
3. Test HTTP → Message → DB flow
4. Add error handling

### 7.3 Phase 3: Full-Stack Template

1. Create server bootstrap with Prisma + Web Server
2. Create React frontend with useAPI hook
3. Add example pages (user list, create user, etc.)
4. Document usage patterns

### 7.4 Phase 4: Advanced Features

1. Add Prisma transaction support
2. Add Prisma query builder integration
3. Add Prisma migration management
4. Add connection pooling configuration

---

## 8. Benefits

### 8.1 Type Safety

- Prisma provides type-safe database access
- TypeScript support (if using TypeScript)
- Compile-time error checking

### 8.2 Developer Experience

- Prisma Studio for database inspection
- Auto-generated migrations
- Intuitive query API

### 8.3 Performance

- Connection pooling
- Query optimization
- Efficient data fetching

### 8.4 Consistency

- Message-driven architecture
- Consistent error handling
- Unified logging

---

## 9. Summary

**Integration Approach:**
1. **Prisma** → Added as new storage backend to `DBSubsystem`
2. **Web Server** → Uses existing `ServerSubsystem` (Fastify/Express/Hono)
3. **Flow** → HTTP → Messages → DBSubsystem → Prisma → PostgreSQL

**Key Components:**
- `usePrismaStorage` hook
- `PrismaStorageBackend` adapter
- API routes that use DBSubsystem
- React `useAPI` hook for frontend

**Template Command:**
```bash
mycelia-kernel create fullstack-app <project-name> --prisma --postgres
```

**Result:**
- Full-stack application with Prisma + PostgreSQL
- Web server with HTTP API
- React frontend
- Message-driven architecture connecting all components

---

**Document Created:** January 2025

