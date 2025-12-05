import { randomUUID } from './security.utils.mycelia.js';

/**
 * SecurityProfile
 * 
 * Represents a role-based security profile that maps permission scopes to permission levels.
 * Each profile has a name (e.g., "admin", "user", "editor") and a set of grants that
 * specify what permissions should be granted for specific permission scopes.
 * 
 * Note: Grants use "permission scopes" (string identifiers) rather than actual resource names.
 * When applied to a principal, all grants in the profile are applied to that principal's
 * ReaderWriterSet (RWS), which is per-principal, not per-resource. The scope names are
 * used for organizational/documentation purposes but don't directly map to individual resources.
 * 
 * Permission levels:
 * - 'r' = read only
 * - 'rw' = read/write
 * - 'rwg' = read/write/grant (note: grant capability cannot be delegated via RWS)
 */
export class SecurityProfile {
  #name;
  #grants; // Map<string, 'r' | 'rw' | 'rwg'>
  #uuid;
  #metadata;
  #createdAt;
  #updatedAt;

  /**
   * Create a new SecurityProfile
   * 
   * @param {string} name - Profile name (e.g., "admin", "user", "editor")
   * @param {Object|Map<string, 'r'|'rw'|'rwg'>} grants - Grants mapping permission scopes to permission levels
   * @param {Object} [metadata={}] - Optional metadata for the profile
   * @param {string} [uuid] - Optional UUID to preserve (for updates)
   * @param {number} [createdAt] - Optional creation timestamp to preserve (for updates)
   * @param {number} [updatedAt] - Optional update timestamp to preserve (for updates)
   */
  constructor(name, grants = {}, metadata = {}, uuid = null, createdAt = null, updatedAt = null) {
    if (typeof name !== 'string' || !name.trim()) {
      throw new Error('SecurityProfile: name must be a non-empty string');
    }

    this.#name = name.trim();
    this.#uuid = uuid || randomUUID();
    this.#metadata = { ...metadata };
    this.#createdAt = createdAt !== null ? createdAt : Date.now();
    this.#updatedAt = updatedAt !== null ? updatedAt : this.#createdAt;

    // Convert grants to Map if it's an object
    this.#grants = new Map();
    if (grants instanceof Map) {
      for (const [resourceName, permission] of grants) {
        this.#validatePermission(permission);
        this.#grants.set(String(resourceName), permission);
      }
    } else if (typeof grants === 'object' && grants !== null) {
      for (const [resourceName, permission] of Object.entries(grants)) {
        this.#validatePermission(permission);
        this.#grants.set(String(resourceName), permission);
      }
    } else {
      throw new Error('SecurityProfile: grants must be an object or Map');
    }
  }

  /**
   * Validate permission level
   * @private
   */
  #validatePermission(permission) {
    const validPermissions = ['r', 'rw', 'rwg'];
    if (!validPermissions.includes(permission)) {
      throw new Error(`SecurityProfile: invalid permission "${permission}". Must be one of: ${validPermissions.join(', ')}`);
    }
  }

  /**
   * Get the profile name
   * @returns {string} Profile name
   */
  getName() {
    return this.#name;
  }

  /**
   * Get the profile UUID
   * @returns {string} Profile UUID
   */
  getUuid() {
    return this.#uuid;
  }

  /**
   * Get all grants as a Map
   * @returns {Map<string, 'r'|'rw'|'rwg'>} Grants map
   */
  getGrants() {
    return new Map(this.#grants);
  }

  /**
   * Get grants as a plain object
   * @returns {Object<string, 'r'|'rw'|'rwg'>} Grants object
   */
  getGrantsAsObject() {
    const obj = {};
    for (const [resourceName, permission] of this.#grants) {
      obj[resourceName] = permission;
    }
    return obj;
  }

  /**
   * Get permission for a specific permission scope
   * @param {string} scope - Permission scope identifier to check
   * @returns {('r'|'rw'|'rwg'|undefined)} Permission level or undefined if not found
   */
  getPermission(scope) {
    return this.#grants.get(String(scope));
  }

  /**
   * Check if profile has a grant for a scope
   * @param {string} scope - Permission scope identifier to check
   * @returns {boolean} True if profile has a grant for this scope
   */
  hasGrant(scope) {
    return this.#grants.has(String(scope));
  }

  /**
   * Add or update a grant
   * @param {string} scope - Permission scope identifier
   * @param {('r'|'rw'|'rwg')} permission - Permission level
   */
  addGrant(scope, permission) {
    this.#validatePermission(permission);
    this.#grants.set(String(scope), permission);
    this.#updatedAt = Date.now();
  }

  /**
   * Remove a grant
   * @param {string} scope - Permission scope identifier to remove
   * @returns {boolean} True if grant was removed, false if it didn't exist
   */
  removeGrant(scope) {
    const removed = this.#grants.delete(String(scope));
    if (removed) {
      this.#updatedAt = Date.now();
    }
    return removed;
  }

  /**
   * Update grants in-place (preserves UUID and timestamps)
   * @param {Object|Map<string, 'r'|'rw'|'rwg'>} grants - New grants to merge or replace
   * @param {boolean} [replace=false] - If true, replace all grants; if false, merge with existing
   */
  updateGrants(grants, replace = false) {
    const grantsMap = grants instanceof Map ? grants : new Map(Object.entries(grants || {}));
    
    if (replace) {
      this.#grants.clear();
    }
    
    for (const [scope, permission] of grantsMap) {
      this.#validatePermission(permission);
      this.#grants.set(String(scope), permission);
    }
    
    this.#updatedAt = Date.now();
  }

  /**
   * Get metadata
   * @returns {Object} Metadata object
   */
  getMetadata() {
    return { ...this.#metadata };
  }

  /**
   * Update metadata
   * @param {Object} metadata - Metadata to merge
   */
  updateMetadata(metadata) {
    this.#metadata = { ...this.#metadata, ...metadata };
    this.#updatedAt = Date.now();
  }

  /**
   * Get creation timestamp
   * @returns {number} Timestamp in milliseconds
   */
  getCreatedAt() {
    return this.#createdAt;
  }

  /**
   * Get last update timestamp
   * @returns {number} Timestamp in milliseconds
   */
  getUpdatedAt() {
    return this.#updatedAt;
  }

  /**
   * Get profile as a plain object (for serialization)
   * @returns {Object} Plain object representation
   */
  toJSON() {
    return {
      name: this.#name,
      uuid: this.#uuid,
      grants: this.getGrantsAsObject(),
      metadata: this.#metadata,
      createdAt: this.#createdAt,
      updatedAt: this.#updatedAt
    };
  }

  /**
   * Create a SecurityProfile from a plain object
   * @param {Object} obj - Plain object representation
   * @returns {SecurityProfile} SecurityProfile instance
   */
  static fromJSON(obj) {
    return new SecurityProfile(
      obj.name,
      obj.grants || {},
      obj.metadata || {},
      obj.uuid || null,
      obj.createdAt || null,
      obj.updatedAt || null
    );
  }

  /**
   * Clone the profile
   * @returns {SecurityProfile} New SecurityProfile instance with copied data
   */
  clone() {
    return new SecurityProfile(this.#name, this.getGrants(), this.#metadata);
  }
}

