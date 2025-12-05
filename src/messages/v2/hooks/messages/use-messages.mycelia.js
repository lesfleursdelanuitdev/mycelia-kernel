/**
 * useMessages Hook
 * 
 * Provides message creation functionality to subsystems using MessageFactory.
 * Exposes convenient methods for creating different types of messages.
 * 
 * @param {Object} ctx - Context object containing config.messages for message configuration
 * @param {Object} api - Subsystem API being built
 * @param {BaseSubsystem} subsystem - Subsystem instance
 * @returns {Facet} Facet object with message creation methods
 */
import { MessageFactory } from '../../models/message/message-factory.mycelia.js';
import { Message } from '../../models/message/message.mycelia.js';
import { Facet } from '../../models/facet-manager/facet.mycelia.js';
import { createHook } from '../create-hook.mycelia.js';
import { getDebugFlag } from '../../utils/debug-flag.utils.mycelia.js';
import { createLogger } from '../../utils/logger.utils.mycelia.js';

export const useMessages = createHook({
  kind: 'messages',
  version: '1.0.0',
  overwrite: false,
  required: [],
  attach: true,
  source: import.meta.url,
  fn: (ctx, api, subsystem) => {
    const { name } = api;
    const config = ctx.config?.messages || {};
    const debug = getDebugFlag(config, ctx);
    const logger = createLogger(debug, `useMessages ${name}`);

    return new Facet('messages', { attach: true, source: import.meta.url })
      .add({
        /**
         * Create a message with configurable options
         * @param {string} path - Message path
         * @param {any} body - Message body
         * @param {Object} [options={}] - Creation options
         * @param {string} [options.type='simple'] - Message type
         * @param {Object} [options.meta={}] - Message metadata
         * @returns {Message} New message instance
         * 
         * @example
         * const msg = subsystem.messages.create('canvas://layers/create', { name: 'background' });
         */
        create(path, body, options = {}) {
          const meta = options.meta || {};
          const messageData = MessageFactory.create(path, body, {
            ...options,
            meta
          });
          const message = new Message(messageData);
          if (debug) {
            logger.log(`Created message: ${message.getId()} (${options.type || 'simple'})`);
          }
          return message;
        },

        /**
         * Create a simple message
         * @param {string} path - Message path
         * @param {any} body - Message body
         * @param {Object} [meta={}] - Additional metadata
         * @returns {Message} New simple message
         */
        createSimple(path, body, meta = {}) {
          return this.create(path, body, { type: 'simple', meta });
        },

        /**
         * Create an atomic message
         * @param {string} path - Message path
         * @param {any} body - Message body
         * @param {Object} [meta={}] - Additional metadata
         * @returns {Message} New atomic message
         */
        createAtomic(path, body, meta = {}) {
          return this.create(path, body, { type: 'atomic', meta });
        },

        /**
         * Create a batch message
         * @param {string} path - Message path
         * @param {any} body - Message body (should be array)
         * @param {Object} [meta={}] - Additional metadata
         * @returns {Message} New batch message
         */
        createBatch(path, body, meta = {}) {
          return this.create(path, body, { type: 'batch', meta });
        },

        /**
         * Create a query message
         * @param {string} path - Message path
         * @param {any} body - Query parameters
         * @param {Object} [meta={}] - Additional metadata
         * @returns {Message} New query message
         */
        createQuery(path, body, meta = {}) {
          return this.create(path, body, { type: 'query', meta });
        },

        /**
         * Create a command message
         * @param {string} path - Message path
         * @param {any} body - Command data
         * @param {Object} [meta={}] - Additional metadata
         * @returns {Message} New command message (with auto-generated senderId)
         */
        createCommand(path, body, meta = {}) {
          return this.create(path, body, { type: 'command', meta });
        },

        /**
         * Create a transaction message
         * @param {string} path - Message path
         * @param {any} body - Message body
         * @param {string} [transactionId] - Transaction ID (auto-generated if not provided)
         * @param {number} [seq] - Sequence number
         * @param {Object} [meta={}] - Additional metadata
         * @returns {Message} New transaction message
         */
        createTransaction(path, body, transactionId = null, seq = null, meta = {}) {
          return this.create(path, body, {
            type: 'transaction',
            transaction: transactionId,
            seq,
            generateTransactionId: !transactionId,
            meta
          });
        },

        /**
         * Create a retry message
         * @param {string} path - Message path
         * @param {any} body - Message body
         * @param {number} [maxRetries=3] - Maximum retries
         * @param {Object} [meta={}] - Additional metadata
         * @returns {Message} New retry message
         */
        createRetry(path, body, maxRetries = 3, meta = {}) {
          return this.create(path, body, {
            type: 'retry',
            maxRetries,
            meta
          });
        },

        /**
         * Create an error message
         * @param {string} path - Message path
         * @param {any} body - Error details
         * @param {Object} [meta={}] - Additional metadata
         * @returns {Message} New error message
         */
        createError(path, body, meta = {}) {
          return this.create(path, body, { type: 'error', meta });
        },

        /**
         * Create multiple messages in a transaction batch
         * @param {Array<Object>} specs - Array of {path, body, options} objects
         * @param {Object} [globalOptions={}] - Global options applied to all messages
         * @returns {Array<Message>} Array of message instances
         * 
         * @example
         * const messages = subsystem.messages.createTransactionBatch([
         *   { path: 'command://save', body: { file: 'data.json' } },
         *   { path: 'command://backup', body: { file: 'data.json' } }
         * ]);
         */
        createTransactionBatch(specs, globalOptions = {}) {
          const updatedGlobalOptions = {
            ...globalOptions,
            meta: globalOptions.meta || {}
          };

          const messageDataArray = MessageFactory.createTransactionBatch(specs, updatedGlobalOptions);
          const messages = messageDataArray.map(data => new Message(data));
          
          if (debug) {
            logger.log(`Created transaction batch with ${messages.length} messages`);
          }
          
          return messages;
        },

        /**
         * Generate a unique message ID
         * @returns {string} Unique message ID
         */
        generateId() {
          return MessageFactory.generateId();
        },

        /**
         * Generate a unique transaction ID
         * @returns {string} Unique transaction ID
         */
        generateTransactionId() {
          return MessageFactory.generateTransactionId();
        },

        /**
         * Acquire a unique sender ID
         * @returns {string} Unique sender ID
         */
        acquireSenderId() {
          return MessageFactory.acquireSenderId();
        }
      });
  }
});




