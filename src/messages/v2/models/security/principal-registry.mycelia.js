import { Principal } from './principal.mycelia.js';
import { PRINCIPAL_KINDS } from './security.utils.mycelia.js';
import { ReaderWriterSet } from './reader-writer-set.mycelia.js';
import { createIdentity } from './create-identity.mycelia.js';
import { createFriendIdentity } from './create-friend-identity.mycelia.js';

/**
 * PrincipalRegistry
 * -----------------
 * Manages all Principals and their identity mappings.
 * Automatically mints keypairs when creating Principals.
 * Provides RWS/RWA utilities (for owners/resources) and a minimal Friend identity.
 */
export class PrincipalRegistry {
  #kernel;
  #byUuid = new Map();
  #byName = new Map();
  #byPublicKey = new Map(); // publicKey → uuid
  #byPrivateKey = new Map(); // privateKey → uuid (kernel/topLevel/friend)
  #publicToPrivate = new Map(); // publicKey → privateKey
  #kernelId = null; // kernel private key
  #refreshLocks = new Map(); // uuid → boolean (simple guard)
  #rwsByUuid = new Map(); // uuid → ReaderWriterSet

  constructor(opts = {}) {
    this.#kernel = opts.kernel || null;
    if (opts.kernel) {
      // Check if kernel already has an identity
      // If it does, skip registration to prevent duplicate kernel PKRs
      // Only the FIRST registry (typically AccessControl) should register the kernel
      const existingIdentity = opts.kernel.identity;
      const existingPkr = existingIdentity?.pkr;
      
      if (existingPkr && existingPkr.kind === PRINCIPAL_KINDS.KERNEL) {
        // Kernel already has an identity from another registry
        // We cannot register it here because the private keys won't match
        // Skip kernel registration - this registry will not have kernelId set
        // This is intentional: only the first registry should register the kernel
        return;
      }
      
      // Kernel doesn't have an identity yet - create it
      // This should only happen in the first PrincipalRegistry (AccessControl)
      // 1) Create the kernel principal
      const pkr = this.createPrincipal(PRINCIPAL_KINDS.KERNEL, { instance: opts.kernel });
      // 2) Give the kernel a full identity wrapper (RWA), not just a PKR
      opts.kernel.identity = this.createIdentity(pkr);
    }
  }

  // ---- Key minting (simple, inline) ----

  mint(kind = PRINCIPAL_KINDS.RESOURCE) {
    const validKinds = [
      PRINCIPAL_KINDS.KERNEL,
      PRINCIPAL_KINDS.TOP_LEVEL,
      PRINCIPAL_KINDS.FRIEND,
      PRINCIPAL_KINDS.CHILD,
      PRINCIPAL_KINDS.RESOURCE
    ];
    if (!validKinds.includes(kind)) {
      throw new TypeError(`mint: invalid kind ${kind}`);
    }

    const publicKey = Symbol(`publicKey:${kind}`);
    const privateKeyKinds = [PRINCIPAL_KINDS.KERNEL, PRINCIPAL_KINDS.TOP_LEVEL, PRINCIPAL_KINDS.FRIEND];
    if (privateKeyKinds.includes(kind)) {
      const privateKey = Symbol(`privateKey:${kind}`);
      return { publicKey, privateKey };
    }
    return { publicKey };
  }

  // ---- Create + register principal ----

  createPrincipal(kind = PRINCIPAL_KINDS.TOP_LEVEL, opts = {}) {
    const validKinds = [
      PRINCIPAL_KINDS.KERNEL,
      PRINCIPAL_KINDS.FRIEND,
      PRINCIPAL_KINDS.TOP_LEVEL,
      PRINCIPAL_KINDS.RESOURCE,
      PRINCIPAL_KINDS.CHILD
    ];
    if (!validKinds.includes(kind)) {
      throw new TypeError(`createPrincipal: invalid kind ${kind}`);
    }

    if (kind === PRINCIPAL_KINDS.KERNEL && this.#kernelId !== null) {
      throw new Error('Kernel principal already exists');
    }

    const { publicKey, privateKey } = this.mint(kind);
    const { metadata, owner, instance } = opts;
    let name = opts.name;
    if (!name && instance?.getNameString) name = instance.getNameString();

    const principal = new Principal({
      name,
      kind,
      publicKey,
      metadata,
      instance,
      ...(kind === PRINCIPAL_KINDS.KERNEL ? { kernelId: privateKey } : (this.#kernelId ? { kernelId: this.#kernelId } : {}))
    });

    this.#register(principal, { privateKey, owner });

    if (kind === PRINCIPAL_KINDS.KERNEL) this.#kernelId = privateKey;

    return principal.pkr;
  }

  // ---- Refresh (PKR rotation on expiry) ----

  refreshPrincipal(principalOrPublicKey) {
    let principal, oldPublicKey;

    if (typeof principalOrPublicKey === 'symbol') {
      const uuid = this.#byPublicKey.get(principalOrPublicKey);
      if (!uuid) throw new Error('refreshPrincipal: unknown public key');
      principal = this.#byUuid.get(uuid);
      oldPublicKey = principalOrPublicKey;
    } else if (principalOrPublicKey instanceof Principal) {
      principal = principalOrPublicKey;
      if (!this.#byUuid.has(principal.uuid))
        throw new Error('refreshPrincipal: principal not registered');
      oldPublicKey = principal.publicKey;
    } else {
      throw new TypeError('refreshPrincipal expects Principal or publicKey Symbol');
    }

    if (this.#refreshLocks.get(principal.uuid)) return principal.pkr;

    this.#refreshLocks.set(principal.uuid, true);

    try {
      const currentPKR = principal.pkr;
      if (!currentPKR.isExpired()) return currentPKR;

      if (principal.publicKey !== oldPublicKey) return principal.pkr;

      const newPublicKey = Symbol(`publicKey:${principal.kind}:refresh:${Date.now()}`);

      this.#byPublicKey.delete(oldPublicKey);
      this.#byPublicKey.set(newPublicKey, principal.uuid);

      const existingPrivate = this.#publicToPrivate.get(oldPublicKey);
      if (existingPrivate) {
        this.#publicToPrivate.delete(oldPublicKey);
        this.#publicToPrivate.set(newPublicKey, existingPrivate);
      }

      const newPKR = principal.refresh(newPublicKey);

      // Create new identity wrapper and attach to instance if it exists
      if (principal.instance) {
        let newIdentity;
        if (principal.kind === PRINCIPAL_KINDS.FRIEND) {
          newIdentity = this.createFriendIdentity(newPKR);
          principal.instance.identity = newIdentity;
        } else if (principal.kind === PRINCIPAL_KINDS.RESOURCE) {
          // For resources, get the owner subsystem from the resource instance
          const resourceInstance = principal.instance.instance;
          if (!resourceInstance) {
            throw new Error('refreshPrincipal: resource instance missing resource instance');
          }

          newIdentity = this.createIdentity(newPKR);
          // Attach identity directly to the Resource instance
          resourceInstance.identity = newIdentity;
        } else {
          newIdentity = this.createIdentity(newPKR);
          principal.instance.identity = newIdentity;
        }
      }

      return newPKR;
    } finally {
      this.#refreshLocks.delete(principal.uuid);
    }
  }

  // ---- Resolve (uuid → current public → private) ----

  resolvePKR(pkr) {
    if (!pkr || typeof pkr.uuid !== 'string') {
      throw new TypeError('resolvePKR requires a PKR with a string uuid');
    }

    const principal = this.#byUuid.get(pkr.uuid);
    if (!principal) return undefined;

    return this.#publicToPrivate.get(principal.publicKey);
  }

  // ---- Internal register (kept private) ----

  #register(principal, opts = {}) {
    const { privateKey, owner } = opts;
    const { uuid, name, publicKey, kind } = principal;

    if (privateKey && owner)
      throw new Error('register: provide either privateKey or owner, not both');

    if (!uuid || typeof uuid !== 'string')
      throw new TypeError('register: principal.uuid must be a string');

    if (typeof publicKey !== 'symbol')
      throw new TypeError('register: principal.publicKey must be a Symbol');

    if (this.#byUuid.has(uuid))
      throw new Error(`register: UUID already exists ${uuid}`);

    if (name) {
      const existing = this.#byName.get(name);
      if (existing && existing !== uuid) throw new Error(`register: name conflict "${name}"`);
    }

    if (this.#byPublicKey.has(publicKey))
      throw new Error('register: publicKey conflict');

    this.#byUuid.set(uuid, principal);
    if (name) this.#byName.set(name, uuid);
    this.#byPublicKey.set(publicKey, uuid);

    // bind private relationships
    if (privateKey) {
      const privateKeyKinds = [PRINCIPAL_KINDS.KERNEL, PRINCIPAL_KINDS.FRIEND, PRINCIPAL_KINDS.TOP_LEVEL];
      if (!privateKeyKinds.includes(kind))
        throw new Error('register: privateKey allowed only for kernel/friend/topLevel');

      if (typeof privateKey !== 'symbol')
        throw new TypeError('register: privateKey must be a Symbol');

      if (this.#byPrivateKey.has(privateKey))
        throw new Error('register: privateKey conflict');

      if (this.#publicToPrivate.has(publicKey))
        throw new Error('register: public→private conflict');

      this.#byPrivateKey.set(privateKey, uuid);
      this.#publicToPrivate.set(publicKey, privateKey);
    } else if (owner !== undefined) {
      const ownersPrivate = this.resolvePKR(owner);
      if (!ownersPrivate)
        throw new Error('register: owner has no public→private mapping');

      if (this.#publicToPrivate.has(publicKey))
        throw new Error('register: public→private conflict');

      this.#publicToPrivate.set(publicKey, ownersPrivate);
    }
  }

  // ---- Create a ReaderWriterSet (owners/resources) ----

  createRWS(ownerPkr) {
    if (!ownerPkr || typeof ownerPkr.uuid !== 'string') {
      throw new TypeError('createRWS: requires a valid PKR');
    }

    const principal = this.#byUuid.get(ownerPkr.uuid);
    if (!principal) throw new Error('createRWS: unknown principal');

    if (this.#rwsByUuid.has(ownerPkr.uuid)) {
      return this.#rwsByUuid.get(ownerPkr.uuid);
    }

    const rws = new ReaderWriterSet({ pkr: ownerPkr, principals: this });
    this.#rwsByUuid.set(ownerPkr.uuid, rws);

    return rws;
  }

  // ---- Create a ReaderWriterAccess (Identity Wrapper) for owners/resources ----

  createIdentity(ownerPkr) {
    // Validate PKR provenance + freshness
    const priv = this.resolvePKR(ownerPkr);
    if (!priv) throw new Error('createIdentity: invalid or unknown PKR');

    if (!this.#kernel || typeof this.#kernel.sendProtected !== 'function') {
      throw new Error('createIdentity: kernel reference not set or missing sendProtected');
    }

    return createIdentity(this, ownerPkr, this.#kernel);
  }

  // ---- Minimal identity for Friends (PKR + sendProtected only) ----

  createFriendIdentity(friendPkr) {
    // Validate PKR (and ensure it belongs to a friend principal)
    const priv = this.resolvePKR(friendPkr);
    if (!priv) throw new Error('createFriendIdentity: invalid or unknown PKR');

    const principal = this.get(friendPkr.uuid);
    if (!principal) throw new Error('createFriendIdentity: principal not found');

    if (principal.kind !== PRINCIPAL_KINDS.FRIEND) {
      throw new Error('createFriendIdentity: expected a friend principal');
    }

    if (!this.#kernel || typeof this.#kernel.sendProtected !== 'function') {
      throw new Error('createFriendIdentity: kernel reference not set or missing sendProtected');
    }

    return createFriendIdentity(this, friendPkr, this.#kernel);
  }

  // ---- Basic lookups & maintenance ----

  get(uuid) { return this.#byUuid.get(uuid); }

  has(id) {
    return (
      this.#byUuid.has(id) ||
      this.#byName.has(id) ||
      (typeof id === 'symbol' &&
        (this.#byPublicKey.has(id) ||
          this.#byPrivateKey.has(id) ||
          this.#publicToPrivate.has(id)))
    );
  }

  delete(uuid) {
    const principal = this.#byUuid.get(uuid);
    if (!principal) return null;

    const { name, publicKey, kind } = principal;

    if (name && this.#byName.get(name) === uuid) this.#byName.delete(name);
    if (publicKey && this.#byPublicKey.get(publicKey) === uuid)
      this.#byPublicKey.delete(publicKey);

    const mappedPriv = this.#publicToPrivate.get(publicKey);
    if (mappedPriv) {
      this.#publicToPrivate.delete(publicKey);
      const mappedUuid = this.#byPrivateKey.get(mappedPriv);
      if (mappedUuid === uuid) this.#byPrivateKey.delete(mappedPriv);
      if (kind === PRINCIPAL_KINDS.KERNEL && this.#kernelId === mappedPriv) this.#kernelId = null;
    }

    this.#byUuid.delete(uuid);
    this.#rwsByUuid.delete(uuid);

    return principal;
  }

  clear() {
    this.#byUuid.clear();
    this.#byName.clear();
    this.#byPublicKey.clear();
    this.#byPrivateKey.clear();
    this.#publicToPrivate.clear();
    this.#rwsByUuid.clear();
    this.#kernelId = null;
    this.#refreshLocks.clear();
    this.#kernel = null;
  }

  // ---- Info / helpers ----

  get size() { return this.#byUuid.size; }

  *[Symbol.iterator]() { yield* this.#byUuid.values(); }

  list() { return Array.from(this.#byUuid.values()); }

  get kernelId() { return this.#kernelId; }

  isKernel(pkr) {
    const priv = this.resolvePKR(pkr);
    return priv === this.#kernelId;
  }

  // ---- Role Management ----

  /**
   * Get the role for a principal by PKR
   * @param {PKR} pkr - Principal's Public Key Record
   * @returns {string|null} Role name or null if not set
   */
  getRoleForPKR(pkr) {
    if (!pkr || typeof pkr.uuid !== 'string') {
      return null;
    }
    
    const principal = this.#byUuid.get(pkr.uuid);
    if (!principal) {
      return null;
    }
    
    return principal.metadata?.role || null;
  }

  /**
   * Set the role for a principal by PKR
   * @param {PKR} pkr - Principal's Public Key Record
   * @param {string} role - Role name
   * @returns {boolean} True if role was set successfully
   */
  setRoleForPKR(pkr, role) {
    if (!pkr || typeof pkr.uuid !== 'string') {
      return false;
    }
    
    if (typeof role !== 'string' || !role.trim()) {
      throw new Error('setRoleForPKR: role must be a non-empty string');
    }
    
    const principal = this.#byUuid.get(pkr.uuid);
    if (!principal) {
      return false;
    }
    
    if (!principal.metadata) {
      principal.metadata = {};
    }
    
    principal.metadata.role = role;
    return true;
  }
}

