/**
 * Bootstrap from Configuration
 * 
 * Bootstraps a Mycelia application from a configuration object.
 * This is an optional utility - you can still bootstrap manually if preferred.
 * 
 * @example
 * import { loadConfig } from './config-loader.mycelia.js';
 * import { bootstrapFromConfig } from './bootstrap-from-config.mycelia.js';
 * 
 * const config = await loadConfig();
 * if (config) {
 *   const messageSystem = await bootstrapFromConfig(config);
 * }
 */

import { MessageSystem } from '../models/message-system/message-system.v2.mycelia.js';
import { DBSubsystem } from '../models/subsystem/db/db.subsystem.mycelia.js';
import { AuthSubsystem } from '../models/subsystem/auth/auth.subsystem.mycelia.js';
import { ServerSubsystem } from '../models/server-subsystem/server.subsystem.mycelia.js';
import { WebSocketSubsystem } from '../models/websocket-subsystem/websocket.subsystem.mycelia.js';

/**
 * Bootstrap Mycelia application from configuration
 * 
 * @param {Object} config - Configuration object
 * @returns {Promise<MessageSystem>} Bootstrapped MessageSystem instance
 * @throws {Error} If bootstrap fails
 */
export async function bootstrapFromConfig(config) {
  // Create MessageSystem
  const messageSystem = new MessageSystem('app', {
    debug: config.debug !== undefined ? config.debug : config.environment === 'development',
  });

  // Bootstrap MessageSystem (this bootstraps the kernel internally)
  await messageSystem.bootstrap();

  // Get the kernel instance
  const kernel = messageSystem.getKernel();
  if (!kernel) {
    throw new Error('Kernel not found after MessageSystem bootstrap.');
  }

  // Set kernel on messageSystemRouter
  const routerFacet = messageSystem.find('messageSystemRouter');
  if (routerFacet) {
    routerFacet.setKernel(kernel);
  }

  // Register subsystems based on configuration
  const subsystems = config.subsystems || {};
  
  // Database subsystem
  if (config.database?.enabled && config.database?.type) {
    await registerDatabaseSubsystem(messageSystem, config.database);
  }
  
  // Auth subsystem
  if (subsystems.auth?.enabled) {
    await registerAuthSubsystem(messageSystem, subsystems.auth, config.database);
  }
  
  // Server subsystem
  if (subsystems.server?.enabled) {
    await registerServerSubsystem(messageSystem, subsystems.server);
  }
  
  // WebSocket subsystem
  if (subsystems.websocket?.enabled) {
    await registerWebSocketSubsystem(messageSystem, subsystems.websocket);
  }
  
  // Custom subsystems
  if (subsystems.custom && Array.isArray(subsystems.custom)) {
    for (const customSubsystem of subsystems.custom) {
      await registerCustomSubsystem(messageSystem, customSubsystem);
    }
  }

  return messageSystem;
}

/**
 * Register database subsystem
 * @private
 */
async function registerDatabaseSubsystem(messageSystem, dbConfig) {
  const config = {
    storage: {}
  };

  if (dbConfig.type === 'prisma') {
    if (dbConfig.prisma?.client) {
      config.storage.prisma = {
        client: dbConfig.prisma.client,
        modelName: dbConfig.prisma.modelName || 'StorageEntry'
      };
    } else {
      config.storage.backend = 'prisma';
      config.storage.prisma = {
        connectionString: dbConfig.prisma?.connectionString,
        schemaPath: dbConfig.prisma?.schemaPath
      };
    }
  } else if (dbConfig.type === 'sqlite') {
    config.storage.backend = 'sqlite';
    config.storage.sqlite = dbConfig.sqlite || {};
  } else if (dbConfig.type === 'indexeddb') {
    config.storage.backend = 'indexeddb';
    config.storage.indexeddb = dbConfig.indexeddb || {};
  } else if (dbConfig.type === 'memory') {
    config.storage.backend = 'memory';
  }

  const dbSubsystem = new DBSubsystem('database', {
    ms: messageSystem,
    config
  });

  await messageSystem.registerSubsystem(dbSubsystem);
}

/**
 * Register auth subsystem
 * @private
 */
async function registerAuthSubsystem(messageSystem, authConfig, dbConfig) {
  const config = {
    storage: authConfig.storage || {},
    password: authConfig.password || {},
    tokens: authConfig.tokens || {},
    sessions: authConfig.sessions || {}
  };

  // If using Prisma and auth storage backend is prisma, pass Prisma client
  if (authConfig.storage?.backend === 'prisma' && dbConfig?.prisma?.client) {
    config.storage.prisma = {
      client: dbConfig.prisma.client
    };
  }

  const authSubsystem = new AuthSubsystem('auth', {
    ms: messageSystem,
    config
  });

  await messageSystem.registerSubsystem(authSubsystem);

  // Run afterRegister hook if provided
  if (authConfig.afterRegister && typeof authConfig.afterRegister === 'function') {
    await authConfig.afterRegister(authSubsystem);
  }
}

/**
 * Register server subsystem
 * @private
 */
async function registerServerSubsystem(messageSystem, serverConfig) {
  if (!serverConfig.type) {
    throw new Error('Server subsystem requires type (hono, express, or fastify)');
  }

  const config = {
    server: {
      type: serverConfig.type,
      port: serverConfig.port || 3000,
      host: serverConfig.host || '0.0.0.0',
      cors: serverConfig.cors,
      middleware: serverConfig.middleware,
      static: serverConfig.static
    }
  };

  const serverSubsystem = new ServerSubsystem('server', {
    ms: messageSystem,
    config
  });

  await messageSystem.registerSubsystem(serverSubsystem);

  if (serverConfig.afterRegister && typeof serverConfig.afterRegister === 'function') {
    await serverConfig.afterRegister(serverSubsystem);
  }
}

/**
 * Register WebSocket subsystem
 * @private
 */
async function registerWebSocketSubsystem(messageSystem, wsConfig) {
  if (!wsConfig.type) {
    throw new Error('WebSocket subsystem requires type (ws or socket.io)');
  }

  const config = {
    websocket: {
      type: wsConfig.type,
      port: wsConfig.port || 8080,
      host: wsConfig.host || '0.0.0.0',
      path: wsConfig.path || '/ws',
      options: wsConfig.options || {}
    }
  };

  const wsSubsystem = new WebSocketSubsystem('websocket', {
    ms: messageSystem,
    config
  });

  await messageSystem.registerSubsystem(wsSubsystem);

  if (wsConfig.afterRegister && typeof wsConfig.afterRegister === 'function') {
    await wsConfig.afterRegister(wsSubsystem);
  }
}

/**
 * Register custom subsystem
 * @private
 */
async function registerCustomSubsystem(messageSystem, customConfig) {
  if (!customConfig.name || !customConfig.class) {
    throw new Error('Custom subsystem requires name and class');
  }

  // Dynamic import of subsystem class
  const SubsystemClass = (await import(customConfig.class)).default || 
                         (await import(customConfig.class))[customConfig.name] ||
                         (await import(customConfig.class));

  const subsystem = new SubsystemClass(customConfig.name, {
    ms: messageSystem,
    config: customConfig.config || {}
  });

  await messageSystem.registerSubsystem(subsystem);

  if (customConfig.afterRegister && typeof customConfig.afterRegister === 'function') {
    await customConfig.afterRegister(subsystem);
  }
}

