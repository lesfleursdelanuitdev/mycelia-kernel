import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MessageSystem } from '../../models/message-system/message-system.v2.mycelia.js';
import { BaseSubsystem } from '../../models/base-subsystem/base.subsystem.mycelia.js';
import { createCanonicalDefaultHooks } from '../../models/defaults/default-hooks.mycelia.js';
import { useProfiler } from '../../hooks/profiler/use-profiler.mycelia.js';

describe('useProfiler Integration', () => {
  let messageSystem;
  let subsystem;

  beforeEach(async () => {
    messageSystem = new MessageSystem('test-ms');
    await messageSystem.bootstrap();

    subsystem = new BaseSubsystem('test-service', {
      ms: messageSystem,
      defaultHooks: createCanonicalDefaultHooks(),
      config: {
        profiler: {
          enabled: true,
          maxEntries: 1000
        }
      }
    });

    await subsystem
      .use(useProfiler)
      .build();
  });

  afterEach(async () => {
    if (subsystem) {
      await subsystem.dispose();
    }
    if (messageSystem) {
      await messageSystem.dispose();
    }
  });

  it('creates profiler facet on subsystem', () => {
    const profiler = subsystem.find('profiler');
    expect(profiler).toBeDefined();
    expect(typeof profiler.start).toBe('function');
    expect(typeof profiler.finish).toBe('function');
    expect(typeof profiler.time).toBe('function');
  });

  it('times async operations', async () => {
    const profiler = subsystem.find('profiler');
    
    const result = await profiler.time('async-operation', async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
      return 'result';
    });
    
    expect(result).toBe('result');
    
    const entries = profiler.getEntries();
    expect(entries.length).toBe(1);
    expect(entries[0].getName()).toBe('async-operation');
    expect(entries[0].isComplete()).toBe(true);
    expect(entries[0].getDuration()).toBeGreaterThanOrEqual(10);
  });

  it('times sync operations', () => {
    const profiler = subsystem.find('profiler');
    
    const result = profiler.timeSync('sync-operation', () => {
      // Simulate some work
      let sum = 0;
      for (let i = 0; i < 1000; i++) {
        sum += i;
      }
      return sum;
    });
    
    expect(result).toBe(499500);
    
    const entries = profiler.getEntries();
    expect(entries.length).toBe(1);
    expect(entries[0].getName()).toBe('sync-operation');
    expect(entries[0].isComplete()).toBe(true);
  });

  it('tracks multiple operations', async () => {
    const profiler = subsystem.find('profiler');
    
    await profiler.time('op1', async () => {
      await new Promise(resolve => setTimeout(resolve, 5));
    });
    
    await profiler.time('op2', async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
    });
    
    const entries = profiler.getEntries();
    expect(entries.length).toBe(2);
    expect(entries.some(e => e.getName() === 'op1')).toBe(true);
    expect(entries.some(e => e.getName() === 'op2')).toBe(true);
  });

  it('identifies bottlenecks', async () => {
    const profiler = subsystem.find('profiler');
    
    // Create multiple operations with different durations
    await profiler.time('fast-op', async () => {
      await new Promise(resolve => setTimeout(resolve, 5));
    });
    
    await profiler.time('slow-op', async () => {
      await new Promise(resolve => setTimeout(resolve, 20));
    });
    
    await profiler.time('fast-op', async () => {
      await new Promise(resolve => setTimeout(resolve, 5));
    });
    
    const bottlenecks = profiler.getBottlenecks(5);
    
    expect(bottlenecks.length).toBeGreaterThan(0);
    // Slow-op should be the top bottleneck
    expect(bottlenecks[0].operation).toBe('slow-op');
    expect(bottlenecks[0].averageDuration).toBeGreaterThan(15);
  });

  it('generates performance report', async () => {
    const profiler = subsystem.find('profiler');
    
    await profiler.time('operation1', async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
    });
    
    await profiler.time('operation2', async () => {
      await new Promise(resolve => setTimeout(resolve, 15));
    });
    
    const report = profiler.getReport();
    
    expect(report).toBeDefined();
    expect(report.getEntryCount()).toBe(2);
    expect(report.getTotalDuration()).toBeGreaterThan(0);
    
    const stats = report.getSummary();
    expect(stats.totalEntries).toBe(2);
    expect(stats.operationCount).toBe(2);
  });

  it('generates text report', async () => {
    const profiler = subsystem.find('profiler');
    
    await profiler.time('test-op', async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
    });
    
    const textReport = profiler.getTextReport();
    
    expect(typeof textReport).toBe('string');
    expect(textReport).toContain('Performance Report');
    expect(textReport).toContain('test-op');
  });

  it('filters entries by name', async () => {
    const profiler = subsystem.find('profiler');
    
    await profiler.time('operation-a', async () => {});
    await profiler.time('operation-b', async () => {});
    await profiler.time('operation-a', async () => {});
    
    const entries = profiler.getEntriesByName('operation-a');
    
    expect(entries.length).toBe(2);
    expect(entries.every(e => e.getName() === 'operation-a')).toBe(true);
  });

  it('filters entries by category', async () => {
    const profiler = subsystem.find('profiler');
    
    const id1 = profiler.start('op1', {}, 'message');
    profiler.finish(id1);
    
    const id2 = profiler.start('op2', {}, 'route');
    profiler.finish(id2);
    
    const entries = profiler.getEntriesByCategory('message');
    
    expect(entries.length).toBe(1);
    expect(entries[0].getCategory()).toBe('message');
  });

  it('clears all entries', async () => {
    const profiler = subsystem.find('profiler');
    
    await profiler.time('op1', async () => {});
    await profiler.time('op2', async () => {});
    
    expect(profiler.getEntries().length).toBe(2);
    
    profiler.clear();
    
    expect(profiler.getEntries().length).toBe(0);
  });

  it('can be enabled and disabled', () => {
    const profiler = subsystem.find('profiler');
    
    expect(profiler.isEnabled()).toBe(true);
    
    profiler.setEnabled(false);
    expect(profiler.isEnabled()).toBe(false);
    
    const entryId = profiler.start('test');
    expect(entryId).toBeNull();
    
    profiler.setEnabled(true);
    expect(profiler.isEnabled()).toBe(true);
    
    const entryId2 = profiler.start('test');
    expect(entryId2).not.toBeNull();
  });

  it('tracks metadata in entries', async () => {
    const profiler = subsystem.find('profiler');
    
    const result = await profiler.time('op-with-metadata', async () => {
      return 'result';
    }, { traceId: 'test-trace', subsystem: 'test' });
    
    expect(result).toBe('result');
    
    const entries = profiler.getEntries();
    expect(entries.length).toBe(1);
    expect(entries[0].getMetadata().traceId).toBe('test-trace');
    expect(entries[0].getMetadata().subsystem).toBe('test');
  });

  it('handles start/finish pattern', () => {
    const profiler = subsystem.find('profiler');
    
    const entryId = profiler.start('manual-operation', { custom: 'data' }, 'custom');
    
    expect(entryId).toBeDefined();
    
    // Simulate some work
    const start = Date.now();
    while (Date.now() - start < 5) {
      // Busy wait
    }
    
    const entry = profiler.finish(entryId, { additional: 'metadata' });
    
    expect(entry).toBeDefined();
    expect(entry.getName()).toBe('manual-operation');
    expect(entry.getCategory()).toBe('custom');
    expect(entry.isComplete()).toBe(true);
    expect(entry.getMetadata().custom).toBe('data');
    expect(entry.getMetadata().additional).toBe('metadata');
  });
});



