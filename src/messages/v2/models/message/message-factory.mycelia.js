/**
 * MessageFactory Class
 * 
 * Centralized factory for creating messages with configurable options.
 * Handles all message creation logic including metadata building,
 * ID generation, and transaction management.
 * 
 * @example
 * // Create a simple message
 * const msg = MessageFactory.create('canvas://layers/create', { name: 'background' });
 * 
 * @example
 * // Create an atomic message
 * const atomicMsg = MessageFactory.create('command://save', { file: 'data.json' }, { 
 *   type: 'atomic' 
 * });
 * 
 * @example
 * // Create a transaction message with auto-generated transaction ID
 * const txMsg = MessageFactory.create('command://execute', { cmd: 'save' }, { 
 *   type: 'transaction',
 *   generateTransactionId: true,
 *   seq: 1 
 * });
 * 
 * @example
 * // Create multiple messages in a transaction
 * const messages = MessageFactory.createTransactionBatch([
 *   { path: 'command://save', body: { file: 'data.json' } },
 *   { path: 'command://backup', body: { file: 'data.json' } }
 * ]);
 */
import { MessageMetadata } from './message-metadata.mycelia.js';
import { buildMessageMetadata } from './message-metadata.utils.mycelia.js';
import { generateTraceId, inheritTraceId } from '../../utils/trace.utils.mycelia.js';

export class MessageFactory {
  /**
   * Create a message with configurable options
   * 
   * @param {string} path - The message path in format 'subsystem://path/to/resource'
   * @param {any} body - The message payload/data
   * @param {Object} [options={}] - Creation options
   * @param {string} [options.type='simple'] - Message type: 'simple', 'atomic', 'batch', 'query', 'retry', 'transaction', 'command'
   * @param {Object} [options.meta={}] - Message metadata
   * @param {number} [options.maxRetries] - Max retries (for retry type)
   * @param {string} [options.transaction] - Transaction ID (for transaction type)
   * @param {number} [options.seq] - Sequence number (for transaction type)
   * @param {boolean} [options.generateTransactionId=false] - Auto-generate transaction ID if not provided
   * @returns {Object} Message data object
   * 
   * @example
   * // Simple message
   * const msg = MessageFactory.create('canvas://layers/create', { name: 'background' });
   * 
   * @example
   * // Atomic message
   * const atomicMsg = MessageFactory.create('command://save', { file: 'data.json' }, { 
   *   type: 'atomic' 
   * });
   * 
   * @example
   * // Retry message
   * const retryMsg = MessageFactory.create('api://fetch', { url: '...' }, { 
   *   type: 'retry',
   *   maxRetries: 5 
   * });
   * 
   * @example
   * // Transaction message
   * const txMsg = MessageFactory.create('command://execute', { cmd: 'save' }, { 
   *   type: 'transaction',
   *   transaction: 'tx_123',
   *   seq: 1 
   * });
   * 
   * @example
   * // Query message (auto-detected from path or explicit type)
   * const queryMsg = MessageFactory.create('error://query/get-errors', { filters: {} });
   * // OR explicitly
   * const queryMsg2 = MessageFactory.create('error://query/get-errors', { filters: {} }, { type: 'query' });
   * 
   * @example
   * // Command message (auto-generates senderId)
   * const cmdMsg = MessageFactory.create('command://execute', { action: 'save' }, { type: 'command' });
   * // cmdMsg.meta.type = 'command'
   * // cmdMsg.meta.senderId = 'sender_1703123456789_abc123' (auto-generated)
   */
  static create(path, body, options = {}) {
    const { 
      type = 'simple', 
      meta = {}, 
      maxRetries, 
      transaction, 
      seq, 
      generateTransactionId = false 
    } = options;
    
    // Handle transaction ID generation
    let finalTransaction = transaction;
    if (type === 'transaction' && !transaction && generateTransactionId) {
      finalTransaction = this.generateTransactionId();
    }
    
    // Extract parent message for trace ID inheritance (if provided)
    const parentMessage = options.parentMessage || null;
    
    // Build metadata based on type and options
    const messageMeta = this.buildMetadata(type, meta, { 
      maxRetries, 
      transaction: finalTransaction, 
      seq,
      path // Pass path for auto-detection of query messages
    }, parentMessage);
    
    // Create the message data
    const id = meta.id || this.generateId();
    
    return {
      id,
      path,
      body,
      meta: messageMeta
    };
  }

  /**
   * Build metadata based on message type and options
   * 
   * @param {string} type - Message type
   * @param {Object} meta - Base metadata
   * @param {Object} options - Type-specific options
   * @param {Message|Object} [parentMessage] - Parent message for trace ID inheritance
   * @returns {MessageMetadata} MessageMetadata instance
   * @private
   */
  static buildMetadata(type, meta, options, parentMessage = null) {
    // Generate or inherit trace ID
    let traceId = meta.traceId;
    if (!traceId && parentMessage) {
      traceId = inheritTraceId(parentMessage);
    }
    if (!traceId) {
      traceId = generateTraceId();
    }
    // Ensure traceId is in meta for buildMessageMetadata
    const metaWithTraceId = { ...meta, traceId };
    
    // Build base metadata using utility function
    const { fixedMeta, mutableMeta } = buildMessageMetadata(
      type,
      metaWithTraceId,
      options,
      () => MessageFactory.generateSenderId(),
      parentMessage
    );

    // Merge any additional fixed metadata from meta parameter
    // (but don't allow overriding core fields)
    const fixedFields = [
      { key: 'timestamp', check: (v) => v },
      { key: 'transaction', check: (v) => v },
      { key: 'seq', check: (v) => v !== undefined },
      { key: 'caller', check: (v) => v },
      { key: 'maxRetries', check: (v) => v !== undefined },
      { key: 'isAtomic', check: (v) => v !== undefined },
      { key: 'batch', check: (v) => v !== undefined },
      { key: 'isQuery', check: (v) => v !== undefined },
      { key: 'isCommand', check: (v) => v !== undefined },
      { key: 'isError', check: (v) => v !== undefined }
    ];

    for (const field of fixedFields) {
      if (field.check(meta[field.key])) {
        fixedMeta[field.key] = meta[field.key];
      }
    }

    // Special case: senderId (only if not command type)
    if (meta.senderId && type !== 'command') {
      fixedMeta.senderId = meta.senderId;
    }

    // Merge any additional mutable metadata from meta parameter
    const mutableFields = ['retries', 'queryResult'];
    for (const field of mutableFields) {
      if (meta[field] !== undefined) {
        mutableMeta[field] = meta[field];
      }
    }

    // Create and return MessageMetadata instance
    return new MessageMetadata(fixedMeta, mutableMeta);
  }

  /**
   * Generate a unique message ID
   * 
   * @returns {string} Unique message ID in format 'msg_timestamp_random'
   * 
   * @example
   * const id = MessageFactory.generateId();
   * console.log(id); // "msg_1703123456789_abc123def"
   */
  static generateId() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    return `msg_${timestamp}_${random}`;
  }

  /**
   * Generate a unique transaction ID
   * 
   * @returns {string} Unique transaction ID in format 'tx_timestamp_random'
   * 
   * @example
   * const txId = MessageFactory.generateTransactionId();
   * console.log(txId); // "tx_1703123456789_abc123def"
   */
  static generateTransactionId() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    return `tx_${timestamp}_${random}`;
  }

  /**
   * Generate a unique sender ID
   * 
   * Sender IDs are used to identify the originator of command messages.
   * This method generates a unique identifier in format 'sender_timestamp_random'.
   * 
   * @returns {string} Unique sender ID in format 'sender_timestamp_random'
   * 
   * @example
   * const senderId = MessageFactory.generateSenderId();
   * console.log(senderId); // "sender_1703123456789_abc123def"
   * 
   * @private
   */
  static generateSenderId() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    return `sender_${timestamp}_${random}`;
  }

  /**
   * Acquire a unique sender ID
   * 
   * Public API for users to acquire a sender ID before creating command messages.
   * This allows users to know the sender ID in advance for tracking purposes.
   * Sender IDs are always auto-generated to ensure uniqueness.
   * 
   * @returns {string} Unique sender ID in format 'sender_timestamp_random'
   * 
   * @example
   * // Acquire sender ID before creating commands
   * const senderId = MessageFactory.acquireSenderId();
   * console.log('Acquired sender ID:', senderId);
   * 
   * // Later, create command messages (senderId will be auto-generated anyway)
   * const cmd = MessageFactory.create('command://execute', { action: 'save' }, { type: 'command' });
   * 
   * @example
   * // Use acquired sender ID for tracking
   * const senderId = MessageFactory.acquireSenderId();
   * // Store senderId for later reference
   * localStorage.setItem('mySenderId', senderId);
   */
  static acquireSenderId() {
    return this.generateSenderId();
  }

  /**
   * Create multiple messages with the same transaction ID
   * 
   * @param {Array} messageSpecs - Array of {path, body, options} objects
   * @param {Object} [globalOptions={}] - Global options applied to all messages
   * @returns {Array<Object>} Array of message data objects
   * 
   * @example
   * // Create multiple messages in a transaction
   * const messages = MessageFactory.createTransactionBatch([
   *   { path: 'command://save', body: { file: 'data.json' } },
   *   { path: 'command://backup', body: { file: 'data.json' } },
   *   { path: 'event://saved', body: { file: 'data.json' } }
   * ]);
   * 
   * @example
   * // Transaction batch with global options
   * const batchMessages = MessageFactory.createTransactionBatch([
   *   { path: 'command://save', body: { file: 'data.json' } },
   *   { path: 'command://backup', body: { file: 'data.json' } }
   * ], { 
   *   meta: { priority: 'high' },
   *   type: 'atomic' 
   * });
   */
  static createTransactionBatch(messageSpecs, globalOptions = {}) {
    const transactionId = this.generateTransactionId();
    const messages = [];
    
    // Debug logging for transaction batch creation
    console.log('🏭 Creating transaction batch with global options:', globalOptions);
    
    messageSpecs.forEach((spec, index) => {
      // Check if global options specified atomic type
      const shouldBeAtomic = globalOptions.type === 'atomic';
      
      const options = {
        ...globalOptions,
        ...spec.options,
        type: 'transaction',
        transaction: transactionId,
        seq: index + 1
      };
      
      // If global options specified atomic, ensure atomic flag is preserved in meta
      if (shouldBeAtomic) {
        options.meta = {
          ...globalOptions.meta,
          ...spec.options?.meta,
          isAtomic: true
        };
      }
      
      const messageData = this.create(spec.path, spec.body, options);
      
      messages.push(messageData);
    });
    
    return messages;
  }
}

