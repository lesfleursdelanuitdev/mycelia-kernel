/**
 * useStatistics Hook
 * 
 * Provides statistics tracking functionality to subsystems.
 * Wraps SubsystemStatistics and exposes getStatistics() method.
 * 
 * @param {Object} ctx - Context object containing config.statistics for statistics configuration
 * @param {Object} api - Subsystem API being built
 * @param {BaseSubsystem} subsystem - Subsystem instance
 * @returns {Facet} Facet object with statistics methods
 */
import { SubsystemStatistics } from './subsystem-statistics.mycelia.js';
import { Facet } from '../../models/facet-manager/facet.mycelia.js';
import { createHook } from '../create-hook.mycelia.js';
import { getDebugFlag } from '../../utils/debug-flag.utils.mycelia.js';

export const useStatistics = createHook({
  kind: 'statistics',
  version: '1.0.0',
  overwrite: false,
  required: [],
  attach: true,
  source: import.meta.url,
  // eslint-disable-next-line no-unused-vars
  fn: (ctx, api, _subsystem) => {
    const config = ctx.config?.statistics || {};
    const debug = getDebugFlag(config, ctx);
    const version = ctx.__version || '0.0.0';
    
    // Create statistics instance
    const statistics = new SubsystemStatistics(debug);
    return new Facet('statistics', { attach: true, source: import.meta.url, version })
    .add({
      /**
       * Get subsystem statistics
       * @returns {Object} Statistics object
       */
      getStatistics() {
        return statistics.getStats();
      },
      
      /**
       * Get processing metrics
       * @returns {Object} Processing metrics
       */
      getProcessingMetrics() {
        return {
          messagesAccepted: statistics.getStats().messagesAccepted,
          messagesProcessed: statistics.getStats().messagesProcessed,
          averageProcessingTime: statistics.getAverageProcessingTime(),
          processingErrors: statistics.getStats().processingErrors,
          queueFullEvents: statistics.getStats().queueFullEvents,
          timeSlicesReceived: statistics.getStats().timeSlicesReceived
        };
      },
      
      // Expose statistics instance for internal use by other hooks
      _statistics: statistics
    });
  }
});

