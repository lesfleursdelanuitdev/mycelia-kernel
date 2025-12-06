/**
 * RWSTestContext
 * 
 * Utilities for testing ReaderWriterSet permissions.
 * 
 * @example
 * const rwsCtx = new RWSTestContext(principalsRegistry);
 * 
 * // Grant and verify permissions
 * rwsCtx.grantWrite(kernelPkr, workspacePkr, userPkr);
 * expect(rwsCtx.canWrite(workspacePkr, userPkr)).toBe(true);
 */

export class RWSTestContext {
  #principalsRegistry = null;

  /**
   * Create an RWSTestContext
   * 
   * @param {PrincipalRegistry} principalsRegistry - Principals registry
   */
  constructor(principalsRegistry) {
    if (!principalsRegistry) {
      throw new Error('RWSTestContext: principalsRegistry is required');
    }
    this.#principalsRegistry = principalsRegistry;
  }

  /**
   * Create an RWS for an owner PKR
   * 
   * @param {PKR} ownerPkr - Owner's PKR
   * @returns {ReaderWriterSet} RWS instance
   */
  createRWS(ownerPkr) {
    return this.#principalsRegistry.createRWS(ownerPkr);
  }

  /**
   * Check if grantee can read from owner's RWS
   * 
   * @param {PKR} ownerPkr - Owner's PKR
   * @param {PKR} granteePkr - Grantee's PKR
   * @returns {boolean} True if grantee can read
   */
  canRead(ownerPkr, granteePkr) {
    const rws = this.createRWS(ownerPkr);
    return rws.canRead(granteePkr);
  }

  /**
   * Check if grantee can write to owner's RWS
   * 
   * @param {PKR} ownerPkr - Owner's PKR
   * @param {PKR} granteePkr - Grantee's PKR
   * @returns {boolean} True if grantee can write
   */
  canWrite(ownerPkr, granteePkr) {
    const rws = this.createRWS(ownerPkr);
    return rws.canWrite(granteePkr);
  }

  /**
   * Check if grantee can grant permissions on owner's RWS
   * 
   * @param {PKR} ownerPkr - Owner's PKR
   * @param {PKR} granteePkr - Grantee's PKR
   * @returns {boolean} True if grantee can grant
   */
  canGrant(ownerPkr, granteePkr) {
    const rws = this.createRWS(ownerPkr);
    return rws.canGrant(granteePkr);
  }

  /**
   * Grant read permission
   * 
   * @param {PKR} granterPkr - Granter's PKR (must have grant permission)
   * @param {PKR} ownerPkr - Owner's PKR (RWS owner)
   * @param {PKR} granteePkr - Grantee's PKR (to grant permission to)
   * @returns {boolean} True if permission was granted
   */
  grantRead(granterPkr, ownerPkr, granteePkr) {
    const rws = this.createRWS(ownerPkr);
    return rws.addReader(granterPkr, granteePkr);
  }

  /**
   * Grant write permission
   * 
   * @param {PKR} granterPkr - Granter's PKR (must have grant permission)
   * @param {PKR} ownerPkr - Owner's PKR (RWS owner)
   * @param {PKR} granteePkr - Grantee's PKR (to grant permission to)
   * @returns {boolean} True if permission was granted
   */
  grantWrite(granterPkr, ownerPkr, granteePkr) {
    const rws = this.createRWS(ownerPkr);
    return rws.addWriter(granterPkr, granteePkr);
  }

  /**
   * Revoke read permission
   * 
   * @param {PKR} granterPkr - Granter's PKR (must have grant permission)
   * @param {PKR} ownerPkr - Owner's PKR (RWS owner)
   * @param {PKR} granteePkr - Grantee's PKR (to revoke permission from)
   * @returns {boolean} True if permission was revoked
   */
  revokeRead(granterPkr, ownerPkr, granteePkr) {
    const rws = this.createRWS(ownerPkr);
    return rws.removeReader(granterPkr, granteePkr);
  }

  /**
   * Revoke write permission
   * 
   * @param {PKR} granterPkr - Granter's PKR (must have grant permission)
   * @param {PKR} ownerPkr - Owner's PKR (RWS owner)
   * @param {PKR} granteePkr - Grantee's PKR (to revoke permission from)
   * @returns {boolean} True if permission was revoked
   */
  revokeWrite(granterPkr, ownerPkr, granteePkr) {
    const rws = this.createRWS(ownerPkr);
    return rws.removeWriter(granterPkr, granteePkr);
  }

  /**
   * Verify permissions for a grantee on an owner's RWS
   * 
   * @param {PKR} ownerPkr - Owner's PKR
   * @param {PKR} granteePkr - Grantee's PKR
   * @returns {Object} Permission status with canRead, canWrite, canGrant
   */
  verifyPermissions(ownerPkr, granteePkr) {
    return {
      canRead: this.canRead(ownerPkr, granteePkr),
      canWrite: this.canWrite(ownerPkr, granteePkr),
      canGrant: this.canGrant(ownerPkr, granteePkr)
    };
  }
}


