/**
 * Fullstack Template Generator
 * Generates a full-stack application with React, Tailwind CSS v13, Prisma, Hono, and Mycelia
 */

import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { copyDirectory, createDirectory, toKebabCase } from '../utils/file-utils.js';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export async function generateFullstackTemplate(projectName, options = {}) {
  const cwd = process.cwd();
  const projectDir = join(cwd, projectName);
  const databaseType = options.database || 'postgresql';
  const withAuth = options.withAuth || false;
  const withWebsocket = options.withWebsocket || false;
  const packageManager = options.packageManager || 'npm';

  console.log(`Creating fullstack project: ${projectName}`);
  console.log(`Database: ${databaseType}`);
  console.log(`Auth: ${withAuth ? 'Yes' : 'No'}`);
  console.log(`WebSocket: ${withWebsocket ? 'Yes' : 'No'}`);

  // Check if directory already exists
  if (existsSync(projectDir)) {
    console.error(`Error: Directory "${projectName}" already exists`);
    process.exit(1);
  }

  try {
    // Create project directory
    mkdirSync(projectDir, { recursive: true });

    // Initialize Mycelia Kernel first
    console.log('Initializing Mycelia Kernel...');
    await initializeMyceliaKernel(projectDir, projectName);

    // Create directory structure
    console.log('Creating directory structure...');
    createFullstackDirectories(projectDir);

    // Generate configuration files
    console.log('Generating configuration files...');
    generateConfigFiles(projectDir, projectName, databaseType, packageManager);

    // Generate Prisma schema
    console.log('Generating Prisma schema...');
    generatePrismaSchema(projectDir, databaseType);

    // Generate server files
    console.log('Generating server files...');
    generateServerFiles(projectDir, projectName, withAuth, withWebsocket);

    // Generate client files
    console.log('Generating client files...');
    generateClientFiles(projectDir, projectName);

    // Generate shared files
    console.log('Generating shared files...');
    generateSharedFiles(projectDir);

    // Generate environment files
    console.log('Generating environment files...');
    generateEnvironmentFiles(projectDir, databaseType);

    // Generate README
    console.log('Generating README...');
    generateREADME(projectDir, projectName, databaseType, withAuth, withWebsocket);

    console.log(`\n✅ Fullstack project created successfully!`);
    console.log(`\nNext steps:`);
    console.log(`  1. cd ${projectName}`);
    console.log(`  2. ${packageManager} install`);
    console.log(`  3. cp .env.example .env`);
    console.log(`  4. Edit .env with your database URL`);
    console.log(`  5. ${packageManager === 'npm' ? 'npx' : packageManager === 'yarn' ? 'yarn' : 'pnpm'} prisma migrate dev --name init`);
    console.log(`  6. ${packageManager === 'npm' ? 'npx' : packageManager === 'yarn' ? 'yarn' : 'pnpm'} prisma generate`);
    console.log(`  7. ${packageManager} run dev`);
  } catch (error) {
    console.error('Error creating fullstack project:', error.message);
    process.exit(1);
  }
}

async function initializeMyceliaKernel(projectDir, projectName) {
  // Copy mycelia-kernel-v2
  const kernelSource = join(__dirname, '../../../../src/messages/v2');
  const kernelDest = join(projectDir, 'mycelia-kernel-v2');
  
  await copyDirectory(kernelSource, kernelDest, {
    exclude: [
      'tests',
      'CODEBASE_ANALYSIS',
      'node_modules'
    ]
  });
}

function createFullstackDirectories(projectDir) {
  const dirs = [
    'src/client/components/ui',
    'src/client/components/features',
    'src/client/hooks',
    'src/client/lib',
    'src/client/styles',
    'src/client/types',
    'src/server/subsystems/api',
    'src/server/subsystems/database',
    'src/server/hooks',
    'src/server/lib',
    'src/server/types',
    'src/shared/types',
    'src/shared/utils',
    'public',
    'prisma'
  ];

  dirs.forEach(dir => {
    createDirectory(join(projectDir, dir));
  });
}

function generateConfigFiles(projectDir, projectName, databaseType, packageManager) {
  const kebabName = toKebabCase(projectName);

  // package.json
  const packageJson = {
    name: kebabName,
    version: '1.0.0',
    type: 'module',
    scripts: {
      dev: 'concurrently "npm run dev:server" "npm run dev:client"',
      'dev:server': 'node --watch src/server/index.js',
      'dev:client': 'vite',
      build: 'npm run build:server && npm run build:client',
      'build:server': 'node src/server/index.js',
      'build:client': 'vite build',
      'prisma:generate': 'prisma generate',
      'prisma:migrate': 'prisma migrate dev',
      'prisma:studio': 'prisma studio',
      'prisma:seed': 'node prisma/seed.js',
      start: 'node src/server/index.js'
    },
    dependencies: {
      'react': '^18.2.0',
      'react-dom': '^18.2.0',
      'hono': '^4.6.11',
      '@hono/node-server': '^1.19.6',
      '@prisma/client': '^5.20.0',
      'mycelia-kernel-v2': 'file:./mycelia-kernel-v2'
    },
    devDependencies: {
      '@vitejs/plugin-react': '^4.3.1',
      'vite': '^5.4.0',
      'tailwindcss': '^3.4.0',
      'postcss': '^8.4.38',
      'autoprefixer': '^10.4.19',
      'prisma': '^5.20.0',
      'concurrently': '^9.1.0'
    }
  };

  writeFileSync(join(projectDir, 'package.json'), JSON.stringify(packageJson, null, 2));

  // vite.config.js
  const viteConfig = `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
`;

  writeFileSync(join(projectDir, 'vite.config.js'), viteConfig);

  // tailwind.config.js
  const tailwindConfig = `/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/client/**/*.{js,jsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
`;

  writeFileSync(join(projectDir, 'tailwind.config.js'), tailwindConfig);

  // postcss.config.js
  const postcssConfig = `export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
`;

  writeFileSync(join(projectDir, 'postcss.config.js'), postcssConfig);

  // .gitignore
  const gitignore = `# Dependencies
node_modules/

# Build outputs
dist/
build/

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Logs
*.log
npm-debug.log*

# Environment
.env
.env.local
.env.*.local

# Mycelia Kernel
.mycelia-kernel

# Prisma
prisma/migrations/
`;

  writeFileSync(join(projectDir, '.gitignore'), gitignore);
}

function generatePrismaSchema(projectDir, databaseType) {
  const provider = databaseType === 'postgresql' ? 'postgresql' : 
                   databaseType === 'mysql' ? 'mysql' : 'sqlite';

  const schema = `// This is your Prisma schema file,
// learn more about it in the docs: https://pris.ly/d/prisma-schema

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "${provider}"
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
`;

  writeFileSync(join(projectDir, 'prisma/schema.prisma'), schema);

  // Prisma seed file
  const seed = `import { PrismaClient } from '@prisma/client';

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
`;

  writeFileSync(join(projectDir, 'prisma/seed.js'), seed);
}

function generateServerFiles(projectDir, projectName, withAuth, withWebsocket) {
  // server/index.js
  const websocketSection = withWebsocket ? `
    if (websocketSubsystem) {
      const wsPort = parseInt(process.env.WS_PORT || '8080');
      const wsHost = process.env.WS_HOST || '0.0.0.0';
      const wsPath = process.env.WS_PATH || '/ws';
      
      const websocketFacet = websocketSubsystem.find('websocket') || websocketSubsystem.websocket;
      if (!websocketFacet) {
        console.warn('WebSocket facet not found');
      } else {
        await websocketFacet.start({
          port: wsPort,
          host: wsHost,
          path: wsPath,
        });
        
        console.log(\`✅ WebSocket Server running on ws://\${wsHost}:\${wsPort}\${wsPath}\`);
      }
    } else {
      console.warn('Warning: WebSocket subsystem not found');
    }` : '';

  const serverIndex = `import { bootstrapMycelia } from './bootstrap.js';
import { startServers } from './start-servers.mycelia.js';

/**
 * Main server entry point
 * Bootstraps Mycelia and starts all configured servers
 */
async function start() {
  try {
    console.log('Starting Mycelia server...');
    
    // Bootstrap Mycelia (registers all subsystems)
    const messageSystem = await bootstrapMycelia();
    
    // Start all servers (HTTP and WebSocket)
    const servers = await startServers(messageSystem, {
      startHttp: process.env.START_HTTP !== 'false',
      startWebSocket: process.env.START_WEBSOCKET !== 'false',
    });
    
    console.log('✅ All servers started successfully');
    return { messageSystem, servers };
  } catch (error) {
    console.error('Error starting server:', error);
    process.exit(1);
  }
}

// Start the server
start();
`;

  writeFileSync(join(projectDir, 'src/server/index.js'), serverIndex);

  // server/subsystems.bootstrap.mycelia.js
  const websocketImport = withWebsocket ? `import { WebSocketSubsystem } from '../../mycelia-kernel-v2/models/websocket-subsystem/websocket.subsystem.mycelia.js';
` : '';
  
  const websocketSubsystemConfig = withWebsocket ? `    {
      name: 'websocket',
      SubsystemClass: WebSocketSubsystem,
      config: {
        websocket: {
          type: 'ws',
          port: parseInt(process.env.WS_PORT || '8080'),
          host: process.env.WS_HOST || '0.0.0.0',
          path: process.env.WS_PATH || '/ws',
        },
      },
    },` : '';

  const subsystemsBootstrap = `import { ServerSubsystem } from '../../mycelia-kernel-v2/models/server-subsystem/server.subsystem.mycelia.js';
${websocketImport}import { DBSubsystem } from '../../mycelia-kernel-v2/models/subsystem/db/db.subsystem.mycelia.js';
import { ApiSubsystem } from './subsystems/api/api.subsystem.js';
import { getPrismaClient } from './lib/prisma.js';

/**
 * Subsystem configuration for bootstrap
 * Defines all subsystems to be registered in order
 * 
 * @typedef {Object} SubsystemConfig
 * @property {string} name - Subsystem name (must be unique)
 * @property {typeof BaseSubsystem} SubsystemClass - Subsystem class constructor
 * @property {Object} config - Configuration object passed to subsystem constructor
 * @property {Function} [afterRegister] - Optional async function called after registration
 * @property {boolean} [enabled=true] - Whether this subsystem should be registered (can be environment-based)
 * 
 * @returns {SubsystemConfig[]} Array of subsystem configurations
 * 
 * @example
 * // Add a new subsystem
 * {
 *   name: 'my-subsystem',
 *   SubsystemClass: MySubsystem,
 *   config: { key: 'value' },
 *   enabled: process.env.ENABLE_MY_SUBSYSTEM === 'true',
 *   afterRegister: async (subsystem) => {
 *     // Custom initialization
 *   }
 * }
 */
export function getSubsystemConfigs() {
  return [
    {
      name: 'database',
      SubsystemClass: DBSubsystem,
      config: {
        storage: {
          prisma: {
            client: getPrismaClient(),
            modelName: 'StorageEntry',
          },
        },
      },
    },
    {
      name: 'server',
      SubsystemClass: ServerSubsystem,
      config: {
        server: {
          type: 'hono',
          port: parseInt(process.env.PORT || '3000'),
          host: '0.0.0.0',
        },
      },
    },
    {
      name: 'api',
      SubsystemClass: ApiSubsystem,
      config: {
        prisma: {
          client: getPrismaClient(),
        },
      },
      afterRegister: async (subsystem) => {
        // Register API routes after all subsystems are registered
        const { registerApiRoutes } = await import('./subsystems/api/api.routes.js');
        await registerApiRoutes(subsystem);
      },
    },
${websocketSubsystemConfig ? `    {
      name: 'websocket',
      SubsystemClass: WebSocketSubsystem,
      config: {
        websocket: {
          type: 'ws',
          port: parseInt(process.env.WS_PORT || '8080'),
          host: process.env.WS_HOST || '0.0.0.0',
          path: process.env.WS_PATH || '/ws',
        },
      },
      enabled: process.env.ENABLE_WEBSOCKET !== 'false', // Enabled by default, can be disabled via env
    },` : ''}
  ];
}
`;

  writeFileSync(join(projectDir, 'src/server/subsystems.bootstrap.mycelia.js'), subsystemsBootstrap);

  // server/bootstrap.js
  const bootstrap = `import { MessageSystem } from '../../mycelia-kernel-v2/models/message-system/message-system.v2.mycelia.js';
import { getSubsystemConfigs } from './subsystems.bootstrap.mycelia.js';

/**
 * Validates a subsystem configuration before registration
 * @param {Object} config - Subsystem configuration object
 * @param {number} index - Index in the subsystems array (for error messages)
 * @throws {Error} If configuration is invalid
 */
function validateSubsystemConfig(config, index) {
  if (!config) {
    throw new Error(\`Subsystem config at index \${index} is null or undefined\`);
  }

  if (!config.name || typeof config.name !== 'string') {
    throw new Error(\`Subsystem config at index \${index} missing or invalid 'name' property\`);
  }

  if (!config.SubsystemClass || typeof config.SubsystemClass !== 'function') {
    throw new Error(\`Subsystem config '\${config.name}' missing or invalid 'SubsystemClass' property\`);
  }

  if (!config.config || typeof config.config !== 'object') {
    throw new Error(\`Subsystem config '\${config.name}' missing or invalid 'config' property\`);
  }

  // Check if enabled (defaults to true if not specified)
  if (config.enabled === false) {
    return false; // Valid but disabled
  }

  return true; // Valid and enabled
}

/**
 * Bootstrap the Mycelia application
 * 
 * This function:
 * 1. Creates and bootstraps the MessageSystem (which bootstraps the kernel)
 * 2. Validates and registers all configured subsystems in order
 * 3. Runs any post-registration hooks
 * 
 * @returns {Promise<MessageSystem>} The bootstrapped MessageSystem instance
 * @throws {Error} If bootstrap fails at any step
 * 
 * @example
 * const messageSystem = await bootstrapMycelia();
 * // All subsystems are now registered and ready
 */
export async function bootstrapMycelia() {
  // Create MessageSystem
  const messageSystem = new MessageSystem('app', {
    debug: process.env.NODE_ENV === 'development',
  });

  // Bootstrap MessageSystem (this will bootstrap the kernel internally)
  // Kernel listeners are automatically enabled during bootstrap
  await messageSystem.bootstrap();

  // Get subsystem configurations
  const subsystemConfigs = getSubsystemConfigs();

  // Register all subsystems in order
  for (let i = 0; i < subsystemConfigs.length; i++) {
    const subsystemConfig = subsystemConfigs[i];
    
    try {
      // Validate configuration
      const isEnabled = validateSubsystemConfig(subsystemConfig, i);
      
      if (!isEnabled) {
        if (messageSystem.debug) {
          console.log(\`Skipping disabled subsystem: \${subsystemConfig.name}\`);
        }
        continue;
      }

      // Create subsystem instance
      const subsystem = new subsystemConfig.SubsystemClass(subsystemConfig.name, {
        ms: messageSystem,
        config: subsystemConfig.config,
      });
      
      // Register subsystem (builds internally)
      await messageSystem.registerSubsystem(subsystem);
      
      // Run any post-registration hooks
      if (subsystemConfig.afterRegister) {
        try {
          await subsystemConfig.afterRegister(subsystem);
        } catch (hookError) {
          throw new Error(\`afterRegister hook failed for subsystem '\${subsystemConfig.name}': \${hookError.message}\`);
        }
      }
    } catch (error) {
      // Provide context about which subsystem failed
      const subsystemName = subsystemConfig?.name || \`at index \${i}\`;
      throw new Error(\`Failed to register subsystem '\${subsystemName}': \${error.message}\`);
    }
  }

  return messageSystem;
}
`;

  writeFileSync(join(projectDir, 'src/server/bootstrap.js'), bootstrap);

  // server/start-servers.mycelia.js
  const startServers = `/**
 * Server startup utilities
 * Handles starting HTTP and WebSocket servers after bootstrap
 */

/**
 * Start all configured servers (HTTP and WebSocket)
 * 
 * @param {MessageSystem} messageSystem - The bootstrapped MessageSystem instance
 * @param {Object} [options={}] - Startup options
 * @param {boolean} [options.startHttp=true] - Whether to start HTTP server
 * @param {boolean} [options.startWebSocket=true] - Whether to start WebSocket server
 * @returns {Promise<Object>} Object with server information
 * @throws {Error} If server startup fails
 * 
 * @example
 * const messageSystem = await bootstrapMycelia();
 * const servers = await startServers(messageSystem);
 * console.log(\`HTTP: \${servers.http.url}, WebSocket: \${servers.websocket.url}\`);
 */
export async function startServers(messageSystem, options = {}) {
  const {
    startHttp = true,
    startWebSocket = true,
  } = options;

  const result = {
    http: null,
    websocket: null,
  };

  // Get registry
  const registry = messageSystem.find('messageSystemRegistry');
  if (!registry) {
    throw new Error('MessageSystemRegistry not found. Ensure MessageSystem is bootstrapped.');
  }

  // Start HTTP server
  if (startHttp) {
    const serverSubsystem = registry.get('server');
    if (!serverSubsystem) {
      throw new Error('Server subsystem not found. Ensure it is registered in bootstrap.');
    }

    const serverFacet = serverSubsystem.find('server') || serverSubsystem.server;
    if (!serverFacet) {
      throw new Error('Server facet not found on server subsystem.');
    }

    const port = parseInt(process.env.PORT || '3000');
    const host = process.env.HOST || '0.0.0.0';

    await serverFacet.start({
      port,
      host,
    });

    result.http = {
      url: \`http://\${host}:\${port}\`,
      port,
      host,
    };

    console.log(\`✅ HTTP Server running on \${result.http.url}\`);
  }

  // Start WebSocket server
  if (startWebSocket) {
    const websocketSubsystem = registry.get('websocket');
    if (!websocketSubsystem) {
      console.warn('Warning: WebSocket subsystem not found. Skipping WebSocket server startup.');
    } else {
      const websocketFacet = websocketSubsystem.find('websocket') || websocketSubsystem.websocket;
      if (!websocketFacet) {
        console.warn('Warning: WebSocket facet not found. Skipping WebSocket server startup.');
      } else {
        const wsPort = parseInt(process.env.WS_PORT || '8080');
        const wsHost = process.env.WS_HOST || '0.0.0.0';
        const wsPath = process.env.WS_PATH || '/ws';

        await websocketFacet.start({
          port: wsPort,
          host: wsHost,
          path: wsPath,
        });

        result.websocket = {
          url: \`ws://\${wsHost}:\${wsPort}\${wsPath}\`,
          port: wsPort,
          host: wsHost,
          path: wsPath,
        };

        console.log(\`✅ WebSocket Server running on \${result.websocket.url}\`);
      }
    }
  }

  return result;
}
`;

  writeFileSync(join(projectDir, 'src/server/start-servers.mycelia.js'), startServers);

  // server/lib/prisma.js
  const prismaLib = `import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis;

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
`;

  writeFileSync(join(projectDir, 'src/server/lib/prisma.js'), prismaLib);

  // server/subsystems/api/api.subsystem.js
  const apiSubsystem = `import { BaseSubsystem } from '../../../../mycelia-kernel-v2/models/base-subsystem/base.subsystem.mycelia.js';
import { createCanonicalDefaultHooks } from '../../../../mycelia-kernel-v2/models/defaults/default-hooks.mycelia.js';
import { usePrisma } from '../../../../mycelia-kernel-v2/hooks/prisma/use-prisma.mycelia.js';

export class ApiSubsystem extends BaseSubsystem {
  constructor(name = 'api', options = {}) {
    super(name, options);
    
    // Use canonical defaults (includes router, messages, queue, etc.)
    this.defaultHooks = createCanonicalDefaultHooks();
    
    // Add Prisma hook for database access
    this.use(usePrisma);
    
    // Routes will be registered after all subsystems are built
    // See bootstrap.js for route registration
  }
}
`;

  writeFileSync(join(projectDir, 'src/server/subsystems/api/api.subsystem.js'), apiSubsystem);

  // server/subsystems/api/api.routes.js
  const apiRoutes = `import { BaseSubsystem } from '../../../../mycelia-kernel-v2/models/base-subsystem/base.subsystem.mycelia.js';

export async function registerApiRoutes(subsystem) {
  // Get server subsystem from message system registry
  const registry = subsystem.messageSystem.find('messageSystemRegistry');
  if (!registry) {
    throw new Error('MessageSystemRegistry not found');
  }
  
  const serverSubsystemWrapper = registry.get('server');
  if (!serverSubsystemWrapper) {
    throw new Error('Server subsystem not found in registry');
  }

  // Get the server facet from the wrapper
  const serverFacet = serverSubsystemWrapper.find?.('server') || serverSubsystemWrapper.server;
  if (!serverFacet) {
    throw new Error('Server facet not found on server subsystem');
  }

  // Example: Register a user route
  await serverFacet.registerMyceliaRoute(
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
    const user = await prisma.prisma.user.findUnique({
      where: { id: userId },
    });

    return {
      success: true,
      data: user,
    };
  });

  // Register list users route
  await serverFacet.registerMyceliaRoute(
    'api://users/list',
    'GET',
    '/api/users'
  );

  subsystem.registerRoute('api://users/list', async (message) => {
    const prisma = subsystem.find('prisma');
    if (!prisma) {
      throw new Error('Prisma facet not found');
    }

    const users = await prisma.prisma.user.findMany();

    return {
      success: true,
      data: users,
    };
  });
}
`;

  writeFileSync(join(projectDir, 'src/server/subsystems/api/api.routes.js'), apiRoutes);
}

function generateClientFiles(projectDir, projectName) {
  // client/index.html
  const indexHtml = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${projectName}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/client/main.jsx"></script>
  </body>
</html>
`;

  writeFileSync(join(projectDir, 'index.html'), indexHtml);

  // client/main.jsx
  const mainJsx = `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './styles/index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
`;

  writeFileSync(join(projectDir, 'src/client/main.jsx'), mainJsx);

  // client/App.jsx
  const appJsx = `import React from 'react';

function App() {
  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">
          Welcome to Mycelia Fullstack
        </h1>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-gray-700">
            Your fullstack application is ready!
          </p>
        </div>
      </div>
    </div>
  );
}

export default App;
`;

  writeFileSync(join(projectDir, 'src/client/App.jsx'), appJsx);

  // client/lib/api.js
  const apiLib = `// API client for making requests to the backend
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export async function apiRequest(path, options = {}) {
  const url = \`\${API_URL}\${path}\`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new Error(\`API request failed: \${response.statusText}\`);
  }

  return response.json();
}

// Example API functions
export const api = {
  users: {
    list: () => apiRequest('/api/users'),
    get: (id) => apiRequest(\`/api/users/\${id}\`),
  },
};
`;

  writeFileSync(join(projectDir, 'src/client/lib/api.js'), apiLib);

  // client/styles/index.css
  const indexCss = `@tailwind base;
@tailwind components;
@tailwind utilities;
`;

  writeFileSync(join(projectDir, 'src/client/styles/index.css'), indexCss);
}

function generateSharedFiles(projectDir) {
  // shared/types/index.js
  const sharedTypes = `// Shared types between frontend and backend
// Add your shared types here

export {};
`;

  writeFileSync(join(projectDir, 'src/shared/types/index.js'), sharedTypes);
}

function generateEnvironmentFiles(projectDir, databaseType) {
  const defaultDbUrl = databaseType === 'postgresql' 
    ? 'postgresql://user:password@localhost:5432/mydb?schema=public'
    : databaseType === 'mysql'
    ? 'mysql://user:password@localhost:3306/mydb'
    : 'file:./dev.db';

  const envExample = `# Database
DATABASE_URL="${defaultDbUrl}"

# Server
PORT=3000
NODE_ENV=development

# Frontend
VITE_API_URL=http://localhost:3000
`;

  writeFileSync(join(projectDir, '.env.example'), envExample);
}

function generateREADME(projectDir, projectName, databaseType, withAuth, withWebsocket) {
  const readme = `# ${projectName}

Full-stack application built with Mycelia v2, React, Tailwind CSS v13, Prisma, and Hono.

## Tech Stack

- **Frontend**: React + Vite + Tailwind CSS v13
- **Backend**: Hono + Mycelia v2
- **Database**: ${databaseType} with Prisma ORM
- **Language**: JavaScript (ES Modules)

## Getting Started

### Prerequisites

- Node.js 18+ 
- ${databaseType === 'postgresql' ? 'PostgreSQL' : databaseType === 'mysql' ? 'MySQL' : 'SQLite'} database

### Installation

1. Install dependencies:
\`\`\`bash
npm install
\`\`\`

2. Set up environment variables:
\`\`\`bash
cp .env.example .env
# Edit .env with your database URL
\`\`\`

3. Set up database:
\`\`\`bash
npx prisma migrate dev --name init
npx prisma generate
npx prisma db seed
\`\`\`

4. Start development servers:
\`\`\`bash
npm run dev
\`\`\`

This will start:
- Frontend dev server: http://localhost:5173
- Backend server: http://localhost:3000

## Project Structure

\`\`\`
${projectName}/
├── src/
│   ├── client/          # React frontend
│   ├── server/          # Mycelia + Hono backend
│   └── shared/          # Shared code
├── prisma/              # Prisma schema and migrations
└── public/              # Static assets
\`\`\`

## Available Scripts

- \`npm run dev\` - Start both frontend and backend in development mode
- \`npm run dev:client\` - Start only frontend dev server
- \`npm run dev:server\` - Start only backend server
- \`npm run build\` - Build for production
- \`npm run prisma:generate\` - Generate Prisma client
- \`npm run prisma:migrate\` - Run database migrations
- \`npm run prisma:studio\` - Open Prisma Studio
- \`npm run prisma:seed\` - Seed the database

## Learn More

- [Mycelia Kernel Documentation](../../mycelia-kernel-v2/docs/)
- [React Documentation](https://react.dev)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Hono Documentation](https://hono.dev)
`;

  writeFileSync(join(projectDir, 'README.md'), readme);
}

