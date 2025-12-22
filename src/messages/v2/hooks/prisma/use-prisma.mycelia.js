/**
 * usePrisma Hook
 * 
 * Provides direct Prisma Client access to subsystems.
 * This hook allows subsystems to use Prisma ORM directly for database operations.
 * 
 * Prisma Client should be initialized and provided via context (ctx.prisma) or
 * will be created from configuration.
 * 
 * @param {Object} ctx - Context object containing prisma client or config.prisma
 * @param {Object} api - Subsystem API being built
 * @param {BaseSubsystem} subsystem - Subsystem instance
 * @returns {Facet} Facet object with Prisma Client and helper methods
 */
import { Facet } from 'mycelia-kernel-plugin/core';
import { createHook } from '../create-hook.mycelia.js';
import { getDebugFlag } from '../../utils/debug-flag.utils.mycelia.js';

export const usePrisma = createHook({
  kind: 'prisma',
  version: '1.0.0',
  overwrite: false,
  required: [],
  attach: true,
  source: import.meta.url,
  fn: (ctx, api, subsystem) => {
    const config = ctx.config?.prisma || {};
    const debug = getDebugFlag(config, ctx);
    
    // Get Prisma client from context or config
    let prisma = ctx.prisma || config.client;
    
    // If Prisma not provided, try to create it
    if (!prisma) {
      try {
        // Dynamic import of Prisma Client
        // Note: This assumes @prisma/client is installed and schema is generated
        const { PrismaClient } = require('@prisma/client');
        prisma = new PrismaClient({
          datasources: {
            db: {
              url: config.databaseUrl || process.env.DATABASE_URL
            }
          },
          log: config.log || (debug ? ['query', 'error', 'warn'] : ['error', 'warn'])
        });
      } catch (error) {
        throw new Error(`usePrisma: Prisma Client not available. Ensure @prisma/client is installed and Prisma schema is generated. Error: ${error.message}`);
      }
    }

    // Cleanup on subsystem disposal
    if (subsystem && typeof subsystem.onDispose === 'function') {
      const originalDispose = subsystem.onDispose.bind(subsystem);
      subsystem.onDispose = async () => {
        if (prisma && typeof prisma.$disconnect === 'function') {
          await prisma.$disconnect();
        }
        await originalDispose();
      };
    }

    return new Facet('prisma', { attach: true, source: import.meta.url })
      .add({
        /**
         * Prisma Client instance
         * @type {Object}
         */
        prisma,

        /**
         * Get a Prisma model by name
         * @param {string} modelName - Name of the Prisma model
         * @returns {Object} Prisma model delegate
         * @example
         * const userModel = prismaFacet.model('User');
         * const user = await userModel.findUnique({ where: { id: '123' } });
         */
        model(modelName) {
          if (!prisma[modelName]) {
            throw new Error(`Prisma model "${modelName}" not found. Ensure your Prisma schema includes this model.`);
          }
          return prisma[modelName];
        },

        /**
         * Execute a Prisma transaction
         * @param {Function|Array} callback - Transaction callback or array of operations
         * @param {Object} [options={}] - Transaction options
         * @returns {Promise<any>} Transaction result
         * @example
         * await prismaFacet.transaction(async (tx) => {
         *   await tx.user.create({ data: { name: 'John' } });
         *   await tx.post.create({ data: { title: 'Hello' } });
         * });
         */
        async transaction(callback, options = {}) {
          return await prisma.$transaction(callback, options);
        },

        /**
         * Disconnect Prisma Client
         * @returns {Promise<void>}
         */
        async disconnect() {
          if (prisma && typeof prisma.$disconnect === 'function') {
            await prisma.$disconnect();
          }
        },

        /**
         * Execute a raw query
         * @param {string} query - SQL query string
         * @param {Array} [params=[]] - Query parameters
         * @returns {Promise<any>} Query result
         * @example
         * const users = await prismaFacet.raw('SELECT * FROM "User" WHERE age > $1', [18]);
         */
        async raw(query, params = []) {
          return await prisma.$queryRawUnsafe(query, ...params);
        },

        /**
         * Execute a raw query with Prisma's parameterized query
         * @param {TemplateStringsArray} strings - Template string parts
         * @param {...any} values - Template string values
         * @returns {Promise<any>} Query result
         * @example
         * const users = await prismaFacet.rawQuery`SELECT * FROM "User" WHERE age > ${18}`;
         */
        async rawQuery(strings, ...values) {
          return await prisma.$queryRaw(strings, ...values);
        },

        /**
         * Check if Prisma Client is connected
         * @returns {boolean} True if connected
         */
        isConnected() {
          // Prisma doesn't expose connection status directly
          // This is a best-effort check
          return prisma && typeof prisma.$disconnect === 'function';
        }
      });
  }
});

