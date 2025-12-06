# Fullstack Template Implementation

## Overview

The fullstack template generator has been implemented to create a complete full-stack application with:
- **React** frontend with Vite
- **Tailwind CSS v13** for styling
- **Hono** web framework
- **Prisma** ORM
- **Mycelia v2** backend architecture
- **JavaScript** (ES Modules) - no TypeScript

## Files Created

### 1. Template Generator
- **File**: `cli/src/generators/fullstack-generator.js`
- **Purpose**: Generates all files for a fullstack project
- **Features**:
  - Creates complete directory structure
  - Generates configuration files (package.json, vite.config.js, tailwind.config.js, etc.)
  - Sets up Prisma schema
  - Creates server files (bootstrap, API subsystem, routes)
  - Creates client files (React components, API client)
  - Generates environment files and README

### 2. Create Command
- **File**: `cli/src/commands/create.js`
- **Purpose**: CLI command handler for creating projects from templates
- **Usage**: `mycelia-kernel create fullstack <project-name> [options]`

### 3. CLI Integration
- **File**: `cli/bin/mycelia-kernel.js`
- **Changes**: Added `create` command with options:
  - `--database <type>` - Database type (postgresql, mysql, sqlite)
  - `--with-auth` - Include authentication
  - `--with-websocket` - Include WebSocket support
  - `--package-manager <manager>` - Package manager (npm, yarn, pnpm)

## Usage

```bash
# Create a new fullstack project
mycelia-kernel create fullstack my-app

# With options
mycelia-kernel create fullstack my-app --database postgresql --with-auth

# With custom package manager
mycelia-kernel create fullstack my-app --package-manager pnpm
```

## Generated Project Structure

```
my-app/
├── .env.example              # Environment variables template
├── .gitignore                # Git ignore patterns
├── package.json              # Dependencies and scripts
├── vite.config.js            # Vite configuration
├── tailwind.config.js        # Tailwind CSS v13 configuration
├── postcss.config.js         # PostCSS configuration
├── index.html                # HTML entry point
├── prisma/
│   ├── schema.prisma         # Prisma schema
│   └── seed.js               # Database seed script
├── src/
│   ├── client/               # React frontend
│   │   ├── main.jsx          # React entry point
│   │   ├── App.jsx            # Root component
│   │   ├── components/        # React components
│   │   ├── hooks/             # React hooks
│   │   ├── lib/               # Frontend utilities
│   │   │   └── api.js         # API client
│   │   ├── styles/            # CSS files
│   │   │   └── index.css      # Tailwind imports
│   │   └── types/             # TypeScript types (empty for JS)
│   ├── server/                # Backend (Mycelia + Hono)
│   │   ├── index.js           # Server entry point
│   │   ├── bootstrap.js       # Mycelia bootstrap
│   │   ├── subsystems/        # Mycelia subsystems
│   │   │   └── api/           # API subsystem
│   │   │       ├── api.subsystem.js
│   │   │       └── api.routes.js
│   │   ├── lib/               # Backend utilities
│   │   │   └── prisma.js      # Prisma client singleton
│   │   └── types/             # TypeScript types (empty for JS)
│   └── shared/                # Shared code
│       ├── types/             # Shared types
│       └── utils/             # Shared utilities
├── public/                    # Static assets
└── mycelia-kernel-v2/         # Mycelia Kernel v2 source
```

## Key Features

### 1. Server Setup
- **Bootstrap**: Initializes MessageSystem, Kernel, Database, Server, and API subsystems
- **API Subsystem**: Handles API routes and bridges Hono with Mycelia
- **Prisma Integration**: Uses `usePrisma` hook for database access
- **Hono Server**: Configured via Mycelia's `ServerSubsystem` with `useHonoServer` hook

### 2. Client Setup
- **React + Vite**: Fast development server with HMR
- **Tailwind CSS v13**: Utility-first CSS framework
- **API Client**: Simple fetch-based API client
- **Component Structure**: Organized with ui/ and features/ directories

### 3. Database Setup
- **Prisma Schema**: Includes StorageEntry model for Mycelia storage
- **Example Model**: User model for demonstration
- **Seed Script**: Database seeding functionality
- **Migrations**: Ready for Prisma migrations

### 4. Development Workflow
- **Concurrent Scripts**: Runs frontend and backend together
- **Hot Reload**: Vite HMR for frontend, node --watch for backend
- **Environment Variables**: Template with sensible defaults
- **Package Scripts**: Comprehensive npm scripts for all operations

## Next Steps After Generation

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your database URL
   ```

3. **Set up database**:
   ```bash
   npx prisma migrate dev --name init
   npx prisma generate
   npx prisma db seed
   ```

4. **Start development**:
   ```bash
   npm run dev
   ```

## Integration Points

### Hono ↔ Mycelia
- Uses `ServerSubsystem` with `useHonoServer` hook
- Routes registered via `registerMyceliaRoute()`
- Messages flow: HTTP → Mycelia Message → Subsystem Handler → Response

### Prisma ↔ Mycelia
- Uses `usePrisma` hook for direct Prisma client access
- Storage operations use `usePrismaStorage` hook
- Shared Prisma client instance via singleton pattern

### React ↔ Backend
- API client uses fetch with base URL from environment
- Type-safe API calls (can be enhanced with Hono RPC client)
- CORS configured for development

## Configuration Options

### Database Types
- **postgresql**: PostgreSQL database (default)
- **mysql**: MySQL database
- **sqlite**: SQLite database (file-based)

### Package Managers
- **npm**: npm (default)
- **yarn**: Yarn package manager
- **pnpm**: pnpm package manager

## Future Enhancements

1. **Authentication Template**: Add JWT-based auth when `--with-auth` is used
2. **WebSocket Support**: Add WebSocket subsystem when `--with-websocket` is used
3. **Testing Setup**: Add Vitest configuration
4. **Docker Support**: Add Dockerfile and docker-compose.yml
5. **CI/CD Templates**: Add GitHub Actions workflows

## Notes

- All files use JavaScript (ES Modules), not TypeScript
- Tailwind CSS v13 is used (not v4) for compatibility
- The template follows Mycelia v2 architecture patterns
- Server uses Mycelia's ServerSubsystem for HTTP handling
- Prisma client is shared via singleton pattern
- Development scripts use `concurrently` for running multiple processes


