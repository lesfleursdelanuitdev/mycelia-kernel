/**
 * Result Utility
 * 
 * A simple utility for creating standardized result objects for success and failure cases.
 * Provides a consistent API for returning operation results throughout the system.
 * 
 * @example
 * // Success result
 * const result = Result.ok({ id: 123, name: 'test' });
 * // { success: true, data: { id: 123, name: 'test' } }
 * 
 * @example
 * // Failure result
 * const error = Result.fail('validation_error', 'Invalid input', { field: 'email' });
 * // { success: false, type: 'validation_error', message: 'Invalid input', details: { field: 'email' } }
 * 
 * @example
 * // Success with no data
 * const empty = Result.ok();
 * // { success: true, data: null }
 */
export const Result = Object.freeze({
  /**
   * Create a success result
   * 
   * @param {any} [data=null] - Optional data to include in the result
   * @returns {Object} Result object with success: true and data
   * 
   * @example
   * const result = Result.ok({ value: 42 });
   * // { success: true, data: { value: 42 } }
   */
  ok: (data = null) => ({ success: true, data }),

  /**
   * Create a failure result
   * 
   * @param {string} type - Error type/category
   * @param {string} message - Error message
   * @param {Object} [details={}] - Additional error details
   * @returns {Object} Result object with success: false, type, message, and details
   * 
   * @example
   * const error = Result.fail('not_found', 'Resource not found', { id: 123 });
   * // { success: false, type: 'not_found', message: 'Resource not found', details: { id: 123 } }
   */
  fail: (type, message, details = {}) => ({
    success: false,
    type,
    message,
    details,
  }),
});

