import { describe, it, expect, vi, beforeEach } from 'vitest';

const hoisted = vi.hoisted(() => {
  class BaseSubsystemMock {
    constructor(name, options = {}) {
      this.name = name;
      this.options = options;
      this.find = vi.fn();
    }
  }

  return {
    BaseSubsystemMock,
  };
});

vi.mock('../../models/base-subsystem/base.subsystem.mycelia.js', () => ({
  BaseSubsystem: hoisted.BaseSubsystemMock,
}));

vi.mock('../../models/profiler/performance-entry.mycelia.js', () => ({
  PerformanceEntry: vi.fn().mockImplementation((name, startTime, endTime, metadata, category) => ({
    getName: () => name,
    getStartTime: () => startTime,
    getEndTime: () => endTime,
    getDuration: () => endTime ? endTime - startTime : null,
    isComplete: () => endTime !== null,
    finish: vi.fn(function(endTime) {
      this.getEndTime = () => endTime || Date.now();
      this.getDuration = () => (endTime || Date.now()) - startTime;
      this.isComplete = () => true;
    }),
    getMetadata: () => metadata || {},
    updateMetadata: vi.fn(function(newMetadata) {
      this.getMetadata = () => ({ ...metadata, ...newMetadata });
    }),
    getCategory: () => category || 'operation',
    toJSON: () => ({ name, startTime, endTime, duration: endTime ? endTime - startTime : null })
  }))
}));

vi.mock('../../models/profiler/profiler.utils.mycelia.js', () => ({
  timeAsync: vi.fn(async (name, fn) => {
    const start = Date.now();
    const result = await fn();
    const end = Date.now();
    return {
      result,
      entry: {
        getName: () => name,
        getDuration: () => end - start,
        isComplete: () => true
      }
    };
  }),
  timeSync: vi.fn((name, fn) => {
    const start = Date.now();
    const result = fn();
    const end = Date.now();
    return {
      result,
      entry: {
        getName: () => name,
        getDuration: () => end - start,
        isComplete: () => true
      }
    };
  }),
  generateTextReport: vi.fn((report) => `Report for ${report.getEntryCount()} entries`)
}));

import { useProfiler } from '../profiler/use-profiler.mycelia.js';

describe('useProfiler', () => {
  let subsystem;
  let profilerFacet;

  beforeEach(() => {
    subsystem = {
      name: 'test-subsystem',
      find: vi.fn()
    };

    const ctx = {
      config: {
        profiler: {
          enabled: true,
          maxEntries: 1000
        }
      },
      debug: false
    };

    const api = {
      name: 'test-subsystem',
      __facets: {}
    };

    const facet = useProfiler(ctx, api, subsystem);
    // The facet is attached, so we can access it via subsystem.profiler
    // But in the test, we'll just use the facet directly
    profilerFacet = facet;
  });

  it('creates profiler facet', () => {
    expect(profilerFacet).toBeDefined();
    expect(typeof profilerFacet.start).toBe('function');
    expect(typeof profilerFacet.finish).toBe('function');
    expect(typeof profilerFacet.time).toBe('function');
    expect(typeof profilerFacet.getReport).toBe('function');
  });

  it('starts and finishes timing', () => {
    const entryId = profilerFacet.start('test-operation', { traceId: 'test' });
    
    expect(entryId).toBeDefined();
    expect(typeof entryId).toBe('string');
    
    const entry = profilerFacet.finish(entryId, { additional: 'data' });
    
    expect(entry).toBeDefined();
    expect(entry.getName()).toBe('test-operation');
  });

  it('times async operations', async () => {
    const fn = vi.fn().mockResolvedValue('result');
    
    const result = await profilerFacet.time('async-op', fn, { metadata: 'test' });
    
    expect(result).toBe('result');
    expect(fn).toHaveBeenCalled();
    
    const entries = profilerFacet.getEntries();
    expect(entries.length).toBeGreaterThan(0);
  });

  it('times sync operations', () => {
    const fn = vi.fn().mockReturnValue('result');
    
    const result = profilerFacet.timeSync('sync-op', fn);
    
    expect(result).toBe('result');
    expect(fn).toHaveBeenCalled();
    
    const entries = profilerFacet.getEntries();
    expect(entries.length).toBeGreaterThan(0);
  });

  it('generates performance report', () => {
    profilerFacet.start('op1', {}, 'category1');
    profilerFacet.start('op2', {}, 'category2');
    
    const report = profilerFacet.getReport();
    
    expect(report).toBeDefined();
    expect(typeof report.getEntryCount).toBe('function');
  });

  it('identifies bottlenecks', () => {
    // Add some entries
    const id1 = profilerFacet.start('fast-op');
    profilerFacet.finish(id1);
    
    const id2 = profilerFacet.start('slow-op');
    // Simulate slow operation by waiting
    setTimeout(() => {
      profilerFacet.finish(id2);
    }, 10);
    
    const bottlenecks = profilerFacet.getBottlenecks(5);
    
    expect(Array.isArray(bottlenecks)).toBe(true);
  });

  it('clears entries', () => {
    const id = profilerFacet.start('test');
    profilerFacet.finish(id);
    
    expect(profilerFacet.getEntries().length).toBeGreaterThan(0);
    
    profilerFacet.clear();
    
    expect(profilerFacet.getEntries().length).toBe(0);
  });

  it('can be enabled/disabled', () => {
    expect(profilerFacet.isEnabled()).toBe(true);
    
    profilerFacet.setEnabled(false);
    expect(profilerFacet.isEnabled()).toBe(false);
    
    const entryId = profilerFacet.start('test');
    expect(entryId).toBeNull();
    
    profilerFacet.setEnabled(true);
    expect(profilerFacet.isEnabled()).toBe(true);
  });

  it('filters entries by name', () => {
    const id1 = profilerFacet.start('operation1');
    profilerFacet.finish(id1);
    
    const id2 = profilerFacet.start('operation2');
    profilerFacet.finish(id2);
    
    const entries = profilerFacet.getEntriesByName('operation1');
    expect(entries.every(e => e.getName() === 'operation1')).toBe(true);
  });

  it('filters entries by category', () => {
    const id1 = profilerFacet.start('op1', {}, 'category1');
    profilerFacet.finish(id1);
    
    const id2 = profilerFacet.start('op2', {}, 'category2');
    profilerFacet.finish(id2);
    
    const entries = profilerFacet.getEntriesByCategory('category1');
    expect(entries.length).toBeGreaterThan(0);
  });
});

