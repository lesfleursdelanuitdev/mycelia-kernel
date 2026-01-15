import { BaseSubsystem } from '../base-subsystem/base.subsystem.mycelia.js';
import { createSynchronousDefaultHooks } from '../defaults/default-hooks.mycelia.js';
import { useKernelServices } from '../../hooks/kernel-services/use-kernel-services.mycelia.js';
import { useResourceHandlers } from '../../hooks/kernel-handlers/use-resource-handlers.mycelia.js';
import { useFriendHandlers } from '../../hooks/kernel-handlers/use-friend-handlers.mycelia.js';
import { usePermissionHandlers } from '../../hooks/kernel-handlers/use-permission-handlers.mycelia.js';
import { useProfileHandlers } from '../../hooks/kernel-handlers/use-profile-handlers.mycelia.js';
import { useSystemHandlers } from '../../hooks/kernel-handlers/use-system-handlers.mycelia.js';
import { KernelChildAccessors } from './kernel-child-accessors.mycelia.js';
import { KernelRegistration } from './kernel-registration.mycelia.js';
import { KernelProtectedMessaging } from './kernel-protected-messaging.mycelia.js';
import { KernelWrapper } from './kernel-wrapper.mycelia.js';
import { Message } from '../message/message.mycelia.js';
import { PRINCIPAL_KINDS } from '../security/security.utils.mycelia.js';
import { KERNEL_ROUTES, createKernelHandlerMap } from './kernel.routes.def.mycelia.js';

/**
 * KernelSubsystem
 * 
 * The root kernel subsystem responsible for:
 * - Processing kernel:// messages
 * - Coordinating with child subsystems (access-control, error-manager, etc.)
 * 
 * Uses synchronous defaults for immediate message processing.
 */
export class KernelSubsystem extends BaseSubsystem {
  #msRouter = null;
  #childAccessors = null;
  #registration = null;
  #protectedMessaging = null;

  /**
   * @param {string} name - Subsystem name (must be 'kernel')
   * @param {Object} options - Configuration options
   * @param {Object} options.ms - MessageSystem instance (required)
   * @param {Object} [options.config={}] - Configuration object
   * @param {boolean} [options.debug=false] - Enable debug logging
   */
  constructor(name = 'kernel', options = {}) {
    if (name !== 'kernel') {
      throw new Error('KernelSubsystem: name must be "kernel"');
    }

    super(name, options);
    // Use synchronous defaults for kernel-like subsystems
    this.defaultHooks = createSynchronousDefaultHooks();
    
    // Install kernel services hook (creates and adds child subsystems)
    this.use(useKernelServices);
    
    // Install handler hooks for kernel:// routes
    this.use(useResourceHandlers);
    this.use(useFriendHandlers);
    this.use(usePermissionHandlers);
    this.use(useProfileHandlers);
    this.use(useSystemHandlers);
    
    // Initialize helper modules (will be fully initialized after build)
    this.#childAccessors = new KernelChildAccessors(this);
  }

  /**
   * Set the MessageSystem router facet.
   * Can only be set once (when #msRouter is null).
   * 
   * @param {Object} routerFacet - The messageSystemRouter facet
   * @throws {Error} If routerFacet is already set
   */
  setMsRouter(routerFacet) {
    if (this.#msRouter !== null) {
      throw new Error('KernelSubsystem.setMsRouter: msRouter is already set and cannot be changed');
    }
    this.#msRouter = routerFacet;
    
    // Initialize protected messaging with router
    this.#protectedMessaging = new KernelProtectedMessaging(this, routerFacet);
    
    // Initialize registration (can be used without router, but router is needed for sendProtected)
    if (!this.#registration) {
      this.#registration = new KernelRegistration(this);
    }
  }

  /**
   * Get or initialize registration helper
   * @private
   */
  #getRegistration() {
    if (!this.#registration) {
      this.#registration = new KernelRegistration(this);
    }
    return this.#registration;
  }

  /**
   * Get or initialize protected messaging helper
   * @private
   */
  #getProtectedMessaging() {
    if (!this.#protectedMessaging) {
      if (!this.#msRouter) {
        throw new Error('KernelSubsystem.sendProtected: messageSystemRouter facet not set. Call setMsRouter() first.');
      }
      this.#protectedMessaging = new KernelProtectedMessaging(this, this.#msRouter);
    }
    return this.#protectedMessaging;
  }

  /**
   * Bootstrap the kernel subsystem.
   * 
   * Flow:
   * 1) Build the subsystem (initializes all facets and hooks)
   * 2) Verify that hierarchy facet has been installed
   * 3) Child subsystems are automatically created and added by useKernelServices hook
   * 4) Child subsystems are automatically built by buildChildren()
   * 5) Wire identities for all child subsystems (access-control, error-manager, etc.)
   * 6) Register kernel:// routes for resource and friend creation
   * 7) Enable listeners if listeners hook is installed
   * 8) Emit 'kernel://event/kernel-bootstapped' event if listeners are enabled
   * 
   * @returns {Promise<void>}
   * @throws {Error} If hierarchy facet is not installed after build
   */
  async bootstrap(opts) {
    // Build the subsystem (this will run all hooks including useKernelServices)
    await this.build(opts);
    
    // Wire identities for all kernel child subsystems
    // This must happen after build() because:
    // 1. Kernel needs its own identity (created during build via PrincipalRegistry)
    // 2. Child subsystems need to be built first
    // 3. AccessControlSubsystem must be available
    const registration = this.#getRegistration();
    registration.registerChildSubsystems(this, {});
    
    // Register kernel:// routes for resource and friend creation
    this.#registerKernelRoutes();
    
    // Enable listeners if listeners hook has been installed
    // Kernel always needs listeners enabled for event emission
    const listeners = this.find('listeners');
    if (listeners) {
      // Enable listeners if not already enabled
      if (!listeners.hasListeners()) {
        listeners.enableListeners();
      }
      
      // Emit bootstrap event
      const bootstrapMessage = new Message('kernel://event/kernel-bootstapped', {
        timestamp: Date.now(),
        subsystem: 'kernel'
      });
      listeners.emit('kernel://event/kernel-bootstapped', bootstrapMessage);
    }
  }

  /**
   * Register kernel:// routes for resource, friend, permission, profile, and system management.
   * Routes are defined in kernel.routes.def.mycelia.js
   * @private
   */
  #registerKernelRoutes() {
    const router = this.find('router');
    if (!router) {
      if (this.debug) {
        console.warn('KernelSubsystem: router facet not found, skipping kernel:// route registration');
      }
      return;
    }

    // Note: No 'required' permission check - kernel routes are privileged operations
    // Security is enforced by: 1) sendProtected verifies callerId, 2) kernel validates owner subsystem

    // Register all routes from the routes definition
    // Get handler facets and create handler map
    const resourceHandlers = this.find('resourceHandlers');
    const friendHandlers = this.find('friendHandlers');
    const permissionHandlers = this.find('permissionHandlers');
    const profileHandlers = this.find('profileHandlers');
    const systemHandlers = this.find('systemHandlers');

    if (!resourceHandlers || !friendHandlers || !permissionHandlers || !profileHandlers || !systemHandlers) {
      if (this.debug) {
        console.warn('KernelSubsystem: One or more handler facets not found. Ensure handler hooks are installed.');
      }
    }

    const handlerMap = createKernelHandlerMap({
      resourceHandlers,
      friendHandlers,
      permissionHandlers,
      profileHandlers,
      systemHandlers,
      createResourceHandler: (m, p, o) => this.#handleCreateResource(m, o),
      createFriendHandler: (m, p, o) => this.#handleCreateFriend(m, o)
    });

    for (const [routeKey, routeDef] of Object.entries(KERNEL_ROUTES)) {
      const handlerMethod = routeDef.handler;
      const handler = handlerMap[handlerMethod];
      
      if (!handler) {
        if (this.debug) {
          console.warn(`KernelSubsystem: Handler method ${handlerMethod} not found for route ${routeKey}`);
        }
        continue;
      }

      router.registerRoute(
        routeDef.path,
        async (message, params, options) => {
          return await handler(message, params, options);
        },
        {
          metadata: {
            description: routeDef.description,
            ...routeDef.metadata
          }
        }
      );
    }

    if (this.debug) {
      console.log(`KernelSubsystem: Registered ${Object.keys(KERNEL_ROUTES).length} kernel:// routes`);
    }
  }

  /**
   * Handle create resource message.
   * 
   * @private
   * @param {Message} message - Message containing resource details
   * @param {Object} options - Routing options (includes callerId from sendProtected)
   * @returns {Resource} The created Resource instance
   * @throws {Error} If callerId is missing, owner subsystem not found, or creation fails
   */
  async #handleCreateResource(message, options) {
    // Extract PKR from options (set by sendProtected)
    const callerPkr = options.callerId;
    if (!callerPkr || !callerPkr.uuid) {
      throw new Error('KernelSubsystem.createResource: callerId (PKR) required');
    }

    // Extract resource details from message body
    const body = message.getBody();
    const { name, resourceInstance, metadata = {} } = body;

    // Validate inputs
    if (!name || typeof name !== 'string') {
      throw new Error('KernelSubsystem.createResource: name must be a non-empty string');
    }
    if (!resourceInstance) {
      throw new Error('KernelSubsystem.createResource: resourceInstance is required');
    }

    // Get AccessControlSubsystem
    const accessControl = this.getAccessControl();
    if (!accessControl) {
      throw new Error('KernelSubsystem.createResource: AccessControlSubsystem not available');
    }

    // Find owner subsystem from registry using caller PKR
    const ownerSubsystem = this.#findSubsystemByPkr(callerPkr);
    if (!ownerSubsystem) {
      throw new Error(
        `KernelSubsystem.createResource: owner subsystem not found for caller PKR ${callerPkr.uuid}`
      );
    }

    // Delegate to AccessControlSubsystem
    return accessControl.createResource(ownerSubsystem, name, resourceInstance, metadata);
  }

  /**
   * Handle create friend message.
   * 
   * @private
   * @param {Message} message - Message containing friend details
   * @param {Object} options - Routing options (includes callerId from sendProtected)
   * @returns {Friend} The created Friend instance
   * @throws {Error} If callerId is missing or creation fails
   */
  async #handleCreateFriend(message, options) {
    // Extract PKR from options (set by sendProtected)
    const callerPkr = options.callerId;
    if (!callerPkr || !callerPkr.uuid) {
      throw new Error('KernelSubsystem.createFriend: callerId (PKR) required');
    }

    // Extract friend details from message body
    const body = message.getBody();
    const { name, endpoint = null, metadata = {}, sessionKey = null, role = null } = body;

    // Validate inputs
    if (!name || typeof name !== 'string') {
      throw new Error('KernelSubsystem.createFriend: name must be a non-empty string');
    }

    // Get AccessControlSubsystem
    const accessControl = this.getAccessControl();
    if (!accessControl) {
      throw new Error('KernelSubsystem.createFriend: AccessControlSubsystem not available');
    }

    // Delegate to AccessControlSubsystem
    return accessControl.createFriend(name, {
      endpoint,
      metadata,
      sessionKey,
      role
    });
  }

  /**
   * Find a subsystem by matching its identity PKR.
   * 
   * @private
   * @param {PKR} pkr - Public Key Record to match
   * @returns {BaseSubsystem|null} Subsystem instance or null if not found
   */
  #findSubsystemByPkr(pkr) {
    if (!pkr || !pkr.uuid) {
      return null;
    }

    const messageSystem = this.messageSystem;
    if (!messageSystem) {
      return null;
    }

    const registry = messageSystem.find('messageSystemRegistry');
    if (!registry) {
      return null;
    }

    // Iterate through all registered subsystems to find one with matching PKR
    for (const subsystem of registry.values()) {
      if (subsystem.identity?.pkr?.uuid === pkr.uuid) {
        return subsystem;
      }
    }

    return null;
  }

  /**
   * Get the access control subsystem reference.
   * 
   * @returns {AccessControlSubsystem|null} Access control subsystem instance or null
   */
  getAccessControl() {
    return this.#childAccessors.getAccessControl();
  }

  /**
   * Get the error manager subsystem reference.
   * 
   * @returns {ErrorManagerSubsystem|null} Error manager subsystem instance or null
   */
  getErrorManager() {
    return this.#childAccessors.getErrorManager();
  }

  /**
   * Get the response manager subsystem reference.
   * 
   * @returns {ResponseManagerSubsystem|null} Response manager subsystem instance or null
   */
  getResponseManager() {
    return this.#childAccessors.getResponseManager();
  }

  /**
   * Get the channel manager subsystem reference.
   * 
   * @returns {ChannelManagerSubsystem|null} Channel manager subsystem instance or null
   */
  getChannelManager() {
    return this.#childAccessors.getChannelManager();
  }

  /**
   * Get the profile registry subsystem reference.
   * 
   * @returns {ProfileRegistrySubsystem|null} Profile registry subsystem instance or null
   */
  getProfileRegistry() {
    return this.#childAccessors.getProfileRegistry();
  }

  /**
   * Register a subsystem with access control.
   * 
   * Wires a subsystem principal and attaches identity to the subsystem instance
   * by delegating to the AccessControlSubsystem's wireSubsystem method.
   * Subsystems registered through the kernel are always registered as 'topLevel'.
   * 
   * Returns a wrapper object that exposes limited subsystem methods, preventing
   * direct access to the full subsystem instance. The wrapper includes optional
   * listeners functionality if the subsystem has a listeners facet.
   * 
   * @param {BaseSubsystem} subsystemInstance - The subsystem instance to register
   * @param {object} [options={}] - Optional options
   * @param {object} [options.metadata={}] - Optional metadata for the subsystem
   * @returns {Object} - A wrapper object exposing limited subsystem methods:
   *   - accept(message, options) - Accept and process a message
   *   - process(timeSlice) - Process messages in the queue
   *   - getNameString() - Get fully-qualified subsystem name
   *   - pause() - Pause message processing
   *   - resume() - Resume message processing
   *   - dispose() - Dispose the subsystem
   *   - listeners {Object} - Optional listeners API (only if subsystem has listeners facet):
   *     - on(path, handler, opts) - Register a listener (auto-enables if needed)
   *     - off(path, handler, opts) - Unregister a listener
   *     - emit(...args) - Emit an event (if supported)
   *     - hasListeners() - Check if listeners are enabled
   *     - enable() - Enable listeners
   * @throws {Error} If access control subsystem is not found, or if wireSubsystem fails
   * 
   * @example
   * // Register a top-level subsystem
   * const subsystem = kernel.registerSubsystem(canvasSubsystem);
   * await subsystem.accept(message);
   * subsystem.pause();
   * 
   * @example
   * // Use listeners if available
   * const subsystem = kernel.registerSubsystem(canvasSubsystem);
   * if (subsystem.listeners) {
   *   subsystem.listeners.on('layer/created', (message) => {
   *     console.log('Layer created:', message.getBody());
   *   });
   * }
   */
  registerSubsystem(subsystemInstance, options = {}) {
    const registration = this.#getRegistration();
    const subsystem = registration.registerSubsystem(subsystemInstance, options);
    
    // Create a wrapper that exposes only specific methods
    const wrapper = KernelWrapper.create(subsystem);
    
    // Emit subsystem registered event if listeners hook is installed
    const listeners = this.find('listeners');
    if (listeners) {
      const eventMessage = new Message('kernel://event/subsystem-registered', {
        timestamp: Date.now(),
        subsystemName: subsystemInstance.name || subsystem.name,
        subsystemPath: subsystem.getNameString ? subsystem.getNameString() : subsystem.name,
        subsystem: subsystem,
        wrapper: wrapper,
        options
      });
      listeners.emit('kernel://event/subsystem-registered', eventMessage);
    }
    
    return wrapper;
  }

  /**
   * Send a protected message with caller authentication.
   * 
   * SECURITY: This method allows the kernel to set the callerId for authenticated messages.
   * Any callerId in the provided options is stripped to prevent spoofing.
   * The kernel sets both the callerId (from the provided PKR) and callerIdSetBy (kernel's PKR).
   * 
   * Flow:
   * 1. Validate kernel identity and pkr
   * 2. Strip callerId from options and set callerId/callerIdSetBy
   * 3. Get MessageSystem router
   * 4. If isResponse:
   *    - Handle response via ResponseManager (non-blocking)
   *    - If one-shot path: Route directly (skip channel ACL)
   *    - Else: Enforce channel ACL if channel, then route
   * 5. Else (non-response):
   *    - Register response-required if needed (non-blocking)
   *    - Enforce channel ACL if channel path
   *    - Route normally
   * 
   * @param {PKR} pkr - The caller's Public Key Record (PKR)
   * @param {Message} message - Message object (contains path for routing)
   * @param {Object} [options={}] - Send options (callerId will be set by kernel, any user-provided callerId is stripped)
   * @returns {Promise<Object>} Send result
   * @throws {Error} If kernel identity is missing, MessageSystem is not found, or pkr is invalid
   * 
   * @example
   * // Send a protected message with caller authentication
   * const result = await kernel.sendProtected(
   *   callerPkr, // Caller's PKR
   *   new Message('canvas://layers/create', { name: 'background' })
   * );
   */
  async sendProtected(pkr, message, options = {}) {
    const protectedMessaging = this.#getProtectedMessaging();
    return await protectedMessaging.sendProtected(pkr, message, options);
  }

  /**
   * Send a protected message using pooled Message instance (performance + security optimized)
   * 
   * Combines message pooling (performance) with kernel security features (authentication, ACL).
   * This provides 10% better performance than sendProtected() while maintaining all security guarantees.
   * 
   * SECURITY: This method allows the kernel to set the callerId for authenticated messages.
   * Any callerId in the provided options is stripped to prevent spoofing.
   * The kernel sets both the callerId (from the provided PKR) and callerIdSetBy (kernel's PKR).
   * 
   * Flow:
   * 1. Validate kernel identity and pkr
   * 2. Acquire Message from MessageSystem's pool
   * 3. Strip callerId from options and set callerId/callerIdSetBy
   * 4. Handle response management (if isResponse)
   * 5. Enforce channel ACL (if channel path)
   * 6. Route via MessageSystem router
   * 7. Release Message back to pool
   * 
   * @param {PKR} pkr - The caller's Public Key Record (PKR)
   * @param {string} path - Message path (e.g., 'api://users/123')
   * @param {any} body - Message body/payload
   * @param {Object} [options={}] - Send options
   * @param {Object} [options.meta] - Message metadata
   * @param {boolean} [options.isResponse] - Whether this is a response message
   * @param {string} [options.channel] - Channel identifier (for ACL enforcement)
   * @returns {Promise<Object>} Send result
   * @throws {Error} If kernel identity is missing, MessageSystem is not found, or pkr is invalid
   * 
   * @example
   * // Send a protected pooled message
   * const result = await kernel.sendPooledProtected(
   *   callerPkr,
   *   'api://users/123',
   *   { action: 'get' }
   * );
   * 
   * @example
   * // With metadata and options
   * const result = await kernel.sendPooledProtected(
   *   callerPkr,
   *   'api://users/123',
   *   { action: 'get' },
   *   {
   *     meta: { traceId: 'abc123' },
   *     isResponse: false
   *   }
   * );
   */
  async sendPooledProtected(pkr, path, body, options = {}) {
    const protectedMessaging = this.#getProtectedMessaging();
    return await protectedMessaging.sendPooledProtected(pkr, path, body, options);
  }
}
