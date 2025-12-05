import { BaseSubsystem } from '../base-subsystem/base.subsystem.mycelia.js';
import { useListeners } from '../../hooks/listeners/use-listeners.mycelia.js';

/**
 * StandalonePluginSystem
 * 
 * A specialized BaseSubsystem designed for standalone plugin systems without message processing.
 * Automatically overrides message-specific methods as no-ops and installs the useListeners hook.
 * 
 * This class is ideal for:
 * - Plugin architectures
 * - Modular applications
 * - Component systems
 * - Service containers
 * 
 * @example
 * ```javascript
 * import { StandalonePluginSystem } from './standalone-plugin-system.mycelia.js';
 * import { useDatabase } from './plugins/use-database.mycelia.js';
 * 
 * const system = new StandalonePluginSystem('my-app', {
 *   config: {
 *     database: { host: 'localhost' }
 *   }
 * });
 * 
 * system
 *   .use(useDatabase)
 *   .build();
 * 
 * const db = system.find('database');
 * ```
 */
export class StandalonePluginSystem extends BaseSubsystem {
  /**
   * @param {string} name - Unique name for the plugin system
   * @param {Object} options - Configuration options
   * @param {Object} [options.config={}] - Optional configuration object keyed by facet kind.
   *   Each key corresponds to a facet kind (e.g., 'database', 'cache').
   *   Each value is the configuration object for that specific hook/facet.
   * @param {boolean} [options.debug=false] - Enable debug logging
   */
  constructor(name, options = {}) {
    // Pass empty object for message system - not needed for standalone plugin system
    super(name, { ...options, ms: options.ms || {} });
    
    // Install useListeners hook (recommended for standalone systems)
    // Many plugins (like useRouter) require it as a dependency
    this.defaults = [useListeners];
  }

  // ==== Message Flow Methods (No-Ops) ====

  /**
   * No-op override: Message acceptance is not needed for standalone plugin systems.
   * @param {*} _message - Ignored
   * @param {*} _options - Ignored
   * @returns {Promise<void>} Resolves immediately
   */
  async accept(_message, _options = {}) {
    // No-op: not needed for standalone plugin system
  }

  /**
   * No-op override: Message processing is not needed for standalone plugin systems.
   * @param {*} _timeSlice - Ignored
   * @returns {Promise<null>} Always returns null
   */
  async process(_timeSlice) {
    // No-op: not needed for standalone plugin system
    return null;
  }

  /**
   * No-op override: Pause functionality is not needed for standalone plugin systems.
   * @returns {StandalonePluginSystem} Returns this for chaining
   */
  pause() {
    // No-op: not needed for standalone plugin system
    return this;
  }

  /**
   * No-op override: Resume functionality is not needed for standalone plugin systems.
   * @returns {StandalonePluginSystem} Returns this for chaining
   */
  resume() {
    // No-op: not needed for standalone plugin system
    return this;
  }

  // ==== Routing Methods (No-Ops) ====

  /**
   * No-op override: Route registration is not needed for standalone plugin systems.
   * @param {string} _pattern - Ignored
   * @param {Function} _handler - Ignored
   * @param {Object} _routeOptions - Ignored
   * @returns {boolean} Always returns false
   */
  registerRoute(_pattern, _handler, _routeOptions = {}) {
    // No-op: not needed for standalone plugin system
    return false;
  }

  /**
   * No-op override: Route unregistration is not needed for standalone plugin systems.
   * @param {string} _pattern - Ignored
   * @returns {boolean} Always returns false
   */
  unregisterRoute(_pattern) {
    // No-op: not needed for standalone plugin system
    return false;
  }

  // ==== Lifecycle Methods (Kept from BaseSubsystem) ====
  // build(), dispose(), onInit(), onDispose() are inherited and should NOT be overridden
  
  // ==== Plugin Management Methods (Kept from BaseSubsystem) ====
  // use(), find() are inherited and work as expected
  
  // ==== Hierarchy Methods (Kept from BaseSubsystem) ====
  // setParent(), getParent(), isRoot(), getRoot(), getNameString() are inherited
  
  // ==== State Getters (Kept from BaseSubsystem) ====
  // isBuilt getter is inherited
}

