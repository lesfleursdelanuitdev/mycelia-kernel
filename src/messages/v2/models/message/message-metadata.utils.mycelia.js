/**
 * Message Metadata Utilities
 * 
 * Utilities for building message metadata based on type and options.
 */

import { generateTraceId, inheritTraceId } from '../../utils/trace.utils.mycelia.js';

/**
 * Build fixed and mutable metadata based on message type
 * 
 * @param {string} type - Message type
 * @param {Object} meta - Base metadata
 * @param {Object} options - Type-specific options
 * @param {Function} generateSenderId - Function to generate sender ID
 * @param {Message|Object} [parentMessage] - Parent message for trace ID inheritance
 * @returns {{fixedMeta: Object, mutableMeta: Object}} Fixed and mutable metadata objects
 */
export function buildMessageMetadata(type, meta, options, generateSenderId, parentMessage = null) {
  // Generate or inherit trace ID
  let traceId = meta.traceId;
  if (!traceId && parentMessage) {
    traceId = inheritTraceId(parentMessage);
  }
  if (!traceId) {
    traceId = generateTraceId();
  }
  
  // Base fixed metadata (immutable)
  const baseFixed = {
    timestamp: Date.now(),
    type: type,
    traceId: traceId, // Add trace ID to fixed metadata
    maxRetries: meta.maxRetries || 3,
    isAtomic: false,
    batch: false,
    isQuery: false,
    isCommand: false,
    isError: false,
    transaction: null,
    seq: null,
    senderId: null,
    caller: meta.caller || null
  };

  // Base mutable metadata (editable)
  const baseMutable = {
    retries: 0,
    queryResult: null
  };

  // Extract custom properties from meta that should go into mutable metadata
  // These are properties that are not part of the standard fixed metadata
  const standardFixedKeys = new Set(['id', 'timestamp', 'type', 'traceId', 'maxRetries', 'isAtomic', 'batch', 'isQuery', 'isCommand', 'isError', 'transaction', 'seq', 'senderId', 'caller']);
  const customMutable = {};
  for (const [key, value] of Object.entries(meta || {})) {
    if (!standardFixedKeys.has(key)) {
      customMutable[key] = value;
    }
  }

  // Apply type-specific fixed metadata
  let fixedMeta = { ...baseFixed };

  // Type handlers: functions that modify fixedMeta based on message type
  const typeHandlers = {
    atomic: (fixedMeta) => {
      fixedMeta.isAtomic = true;
    },
    
    batch: (fixedMeta) => {
      fixedMeta.batch = true;
      fixedMeta.isAtomic = false;
    },
    
    query: (fixedMeta) => {
      fixedMeta.isQuery = true;
    },
    
    retry: (fixedMeta, options) => {
      fixedMeta.maxRetries = options.maxRetries || 3;
    },
    
    transaction: (fixedMeta, options, meta) => {
      fixedMeta.transaction = options.transaction;
      fixedMeta.seq = options.seq;
      // If atomic was specified in meta, preserve it for transaction messages
      if (meta.isAtomic) {
        fixedMeta.isAtomic = true;
      }
    },
    
    command: (fixedMeta, options, meta, generateSenderId) => {
      // For command type, always generate a unique senderId
      // Ignore any senderId provided in meta to ensure uniqueness
      fixedMeta.senderId = generateSenderId();
      fixedMeta.isCommand = true;
    },
    
    error: (fixedMeta) => {
      fixedMeta.isError = true;
    },
    
    simple: (fixedMeta, options) => {
      // Auto-detect query paths: subsystem://query/operation
      // Check if path matches query pattern
      if (options.path && typeof options.path === 'string') {
        const queryPattern = /^[^:]+:\/\/query\//;
        if (queryPattern.test(options.path)) {
          fixedMeta.isQuery = true;
        }
      }
    }
  };

  // Get handler for type (default to 'simple')
  const handler = typeHandlers[type] || typeHandlers.simple;
  handler(fixedMeta, options, meta, generateSenderId);

  // Merge custom mutable properties
  const mutableMeta = { ...baseMutable, ...customMutable };

  return { fixedMeta, mutableMeta };
}

