import { BaseSubsystem } from '../../base-subsystem/base.subsystem.mycelia.js';
import { usePrincipals } from '../../../hooks/principals/use-principals.mycelia.js';
import { Resource } from '../../security/resource.mycelia.js';
import { Friend } from '../../security/friend.mycelia.js';
import { PRINCIPAL_KINDS } from '../../security/security.utils.mycelia.js';

/**
 * AccessControlSubsystem
 * 
 * Kernel child subsystem responsible for identity and access control.
 * It installs `usePrincipals` for managing principals, PKRs, and identities.
 */
export class AccessControlSubsystem extends BaseSubsystem {
  /**
   * @param {string} name - Subsystem name (should be 'access-control')
   * @param {Object} options - Configuration options
   * @param {Object} options.ms - MessageSystem instance (required)
   * @param {Object} [options.config={}] - Configuration object
   * @param {Object} [options.config.principals={}] - Principals configuration
   * @param {Object} [options.config.principals.kernel] - Kernel instance (required for usePrincipals)
   */
  constructor(name = 'access-control', options = {}) {
    super(name, options);

    // Install principals facet
    this.use(usePrincipals);
  }

  /**
   * Create a new Resource and register a corresponding Principal for it.
   * 
   * Flow:
   * 1) Create Resource object with owner subsystem, name, metadata, and instance
   * 2) Register a Principal for that resource (createPrincipal handles key minting internally)
   * 3) Create resource identity and attach to resourceInstance
   * 
   * @param {BaseSubsystem} ownerInstance - The owner subsystem instance.
   * @param {string} name - Resource name.
   * @param {object} resourceInstance - Required instance to attach to the resource.
   * @param {object} [metadata={}] - Optional metadata for the resource.
   * @returns {Resource} - The created Resource instance.
   * @throws {Error} If ownerInstance is missing, name is invalid, or resourceInstance is missing
   */
  createResource(ownerInstance, name, resourceInstance, metadata = {}) {
    if (!ownerInstance) {
      throw new Error('AccessControlSubsystem.createResource: ownerInstance is required.');
    }

    if (typeof name !== 'string' || !name.trim()) {
      throw new Error('AccessControlSubsystem.createResource: name must be a non-empty string.');
    }

    if (!resourceInstance) {
      throw new Error('AccessControlSubsystem.createResource: resourceInstance is required.');
    }

    // Get the owner's PKR from the subsystem's identity
    const ownerPkr = ownerInstance.identity?.pkr;
    if (!ownerPkr) {
      throw new Error('AccessControlSubsystem.createResource: ownerInstance must have an identity with a PKR.');
    }

    // 1) Create the Resource object
    const resource = new Resource({
      name,
      owner: ownerInstance,
      metadata,
      instance: resourceInstance
    });

    // 2) Register a corresponding principal (createPrincipal handles key minting internally)
    // createPrincipal returns a PKR
    const principalsFacet = this.find('principals');
    if (!principalsFacet) {
      throw new Error('AccessControlSubsystem.createResource: principals facet not found. Ensure usePrincipals hook is used.');
    }
    
    const pkr = principalsFacet.createPrincipal(PRINCIPAL_KINDS.RESOURCE, {
      owner: ownerPkr,
      name,
      instance: resource,
      metadata
    });

    // 3) Create resource identity and attach to resourceInstance
    resourceInstance.identity = principalsFacet.createIdentity(pkr);
    // Set the owner subsystem on the resource identity
    resourceInstance.identity.setSubsystem(ownerInstance);

    return resource;
  }

  /**
   * Create a new Friend and register a corresponding Principal for it.
   * 
   * Flow:
   * 1) Create Friend object with name, endpoint, metadata, and sessionKey
   * 2) Register a Principal for that friend (createPrincipal handles key minting internally)
   * 3) Create friend identity and attach to the Friend instance
   * 
   * @param {string} name - Friend name.
   * @param {object} [options={}] - Optional friend options
   * @param {string} [options.endpoint=null] - Friend endpoint
   * @param {object} [options.metadata={}] - Optional metadata for the friend
   * @param {symbol} [options.sessionKey=null] - Optional session key
   * @param {string} [options.role=null] - Optional role name (e.g., 'student', 'teacher')
   * @returns {Friend} - The created Friend instance.
   * @throws {Error} If name is invalid
   */
  createFriend(name, options = {}) {
    if (typeof name !== 'string' || !name.trim()) {
      throw new Error('AccessControlSubsystem.createFriend: name must be a non-empty string.');
    }

    const { endpoint = null, metadata = {}, sessionKey = null, role = null } = options;

    // Merge role into metadata if provided
    const friendMetadata = { ...metadata };
    if (role) {
      friendMetadata.role = role;
    }

    // 1) Create the Friend object
    const friend = new Friend({
      name,
      endpoint,
      metadata: friendMetadata,
      sessionKey
    });

    // 2) Register a corresponding principal (createPrincipal handles key minting internally)
    // createPrincipal returns a PKR
    const principalsFacet = this.find('principals');
    if (!principalsFacet) {
      throw new Error('AccessControlSubsystem.createFriend: principals facet not found. Ensure usePrincipals hook is used.');
    }
    
    const pkr = principalsFacet.createPrincipal(PRINCIPAL_KINDS.FRIEND, {
      name,
      instance: friend,
      metadata: friendMetadata  // ← Role included here
    });

    // 3) Create friend identity and attach to the Friend instance
    friend.identity = principalsFacet.createFriendIdentity(pkr);

    return friend;
  }

  /**
   * Wire a subsystem principal and attach identity to the subsystem instance.
   * 
   * Flow:
   * 1) Validate type and subsystemInstance
   * 2) Get owner PKR from root subsystem (for child types)
   * 3) Register a Principal for the subsystem (createPrincipal handles key minting internally)
   * 4) Create identity and attach to subsystemInstance.identity
   * 
   * @param {string} type - Subsystem type: 'child' or 'topLevel'
   * @param {BaseSubsystem} subsystemInstance - The subsystem instance to register
   * @param {object} [options={}] - Optional options
   * @param {object} [options.metadata={}] - Optional metadata for the subsystem
   * @param {string} [options.role=null] - Optional role name (e.g., 'admin', 'service')
   * @returns {Object} - Object containing the PKR and subsystem instance
   * @returns {PKR} result.pkr - The created principal's Public Key Record
   * @returns {BaseSubsystem} result.subsystem - The subsystem instance with identity attached
   * @throws {Error} If type is invalid, subsystemInstance is missing, or root identity is missing for child
   */
  wireSubsystem(type, subsystemInstance, options = {}) {
    if (type !== 'child' && type !== 'topLevel') {
      throw new Error('AccessControlSubsystem.wireSubsystem: type must be "child" or "topLevel".');
    }

    if (!subsystemInstance) {
      throw new Error('AccessControlSubsystem.wireSubsystem: subsystemInstance is required.');
    }

    const { metadata = {}, role = null } = options;

    // Merge role into metadata if provided
    const subsystemMetadata = { ...metadata };
    if (role) {
      subsystemMetadata.role = role;
    }

    // For child subsystems, get owner PKR from root subsystem's identity
    let owner = null;
    if (type === 'child') {
      const rootSubsystem = subsystemInstance.getRoot();
      if (!rootSubsystem) {
        throw new Error('AccessControlSubsystem.wireSubsystem: unable to get root subsystem for child.');
      }
      owner = rootSubsystem.identity?.pkr;
      if (!owner) {
        throw new Error('AccessControlSubsystem.wireSubsystem: root subsystem must have an identity with a PKR for child subsystems.');
      }
    }

    // Get name from subsystem instance if available
    const name = subsystemInstance.name;

    // Get principals facet
    const principalsFacet = this.find('principals');
    if (!principalsFacet) {
      throw new Error('AccessControlSubsystem.wireSubsystem: principals facet not found. Ensure usePrincipals hook is used.');
    }
    
    // Register a principal (createPrincipal handles key minting internally)
    // createPrincipal returns a PKR
    const pkr = principalsFacet.createPrincipal(type, {
      name,
      instance: subsystemInstance,
      owner,
      metadata: subsystemMetadata  // ← Use merged metadata with role
    });

    // Create identity and attach to subsystemInstance
    subsystemInstance.identity = principalsFacet.createIdentity(pkr);
    // Set the subsystem on the identity
    subsystemInstance.identity.setSubsystem(subsystemInstance);

    return { pkr, subsystem: subsystemInstance };
  }
}

