/**
 * bounded-error-store.mycelia.js
 * ------------------------------
 * BoundedErrorStore
 *
 * A fixed-capacity, in-memory error store optimized for:
 * - appending new ErrorRecords
 * - querying recent errors with filters
 * - summarizing error types & severity
 *
 * This is intended to be used by ErrorManagerSubsystem as its primary
 * storage layer. It uses BoundedQueue internally for capacity management.
 */
import { ErrorRecord } from './error-record.mycelia.js';
import { BoundedQueue } from '../../../hooks/queue/bounded-queue.mycelia.js';

export class BoundedErrorStore {
  #queue; // BoundedQueue<ErrorRecord>
  #byId; // Map<id, ErrorRecord>

  /**
   * @param {number} [capacity=1000] - Maximum number of error records to retain.
   */
  constructor(capacity = 1000) {
    if (typeof capacity !== 'number' || !Number.isFinite(capacity) || capacity < 1) {
      throw new TypeError('BoundedErrorStore: capacity must be a positive number');
    }

    // Use BoundedQueue with 'drop-oldest' policy to automatically evict oldest records
    this.#queue = new BoundedQueue(capacity, 'drop-oldest');
    this.#byId = new Map();

    // Track dropped items to remove from byId map
    this.#queue.on('dropped', ({ item, reason }) => {
      if (reason === 'drop-oldest' && item instanceof ErrorRecord) {
        this.#byId.delete(item.id);
      }
    });
  }

  // -----------------------------------
  // Accessors
  // -----------------------------------

  /**
   * Current number of stored error records.
   * @returns {number}
   */
  get size() {
    return this.#queue.size();
  }

  /**
   * Maximum capacity of the store.
   * @returns {number}
   */
  get capacity() {
    return this.#queue.getCapacity();
  }

  /**
   * Returns an array of all error records (copy).
   * Oldest first, newest last.
   *
   * NOTE: for filtered queries, use list().
   *
   * @returns {ErrorRecord[]}
   */
  get all() {
    return this.#queue.peekAll();
  }

  // -----------------------------------
  // Core operations
  // -----------------------------------

  /**
   * Appends an error record to the store.
   * Accepts either an ErrorRecord instance or constructor params.
   *
   * Evicts the oldest record when capacity is exceeded (handled by BoundedQueue).
   *
   * @param {ErrorRecord|Object} recordOrParams
   * @returns {ErrorRecord} The stored ErrorRecord instance.
   */
  add(recordOrParams) {
    const record = recordOrParams instanceof ErrorRecord
      ? recordOrParams
      : new ErrorRecord(recordOrParams);

    // Enqueue the record (BoundedQueue handles capacity and eviction)
    const success = this.#queue.enqueue(record);
    if (!success) {
      // If enqueue failed (shouldn't happen with drop-oldest policy, but handle gracefully)
      throw new Error('BoundedErrorStore: failed to add error record');
    }

    // Track by ID
    this.#byId.set(record.id, record);

    return record;
  }

  /**
   * Retrieves an ErrorRecord by its ID.
   *
   * @param {string} id
   * @returns {ErrorRecord|null}
   */
  get(id) {
    return this.#byId.get(id) || null;
  }

  /**
   * Clears all stored error records.
   */
  clear() {
    this.#queue.clear();
    this.#byId.clear();
  }

  // -----------------------------------
  // Querying
  // -----------------------------------

  /**
   * Lists error records with optional filtering and limit.
   * By default returns all records (oldest → newest).
   *
   * @param {Object} [options={}]
   * @param {string|string[]} [options.type] - Error type(s) to include.
   * @param {string|string[]} [options.severity] - Severity level(s) to include.
   * @param {string|string[]} [options.subsystem] - Subsystem name(s) to include.
   * @param {Date|string|number} [options.since] - Only include records at or after this timestamp.
   * @param {number} [options.limit] - Max number of records to return (from newest backwards).
   * @returns {ErrorRecord[]} Matching records, oldest → newest (within the filtered range).
   */
  list(options = {}) {
    const {
      type,
      severity,
      subsystem,
      since,
      limit
    } = options;

    const typeSet = this.#normalizeFilterSet(type);
    const severitySet = this.#normalizeFilterSet(severity);
    const subsystemSet = this.#normalizeFilterSet(subsystem);
    const sinceTime = this.#normalizeSince(since);

    // Get all records from queue (oldest → newest)
    const records = this.#queue.peekAll();

    // We iterate from newest → oldest, collect, then reverse to chronological.
    const results = [];
    const max = typeof limit === 'number' && limit > 0 ? limit : Infinity;

    for (let i = records.length - 1; i >= 0; i--) {
      const rec = records[i];

      if (typeSet && !typeSet.has(rec.type)) continue;
      if (severitySet && !severitySet.has(rec.severity)) continue;
      if (subsystemSet && !subsystemSet.has(rec.subsystem)) continue;
      if (sinceTime !== null && rec.timestamp.getTime() < sinceTime) continue;

      results.push(rec);

      if (results.length >= max) break;
    }

    // Reverse to maintain oldest → newest within the filtered slice
    return results.reverse();
  }

  /**
   * Convenience: returns the N most recent error records.
   *
   * @param {number} [limit=50]
   * @returns {ErrorRecord[]} Newest first up to `limit`, but returned oldest → newest.
   */
  recent(limit = 50) {
    return this.list({ limit });
  }

  // -----------------------------------
  // Summary
  // -----------------------------------

  /**
   * Returns a summary of errors, optionally filtered by `since`.
   *
   * @param {Object} [options={}]
   * @param {Date|string|number} [options.since] - Only summarize errors at or after this timestamp.
   * @returns {Object} Summary object:
   * {
   *   total: number,
   *   byType: { [type]: number },
   *   bySeverity: { [severity]: number },
   *   firstTimestamp: string|null,
   *   lastTimestamp: string|null
   * }
   */
  summarize(options = {}) {
    const { since } = options;
    const sinceTime = this.#normalizeSince(since);

    let total = 0;
    const byType = Object.create(null);
    const bySeverity = Object.create(null);
    let first = null;
    let last = null;

    const records = this.#queue.peekAll();

    for (const rec of records) {
      const ts = rec.timestamp.getTime();

      if (sinceTime !== null && ts < sinceTime) continue;

      total += 1;
      byType[rec.type] = (byType[rec.type] || 0) + 1;
      bySeverity[rec.severity] = (bySeverity[rec.severity] || 0) + 1;

      if (!first || ts < first.getTime()) first = rec.timestamp;
      if (!last || ts > last.getTime()) last = rec.timestamp;
    }

    return {
      total,
      byType,
      bySeverity,
      firstTimestamp: first ? first.toISOString() : null,
      lastTimestamp: last ? last.toISOString() : null
    };
  }

  // -----------------------------------
  // Iteration
  // -----------------------------------

  /**
   * Default iterator: iterates ErrorRecords in insertion order (oldest → newest).
   */
  *[Symbol.iterator]() {
    const records = this.#queue.peekAll();
    for (const rec of records) {
      yield rec;
    }
  }

  // -----------------------------------
  // Internal helpers
  // -----------------------------------

  #normalizeFilterSet(value) {
    if (value == null) return null;

    if (Array.isArray(value)) {
      const s = new Set();
      for (const v of value) {
        if (v != null) s.add(String(v));
      }
      return s.size > 0 ? s : null;
    }

    return new Set([String(value)]);
  }

  #normalizeSince(since) {
    if (since == null) return null;

    if (since instanceof Date) return since.getTime();

    const t = new Date(since).getTime();
    return Number.isNaN(t) ? null : t;
  }
}

