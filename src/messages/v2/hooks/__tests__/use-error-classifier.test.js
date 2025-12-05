import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../models/kernel-subsystem/error-manager-subsystem/error-record.mycelia.js', () => {
  const ERROR_TYPES = { SIMPLE: 'simple', AUTH_FAILED: 'authFailed' };
  const ERROR_SEVERITY = { WARN: 'warn', ERROR: 'error' };
  const ErrorRecord = vi.fn(function ErrorRecord(params) {
    this.params = params;
  });
  ErrorRecord.from = undefined;
  return { ErrorRecord, ERROR_TYPES, ERROR_SEVERITY };
});

import { useErrorClassifier } from '../error-classifier/use-error-classifier.mycelia.js';
import { ErrorRecord } from '../../models/kernel-subsystem/error-manager-subsystem/error-record.mycelia.js';

const createFacet = () => {
  const ctx = { config: {} };
  const api = { name: 'kernel' };
  const subsystem = { name: 'kernel' };
  return useErrorClassifier(ctx, api, subsystem);
};

describe('useErrorClassifier', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    ErrorRecord.from = undefined;
  });

  it('delegates to ErrorRecord.from when available', () => {
    const facet = createFacet();
    ErrorRecord.from = vi.fn().mockReturnValue('classified');
    const result = facet.classify({ message: 'boom' }, { messageSubsystem: 'kernel' });
    expect(ErrorRecord.from).toHaveBeenCalledWith({ message: 'boom' }, { messageSubsystem: 'kernel' });
    expect(result).toBe('classified');
  });

  it('constructs ErrorRecord with inferred metadata', () => {
    const facet = createFacet();
    const record = facet.classify('failure', {
      messageSubsystem: 'kernel',
      path: 'kernel://test',
      meta: { extra: true },
      code: 'ERR_CUSTOM',
    });

    expect(record).toBeInstanceOf(ErrorRecord);
    expect(ErrorRecord).toHaveBeenCalledWith(expect.objectContaining({
      type: 'simple',
      severity: 'error',
      subsystem: 'kernel',
      metadata: expect.objectContaining({
        code: 'ERR_CUSTOM',
        path: 'kernel://test',
        message: 'failure',
        extra: true,
      }),
    }));
  });

  it('throws if subsystem cannot be determined', () => {
    const facet = createFacet();
    expect(() => facet.classify('boom')).toThrow(/subsystem is required/i);
  });
});

