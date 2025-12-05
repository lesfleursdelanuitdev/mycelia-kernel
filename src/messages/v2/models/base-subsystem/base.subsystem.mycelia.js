import { SubsystemBuilder } from '../subsystem-builder/subsystem-builder.mycelia.js';
import { FacetManager } from '../facet-manager/facet-manager.mycelia.js';
import { disposeChildren } from './base-subsystem.utils.mycelia.js';
import { createSubsystemLogger } from '../../utils/logger.utils.mycelia.js';
import { FACET_KINDS } from '../defaults/default-hooks.mycelia.js';
import { DependencyGraphCache } from '../subsystem-builder/dependency-graph-cache.mycelia.js';

export class BaseSubsystem {
  _isBuilt = false;
  _buildPromise = null;
  _disposePromise = null;
  _builder = null;
  _initCallbacks = [];
  _disposeCallbacks = [];
  _parent = null; // ← parent subsystem

  /**
   * @param {string} name - Unique name for the subsystem
   * @param {Object} options - Configuration options
   * @param {Object} options.ms - MessageSystem instance (required) - The MessageSystem this subsystem is part of
   * @param {Object} [options.config={}] - Optional configuration object keyed by facet kind.
   *   Each key corresponds to a facet kind (e.g., 'router', 'queue', 'scheduler').
   *   Each value is the configuration object for that specific hook/facet.
   */
  constructor(name, options = {}) {
    if (!name || typeof name !== 'string')
      throw new Error('BaseSubsystem: name must be a non-empty string');
    if (!options.ms)
      throw new Error('BaseSubsystem: options.ms is required');

    this.name = name;
    this.options = options;
    this.messageSystem = options.ms;

    // create the context object
    this.ctx = {};
    this.ctx.ms = options.ms;
    this.ctx.config = options.config || {}; // Optional configuration object keyed by facet kind
    this.ctx.debug = !!options.debug;
    
    // Legacy property for backward compatibility (use ctx.debug instead)
    this.debug = this.ctx.debug;

    this.defaultHooks = options.defaultHooks;
    this.hooks = [];
    this._builder = new SubsystemBuilder(this);
    this.api = { name, 
        __facets: new FacetManager(this) };
    this.coreProcessor = null;
  }

  // ==== Hierarchy Management ====

  /** Assign a parent subsystem (called during child registration). */
  setParent(parent) {
    const hierarchy = this.find(FACET_KINDS.HIERARCHY);
    if (hierarchy) {
      return hierarchy.setParent(parent);
    }
    // Fallback if hierarchy facet not present
    if (parent && typeof parent !== 'object')
      throw new Error(`${this.name}: parent must be an object or null`);
    this._parent = parent;
    return this;
  }

  /** Retrieve the parent subsystem. */
  getParent() {
    const hierarchy = this.find(FACET_KINDS.HIERARCHY);
    if (hierarchy) {
      return hierarchy.getParent();
    }
    // Fallback if hierarchy facet not present
    return this._parent;
  }

  /** True if this subsystem has no parent (i.e., top-level). */
  isRoot() {
    const hierarchy = this.find(FACET_KINDS.HIERARCHY);
    if (hierarchy) {
      return hierarchy.isRoot();
    }
    // Fallback if hierarchy facet not present
    return this._parent === null;
  }

  /** Returns the root subsystem by traversing up the parent chain. */
  getRoot() {
    const hierarchy = this.find(FACET_KINDS.HIERARCHY);
    if (hierarchy) {
      return hierarchy.getRoot();
    }
    // Fallback if hierarchy facet not present
    let current = this;
    while (current._parent !== null) {
      current = current._parent;
    }
    return current;
  }

  /**
   * Returns a fully-qualified subsystem name string.
   * Example:
   * Root subsystem "kernel" → "kernel://"
   * Child subsystem "cache" under "kernel" → "kernel://cache"
   * Grandchild "manager" → "kernel://cache/manager"
   */
  getNameString() {
    if (this._parent === null) {
      return `${this.name}://`;
    }
    const parentName = this._parent.getNameString();
    // ensure no accidental trailing "//"
    return `${parentName.replace(/\/$/, '')}/${this.name}`;
  }

  // ==== State getters ====

  get isBuilt() { return this._isBuilt; }

  /** Returns an array of all facet kinds (capabilities) available on this subsystem. */
  get capabilities() { return this.api.__facets.getAllKinds(); }

  // ==== Hook registration ====

  use(hook) {
    if (this._isBuilt)
      throw new Error(`${this.name}: cannot add hooks after build()`);
    if (typeof hook !== 'function')
      throw new Error(`${this.name}: hook must be a function`);
    this.hooks.push(hook);
    return this;
  }

  onInit(cb) {
    if (typeof cb !== 'function')
      throw new Error(`${this.name}: onInit callback must be a function`);
    this._initCallbacks.push(cb);
    return this;
  }

  onDispose(cb) {
    if (typeof cb !== 'function')
      throw new Error(`${this.name}: onDispose callback must be a function`);
    this._disposeCallbacks.push(cb);
    return this;
  }

  /**
   * Find a facet by kind and optional orderIndex
   * @param {string} kind - Facet kind to find
   * @param {number} [orderIndex] - Optional order index. If provided, returns facet at that index. If not, returns the last facet (highest orderIndex).
   * @returns {Object|undefined} Facet instance or undefined if not found
   */
  find(kind, orderIndex = undefined) { return this.api.__facets.find(kind, orderIndex); }
  
  /**
   * Get a facet by its index in the array of facets of that kind
   * @param {string} kind - Facet kind to find
   * @param {number} index - Zero-based index in the array of facets of this kind
   * @returns {Object|undefined} Facet instance or undefined if not found
   */
  getByIndex(kind, index) { return this.api.__facets.getByIndex(kind, index); }

  // ==== Lifecycle ====

  async build(ctx = {}) {
    if (this._isBuilt) return this;
    if (this._buildPromise) return this._buildPromise;

    this._buildPromise = (async () => {
      try {
        // Determine graphCache: use provided, inherited from parent, or create new
        let graphCache = ctx.graphCache || this.ctx?.graphCache || this.ctx?.parent?.graphCache;
        
        if (!graphCache) {
          // Create new cache with default capacity (configurable via ctx.config.graphCache.capacity)
          const cacheCapacity = ctx.config?.graphCache?.capacity || 100;
          graphCache = new DependencyGraphCache(cacheCapacity);
        }
        
        // Set graphCache on ctx so it's available after build
        this.ctx.graphCache = graphCache;
        
        this._builder.withCtx(ctx); // any additional context to be passed to the builder
        await this._builder.build(graphCache); // Pass graphCache explicitly
        for (const cb of this._initCallbacks)
          await cb(this.api, this.ctx);
        this._isBuilt = true;
        
        // Set coreProcessor based on subsystem type
        this.coreProcessor = this.api.isSynchronous 
          ? this.find(FACET_KINDS.SYNCHRONOUS) 
          : this.find(FACET_KINDS.PROCESSOR);
        
        const logger = createSubsystemLogger(this);
        logger.log('Built successfully');
        return this;
      } finally {
        this._buildPromise = null;
      }
    })();

    return this._buildPromise;
  }

  async dispose() {
    if (!this._isBuilt && !this._buildPromise) return;
    if (this._disposePromise) return this._disposePromise;

    const waitBuild = this._buildPromise ? this._buildPromise.catch(() => {}) : Promise.resolve();

    this._disposePromise = (async () => {
      try {
        await waitBuild;
        if (!this._isBuilt) return;

        await disposeChildren(this);
        if (this.api && this.api.__facets) {
          await this.api.__facets.disposeAll(this);
        }

        const logger = createSubsystemLogger(this);
        for (const cb of this._disposeCallbacks) {
          try { await cb(); }
          catch (err) { logger.error('Dispose callback error:', err); }
        }

        this._isBuilt = false;
        this.coreProcessor = null;
        this._builder.invalidate();

        logger.log('Disposed');
      } finally {
        this._disposePromise = null;
      }
    })();

    return this._disposePromise;
  }

  // ==== Message flow ====

  pause() {
    const scheduler = this.find(FACET_KINDS.SCHEDULER);
    if (!scheduler) {
      return null;
    }
    scheduler.pauseProcessing?.();
    return this;
  }

  resume() {
    const scheduler = this.find(FACET_KINDS.SCHEDULER);
    if (!scheduler) {
      return null;
    }
    scheduler.resumeProcessing?.();
    return this;
  }

  async accept(message, options = {}) {
    const core = this.coreProcessor;
    if (!core?.accept)
      throw new Error(`${this.name}: missing core/processor facet`);
    return await core.accept(message, options);
  }

  async processImmediately(message, options = {}) {
    const core = this.coreProcessor;
    if (!core?.processImmediately)
      throw new Error(`${this.name}: missing core/processor facet with processImmediately method`);
    return await core.processImmediately(message, options);
  }

  getQueueStatus() {
    const queue = this.find(FACET_KINDS.QUEUE);
    if (!queue?.getStatus) {
      // Return default status if queue facet is not available
      return { size: 0, maxSize: 0, isFull: false };
    }
    return queue.getStatus();
  }

  async process(timeSlice) {
    const scheduler = this.find(FACET_KINDS.SCHEDULER);
    if (scheduler?.process) return await scheduler.process(timeSlice);
    const core = this.coreProcessor;
    return core?.processTick ? await core.processTick() : null;
  }

  // ==== Routing ====

  registerRoute(pattern, handler, routeOptions = {}) {
    const router = this.find(FACET_KINDS.ROUTER);
    if (!router?.registerRoute) {
      //throw new Error(`${this.name}: missing router facet`);
      return null;
    }
    return router.registerRoute(pattern, handler, routeOptions);
  }

  unregisterRoute(pattern) {
    const router = this.find(FACET_KINDS.ROUTER);
    if (!router?.unregisterRoute) {
      //throw new Error(`${this.name}: missing router facet`);
      return null; 
    }
    return router.unregisterRoute(pattern);
  }
}

