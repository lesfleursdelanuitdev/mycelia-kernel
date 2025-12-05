/**
 * ChildSubsystemRegistry
 * 
 * Manages child subsystems for a parent subsystem.
 * Handles storage, lineage computation, and hierarchical relationships.
 * 
 * @class
 */
export class ChildSubsystemRegistry {
  /**
   * Map of child name → child subsystem instance
   * @private
   * @type {Map<string, Object>}
   */
  #children = new Map();

  /**
   * Parent subsystem instance
   * @private
   * @type {Object}
   */
  #parent;

  /**
   * Creates a new ChildSubsystemRegistry
   * 
   * @param {Object} parent - Parent subsystem instance
   */
  constructor(parent) {
    if (!parent || typeof parent !== 'object') {
      throw new Error('ChildSubsystemRegistry: parent must be an object');
    }
    this.#parent = parent;
  }

  /**
   * Adds a child subsystem to the registry
   * 
   * @param {Object} child - Child subsystem instance (must have a unique .name)
   * @returns {Object} The added child
   * @throws {Error} If child with same name already exists
   */
  add(child) {
    if (!child || typeof child !== 'object') {
      throw new Error('ChildSubsystemRegistry.add: child must be an object');
    }
    if (!child.name || typeof child.name !== 'string') {
      throw new Error('ChildSubsystemRegistry.add: child must have a string .name property');
    }

    if (this.#children.has(child.name)) {
      throw new Error(`ChildSubsystemRegistry.add: child with name '${child.name}' already exists`);
    }

    this.#children.set(child.name, child);
    return child;
  }

  /**
   * Removes a child subsystem by reference or by name
   * 
   * @param {Object|string} childOrName - Child instance or its string name
   * @returns {boolean} True if successfully removed, false otherwise
   */
  remove(childOrName) {
    if (typeof childOrName === 'string') {
      return this.#children.delete(childOrName);
    }
    
    if (childOrName && typeof childOrName === 'object' && childOrName.name) {
      return this.#children.delete(childOrName.name);
    }

    return false;
  }

  /**
   * Gets a child subsystem by name
   * 
   * @param {string} name - Child subsystem name
   * @returns {Object|undefined} Child subsystem instance or undefined if not found
   */
  get(name) {
    if (typeof name !== 'string') {
      return undefined;
    }
    return this.#children.get(name);
  }

  /**
   * Checks if a child exists
   * 
   * @param {string} name - Child subsystem name
   * @returns {boolean} True if child exists
   */
  has(name) {
    return this.#children.has(name);
  }

  /**
   * Lists all registered child subsystems
   * 
   * @returns {Array<Object>} Array of child subsystem instances
   */
  list() {
    return Array.from(this.#children.values());
  }

  /**
   * Gets the number of registered children
   * 
   * @returns {number} Number of children
   */
  size() {
    return this.#children.size;
  }

  /**
   * Clears all children from the registry
   */
  clear() {
    this.#children.clear();
  }

  /**
   * Gets the full lineage (ancestor chain) from root to the given node
   * 
   * @param {Object} node - Subsystem node (defaults to parent)
   * @returns {Array<Object>} Array of subsystem instances ordered from root → node
   */
  getLineage(node = null) {
    const target = node || this.#parent;
    const lineage = [];
    let current = target;

    // Traverse up the hierarchy by following parent references
    // Assumes subsystems have a _parent or parent property
    while (current) {
      lineage.unshift(current); // Add to beginning to maintain root → node order
      
      // Try to get parent - check common parent property names
      const parent = current._parent || current.parent || 
                    (current.getParent && current.getParent()) ||
                    null;
      
      if (!parent || parent === current) {
        break; // Reached root or circular reference
      }
      
      current = parent;
    }

    return lineage;
  }

  /**
   * Iterator for child subsystems (enables for...of loops)
   * 
   * @yields {Object} Child subsystem instances
   */
  *[Symbol.iterator]() {
    for (const child of this.#children.values()) {
      yield child;
    }
  }

  /**
   * Gets the parent subsystem
   * 
   * @returns {Object} Parent subsystem instance
   */
  getParent() {
    return this.#parent;
  }

  /**
   * Sets the parent subsystem
   * 
   * @param {Object} parent - Parent subsystem instance
   * @throws {Error} If parent is not an object
   */
  setParent(parent) {
    if (!parent || typeof parent !== 'object') {
      throw new Error('ChildSubsystemRegistry.setParent: parent must be an object');
    }
    this.#parent = parent;
  }
}

