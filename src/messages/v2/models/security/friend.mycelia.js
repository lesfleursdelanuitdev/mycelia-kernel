import { PRINCIPAL_KINDS } from './security.utils.mycelia.js';

/**
 * Friend
 * -------
 * Represents a trusted peer instance in the Mycelia network.
 * Friends are authenticated peers with their own identity and keys.
 *
 * Duck-type markers:
 * • isFriend = true
 * • kind = 'friend'
 */
export class Friend {
  #name;
  #endpoint;
  #connected;
  #lastSeen;
  #metadata;
  #sessionKey;

  constructor({ name, endpoint, metadata = {}, sessionKey = null } = {}) {
    this.#name = name;
    this.#endpoint = endpoint;
    this.#metadata = metadata;
    this.#sessionKey = sessionKey;
    this.#connected = false;
    this.#lastSeen = null;
  }

  get kind() { return PRINCIPAL_KINDS.FRIEND; }
  get isFriend() { return true; }
  get name() { return this.#name; }
  get endpoint() { return this.#endpoint; }
  get metadata() { return this.#metadata; }
  get sessionKey() { return this.#sessionKey; }
  get connected() { return this.#connected; }
  get lastSeen() { return this.#lastSeen; }

  connect() {
    this.#connected = true;
    this.#lastSeen = new Date();
  }

  disconnect() {
    this.#connected = false;
  }

  /**
   * Send a protected message to this friend.
   * In real usage, this would go through MessageSystem.sendProtected().
   */
  async sendProtected(message, ms) {
    if (!this.#connected) throw new Error(`Friend ${this.#name} not connected`);
    if (!ms?.sendProtected)
      throw new Error('sendProtected() requires a MessageSystem instance');

    return ms.sendProtected(this, message);
  }

  /**
   * Returns standardized friend identifier string.
   * Example: "friend:Anna"
   */
  getNameString() {
    return `friend:${this.#name || '(anonymous)'}`;
  }

  toRecord() {
    return {
      kind: this.kind,
      name: this.#name,
      endpoint: this.#endpoint,
      connected: this.#connected,
      lastSeen: this.#lastSeen,
      metadata: this.#metadata
    };
  }

  toString() {
    return `[Friend ${this.#name || '(anonymous)'} → ${this.#endpoint || 'unknown'}]`;
  }
}


