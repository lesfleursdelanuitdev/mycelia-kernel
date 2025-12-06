/**
 * Result Assertion Helpers
 * 
 * Utilities for asserting and extracting data from test results.
 * These helpers reduce boilerplate and make tests more readable.
 */

/**
 * Assert that a result is successful
 * 
 * @param {any} result - Result object to check
 * @param {string} [message] - Custom error message
 * @throws {Error} If result is not defined or not successful
 * 
 * @example
 * const result = await processMessageImmediately(kernel, pkr, message);
 * expectSuccess(result);
 */
export function expectSuccess(result, message = 'Expected result to be successful') {
  if (result === null || result === undefined) {
    throw new Error(`${message}: result is null or undefined`);
  }
  if (result.success === false) {
    const errorMsg = result.error?.message || result.error || 'Unknown error';
    throw new Error(`${message}: ${errorMsg}`);
  }
  if (result.success !== true && result.success !== undefined) {
    throw new Error(`${message}: result.success is ${result.success}`);
  }
}

/**
 * Assert that a result failed
 * 
 * @param {any} result - Result object to check
 * @param {string|RegExp} [expectedError] - Expected error message or pattern
 * @param {string} [message] - Custom error message
 * @throws {Error} If result is successful or doesn't match expected error
 * 
 * @example
 * const result = await processMessageImmediately(kernel, pkr, message);
 * expectFailure(result, /Permission denied/);
 */
export function expectFailure(result, expectedError = null, message = 'Expected result to fail') {
  if (result === null || result === undefined) {
    throw new Error(`${message}: result is null or undefined`);
  }
  if (result.success === true) {
    throw new Error(`${message}: result was successful but expected failure`);
  }
  if (expectedError) {
    const errorMsg = result.error?.message || result.error || String(result);
    if (typeof expectedError === 'string') {
      if (!errorMsg.includes(expectedError)) {
        throw new Error(`${message}: expected error "${expectedError}" but got "${errorMsg}"`);
      }
    } else if (expectedError instanceof RegExp) {
      if (!expectedError.test(errorMsg)) {
        throw new Error(`${message}: error "${errorMsg}" does not match pattern ${expectedError}`);
      }
    }
  }
}

/**
 * Extract data from result with multiple fallback paths
 * 
 * @param {any} result - Result object
 * @param {string[]|string} paths - Array of paths to try, or single path string
 * @returns {any} Extracted data, or null if not found
 * 
 * @example
 * const workspace = extractData(result, ['data.workspace', 'workspace', 'data']);
 * const id = extractData(result, 'data.id');
 */
export function extractData(result, paths) {
  if (!result) return null;
  
  const pathArray = Array.isArray(paths) ? paths : [paths];
  
  for (const path of pathArray) {
    if (!path) continue;
    
    const parts = path.split('.');
    let value = result;
    
    for (const part of parts) {
      if (value === null || value === undefined) break;
      value = value[part];
    }
    
    if (value !== null && value !== undefined) {
      return value;
    }
  }
  
  return null;
}

/**
 * Extract ID from result
 * 
 * @param {any} result - Result object
 * @param {string[]|string} [paths] - Optional paths to try (default: common ID paths)
 * @returns {string|null} Extracted ID
 * 
 * @example
 * const id = extractId(result);
 * const id = extractId(result, ['data.workspace.id', 'workspace.id', 'id']);
 */
export function extractId(result, paths = null) {
  const defaultPaths = [
    'data.id',
    'id',
    'data.workspace.id',
    'workspace.id',
    'data.user.id',
    'user.id',
    'data.member.id',
    'member.id'
  ];
  
  return extractData(result, paths || defaultPaths);
}

/**
 * Extract error message from result
 * 
 * @param {any} result - Result object
 * @returns {string|null} Error message
 * 
 * @example
 * const error = extractError(result);
 */
export function extractError(result) {
  if (!result) return null;
  
  if (result.error) {
    if (typeof result.error === 'string') return result.error;
    if (result.error.message) return result.error.message;
    return String(result.error);
  }
  
  if (result.message) return result.message;
  
  return null;
}

/**
 * Assert data at path matches expected value
 * 
 * @param {any} result - Result object
 * @param {string|string[]} path - Path to data (or array of fallback paths)
 * @param {any} expected - Expected value or matcher function
 * @param {string} [message] - Custom error message
 * @throws {Error} If data doesn't match
 * 
 * @example
 * expectData(result, 'data.workspace.name', 'Test Workspace');
 * expectData(result, ['data.workspace', 'workspace'], (w) => w.name === 'Test');
 */
export function expectData(result, path, expected, message = null) {
  const data = extractData(result, path);
  
  if (data === null || data === undefined) {
    const pathStr = Array.isArray(path) ? path.join(' or ') : path;
    throw new Error(message || `Expected data at path "${pathStr}" but found null/undefined`);
  }
  
  if (typeof expected === 'function') {
    if (!expected(data)) {
      throw new Error(message || `Data at path "${path}" did not match predicate`);
    }
  } else {
    // Use deep equality check (simple version)
    if (JSON.stringify(data) !== JSON.stringify(expected)) {
      throw new Error(message || `Expected ${JSON.stringify(expected)} but got ${JSON.stringify(data)}`);
    }
  }
}


