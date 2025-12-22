/**
 * useSynchronous Hook
 * 
 * Enables immediate (synchronous) message processing for a subsystem.
 * 
 * Skips queue & scheduler.
 * Overrides accept() to call core.processImmediately() → core.processMessage().
 * Provides no-op process(), pause(), resume() (optionally calls core.processTick()).
 * 
 * Install last so its accept() has highest precedence.
 * 
 * @param {Object} ctx - Context object (not used by this hook)
 * @param {Object} api - Subsystem API being built
 * @param {BaseSubsystem} subsystem - Subsystem instance
 * @returns {Facet} Facet object with synchronous processing methods
 */
import { Facet } from 'mycelia-kernel-plugin/core';
import { createHook } from '../create-hook.mycelia.js';
import { getDebugFlag } from '../../utils/debug-flag.utils.mycelia.js';
import { createLogger } from '../../utils/logger.utils.mycelia.js';
import { findFacet } from '../../utils/find-facet.utils.mycelia.js';

export const useSynchronous = createHook({
  kind: 'synchronous',
  version: '1.0.0',
  overwrite: false,
  required: ['processor', 'statistics', 'listeners', 'queries'],
  attach: true,
  source: import.meta.url,
  contract: 'processor',
  // eslint-disable-next-line no-unused-vars
  fn: (ctx, api, _subsystem) => {
  const { name } = api;
  
  // Mark subsystem as synchronous
  api.isSynchronous = true;
  const config = ctx.config?.synchronous || {};
  const debug = getDebugFlag(config, ctx);
  const logger = createLogger(debug, `useSynchronous ${name}`);

  // Validate required facets
  const processorResult = findFacet(api.__facets, 'processor');
  if (!processorResult) {
    throw new Error(`useSynchronous ${name}: processor facet not found. useMessageProcessor must be added before useSynchronous.`);
  }

  const statisticsResult = findFacet(api.__facets, 'statistics');
  if (!statisticsResult) {
    throw new Error(`useSynchronous ${name}: statistics facet not found. useStatistics must be added before useSynchronous.`);
  }

  const listenersResult = findFacet(api.__facets, 'listeners');
  if (!listenersResult) {
    throw new Error(`useSynchronous ${name}: listeners facet not found. useListeners must be added before useSynchronous.`);
  }

  const queriesResult = findFacet(api.__facets, 'queries');
  if (!queriesResult) {
    throw new Error(`useSynchronous ${name}: queries facet not found. useQueries must be added before useSynchronous.`);
  }

  // Mark subsystem as synchronous
  api.isSynchronous = true;

  // Get processor facet for delegation
  const processorFacet = processorResult.facet;

  return new Facet('synchronous', { attach: true, source: import.meta.url, contract: 'processor' })
    .add({

    /**
     * Accept a message and process it immediately (synchronous mode).
     * 
     * Sets message.meta.processImmediately = true and routes to core.processImmediately()
     * or core.processMessage().
     * 
     * This method overrides any accept() from useMessageProcessor when useSynchronous
     * is installed last.
     * 
     * @param {Object} message - Message to process
     * @param {Object} [options={}] - Processing options
     * @returns {Promise<Object|undefined>} Processing result or undefined
     */
    async accept(message, options = {}) {
      // Ensure message has meta
      if (!message.meta) {
        message.meta = {};
      }
      
      // Set processImmediately flag
      message.meta.processImmediately = true;

      logger.log('Processing message immediately');

      // Delegate to processor facet
      if (processorFacet?.processImmediately) {
        return await processorFacet.processImmediately(message, options);
      }
      if (processorFacet?.processMessage) {
        return await processorFacet.processMessage(message, options);
      }

      // Defensive fallback
      logger.warn('No core processor found, message not processed');
      return undefined;
    },

    /**
     * Process a message through the complete processing pipeline.
     * 
     * Delegates to processor facet's processMessage method.
     * 
     * @param {{msg: Message, options: Object}|Message} pairOrMessage - Message-options pair or message
     * @param {Object} [options={}] - Processing options
     * @returns {Promise<Object>} Processing result
     */
    async processMessage(pairOrMessage, options = {}) {
      // Delegate to processor facet
      if (processorFacet?.processMessage) {
        return await processorFacet.processMessage(pairOrMessage, options);
      }
      throw new Error(`useSynchronous ${name}: processor facet missing processMessage method`);
    },

    /**
     * Process a message immediately without queuing.
     * 
     * Delegates to processor facet's processImmediately method.
     * 
     * @param {Message} message - Message to process immediately
     * @param {Object} [options={}] - Processing options
     * @returns {Promise<Object>} Processing result
     */
    async processImmediately(message, options = {}) {
      // Delegate to processor facet
      if (processorFacet?.processImmediately) {
        return await processorFacet.processImmediately(message, options);
      }
      throw new Error(`useSynchronous ${name}: processor facet missing processImmediately method`);
    },

    /**
     * Process tick (process one message from queue).
     * 
     * Delegates to processor facet's processTick method.
     * 
     * @returns {Promise<Object|null>} Processing result or null
     */
    async processTick() {
      // Delegate to processor facet
      if (processorFacet?.processTick) {
        return await processorFacet.processTick();
      }
      return null;
    },

    /**
     * Process tick (optional, for compatibility with scheduler interface).
     * 
     * Alias for processTick() for backward compatibility.
     * 
     * @returns {Promise<Object|null>} Processing result or null
     */
    async process() {
      return await this.processTick();
    },

    });
  }
});

