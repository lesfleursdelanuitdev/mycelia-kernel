import { createIdentity } from './create-identity.mycelia.js';
import { PRINCIPAL_KINDS } from './security.utils.mycelia.js';

/**
 * createFriendIdentity
 * -------------------
 * Creates an identity context for a friend principal.
 * Validates that the PKR belongs to a friend principal before creating the identity.
 * 
 * @param {Object} principals - Principal registry with resolvePKR and get methods
 * @param {PKR} friendPkr - Public Key Record of the friend
 * @param {Object} kernel - Kernel instance with sendProtected method
 * @returns {Object} Identity object with permission methods
 * 
 * @throws {Error} If PKR is invalid, expired, unknown, or not a friend
 * @throws {Error} If kernel reference is missing or invalid
 */
export function createFriendIdentity(principals, friendPkr, kernel) {
  // Validate PKR structure first
  if (!friendPkr || typeof friendPkr.uuid !== 'string') {
    throw new Error('createFriendIdentity: invalid or unknown PKR');
  }

  if (!kernel || typeof kernel.sendProtected !== 'function') {
    throw new Error('createFriendIdentity: kernel reference not set or missing sendProtected');
  }

  // Check if the principal exists and is a friend
  const principal = principals.get(friendPkr.uuid);
  if (!principal) throw new Error('createFriendIdentity: principal not found');

  if (principal.kind !== PRINCIPAL_KINDS.FRIEND) {
    throw new Error('createFriendIdentity: expected a friend principal');
  }

  // Then validate PKR provenance + freshness
  const priv = principals.resolvePKR(friendPkr);
  if (!priv) throw new Error('createFriendIdentity: invalid or unknown PKR');

  return createIdentity(principals, friendPkr, kernel);
}

