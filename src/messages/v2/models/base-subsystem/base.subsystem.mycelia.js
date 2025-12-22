import { BaseSubsystem as PluginBaseSubsystem } from 'mycelia-kernel-plugin/system';
import { FACET_KINDS } from '../defaults/default-hooks.mycelia.js';

/**
 * BaseSubsystem for Mycelia Kernel
 * 
 * Extends the plugin system's BaseSubsystem with mycelia-specific requirements:
 * - Requires options.ms (MessageSystem instance)
 * - Functional message processing (accept, process, etc.)
 * - Mycelia-specific facet kind constants
 */
export class BaseSubsystem extends PluginBaseSubsystem {
  /**
   * @param {string} name - Unique name for the subsystem
   * @param {Object} options - Configuration options
   * @param {Object} options.ms - MessageSystem instance (required) - The MessageSystem this subsystem is part of
   * @param {Object} [options.config={}] - Optional configuration object keyed by facet kind.
   *   Each key corresponds to a facet kind (e.g., 'router', 'queue', 'scheduler').
   *   Each value is the configuration object for that specific hook/facet.
   */
  constructor(name, options = {}) {
    // Check name first (parent will also check, but we want consistent error order)
    if (!name || typeof name !== 'string') {
      throw new Error('BaseSubsystem: name must be a non-empty string');
    }
    
    // Enforce ms requirement for mycelia-kernel
    // Allow null (MessageSystem passes null and sets it to itself after construction)
    // But require it to be explicitly provided (not undefined)
    if (options.ms === undefined) {
      throw new Error('BaseSubsystem: options.ms is required');
    }

    // Call parent constructor (plugin system accepts options.ms)
    super(name, options);

    // Ensure messageSystem property is set (parent sets it, but we want to be explicit)
    this.messageSystem = options.ms;
    this.ctx.ms = options.ms;
  }

  // ==== Hierarchy Management ====
  // Inherited from plugin system, but override to use FACET_KINDS

  /** Assign a parent subsystem (called during child registration). */
  setParent(parent) {
    const hierarchy = this.find(FACET_KINDS.HIERARCHY);
    if (hierarchy) {
      return hierarchy.setParent(parent);
    }
    // Fallback to parent implementation
    return super.setParent(parent);
  }

  /** Retrieve the parent subsystem. */
  getParent() {
    const hierarchy = this.find(FACET_KINDS.HIERARCHY);
    if (hierarchy) {
      return hierarchy.getParent();
    }
    // Fallback to parent implementation
    return super.getParent();
  }

  /** True if this subsystem has no parent (i.e., top-level). */
  isRoot() {
    const hierarchy = this.find(FACET_KINDS.HIERARCHY);
    if (hierarchy) {
      return hierarchy.isRoot();
    }
    // Fallback to parent implementation
    return super.isRoot();
  }

  /** Returns the root subsystem by traversing up the parent chain. */
  getRoot() {
    const hierarchy = this.find(FACET_KINDS.HIERARCHY);
    if (hierarchy) {
      return hierarchy.getRoot();
    }
    // Fallback to parent implementation
    return super.getRoot();
  }

  // ==== Lifecycle Override ====

  async build(ctx = {}) {
    // Call parent build first
    await super.build(ctx);
        
    // Set coreProcessor based on subsystem type (mycelia-specific)
        this.coreProcessor = this.api.isSynchronous 
          ? this.find(FACET_KINDS.SYNCHRONOUS) 
          : this.find(FACET_KINDS.PROCESSOR);
        
        return this;
  }

  // ==== Message flow (Override plugin system's no-ops) ====

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

  // ==== Routing (Override to use FACET_KINDS) ====

  registerRoute(pattern, handler, routeOptions = {}) {
    const router = this.find(FACET_KINDS.ROUTER);
    if (!router?.registerRoute) {
      return null;
    }
    return router.registerRoute(pattern, handler, routeOptions);
  }

  unregisterRoute(pattern) {
    const router = this.find(FACET_KINDS.ROUTER);
    if (!router?.unregisterRoute) {
      return null; 
    }
    return router.unregisterRoute(pattern);
  }
}

