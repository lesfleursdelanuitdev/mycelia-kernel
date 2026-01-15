import { ReaderWriterSet } from './reader-writer-set.mycelia.js';
import { Message } from '../message/message.mycelia.js';

/**
 * createIdentity
 * --------------
 * Constructs an identity context around a given owner PKR.
 * Provides permission-checked wrappers for read/write/grant/auth operations
 * and secure messaging methods (sendProtected, sendPooledProtected) that auto-inject the owner's PKR.
 */
export function createIdentity(principals, ownerPkr, kernel) {
  if (!principals || typeof principals.resolvePKR !== 'function') {
    throw new TypeError('createIdentity: invalid principals registry');
  }

  if (!ownerPkr || typeof ownerPkr.publicKey !== 'symbol') {
    throw new TypeError('createIdentity: invalid owner PKR');
  }

  if (!kernel || typeof kernel.sendProtected !== 'function') {
    throw new TypeError('createIdentity: kernel must support sendProtected');
  }

  // Each principal can have one canonical ReaderWriterSet
  const rws = principals.createRWS(ownerPkr);

  // ---- Subsystem Storage ----
  let subsystem = null;

  /**
   * getSubsystem
   * ------------
   * Get the subsystem associated with this identity.
   * 
   * @returns {BaseSubsystem|null} The subsystem instance or null if not set
   */
  function getSubsystem() {
    return subsystem;
  }

  /**
   * setSubsystem
   * ------------
   * Set the subsystem associated with this identity.
   * Can only be set once (when subsystem is null).
   * 
   * @param {BaseSubsystem} subsystemInstance - The subsystem instance to associate
   * @throws {Error} If subsystem is already set
   */
  function setSubsystem(subsystemInstance) {
    if (subsystem !== null) {
      throw new Error('createIdentity.setSubsystem: subsystem is already set and cannot be changed');
    }
    subsystem = subsystemInstance;
  }

  // ---- Permission Queries ----

  /**
   * Get the parent resource's identity if this identity belongs to a resource with a parent
   * @private
   */
  function getParentResourceIdentity() {
    // Try to get the principal's instance to find the resource
    const principal = principals.get(ownerPkr.uuid);
    if (!principal) return null;

    const instance = principal.instance;
    if (!instance) return null;

    // Check if instance is a Resource
    if (!instance.isResource || instance.kind !== 'resource') return null;

    // Get parent resource
    const parentResource = instance.parent;
    if (!parentResource) return null;

    // Get parent resource's instance (the actual resource instance object)
    const parentInstance = parentResource.instance;
    if (!parentInstance) return null;

    // Get parent resource's identity
    return parentInstance.identity || null;
  }

  /**
   * Check permission with optional inheritance from parent resources
   * @private
   */
  function checkPermissionWithInheritance(permissionType, pkr, options = {}) {
    // First check own permissions
    let hasPermission = false;
    switch (permissionType) {
      case 'read':
        hasPermission = rws.canRead(pkr);
        break;
      case 'write':
        hasPermission = rws.canWrite(pkr);
        break;
      case 'grant':
        hasPermission = rws.canGrant(pkr);
        break;
    }

    if (hasPermission) {
      return true;
    }

    // If inheritance is enabled and permission check failed, check parent
    if (options.inherit) {
      const parentIdentity = getParentResourceIdentity();
      if (parentIdentity) {
        // Recursively check parent with inheritance enabled
        switch (permissionType) {
          case 'read':
            return parentIdentity.canRead(pkr, { inherit: true });
          case 'write':
            return parentIdentity.canWrite(pkr, { inherit: true });
          case 'grant':
            return parentIdentity.canGrant(pkr, { inherit: true });
        }
      }
    }

    return false;
  }

  /**
   * Check if a PKR can read, with optional inheritance from parent resources
   * @param {PKR} pkr - Public Key Record to check
   * @param {Object} [options={}] - Options object
   * @param {boolean} [options.inherit=false] - If true, check parent resource permissions if own check fails
   * @returns {boolean} - `true` if can read
   */
  function canRead(pkr, options = {}) {
    if (!options.inherit) {
      return rws.canRead(pkr);
    }
    return checkPermissionWithInheritance('read', pkr, options);
  }

  /**
   * Check if a PKR can write, with optional inheritance from parent resources
   * @param {PKR} pkr - Public Key Record to check
   * @param {Object} [options={}] - Options object
   * @param {boolean} [options.inherit=false] - If true, check parent resource permissions if own check fails
   * @returns {boolean} - `true` if can write
   */
  function canWrite(pkr, options = {}) {
    if (!options.inherit) {
      return rws.canWrite(pkr);
    }
    return checkPermissionWithInheritance('write', pkr, options);
  }

  /**
   * Check if a PKR can grant, with optional inheritance from parent resources
   * @param {PKR} pkr - Public Key Record to check
   * @param {Object} [options={}] - Options object
   * @param {boolean} [options.inherit=false] - If true, check parent resource permissions if own check fails
   * @returns {boolean} - `true` if can grant
   */
  function canGrant(pkr, options = {}) {
    if (!options.inherit) {
      return rws.canGrant(pkr);
    }
    return checkPermissionWithInheritance('grant', pkr, options);
  }

  // ---- Permission-Enforced Wrappers ----

  /**
   * requireRead
   * ------------
   * Wraps a handler to require read permission.
   * Checks if the caller (from options.callerId) has read permission on the owner's PKR.
   * 
   * @param {Function} fn - The handler function to wrap
   * @param {Object} [options={}] - Options object
   * @param {PKR} [options.callerId] - The caller's PKR (required for permission check)
   * @returns {Function} Wrapped handler that checks read permission before executing
   * @throws {Error} If callerId is missing or doesn't have read permission
   */
  function requireRead(fn, options = {}) {
    return function (...args) {
      if (!canRead(options.callerId)) {
        throw new Error('Permission denied: read access required');
      }
      return fn(...args);
    };
  }

  /**
   * requireWrite
   * ------------
   * Wraps a handler to require write permission.
   * Checks if the caller (from options.callerId) has write permission on the owner's PKR.
   * 
   * @param {Function} fn - The handler function to wrap
   * @param {Object} [options={}] - Options object
   * @param {PKR} [options.callerId] - The caller's PKR (required for permission check)
   * @returns {Function} Wrapped handler that checks write permission before executing
   * @throws {Error} If callerId is missing or doesn't have write permission
   */
  function requireWrite(fn, options = {}) {
    return function (...args) {
      if (!canWrite(options.callerId)) {
        throw new Error('Permission denied: write access required');
      }
      return fn(...args);
    };
  }

  /**
   * requireGrant
   * ------------
   * Wraps a handler to require grant permission.
   * Checks if the caller (from options.callerId) has grant permission on the owner's PKR.
   * 
   * @param {Function} fn - The handler function to wrap
   * @param {Object} [options={}] - Options object
   * @param {PKR} [options.callerId] - The caller's PKR (required for permission check)
   * @returns {Function} Wrapped handler that checks grant permission before executing
   * @throws {Error} If callerId is missing or doesn't have grant permission
   */
  function requireGrant(fn, options = {}) {
    return function (...args) {
      if (!canGrant(options.callerId)) {
        throw new Error('Permission denied: grant access required');
      }
      return fn(...args);
    };
  }

  /**
   * requireAuth
   * ------------
   * Generic authorization wrapper that validates kernel identity and checks permissions.
   * 
   * First validates that options.callerIdSetBy is a kernel (to ensure the callerId was set
   * by a trusted kernel via sendProtected). Then wraps the handler with the appropriate
   * permission check based on the type.
   * 
   * @param {'read'|'write'|'grant'} type - The permission type required
   * @param {Function} handler - The handler function to wrap
   * @param {Object} [options={}] - Options object
   * @param {PKR} [options.callerId] - The caller's PKR (required for permission check)
   * @param {PKR} [options.callerIdSetBy] - The kernel's PKR that set the callerId (required for validation)
   * @returns {Function} Wrapped handler that validates kernel identity and checks permission
   * @throws {Error} If handler is not a function
   * @throws {Error} If callerIdSetBy is not a kernel
   * @throws {Error} If callerId is missing or doesn't have the required permission
   */
  function requireAuth(type, handler, options = {}) {
    if (typeof handler !== 'function') {
      throw new TypeError('requireAuth: handler must be a function');
    }

    // Validate that callerIdSetBy is a kernel (security check)
    if (!rws.isKernel(options.callerIdSetBy)) {
      throw new Error('Permission denied: callerIdSetBy is not a kernel');
    }

    switch (type) {
      case 'read':
        return requireRead(handler, options);
      case 'write':
        return requireWrite(handler, options);
      case 'grant':
        return requireGrant(handler, options);
      default:
        throw new Error(`requireAuth: unknown auth type "${type}"`);
    }
  }

  // ---- Grant / Revoke Helpers ----

  const grantReader = (granter, grantee) => rws.addReader(granter, grantee);
  const grantWriter = (granter, grantee) => rws.addWriter(granter, grantee);
  const grantGranter = (granter, grantee) => rws.addGranter(granter, grantee);
  const revokeReader = (granter, grantee) => rws.removeReader(granter, grantee);
  const revokeWriter = (granter, grantee) => rws.removeWriter(granter, grantee);
  const revokeGranter = (granter, grantee) => rws.removeGranter(granter, grantee);
  const promote = (granter, grantee) => rws.promote(granter, grantee);
  const demote = (granter, grantee) => rws.demote(granter, grantee);

  // ---- Protected Messaging ----

  async function sendProtected(message, options = {}) {
    return kernel.sendProtected(ownerPkr, message, options);
  }

  /**
   * sendPooledProtected
   * --------------------
   * Send a protected message using pooled Message instance (performance + security optimized).
   * 
   * Combines message pooling (performance) with kernel security features (authentication, ACL).
   * This provides 10% better performance than sendProtected() while maintaining all security guarantees.
   * 
   * @param {string} path - Message path (e.g., 'api://users/123')
   * @param {any} body - Message body/payload
   * @param {Object} [options={}] - Send options
   * @param {Object} [options.meta] - Message metadata
   * @param {boolean} [options.isResponse] - Whether this is a response message
   * @returns {Promise<Object>} Send result
   * @throws {Error} If kernel doesn't support sendPooledProtected
   * 
   * @example
   * // Send a protected pooled message
   * await identity.sendPooledProtected(
   *   'api://users/123',
   *   { action: 'get' },
   *   { meta: { traceId: 'abc123' } }
   * );
   */
  async function sendPooledProtected(path, body, options = {}) {
    if (typeof kernel.sendPooledProtected !== 'function') {
      throw new Error('createIdentity.sendPooledProtected: kernel must support sendPooledProtected');
    }
    return kernel.sendPooledProtected(ownerPkr, path, body, options);
  }

  // ---- Access Control (via AccessControlSubsystem) ----

  /**
   * getAccessControl
   * ----------------
   * Get the AccessControlSubsystem instance from the kernel.
   * 
   * Lookup order:
   * 1. kernel.getAccessControl() (preferred - explicit method)
   * 2. kernel.find('access-control') (fallback - facet lookup)
   * 
   * @returns {AccessControlSubsystem|null} Access control subsystem instance or null if not available
   */
  function getAccessControl() {
    // Preferred: KernelSubsystem exposes an explicit helper
    if (typeof kernel.getAccessControl === 'function') {
      return kernel.getAccessControl();
    }
    
    // Fallback: facet lookup / hierarchy
    if (typeof kernel.find === 'function') {
      return kernel.find('access-control');
    }
    
    return null;
  }

  /**
   * createResourceIdentity
   * -----------------------
   * Create a new Resource and register a corresponding Principal for it.
   * Uses the identity's subsystem as the owner instance.
   * 
   * This method sends a message to kernel://create/resource, which routes through
   * the kernel's message system. The kernel verifies the caller's PKR and delegates
   * to AccessControlSubsystem.
   * 
   * @param {string} name - Resource name
   * @param {object} resourceInstance - Required instance to attach to the resource
   * @param {object} [metadata={}] - Optional metadata for the resource
   * @returns {Promise<Resource>} The created Resource instance
   * @throws {Error} If subsystem is not set on identity
   * @throws {Error} If kernel message routing fails
   * @throws {Error} If name is invalid or resourceInstance is missing
   */
  async function createResourceIdentity(name, resourceInstance, metadata = {}) {
    // Validate inputs
    if (!name || typeof name !== 'string') {
      throw new Error('createIdentity.createResourceIdentity: name must be a non-empty string');
    }
    if (!resourceInstance) {
      throw new Error('createIdentity.createResourceIdentity: resourceInstance is required');
    }

    // Send message to kernel to create resource
    // The kernel will verify the caller's PKR and find the owner subsystem
    const message = new Message('kernel://create/resource', {
      name,
      resourceInstance,
      metadata
    });

    // Use sendProtected to route through kernel (PKR is automatically set)
    const routingResult = await sendProtected(message);
    
    // Extract the Resource from the nested routing result structure
    // MessageRouter.route() returns: { success, subsystem, messageId, result: routeResult }
    // routeToSubsystem() returns: { accepted, processed, subsystem, result: handlerResult }
    // So we need: routingResult.result.result
    if (routingResult && routingResult.result) {
      const routeResult = routingResult.result;
      
      // If routeResult has a result property, that's the handler result (Resource)
      if (routeResult.result !== undefined) {
        return routeResult.result;
      }
      
      // If routeResult is the Resource itself (fallback)
      if (routeResult.name && routeResult.isResource) {
        return routeResult;
      }
    }
    
    // If routingResult is the Resource itself (direct return)
    if (routingResult && routingResult.name && routingResult.isResource) {
      return routingResult;
    }
    
    throw new Error(
      `createIdentity.createResourceIdentity: unexpected result format from kernel://create/resource. ` +
      `Expected nested result structure, got: ${JSON.stringify(routingResult, null, 2)}`
    );
  }

  /**
   * createFriend
   * ------------
   * Create a new Friend and register a corresponding Principal for it.
   * 
   * This method sends a message to kernel://create/friend, which routes through
   * the kernel's message system. The kernel verifies the caller's PKR and delegates
   * to AccessControlSubsystem.
   * 
   * @param {string} name - Friend name
   * @param {object} [options={}] - Optional friend options
   * @param {string} [options.endpoint=null] - Friend endpoint
   * @param {object} [options.metadata={}] - Optional metadata for the friend
   * @param {symbol} [options.sessionKey=null] - Optional session key
   * @param {string} [options.role=null] - Optional role name (e.g., 'student', 'teacher')
   * @returns {Promise<Friend>} The created Friend instance
   * @throws {Error} If kernel message routing fails
   * @throws {Error} If name is invalid
   */
  async function createFriend(name, options = {}) {
    // Validate inputs
    if (!name || typeof name !== 'string') {
      throw new Error('createIdentity.createFriend: name must be a non-empty string');
    }

    const { endpoint = null, metadata = {}, sessionKey = null, role = null } = options;

    // Send message to kernel to create friend
    // The kernel will verify the caller's PKR
    const message = new Message('kernel://create/friend', {
      name,
      endpoint,
      metadata,
      sessionKey,
      role
    });

    // Use sendProtected to route through kernel (PKR is automatically set)
    const routingResult = await sendProtected(message);
    
    // Extract the Friend from the nested routing result structure
    // MessageRouter.route() returns: { success, subsystem, messageId, result: routeResult }
    // routeToSubsystem() returns: { accepted, processed, subsystem, result: handlerResult }
    // So we need: routingResult.result.result
    if (routingResult && routingResult.result) {
      const routeResult = routingResult.result;
      
      // If routeResult has a result property, that's the handler result (Friend)
      if (routeResult.result !== undefined) {
        return routeResult.result;
      }
      
      // If routeResult is the Friend itself (fallback)
      if (routeResult.name && routeResult.isFriend) {
        return routeResult;
      }
    }
    
    // If routingResult is the Friend itself (direct return)
    if (routingResult && routingResult.name && routingResult.isFriend) {
      return routingResult;
    }
    
    throw new Error(
      `createIdentity.createFriend: unexpected result format from kernel://create/friend. ` +
      `Expected nested result structure, got: ${JSON.stringify(routingResult, null, 2)}`
    );
  }

  // ---- Channels (via ChannelManagerSubsystem) ----

  /**
   * getChannelManager
   * -----------------
   * Get the ChannelManagerSubsystem instance from the kernel.
   * 
   * Lookup order:
   * 1. kernel.getChannelManager() (preferred - explicit method)
   * 2. kernel.find('channel-manager') (fallback - facet lookup)
   * 
   * @returns {ChannelManagerSubsystem|null} Channel manager instance or null if not available
   */
  function getChannelManager() {
    // Preferred: KernelSubsystem exposes an explicit helper
    if (typeof kernel.getChannelManager === 'function') {
      return kernel.getChannelManager();
    }
    
    // Fallback: facet lookup / hierarchy
    if (typeof kernel.find === 'function') {
      return kernel.find('channel-manager');
    }
    
    return null;
  }

  /**
   * createChannel
   * -------------
   * Register a long-lived reply channel owned by this identity.
   * 
   * @param {string} route - Fully qualified channel route, e.g. "ui://channel/layout"
   * @param {Object} [options={}]
   * @param {Array<PKR>} [options.participants=[]] - PKRs allowed to use this channel
   * @param {Object} [options.metadata={}] - Optional channel metadata
   * @returns {Channel} The created channel instance
   * @throws {Error} If ChannelManagerSubsystem is not available
   * @throws {Error} If route is invalid
   * @throws {Error} If channel registration fails
   */
  function createChannel(route, { participants = [], metadata = {} } = {}) {
    const cm = getChannelManager();
    if (!cm || typeof cm.registerChannel !== 'function') {
      throw new Error(
        'createIdentity.createChannel: ChannelManagerSubsystem with registerChannel() is not available on kernel.'
      );
    }
    
    if (typeof route !== 'string' || !route.trim()) {
      throw new Error('createIdentity.createChannel: route must be a non-empty string.');
    }
    
    return cm.registerChannel({
      route,
      ownerPkr,
      participants,
      metadata
    });
  }

  /**
   * getChannel
   * ----------
   * Look up a channel owned by this identity by name or route.
   * 
   * nameOrRoute can be:
   * - full route: "canvas://channel/layout"
   * - short name: "layout" (searches by metadata.name or route suffix)
   * 
   * @param {string} nameOrRoute - Channel name or full route
   * @returns {Channel|null} Channel instance or null if not found
   * @throws {Error} If ChannelManagerSubsystem is not available
   * @throws {Error} If nameOrRoute is invalid
   */
  function getChannel(nameOrRoute) {
    const cm = getChannelManager();
    if (!cm || typeof cm.getChannelFor !== 'function') {
      throw new Error(
        'createIdentity.getChannel: ChannelManagerSubsystem with getChannelFor() is not available on kernel.'
      );
    }
    
    if (typeof nameOrRoute !== 'string' || !nameOrRoute.trim()) {
      throw new Error('createIdentity.getChannel: nameOrRoute must be a non-empty string.');
    }
    
    return cm.getChannelFor(ownerPkr, nameOrRoute);
  }

  /**
   * listChannels
   * ------------
   * List all channels owned by this identity.
   * 
   * @returns {Array<Channel>} Array of channel instances owned by this identity
   * @throws {Error} If ChannelManagerSubsystem is not available
   */
  function listChannels() {
    const cm = getChannelManager();
    if (!cm || typeof cm.listAllChannelsFor !== 'function') {
      throw new Error(
        'createIdentity.listChannels: ChannelManagerSubsystem with listAllChannelsFor() is not available on kernel.'
      );
    }
    
    return cm.listAllChannelsFor(ownerPkr);
  }

  // ---- Role Management ----

  /**
   * getRole
   * -------
   * Get the role for this identity's principal.
   * 
   * @returns {string|null} Role name or null if not set
   */
  function getRole() {
    return principals.getRoleForPKR(ownerPkr);
  }

  /**
   * setRole
   * -------
   * Set the role for this identity's principal.
   * 
   * @param {string} role - Role name
   * @returns {boolean} True if role was set successfully
   */
  function setRole(role) {
    return principals.setRoleForPKR(ownerPkr, role);
  }

  return {
    pkr: ownerPkr,
    // Permission queries
    canRead,
    canWrite,
    canGrant,
    // Wrappers
    requireRead,
    requireWrite,
    requireGrant,
    requireAuth,
    // Grant/revoke helpers
    grantReader,
    grantWriter,
    grantGranter,
    revokeReader,
    revokeWriter,
    revokeGranter,
    promote,
    demote,
    // Messaging
    sendProtected,
    sendPooledProtected,
    // Channels
    createChannel,
    getChannel,
    listChannels,
    // Subsystem
    getSubsystem,
    setSubsystem,
    // Resources
    createResourceIdentity,
    // Friends
    createFriend,
    // Role management
    getRole,
    setRole
  };
}

