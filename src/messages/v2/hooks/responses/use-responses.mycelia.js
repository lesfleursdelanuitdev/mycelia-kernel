/**
 * useResponses Hook
 * 
 * Helper hook for sending responses in a consistent way.
 *
 * A "response" in this model is:
 * - just a normal message
 * - sent with options.isResponse = true
 * - optionally options.success / options.error
 * - correlated via meta.inReplyTo / meta.correlationId
 *
 * This hook does NOT guess the replyTo path. Callers must:
 * - either pass an explicit replyPath
 * - or use a configured default (e.g., from ctx.config.responses)
 * - or rely on ResponseManagerSubsystem lookup (if responseRequired was used)
 *
 * It assumes:
 * - subsystem.identity.sendProtected(message, options) exists
 * - subsystem has a 'messages' facet for message creation
 */
import { Facet } from 'mycelia-kernel-plugin/core';
import { createHook } from '../create-hook.mycelia.js';
import { createSubsystemLogger } from '../../utils/logger.utils.mycelia.js';

export const useResponses = createHook({
  kind: 'responses',
  version: '1.0.0',
  overwrite: false,
  required: ['messages'], // we rely on MessageFactory via messages facet
  attach: true,
  source: import.meta.url,
  fn: (ctx, api, subsystem) => {
    const messagesFacet = subsystem.find('messages');
    if (!messagesFacet) {
      throw new Error('useResponses: messages facet is required.');
    }

    // Identity may not be set up yet during bootstrap (e.g., for KernelSubsystem)
    // We'll check it lazily when the facet methods are actually called
    const identity = subsystem.identity;
    const hasIdentity = identity && typeof identity.sendProtected === 'function';
    
    if (!hasIdentity) {
      // During verification, we allow missing identity (it will be set up later)
      // But we'll validate it when facet methods are actually used
    }

    const config = ctx.config?.responses || {};
    const logger = createSubsystemLogger(subsystem);

    /**
     * Base helper that actually creates and sends the response.
     *
     * @param {Object} params
     * @param {string} params.path - Target path (channel or one-shot reply route)
     * @param {string} params.inReplyTo - Correlation id (usually originalMessage.id)
     * @param {any} params.payload - Response payload
     * @param {boolean} [params.success] - Whether this is a success response
     * @param {any} [params.error] - Error payload (for failure / timeout)
     * @param {Object} [params.options] - Extra sendProtected options
     */
    async function sendResponseBase({
      path,
      inReplyTo,
      payload,
      success = true,
      error = undefined,
      options = {}
    }) {
      if (typeof path !== 'string' || !path.trim()) {
        throw new Error('responses.sendResponse: path must be a non-empty string.');
      }
      if (!inReplyTo) {
        throw new Error('responses.sendResponse: inReplyTo (correlation id) is required.');
      }

      // Create message using messages facet
      // v2: messagesFacet.create(path, body, options)
      // Add inReplyTo to metadata during creation (goes to fixed metadata)
      const msg = messagesFacet.create(path, payload, {
        meta: {
          inReplyTo: String(inReplyTo),
          correlationId: String(inReplyTo)  // Also store as correlationId for compatibility
        }
      });

      // Also store in body for easier access
      if (msg.body && typeof msg.body === 'object') {
        msg.body.inReplyTo = String(inReplyTo);
        msg.body.correlationId = String(inReplyTo);
      }

      // OPTIMIZATION: Set processImmediately for one-shot responses
      // One-shot reply paths follow pattern: "subsystem://request/oneShot/{id}"
      // This bypasses the scheduler for faster response delivery
      if (path.includes('/request/oneShot/') && msg.meta && typeof msg.meta.updateMutable === 'function') {
        msg.meta.updateMutable({ processImmediately: true });
      }

      // Check identity lazily when actually sending
      const currentIdentity = subsystem.identity;
      if (!currentIdentity || typeof currentIdentity.sendProtected !== 'function') {
        throw new Error(
          'responses.sendResponse: subsystem.identity.sendProtected() is required. Make sure the subsystem is wired via AccessControl.'
        );
      }

      // Send via identity → kernel → ResponseManager
      return currentIdentity.sendProtected(msg, {
        ...options,
        isResponse: true,
        success,
        error
      });
    }

    /**
     * Derive a correlationId from an original request message.
     * By default, we use message.id, but we fall back on other fields
     * if needed for compatibility with older patterns.
     * 
     * @param {Message} originalMessage - Original request message
     * @returns {string|null} Correlation ID or null if not found
     */
    function deriveCorrelationId(originalMessage) {
      if (!originalMessage) return null;

      // Try message ID first (most reliable)
      if (originalMessage.getId && typeof originalMessage.getId === 'function') {
        const id = originalMessage.getId();
        if (id) return String(id);
      }

      // Fallback to direct id property
      if (originalMessage.id) return String(originalMessage.id);

      // Try metadata (v2 MessageMetadata)
      const meta = originalMessage.meta;
      if (meta) {
        // Try custom field accessors
        if (typeof meta.getCustomField === 'function') {
          const correlationId = meta.getCustomField('correlationId');
          if (correlationId) return String(correlationId);
        }
      }

      // Try message body
      if (originalMessage.body && typeof originalMessage.body === 'object') {
        if (originalMessage.body.correlationId) {
          return String(originalMessage.body.correlationId);
        }
      }

      // Legacy fallback
      if (originalMessage.correlationId) {
        return String(originalMessage.correlationId);
      }

      return null;
    }

    /**
     * Derive a default reply path, if any.
     *
     * Priority order:
     * 1. Explicit replyPath parameter (not handled here - passed to replyTo())
     * 2. ResponseManagerSubsystem lookup (from options.responseRequired.replyTo)
     * 3. Message metadata (fixed or mutable)
     * 4. Message body
     * 5. Configuration default
     *
     * @param {Message} originalMessage - Original request message
     * @param {BaseSubsystem} subsystem - Subsystem instance
     * @returns {string|null} Reply path or null if not found
     */
    function deriveReplyPath(originalMessage, subsystem) {
      // Priority 2: Query ResponseManagerSubsystem for stored replyTo (Option D - PRIMARY)
      const correlationId = deriveCorrelationId(originalMessage);
      if (correlationId) {
        // Get kernel (root subsystem)
        const kernel = subsystem.getRoot?.();
        if (kernel && typeof kernel.getResponseManager === 'function') {
          const responseManager = kernel.getResponseManager();
          if (responseManager && typeof responseManager.getReplyTo === 'function') {
            const replyTo = responseManager.getReplyTo(correlationId);
            if (replyTo) {
              return replyTo;
            }
          }
        }
      }

      // Priority 3: Check message metadata (Option B - SECONDARY)
      const meta = originalMessage?.meta;
      if (meta) {
        // Check fixed metadata first (if replyTo was set during message creation)
        if (typeof meta.getCustomField === 'function') {
          const replyTo = meta.getCustomField('replyTo');
          if (replyTo) return replyTo;
          const replyPath = meta.getCustomField('replyPath');
          if (replyPath) return replyPath;
        }

        // Check mutable metadata (if replyPath was stored by request-core or similar)
        if (typeof meta.getCustomMutableField === 'function') {
          const replyPath = meta.getCustomMutableField('replyPath');
          if (replyPath) return replyPath;
          const replyTo = meta.getCustomMutableField('replyTo');
          if (replyTo) return replyTo;
        }
      }

      // Priority 4: Check message body (fallback)
      if (originalMessage?.body && typeof originalMessage.body === 'object') {
        if (originalMessage.body.replyTo) return originalMessage.body.replyTo;
        if (originalMessage.body.replyPath) return originalMessage.body.replyPath;
      }

      // Priority 5: Configuration-level default (lowest priority)
      if (typeof config.defaultReplyPath === 'string') {
        return config.defaultReplyPath;
      }

      return null;
    }

    /**
     * Public: send a generic response.
     *
     * @param {Object} params - Response parameters
     * @param {string} params.path - Target path (channel or one-shot reply route)
     * @param {string} params.inReplyTo - Correlation id (usually originalMessage.id)
     * @param {any} params.payload - Response payload
     * @param {boolean} [params.success=true] - Whether this is a success response
     * @param {any} [params.error] - Error payload (for failure / timeout)
     * @param {Object} [params.options={}] - Extra sendProtected options
     * @returns {Promise<Object>} Send result
     * 
     * @example
     * await responses.sendResponse({
     *   path: 'canvas://channel/replies',
     *   inReplyTo: originalMessage.getId(),
     *   payload: { result: 'success' },
     *   success: true
     * });
     */
    async function sendResponse(params) {
      return sendResponseBase(params);
    }

    /**
     * Public: reply to a specific request message with success=true.
     *
     * @param {Message} originalMessage - Original request message
     * @param {any} payload - Response payload
     * @param {Object} [options={}] - Reply options
     * @param {string} [options.replyPath] - Explicit reply path (overrides all other sources)
     * @param {Object} [options.options] - Extra sendProtected options
     * @returns {Promise<Object>} Send result
     * @throws {Error} If originalMessage is missing, correlationId cannot be derived, or replyPath cannot be determined
     * 
     * @example
     * await responses.replyTo(originalMessage, { data: 'result' });
     * 
     * @example
     * // With explicit reply path
     * await responses.replyTo(originalMessage, { data: 'result' }, {
     *   replyPath: 'custom://reply/path'
     * });
     */
    async function replyTo(originalMessage, payload, { replyPath, options } = {}) {
      if (!originalMessage) {
        throw new Error('responses.replyTo: originalMessage is required.');
      }

      const inReplyTo = deriveCorrelationId(originalMessage);
      if (!inReplyTo) {
        throw new Error(
          'responses.replyTo: unable to derive correlationId from originalMessage. ' +
          'Make sure message.id (or meta.correlationId) is set.'
        );
      }

      const path =
        replyPath ||
        deriveReplyPath(originalMessage, subsystem);

      if (!path) {
        throw new Error(
          'responses.replyTo: replyPath is required and could not be inferred. ' +
          'Pass replyPath explicitly, send request with responseRequired: { replyTo }, ' +
          'or set replyTo/replyPath in message metadata or body.'
        );
      }

      return sendResponseBase({
        path,
        inReplyTo,
        payload,
        success: true,
        error: undefined,
        options
      });
    }

    /**
     * Public: reply with an error (success=false).
     *
     * @param {Message} originalMessage - Original request message
     * @param {any} errorPayload - Error payload
     * @param {Object} [options={}] - Reply options
     * @param {string} [options.replyPath] - Explicit reply path (overrides all other sources)
     * @param {Object} [options.options] - Extra sendProtected options
     * @returns {Promise<Object>} Send result
     * @throws {Error} If originalMessage is missing, correlationId cannot be derived, or replyPath cannot be determined
     * 
     * @example
     * await responses.replyErrorTo(originalMessage, {
     *   code: 'VALIDATION',
     *   message: 'Invalid input'
     * });
     */
    async function replyErrorTo(originalMessage, errorPayload, { replyPath, options } = {}) {
      if (!originalMessage) {
        throw new Error('responses.replyErrorTo: originalMessage is required.');
      }

      const inReplyTo = deriveCorrelationId(originalMessage);
      if (!inReplyTo) {
        throw new Error(
          'responses.replyErrorTo: unable to derive correlationId from originalMessage.'
        );
      }

      const path =
        replyPath ||
        deriveReplyPath(originalMessage, subsystem);

      if (!path) {
        throw new Error(
          'responses.replyErrorTo: replyPath is required and could not be inferred.'
        );
      }

      return sendResponseBase({
        path,
        inReplyTo,
        payload: undefined, // or you can echo some partial payload
        success: false,
        error: errorPayload,
        options
      });
    }

    return new Facet('responses', {
      attach: true,
      source: import.meta.url
    })
      .add({
        sendResponse,
        replyTo,
        replyErrorTo,
        deriveCorrelationId,
        deriveReplyPath
      });
  }
});
