/**
 * KernelProtectedMessaging
 * 
 * Handles protected message sending with caller authentication.
 * Enforces channel ACLs and manages response tracking.
 * 
 * @example
 * const messaging = new KernelProtectedMessaging(kernelSubsystem, msRouter);
 * const result = await messaging.sendProtected(pkr, message, options);
 */
export class KernelProtectedMessaging {
  /**
   * Create a new KernelProtectedMessaging instance
   * 
   * @param {KernelSubsystem} kernel - The kernel subsystem instance
   * @param {Object} msRouter - MessageSystem router facet
   */
  constructor(kernel, msRouter) {
    this.kernel = kernel;
    this.msRouter = msRouter;
  }

  /**
   * Check if a path is a one-shot request reply route.
   * 
   * One-shot routes follow the pattern: {subsystem}://request/oneShot/{messageId}
   * These are temporary routes that should skip channel ACL checks.
   * 
   * @param {string} path - Message path to check
   * @returns {boolean} True if path is a one-shot route, false otherwise
   */
  isOneShotPath(path) {
    if (typeof path !== 'string' || !path.trim()) {
      return false;
    }
    // Match pattern: {subsystem}://request/oneShot/{messageId}
    return path.includes('://request/oneShot/');
  }

  /**
   * If the path is a registered channel, enforce ACL for the given PKR.
   * If not a channel (or no channel manager), this is a no-op.
   * Throws on unauthorized access.
   * 
   * @param {PKR} pkr - Caller's PKR
   * @param {string} path - Message path to check
   * @throws {Error} If caller is not authorized to use the channel
   */
  enforceChannelAccessIfChannel(pkr, path) {
    const channelManager = this.kernel.getChannelManager();
    if (!channelManager) {
      // No channel manager available, skip ACL check
      return;
    }

    if (typeof path !== 'string' || !path.trim()) {
      return;
    }

    // Check if path is a registered channel
    const channel = channelManager.getChannel(path);
    if (!channel) {
      // Not a channel, no ACL check needed
      return;
    }

    // Verify access (verifyAccess logs warning internally on failure)
    const ok = channelManager.verifyAccess(path, pkr);
    if (!ok) {
      // verifyAccess already logs warning, but we throw for security
      throw new Error(
        `KernelProtectedMessaging.sendProtected: caller is not authorized to use channel "${path}".`
      );
    }
  }

  /**
   * Called for *non-response* messages that require a response.
   * Registers the command with ResponseManager.
   * 
   * @param {PKR} pkr - Caller's PKR
   * @param {Message} message - Message to register
   * @param {Object} options - Send options
   */
  registerResponseIfRequired(pkr, message, options) {
    const responseRequired = options.responseRequired;
    if (!responseRequired) {
      return; // No response required
    }

    // v2 format: responseRequired is an object { replyTo, timeout? }
    if (typeof responseRequired !== 'object' || responseRequired === null) {
      if (this.kernel.debug) {
        console.warn(
          'KernelProtectedMessaging.sendProtected: responseRequired must be an object with { replyTo, timeout? }, ' +
          `got: ${typeof responseRequired}. Skipping registration.`
        );
      }
      return; // Non-blocking: continue without registration
    }

    const { replyTo, timeout } = responseRequired;

    if (typeof replyTo !== 'string' || !replyTo.trim()) {
      if (this.kernel.debug) {
        console.warn(
          'KernelProtectedMessaging.sendProtected: responseRequired.replyTo must be a non-empty string. Skipping registration.'
        );
      }
      return; // Non-blocking: continue without registration
    }

    // Get message ID (v2 uses getId() method)
    const messageId = message.getId?.() || message.id;
    if (!messageId) {
      if (this.kernel.debug) {
        console.warn(
          'KernelProtectedMessaging.sendProtected: responseRequired requires message.getId() to return a valid id. Skipping registration.'
        );
      }
      return; // Non-blocking: continue without registration
    }

    const responseManager = this.kernel.getResponseManager();
    if (!responseManager) {
      if (this.kernel.debug) {
        console.warn(
          'KernelProtectedMessaging.sendProtected: responseRequired specified but ResponseManagerSubsystem not found.'
        );
      }
      return; // Non-blocking: continue without registration
    }

    if (typeof responseManager.registerResponseRequiredFor !== 'function') {
      if (this.kernel.debug) {
        console.warn(
          'KernelProtectedMessaging.sendProtected: ResponseManagerSubsystem.registerResponseRequiredFor() not available.'
        );
      }
      return; // Non-blocking: continue without registration
    }

    try {
      responseManager.registerResponseRequiredFor(pkr, message, {
        replyTo,
        timeout
      });
    } catch (err) {
      if (this.kernel.debug) {
        console.warn(`KernelProtectedMessaging.sendProtected: Failed to register response-required command:`, err);
      }
      // Non-blocking: continue with message send even if registration fails
    }
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
   * const result = await messaging.sendProtected(
   *   callerPkr, // Caller's PKR
   *   new Message('canvas://layers/create', { name: 'background' })
   * );
   */
  async sendProtected(pkr, message, options = {}) {
    // Validate kernel has identity
    if (!this.kernel.identity || !this.kernel.identity.pkr) {
      throw new Error('KernelProtectedMessaging.sendProtected: Kernel must have an identity with PKR. Ensure kernel is bootstrapped.');
    }

    // Validate pkr
    if (!pkr) {
      throw new Error('KernelProtectedMessaging.sendProtected: pkr is required');
    }

    // SECURITY: Strip any callerId from user-provided options (prevent spoofing)
    const { callerId, ...sanitizedOptions } = options;
    if (callerId !== undefined && this.kernel.debug) {
      console.warn(`KernelProtectedMessaging ${this.kernel.name}: callerId stripped from sendProtected() options - callerId is set by kernel`);
    }

    // Set callerId and callerIdSetBy in options
    sanitizedOptions.callerId = pkr;
    sanitizedOptions.callerIdSetBy = this.kernel.identity.pkr;

    // Get MessageSystem from context
    const ms = this.kernel.messageSystem;
    if (!ms) {
      throw new Error('KernelProtectedMessaging.sendProtected: MessageSystem (ctx.ms) is required but not found.');
    }

    // Use cached MessageSystem router
    if (!this.msRouter || typeof this.msRouter.route !== 'function') {
      throw new Error('KernelProtectedMessaging.sendProtected: messageSystemRouter facet not set. Call setMsRouter() first.');
    }

    const path = message?.path || message?.getPath?.();

    // Audit log protected send (best-effort)
    if (this.auditLogger) {
      this.auditLogger.log({
        event: 'send_protected',
        caller: pkr?.uuid || pkr,
        path,
        timestamp: Date.now()
      });
    }

    // Handle response messages
    if (sanitizedOptions.isResponse) {
      const responseManager = this.kernel.getResponseManager();
      if (responseManager) {
        const result = responseManager.handleResponse(message);
        if (!result.ok) {
          if (this.kernel.debug) {
            console.warn(`KernelProtectedMessaging.sendProtected: Response handling failed: ${result.reason}`);
          }
          // Continue with message send even if response handling fails
          // (allows responses to be sent even if not tracked)
        }
      } else if (this.kernel.debug) {
        console.warn('KernelProtectedMessaging.sendProtected: isResponse specified but ResponseManagerSubsystem not found');
      }

      // Route response message
      // If one-shot path: route directly (skip channel ACL)
      if (this.isOneShotPath(path)) {
        return await this.msRouter.route(message, sanitizedOptions);
      }

      // Else: enforce channel ACL if channel, then route
      this.enforceChannelAccessIfChannel(pkr, path);
      return await this.msRouter.route(message, sanitizedOptions);
    }

    // Non-response message (command / event / etc)
    // Register response-required if needed (non-blocking)
    this.registerResponseIfRequired(pkr, message, sanitizedOptions);

    // Enforce channel ACL if this is a channel path
    this.enforceChannelAccessIfChannel(pkr, path);

    // Route normally
    return await this.msRouter.route(message, sanitizedOptions);
  }
}

