import { randomUUID } from './security.utils.mycelia.js';

export class ReaderWriterSet {
  #readers = new Set(); // Set<symbol> of private keys (grantees)
  #writers = new Set(); // Set<symbol> of private keys
  #granters = new Set(); // Set<symbol> of private keys (users with grant permission)
  #pkr; // owner PKR
  #uuid = randomUUID();
  #principals; // PrincipalRegistry

  constructor(opts = {}) {
    if (!opts.pkr) throw new Error('ReaderWriterSet: requires pkr');
    if (!opts.principals) throw new Error('ReaderWriterSet: requires principals registry');

    this.#pkr = opts.pkr;
    this.#principals = opts.principals;
  }

  // ---- Internal utilities ----

  #resolveKey(pkr) {
    if (!pkr || typeof pkr.uuid !== 'string') {
      throw new TypeError('ReaderWriterSet: invalid PKR');
    }

    const priv = this.#principals.resolvePKR(pkr); // validates PKR & provenance
    if (!priv) throw new Error('ReaderWriterSet: unable to resolve PKR to private key');

    return priv; // canonical identity (stable across rotations)
  }

  #isValid(pkr) {
    const kernelId = this.#principals.kernelId;
    // If there's no kernel, we can't validate via isMinter, so just check expiration
    if (!kernelId) {
      return pkr?.isExpired?.() === false;
    }
    
    return pkr?.isValid?.(kernelId) === true;
  }

  // ---- Convenience wrappers ----

  isKernel(pkr) {
    return this.#principals.isKernel(pkr);
  }

  // ---- Membership management (granter/grantee) ----

  addReader(granter, grantee) {
    if (!this.#isValid(granter) || !this.#isValid(grantee)) return false;
    if (!this.canGrant(granter)) return false;

    const key = this.#resolveKey(grantee);
    this.#readers.add(key);

    return true;
  }

  addWriter(granter, grantee) {
    if (!this.#isValid(granter) || !this.#isValid(grantee)) return false;
    if (!this.canGrant(granter)) return false;

    const key = this.#resolveKey(grantee);
    this.#writers.add(key);

    return true;
  }

  removeReader(granter, grantee) {
    if (!this.#isValid(granter) || !this.#isValid(grantee)) return false;
    if (!this.canGrant(granter)) return false;

    const key = this.#resolveKey(grantee);
    this.#readers.delete(key);

    return true;
  }

  removeWriter(granter, grantee) {
    if (!this.#isValid(granter) || !this.#isValid(grantee)) return false;
    if (!this.canGrant(granter)) return false;

    const key = this.#resolveKey(grantee);
    this.#writers.delete(key);

    return true;
  }

  promote(granter, grantee) {
    if (!this.#isValid(granter) || !this.#isValid(grantee)) return false;
    if (!this.canGrant(granter)) return false;

    const key = this.#resolveKey(grantee);
    if (this.#readers.has(key)) {
      this.#readers.delete(key);
      this.#writers.add(key);
    }

    return true;
  }

  demote(granter, grantee) {
    if (!this.#isValid(granter) || !this.#isValid(grantee)) return false;
    if (!this.canGrant(granter)) return false;

    const key = this.#resolveKey(grantee);
    if (this.#writers.has(key)) {
      this.#writers.delete(key);
      this.#readers.add(key);
    }

    return true;
  }

  addGranter(granter, grantee) {
    if (!this.#isValid(granter) || !this.#isValid(grantee)) return false;
    if (!this.canGrant(granter)) return false;

    const key = this.#resolveKey(grantee);
    this.#granters.add(key);

    return true;
  }

  removeGranter(granter, grantee) {
    if (!this.#isValid(granter) || !this.#isValid(grantee)) return false;
    if (!this.canGrant(granter)) return false;

    const key = this.#resolveKey(grantee);
    this.#granters.delete(key);

    return true;
  }

  clear() {
    this.#readers.clear();
    this.#writers.clear();
    this.#granters.clear();
  }

  // ---- Access checks (read/write/grant) ----

  isOwner(pkr) {
    if (!this.#isValid(pkr)) return false;

    const testPriv = this.#principals.resolvePKR(pkr);
    const ownerPriv = this.#principals.resolvePKR(this.#pkr);

    return !!testPriv && !!ownerPriv && testPriv === ownerPriv;
  }

  canRead(pkr) {
    if (this.isKernel(pkr)) return true;
    if (!this.#isValid(pkr)) return false;

    const key = this.#resolveKey(pkr);
    return this.#readers.has(key) || this.#writers.has(key) || this.isOwner(pkr);
  }

  canWrite(pkr) {
    if (this.isKernel(pkr)) return true;
    if (!this.#isValid(pkr)) return false;

    const key = this.#resolveKey(pkr);
    return this.#writers.has(key) || this.isOwner(pkr);
  }

  canGrant(pkr) {
    if (!this.#isValid(pkr)) return false;
    if (this.isKernel(pkr)) return true;
    if (this.isOwner(pkr)) return true;

    // Check if PKR is in the granters set
    const key = this.#resolveKey(pkr);
    return this.#granters.has(key);
  }

  // ---- Introspection ----

  hasReader(pkr) {
    const key = this.#resolveKey(pkr);
    return this.#readers.has(key);
  }

  hasWriter(pkr) {
    const key = this.#resolveKey(pkr);
    return this.#writers.has(key);
  }

  hasGranter(pkr) {
    const key = this.#resolveKey(pkr);
    return this.#granters.has(key);
  }

  readerCount() { return this.#readers.size; }
  writerCount() { return this.#writers.size; }
  granterCount() { return this.#granters.size; }

  clone() {
    const cloned = new ReaderWriterSet({ pkr: this.#pkr, principals: this.#principals });

    for (const r of this.#readers) cloned.#readers.add(r);
    for (const w of this.#writers) cloned.#writers.add(w);
    for (const g of this.#granters) cloned.#granters.add(g);

    return cloned;
  }

  toRecord() {
    return {
      uuid: this.#uuid,
      owner: this.#pkr.uuid,
      readers: Array.from(this.#readers),
      writers: Array.from(this.#writers),
      granters: Array.from(this.#granters),
    };
  }

  toString() {
    return `[RWS ${this.#uuid}] readers=${this.#readers.size} writers=${this.#writers.size} granters=${this.#granters.size}`;
  }
}

