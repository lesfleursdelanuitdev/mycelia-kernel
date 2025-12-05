/**
 * Message Path Utilities
 * 
 * Provides path-related utilities for messages.
 */

/**
 * Extract subsystem name from message path
 * Path format: subsystem://path/to/resource
 * 
 * @param {string} path - Message path
 * @returns {string|null} Subsystem name or null if path is invalid
 * 
 * @example
 * const subsystem = extractSubsystem('server://route/register'); // Returns 'server'
 */
export function extractSubsystem(path) {
  if (!path || typeof path !== 'string') {
    return null;
  }
  const match = path.match(/^([^:]+):\/\//);
  return match ? match[1] : null;
}

/**
 * Check if message has a valid subsystem in its path
 * 
 * @param {string} path - Message path
 * @returns {boolean} True if path has valid subsystem format
 * 
 * @example
 * const isValid = hasValidSubsystem('server://route/register'); // Returns true
 */
export function hasValidSubsystem(path) {
  return extractSubsystem(path) !== null;
}




