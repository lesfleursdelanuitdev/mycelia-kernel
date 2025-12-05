# Mycelia Full-Stack Template Design

## Overview

This document designs a CLI template for creating full-stack applications using:
- **Mycelia v2** - Backend subsystem architecture
- **React** - Frontend UI framework
- **Tailwind CSS v13** - Utility-first CSS framework (v13 specifically, as v4 has compatibility issues)
- **Prisma** - Type-safe database ORM
- **Hono** - Ultrafast web framework for the Edge

## Template Command

```bash
mycelia-kernel create fullstack <project-name> [options]
```

**Options:**
- `--database <type>` - Database type: `postgresql`, `mysql`, `sqlite` (default: `postgresql`)
- `--with-auth` - Include authentication subsystem
- `--with-websocket` - Include WebSocket support
- `--package-manager <npm|yarn|pnpm>` - Package manager preference (default: `npm`)

---

## Architecture Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Full-Stack Application                    │
│                                                             │
│  ┌──────────────────┐         ┌──────────────────┐          │
│  │   React Frontend │◄───────┤   Hono Server    │          │
│  │   (Vite + Tailwind)│       │   (HTTP API)     │          │
│  └──────────────────┘         └──────────────────┘          │
│         │                              │                     │
│         │                              │                    │
│         │                    ┌─────────▼─────────┐          │
│         │                    │  Mycelia Kernel   │          │
│         │                    │  (MessageSystem)  │          │
│         │                    └─────────┬─────────┘          │
│         │                              │                    │
│         │                    ┌─────────▼─────────┐          │
│         │                    │  Prisma ORM       │          │
│         │                    │  (Database)       │          │
│         └────────────────────┴────────────────────┘          │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Technology Stack

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| **Frontend** | React | Latest | UI components |
| **Frontend Build** | Vite | Latest | Fast build tool |
| **Styling** | Tailwind CSS | v13.x | Utility-first CSS |
| **Backend** | Hono | Latest | HTTP server |
| **Backend Framework** | Mycelia v2 | Latest | Message-based architecture |
| **Database ORM** | Prisma | Latest | Type-safe database access |
| **Database** | PostgreSQL/MySQL/SQLite | - | Data persistence |
| **TypeScript** | TypeScript | Latest | Type safety |

---

## Project Structure

```
<project-name>/
├── .env.example                 # Environment variables template
├── .env                         # Environment variables (gitignored)
├── .gitignore                   # Git ignore patterns
├── package.json                 # Dependencies and scripts
├── tsconfig.json                # TypeScript configuration
├── vite.config.ts               # Vite configuration
├── tailwind.config.js           # Tailwind CSS v13 configuration
├── postcss.config.js            # PostCSS configuration
├── prisma/
│   ├── schema.prisma            # Prisma schema
│   └── seed.ts                  # Database seed script
├── src/
│   ├── client/                  # React frontend
│   │   ├── index.html           # HTML entry point
│   │   ├── main.tsx             # React entry point
│   │   ├── App.tsx              # Root React component
│   │   ├── components/          # React components
│   │   │   ├── ui/              # Reusable UI components
│   │   │   └── features/        # Feature-specific components
│   │   ├── hooks/               # React hooks
│   │   ├── lib/                 # Frontend utilities
│   │   │   ├── api.ts           # API client (Hono fetch)
│   │   │   └── utils.ts         # Utility functions
│   │   ├── styles/              # Global styles
│   │   │   └── index.css        # Tailwind imports
│   │   └── types/               # TypeScript types
│   ├── server/                  # Backend (Mycelia + Hono)
│   │   ├── index.ts             # Server entry point
│   │   ├── bootstrap.ts         # Mycelia bootstrap
│   │   ├── subsystems/         # Mycelia subsystems
│   │   │   ├── api/             # API subsystem
│   │   │   │   ├── api.subsystem.ts
│   │   │   │   └── api.routes.ts
│   │   │   └── database/        # Database subsystem
│   │   │       └── database.subsystem.ts
│   │   ├── hooks/               # Custom Mycelia hooks
│   │   ├── lib/                 # Backend utilities
│   │   │   └── prisma.ts        # Prisma client singleton
│   │   └── types/               # TypeScript types
│   └── shared/                  # Shared code (frontend + backend)
│       ├── types/               # Shared TypeScript types
│       └── utils/               # Shared utilities
├── public/                      # Static assets
│   └── favicon.ico
├── mycelia-kernel-v2/           # Mycelia Kernel v2 source (from init)
└── README.md                    # Project documentation
```

---

## Detailed Component Design

### 1. Frontend (React + Vite + Tailwind)

#### 1.1 Entry Point (`src/client/main.tsx`)

```typescript
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

#### 1.2 API Client (`src/client/lib/api.ts`)

**Purpose:** Type-safe API client using Hono's RPC client

```typescript
import { hc } from 'hono/client';
import type { AppType } from '../../server/index';

// Create Hono RPC client for type-safe API calls
export const api = hc<AppType>(import.meta.env.VITE_API_URL || 'http://localhost:3000');
```

#### 1.3 Tailwind Configuration (`tailwind.config.js`)

**Important:** Use Tailwind CSS v13 (not v4)

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/client/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

#### 1.4 Vite Configuration (`vite.config.ts`)

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@client': path.resolve(__dirname, './src/client'),
      '@server': path.resolve(__dirname, './src/server'),
      '@shared': path.resolve(__dirname, './src/shared'),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
```

### 2. Backend (Mycelia + Hono + Prisma)

#### 2.1 Server Entry Point (`src/server/index.ts`)

**Purpose:** Hono app that integrates with Mycelia

```typescript
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { bootstrapMycelia } from './bootstrap';

// Create Hono app
const app = new Hono();

// Middleware
app.use('*', logger());
app.use('*', cors({
  origin: ['http://localhost:5173'], // Vite dev server
  credentials: true,
}));

// Initialize Mycelia and register routes
let myceliaReady = false;

async function initializeMycelia() {
  if (myceliaReady) return;
  
  const messageSystem = await bootstrapMycelia();
  const serverSubsystem = messageSystem.find('server');
  
  if (serverSubsystem) {
    // Register Hono routes from Mycelia subsystems
    // This will be handled by the API subsystem
  }
  
  myceliaReady = true;
}

// Health check
app.get('/health', (c) => {
  return c.json({ status: 'ok', mycelia: myceliaReady });
});

// Initialize on startup
initializeMycelia().catch(console.error);

export default app;
export type AppType = typeof app;
```

#### 2.2 Mycelia Bootstrap (`src/server/bootstrap.ts`)

**Purpose:** Initialize Mycelia MessageSystem with all subsystems

```typescript
import { MessageSystem } from '../../mycelia-kernel-v2/models/message-system/message-system.v2.mycelia.js';
import { KernelSubsystem } from '../../mycelia-kernel-v2/models/kernel-subsystem/kernel.subsystem.mycelia.js';
import { ServerSubsystem } from '../../mycelia-kernel-v2/models/server-subsystem/server.subsystem.mycelia.js';
import { DBSubsystem } from '../../mycelia-kernel-v2/models/subsystem/db/db.subsystem.mycelia.js';
import { ApiSubsystem } from './subsystems/api/api.subsystem';
import { getPrismaClient } from './lib/prisma';

export async function bootstrapMycelia() {
  // Create MessageSystem
  const messageSystem = new MessageSystem('app', {
    debug: process.env.NODE_ENV === 'development',
  });

  // Bootstrap kernel
  const kernel = new KernelSubsystem('kernel', {
    ms: messageSystem,
    debug: process.env.NODE_ENV === 'development',
  });
  await kernel.bootstrap();

  // Create database subsystem with Prisma
  const dbSubsystem = new DBSubsystem('database', {
    ms: messageSystem,
    config: {
      storage: {
        prisma: {
          client: getPrismaClient(),
          modelName: 'StorageEntry',
        },
      },
    },
  });
  await dbSubsystem.build();
  await messageSystem.registerSubsystem(dbSubsystem);

  // Create server subsystem with Hono
  const serverSubsystem = new ServerSubsystem('server', {
    ms: messageSystem,
    config: {
      server: {
        type: 'hono',
        port: 3000,
        host: '0.0.0.0',
      },
    },
  });
  await serverSubsystem.build();
  await messageSystem.registerSubsystem(serverSubsystem);

  // Create API subsystem
  const apiSubsystem = new ApiSubsystem('api', {
    ms: messageSystem,
  });
  await apiSubsystem.build();
  await messageSystem.registerSubsystem(apiSubsystem);

  return messageSystem;
}
```

#### 2.3 Prisma Client (`src/server/lib/prisma.ts`)

**Purpose:** Singleton Prisma client instance

```typescript
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const getPrismaClient = () => {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = new PrismaClient({
      log: process.env.NODE_ENV === 'development' 
        ? ['query', 'error', 'warn'] 
        : ['error'],
    });
  }
  return globalForPrisma.prisma;
};
```

#### 2.4 API Subsystem (`src/server/subsystems/api/api.subsystem.ts`)

**Purpose:** Subsystem that handles API routes and bridges Hono with Mycelia

```typescript
import { BaseSubsystem } from '../../../../mycelia-kernel-v2/models/base-subsystem/base.subsystem.mycelia.js';
import { createCanonicalDefaultHooks } from '../../../../mycelia-kernel-v2/models/defaults/default-hooks.mycelia.js';
import { useRouter } from '../../../../mycelia-kernel-v2/hooks/router/use-router.mycelia.js';
import { useMessages } from '../../../../mycelia-kernel-v2/hooks/messages/use-messages.mycelia.js';
import { usePrisma } from '../../../../mycelia-kernel-v2/hooks/prisma/use-prisma.mycelia.js';
import { getPrismaClient } from '../../lib/prisma';
import { registerApiRoutes } from './api.routes';

export class ApiSubsystem extends BaseSubsystem {
  constructor(name = 'api', options = {}) {
    super(name, options);
    
    // Use canonical defaults (includes router, messages, queue, etc.)
    this.defaultHooks = createCanonicalDefaultHooks();
    
    // Add Prisma hook for database access
    this.use(usePrisma);
    
    // Register routes on initialization
    this.onInit(async (api, ctx) => {
      await registerApiRoutes(this);
    });
  }
}
```

#### 2.5 API Routes (`src/server/subsystems/api/api.routes.ts`)

**Purpose:** Define API routes that bridge HTTP (Hono) with Mycelia messages

```typescript
import { BaseSubsystem } from '../../../../mycelia-kernel-v2/models/base-subsystem/base.subsystem.mycelia.js';

export async function registerApiRoutes(subsystem: BaseSubsystem) {
  const serverSubsystem = subsystem.messageSystem.find('server');
  if (!serverSubsystem) {
    throw new Error('Server subsystem not found');
  }

  // Example: Register a user route
  await serverSubsystem.server.registerMyceliaRoute(
    'api://users/get/{id}',
    'GET',
    '/api/users/:id'
  );

  // Register route handler in API subsystem
  subsystem.registerRoute('api://users/get/{id}', async (message, params) => {
    const prisma = subsystem.find('prisma');
    if (!prisma) {
      throw new Error('Prisma facet not found');
    }

    const userId = params.id;
    const user = await prisma.client.user.findUnique({
      where: { id: userId },
    });

    return {
      success: true,
      data: user,
    };
  });

  // Register more routes...
}
```

### 3. Prisma Integration

#### 3.1 Prisma Schema (`prisma/schema.prisma`)

```prisma
// This is your Prisma schema file,
// learn more about it in the docs: https://pris.ly/d/prisma-schema

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql" // or "mysql" or "sqlite"
  url      = env("DATABASE_URL")
}

// StorageEntry model for Mycelia storage hook
model StorageEntry {
  id        String   @id @default(cuid())
  namespace String
  key       String
  value     String   @db.Text
  metadata  Json?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([namespace, key])
  @@index([namespace])
  @@map("storage_entries")
}

// Example User model
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("users")
}
```

#### 3.2 Database Seed (`prisma/seed.ts`)

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Seed example data
  const user = await prisma.user.upsert({
    where: { email: 'user@example.com' },
    update: {},
    create: {
      email: 'user@example.com',
      name: 'Example User',
    },
  });

  console.log('Seeded user:', user);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

### 4. Environment Configuration

#### 4.1 Environment Variables (`.env.example`)

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/mydb?schema=public"

# Server
PORT=3000
NODE_ENV=development

# Frontend
VITE_API_URL=http://localhost:3000
```

---

## Integration Points

### 1. Hono ↔ Mycelia Integration

**Flow:**
1. HTTP request arrives at Hono server
2. Hono middleware processes request
3. Request is converted to Mycelia message
4. Message is routed through Mycelia MessageSystem
5. Subsystem processes message
6. Response is converted back to HTTP response

**Implementation:**
- Use `ServerSubsystem` with `useHonoServer` hook
- Register routes via `registerMyceliaRoute()`
- Messages flow: `HTTP → Mycelia Message → Subsystem Handler → Response`

### 2. Prisma ↔ Mycelia Integration

**Flow:**
1. Subsystem uses `usePrisma` hook
2. Prisma client is available via `subsystem.find('prisma')`
3. Direct Prisma queries in route handlers
4. Storage operations use `usePrismaStorage` hook

**Implementation:**
- `usePrisma` hook provides direct Prisma client access
- `usePrismaStorage` hook provides storage abstraction
- Both hooks share the same Prisma client instance

### 3. React ↔ Hono Integration

**Flow:**
1. React component calls API via Hono RPC client
2. Hono RPC client makes HTTP request
3. Hono server receives request
4. Request is processed by Mycelia
5. Response is returned to React component

**Implementation:**
- Use Hono's RPC client (`hc`) for type-safe API calls
- TypeScript types are shared between frontend and backend
- API client is configured with base URL from environment

---

## Development Workflow

### 1. Initial Setup

```bash
# Create project
mycelia-kernel create fullstack my-app --database postgresql

# Install dependencies
cd my-app
npm install

# Setup database
cp .env.example .env
# Edit .env with your database URL
npx prisma migrate dev --name init
npx prisma generate
npx prisma db seed

# Start development servers
npm run dev
```

### 2. Development Scripts

**package.json scripts:**
```json
{
  "scripts": {
    "dev": "concurrently \"npm run dev:server\" \"npm run dev:client\"",
    "dev:server": "tsx watch src/server/index.ts",
    "dev:client": "vite",
    "build": "npm run build:server && npm run build:client",
    "build:server": "tsc && node dist/server/index.js",
    "build:client": "vite build",
    "prisma:generate": "prisma generate",
    "prisma:migrate": "prisma migrate dev",
    "prisma:studio": "prisma studio",
    "prisma:seed": "tsx prisma/seed.ts"
  }
}
```

### 3. Adding New Features

**1. Add a new API route:**
```typescript
// In src/server/subsystems/api/api.routes.ts
subsystem.registerRoute('api://posts/create', async (message, params) => {
  const prisma = subsystem.find('prisma');
  const post = await prisma.client.post.create({
    data: message.body,
  });
  return { success: true, data: post };
});
```

**2. Add a new React component:**
```typescript
// In src/client/components/features/PostList.tsx
import { api } from '@/client/lib/api';

export function PostList() {
  const { data } = api.posts.list.$get.useQuery();
  
  return (
    <div className="space-y-4">
      {data?.posts.map(post => (
        <div key={post.id} className="p-4 border rounded">
          {post.title}
        </div>
      ))}
    </div>
  );
}
```

---

## Build & Deployment

### 1. Production Build

```bash
# Build both frontend and backend
npm run build

# Start production server
npm start
```

### 2. Deployment Considerations

**Frontend:**
- Vite builds static assets to `dist/`
- Can be served by CDN or static hosting
- Or served by Hono server in production

**Backend:**
- TypeScript compiles to `dist/`
- Requires Node.js runtime
- Database connection via `DATABASE_URL`
- Mycelia subsystems are initialized at startup

**Environment Variables:**
- Production `.env` must be configured
- Database migrations must be run
- Prisma client must be generated

---

## CLI Template Generator Design

### Template Structure

```
cli/templates/
└── fullstack/
    ├── template.json              # Template metadata
    ├── files/                     # Template files
    │   ├── package.json.template
    │   ├── tsconfig.json.template
    │   ├── vite.config.ts.template
    │   ├── tailwind.config.js.template
    │   ├── prisma/
    │   │   └── schema.prisma.template
    │   └── src/
    │       ├── client/
    │       │   ├── main.tsx.template
    │       │   ├── App.tsx.template
    │       │   └── ...
    │       └── server/
    │           ├── index.ts.template
    │           ├── bootstrap.ts.template
    │           └── ...
    └── prompts.js                 # Interactive prompts
```

### Template Generation Flow

1. **User runs command:**
   ```bash
   mycelia-kernel create fullstack my-app
   ```

2. **CLI prompts for options:**
   - Database type (postgresql/mysql/sqlite)
   - Include auth? (yes/no)
   - Include websocket? (yes/no)
   - Package manager (npm/yarn/pnpm)

3. **CLI generates project:**
   - Creates directory structure
   - Copies template files
   - Replaces template variables
   - Runs `mycelia-kernel init` internally
   - Generates Prisma schema based on database type
   - Creates initial React components
   - Sets up development scripts

4. **Post-generation:**
   - Installs dependencies (if `--install` flag)
   - Generates Prisma client
   - Creates initial migration
   - Seeds database (if seed file exists)

---

## Key Design Decisions

### 1. Why Tailwind v13 (not v4)?

- **Compatibility:** Tailwind v4 has breaking changes and compatibility issues
- **Stability:** v13 is stable and widely used
- **Ecosystem:** Better plugin support in v13

### 2. Why Hono (not Express/Fastify)?

- **Performance:** Hono is optimized for Edge runtime
- **Type Safety:** Better TypeScript support with RPC client
- **Modern:** Built for modern JavaScript/TypeScript
- **Already Supported:** Mycelia has `useHonoServer` hook

### 3. Why Separate Frontend/Backend?

- **Flexibility:** Frontend can be deployed separately
- **Development:** Independent development workflows
- **Scalability:** Can scale frontend and backend independently
- **Type Safety:** Shared types between frontend and backend

### 4. Why Prisma?

- **Type Safety:** Generated TypeScript types
- **Developer Experience:** Excellent tooling and migrations
- **Mycelia Integration:** Already has `usePrisma` and `usePrismaStorage` hooks
- **Database Agnostic:** Supports PostgreSQL, MySQL, SQLite

---

## Future Enhancements

1. **Authentication Template:**
   - JWT-based auth
   - Session management
   - Protected routes

2. **WebSocket Support:**
   - Real-time updates
   - Mycelia WebSocket subsystem integration

3. **Testing Setup:**
   - Vitest for frontend
   - Vitest for backend
   - E2E testing with Playwright

4. **Docker Support:**
   - Dockerfile for production
   - docker-compose for development
   - Database container setup

5. **CI/CD Templates:**
   - GitHub Actions
   - GitLab CI
   - Deployment scripts

---

## Summary

This template provides a complete full-stack development experience with:
- ✅ React frontend with Tailwind CSS v13
- ✅ Hono backend with Mycelia v2 integration
- ✅ Prisma for type-safe database access
- ✅ TypeScript throughout
- ✅ Development and production workflows
- ✅ CLI tooling for project generation

The architecture is designed to be:
- **Modular:** Each layer is independent
- **Type-Safe:** TypeScript and Prisma provide end-to-end type safety
- **Scalable:** Can grow from prototype to production
- **Developer-Friendly:** Excellent DX with hot reload, type checking, etc.

