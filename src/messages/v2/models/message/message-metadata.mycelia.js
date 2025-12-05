/**
 * MessageMetadata Class
 * 
 * Encapsulates message metadata with separation between fixed (immutable) and mutable data.
 * Fixed metadata is frozen at creation and cannot be altered, while mutable metadata
 * can be updated during message processing lifecycle.
 * 
 * Fixed metadata includes:
 * - Creation-time data (timestamp, type, caller, transaction info)
 * - Configuration flags (isAtomic, isBatch, isQuery, isCommand, isError)
 * - Maximum retries allowed
 * 
 * Mutable metadata includes:
 * - Runtime state (retries, queryResult)
 * - Processing state flags
 * 
 * @example
 * // Create metadata
 * const fixed = {
 *   timestamp: Date.now(),
 *   type: 'command',
 *   isCommand: true,
 *   maxRetries: 5,
 *   caller: 'canvas'
 * };
 * const mutable = { retries: 0 };
 * const meta = new MessageMetadata(fixed, mutable);
 * 
 * @example
 * // Access fixed metadata (read-only)
 * console.log(meta.getCaller());      // 'canvas'
 * console.log(meta.isCommand());      // true
 * 
 * @example
 * // Update mutable metadata
 * meta.incrementRetry();              // OK
 * meta.setQueryResult({ data: 'result' });  // OK
 */
export class MessageMetadata {
  // Private fields
  #fixed;      // Frozen object with immutable metadata
  #mutable;    // Object with editable metadata

  /**
   * Create a new MessageMetadata instance
   * 
   * @param {Object} fixedMeta - Fixed (immutable) metadata
   * @param {Object} [mutableMeta={}] - Mutable metadata
   */
  constructor(fixedMeta, mutableMeta = {}) {
    if (!fixedMeta || typeof fixedMeta !== 'object') {
      throw new Error('MessageMetadata: fixedMeta must be an object');
    }
    
    // Initialize fixed metadata and freeze it
    this.#fixed = Object.freeze({ ...fixedMeta });
    
    // Initialize mutable metadata (not frozen)
    this.#mutable = { ...mutableMeta };
    
    // Freeze the metadata object itself to prevent adding new properties
    // But allow modification of #mutable's properties
    Object.freeze(this);
  }

  /**
   * Get timestamp
   * @returns {number} Creation timestamp
   */
  getTimestamp() {
    return this.#fixed.timestamp;
  }

  /**
   * Get sender ID
   * @returns {string|null} Original sender ID or null
   */
  getSenderId() {
    return this.#fixed.senderId || null;
  }

  /**
   * Get transaction ID
   * @returns {string|null} Transaction ID or null
   */
  getTransaction() {
    return this.#fixed.transaction || null;
  }

  /**
   * Get sequence number
   * @returns {number|null} Sequence number or null
   */
  getSeq() {
    return this.#fixed.seq || null;
  }

  /**
   * Get message type
   * @returns {string} Message type (simple, atomic, batch, query, command, retry, transaction, error)
   */
  getType() {
    return this.#fixed.type || 'simple';
  }

  /**
   * Get maximum retries
   * @returns {number} Maximum retries allowed
   */
  getMaxRetries() {
    return this.#fixed.maxRetries || 0;
  }

  /**
   * Get caller subsystem name
   * @returns {string|null} Subsystem name that created/sent the message or null
   */
  getCaller() {
    return this.#fixed.caller || null;
  }

  /**
   * Check if message is atomic
   * @returns {boolean} True if atomic
   */
  isAtomic() {
    return this.#fixed.isAtomic || false;
  }

  /**
   * Check if message is a batch
   * @returns {boolean} True if batch
   */
  isBatch() {
    return this.#fixed.batch || false;
  }

  /**
   * Check if message is a query
   * @returns {boolean} True if query
   */
  isQuery() {
    return this.#fixed.isQuery || false;
  }

  /**
   * Check if message is a command
   * @returns {boolean} True if command
   */
  isCommand() {
    return this.#fixed.isCommand || false;
  }

  /**
   * Check if message is an error
   * @returns {boolean} True if error
   */
  isError() {
    return this.#fixed.isError || false;
  }

  /**
   * Get current retry count
   * @returns {number} Current retry count
   */
  getRetries() {
    return this.#mutable.retries || 0;
  }

  /**
   * Set retry count
   * @param {number} count - Retry count
   */
  setRetries(count) {
    if (typeof count !== 'number' || count < 0) {
      throw new Error('MessageMetadata: retries must be a non-negative number');
    }
    this.#mutable.retries = count;
  }

  /**
   * Increment retry count
   * @returns {boolean} True if can retry, false if max reached
   */
  incrementRetry() {
    this.#mutable.retries = (this.#mutable.retries || 0) + 1;
    return this.#mutable.retries <= this.getMaxRetries();
  }

  /**
   * Reset retry count
   */
  resetRetries() {
    this.#mutable.retries = 0;
  }

  /**
   * Get query result
   * @returns {any|null} Query result or null
   */
  getQueryResult() {
    return this.#mutable.queryResult || null;
  }

  /**
   * Set query result
   * @param {any} result - Query result
   */
  setQueryResult(result) {
    this.#mutable.queryResult = result;
  }

  /**
   * Update mutable metadata
   * @param {Object} updates - Updates to apply to mutable metadata
   */
  updateMutable(updates) {
    if (!updates || typeof updates !== 'object') {
      throw new Error('MessageMetadata: updates must be an object');
    }
    Object.assign(this.#mutable, updates);
  }

  /**
   * Serialize metadata to JSON
   * @returns {Object} JSON representation with fixed and mutable parts
   */
  toJSON() {
    return {
      fixed: { ...this.#fixed },
      mutable: { ...this.#mutable }
    };
  }

  /**
   * Clone metadata with optional mutable updates
   * @param {Object} [mutableUpdates={}] - Updates to apply to mutable metadata in clone
   * @returns {MessageMetadata} New MessageMetadata instance
   */
  clone(mutableUpdates = {}) {
    return new MessageMetadata(
      this.#fixed,  // Same fixed metadata
      { ...this.#mutable, ...mutableUpdates }  // Updated mutable
    );
  }

  /**
   * Get a custom field from fixed metadata
   * 
   * Allows access to custom fields that were added to fixed metadata during creation
   * but don't have dedicated getter methods (e.g., replyTo, replyPath, correlationId).
   * 
   * @param {string} fieldName - Field name to retrieve
   * @returns {any} Field value or undefined if not found
   * 
   * @example
   * // Access custom fixed metadata field
   * const replyTo = meta.getCustomField('replyTo');
   * const correlationId = meta.getCustomField('correlationId');
   */
  getCustomField(fieldName) {
    if (typeof fieldName !== 'string' || !fieldName.trim()) {
      return undefined;
    }
    return this.#fixed[fieldName];
  }

  /**
   * Get a field from fixed metadata (alias for getCustomField for consistency)
   * 
   * @param {string} fieldName - Field name to retrieve
   * @returns {any} Field value or undefined if not found
   * 
   * @example
   * // Access fixed metadata field
   * const traceId = meta.getFixedField('traceId');
   */
  getFixedField(fieldName) {
    return this.getCustomField(fieldName);
  }

  /**
   * Get trace ID
   * @returns {string|null} Trace ID or null if not found
   */
  getTraceId() {
    return this.#fixed.traceId || null;
  }

  /**
   * Get a custom field from mutable metadata
   * 
   * Allows access to custom fields that were added to mutable metadata during processing
   * (e.g., replyPath stored by request-core).
   * 
   * @param {string} fieldName - Field name to retrieve
   * @returns {any} Field value or undefined if not found
   * 
   * @example
   * // Access custom mutable metadata field
   * const replyPath = meta.getCustomMutableField('replyPath');
   */
  getCustomMutableField(fieldName) {
    if (typeof fieldName !== 'string' || !fieldName.trim()) {
      return undefined;
    }
    return this.#mutable[fieldName];
  }

  /**
   * Create MessageMetadata from JSON
   * @param {Object} json - JSON representation with fixed and mutable parts
   * @returns {MessageMetadata} New MessageMetadata instance
   */
  static fromJSON(json) {
    if (!json || typeof json !== 'object') {
      throw new Error('MessageMetadata.fromJSON: json must be an object');
    }
    return new MessageMetadata(json.fixed || {}, json.mutable || {});
  }
}

