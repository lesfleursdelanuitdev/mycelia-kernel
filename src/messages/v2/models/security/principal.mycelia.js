import { PKR } from './public-key-record.mycelia.js';
import { randomUUID, PRINCIPAL_KINDS } from './security.utils.mycelia.js';

/**
 * Principal
 * ---------
 * Internal representation of an entity in Mycelia:
 * kernel, subsystem (topLevel or child), friend, or resource.
 * Each Principal owns a UUID, kind, publicKey, and optional instance binding.
 * The private `#kernelId` is used only to mark which kernel minted it.
 */
export class Principal {
  #uuid;
  #name;
  #kind;
  #publicKey;
  #metadata;
  #createdAt;
  #pkr;
  #instance;
  #kernelId;

  constructor({ name, kind, publicKey, metadata = {}, instance, kernelId } = {}) {
    if (!kind || typeof kind !== 'string') {
      throw new TypeError('Principal: kind must be a string');
    }
    if (typeof publicKey !== 'symbol') {
      throw new TypeError('Principal: publicKey must be a Symbol');
    }
    if (kernelId !== undefined && typeof kernelId !== 'symbol') {
      throw new TypeError('Principal: kernelId must be a Symbol if provided');
    }

    this.#uuid = randomUUID();
    this.#name = name || null;
    this.#kind = kind;
    this.#publicKey = publicKey;
    this.#metadata = metadata;
    this.#createdAt = new Date();
    this.#instance = null;
    this.#kernelId = kernelId || null;

    if (instance) this.attachInstance(instance);
  }

  // ---- Getters ----

  get uuid() { return this.#uuid; }
  get name() { return this.#name; }
  get kind() { return this.#kind; }
  get publicKey() { return this.#publicKey; }
  get metadata() { return this.#metadata; }
  get createdAt() { return this.#createdAt; }
  get instance() { return this.#instance; }

  // ---- Instance binding ----

  attachInstance(obj) {
    if (this.#instance) throw new Error('Principal: instance already attached');
    if (!obj || typeof obj !== 'object')
      throw new TypeError('Principal: attachInstance requires an object');

    const k = this.#kind;
    const ok =
      (k === PRINCIPAL_KINDS.KERNEL) ||
      (k === PRINCIPAL_KINDS.TOP_LEVEL || k === PRINCIPAL_KINDS.CHILD) ||
      (k === PRINCIPAL_KINDS.FRIEND) ||
      (k === PRINCIPAL_KINDS.RESOURCE);

    if (!ok)
      throw new Error(`Principal: invalid kind for instance attach: ${k}`);

    this.#instance = obj;
  }

  // ---- PKR (PublicKeyRecord) ----

  get pkr() {
    if (!this.#pkr) {
      this.#pkr = new PKR({
        uuid: this.#uuid,
        name: this.#name,
        kind: this.#kind,
        publicKey: this.#publicKey,
        ...(this.#kernelId ? { minter: this.#kernelId } : {})
      });
    }
    return this.#pkr;
  }

  // ---- Refresh PKR ----

  /**
   * Refresh the Principal's PKR when its previous one expires.
   * Called by PrincipalRegistry.refreshPrincipal().
   * @param {symbol} newPublicKey - newly minted public key
   * @returns {PKR} new PKR instance
   */
  refresh(newPublicKey) {
    if (typeof newPublicKey !== 'symbol')
      throw new TypeError('Principal.refresh: newPublicKey must be a Symbol');

    // Update key and reset PKR cache
    this.#publicKey = newPublicKey;
    this.#pkr = new PKR({
      uuid: this.#uuid,
      name: this.#name,
      kind: this.#kind,
      publicKey: newPublicKey,
      ...(this.#kernelId ? { minter: this.#kernelId } : {})
    });

    return this.#pkr;
  }

  // ---- Name Management ----

  rename(newName) {
    this.#name = newName || null;
  }

  // ---- Equality / Records ----

  toRecord() {
    return {
      uuid: this.#uuid,
      name: this.#name,
      kind: this.#kind,
      publicKey: this.#publicKey.toString(),
      createdAt: this.#createdAt.toISOString()
    };
  }

  equals(other) {
    return !!other && other instanceof Principal && this.#uuid === other.uuid;
  }

  toString() {
    return `[Principal ${this.#kind}:${this.#name || this.#uuid}]`;
  }
}

