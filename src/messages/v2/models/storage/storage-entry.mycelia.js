/**
 * StorageEntry Model
 * 
 * Represents a single storage entry with key, value, and optional metadata.
 * Used internally by storage backends to manage entries.
 */

export class StorageEntry {
  #key;
  #value;
  #metadata;
  #createdAt;
  #updatedAt;

  /**
   * Create a new StorageEntry
   * 
   * @param {string} key - Storage key
   * @param {*} value - Storage value
   * @param {Object} [metadata={}] - Optional metadata
   * @param {number} [createdAt=Date.now()] - Creation timestamp
   * @param {number} [updatedAt=Date.now()] - Last update timestamp
   */
  constructor(key, value, metadata = {}, createdAt = Date.now(), updatedAt = Date.now()) {
    if (typeof key !== 'string' || !key.trim()) {
      throw new Error('StorageEntry: key must be a non-empty string');
    }

    this.#key = key.trim();
    this.#value = value;
    this.#metadata = { ...metadata };
    this.#createdAt = createdAt;
    this.#updatedAt = updatedAt;
  }

  /**
   * Get the storage key
   * @returns {string}
   */
  getKey() {
    return this.#key;
  }

  /**
   * Get the storage value
   * @returns {*}
   */
  getValue() {
    return this.#value;
  }

  /**
   * Set the storage value
   * @param {*} value - New value
   */
  setValue(value) {
    this.#value = value;
    this.#updatedAt = Date.now();
  }

  /**
   * Get metadata
   * @returns {Object}
   */
  getMetadata() {
    return { ...this.#metadata };
  }

  /**
   * Set metadata (merges with existing)
   * @param {Object} metadata - Metadata to merge
   */
  setMetadata(metadata) {
    this.#metadata = { ...this.#metadata, ...metadata };
    this.#updatedAt = Date.now();
  }

  /**
   * Get creation timestamp
   * @returns {number}
   */
  getCreatedAt() {
    return this.#createdAt;
  }

  /**
   * Get last update timestamp
   * @returns {number}
   */
  getUpdatedAt() {
    return this.#updatedAt;
  }

  /**
   * Convert to JSON
   * @returns {Object}
   */
  toJSON() {
    return {
      key: this.#key,
      value: this.#value,
      metadata: this.#metadata,
      createdAt: this.#createdAt,
      updatedAt: this.#updatedAt
    };
  }

  /**
   * Create from JSON
   * @param {Object} obj - JSON object
   * @returns {StorageEntry}
   */
  static fromJSON(obj) {
    return new StorageEntry(
      obj.key,
      obj.value,
      obj.metadata || {},
      obj.createdAt,
      obj.updatedAt
    );
  }
}



