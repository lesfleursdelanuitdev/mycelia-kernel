/**
 * Structured Logger Utilities
 * 
 * Provides structured logging with JSON output format for better observability.
 * Supports trace IDs, correlation IDs, and other contextual information.
 */

/**
 * Create a structured logger that outputs JSON logs
 * 
 * @param {Object} config - Logger configuration
 * @param {string} [config.level='INFO'] - Log level (DEBUG, INFO, WARN, ERROR)
 * @param {string} [config.subsystem=''] - Subsystem name
 * @param {string} [config.traceId=null] - Trace ID for distributed tracing
 * @param {string} [config.correlationId=null] - Correlation ID for request/response tracking
 * @param {string} [config.outputFormat='json'] - Output format ('json' or 'text')
 * @param {boolean} [config.debug=false] - Enable debug logging (overrides level)
 * @returns {Object} Structured logger object
 * 
 * @example
 * ```javascript
 * const logger = createStructuredLogger({
 *   level: 'INFO',
 *   subsystem: 'my-subsystem',
 *   traceId: '550e8400-e29b-41d4-a716-446655440000'
 * });
 * logger.info('Message processed', { messageId: 'msg-123' });
 * // Output: {"timestamp":"2024-01-01T12:00:00.000Z","level":"INFO","subsystem":"my-subsystem","traceId":"550e8400-e29b-41d4-a716-446655440000","message":"Message processed","metadata":{"messageId":"msg-123"}}
 * ```
 */
export function createStructuredLogger(config = {}) {
  const {
    level = 'INFO',
    subsystem = '',
    traceId = null,
    correlationId = null,
    outputFormat = 'json',
    debug = false
  } = config;

  // Determine effective log level
  const effectiveLevel = debug ? 'DEBUG' : level;
  const levelPriority = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 };
  const currentPriority = levelPriority[effectiveLevel] || 1;

  function shouldLog(logLevel) {
    const logPriority = levelPriority[logLevel] || 1;
    return logPriority >= currentPriority;
  }

  function log(logLevel, message, metadata = {}) {
    if (!shouldLog(logLevel)) {
      return;
    }

    const logEntry = {
      timestamp: new Date().toISOString(),
      level: logLevel,
      subsystem: subsystem || undefined,
      traceId: traceId || undefined,
      correlationId: correlationId || undefined,
      message: typeof message === 'string' ? message : String(message),
      ...(Object.keys(metadata).length > 0 ? { metadata } : {})
    };

    // Remove undefined values
    Object.keys(logEntry).forEach(key => {
      if (logEntry[key] === undefined) {
        delete logEntry[key];
      }
    });

    if (outputFormat === 'json') {
      console.log(JSON.stringify(logEntry));
    } else {
      // Text format for backward compatibility
      const parts = [
        `[${logLevel}]`,
        subsystem ? `[${subsystem}]` : '',
        traceId ? `[trace:${traceId.substring(0, 8)}]` : '',
        correlationId ? `[corr:${correlationId.substring(0, 8)}]` : '',
        message
      ].filter(Boolean);
      console.log(parts.join(' '), metadata && Object.keys(metadata).length > 0 ? metadata : '');
    }
  }

  return {
    /**
     * Log a debug message
     * @param {string} message - Log message
     * @param {Object} [metadata={}] - Additional metadata
     */
    debug(message, metadata = {}) {
      log('DEBUG', message, metadata);
    },

    /**
     * Log an info message
     * @param {string} message - Log message
     * @param {Object} [metadata={}] - Additional metadata
     */
    info(message, metadata = {}) {
      log('INFO', message, metadata);
    },

    /**
     * Log a warning message
     * @param {string} message - Log message
     * @param {Object} [metadata={}] - Additional metadata
     */
    warn(message, metadata = {}) {
      log('WARN', message, metadata);
    },

    /**
     * Log an error message
     * @param {string} message - Log message
     * @param {Object} [metadata={}] - Additional metadata (error object, stack trace, etc.)
     */
    error(message, metadata = {}) {
      log('ERROR', message, metadata);
    },

    /**
     * Create a child logger with additional context
     * @param {Object} additionalContext - Additional context to add to all logs
     * @returns {Object} New structured logger with merged context
     */
    child(additionalContext = {}) {
      return createStructuredLogger({
        level: effectiveLevel,
        subsystem: additionalContext.subsystem || subsystem,
        traceId: additionalContext.traceId || traceId,
        correlationId: additionalContext.correlationId || correlationId,
        outputFormat,
        debug
      });
    }
  };
}

/**
 * Create a structured logger from a message context
 * 
 * Extracts trace ID, correlation ID, and subsystem information from a message
 * to create a contextual logger.
 * 
 * @param {Message|Object} message - Message to extract context from
 * @param {string} [subsystem=''] - Subsystem name
 * @param {Object} [config={}] - Additional logger configuration
 * @returns {Object} Structured logger object
 * 
 * @example
 * ```javascript
 * const logger = createStructuredLoggerFromMessage(message, 'my-subsystem');
 * logger.info('Processing message', { path: message.getPath() });
 * ```
 */
export function createStructuredLoggerFromMessage(message, subsystem = '', config = {}) {
  let traceId = null;
  let correlationId = null;

  if (message) {
    // Extract trace ID from message metadata
    if (message.getMeta && typeof message.getMeta === 'function') {
      const meta = message.getMeta();
      if (meta) {
        traceId = meta.getTraceId?.() || meta.getFixedField?.('traceId') || meta.getCustomField?.('traceId');
        correlationId = meta.getCustomField?.('correlationId') || meta.getCustomMutableField?.('correlationId');
      }
    } else if (message.meta) {
      const meta = message.meta;
      traceId = meta.getTraceId?.() || meta.getFixedField?.('traceId') || meta.getCustomField?.('traceId');
      correlationId = meta.getCustomField?.('correlationId') || meta.getCustomMutableField?.('correlationId');
    }

    // Fallback: try to get correlation ID from message body
    if (!correlationId && message.getBody && typeof message.getBody === 'function') {
      const body = message.getBody();
      if (body && typeof body === 'object') {
        correlationId = body.correlationId || body.inReplyTo;
      }
    }
  }

  return createStructuredLogger({
    subsystem,
    traceId,
    correlationId,
    ...config
  });
}




