/**
 * useExtractHandlerResult Hook
 * 
 * Provides utility functionality for extracting handler results from Mycelia routing results.
 * Handles nested result structures from MessageSystem router and normalizes them.
 * 
 * This hook is useful for subsystems that need to process routing results, such as
 * HTTP gateways or API adapters that need to extract actual handler results from
 * the routing response structure.
 * 
 * @param {Object} ctx - Context object
 * @param {Object} api - Subsystem API being built
 * @param {BaseSubsystem} subsystem - Subsystem instance
 * @returns {Facet} Facet object with result extraction methods
 */
import { Facet } from 'mycelia-kernel-plugin/core';
import { createHook } from '../create-hook.mycelia.js';
import { getDebugFlag } from '../../utils/debug-flag.utils.mycelia.js';
import { createLogger } from '../../utils/logger.utils.mycelia.js';

export const useExtractHandlerResult = createHook({
  kind: 'extractHandlerResult',
  version: '1.0.0',
  overwrite: false,
  required: [],
  attach: true,
  source: import.meta.url,
  fn: (ctx, api, subsystem) => {
    const { name } = api;
    const config = ctx.config?.extractHandlerResult || {};
    const debug = getDebugFlag(config, ctx);
    const logger = createLogger(debug, `useExtractHandlerResult ${name}`);

    /**
     * Extract handler result from Mycelia routing result
     * 
     * Handles nested result structures from MessageSystem router:
     * - MessageSystem router result: { success, subsystem, messageId, result }
     * - Accepted structure: { accepted: { status, data, headers }, ... }
     * - Data wrapper: { data: ... }
     * - Error result: { success: false, error: ... }
     * 
     * @param {Object} result - Result from sendProtected() or router.route()
     * @param {Object} [options={}] - Extraction options
     * @param {boolean} [options.throwOnError=true] - Throw error if result indicates failure
     * @returns {Object|null} Extracted handler result or null if not found
     * @throws {Error} If result indicates failure and throwOnError is true
     * 
     * @example
     * // Extract from MessageSystem router result
     * const routingResult = await subsystem.identity.sendProtected(message);
     * const handlerResult = subsystem.extractHandlerResult.extract(routingResult);
     * 
     * @example
     * // Extract without throwing on error
     * const handlerResult = subsystem.extractHandlerResult.extract(result, { throwOnError: false });
     */
    function extract(result, options = {}) {
      const { throwOnError = true } = options;

      if (!result || result === null) {
        return null;
      }

      // MessageSystem router result: { success, subsystem, messageId, result }
      if (result && typeof result === 'object' && 'result' in result && 'subsystem' in result) {
        let handlerResult = result.result;

        // If result.result has 'accepted', extract the actual data
        if (handlerResult && typeof handlerResult === 'object' && 'accepted' in handlerResult) {
          const accepted = handlerResult.accepted;
          if (accepted && typeof accepted === 'object') {
            // Extract from accepted structure: { accepted: { status, data, headers }, ... }
            handlerResult = accepted.data || accepted;
          }
        }

        if (debug) {
          logger.log(`Extracted handler result from MessageSystem router result`);
        }

        return handlerResult;
      }

      // Some handlers return { data: ... }
      if ('data' in result) {
        if (debug) {
          logger.log(`Extracted handler result from data wrapper`);
        }
        return result.data;
      }

      // Error result
      if ('success' in result && result.success === false) {
        const errorMsg = result.error?.message || result.error || 'Unknown error';
        
        if (throwOnError) {
          throw new Error(errorMsg);
        }
        
        if (debug) {
          logger.warn(`Result indicates failure: ${errorMsg}`);
        }
        
        return null;
      }

      // Return as-is (already a handler result)
      if (debug) {
        logger.log(`Result is already a handler result, returning as-is`);
      }
      
      return result;
    }

    return new Facet('extractHandlerResult', { attach: true, source: import.meta.url })
      .add({
        /**
         * Extract handler result from routing result
         * @param {Object} result - Routing result
         * @param {Object} [options={}] - Extraction options
         * @returns {Object|null} Extracted handler result
         */
        extract,

        /**
         * Extract handler result without throwing on error
         * Convenience method that sets throwOnError to false
         * @param {Object} result - Routing result
         * @returns {Object|null} Extracted handler result or null
         */
        extractSafe(result) {
          return extract(result, { throwOnError: false });
        }
      });
  }
});

