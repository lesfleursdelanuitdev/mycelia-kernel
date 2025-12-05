import { randomUUID } from '../../security/security.utils.mycelia.js';

/**
 * ERROR_TYPES
 * 
 * Constants for error type identifiers.
 * These constants should be used instead of string literals throughout the system
 * to ensure type safety and prevent typos.
 */
export const ERROR_TYPES = Object.freeze({
  UNROUTABLE: 'unroutable', // Message had no matching route
  MAX_RETRIES: 'maxretries', // Message exceeded max retry count
  TIMEOUT: 'timeout', // Operation took too long
  AUTH_FAILED: 'auth_failed', // Authorization or identity failure
  VALIDATION: 'validation', // Schema or payload validation error
  INTERNAL: 'internal', // Internal system or kernel error
  EXTERNAL: 'external', // External service or transport failure
  SIMPLE: 'simple' // Generic catch-all error
});

/**
 * ERROR_SEVERITY
 * 
 * Constants for error severity levels.
 * These constants should be used instead of string literals throughout the system
 * to ensure type safety and prevent typos.
 */
export const ERROR_SEVERITY = Object.freeze({
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error',
  CRITICAL: 'critical'
});

/**
 * ErrorRecord
 * -----------
 * Represents a single error record with metadata.
 * 
 * @param {Object} [params={}] - Error record parameters
 * @param {string} [params.id] - Unique identifier (auto-generated if not provided)
 * @param {string} params.type - Error type (should use ERROR_TYPES constants)
 * @param {string} params.severity - Error severity level (should use ERROR_SEVERITY constants)
 * @param {string} params.subsystem - Subsystem name where error occurred
 * @param {Date} [params.timestamp] - Error timestamp (defaults to now)
 * @param {Object} [params.metadata={}] - Additional error metadata
 */
export class ErrorRecord {
  constructor(params = {}) {
    const {
      id,
      type,
      severity,
      subsystem,
      timestamp,
      metadata = {}
    } = params;

    if (!type || typeof type !== 'string') {
      throw new TypeError('ErrorRecord: type must be a non-empty string');
    }
    if (!severity || typeof severity !== 'string') {
      throw new TypeError('ErrorRecord: severity must be a non-empty string');
    }
    if (!subsystem || typeof subsystem !== 'string') {
      throw new TypeError('ErrorRecord: subsystem must be a non-empty string');
    }

    this.id = id || randomUUID();
    this.type = type;
    this.severity = severity;
    this.subsystem = subsystem;
    this.timestamp = timestamp instanceof Date ? timestamp : new Date();
    this.metadata = metadata;
  }

  /**
   * Convert error record to a plain object
   * @returns {Object} Plain object representation of the error record
   */
  toRecord() {
    return {
      id: this.id,
      type: this.type,
      severity: this.severity,
      subsystem: this.subsystem,
      timestamp: this.timestamp.toISOString(),
      metadata: this.metadata
    };
  }
}

