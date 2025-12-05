/**
 * Message Class
 * 
 * A simple, lightweight data container for inter-subsystem communication in a pure message-driven architecture.
 * Messages are the fundamental unit of communication between subsystems and carry all necessary information
 * for routing, processing, and tracing.
 * 
 * @example
 * // Create a simple message
 * const msg = new Message('canvas://layers/create', { name: 'background', type: 'image' });
 * 
 * @example
 * // Create an atomic message (must be processed completely or not at all)
 * const atomicMsg = Message.create('command://save', { file: 'project.json' }, { type: 'atomic' });
 * 
 * @example
 * // Create a batch message (contains multiple operations)
 * const batchMsg = Message.create('patch://update', [patch1, patch2, patch3], { type: 'batch' });
 */
import { MessageFactory } from './message-factory.mycelia.js';
import { MessageMetadata } from './message-metadata.mycelia.js';
import { createMessageAccessors } from './message-accessors.utils.mycelia.js';
import { createTypeChecks } from './message-type-checks.utils.mycelia.js';
import { extractSubsystem, hasValidSubsystem as hasValidSubsystemUtil } from './message-path.utils.mycelia.js';
import { toJSON as toJSONUtil, fromJSON as fromJSONUtil, clone as cloneUtil, toString as toStringUtil } from './message-serialization.utils.mycelia.js';

export class Message {
  /**
   * Create a new Message instance
   * 
   * @param {string|Object} pathOrData - The message path OR a messageData object from MessageFactory
   * @param {any} body - The message payload/data (ignored if pathOrData is an object)
   * @param {Object} [meta={}] - Message metadata (ignored if pathOrData is an object)
   * 
   * @example
   * // Basic message
   * const msg = new Message('canvas://layers/create', { name: 'background' });
   * 
   * @example
   * // Message with custom metadata
   * const msg = new Message('command://save', { file: 'data.json' }, {
   *   isAtomic: true,
   *   maxRetries: 5,
   *   id: 'custom-msg-123',
   *   transaction: 'tx_1703123456789_abc123def',
   *   seq: 1
   * });
   * 
   * @note The constructor uses MessageFactory internally for creation logic.
   * For specialized message types, consider using Message.create() with options.
   * Internal: Can also accept messageData object directly to avoid double factory calls.
   */
  constructor(pathOrData, body, meta = {}) {
    // Check if first argument is already a messageData object (from MessageFactory)
    // This allows Message.create() to pass pre-created data without double factory calls
    if (pathOrData && typeof pathOrData === 'object' && pathOrData.id && pathOrData.path) {
      // Already prepared data from MessageFactory - use directly
      this.id = pathOrData.id;
      this.path = pathOrData.path;
      this.body = pathOrData.body;
      // Ensure meta is a MessageMetadata instance
      this.meta = pathOrData.meta instanceof MessageMetadata 
        ? pathOrData.meta 
        : new MessageMetadata(pathOrData.meta?.fixed || pathOrData.meta || {}, pathOrData.meta?.mutable || {});
    } else {
      // Normal constructor call - delegate to MessageFactory
      const path = pathOrData;
      // Extract parentMessage from meta if provided
      const parentMessage = meta.parentMessage;
      const metaWithoutParent = { ...meta };
      delete metaWithoutParent.parentMessage;
      
      const messageData = MessageFactory.create(path, body, { 
        meta: metaWithoutParent,
        parentMessage 
      });
      
      // Copy all properties from factory-created message
      this.id = messageData.id;
      this.path = messageData.path;
      this.body = messageData.body;
      // MessageFactory now returns MessageMetadata instance
      this.meta = messageData.meta instanceof MessageMetadata 
        ? messageData.meta 
        : new MessageMetadata(messageData.meta?.fixed || messageData.meta || {}, messageData.meta?.mutable || {});
    }

    // Create accessor methods
    const accessors = createMessageAccessors(this);
    Object.assign(this, accessors);

    // Create type check methods
    const typeChecks = createTypeChecks(this);
    Object.assign(this, typeChecks);
  }

  /**
   * Get the message ID
   * @returns {string} Message ID
   */
  getId() {
    return this.id;
  }

  /**
   * Get the message path
   * @returns {string} Message path
   */
  getPath() {
    return this.path;
  }

  /**
   * Get the message body
   * @returns {any} Message body
   */
  getBody() {
    return this.body;
  }

  /**
   * Get the message metadata
   * @returns {MessageMetadata} Message metadata instance
   */
  getMeta() {
    return this.meta;
  }

  /**
   * Extract subsystem name from message path
   * Path format: subsystem://path/to/resource
   * @returns {string|null} Subsystem name or null if path is invalid
   * 
   * @example
   * const msg = new Message('server://route/register', {});
   * const subsystem = msg.extractSubsystem(); // Returns 'server'
   */
  extractSubsystem() {
    return extractSubsystem(this.path);
  }

  /**
   * Check if message has a valid subsystem in its path
   * @returns {boolean} True if path has valid subsystem format
   * 
   * @example
   * const msg = new Message('server://route/register', {});
   * if (msg.hasValidSubsystem()) {
   *   console.log('Valid subsystem path');
   * }
   */
  hasValidSubsystem() {
    return hasValidSubsystemUtil(this.path);
  }

  /**
   * Update mutable metadata
   * @param {Object} updates - Updates to apply to mutable metadata
   */
  updateMeta(updates) {
    this.meta.updateMutable(updates);
  }

  /**
   * Serialize message to JSON
   * @returns {Object} JSON representation
   */
  toJSON() {
    return toJSONUtil(this);
  }

  /**
   * Create a message with configurable options
   * @param {string} path - Message path
   * @param {any} body - Message body
   * @param {Object} options - Creation options
   * @param {string} [options.type='simple'] - Message type: 'simple', 'atomic', 'batch', 'query', 'retry', 'transaction'
   * @param {Object} [options.meta={}] - Message metadata
   * @param {number} [options.maxRetries] - Max retries (for retry type)
   * @param {string} [options.transaction] - Transaction ID (for transaction type)
   * @param {number} [options.seq] - Sequence number (for transaction type)
   * @param {boolean} [options.generateTransactionId=false] - Auto-generate transaction ID if not provided
   * @returns {Message} New message instance
   * 
   * @example
   * // Simple message
   * const msg = Message.create('canvas://layers/create', { name: 'background' });
   * 
   * @example
   * // Atomic message
   * const atomicMsg = Message.create('command://save', { file: 'data.json' }, { 
   *   type: 'atomic' 
   * });
   * 
   * @example
   * // Retry message
   * const retryMsg = Message.create('api://fetch', { url: '...' }, { 
   *   type: 'retry',
   *   maxRetries: 5 
   * });
   * 
   * @example
   * // Transaction message
   * const txMsg = Message.create('command://execute', { cmd: 'save' }, { 
   *   type: 'transaction',
   *   transaction: 'tx_123',
   *   seq: 1 
   * });
   * 
   * @example
   * // Query message (auto-detected from path or explicit type)
   * const queryMsg = Message.create('error://query/get-errors', { filters: {} });
   * // OR explicitly
   * const queryMsg2 = Message.create('error://query/get-errors', { filters: {} }, { type: 'query' });
   * 
   * @example
   * // Command message (auto-generates senderId)
   * const cmdMsg = Message.create('command://execute', { action: 'save' }, { type: 'command' });
   * console.log(cmdMsg.isCommand()); // true
   * console.log(cmdMsg.getSenderId()); // "sender_1703123456789_abc123"
   */
  static create(path, body, options = {}) {
    const messageData = MessageFactory.create(path, body, options);
    // Pass messageData object directly to constructor to avoid double factory call
    return new Message(messageData);
  }

  /**
   * Create message from JSON
   * @param {Object} json - JSON representation
   * @returns {Message} Message instance
   */
  static fromJSON(json) {
    return fromJSONUtil(json);
  }

  /**
   * Clone the message
   * @returns {Message} Cloned message
   */
  clone() {
    return cloneUtil(this);
  }

  /**
   * String representation
   * @returns {string} String representation
   */
  toString() {
    return toStringUtil(this);
  }

  /**
   * Reset message for object pooling (reuse existing instance)
   * @private
   * @param {string} path - New message path
   * @param {any} body - New message body
   * @param {Object} meta - New message metadata
   */
  _resetForPool(path, body, meta = {}) {
    // Reuse existing object instead of creating new one
    const messageData = MessageFactory.create(path, body, { meta });
    
    this.id = messageData.id;
    this.path = messageData.path;
    this.body = messageData.body;
    this.meta = messageData.meta instanceof MessageMetadata 
      ? messageData.meta 
      : new MessageMetadata(messageData.meta?.fixed || messageData.meta || {}, messageData.meta?.mutable || {});
  }

  /**
   * Clear sensitive data before returning to pool
   * @private
   */
  _clearForPool() {
    // Clear body to prevent memory leaks
    this.body = null;
    // Keep id, path, meta for potential debugging
    // They're small and will be overwritten on reuse
  }
}
