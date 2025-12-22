/**
 * MessageSystem Class (v2)
 * 
 * A MessageSystem implementation that extends BaseSubsystem.
 * This class provides a subsystem-based MessageSystem that can be composed
 * with hooks and facets like any other subsystem.
 * 
 * Overrides accept and process as no-ops
 * since MessageSystem coordinates subsystems rather than processing messages directly.
 * 
 * @example
 * // Create and configure MessageSystem
 * const messageSystem = new MessageSystem('main-system', {
 *   ms: null, // MessageSystem doesn't need a parent MessageSystem
 *   debug: true,
 *   config: {
 *     // Hook configurations
 *   }
 * });
 * 
 * @example
 * // Build with hooks
 * await messageSystem
 *   .use(useGlobalScheduler)
 *   .use(useMessageSystemRouter)
 *   .use(useMessages)
 *   .build();
 */
import { BaseSubsystem } from '../base-subsystem/base.subsystem.mycelia.js';
import { KernelSubsystem } from '../kernel-subsystem/kernel.subsystem.mycelia.js';
import { DependencyGraphCache } from 'mycelia-kernel-plugin/builder';
import { useGlobalScheduler } from '../../hooks/global-scheduler/use-global-scheduler.mycelia.js';
import { useMessages } from '../../hooks/messages/use-messages.mycelia.js';
import { useMessageSystemRouter } from '../../hooks/message-system-router/use-message-system-router.mycelia.js';
import { useMessageSystemRegistry } from '../../hooks/message-system-registry/use-message-system-registry.mycelia.js';
import { MessagePool } from '../../utils/message-pool.mycelia.js';
import { Message } from '../message/message.mycelia.js';

export class MessageSystem extends BaseSubsystem {
  // Private field for kernel subsystem
  #kernel = null;
  // Private field for dependency graph cache
  #graphCache = null; 
  #api = null;
  // Private field for message pool
  #messagePool = null; 

  constructor(name, options = {}) {
    // Plugin system's BaseSubsystem accepts null for ms, we'll set it to self after
    super(name, {
      ...options,
      ms: null  // Will be set to this after construction
    });

    // Set ctx.ms to self (MessageSystem is its own message system)
    this.ctx.ms = this;
    this.messageSystem = this;

    // Setup context (globalScheduler config)
    this.#setupContext(options);

    // Default hooks for MessageSystem
    this.defaultHooks = [
      useGlobalScheduler,
      useMessages,
      useMessageSystemRegistry,
      useMessageSystemRouter
    ];

    // Create KernelSubsystem (do not build yet)
    this.#kernel = new KernelSubsystem('kernel', {
      ms: this,
      config: options.config?.kernel || {},
      debug: this.debug,
      errorManagerMaxSize: options.errorManagerMaxSize || 1000
    });
    // NOTE: we no longer stash kernel on ctx; it's passed in via build() instead

    // Initialize dependency graph cache
    this.#api = this.api; 
    this.#graphCache = new DependencyGraphCache();
    
    // Initialize message pool for performance optimization
    const poolSize = options.messagePoolSize || 2000;
    this.#messagePool = new MessagePool(poolSize, {
      factory: (path, body, meta) => new Message(path, body, meta),
      enableStats: options.debug || false
    });
  }

  /**
   * Setup MessageSystem context
   * @private
   */
  #setupContext(options) {
    // MessageSystem is its own ms
    this.ctx.ms = this;

    // Configure globalScheduler in ctx.config
    const globalSchedulerConfig = {
      timeSliceDuration: options.timeSliceDuration || 50,
      schedulingStrategy: options.schedulingStrategy || 'round-robin',
      debug: this.debug,
      ...(options.config?.globalScheduler || {})
    };

    if (!this.ctx.config) {
      this.ctx.config = {};
    }
    this.ctx.config.globalScheduler = globalSchedulerConfig;
  }

  // No-op: MessageSystem doesn't process messages directly
  // eslint-disable-next-line no-unused-vars
  async accept(message, options = {}) {
    return true;
  }

  // eslint-disable-next-line no-unused-vars
  async process(timeSlice) {
    return null;
  }

  /**
   * Override find to block access to "messageRouter" and "kernel"
   * 
   * @param {string} kind - Facet kind to find
   * @returns {Object|false} Facet instance, or false if kind is "messageRouter" or "kernel"
   */
  find(kind) {
    // Block access to messageRouter and kernel
    if(!this._isBuilt)
      return this.api.__facets.find(kind); 

    if (kind === 'messageRouter' || kind === 'kernel') {
      return false;
    }
    // Otherwise delegate to super
    return this.#api.__facets.find(kind);
  }

  /**
   * Bootstrap the MessageSystem
   * 
   * 1) Build the MessageSystem, injecting kernel into the build ctx
   * 2) Bootstrap the kernel (which builds its own children)
   */
  async bootstrap() {
    // Pass kernel via build-context instead of storing it on ctx
    await this.build({ graphCache: this.#graphCache });

    const router = this.find('messageSystemRouter'); 
    if(router){
        router.setKernel(this.#kernel);
        this.#kernel.setMsRouter(router); 
    }

    await this.#kernel.bootstrap({graphCache: this.#graphCache});

    // Copy api reference before erasing public api
    this.#api = this.api;
    this.api = null; // erase public api 
  }

  /**
   * Get the kernel subsystem instance
   * 
   * **DEBUG MODE ONLY**: This method only returns the kernel when debug mode is enabled.
   * This is intended for testing and debugging purposes only.
   * 
   * @returns {KernelSubsystem|null} Kernel subsystem instance, or null if not in debug mode
   * 
   * @example
   * // In tests with debug mode enabled
   * const kernel = messageSystem.getKernel();
   * if (kernel) {
   *   // Use kernel for testing
   * }
   */
  getKernel() {
    // Only return kernel in debug mode (for testing)
    if (this.debug) {
      return this.#kernel;
    }
    return null;
  }

  startScheduler() {
    const scheduler = this.find('globalScheduler');
    if (!scheduler) {
      throw new Error(`${this.name}: globalScheduler facet not found. Ensure useGlobalScheduler hook is used.`);
    }
    scheduler.start();
    if (this.debug) {
      console.log(`MessageSystem ${this.name}: Global scheduler started`);
    }
  }

  stopScheduler() {
    const scheduler = this.find('globalScheduler');
    if (!scheduler) {
      throw new Error(`${this.name}: globalScheduler facet not found. Ensure useGlobalScheduler hook is used.`);
    }
    scheduler.stop();
    if (this.debug) {
      console.log(`MessageSystem ${this.name}: Global scheduler stopped`);
    }
  }

  getSubsystemNames() {
    const registry = this.find('messageSystemRegistry');
    if (!registry) {
      throw new Error(`${this.name}: messageSystemRegistry facet not found. Ensure useMessageSystemRegistry hook is used.`);
    }
    return registry.getNames();
  }

  getSubsystemCount() {
    const registry = this.find('messageSystemRegistry');
    if (!registry) {
      throw new Error(`${this.name}: messageSystemRegistry facet not found. Ensure useMessageSystemRegistry hook is used.`);
    }
    return registry.size;
  }

  hasSubsystem(subsystemName) {
    const registry = this.find('messageSystemRegistry');
    if (!registry) {
      throw new Error(`${this.name}: messageSystemRegistry facet not found. Ensure useMessageSystemRegistry hook is used.`);
    }
    return registry.has(subsystemName);
  }

  /**
   * Get all registered subsystems (needed by scheduler)
   * 
   * @returns {Array<BaseSubsystem>} Array of registered subsystems (excluding kernel)
   */
  getSubsystems() {
    const registry = this.find('messageSystemRegistry');
    if (!registry) {
      return [];
    }
    // Get all subsystems and filter out kernel
    return registry.values().filter(s => s.name !== 'kernel');
  }

  /**
   * Register a subsystem with access control and registry
   */
  async registerSubsystem(subsystemInstance, options = {}) {
    await subsystemInstance.build({ ...options, graphCache: this.#graphCache });
    // 1) wire identity via kernel
    const subsystem = this.#kernel.registerSubsystem(subsystemInstance, options);

    // 2) register in the message system registry
    const registry = this.find('messageSystemRegistry');
    if (!registry) {
      throw new Error(`${this.name}: messageSystemRegistry facet not found. Ensure useMessageSystemRegistry hook is used.`);
    }

    // Validate subsystem name before registration
    if (!subsystemInstance || !subsystemInstance.name || typeof subsystemInstance.name !== 'string') {
      throw new Error(`${this.name}: Cannot register subsystem - invalid subsystem instance or missing name.`);
    }

    // Use subsystemInstance.name since subsystem is a wrapper
    const registered = registry.set(subsystemInstance.name, subsystemInstance);
    if (!registered) {
      throw new Error(`${this.name}: Failed to register subsystem '${subsystemInstance.name}' in registry.`);
    }

    if (this.debug) {
      console.log(`MessageSystem ${this.name}: Registered subsystem '${subsystemInstance.name}'`);
    }

    return subsystem;
  }

  /**
   * Send a message via the message-system router
   * 
   * SECURITY: Any callerId or callerIdSetBy in options is stripped to prevent spoofing.
   * Only sendProtected() can provide callerId (via kernel verification).
   * 
   * @param {Message} message - Message object (contains path for routing)
   * @param {Object} [options={}] - Send options (callerId and callerIdSetBy will be stripped)
   * @returns {Promise<Object>} Send result
   */
  async send(message, options = {}) {
    // SECURITY: Strip any callerId or callerIdSetBy from user-provided options (prevent spoofing)
    const { callerId, callerIdSetBy, ...sanitizedOptions } = options;
    if ((callerId !== undefined || callerIdSetBy !== undefined) && this.debug) {
      console.warn(`MessageSystem ${this.name}: callerId and callerIdSetBy stripped from send() options - only sendProtected() can set these`);
    }

    const router = this.find('messageSystemRouter');
    if (!router) {
      throw new Error(`${this.name}: messageSystemRouter facet not found. Ensure useMessageSystemRouter hook is used.`);
    }
    return await router.route(message, sanitizedOptions);
  }

  /**
   * Send a message using pooled Message instance (performance optimized)
   * 
   * Creates a Message from the pool, sends it, and automatically releases it back.
   * This provides 33% better performance for high-frequency message sending.
   * 
   * @param {string} path - Message path (e.g., 'api://users/123')
   * @param {any} body - Message body/payload
   * @param {Object} [options={}] - Send options
   * @param {Object} [options.meta] - Message metadata
   * @returns {Promise<Object>} Send result
   * 
   * @example
   * // Instead of:
   * // const msg = new Message('api://users/123', { action: 'get' });
   * // await messageSystem.send(msg);
   * 
   * // Use pooled version:
   * await messageSystem.sendPooled('api://users/123', { action: 'get' });
   */
  async sendPooled(path, body, options = {}) {
    const { meta, ...sendOptions } = options;
    const message = this.#messagePool.acquire(path, body, meta);
    
    try {
      return await this.send(message, sendOptions);
    } finally {
      this.#messagePool.release(message);
    }
  }

  /**
   * Get message pool statistics
   * 
   * @returns {Object} Pool statistics including reuse rate and efficiency
   * 
   * @example
   * const stats = messageSystem.getPoolStats();
   * console.log('Reuse rate:', stats.reuseRate);
   */
  getPoolStats() {
    return this.#messagePool.getStats();
  }

  /**
   * Warmup message pool by pre-allocating Message instances
   * 
   * @param {number} count - Number of messages to pre-allocate
   * @returns {number} Actual number of messages pre-allocated
   * 
   * @example
   * await messageSystem.bootstrap();
   * messageSystem.warmupPool(1000); // Pre-allocate 1000 messages
   */
  warmupPool(count) {
    return this.#messagePool.warmup(count);
  }

  /**
   * Acquire a pooled Message instance
   * 
   * Used internally by sendPooled() and by kernel for sendPooledProtected().
   * Acquires a Message from the pool, reusing existing instances when available.
   * 
   * @param {string} path - Message path
   * @param {any} body - Message body
   * @param {Object} [meta={}] - Message metadata
   * @returns {Message} Pooled Message instance
   * 
   * @example
   * const message = messageSystem.acquirePooledMessage('api://test', { id: 1 });
   * // Use message...
   * messageSystem.releasePooledMessage(message);
   */
  acquirePooledMessage(path, body, meta = {}) {
    return this.#messagePool.acquire(path, body, meta);
  }

  /**
   * Release a pooled Message instance
   * 
   * Used internally by sendPooled() and by kernel for sendPooledProtected().
   * Releases a Message back to the pool for reuse.
   * 
   * @param {Message} message - Message to release
   * @returns {boolean} True if released, false if discarded
   * 
   * @example
   * const message = messageSystem.acquirePooledMessage('api://test', { id: 1 });
   * // Use message...
   * messageSystem.releasePooledMessage(message);
   */
  releasePooledMessage(message) {
    return this.#messagePool.release(message);
  }

    /** Returns an array of all facet kinds (capabilities) available on this subsystem. */
    get capabilities() { 
      if (!this.#api || !this.#api.__facets) return [];
      return this.#api.__facets.getAllKinds(); 
    }

  /**
   * Register a listener on a subsystem
   * 
   * @param {string} subsystemName - Name of the subsystem to register listener on
   * @param {string} path - Event path to listen for
   * @param {Function|Object} handler - Handler function or handler group object
   * @param {Object} [options={}] - Registration options
   * @returns {boolean} Success status
   * 
   * @example
   * // Register a listener on a subsystem
   * await messageSystem.listenerOn('userService', 'user/created', (message) => {
   *   console.log('User created:', message.getBody());
   * });
   * 
   * @example
   * // Register a handler group
   * await messageSystem.listenerOn('commandService', 'save/msg_123', {
   *   onSuccess: (message) => console.log('Success'),
   *   onFailure: (message) => console.error('Failure'),
   *   onTimeout: (message) => console.warn('Timeout')
   * }, { isHandlerGroup: true });
   */
  listenerOn(subsystemName, path, handler, options = {}) {
    const registry = this.find('messageSystemRegistry');
    if (!registry) {
      throw new Error(`${this.name}: messageSystemRegistry facet not found.`);
    }
    
    const wrapper = registry.get(subsystemName);
    if (!wrapper) {
      throw new Error(`${this.name}: Subsystem '${subsystemName}' not found.`);
    }
    
    if (!wrapper.listeners) {
      throw new Error(`${this.name}: Subsystem '${subsystemName}' does not expose listeners.`);
    }
    
    return wrapper.listeners.on(path, handler, options);
  }

  /**
   * Unregister a listener on a subsystem
   * 
   * @param {string} subsystemName - Name of the subsystem to unregister listener from
   * @param {string} path - Event path
   * @param {Function|Object} handler - Handler function or handler group object to remove
   * @param {Object} [options={}] - Unregistration options
   * @returns {boolean} Success status
   * 
   * @example
   * // Unregister a listener
   * await messageSystem.listenerOff('userService', 'user/created', myHandler);
   * 
   * @example
   * // Unregister a handler group
   * await messageSystem.listenerOff('commandService', 'save/msg_123', handlerGroup, { isHandlerGroup: true });
   */
  listenerOff(subsystemName, path, handler, options = {}) {
    const registry = this.find('messageSystemRegistry');
    if (!registry) {
      throw new Error(`${this.name}: messageSystemRegistry facet not found.`);
    }
    
    const wrapper = registry.get(subsystemName);
    if (!wrapper) {
      throw new Error(`${this.name}: Subsystem '${subsystemName}' not found.`);
    }
    
    if (!wrapper.listeners) {
      throw new Error(`${this.name}: Subsystem '${subsystemName}' does not expose listeners.`);
    }
    
    return wrapper.listeners.off(path, handler, options);
  }
}

