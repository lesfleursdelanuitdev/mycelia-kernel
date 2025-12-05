/**
 * DB Subsystem
 * 
 * Message-driven database abstraction layer for Mycelia Kernel.
 * Provides database operations (queries, transactions, migrations) through the message system.
 */

import { BaseSubsystem } from '../../base-subsystem/base.subsystem.mycelia.js';
import { createCanonicalDefaultHooks } from '../../defaults/default-hooks.mycelia.js';
import { useDBStorage } from '../../../hooks/db/use-db-storage.mycelia.js';
import { useDBMigrations } from '../../../hooks/db/use-db-migrations.mycelia.js';
import { useDBQueryBuilder } from '../../../hooks/db/use-db-query-builder.mycelia.js';
import { useDBTransactions } from '../../../hooks/db/use-db-transactions.mycelia.js';
import { DB_ROUTES } from './db.routes.def.mycelia.js';
import { createLogger } from '../../../utils/logger.utils.mycelia.js';
import { getDebugFlag } from '../../../utils/debug-flag.utils.mycelia.js';

/**
 * DB Subsystem
 * 
 * Provides message-driven database operations including:
 * - Query execution (db.query)
 * - Write operations (db.execute)
 * - Transaction management (db.transaction)
 * - Schema migrations (db.migrate)
 * - Database status (db.status)
 * 
 * @example
 * const dbSubsystem = new DBSubsystem('db', {
 *   ms: messageSystem,
 *   config: {
 *     storage: {
 *       backend: 'sqlite',
 *       dbPath: './data/app.db'
 *     },
 *     migrations: {
 *       directory: './migrations',
 *       autoRun: true
 *     }
 *   }
 * });
 * 
 * await dbSubsystem.build();
 */
export class DBSubsystem extends BaseSubsystem {
  /**
   * @param {string} name - Subsystem name (typically 'db')
   * @param {Object} options - Configuration options
   * @param {Object} options.ms - MessageSystem instance (required)
   * @param {Object} [options.config={}] - Configuration object
   * @param {Object} [options.config.storage={}] - Storage backend configuration
   * @param {string} [options.config.storage.backend='auto'] - Backend: 'sqlite', 'indexeddb', 'memory', or 'auto'
   * @param {Object} [options.config.migrations={}] - Migration configuration
   * @param {string} [options.config.migrations.directory] - Migration directory path
   * @param {boolean} [options.config.migrations.autoRun=true] - Run migrations on startup
   * @param {Object} [options.config.query={}] - Query configuration
   * @param {number} [options.config.query.defaultTimeout=5000] - Default query timeout (ms)
   * @param {Object} [options.config.transactions={}] - Transaction configuration
   * @param {number} [options.config.transactions.defaultTimeout=30000] - Default transaction timeout (ms)
   * @param {boolean} [options.debug=false] - Enable debug logging
   */
  constructor(name = 'db', options = {}) {
    super(name, options);
    
    const config = options.config || {};
    const debug = getDebugFlag({}, options);
    this.logger = createLogger(debug, `DBSubsystem ${name}`);
    
    // Use canonical defaults (includes router, messages, etc.)
    this.defaultHooks = createCanonicalDefaultHooks();
    
    // Install hooks
    this.use(useDBStorage);
    this.use(useDBMigrations);
    this.use(useDBQueryBuilder);
    this.use(useDBTransactions);
    
    // Register routes that handle database operation messages from other subsystems
    this.onInit(() => {
      // Register all routes from DB_ROUTES definitions
      for (const routeDef of Object.values(DB_ROUTES)) {
        // eslint-disable-next-line no-unused-vars
        this.registerRoute(routeDef.path, async (message, params, routeOptions) => {
          // Run validation if provided
          const data = routeDef.extractData(message.body);
          
          if (routeDef.validate) {
            const validationError = routeDef.validate(data);
            if (validationError) {
              return validationError;
            }
          }
          
          // Call the appropriate handler method
          const handler = this[routeDef.handlerMethod].bind(this);
          const result = await handler(message);
          
          return result;
        });
      }

      if (this.logger.debug) {
        this.logger.log('Registered database message handlers');
      }
    });
  }


  /**
   * Handle db.query message
   * @private
   */
  async handleQuery(message) {
    try {
      const { query, params = [], options = {} } = message.body || {};
      
      if (!query) {
        return { success: false, error: new Error('Query is required') };
      }

      const queryBuilder = this.find('queryBuilder');
      if (!queryBuilder) {
        return { success: false, error: new Error('Query builder facet not found') };
      }

      // Execute query using query builder
      const result = await queryBuilder.executeQuery(query, params, options);
      return result;
    } catch (error) {
      return { success: false, error };
    }
  }

  /**
   * Handle db.execute message
   * @private
   */
  async handleExecute(message) {
    try {
      const { query, params = [], options = {} } = message.body || {};
      
      if (!query) {
        return { success: false, error: new Error('Query is required') };
      }

      const queryBuilder = this.find('queryBuilder');
      if (!queryBuilder) {
        return { success: false, error: new Error('Query builder facet not found') };
      }

      // Execute write operation
      const result = await queryBuilder.executeWrite(query, params, options);
      return result;
    } catch (error) {
      return { success: false, error };
    }
  }

  /**
   * Handle db.transaction message
   * @private
   */
  async handleTransaction(message) {
    try {
      const { action, transactionId, options = {} } = message.body || {};
      
      if (!action) {
        return { success: false, error: new Error('Transaction action is required') };
      }

      const transactions = this.find('transactions');
      if (!transactions) {
        return { success: false, error: new Error('Transactions facet not found') };
      }

      switch (action) {
        case 'begin':
          return await transactions.begin(options);
        case 'commit':
          if (!transactionId) {
            return { success: false, error: new Error('Transaction ID is required for commit') };
          }
          return await transactions.commit(transactionId, options);
        case 'rollback':
          if (!transactionId) {
            return { success: false, error: new Error('Transaction ID is required for rollback') };
          }
          return await transactions.rollback(transactionId, options);
        default:
          return { success: false, error: new Error(`Invalid transaction action: ${action}`) };
      }
    } catch (error) {
      return { success: false, error };
    }
  }

  /**
   * Handle db.migrate message
   * @private
   */
  async handleMigrate(message) {
    try {
      const { direction = 'up', version, options = {} } = message.body || {};
      
      const migrations = this.find('migrations');
      if (!migrations) {
        return { success: false, error: new Error('Migrations facet not found') };
      }

      if (direction === 'up') {
        return await migrations.migrateUp(version, options);
      } else if (direction === 'down') {
        return await migrations.migrateDown(version, options);
      } else {
        return { success: false, error: new Error(`Invalid migration direction: ${direction}`) };
      }
    } catch (error) {
      return { success: false, error };
    }
  }

  /**
   * Handle db.status message
   * @private
   */
  async handleStatus(message) {
    try {
      const { includeStats = false } = message.body || {};
      
      const storage = this.find('storage');
      if (!storage) {
        return { success: false, error: new Error('Storage facet not found') };
      }

      const statusResult = await storage.getStatus();
      if (!statusResult.success) {
        return statusResult;
      }

      const result = {
        success: true,
        status: statusResult.status
      };

      if (includeStats) {
        // Add additional statistics if needed
        const migrations = this.find('migrations');
        if (migrations) {
          const migrationStatus = await migrations.getStatus();
          result.migrations = migrationStatus;
        }
      }

      return result;
    } catch (error) {
      return { success: false, error };
    }
  }
}

