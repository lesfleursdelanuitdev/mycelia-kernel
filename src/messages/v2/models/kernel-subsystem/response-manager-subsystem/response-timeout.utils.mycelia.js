/**
 * Response Timeout Utilities
 * 
 * Handles timeout processing and synthetic timeout response emission.
 */

import { Message } from '../../message/message.mycelia.js';
import { createSubsystemLogger } from '../../../utils/logger.utils.mycelia.js';

/**
 * Handle timeout for a pending response entry
 * 
 * @param {PendingResponse} entry - The pending response entry that timed out
 * @param {ResponseManagerSubsystem} subsystem - The response manager subsystem
 */
export async function handleTimeout(entry, subsystem) {
  // If already resolved by a normal response, skip.
  if (entry.resolved) return;

  entry.timedOut = true;

  const logger = createSubsystemLogger(subsystem);
  logger.warn(
    `Timeout fired for correlationId "${entry.correlationId}". Emitting synthetic timeout response.`
  );

  try {
    await emitTimeoutResponse(entry, subsystem);
  } catch (err) {
    logger.error(
      `Failed to emit timeout response for "${entry.correlationId}":`,
      err
    );

    // NOTE: we intentionally do *not* finalize here; if the synthetic
    // response never gets sent, the entry stays pending. This avoids
    // lying to the kernel about having delivered a timeout.
  }
}

/**
 * Emit a synthetic timeout response via the kernel
 * 
 * @param {PendingResponse} entry - The pending response entry
 * @param {ResponseManagerSubsystem} subsystem - The response manager subsystem
 * @throws {Error} If kernel.sendProtected is not available
 */
async function emitTimeoutResponse(entry, subsystem) {
  // Get the root kernel subsystem
  const kernel = subsystem.getRoot();
  if (!kernel || typeof kernel.sendProtected !== 'function') {
    throw new Error(
      'ResponseTimeoutUtils.emitTimeoutResponse: kernel.sendProtected is not available.'
    );
  }

  const { correlationId, ownerPkr, replyTo, timeoutMs } = entry;

  // Construct a response message addressed to the original replyTo path.
  // v2 Message: new Message(path, body, meta = {})
  // Store correlationId in both body and metadata for reliable access
  const msg = new Message(replyTo, {
    timeout: timeoutMs,
    correlationId,
    reason: 'Command timed out',
    inReplyTo: correlationId  // Also in body for easy access
  }, {
    inReplyTo: correlationId  // In fixed metadata
  });

  // Send as a *response* with success=false and an error payload.
  await kernel.sendProtected(ownerPkr, msg, {
    isResponse: true,
    success: false,
    error: {
      kind: 'timeout',
      message: `Command timed out after ${timeoutMs}ms`,
      timeoutMs
    }
  });
}

