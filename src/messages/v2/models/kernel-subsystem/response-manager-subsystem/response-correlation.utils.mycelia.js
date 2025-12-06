/**
 * Response Correlation Utilities
 * 
 * Handles correlation ID extraction from messages for response tracking.
 */

/**
 * Derive correlation ID from a message
 * 
 * @param {Message} message - Message to extract correlation ID from
 * @returns {string|null} Correlation ID or null if not found
 */
export function deriveCorrelationIdFromMessage(message) {
  if (!message) return null;

  // Try message body first (most reliable for custom fields)
  if (message.body && typeof message.body === 'object') {
    if (message.body.inReplyTo) return String(message.body.inReplyTo);
    if (message.body.correlationId) return String(message.body.correlationId);
  }

  // Try direct message properties (for backward compatibility)
  if (message.inReplyTo) return String(message.inReplyTo);
  if (message.correlationId) return String(message.correlationId);

  // Try metadata (MessageMetadata doesn't expose #fixed directly,
  // but custom fields in meta parameter during construction go into fixed metadata)
  // Since we can't access #fixed directly, we rely on body and direct properties above
  const meta = message.meta;
  if (meta) {
    // Try metadata getter methods if they exist
    if (typeof meta.get === 'function') {
      const inReplyTo = meta.get('inReplyTo');
      if (inReplyTo) return String(inReplyTo);
      const correlationId = meta.get('correlationId');
      if (correlationId) return String(correlationId);
    }
  }

  return null;
}





