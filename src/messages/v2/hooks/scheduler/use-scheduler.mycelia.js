/**
 * useScheduler Hook
 * 
 * Provides message scheduling functionality to subsystems.
 * Wraps SubsystemScheduler and manages processing lifecycle state.
 * 
 * @param {Object} ctx - Context object containing config.scheduler for scheduler configuration
 * @param {Object} api - Subsystem API being built
 * @param {BaseSubsystem} subsystem - Subsystem instance
 * @returns {Facet} Facet object with scheduler methods
 */
import { SubsystemScheduler } from './subsystem-scheduler.mycelia.js';
import { Facet } from '../../models/facet-manager/facet.mycelia.js';
import { createHook } from '../create-hook.mycelia.js';
import { getDebugFlag } from '../../utils/debug-flag.utils.mycelia.js';
import { findFacet } from '../../utils/find-facet.utils.mycelia.js';

export const useScheduler = createHook({
  kind: 'scheduler',
  version: '1.0.0',
  overwrite: false,
  required: ['queue', 'processor', 'statistics', 'queries'],
  attach: true,
  source: import.meta.url,
  contract: 'scheduler',
  fn: (ctx, api, subsystem) => {
    const { name } = api;
    const config = ctx.config?.scheduler || {};
    
    // Processing lifecycle state
    let isProcessing = false;
    let isPaused = false;
    let priority = config.priority || 1;
    
    // Create scheduler - pass subsystem directly since it uses subsystem.find()
    const scheduler = new SubsystemScheduler(subsystem, {
      schedulingStrategy: config.schedulingStrategy || 'priority',
      maxMessagesPerSlice: config.maxMessagesPerSlice || 10,
      debug: getDebugFlag(config, ctx)
    });
    
    // Get statistics hook if available
    const statisticsResult = findFacet(api.__facets, 'statistics');
    const statisticsFacet = statisticsResult ? statisticsResult.facet : null;
    
    return new Facet('scheduler', { attach: true, source: import.meta.url, contract: 'scheduler' })
    .add({
    
    /**
     * Process messages during a time slice
     * @param {number} timeSlice - Available processing time in ms
     * @returns {Promise<Object>} Processing result
     */
    async process(timeSlice) {
      if (isPaused) {
        return { processed: 0, remainingTime: timeSlice, status: 'paused' };
      }
      
      // Record time slice received
      if (statisticsFacet?._statistics) {
        statisticsFacet._statistics.recordTimeSlice();
      }
      
      // Delegate to subsystem scheduler
      return await scheduler.process(timeSlice);
    },
    
    /**
     * Get scheduler instance
     * @returns {SubsystemScheduler} Scheduler instance
     */
    getScheduler() {
      return scheduler;
    },
    
    /**
     * Configure scheduler options
     * @param {Object} schedulerOptions - Scheduler configuration options
     */
    configureScheduler(schedulerOptions) {
      if (schedulerOptions.strategy) {
        scheduler.setStrategy(schedulerOptions.strategy, schedulerOptions.strategyOptions || {});
      }
      if (schedulerOptions.maxMessagesPerSlice !== undefined) {
        scheduler.options.maxMessagesPerSlice = schedulerOptions.maxMessagesPerSlice;
      }
    },
    
    /**
     * Get subsystem priority
     * @returns {number} Priority value
     */
    getPriority() {
      return priority;
    },
    
    /**
     * Set subsystem priority
     * @param {number} newPriority - New priority value
     */
    setPriority(newPriority) {
      if (typeof newPriority !== 'number' || newPriority < 0) {
        throw new Error(`useScheduler ${name}: setPriority: priority must be a non-negative number`);
      }
      priority = newPriority;
    },
    
    /**
     * Pause message processing
     */
    pauseProcessing() {
      isPaused = true;
    },
    
    /**
     * Resume message processing
     */
    resumeProcessing() {
      isPaused = false;
    },
    
    /**
     * Check if processing is paused
     * @returns {boolean} True if paused
     */
    isPaused() {
      return isPaused;
    },
    
    /**
     * Check if currently processing
     * @returns {boolean} True if processing
     */
    isProcessing() {
      return isProcessing;
    },
    
    /**
     * Set processing state (internal use)
     * @param {boolean} value - Processing state
     * @private
     */
    _setProcessing(value) {
      isProcessing = value;
    },
    
    // Expose scheduler for internal use
    _scheduler: scheduler
    });
  }
});

