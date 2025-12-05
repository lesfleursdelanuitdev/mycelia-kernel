import { describe, it, expect, vi, beforeEach } from 'vitest';

const hoisted = vi.hoisted(() => {
  class BaseSubsystemMock {
    constructor(name, options = {}) {
      this.name = name;
      this.options = options;
      this.use = vi.fn().mockReturnThis();
      this.onInit = vi.fn();
      this.find = vi.fn().mockReturnValue(null);
    }
  }

  return { BaseSubsystemMock };
});

vi.mock('../../base-subsystem/base.subsystem.mycelia.js', () => ({
  BaseSubsystem: hoisted.BaseSubsystemMock,
}));

vi.mock('../../../hooks/bounded-error-store/use-bounded-error-store.mycelia.js', () => ({
  useBoundedErrorStore: vi.fn(),
}));

vi.mock('../../../hooks/error-classifier/use-error-classifier.mycelia.js', () => ({
  useErrorClassifier: vi.fn(),
}));

vi.mock('./error-record.mycelia.js', () => ({
  ErrorRecord: {},
  ERROR_TYPES: { SIMPLE: 'simple' },
}));

const ResultMock = {
  ok: vi.fn((data) => ({ success: true, data })),
  fail: vi.fn((code, message, meta) => ({ success: false, code, message, meta })),
};

vi.mock('../../result/result.mycelia.js', () => ({
  Result: ResultMock,
}));

import { ErrorManagerSubsystem } from '../error-manager.subsystem.mycelia.js';

describe('ErrorManagerSubsystem', () => {
  let ems;
  let classifyMock;
  let recordMock;

  beforeEach(() => {
    vi.clearAllMocks();
    ems = new ErrorManagerSubsystem('error-manager', { ms: {} });
    classifyMock = vi.fn().mockReturnValue({
      toRecord: vi.fn().mockReturnValue({ id: 'record' }),
    });
    recordMock = {
      type: 'simple',
      subsystem: 'canvas',
      toRecord: vi.fn().mockReturnValue({ id: 'record' }),
    };
    ems.errorClassifier = { classify: classifyMock };
    ems.boundedErrorStore = {
      add: vi.fn(),
      recent: vi.fn().mockReturnValue([recordMock]),
      clear: vi.fn(),
      size: 2,
    };
    ems.find = vi.fn((kind) => {
      if (kind === 'listeners') {
        return {
          listeners: { emit: vi.fn() },
        };
      }
      return null;
    });
  });

  it('records errors via classifier and emits events', () => {
    const result = ems.record({ message: 'boom' }, { ctx: true });
    expect(classifyMock).toHaveBeenCalled();
    expect(ems.boundedErrorStore.add).toHaveBeenCalled();
    expect(result.success).toBe(true);
  });

  it('handles classifier failures gracefully', () => {
    classifyMock.mockImplementation(() => {
      throw new Error('nope');
    });
    const result = ems.record({}, {});
    expect(result).toEqual(
      expect.objectContaining({
        success: false,
        message: 'nope',
      }),
    );
  });

  it('queries recent errors with filters', () => {
    const result = ems.queryRecent({ type: 'simple', subsystem: 'canvas' });
    expect(result.data.count).toBe(1);
    expect(ems.boundedErrorStore.recent).toHaveBeenCalledWith(50);
  });

  it('summarizes errors and clears store', () => {
    const summary = ems.summary({ limit: 10 });
    expect(summary.data.byType.simple).toBe(1);
    expect(summary.data.bySubsystem.canvas).toBe(1);
    ems.clear();
    expect(ems.boundedErrorStore.clear).toHaveBeenCalled();
    expect(ems.size()).toBe(2);
  });
});

