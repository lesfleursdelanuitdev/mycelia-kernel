/**
 * Permission Testing Helpers
 * 
 * Utilities for testing permission checks and access control.
 * These helpers simplify common permission testing patterns.
 */

import { extractError } from './result-assertions.mycelia.js';

/**
 * Assert that an operation is denied (permission error)
 * 
 * @param {Function} fn - Async function to execute
 * @param {Object} [options={}] - Options
 * @param {string|RegExp} [options.errorPattern] - Expected error pattern
 * @param {string} [options.message] - Custom error message
 * @returns {Promise<void>}
 * @throws {Error} If operation succeeds or error doesn't match pattern
 * 
 * @example
 * await expectPermissionDenied(
 *   () => processMessageImmediately(kernel, studentPkr, message),
 *   { errorPattern: /Permission denied|scope/ }
 * );
 */
export async function expectPermissionDenied(fn, options = {}) {
  const {
    errorPattern = /Permission denied|Access denied|Not authorized|scope|Forbidden/i,
    message = 'Expected operation to be denied'
  } = options;
  
  try {
    const result = await fn();
    
    // If it didn't throw, check if result indicates failure
    if (result && result.success === false) {
      const errorMsg = extractError(result);
      if (errorPattern && !errorPattern.test(errorMsg || '')) {
        throw new Error(`${message}: operation failed but error "${errorMsg}" doesn't match pattern ${errorPattern}`);
      }
      return; // Successfully denied
    }
    
    // If we got here, operation succeeded when it shouldn't have
    throw new Error(`${message}: operation succeeded but expected permission denial`);
  } catch (error) {
    // Check if error matches pattern
    const errorMsg = error.message || String(error);
    if (errorPattern && !errorPattern.test(errorMsg)) {
      throw new Error(`${message}: got error "${errorMsg}" but expected pattern ${errorPattern}`);
    }
    // Error matches pattern, test passes
  }
}

/**
 * Assert that an operation is granted (succeeds)
 * 
 * @param {Function} fn - Async function to execute
 * @param {Object} [options={}] - Options
 * @param {string} [options.message] - Custom error message
 * @returns {Promise<any>} Result of the operation
 * @throws {Error} If operation fails
 * 
 * @example
 * const result = await expectAccessGranted(
 *   () => processMessageImmediately(kernel, userPkr, message)
 * );
 */
export async function expectAccessGranted(fn, options = {}) {
  const {
    message = 'Expected operation to be granted'
  } = options;
  
  try {
    const result = await fn();
    
    if (result && result.success === false) {
      const errorMsg = extractError(result);
      throw new Error(`${message}: operation failed with "${errorMsg}"`);
    }
    
    return result;
  } catch (error) {
    if (error.message && error.message.includes(message)) {
      throw error; // Re-throw our custom error
    }
    throw new Error(`${message}: operation threw error: ${error.message || error}`);
  }
}

/**
 * Assert that a specific scope is required
 * 
 * @param {string} scope - Expected scope name
 * @param {Function} fn - Async function to execute
 * @param {Object} [options={}] - Options
 * @returns {Promise<void>}
 * @throws {Error} If operation succeeds or wrong scope error
 * 
 * @example
 * await expectScopeRequired(
 *   'workspace:create',
 *   () => processMessageImmediately(kernel, studentPkr, message)
 * );
 */
export async function expectScopeRequired(scope, fn, options = {}) {
  const {
    message = `Expected scope "${scope}" to be required`
  } = options;
  
  const scopePattern = new RegExp(scope.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  
  await expectPermissionDenied(fn, {
    errorPattern: scopePattern,
    message
  });
}


