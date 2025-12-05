import { describe, it, expect } from 'vitest';
import { PerformanceEntry } from '../performance-entry.mycelia.js';
import { PerformanceReport } from '../performance-report.mycelia.js';

describe('PerformanceReport', () => {
  describe('constructor', () => {
    it('creates an empty report', () => {
      const report = new PerformanceReport();
      
      expect(report.getEntryCount()).toBe(0);
      expect(report.getTotalDuration()).toBe(0);
    });

    it('creates a report with entries', () => {
      const entries = [
        new PerformanceEntry('op1', 1000, 1100),
        new PerformanceEntry('op2', 1200, 1300)
      ];
      const report = new PerformanceReport(entries);
      
      expect(report.getEntryCount()).toBe(2);
      expect(report.getTotalDuration()).toBe(300); // 1300 - 1000
    });
  });

  describe('addEntry', () => {
    it('adds an entry to the report', () => {
      const report = new PerformanceReport();
      const entry = new PerformanceEntry('test', 1000, 1100);
      
      report.addEntry(entry);
      
      expect(report.getEntryCount()).toBe(1);
      expect(report.getEntries()).toContain(entry);
    });

    it('updates time range when adding entries', () => {
      const baseTime = 1000000; // Fixed base time for predictable test
      const report = new PerformanceReport([], { startTime: baseTime, endTime: baseTime });
      report.addEntry(new PerformanceEntry('op1', baseTime + 1000, baseTime + 1100));
      report.addEntry(new PerformanceEntry('op2', baseTime + 1200, baseTime + 1500));
      
      // Time range should be from first entry start (baseTime + 1000) to last entry end (baseTime + 1500)
      expect(report.getTotalDuration()).toBe(500); // (baseTime + 1500) - (baseTime + 1000)
    });

    it('throws error for invalid entry', () => {
      const report = new PerformanceReport();
      
      expect(() => {
        report.addEntry({});
      }).toThrow('entry must be a PerformanceEntry instance');
    });
  });

  describe('getOperationStats', () => {
    it('returns statistics for an operation', () => {
      const entries = [
        new PerformanceEntry('op1', 1000, 1100), // 100ms
        new PerformanceEntry('op1', 1200, 1350), // 150ms
        new PerformanceEntry('op1', 1400, 1500)  // 100ms
      ];
      const report = new PerformanceReport(entries);
      
      const stats = report.getOperationStats('op1');
      
      expect(stats).toBeDefined();
      expect(stats.name).toBe('op1');
      expect(stats.count).toBe(3);
      expect(stats.average).toBeCloseTo(116.67, 1);
      expect(stats.min).toBe(100);
      expect(stats.max).toBe(150);
      expect(stats.median).toBe(100);
    });

    it('returns null for non-existent operation', () => {
      const report = new PerformanceReport();
      expect(report.getOperationStats('nonexistent')).toBeNull();
    });
  });

  describe('identifyBottlenecks', () => {
    it('identifies slowest operations', () => {
      const entries = [
        new PerformanceEntry('fast', 1000, 1050),   // 50ms
        new PerformanceEntry('slow', 1100, 1200),   // 100ms
        new PerformanceEntry('fast', 1300, 1330),    // 30ms
        new PerformanceEntry('slow', 1400, 1520)   // 120ms
      ];
      const report = new PerformanceReport(entries);
      
      const bottlenecks = report.identifyBottlenecks(2);
      
      expect(bottlenecks.length).toBe(2);
      expect(bottlenecks[0].operation).toBe('slow');
      expect(bottlenecks[0].averageDuration).toBe(110); // (100 + 120) / 2
      expect(bottlenecks[1].operation).toBe('fast');
    });

    it('respects limit parameter', () => {
      const entries = Array.from({ length: 5 }, (_, i) => 
        new PerformanceEntry(`op${i}`, 1000 + i * 100, 1100 + i * 100)
      );
      const report = new PerformanceReport(entries);
      
      const bottlenecks = report.identifyBottlenecks(3);
      
      expect(bottlenecks.length).toBe(3);
    });

    it('filters by threshold', () => {
      const entries = [
        new PerformanceEntry('op1', 1000, 1050),  // 50ms
        new PerformanceEntry('op2', 1100, 1200),  // 100ms
        new PerformanceEntry('op3', 1300, 1400)   // 100ms
      ];
      const report = new PerformanceReport(entries);
      
      const bottlenecks = report.identifyBottlenecks(10, 75); // Threshold: 75ms
      
      expect(bottlenecks.length).toBe(2);
      expect(bottlenecks.every(b => b.averageDuration >= 75)).toBe(true);
    });
  });

  describe('getSlowestEntries', () => {
    it('returns slowest entries sorted by duration', () => {
      const entries = [
        new PerformanceEntry('op1', 1000, 1050),  // 50ms
        new PerformanceEntry('op2', 1100, 1200),  // 100ms
        new PerformanceEntry('op3', 1300, 1350)   // 50ms
      ];
      const report = new PerformanceReport(entries);
      
      const slowest = report.getSlowestEntries(2);
      
      expect(slowest.length).toBe(2);
      expect(slowest[0].getName()).toBe('op2');
      expect(slowest[0].getDuration()).toBe(100);
    });
  });

  describe('getSummary', () => {
    it('generates summary statistics', () => {
      const entries = [
        new PerformanceEntry('op1', 1000, 1100),
        new PerformanceEntry('op2', 1200, 1300)
      ];
      const report = new PerformanceReport(entries, { subsystem: 'test' });
      
      const summary = report.getSummary();
      
      expect(summary.totalEntries).toBe(2);
      expect(summary.completedEntries).toBe(2);
      expect(summary.operationCount).toBe(2);
      expect(summary.metadata.subsystem).toBe('test');
    });
  });

  describe('clear', () => {
    it('clears all entries', () => {
      const entries = [
        new PerformanceEntry('op1', 1000, 1100),
        new PerformanceEntry('op2', 1200, 1300)
      ];
      const report = new PerformanceReport(entries);
      
      report.clear();
      
      expect(report.getEntryCount()).toBe(0);
      expect(report.getTotalDuration()).toBe(0);
    });
  });
});

