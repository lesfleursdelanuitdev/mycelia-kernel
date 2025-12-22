/**
 * useHierarchy Hook
 * 
 * Equips a subsystem with child management capabilities by attaching a ChildSubsystemRegistry.
 * 
 * It allows a subsystem to dynamically register, unregister, and query child subsystems
 * in a secure, consistent way, and to inspect hierarchical relationships (such as lineage).
 * 
 * This hook should be installed early in the canonical default hook order to ensure
 * other hooks (like schedulers or bridges) can rely on hierarchical context.
 * 
 * @param {Object} ctx - Context object containing config.hierarchy for hierarchy configuration
 * @param {Object} api - Subsystem API being built
 * @param {BaseSubsystem} subsystem - Subsystem instance
 * @returns {Facet} Facet object with hierarchy methods
 */

import { ChildSubsystemRegistry } from './child-subsystem-registry.mycelia.js';
import { Facet } from 'mycelia-kernel-plugin/core';
import { createHook } from '../create-hook.mycelia.js';
import { getDebugFlag } from '../../utils/debug-flag.utils.mycelia.js';
import { createLogger } from '../../utils/logger.utils.mycelia.js';

export const useHierarchy = createHook({
  kind: 'hierarchy',
  version: '1.0.0',
  overwrite: false,
  required: [],
  attach: true,
  source: import.meta.url,
  contract: 'hierarchy',
  fn: (ctx, api, subsystem) => {
    const { name } = api;
    const config = ctx.config?.hierarchy || {};
    const debug = getDebugFlag(config, ctx);
    const logger = createLogger(debug, `useHierarchy ${name}`);

    // Reserved names that cannot be used for child subsystems
    const reservedNames = new Set(['kernel', 'query', 'channel', 'request', 'event']);

    let registry = null;

    // Initialize registry lazily when first needed
    const getRegistry = () => {
      if (!registry) {
        registry = new ChildSubsystemRegistry(subsystem);
        logger.log('Initialized child subsystem registry');
      }
      return registry;
    };

    return new Facet('hierarchy', { attach: true, source: import.meta.url, contract: 'hierarchy' })
      .add({

    /**
     * Registers a child subsystem under the current subsystem.
     * 
     * @param {Object} child - Child subsystem instance (must have a unique .name)
     * @returns {Object} The added child
     * @throws {Error} If another child with the same name already exists
     * @throws {Error} If child name is in the reserved names set (e.g., "query")
     * 
     * @example
     * server.addChild(httpBridge);
     */
    addChild(child) {
      // Check for reserved names
      if (child && child.name && reservedNames.has(child.name)) {
        const error = new Error(`useHierarchy ${name}: Cannot register child with reserved name '${child.name}'. Reserved names: ${Array.from(reservedNames).join(', ')}`);
        logger.error(error.message);
        throw error;
      }

      const reg = getRegistry();
      try {
        // Set parent reference on child BEFORE adding to registry
        if (child && typeof child.setParent === 'function') {
          child.setParent(subsystem);
        }
        
        const added = reg.add(child);
        logger.log(`Added child '${child.name}'`);
        return added;
      } catch (error) {
        logger.error('Error adding child:', error);
        throw error;
      }
    },

    /**
     * Removes a registered child subsystem by reference or by name.
     * 
     * @param {Object|string} childOrName - Child instance or its string name
     * @returns {boolean} True if successfully removed, false otherwise
     * 
     * @example
     * server.removeChild('http-bridge');
     */
    removeChild(childOrName) {
      const reg = getRegistry();
      const removed = reg.remove(childOrName);
      if (removed) {
        const childName = typeof childOrName === 'string' ? childOrName : childOrName.name;
        logger.log(`Removed child '${childName}'`);
      }
      return removed;
    },

    /**
     * Retrieves a specific child subsystem by name.
     * 
     * @param {string} name - String identifier of the child
     * @returns {Object|undefined} Child subsystem instance or undefined if not found
     * 
     * @example
     * const bridge = server.getChild('http-bridge');
     */
    getChild(name) {
      const reg = getRegistry();
      return reg.get(name);
    },

    /**
     * Returns an array of all currently registered child subsystems.
     * 
     * @returns {Array<Object>} Array of child subsystem instances
     * 
     * @example
     * const children = server.listChildren();
     */
    listChildren() {
      const reg = getRegistry();
      return reg.list();
    },

    /**
     * Returns the full ancestor chain (from the topmost ancestor down to node).
     * 
     * @param {Object} [node] - Optional; defaults to the current subsystem
     * @returns {Array<Object>} Array of subsystem instances ordered from root → node
     * 
     * @example
     * console.log(child.getLineage().map(n => n.name));
     * // ["kernel", "server", "db"]
     */
    getLineage(node) {
      const reg = getRegistry();
      return reg.getLineage(node);
    },

    /**
     * Direct reference to the underlying ChildSubsystemRegistry.
     * 
     * This registry supports:
     * - Iteration (for...of)
     * - Inspection (children.size(), children.list(), etc.)
     * - Hierarchy analysis (children.getLineage())
     * 
     * @type {ChildSubsystemRegistry}
     */
    get children() {
      return getRegistry();
    },

    /**
     * Set the parent subsystem.
     * 
     * @param {Object|null} parent - Parent subsystem instance or null
     * @returns {Object} The subsystem instance (for chaining)
     * @throws {Error} If parent is not an object or null
     * 
     * @example
     * child.setParent(parent);
     */
    setParent(parent) {
      if (parent && typeof parent !== 'object')
        throw new Error(`${subsystem.name}: parent must be an object or null`);
      subsystem._parent = parent;
      
      // Update the registry's parent reference if registry exists
      if (registry) {
        // Registry's parent should always be the subsystem that owns it
        // This ensures the registry stays in sync with the subsystem
        registry.setParent(subsystem);
      }
      
      return subsystem;
    },

    /**
     * Get the parent subsystem.
     * 
     * @returns {Object|null} Parent subsystem or null if root
     * 
     * @example
     * const parent = child.getParent();
     */
    getParent() {
      return subsystem._parent;
    },

    /**
     * Check if this subsystem is a root (has no parent).
     * 
     * @returns {boolean} True if root, false otherwise
     * 
     * @example
     * if (subsystem.isRoot()) {
     *   console.log('This is a root subsystem');
     * }
     */
    isRoot() {
      return subsystem._parent === null;
    },

    /**
     * Get the root subsystem by traversing up the parent chain.
     * 
     * @returns {Object} The root subsystem (subsystem with no parent)
     * 
     * @example
     * const root = child.getRoot();
     */
    getRoot() {
      let current = subsystem;
      while (current._parent !== null) {
        current = current._parent;
      }
      return current;
    },

    /**
     * Traverse the child subsystem hierarchy in depth-first order.
     * 
     * For each child subsystem:
     * 1) Calls visit(child) to process the child
     * 2) Checks if the child has its own hierarchy facet
     * 3) If it does, recursively calls child.traverse(visit) to traverse its subtree
     * 
     * @param {Function} visit - Function that takes a subsystem instance as parameter
     * @returns {void}
     * 
     * @example
     * // Traverse all subsystems in the hierarchy
     * subsystem.hierarchy.traverse((subsystem) => {
     *   console.log(`Visiting subsystem: ${subsystem.name}`);
     * });
     * 
     * @example
     * // Collect all subsystem names
     * const names = [];
     * subsystem.hierarchy.traverse((subsystem) => {
     *   names.push(subsystem.name);
     * });
     */
    traverse(visit) {
      const reg = getRegistry();
      const children = reg.list();
      
      for (const child of children) {
        // Call the visit function on this child
        visit(child);
        
        // Check if child has its own hierarchy facet
        const childHierarchy = child.find('hierarchy');
        
        // If child has hierarchy, recursively traverse its children
        if (childHierarchy) {
          childHierarchy.traverse(visit);
        }
      }
    },

    /**
     * Traverse the child subsystem hierarchy in breadth-first order.
     * 
     * Visits all children at the current level before moving to the next level.
     * Uses a queue-based approach to process subsystems level by level.
     * 
     * For each child subsystem:
     * 1) Calls visit(child) to process the child
     * 2) Checks if the child has its own hierarchy facet
     * 3) If it does, adds its children to the queue for the next level
     * 
     * @param {Function} visit - Function that takes a subsystem instance as parameter
     * @returns {void}
     * 
     * @example
     * // Traverse all subsystems in breadth-first order
     * subsystem.hierarchy.traverseBFS((subsystem) => {
     *   console.log(`Visiting subsystem: ${subsystem.name}`);
     * });
     * 
     * @example
     * // Process subsystems level by level
     * subsystem.hierarchy.traverseBFS((subsystem) => {
     *   console.log(`Level ${subsystem.name}`);
     * });
     */
    traverseBFS(visit) {
      const reg = getRegistry();
      const children = reg.list();
      
      // Queue for breadth-first traversal: [subsystem, hierarchyFacet]
      const queue = children.map(child => {
        const childHierarchy = child.find('hierarchy');
        return { subsystem: child, hierarchy: childHierarchy };
      });
      
      // Process queue level by level
      while (queue.length > 0) {
        const { subsystem: current, hierarchy: currentHierarchy } = queue.shift();
        
        // Visit the current subsystem
        visit(current);
        
        // If current has hierarchy, add its children to the queue for next level
        if (currentHierarchy) {
          const currentChildren = currentHierarchy.listChildren();
          for (const child of currentChildren) {
            const childHierarchy = child.find('hierarchy');
            queue.push({ subsystem: child, hierarchy: childHierarchy });
          }
        }
      }
    },

    /**
     * Initialize the hierarchy facet.
     * This is called automatically by BaseSubsystem after all hooks are built.
     * The registry is already initialized lazily, so this is mainly for logging.
     */
    init() {
      // Registry is initialized lazily, so just ensure it exists
      getRegistry();
      logger.log('Initialized');
    },

    /**
     * Cleanup when subsystem is disposed.
     */
    dispose() {
      if (registry) {
        registry.clear();
        registry = null;
        logger.log('Disposed child subsystem registry');
      }
    }
    });
  }
});

