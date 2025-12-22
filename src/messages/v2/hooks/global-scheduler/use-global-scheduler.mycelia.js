/**
 * useGlobalScheduler Hook
 * 
 * Provides global scheduling functionality to subsystems using GlobalScheduler.
 * Manages time allocation between subsystems using configurable scheduling strategies.
 * 
 * @param {Object} ctx - Context object
 * @param {Object} ctx.ms - MessageSystem instance (required)
 * @param {Object} ctx.config?.globalScheduler - Global scheduler configuration
 * @param {Object} api - Subsystem API being built
 * @param {BaseSubsystem} subsystem - Subsystem instance
 * @returns {Facet} Facet object with global scheduler methods
 */
import { GlobalScheduler } from '../../models/message-system/global-scheduler.mycelia.js';
import { Facet } from 'mycelia-kernel-plugin/core';
import { createHook } from '../create-hook.mycelia.js';
import { getDebugFlag } from '../../utils/debug-flag.utils.mycelia.js';
import { createLogger } from '../../utils/logger.utils.mycelia.js';

export const useGlobalScheduler = createHook({
  kind: 'globalScheduler',
  version: '1.0.0',
  overwrite: false,
  required: [],
  attach: false,
  source: import.meta.url,
  // eslint-disable-next-line no-unused-vars
  fn: (ctx, api, subsystem) => {
    const { name } = api;
    const { ms } = ctx;
    
    // Validate MessageSystem is available
    if (!ms) {
      throw new Error(`useGlobalScheduler ${name}: MessageSystem (ctx.ms) is required but not found`);
    }
    
    const config = ctx.config?.globalScheduler || {};
    const debug = getDebugFlag(config, ctx);
    const logger = createLogger(debug, `useGlobalScheduler ${name}`);
    
    // Create GlobalScheduler instance
    const scheduler = new GlobalScheduler(ms, {
      timeSliceDuration: config.timeSliceDuration || 50,
      schedulingStrategy: config.schedulingStrategy || 'round-robin',
      debug: debug,
      ...config.options // Allow additional options
    });
    
    if (debug) {
      logger.log('Initialized GlobalScheduler');
    }
    
    return new Facet('globalScheduler', { attach: false, source: import.meta.url })
      .add({
        /**
         * Start the global scheduling loop
         * @returns {void}
         * 
         * @example
         * subsystem.globalScheduler.start();
         */
        start() {
          scheduler.start();
          if (debug) {
            logger.log('Started global scheduling');
          }
        },

        /**
         * Stop the global scheduling loop
         * @returns {void}
         * 
         * @example
         * subsystem.globalScheduler.stop();
         */
        stop() {
          scheduler.stop();
          if (debug) {
            logger.log('Stopped global scheduling');
          }
        },

        /**
         * Set the current scheduling strategy
         * @param {string} name - Strategy name
         * @param {Object} [options={}] - Strategy-specific options
         * @returns {void}
         * 
         * @example
         * subsystem.globalScheduler.setStrategy('priority');
         * 
         * @example
         * subsystem.globalScheduler.setStrategy('adaptive', { averageUtilization: 0.7 });
         */
        setStrategy(name, options = {}) {
          scheduler.setStrategy(name, options);
          if (debug) {
            logger.log(`Set strategy to '${name}'`, options);
          }
        },

        /**
         * Register a custom scheduling strategy
         * @param {string} name - Strategy name
         * @param {Function} strategyFunction - Strategy function: (subsystems, options) => BaseSubsystem
         * @returns {void}
         * 
         * @example
         * subsystem.globalScheduler.registerStrategy('my-custom', (subsystems, options) => {
         *   // Custom strategy logic
         *   return subsystems[0];
         * });
         */
        registerStrategy(name, strategyFunction) {
          scheduler.registerStrategy(name, strategyFunction);
          if (debug) {
            logger.log(`Registered strategy '${name}'`);
          }
        },

        /**
         * Unregister a scheduling strategy
         * @param {string} name - Strategy name
         * @returns {boolean} True if strategy was removed
         * 
         * @example
         * subsystem.globalScheduler.unregisterStrategy('my-custom');
         */
        unregisterStrategy(name) {
          const removed = scheduler.unregisterStrategy(name);
          if (debug && removed) {
            logger.log(`Unregistered strategy '${name}'`);
          }
          return removed;
        },

        /**
         * Get available strategy names
         * @returns {Array<string>} Array of strategy names
         * 
         * @example
         * const strategies = subsystem.globalScheduler.getAvailableStrategies();
         * console.log('Available strategies:', strategies);
         */
        getAvailableStrategies() {
          return scheduler.getAvailableStrategies();
        },

        /**
         * Get current strategy name
         * @returns {string} Current strategy name
         * 
         * @example
         * const current = subsystem.globalScheduler.getCurrentStrategy();
         * console.log('Current strategy:', current);
         */
        getCurrentStrategy() {
          return scheduler.getCurrentStrategy();
        },

        /**
         * Get global scheduler statistics
         * @returns {Object} Statistics object
         * 
         * @example
         * const stats = subsystem.globalScheduler.getStatistics();
         * console.log('Scheduling stats:', stats);
         */
        getStatistics() {
          return scheduler.getStatistics();
        },

        /**
         * Get statistics for all registered subsystems
         * @returns {Object} Subsystem statistics object
         * 
         * @example
         * const subsystemStats = subsystem.globalScheduler.getSubsystemStatistics();
         * console.log('Subsystem stats:', subsystemStats);
         */
        getSubsystemStatistics() {
          return scheduler.getSubsystemStatistics();
        },

        /**
         * Clear all statistics and reset state
         * @returns {void}
         * 
         * @example
         * subsystem.globalScheduler.clear();
         */
        clear() {
          scheduler.clear();
          if (debug) {
            logger.log('Cleared scheduler statistics');
          }
        },

        // Expose scheduler instance for internal use (if needed by other hooks)
        _scheduler: scheduler
      });
  }
});

