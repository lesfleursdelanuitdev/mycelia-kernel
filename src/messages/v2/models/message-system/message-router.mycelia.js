/**
 * MessageRouter Class
 * 
 * A simple, efficient router that extracts subsystem names from message paths and routes
 * messages to the appropriate subsystems. Integrates with MessageSystem's subsystem registry
 * to provide centralized message routing in a message-driven architecture.
 * 
 * Kernel-level paths (kernel://*) are routed to the kernel subsystem, which processes them
 * immediately (synchronously) without queuing.
 * 
 * @example
 * // Create router with MessageSystem
 * const router = new MessageRouter(messageSystem, { debug: true });
 * 
 * @example
 * // Route a message
 * const message = new Message('canvas://layers/create', { name: 'background' });
 * const result = await router.route(message);
 * 
 * @example
 * // Monitor routing statistics
 * const stats = router.getStatistics();
 * console.log('Messages routed:', stats.messagesRouted);
 */

export class MessageRouter {
  // Private field for kernel subsystem (for routing kernel:// messages)
  #kernel;
  
  // Private field for subsystem registry (for routing to subsystems)
  #subsystems;
  
  /**
   * Create a new MessageRouter instance
   * 
   * @param {MessageSystem} messageSystem - The MessageSystem instance to route messages through
   * @param {KernelSubsystem} kernel - The kernel subsystem instance (for routing kernel:// messages)
   * @param {MessageSubsystems} subsystems - The subsystem registry (for routing to subsystems)
   * @param {Object} [options={}] - Configuration options
   * @param {boolean} [options.debug=false] - Enable debug logging
   * 
   * @example
   * // Basic router
   * const router = new MessageRouter(messageSystem, kernel, subsystems);
   * 
   * @example
   * // Router with debug logging
   * const router = new MessageRouter(messageSystem, kernel, subsystems, { debug: true });
   */
  constructor(messageSystem, kernel, subsystems, options = {}) {
    this.messageSystem = messageSystem;
    this.#kernel = kernel;
    this.#subsystems = subsystems;
    this.debug = options.debug || false;
    
    // Statistics
    this.stats = {
      messagesRouted: 0,
      routingErrors: 0,
      unknownRoutes: 0
    };
    
    if (this.debug) {
      console.log('MessageRouter: Initialized');
    }
  }

  /**
   * Set the kernel subsystem.
   * Only sets the kernel if it is currently null.
   * 
   * @param {KernelSubsystem} kernel - The kernel subsystem instance
   * @returns {boolean} True if kernel was set, false if it was already set
   * 
   * @example
   * // Set kernel if not already set
   * const wasSet = router.setKernel(kernelSubsystem);
   * if (wasSet) {
   *   console.log('Kernel was set');
   * } else {
   *   console.log('Kernel was already set');
   * }
   */
  setKernel(kernel) {
    if (this.#kernel === null) {
      this.#kernel = kernel;
      if (this.debug) {
        console.log('MessageRouter: Kernel set');
      }
      return true;
    }
    return false;
  }

  /**
   * Route a message to the appropriate subsystem based on its path
   * 
   * Extracts the subsystem name from the message path and routes the message
   * to the corresponding subsystem in the MessageSystem registry.
   * 
   * @param {Message} message - Message to route (must have valid path format)
   * @param {Object} [options={}] - Options to pass to subsystem accept()
   * @returns {Promise<Object>} Routing result object
   * @returns {boolean} result.success - Whether routing was successful
   * @returns {string} [result.subsystem] - Target subsystem name (if successful)
   * @returns {string} [result.messageId] - Message ID for tracing
   * @returns {Object} [result.result] - Subsystem acceptance result (if successful)
   * @returns {string} [result.error] - Error message (if failed)
   * 
   * @example
   * // Route a message
   * const message = new Message('canvas://layers/create', { name: 'background' });
   * const result = await router.route(message);
   * 
   * if (result.success) {
   *   console.log(`Message routed to ${result.subsystem}`);
   * } else {
   *   console.error(`Routing failed: ${result.error}`);
   * }
   * 
   * @example
   * // Handle routing errors
   * const result = await router.route(invalidMessage);
   * if (!result.success) {
   *   console.error(`Failed to route message ${result.messageId}: ${result.error}`);
   * }
   */
  async route(message, options = {}) {
    try {
      // Validate message has valid subsystem
      if (!message.hasValidSubsystem()) {
        this.stats.unknownRoutes++;
        return {
          success: false,
          error: `Invalid message path: ${message.path}`,
          messageId: message.id
        };
      }
      
      // Extract subsystem name from message path (works for all paths including kernel://)
      const subsystemName = message.extractSubsystem();
      if (!subsystemName) {
        this.stats.unknownRoutes++;
        return {
          success: false,
          error: `Invalid path format: ${message.path}`,
          messageId: message.id
        };
      }
      
      // Get target subsystem
      // Kernel messages need special handling (kernel is not in subsystem registry)
      let subsystem;
      if (subsystemName === 'kernel') {
        subsystem = this.#kernel;
      } else {
        subsystem = this.#subsystems.get(subsystemName);
      }
      
      if (!subsystem) {
        this.stats.unknownRoutes++;
        return {
          success: false,
          error: `No subsystem found for: ${subsystemName}`,
          messageId: message.id
        };
      }
      
      // Route message to subsystem
      // KernelSubsystem processes kernel:// messages immediately (synchronously)
      // Other subsystems enqueue messages for later processing
      const routeResult = await this.routeToSubsystem(message, subsystem, options);
      
      this.stats.messagesRouted++;
      
      if (this.debug) {
        console.log(`MessageRouter: Routed message ${message.id} to ${subsystemName}`);
      }
      
      
      return {
        success: true,
        subsystem: subsystemName,
        messageId: message.id,
        result: routeResult
      };
      
    } catch (error) {
      this.stats.routingErrors++;
      
      if (this.debug) {
        console.error('MessageRouter: Routing error:', error);
      }
      
      return {
        success: false,
        error: error.message,
        messageId: message.id
      };
    }
  }



  /**
   * Route message to a specific subsystem
   * @param {Message} message - Message to route
   * @param {BaseSubsystem} subsystem - Target subsystem
   * @param {Object} [options={}] - Options to pass to accept() or processImmediately()
   * @returns {Object} Routing result
   */
  async routeToSubsystem(message, subsystem, options = {}) {
    try {
      // Check if message should be processed immediately (bypasses queue)
      // processImmediately can be in mutable metadata or accessed via getCustomMutableField
      const processImmediately = message.meta?.getCustomMutableField?.('processImmediately') === true;
      
      if (processImmediately) {
        // Process message immediately (synchronously, never queued)
        const result = await subsystem.processImmediately(message, options);
        
        return {
          accepted: true,
          processed: true,
          subsystem: subsystem.name,
          result: result
        };
      }
      
      // Default: Accept message into subsystem queue (or process synchronously for query messages)
      const acceptResult = await subsystem.accept(message, options);
      
      // For synchronous subsystems, accept() processes immediately and returns the handler result
      // For non-synchronous subsystems, accept() returns a boolean (true/false)
      // Check if the result is a processing result (object) vs boolean
      if (acceptResult !== undefined && acceptResult !== null && typeof acceptResult === 'object' && acceptResult !== true && acceptResult !== false) {
        // If acceptResult is an object (not a boolean), it's a processing result
        // This happens for synchronous subsystems where accept() processes immediately
        return {
          accepted: true,
          processed: true,
          subsystem: subsystem.name,
          result: acceptResult
        };
      }
      
      // For non-synchronous subsystems, accept() returns boolean
      return {
        accepted: acceptResult === true,
        subsystem: subsystem.name,
        queueSize: subsystem.getQueueStatus().size
      };
      
    } catch (error) {
      throw new Error(`Failed to route to subsystem ${subsystem.name}: ${error.message}`);
    }
  }


  /**
   * Get router statistics
   * @returns {Object} Statistics object
   */
  getStatistics() {
    return {
      ...this.stats,
      subsystemCount: this.messageSystem.getSubsystemCount()
    };
  }

  /**
   * Clear all statistics
   */
  clear() {
    this.stats = {
      messagesRouted: 0,
      routingErrors: 0,
      unknownRoutes: 0
    };
    
    if (this.debug) {
      console.log('MessageRouter: Cleared all statistics');
    }
  }
}

