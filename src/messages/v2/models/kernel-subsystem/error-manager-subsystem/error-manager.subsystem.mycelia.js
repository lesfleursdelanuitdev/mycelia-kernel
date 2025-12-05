import { BaseSubsystem } from '../../base-subsystem/base.subsystem.mycelia.js';
import { useBoundedErrorStore } from '../../../hooks/bounded-error-store/use-bounded-error-store.mycelia.js';
import { useErrorClassifier } from '../../../hooks/error-classifier/use-error-classifier.mycelia.js';
import { useRouter } from '../../../hooks/router/use-router.mycelia.js';
import { useListeners } from '../../../hooks/listeners/use-listeners.mycelia.js';
import { ErrorRecord, ERROR_TYPES } from './error-record.mycelia.js';
import { Result } from '../../result/result.mycelia.js';

/**
 * ErrorManagerSubsystem
 * ---------------------
 * Kernel subsystem responsible for:
 * - Recording normalized error events
 * - Providing query APIs over recent errors
 * - Emitting notifications via listeners (if configured)
 *
 * Installed hooks:
 * - useBoundedErrorStore (kind: boundedErrorStore)
 * - useErrorClassifier (kind: errorClassifier)
 */
export class ErrorManagerSubsystem extends BaseSubsystem {
  constructor(name = 'error-manager', options = {}) {
    super(name, options);

    // Core error management facets
    this.use(useRouter);
    this.use(useListeners);
    this.use(useBoundedErrorStore);
    this.use(useErrorClassifier);

    this.onInit(async () => {
      const router = this.find('router');
      const listeners = this.find('listeners');
      const errorStoreFacet = this.find('boundedErrorStore');

      if (!router) throw new Error('ErrorManagerSubsystem requires router facet');
      if (!listeners) throw new Error('ErrorManagerSubsystem requires listeners facet');
      if (!errorStoreFacet)
        throw new Error('ErrorManagerSubsystem requires boundedErrorStore facet (useBoundedErrorStore)');

      // ---- Record route ----
      router.registerRoute(
        'kernel://error/record/:type',
        async (message, params) => this.#handleRecordRoute(message, params),
        { meta: { description: 'Record an error event' } }
      );

      // ---- Query routes ----
      router.registerRoute(
        'kernel://error/query/recent',
        async (message) => this.#handleQueryRecentRoute(message),
        { meta: { description: 'Query recent errors' } }
      );

      router.registerRoute(
        'kernel://error/query/by-type/:type',
        async (message, params) => this.#handleQueryByTypeRoute(message, params),
        { meta: { description: 'Query errors by type' } }
      );

      router.registerRoute(
        'kernel://error/query/summary',
        async (message) => this.#handleQuerySummaryRoute(message),
        { meta: { description: 'Get error summary counts' } }
      );

      // Enable listeners for broadcasted error events
      if (listeners && typeof listeners.enableListeners === 'function') {
        listeners.enableListeners();
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Convenience accessors
  // ---------------------------------------------------------------------------

  get errorStore() {
    return this.boundedErrorStore;
  }

  get store() {
    return this.boundedErrorStore?._store;
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * Record and classify an error.
   * @param {*} errorLike - Error, ErrorRecord, string, or object
   * @param {object} [context={}] - Additional classification context
   * @returns {Object} Result object with success and data
   */
  record(errorLike, context = {}) {
    try {
      const record = this.errorClassifier.classify(errorLike, context);
      this.boundedErrorStore.add(record);
      
      const listeners = this.find('listeners');
      if (listeners?.listeners?.emit) {
        listeners.listeners.emit('kernel://error/event/recorded', record);
      }
      
      return Result.ok(record.toRecord());
    } catch (error) {
      return Result.fail('record_error', error.message || 'Failed to record error', { error: error.toString() });
    }
  }

  /**
   * Query recent errors
   * @param {Object} [opts={}] - Query options
   * @param {number} [opts.limit=50] - Maximum number of records to return
   * @param {string} [opts.type] - Filter by error type
   * @param {string} [opts.subsystem] - Filter by subsystem
   * @returns {Object} Result object with success and data
   */
  queryRecent(opts = {}) {
    try {
      const { limit = 50, type, subsystem } = opts;
      const all = this.boundedErrorStore.recent(limit);
      const filtered = all.filter((r) => {
        if (type && r.type !== type) return false;
        if (subsystem && r.subsystem !== subsystem) return false;
        return true;
      });
      
      return Result.ok({
        count: filtered.length,
        errors: filtered.map((r) => r.toRecord())
      });
    } catch (error) {
      return Result.fail('query_error', error.message || 'Failed to query recent errors', { error: error.toString() });
    }
  }

  /**
   * Query errors by type
   * @param {string} type - Error type to filter by
   * @param {Object} [opts={}] - Query options
   * @param {number} [opts.limit=100] - Maximum number of records to return
   * @returns {Object} Result object with success and data
   */
  queryByType(type, opts = {}) {
    try {
      const { limit = 100 } = opts;
      const result = this.queryRecent({ limit, type });
      return result;
    } catch (error) {
      return Result.fail('query_error', error.message || 'Failed to query errors by type', { error: error.toString() });
    }
  }

  /**
   * Get error summary
   * @param {Object} [opts={}] - Summary options
   * @param {number} [opts.limit=500] - Maximum number of records to analyze
   * @returns {Object} Result object with success and data
   */
  summary(opts = {}) {
    try {
      const { limit = 500 } = opts;
      const recent = this.boundedErrorStore.recent(limit);
      const byType = new Map();
      const bySubsystem = new Map();

      for (const r of recent) {
        byType.set(r.type, (byType.get(r.type) || 0) + 1);
        const key = r.subsystem || '(unknown)';
        bySubsystem.set(key, (bySubsystem.get(key) || 0) + 1);
      }

      return Result.ok({
        limit,
        count: recent.length,
        byType: Object.fromEntries(byType),
        bySubsystem: Object.fromEntries(bySubsystem)
      });
    } catch (error) {
      return Result.fail('summary_error', error.message || 'Failed to generate error summary', { error: error.toString() });
    }
  }

  /**
   * Clear all error records
   * @returns {Object} Result object with success
   */
  clear() {
    try {
      this.boundedErrorStore.clear();
      return Result.ok({ cleared: true });
    } catch (error) {
      return Result.fail('clear_error', error.message || 'Failed to clear error store', { error: error.toString() });
    }
  }

  /**
   * Get current store size
   * @returns {number} Current number of error records
   */
  size() {
    return this.boundedErrorStore.size;
  }

  // ---------------------------------------------------------------------------
  // Route handlers
  // ---------------------------------------------------------------------------

  async #handleRecordRoute(message, params = {}) {
    try {
      const pathType = params.type;
      const payload = message.payload || {};
      const context = {
        type: pathType || payload.type,
        messageSubsystem: payload.subsystem || message.meta?.subsystem,
        path: message.path,
        data: payload,
        cause: payload.cause,
        meta: message.meta || {}
      };

      const result = this.record(payload, context);
      return result;
    } catch (error) {
      return Result.fail('route_error', error.message || 'Failed to handle record route', { error: error.toString() });
    }
  }

  async #handleQueryRecentRoute(message) {
    try {
      const { limit, type, subsystem } = message.payload || {};
      const result = this.queryRecent({ limit, type, subsystem });
      return result;
    } catch (error) {
      return Result.fail('route_error', error.message || 'Failed to handle query recent route', { error: error.toString() });
    }
  }

  async #handleQueryByTypeRoute(message, params = {}) {
    try {
      const type = params.type || message.payload?.type || ERROR_TYPES.SIMPLE;
      const { limit } = message.payload || {};
      const result = this.queryByType(type, { limit });
      return result;
    } catch (error) {
      return Result.fail('route_error', error.message || 'Failed to handle query by type route', { error: error.toString() });
    }
  }

  async #handleQuerySummaryRoute(message) {
    try {
      const { limit } = message.payload || {};
      const result = this.summary({ limit });
      return result;
    } catch (error) {
      return Result.fail('route_error', error.message || 'Failed to handle query summary route', { error: error.toString() });
    }
  }
}
