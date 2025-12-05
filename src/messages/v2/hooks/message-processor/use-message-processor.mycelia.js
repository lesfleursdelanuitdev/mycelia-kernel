/**
 * useMessageProcessor Hook
 * 
 * Provides core message processing functionality to subsystems.
 * Handles message acceptance, processing, and routing.
 * 
 * @param {Object} ctx - Context object
 * @param {Object} ctx.ms - MessageSystem instance
 * @param {Object} api - Subsystem API being built
 * @param {BaseSubsystem} subsystem - Subsystem instance
 * @returns {Facet} Facet object with message processing methods
 */
import { acceptMessage } from './accept-message.mycelia.js';
import { Facet } from '../../models/facet-manager/facet.mycelia.js';
import { createHook } from '../create-hook.mycelia.js';
import { getDebugFlag } from '../../utils/debug-flag.utils.mycelia.js';
import { findFacet } from '../../utils/find-facet.utils.mycelia.js';

export const useMessageProcessor = createHook({
  kind: 'processor',
  version: '1.0.0',
  overwrite: false,
  required: ['router', 'statistics', 'queue'],
  attach: true,
  source: import.meta.url,
  contract: 'processor',
  fn: (ctx, api, subsystem) => {
    const { name } = api;
    const config = ctx.config?.processor || {};
    const debug = getDebugFlag(config, ctx);
    
    // Get required facets
    const statisticsResult = findFacet(api.__facets, 'statistics');
    if (!statisticsResult) {
      throw new Error(`useMessageProcessor ${name}: statistics facet not found. useStatistics must be added before useMessageProcessor.`);
    }
    const statisticsFacet = statisticsResult.facet;
    
    const queueResult = findFacet(api.__facets, 'queue');
    if (!queueResult) {
      throw new Error(`useMessageProcessor ${name}: queue facet not found. useQueue must be added before useMessageProcessor.`);
    }
    const queueFacet = queueResult.facet;
    
    /**
     * Core message processing logic
     * Gets router facet at runtime to support overwrites (e.g., useRouterWithScopes)
     */
    const processMessageCore = async (message, options = {}) => {
      // Get router facet at runtime (supports overwrites like useRouterWithScopes)
      const routerFacet = subsystem.find('router');
      
      if (!routerFacet) {
        if (statisticsFacet?._statistics) {
          statisticsFacet._statistics.recordError();
        }
        throw new Error(`useMessageProcessor ${name}: No router facet available`);
      }
      
      if (typeof routerFacet.route !== 'function') {
        if (statisticsFacet?._statistics) {
          statisticsFacet._statistics.recordError();
        }
        throw new Error(`useMessageProcessor ${name}: Router facet does not have a route() method`);
      }
      
      const runtimeDebug = options.debug !== undefined ? options.debug : debug;
      const startTime = Date.now();
      
      try {
        const result = await routerFacet.route(message, options);
        
        // Record statistics if result indicates success
        if (result && result.success !== false && statisticsFacet?._statistics) {
          const processingTime = Date.now() - startTime;
          statisticsFacet._statistics.recordProcessed(processingTime);
        }
        
        return result;
      } catch (error) {
        if (statisticsFacet?._statistics) {
          statisticsFacet._statistics.recordError();
        }
        if (runtimeDebug) {
          console.error(`useMessageProcessor ${name}: Error routing message ${message.getId()}:`, error);
        }
        throw error;
      }
    };
    
    return new Facet('processor', { attach: true, source: import.meta.url, contract: 'processor' })
      .add({
        /**
         * Process a message through the complete processing pipeline
         * @param {{msg: Message, options: Object}|Message} pairOrMessage - Message-options pair or message
         * @param {Object} [options={}] - Processing options
         * @param {Symbol} [options.callerId] - Secret identity Symbol of the calling subsystem
         * @returns {Promise<Object>} Processing result
         */
        async processMessage(pairOrMessage, options = {}) {
          // Extract message and options from pair (or handle backward compatibility)
          let message, finalOptions;
          if (pairOrMessage && typeof pairOrMessage === 'object' && 'msg' in pairOrMessage) {
            // Pair format: {msg, options} - message already dequeued
            message = pairOrMessage.msg;
            finalOptions = { ...(pairOrMessage.options || {}), ...options };
          } else {
            // Backward compatibility: just a message
            message = pairOrMessage;
            finalOptions = options;
          }
          
          return await processMessageCore(message, finalOptions);
        },
        
        /**
         * Process a message immediately without queuing
         * @param {Message} message - Message to process immediately
         * @param {Object} [options={}] - Processing options
         * @param {Symbol} [options.callerId] - Secret identity Symbol of the calling subsystem
         * @returns {Promise<Object>} Processing result
         */
        async processImmediately(message, options = {}) {
          return await processMessageCore(message, options);
        },
        
        /**
         * Process a single message from the queue (process one tick)
         * 
         * Dequeues one message from the queue and processes it.
         * Used as a fallback when no scheduler is present, or for manual
         * one-at-a-time processing.
         * 
         * @returns {Promise<Object|null>} Processing result or null if no message in queue
         */
        async processTick() {
          // Dequeue one message from the queue
          const pair = queueFacet.selectNextMessage();
          
          if (!pair) {
            // No message in queue
            return null;
          }
          
          // Process the dequeued message
          return await this.processMessage(pair);
        },
        
        /**
         * Accept a message and place it on the queue
         * @param {Message} message - Message to accept
         * @param {Object} [options={}] - Options for message processing
         * @param {string} [options.currentPiece] - Current piece for routing context
         * @returns {Promise<boolean>} Success status
         */
        async accept(message, options = {}) {
          return await acceptMessage(
            {
              queueManager: queueFacet._queueManager,
              statisticsRecorder: () => {
                if (statisticsFacet?._statistics) {
                  statisticsFacet._statistics.recordAccepted();
                }
              },
              errorRecorder: () => {
                if (statisticsFacet?._statistics) {
                  statisticsFacet._statistics.recordError();
                }
              },
              debug: options.debug || false,
              subsystemName: name
            },
            message,
            options
          );
        }
      });
  }
});

