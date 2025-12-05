import { PRINCIPAL_KINDS } from './security.utils.mycelia.js';

/**
 * Resource
 * --------
 * Represents a generic managed object in the Mycelia system.
 * Used for data stores, caches, file handles, external connections, etc.
 * Resources can form hierarchical relationships through parent-child links.
 *
 * Duck-type markers:
 * • isResource = true
 * • kind = 'resource'
 * 
 * @param {Object} options - Resource configuration options
 * @param {string} [options.name=null] - Resource name
 * @param {string} [options.type=null] - Resource type
 * @param {Object} [options.metadata={}] - Optional metadata object
 * @param {BaseSubsystem} [options.owner=null] - Owner subsystem instance
 * @param {Object} [options.instance=null] - Optional instance to attach to the resource
 * @param {Resource} [options.parent=null] - Parent resource instance
 */
export class Resource { 

  /**
   * Creates a new Resource instance.
   * 
   * @param {Object} [options={}] - Resource configuration options
   * @param {string} [options.name=null] - Resource name
   * @param {string} [options.type=null] - Resource type
   * @param {Object} [options.metadata={}] - Optional metadata object
   * @param {BaseSubsystem} [options.owner=null] - Owner subsystem instance
   * @param {Object} [options.instance=null] - Optional instance to attach to the resource
   * @param {Resource} [options.parent=null] - Parent resource instance
   */
  constructor({ name = null, type = null, metadata = {}, owner = null, instance = null, parent = null } = {}) {
    this._name = name;
    this._type = type;
    this._metadata = metadata;
    this._createdAt = new Date();
    this._owner = owner;
    this._instance = instance;
    this._parent = parent;
    this._children = new Map();
  }

  get kind() { return PRINCIPAL_KINDS.RESOURCE; }
  get isResource() { return true; }
  get name() { return this._name; }
  /**
   * Gets the resource type.
   * @returns {string|null} Resource type or null
   */
  get type() { return this._type; }
  get metadata() { return this._metadata; }
  get createdAt() { return this._createdAt; }
  /**
   * Gets the owner subsystem.
   * @returns {BaseSubsystem|null} Owner subsystem instance or null
   */
  get owner() { return this._owner; }
  /**
   * Gets the attached instance.
   * @returns {Object|null} Attached instance or null
   */
  get instance() { return this._instance; }
  /**
   * Gets the parent resource.
   * @returns {Resource|null} Parent resource instance or null
   */
  get parent() { return this._parent; }
  /**
   * Gets the children resources map.
   * @returns {Map<string, Resource>} Map of child resources keyed by string
   */
  get children() { return this._children; }

  /**
   * Checks if the resource has a child with the specified name and type.
   * 
   * @param {string} name - Child resource name
   * @param {string} type - Child resource type
   * @returns {boolean} True if the child exists, false otherwise
   */
  hasChild(name, type) {
    const key = `type.${type}.name.${name}`;
    return this._children.has(key);
  }

  /**
   * Adds a child resource to this resource.
   * 
   * @param {string} name - Child resource name
   * @param {string} type - Child resource type
   * @param {Resource} resource - The resource to add as a child
   * @returns {boolean} True if the child was added, false if a child with the same key already exists
   */
  addChild(name, type, resource) {
    const key = `type.${type}.name.${name}`;
    if (this._children.has(key)) {
      return false;
    }
    this._children.set(key, resource);
    return true;
  }

  /**
   * Returns the hierarchical resource path.
   * If the resource has no parent, returns the path from getNameStringParentResource().
   * If the resource has a parent, appends the resource's type and name to the parent's path.
   * 
   * @returns {string} Hierarchical resource path
   */
  getNameString() {
    if (this._parent === null) {
      return this.getNameStringParentResource();
    }
    return this.getNameStringParentResource() + `/res.type.${this._type}.name.${this._name}`;
  }

  /**
   * Returns the hierarchical resource path, prefixed by its owner subsystem.
   * Uses the format: type.{type}.name.{name}
   * If the owner has a getNameString method, prefixes the path with the owner's path.
   * 
   * @returns {string} Hierarchical resource path in the format type.{type}.name.{name}
   */
  getNameStringParentResource() {
    if (!this._owner || typeof this._owner.getNameString !== 'function') {
      return `type.${this._type}.name.${this._name}`;
    }

    const base = this._owner.getNameString().replace(/\/$/, '');
    return `${base}/type.${this._type}.name.${this._name}`;
  }

  /**
   * Converts the resource to a plain object record.
   * 
   * @returns {Object} Resource record with kind, name, metadata, createdAt, and owner identifier
   */
  toRecord() {
    // Get owner identifier from subsystem's identity PKR if available, otherwise use subsystem name
    let ownerId = null;
    if (this._owner) {
      if (this._owner.identity?.pkr?.uuid) {
        ownerId = this._owner.identity.pkr.uuid;
      } else if (this._owner.name) {
        ownerId = this._owner.name;
      }
    }
    
    return {
      kind: this.kind,
      name: this._name,
      metadata: this._metadata,
      createdAt: this._createdAt,
      owner: ownerId
    };
  }

  /**
   * Returns a string representation of the resource.
   * 
   * @returns {string} String representation: "Resource" + getNameString()
   */
  toString() {
    return 'Resource' + this.getNameString();
  }
}

