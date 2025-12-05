/**
 * MessageSystemRegistry
 * 
 * Registry for managing subsystem instances by name.
 * Provides methods to store, retrieve, and query subsystems.
 * Kernel subsystem is treated specially - it can only be set once and is hidden from find/get operations.
 */
export class MessageSystemRegistry {
  #subsystems = new Map(); // Map<name, subsystem>

  /**
   * Find a subsystem by name.
   * Does not return kernel subsystem (kernel is hidden from find operations).
   * 
   * @param {string} name - Subsystem name
   * @returns {BaseSubsystem|undefined} Subsystem instance or undefined if not found
   */
  find(name) {
    if (name === 'kernel') {
      return undefined;
    }
    return this.#subsystems.get(name);
  }

  /**
   * Get a subsystem by name.
   * Does not return kernel subsystem (kernel is hidden from get operations).
   * 
   * @param {string} name - Subsystem name
   * @returns {BaseSubsystem|undefined} Subsystem instance or undefined if not found
   */
  get(name) {
    if (name === 'kernel') {
      return undefined;
    }
    return this.#subsystems.get(name);
  }

  /**
   * Get all subsystem names (excluding kernel).
   * 
   * @returns {string[]} Array of subsystem names
   */
  getNames() {
    const names = Array.from(this.#subsystems.keys());
    // Filter out kernel
    return names.filter(name => name !== 'kernel');
  }

  /**
   * Set a subsystem in the registry.
   * Kernel can only be set if it doesn't already exist.
   * 
   * @param {string} name - Subsystem name
   * @param {BaseSubsystem} subsystem - Subsystem instance
   * @returns {boolean} True if successfully set, false if kernel already exists
   * @throws {Error} If name is invalid or subsystem is missing
   */
  set(name, subsystem) {
    if (!name || typeof name !== 'string') {
      throw new Error('MessageSystemRegistry.set: name must be a non-empty string');
    }
    if (!subsystem || typeof subsystem !== 'object') {
      throw new Error('MessageSystemRegistry.set: subsystem must be an object');
    }

    // Special handling for kernel - can only be set once
    if (name === 'kernel') {
      if (this.#subsystems.has('kernel')) {
        return false; // Kernel already exists
      }
    }

    this.#subsystems.set(name, subsystem);
    return true;
  }

  /**
   * Check if a subsystem exists in the registry.
   * 
   * @param {string} name - Subsystem name
   * @returns {boolean} True if subsystem exists
   */
  has(name) {
    return this.#subsystems.has(name);
  }

  /**
   * Delete a subsystem from the registry.
   * 
   * @param {string} name - Subsystem name
   * @returns {boolean} True if subsystem was deleted, false if not found
   */
  delete(name) {
    return this.#subsystems.delete(name);
  }

  /**
   * Clear all subsystems from the registry.
   */
  clear() {
    this.#subsystems.clear();
  }

  /**
   * Get the number of subsystems in the registry (including kernel).
   * 
   * @returns {number} Number of subsystems
   */
  get size() {
    return this.#subsystems.size;
  }

  /**
   * Get all subsystems as an iterator (including kernel).
   * 
   * @returns {Iterator<[string, BaseSubsystem]>} Iterator of [name, subsystem] pairs
   */
  *[Symbol.iterator]() {
    yield* this.#subsystems.entries();
  }

  /**
   * Get all subsystems as an array (including kernel).
   * 
   * @returns {BaseSubsystem[]} Array of subsystem instances
   */
  values() {
    return Array.from(this.#subsystems.values());
  }

  /**
   * Get all subsystem names as an array (including kernel).
   * 
   * @returns {string[]} Array of subsystem names
   */
  keys() {
    return Array.from(this.#subsystems.keys());
  }
}

