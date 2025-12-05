/**
 * Logger Utilities
 * 
 * Provides a simple logger abstraction for improved testability and consistency.
 * Supports both traditional text logging and structured JSON logging.
 */

import { createStructuredLogger, createStructuredLoggerFromMessage } from './structured-logger.utils.mycelia.js';

/**
 * Simple logger that conditionally logs based on debug flag.
 * 
 * @param {boolean} debug - Whether debug logging is enabled
 * @param {string} prefix - Optional prefix for log messages (e.g., subsystem name)
 * @param {Object} [context={}] - Additional context (traceId, correlationId, structured, etc.)
 * @returns {Object} Logger object with log, error, warn methods
 * 
 * @example
 * ```javascript
 * const logger = createLogger(debug, subsystem.name);
 * logger.log('System initialized');
 * logger.error('Failed to initialize', error);
 * logger.warn('Deprecated feature used');
 * ```
 * 
 * @example
 * ```javascript
 * // Structured logging with trace ID
 * const logger = createLogger(debug, 'my-subsystem', {
 *   traceId: '550e8400-e29b-41d4-a716-446655440000',
 *   structured: true
 * });
 * logger.log('Message processed', { messageId: 'msg-123' });
 * ```
 */
export function createLogger(debug = false, prefix = '', context = {}) {
  const { structured = false, traceId = null, correlationId = null, message = null } = context;
  
  // Use structured logger if requested
  if (structured) {
    const structuredLogger = createStructuredLogger({
      level: debug ? 'DEBUG' : 'INFO',
      subsystem: prefix,
      traceId: traceId || (message ? extractTraceIdFromMessage(message) : null),
      correlationId: correlationId || (message ? extractCorrelationIdFromMessage(message) : null),
      outputFormat: 'json',
      debug
    });
    
    return {
      log(...args) {
        if (debug || structuredLogger) {
          const [msg, ...rest] = args;
          const metadata = rest.length > 0 ? (typeof rest[0] === 'object' ? rest[0] : { data: rest }) : {};
          structuredLogger.info(typeof msg === 'string' ? msg : String(msg), metadata);
        }
      },
      error(...args) {
        const [msg, ...rest] = args;
        const metadata = rest.length > 0 ? (typeof rest[0] === 'object' ? rest[0] : { error: rest[0] }) : {};
        structuredLogger.error(typeof msg === 'string' ? msg : String(msg), metadata);
      },
      warn(...args) {
        if (debug || structuredLogger) {
          const [msg, ...rest] = args;
          const metadata = rest.length > 0 ? (typeof rest[0] === 'object' ? rest[0] : { data: rest }) : {};
          structuredLogger.warn(typeof msg === 'string' ? msg : String(msg), metadata);
        }
      },
      isDebugEnabled() {
        return debug;
      }
    };
  }
  
  // Traditional text-based logger (backward compatible)
  const prefixStr = prefix ? `[${prefix}] ` : '';
  
  return {
    /**
     * Log an info message (only if debug is enabled)
     * @param {...any} args - Arguments to log
     */
    log(...args) {
      if (debug) {
        console.log(prefixStr, ...args);
      }
    },
    
    /**
     * Log an error message (always logged, but with prefix only if debug is enabled)
     * @param {...any} args - Arguments to log
     */
    error(...args) {
      if (debug) {
        console.error(prefixStr, ...args);
      } else {
        // Still log errors even if debug is off, but without prefix
        console.error(...args);
      }
    },
    
    /**
     * Log a warning message (only if debug is enabled)
     * @param {...any} args - Arguments to log
     */
    warn(...args) {
      if (debug) {
        console.warn(prefixStr, ...args);
      }
    },
    
    /**
     * Check if debug logging is enabled
     * @returns {boolean} True if debug is enabled
     */
    isDebugEnabled() {
      return debug;
    }
  };
}

/**
 * Extract trace ID from a message
 * @param {Message|Object} message - Message to extract trace ID from
 * @returns {string|null} Trace ID or null
 * @private
 */
function extractTraceIdFromMessage(message) {
  if (!message) return null;
  
  if (message.getMeta && typeof message.getMeta === 'function') {
    const meta = message.getMeta();
    if (meta) {
      return meta.getTraceId?.() || meta.getFixedField?.('traceId') || meta.getCustomField?.('traceId');
    }
  } else if (message.meta) {
    const meta = message.meta;
    return meta.getTraceId?.() || meta.getFixedField?.('traceId') || meta.getCustomField?.('traceId');
  }
  
  return null;
}

/**
 * Extract correlation ID from a message
 * @param {Message|Object} message - Message to extract correlation ID from
 * @returns {string|null} Correlation ID or null
 * @private
 */
function extractCorrelationIdFromMessage(message) {
  if (!message) return null;
  
  if (message.getMeta && typeof message.getMeta === 'function') {
    const meta = message.getMeta();
    if (meta) {
      return meta.getCustomField?.('correlationId') || meta.getCustomMutableField?.('correlationId');
    }
  } else if (message.meta) {
    const meta = message.meta;
    return meta.getCustomField?.('correlationId') || meta.getCustomMutableField?.('correlationId');
  }
  
  // Fallback: try message body
  if (message.getBody && typeof message.getBody === 'function') {
    const body = message.getBody();
    if (body && typeof body === 'object') {
      return body.correlationId || body.inReplyTo;
    }
  }
  
  return null;
}

/**
 * Create a logger for a subsystem
 * 
 * @param {BaseSubsystem} subsystem - Subsystem instance
 * @returns {Object} Logger object
 * 
 * @example
 * ```javascript
 * const logger = createSubsystemLogger(subsystem);
 * logger.log('Built successfully');
 * ```
 */
export function createSubsystemLogger(subsystem) {
  return createLogger(subsystem?.debug || false, subsystem?.name || '');
}

