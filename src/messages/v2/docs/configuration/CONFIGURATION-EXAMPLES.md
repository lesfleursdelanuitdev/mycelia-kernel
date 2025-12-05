# Configuration Examples

Complete examples of Mycelia configuration files for different use cases.

## Minimal Configuration

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

## Full Stack with Prisma

```javascript
// config.bootstrap.mycelia.js
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default {
  environment: process.env.NODE_ENV || 'development',
  debug: process.env.NODE_ENV === 'development',
  
  logging: {
    level: process.env.NODE_ENV === 'production' ? 'error' : 'info',
    format: 'json'
  },
  
  app: {
    name: 'my-app',
    version: '1.0.0'
  },
  
  database: {
    enabled: true,
    type: 'prisma',
    prisma: {
      provider: 'postgresql',
      connectionString: process.env.DATABASE_URL,
      schemaPath: './prisma/schema.prisma',
      migrations: {
        autoRun: false,
        path: './prisma/migrations'
      }
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
        accessTokenExpiry: 3600000, // 1 hour
        refreshTokenExpiry: 604800000, // 7 days
        signingKey: process.env.JWT_SECRET || 'change-me-in-production'
      },
      sessions: {
        defaultDuration: 3600000, // 1 hour
        maxDuration: 86400000 // 24 hours
      }
    },
    
    server: {
      enabled: true,
      type: 'hono',
      port: parseInt(process.env.PORT || '3000', 10),
      host: '0.0.0.0',
      cors: {
        enabled: true,
        origins: ['*'],
        credentials: true
      },
      static: {
        enabled: true,
        path: './public'
      }
    },
    
    websocket: {
      enabled: true,
      type: 'ws',
      port: parseInt(process.env.WS_PORT || '8080', 10),
      host: '0.0.0.0',
      path: '/ws',
      options: {
        pingInterval: 30000,
        pingTimeout: 5000
      }
    },
    
    custom: [
      {
        name: 'api',
        class: './subsystems/api/api.subsystem.mycelia.js',
        config: {
          prisma: {
            client: prisma
          }
        },
        afterRegister: async (subsystem) => {
          const { registerApiRoutes } = await import('./subsystems/api/api.routes.def.mycelia.js');
          await registerApiRoutes(subsystem);
        }
      }
    ]
  }
};
```

## SQLite Only (No Prisma)

```javascript
// config.bootstrap.mycelia.js
export default {
  environment: 'development',
  
  database: {
    enabled: true,
    type: 'sqlite',
    sqlite: {
      path: './data/app.db',
      options: {}
    }
  },
  
  subsystems: {
    auth: {
      enabled: true,
      storage: {
        backend: 'sqlite'
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
      type: 'express',
      port: 3000,
      host: '0.0.0.0'
    }
  }
};
```

## Browser Application (IndexedDB)

```javascript
// config.bootstrap.mycelia.js
export default {
  environment: 'development',
  
  database: {
    enabled: true,
    type: 'indexeddb',
    indexeddb: {
      dbName: 'mycelia-app'
    }
  },
  
  subsystems: {
    auth: {
      enabled: true,
      storage: {
        backend: 'indexeddb'
      }
    },
    
    websocket: {
      enabled: true,
      type: 'ws',
      // Browser connects to external WebSocket server
      port: null,
      host: 'wss://api.example.com',
      path: '/ws'
    }
  }
};
```

## Server Only (No Database)

```javascript
// config.bootstrap.mycelia.js
export default {
  environment: 'production',
  debug: false,
  
  database: {
    enabled: false,
    type: null
  },
  
  subsystems: {
    server: {
      enabled: true,
      type: 'hono',
      port: 3000,
      host: '0.0.0.0',
      cors: {
        enabled: true,
        origins: ['https://example.com']
      }
    }
  }
};
```

## Split Configuration

```javascript
// config.bootstrap.mycelia.js
import { databaseConfig } from './config/database.mycelia.js';
import { authConfig } from './config/auth.mycelia.js';
import { serverConfig } from './config/server.mycelia.js';
import { websocketConfig } from './config/websocket.mycelia.js';

export default {
  environment: process.env.NODE_ENV || 'development',
  debug: process.env.NODE_ENV === 'development',
  
  database: databaseConfig,
  
  subsystems: {
    auth: authConfig,
    server: serverConfig,
    websocket: websocketConfig
  }
};
```

```javascript
// config/database.mycelia.js
import { PrismaClient } from '@prisma/client';

export const databaseConfig = {
  enabled: true,
  type: 'prisma',
  prisma: {
    provider: 'postgresql',
    connectionString: process.env.DATABASE_URL,
    schemaPath: './prisma/schema.prisma'
  }
};
```

```javascript
// config/auth.mycelia.js
export const authConfig = {
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
};
```

## Function-Based Configuration

```javascript
// config.bootstrap.mycelia.js
export default async function() {
  // Can perform async operations
  const prisma = await initializePrisma();
  const secrets = await loadSecrets();
  
  return {
    environment: process.env.NODE_ENV || 'development',
    
    database: {
      enabled: true,
      type: 'prisma',
      prisma: {
        client: prisma
      }
    },
    
    subsystems: {
      auth: {
        enabled: true,
        tokens: {
          signingKey: secrets.jwtSecret
        }
      }
    }
  };
}
```

## Environment-Specific Configuration

```javascript
// config.bootstrap.mycelia.js
const baseConfig = {
  app: {
    name: 'my-app',
    version: '1.0.0'
  },
  
  database: {
    enabled: true,
    type: 'prisma',
    prisma: {
      provider: 'postgresql',
      connectionString: process.env.DATABASE_URL
    }
  },
  
  subsystems: {
    server: {
      enabled: true,
      type: 'hono',
      port: parseInt(process.env.PORT || '3000', 10),
      host: '0.0.0.0'
    }
  }
};

const envOverrides = {
  development: {
    debug: true,
    logging: {
      level: 'debug',
      format: 'text'
    },
    subsystems: {
      ...baseConfig.subsystems,
      server: {
        ...baseConfig.subsystems.server,
        port: 3000
      }
    }
  },
  
  production: {
    debug: false,
    logging: {
      level: 'error',
      format: 'json'
    },
    subsystems: {
      ...baseConfig.subsystems,
      server: {
        ...baseConfig.subsystems.server,
        port: 80
      }
    }
  },
  
  test: {
    debug: false,
    database: {
      enabled: true,
      type: 'sqlite',
      sqlite: {
        path: ':memory:'
      }
    }
  }
};

const env = process.env.NODE_ENV || 'development';
const envConfig = envOverrides[env] || {};

export default {
  ...baseConfig,
  ...envConfig,
  environment: env
};
```

