/**
 * useErrorClassifier Hook
 * 
 * Installs an `errorClassifier` facet that provides a single `classify` method.
 * 
 * Responsibilities:
 * - Normalize arbitrary "error-like" inputs into a consistent ErrorRecord
 * - Merge ad-hoc context (subsystem, path, meta, etc.) into the record
 * - Apply reasonable defaults for type, severity, and message
 * 
 * Usage (inside ErrorManagerSubsystem, after build):
 * 
 * const classified = this.errorClassifier.classify(errorLike, {
 *   messageSubsystem: 'kernel',
 *   path: 'kernel://error/record/generic',
 *   meta: { extra: true }
 * });
 */
import { createHook } from '../create-hook.mycelia.js';
import { Facet } from '../../models/facet-manager/facet.mycelia.js';
import { ErrorRecord, ERROR_TYPES, ERROR_SEVERITY } from '../../models/kernel-subsystem/error-manager-subsystem/error-record.mycelia.js';

export const useErrorClassifier = createHook({
  kind: 'errorClassifier',
  version: '1.0.0',
  overwrite: false,
  required: [],
  attach: true,
  source: import.meta.url,
  // eslint-disable-next-line no-unused-vars
  fn: (ctx, api, subsystem) => {
    /**
     * classify(errorLike, context)
     * ----------------------------
     * Normalize arbitrary inputs into an ErrorRecord.
     *
     * @param {*} errorLike - Any error-like object: ErrorRecord, Error, string, plain object, etc.
     * @param {Object} [context={}] - Extra classification context
     * @param {string|null} [context.messageSubsystem=null] - Name of the subsystem that originated the message
     * @param {string|null} [context.path=null] - Path associated with the error (e.g. message path)
     * @param {*} [context.data=undefined] - Payload/data to attach (falls back to errorLike)
     * @param {*} [context.cause=null] - Underlying cause (Error or other value)
     * @param {Object} [context.meta={}] - Additional metadata merged into ErrorRecord.metadata
     * @param {string} [context.type] - Optional override for error type
     * @param {string} [context.severity] - Optional override for severity
     * @param {string|number} [context.code] - Optional override for error code
     *
     * @returns {ErrorRecord}
     */
    function classify(errorLike, context = {}) {
      // Fast path: already an ErrorRecord
      if (errorLike instanceof ErrorRecord) {
        return errorLike;
      }

      // If ErrorRecord exposes a static `from`, let it handle the heavy lifting
      if (ErrorRecord.from && typeof ErrorRecord.from === 'function') {
        // We pass context as a second arg in case `from` supports overrides.
        // If it doesn't, the extra argument will simply be ignored.
        return ErrorRecord.from(errorLike, context);
      }

      // Destructure context with the corrected name (no shadowing `subsystem`)
      const {
        messageSubsystem = null,
        path = null,
        data = undefined,
        cause = null,
        meta = {},
        type: contextType,
        severity: contextSeverity,
        code: contextCode
      } = context;

      // ---- Type inference ----
      const rawType =
        errorLike?.type ??
        contextType ??
        null;

      // If rawType matches a known ERROR_TYPES value, keep it; otherwise fallback.
      const type =
        rawType && Object.values(ERROR_TYPES).includes(rawType)
          ? rawType
          : (rawType || ERROR_TYPES.SIMPLE);

      // ---- Severity inference ----
      const severity =
        errorLike?.severity ??
        contextSeverity ??
        (type === ERROR_TYPES.AUTH_FAILED ? ERROR_SEVERITY.WARN : ERROR_SEVERITY.ERROR);

      // ---- Code ----
      const code =
        errorLike?.code ??
        contextCode ??
        null;

      // ---- Message ----
      const message =
        errorLike?.message ??
        errorLike?.msg ??
        (typeof errorLike === 'string'
          ? errorLike
          : String(errorLike ?? 'Unknown error'));

      // ---- Subsystem ----
      const subsystemName =
        messageSubsystem ??
        meta.subsystem ??
        errorLike?.subsystem ??
        null;

      // ---- Path ----
      const pathValue =
        path ??
        meta.path ??
        errorLike?.path ??
        null;

      // ---- Data / payload ----
      const dataValue =
        data !== undefined
          ? data
          : (errorLike?.data ?? errorLike);

      // ---- Cause ----
      const causeValue =
        cause ??
        errorLike?.cause ??
        null;

      // ---- Meta merge ----
      // Put code, message, path, data, and cause into metadata since ErrorRecord only accepts metadata
      const metaValue = {
        ...(errorLike && typeof errorLike === 'object' && 'meta' in errorLike
          ? errorLike.meta
          : {}),
        ...meta,
        ...(code !== null ? { code } : {}),
        ...(message ? { message } : {}),
        ...(pathValue !== null ? { path } : {}),
        ...(dataValue !== undefined ? { data: dataValue } : {}),
        ...(causeValue !== null ? { cause: causeValue } : {})
      };

      // Validate subsystem is provided
      if (!subsystemName) {
        throw new TypeError('ErrorClassifier.classify: subsystem is required (provide via messageSubsystem, meta.subsystem, or errorLike.subsystem)');
      }

      return new ErrorRecord({
        type,
        severity,
        subsystem: subsystemName,
        timestamp: new Date(),
        metadata: metaValue
      });
    }

    // Attach as a facet so ErrorManagerSubsystem gets `this.errorClassifier`
    return new Facet('errorClassifier', {
      attach: true,
      source: import.meta.url
    }).add({
      classify
    });
  }
});

