# Configuration System

## Overview

Mycelia Kernel provides an **optional** centralized configuration system that allows you to configure your entire application through a single configuration file. This system is designed to be:

- **Optional**: You can still bootstrap manually if you prefer
- **Flexible**: Supports JavaScript config files with full programmatic control
- **Environment-aware**: Automatically merges environment variable overrides
- **Validated**: Provides validation to catch configuration errors early

## Quick Start

### 1. Create Configuration File

Create `config.bootstrap.mycelia.js` in your project root:

```javascript
// config.bootstrap.mycelia.js
export default {
  environment: 'development',
  debug: true,
  
  database: {
    enabled: true,
    type: 'prisma',
    prisma: {
      provider: 'postgresql',
      connectionString: process.env.DATABASE_URL,
      schemaPath: './prisma/schema.prisma'
    }
  },
  
  subsystems: {
    auth: {
      enabled: true,
      storage: {
        backend: 'prisma'
      },
      password: {
        minLength: 8,
        bcryptRounds: 10
      },
      tokens: {
        accessTokenExpiry: 3600000,
        refreshTokenExpiry: 604800000,
        signingKey: process.env.JWT_SECRET
      }
    },
    
    server: {
      enabled: true,
      type: 'hono',
      port: 3000,
      host: '0.0.0.0',
      cors: {
        enabled: true,
        origins: ['*']
      }
    },
    
    websocket: {
      enabled: true,
      type: 'ws',
      port: 8080,
      host: '0.0.0.0',
      path: '/ws'
    }
  }
};
```

### 2. Load and Use Configuration

```javascript
// bootstrap.js
import { loadConfig } from './mycelia-kernel-v2/utils/config-loader.mycelia.js';
import { bootstrapFromConfig } from './mycelia-kernel-v2/utils/bootstrap-from-config.mycelia.js';

// Load configuration
const config = await loadConfig();

// Bootstrap with config (or fallback to manual bootstrap)
if (config) {
  const messageSystem = await bootstrapFromConfig(config);
} else {
  // Manual bootstrap
  const messageSystem = await bootstrapManually();
}
```

## Configuration Structure

### Core Configuration

```javascript
{
  // Environment
  environment: 'development' | 'production' | 'test',
  debug: boolean, // Auto-derived from environment if not specified
  
  // Logging
  logging: {
    level: 'error' | 'warn' | 'info' | 'debug',
    format: 'json' | 'text'
  },
  
  // Application Info
  app: {
    name: string,
    version: string
  }
}
```

### Database Configuration

```javascript
{
  database: {
    enabled: boolean,
    type: 'prisma' | 'sqlite' | 'indexeddb' | 'memory' | null,
    
    // If type === 'prisma'
    prisma: {
      provider: 'postgresql' | 'mysql' | 'sqlite' | 'mongodb',
      connectionString: string,
      schemaPath: string, // Optional
      migrations: {
        autoRun: boolean,
        path: string
      }
    },
    
    // If type === 'sqlite'
    sqlite: {
      path: string,
      options: object
    },
    
    // If type === 'indexeddb'
    indexeddb: {
      dbName: string
    }
  }
}
```

### Subsystems Configuration

```javascript
{
  subsystems: {
    // Auth Subsystem
    auth: {
      enabled: boolean,
      storage: {
        backend: 'prisma' | 'sqlite' | 'indexeddb' | 'memory'
      },
      password: {
        minLength: number,
        bcryptRounds: number
      },
      tokens: {
        accessTokenExpiry: number, // milliseconds
        refreshTokenExpiry: number, // milliseconds
        signingKey: string
      },
      sessions: {
        defaultDuration: number, // milliseconds
        maxDuration: number // milliseconds
      }
    },
    
    // Server Subsystem
    server: {
      enabled: boolean,
      type: 'hono' | 'express' | 'fastify' | null,
      port: number,
      host: string,
      cors: {
        enabled: boolean,
        origins: string[],
        credentials: boolean
      },
      middleware: array,
      static: {
        enabled: boolean,
        path: string
      }
    },
    
    // WebSocket Subsystem
    websocket: {
      enabled: boolean,
      type: 'ws' | 'socket.io' | null,
      port: number,
      host: string,
      path: string,
      options: object
    },
    
    // Custom Subsystems
    custom: [
      {
        name: string,
        class: string, // Path to subsystem class
        config: object,
        afterRegister: function // Optional
      }
    ]
  }
}
```

## Environment Variables

Environment variables automatically override config file values:

- `NODE_ENV` → `environment`
- `DEBUG` → `debug`
- `DATABASE_URL` → `database.prisma.connectionString`
- `PORT` → `subsystems.server.port`
- `WS_PORT` → `subsystems.websocket.port`
- `JWT_SECRET` → `subsystems.auth.tokens.signingKey`

## Configuration File Formats

### JavaScript (Recommended)

```javascript
// config.bootstrap.mycelia.js
export default {
  // ... config
};
```

### Function Export

```javascript
// config.bootstrap.mycelia.js
export default async function() {
  // Can be async
  const prismaClient = await getPrismaClient();
  
  return {
    database: {
      prisma: {
        client: prismaClient
      }
    }
  };
}
```

### Named Export

```javascript
// config.bootstrap.mycelia.js
export const config = {
  // ... config
};
```

## Splitting Configuration

You can split your configuration into multiple files:

```javascript
// config.bootstrap.mycelia.js
import { databaseConfig } from './config/database.mycelia.js';
import { authConfig } from './config/auth.mycelia.js';
import { serverConfig } from './config/server.mycelia.js';

export default {
  environment: 'development',
  database: databaseConfig,
  subsystems: {
    auth: authConfig,
    server: serverConfig
  }
};
```

## Validation

The configuration system includes validation:

```javascript
import { loadConfig, validateConfig } from './mycelia-kernel-v2/utils/config-loader.mycelia.js';

const config = await loadConfig();
const validation = validateConfig(config);

if (!validation.valid) {
  console.error('Configuration errors:', validation.errors);
  process.exit(1);
}
```

## Default Configuration

If no config file is found, you can use defaults:

```javascript
import { getDefaultConfig } from './mycelia-kernel-v2/utils/config-loader.mycelia.js';

const config = getDefaultConfig();
// Returns minimal default configuration
```

## Best Practices

1. **Use Environment Variables for Secrets**: Never commit secrets to config files
2. **Split Large Configs**: Break complex configurations into separate files
3. **Validate Early**: Validate configuration at startup
4. **Use TypeScript**: If using TypeScript, create types for your config
5. **Document Custom Config**: Document any custom subsystem configurations

## Examples

### Minimal Configuration

```javascript
// config.bootstrap.mycelia.js
export default {
  environment: 'development',
  subsystems: {
    server: {
      enabled: true,
      type: 'hono',
      port: 3000
    }
  }
};
```

### Full Configuration

See the [Full Configuration Example](./CONFIGURATION-EXAMPLES.md) for a complete example.

### Environment-Specific Configs

```javascript
// config.bootstrap.mycelia.js
const baseConfig = {
  // ... base config
};

const envConfigs = {
  development: {
    debug: true,
    logging: { level: 'debug' }
  },
  production: {
    debug: false,
    logging: { level: 'error' }
  }
};

export default {
  ...baseConfig,
  ...envConfigs[process.env.NODE_ENV || 'development']
};
```

## Migration from Manual Bootstrap

If you're migrating from manual bootstrap:

1. Extract subsystem configurations from your bootstrap file
2. Create `config.bootstrap.mycelia.js`
3. Update bootstrap to use `loadConfig()` and `bootstrapFromConfig()`
4. Test thoroughly

## See Also

- [Configuration Examples](./CONFIGURATION-EXAMPLES.md) - Complete configuration examples
- [Bootstrap System](./BOOTSTRAP-SYSTEM.md) - How bootstrap works with configuration
- [Subsystems](./models/subsystem/) - Individual subsystem documentation

