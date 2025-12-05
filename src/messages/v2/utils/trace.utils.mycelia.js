/**
 * Trace Utilities
 * 
 * Utilities for generating and managing trace IDs for distributed tracing.
 * Trace IDs enable end-to-end request tracking across subsystems.
 */

/**
 * Generate a unique trace ID
 * 
 * Uses UUID v4 format if available, otherwise falls back to a timestamp-based format.
 * 
 * @returns {string} Trace ID (UUID v4 format or timestamp-based)
 * 
 * @example
 * const traceId = generateTraceId();
 * console.log(traceId); // "550e8400-e29b-41d4-a716-446655440000"
 */
export function generateTraceId() {
  // Use crypto.randomUUID if available (Node.js 16.7+, modern browsers)
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  
  // Fallback: Generate UUID v4 manually
  return generateUUIDv4();
}

/**
 * Generate a UUID v4 manually (fallback for environments without crypto.randomUUID)
 * 
 * @returns {string} UUID v4 string
 * @private
 */
function generateUUIDv4() {
  // Generate random hex values
  const hex = '0123456789abcdef';
  const randomHex = (length) => {
    let result = '';
    for (let i = 0; i < length; i++) {
      result += hex[Math.floor(Math.random() * 16)];
    }
    return result;
  };
  
  // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
  // where x is any hexadecimal digit and y is one of 8, 9, a, or b
  return [
    randomHex(8),
    randomHex(4),
    '4' + randomHex(3), // Version 4
    ((Math.floor(Math.random() * 4) + 8).toString(16) + randomHex(3)), // Variant bits
    randomHex(12)
  ].join('-');
}

/**
 * Inherit trace ID from a parent message
 * 
 * Extracts the trace ID from a parent message's metadata.
 * This allows child messages to share the same trace ID for distributed tracing.
 * 
 * @param {Message|Object} parentMessage - Parent message to extract trace ID from
 * @returns {string|null} Trace ID or null if not found
 * 
 * @example
 * // Inherit trace ID from parent message
 * const parentTraceId = inheritTraceId(parentMessage);
 * const childMessage = new Message('child://path', {}, {
 *   meta: { traceId: parentTraceId || generateTraceId() }
 * });
 */
export function inheritTraceId(parentMessage) {
  if (!parentMessage) return null;
  
  // Try to get trace ID from message metadata
  if (parentMessage.getMeta && typeof parentMessage.getMeta === 'function') {
    const meta = parentMessage.getMeta();
    if (meta && typeof meta.getCustomField === 'function') {
      const traceId = meta.getCustomField('traceId');
      if (traceId) return String(traceId);
    }
    // Also try getFixedField if it exists
    if (meta && typeof meta.getFixedField === 'function') {
      const traceId = meta.getFixedField('traceId');
      if (traceId) return String(traceId);
    }
  }
  
  // Fallback: try direct metadata access
  if (parentMessage.meta) {
    const meta = parentMessage.meta;
    if (meta.getCustomField && typeof meta.getCustomField === 'function') {
      const traceId = meta.getCustomField('traceId');
      if (traceId) return String(traceId);
    }
  }
  
  return null;
}

/**
 * Extract trace ID from HTTP headers
 * 
 * Supports multiple trace ID header formats:
 * - X-Trace-Id (custom)
 * - traceparent (W3C Trace Context)
 * 
 * @param {Object} headers - HTTP headers object
 * @param {string} [headerName='X-Trace-Id'] - Custom header name to check
 * @returns {string|null} Trace ID or null if not found
 * 
 * @example
 * // Extract from custom header
 * const traceId = extractTraceIdFromHeaders(req.headers);
 * 
 * @example
 * // Extract from W3C traceparent
 * const traceId = extractTraceIdFromHeaders(req.headers, 'traceparent');
 */
export function extractTraceIdFromHeaders(headers, headerName = 'X-Trace-Id') {
  if (!headers || typeof headers !== 'object') return null;
  
  // Try custom header first
  const customHeader = headers[headerName] || headers[headerName.toLowerCase()];
  if (customHeader) {
    return String(customHeader);
  }
  
  // Try W3C Trace Context format (traceparent)
  const traceparent = headers['traceparent'] || headers['Traceparent'];
  if (traceparent) {
    // traceparent format: version-trace-id-parent-id-flags
    // Example: 00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01
    const parts = String(traceparent).split('-');
    if (parts.length >= 2) {
      return parts[1]; // Return trace-id part
    }
  }
  
  return null;
}

/**
 * Inject trace ID into HTTP headers
 * 
 * Adds trace ID to HTTP headers for propagation to downstream services.
 * 
 * @param {Object} headers - HTTP headers object (will be modified)
 * @param {string} traceId - Trace ID to inject
 * @param {string} [headerName='X-Trace-Id'] - Header name to use
 * @returns {Object} Modified headers object
 * 
 * @example
 * // Inject trace ID into response headers
 * const headers = {};
 * injectTraceIdIntoHeaders(headers, traceId);
 * res.setHeader('X-Trace-Id', headers['X-Trace-Id']);
 */
export function injectTraceIdIntoHeaders(headers, traceId, headerName = 'X-Trace-Id') {
  if (!headers || typeof headers !== 'object') {
    throw new Error('headers must be an object');
  }
  if (!traceId || typeof traceId !== 'string') {
    throw new Error('traceId must be a non-empty string');
  }
  
  headers[headerName] = traceId;
  return headers;
}




