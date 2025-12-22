/**
 * useDBMigrations Hook
 * 
 * Provides database migration management functionality.
 */

import { Facet } from 'mycelia-kernel-plugin/core';
import { createHook } from '../create-hook.mycelia.js';
import { getDebugFlag } from '../../utils/debug-flag.utils.mycelia.js';
import { createLogger } from '../../utils/logger.utils.mycelia.js';
import { findFacet } from '../../utils/find-facet.utils.mycelia.js';

export const useDBMigrations = createHook({
  kind: 'migrations',
  version: '1.0.0',
  overwrite: false,
  required: ['storage'],
  attach: true,
  source: import.meta.url,
  contract: null,
  fn: (ctx, api, subsystem) => {
    const { name } = api;
    const config = ctx.config?.migrations || {};
    const debug = getDebugFlag(config, ctx);
    const logger = createLogger(debug, `useDBMigrations ${name}`);

    // Find storage facet
    const storageResult = findFacet(api.__facets, 'storage');
    if (!storageResult) {
      throw new Error(`useDBMigrations ${name}: storage facet not found. useDBStorage must be added before useDBMigrations.`);
    }

    const storage = storageResult.facet;
    const migrations = new Map(); // Migration registry
    const migrationTable = config.tableName || 'schema_migrations';
    const autoRun = config.autoRun !== false;

    // Auto-run migrations on initialization if enabled
    if (autoRun) {
      subsystem.onInit(async () => {
        try {
          const result = await migrateUp(null, {});
          if (result.success && logger.debug) {
            logger.log('Auto-migrations completed');
          }
        } catch (error) {
          logger.error('Auto-migration error:', error);
        }
      });
    }

    /**
     * Register a migration
     * 
     * @param {Object} migration - Migration object
     * @param {number} migration.version - Migration version
     * @param {string} migration.name - Migration name
     * @param {Function} migration.up - Up migration function
     * @param {Function} migration.down - Down migration function
     */
    function register(migration) {
      if (!migration.version || !migration.name || !migration.up) {
        throw new Error('Migration must have version, name, and up function');
      }
      migrations.set(migration.version, migration);
      if (logger.debug) {
        logger.log(`Registered migration: ${migration.version} - ${migration.name}`);
      }
    }

    /**
     * Get current migration version
     * @returns {Promise<number>} Current version
     */
    async function getCurrentVersion() {
      try {
        const result = await storage.get(migrationTable, { namespace: 'default' });
        if (result.success && result.data) {
          return result.data.version || 0;
        }
        return 0;
      } catch (error) {
        return 0;
      }
    }

    /**
     * Set current migration version
     * @param {number} version - Version to set
     */
    async function setCurrentVersion(version) {
      await storage.set(migrationTable, { version }, { namespace: 'default' });
    }

    /**
     * Run migrations up
     * 
     * @param {number} [targetVersion] - Target version (runs all if not specified)
     * @param {Object} [options={}] - Migration options
     * @returns {Promise<{success: boolean, applied?: Array, error?: Error}>}
     */
    async function migrateUp(targetVersion, options = {}) {
      try {
        const currentVersion = await getCurrentVersion();
        const sortedVersions = Array.from(migrations.keys()).sort((a, b) => a - b);
        const versionsToRun = targetVersion
          ? sortedVersions.filter(v => v > currentVersion && v <= targetVersion)
          : sortedVersions.filter(v => v > currentVersion);

        if (versionsToRun.length === 0) {
          return { success: true, applied: [] };
        }

        const applied = [];
        for (const version of versionsToRun) {
          const migration = migrations.get(version);
          if (!migration) {
            return { success: false, error: new Error(`Migration ${version} not found`) };
          }

          if (logger.debug) {
            logger.log(`Running migration ${version}: ${migration.name}`);
          }

          // Execute up migration
          await migration.up(storage);
          await setCurrentVersion(version);
          applied.push({ version, name: migration.name });

          if (logger.debug) {
            logger.log(`Migration ${version} completed`);
          }
        }

        return { success: true, applied };
      } catch (error) {
        logger.error('Migration up error:', error);
        return { success: false, error };
      }
    }

    /**
     * Run migrations down
     * 
     * @param {number} [targetVersion] - Target version (rolls back all if not specified)
     * @param {Object} [options={}] - Migration options
     * @returns {Promise<{success: boolean, rolledBack?: Array, error?: Error}>}
     */
    async function migrateDown(targetVersion, options = {}) {
      try {
        const currentVersion = await getCurrentVersion();
        const sortedVersions = Array.from(migrations.keys()).sort((a, b) => b - a);
        const versionsToRollback = targetVersion
          ? sortedVersions.filter(v => v <= currentVersion && v > targetVersion)
          : sortedVersions.filter(v => v <= currentVersion);

        if (versionsToRollback.length === 0) {
          return { success: true, rolledBack: [] };
        }

        const rolledBack = [];
        for (const version of versionsToRollback) {
          const migration = migrations.get(version);
          if (!migration) {
            return { success: false, error: new Error(`Migration ${version} not found`) };
          }

          if (!migration.down) {
            return { success: false, error: new Error(`Migration ${version} does not have down function`) };
          }

          if (logger.debug) {
            logger.log(`Rolling back migration ${version}: ${migration.name}`);
          }

          // Execute down migration
          await migration.down(storage);
          const previousVersion = versionsToRollback[versionsToRollback.indexOf(version) + 1] || 0;
          await setCurrentVersion(previousVersion);
          rolledBack.push({ version, name: migration.name });

          if (logger.debug) {
            logger.log(`Migration ${version} rolled back`);
          }
        }

        return { success: true, rolledBack };
      } catch (error) {
        logger.error('Migration down error:', error);
        return { success: false, error };
      }
    }

    /**
     * Get migration status
     * @returns {Promise<{currentVersion: number, pendingMigrations: Array, appliedMigrations: Array}>}
     */
    async function getStatus() {
      const currentVersion = await getCurrentVersion();
      const sortedVersions = Array.from(migrations.keys()).sort((a, b) => a - b);
      const pendingMigrations = sortedVersions.filter(v => v > currentVersion).map(v => ({
        version: v,
        name: migrations.get(v).name
      }));
      const appliedMigrations = sortedVersions.filter(v => v <= currentVersion).map(v => ({
        version: v,
        name: migrations.get(v).name
      }));

      return {
        currentVersion,
        pendingMigrations,
        appliedMigrations
      };
    }

    return new Facet('migrations', { attach: true, source: import.meta.url })
      .add({
        register,
        migrateUp,
        migrateDown,
        getStatus,
        getCurrentVersion,
        _config: config,
        logger
      });
  }
});

