/**
 * useHealthCheck Hook
 * 
 * Provides health check functionality to subsystems.
 * Tracks subsystem health status and provides health check endpoints.
 * 
 * @param {Object} ctx - Context object
 * @param {Object} api - Subsystem API being built
 * @param {BaseSubsystem} subsystem - Subsystem instance
 * @returns {Facet} Health check facet
 */
import { Facet } from '../../models/facet-manager/facet.mycelia.js';
import { createHook } from '../create-hook.mycelia.js';
import { getDebugFlag } from '../../utils/debug-flag.utils.mycelia.js';
import { createLogger } from '../../utils/logger.utils.mycelia.js';
import { HealthStatus } from '../../models/health/health-status.mycelia.js';

export const useHealthCheck = createHook({
  kind: 'healthCheck',
  version: '1.0.0',
  overwrite: false,
  required: [], // Optional dependencies (statistics, queue, etc.)
  attach: true,
  source: import.meta.url,
  fn: (ctx, api, subsystem) => {
    const { name } = api;
    const config = ctx.config?.healthCheck || {};
    const debug = getDebugFlag(config, ctx);
    const logger = createLogger(debug, `useHealthCheck ${name}`);

    // Health check callbacks
    const healthChecks = new Map(); // name -> { check: Function, options: Object }

    /**
     * Perform health check
     * @returns {Promise<HealthStatus>} Health status
     */
    async function performHealthCheck() {
      const checks = {};
      let overallStatus = 'healthy';

      // Run all registered health checks
      for (const [checkName, { check, options }] of healthChecks.entries()) {
        try {
          const checkResult = await check(subsystem, options);
          
          if (checkResult instanceof HealthStatus) {
            checks[checkName] = {
              status: checkResult.status,
              message: checkResult.message,
              metadata: checkResult.metadata || {},
              timestamp: Date.now()
            };
          } else if (typeof checkResult === 'object' && checkResult.status) {
            checks[checkName] = {
              status: checkResult.status,
              message: checkResult.message || null,
              metadata: checkResult.metadata || {},
              timestamp: Date.now()
            };
          } else {
            // Simple boolean or string result
            const status = checkResult === true || checkResult === 'healthy' ? 'healthy' : 'unhealthy';
            checks[checkName] = {
              status,
              message: typeof checkResult === 'string' ? checkResult : null,
              metadata: {},
              timestamp: Date.now()
            };
          }

          // Update overall status
          if (checks[checkName].status === 'unhealthy') {
            overallStatus = 'unhealthy';
          } else if (checks[checkName].status === 'degraded' && overallStatus === 'healthy') {
            overallStatus = 'degraded';
          }
        } catch (error) {
          logger.error(`Health check "${checkName}" failed:`, error);
          checks[checkName] = {
            status: 'unhealthy',
            message: error.message || 'Health check failed',
            metadata: { error: error.name },
            timestamp: Date.now()
          };
          overallStatus = 'unhealthy';
        }
      }

      // Run default health checks if no custom checks registered
      if (healthChecks.size === 0) {
        await runDefaultHealthChecks(checks, subsystem);
        // Determine overall status from default checks
        const checkValues = Object.values(checks);
        if (checkValues.some(c => c.status === 'unhealthy')) {
          overallStatus = 'unhealthy';
        } else if (checkValues.some(c => c.status === 'degraded')) {
          overallStatus = 'degraded';
        }
      }

      return new HealthStatus(overallStatus, {
        subsystem: name,
        checks,
        message: overallStatus === 'healthy' ? 'All health checks passed' : 'Some health checks failed',
        metadata: {
          checkCount: Object.keys(checks).length
        }
      });
    }

    /**
     * Run default health checks
     * @param {Object} checks - Checks object to populate
     * @param {BaseSubsystem} subsystem - Subsystem instance
     */
    async function runDefaultHealthChecks(checks, subsystem) {
      // Check if subsystem is built
      checks['built'] = {
        status: subsystem.isBuilt() ? 'healthy' : 'unhealthy',
        message: subsystem.isBuilt() ? 'Subsystem is built' : 'Subsystem is not built',
        metadata: {},
        timestamp: Date.now()
      };

      // Check statistics if available
      const statisticsFacet = subsystem.find('statistics');
      if (statisticsFacet) {
        try {
          const stats = statisticsFacet.getStatistics();
          const errorRate = stats.messagesAccepted > 0
            ? stats.processingErrors / stats.messagesAccepted
            : 0;

          let status = 'healthy';
          if (errorRate > 0.1) { // > 10% error rate
            status = 'unhealthy';
          } else if (errorRate > 0.05) { // > 5% error rate
            status = 'degraded';
          }

          checks['statistics'] = {
            status,
            message: `Error rate: ${(errorRate * 100).toFixed(2)}%`,
            metadata: {
              messagesAccepted: stats.messagesAccepted,
              messagesProcessed: stats.messagesProcessed,
              processingErrors: stats.processingErrors,
              errorRate
            },
            timestamp: Date.now()
          };
        } catch (error) {
          checks['statistics'] = {
            status: 'degraded',
            message: 'Failed to retrieve statistics',
            metadata: { error: error.message },
            timestamp: Date.now()
          };
        }
      }

      // Check queue if available
      const queueFacet = subsystem.find('queue');
      if (queueFacet) {
        try {
          const queueStatus = queueFacet.getQueueStatus();
          const utilization = queueFacet.queue.capacity > 0
            ? queueStatus.size / queueFacet.queue.capacity
            : 0;

          let status = 'healthy';
          if (utilization >= 1.0) { // Queue full
            status = 'unhealthy';
          } else if (utilization > 0.8) { // > 80% full
            status = 'degraded';
          }

          checks['queue'] = {
            status,
            message: `Queue utilization: ${(utilization * 100).toFixed(1)}%`,
            metadata: {
              size: queueStatus.size,
              capacity: queueFacet.queue.capacity,
              utilization
            },
            timestamp: Date.now()
          };
        } catch (error) {
          checks['queue'] = {
            status: 'degraded',
            message: 'Failed to retrieve queue status',
            metadata: { error: error.message },
            timestamp: Date.now()
          };
        }
      }
    }

    return new Facet('healthCheck', {
      attach: true,
      source: import.meta.url
    })
    .add({
      /**
       * Get current health status
       * @returns {Promise<HealthStatus>} Health status
       */
      async getHealth() {
        return performHealthCheck();
      },

      /**
       * Register a custom health check
       * 
       * @param {string} name - Check name
       * @param {Function} check - Health check function
       * @param {Object} [options={}] - Check options
       * @returns {this}
       * 
       * @example
       * healthCheck.registerCheck('database', async (subsystem) => {
       *   // Check database connection
       *   return { status: 'healthy', message: 'Database connected' };
       * });
       */
      registerCheck(name, check, options = {}) {
        if (typeof check !== 'function') {
          throw new Error('useHealthCheck.registerCheck: check must be a function');
        }

        healthChecks.set(name, { check, options });

        if (debug) {
          logger.log(`Registered health check: ${name}`);
        }

        return this;
      },

      /**
       * Unregister a health check
       * 
       * @param {string} name - Check name
       * @returns {boolean} True if check was removed
       */
      unregisterCheck(name) {
        const removed = healthChecks.delete(name);

        if (debug && removed) {
          logger.log(`Unregistered health check: ${name}`);
        }

        return removed;
      },

      /**
       * Get all registered health check names
       * @returns {Array<string>} Array of check names
       */
      getRegisteredChecks() {
        return Array.from(healthChecks.keys());
      }
    });
  }
});




