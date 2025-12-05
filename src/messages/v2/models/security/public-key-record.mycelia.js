/**
 * PKR (Public Key Record)
 * -----------------------
 * Immutable record representing an externally shareable identity reference.
 * Wraps a Principal's UUID, name, kind, and publicKey symbol for external use.
 * The private `#minter` stores the kernel key that created it.
 * The private `#expiresAt` stores a timestamp computed from the expiration parameter.
 */

/**
 * Parse expiration time string to milliseconds
 * Supports formats like: "3 hours", "three days", "one week", "5 seconds", "1 millisecond", etc.
 * @param {string} expiration - Expiration time string
 * @returns {number} Milliseconds until expiration
 */
function parseExpiration(expiration) {
  if (!expiration || typeof expiration !== 'string') {
    // Default to 1 week
    return 7 * 24 * 60 * 60 * 1000;
  }

  const normalized = expiration.toLowerCase().trim();
  
  // Match patterns for different time units
  const millisecondPattern = /(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s*(?:millisecond|milliseconds|ms)/;
  const secondPattern = /(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s*(?:second|seconds|sec|secs)/;
  const hourPattern = /(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s*(?:hour|hours|hr|hrs)/;
  const dayPattern = /(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s*(?:day|days)/;
  const weekPattern = /(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s*(?:week|weeks|wk|wks)/;

  const numberMap = {
    one: 1, two: 2, three: 3, four: 4, five: 5,
    six: 6, seven: 7, eight: 8, nine: 9, ten: 10
  };

  function parseNumber(str) {
    const num = parseInt(str, 10);
    if (!isNaN(num)) return num;
    return numberMap[str] || 1;
  }

  let match;
  if ((match = normalized.match(millisecondPattern))) {
    const milliseconds = parseNumber(match[1]);
    return milliseconds;
  }
  if ((match = normalized.match(secondPattern))) {
    const seconds = parseNumber(match[1]);
    return seconds * 1000;
  }
  if ((match = normalized.match(weekPattern))) {
    const weeks = parseNumber(match[1]);
    return weeks * 7 * 24 * 60 * 60 * 1000;
  }
  if ((match = normalized.match(dayPattern))) {
    const days = parseNumber(match[1]);
    return days * 24 * 60 * 60 * 1000;
  }
  if ((match = normalized.match(hourPattern))) {
    const hours = parseNumber(match[1]);
    return hours * 60 * 60 * 1000;
  }

  // If no pattern matches, default to 1 week
  return 7 * 24 * 60 * 60 * 1000;
}

export class PKR {
  #uuid;
  #name;
  #kind;
  #publicKey;
  #minter;
  #expiresAt;

  /**
   * @param {Object} options - Constructor options
   * @param {string} options.uuid - UUID string
   * @param {string} [options.name] - Optional name
   * @param {string} options.kind - Principal kind
   * @param {symbol} options.publicKey - Public key symbol
   * @param {symbol} [options.minter] - Optional minter key
   * @param {string} [options.expiration='1 week'] - Expiration time (e.g., "3 hours", "three days", "one week")
   */
  constructor({ uuid, name, kind, publicKey, minter, expiration = '1 week' }) {
    if (!uuid || typeof uuid !== 'string')
      throw new TypeError('PKR: uuid must be a non-empty string');
    if (typeof kind !== 'string')
      throw new TypeError('PKR: kind must be a string');
    if (typeof publicKey !== 'symbol')
      throw new TypeError('PKR: publicKey must be a symbol');
    if (minter !== undefined && typeof minter !== 'symbol')
      throw new TypeError('PKR: minter must be a Symbol if provided');

    this.#uuid = uuid;
    this.#name = name || null;
    this.#kind = kind;
    this.#publicKey = publicKey;
    this.#minter = minter || null;

    // Compute expiration time from input
    const now = Date.now();
    const expirationMs = parseExpiration(expiration);
    this.#expiresAt = new Date(now + expirationMs);

    Object.freeze(this);
  }

  // ---- Getters ----

  get uuid() { return this.#uuid; }
  get name() { return this.#name; }
  get kind() { return this.#kind; }
  get publicKey() { return this.#publicKey; }

  // ---- Kernel Verification ----

  isMinter(key) {
    if (typeof key !== 'symbol')
      throw new TypeError('isMinter: key must be a Symbol');
    return this.#minter === key;
  }

  // ---- Expiry ----

  /**
   * Returns true if this PKR is expired (based on configured expiration time).
   */
  isExpired() {
    return Date.now() > this.#expiresAt.getTime();
  }

  // ---- Combined Validity ----

  /**
   * Returns true if PKR is minted by the given key and not expired.
   */
  isValid(key) {
    return !this.isExpired() && this.isMinter(key);
  }

  // ---- Conversion / Serialization ----

  toJSON() {
    return {
      uuid: this.#uuid,
      name: this.#name,
      kind: this.#kind,
      publicKey: this.#publicKey.toString(),
      expiresAt: this.#expiresAt.toISOString()
    };
  }

  toString() {
    return `[PKR ${this.#kind}:${this.#name || this.#uuid}]`;
  }

  equals(other) {
    return !!other && other instanceof PKR && this.#uuid === other.uuid;
  }
}

