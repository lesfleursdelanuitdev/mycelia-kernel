import { describe, it, expect } from 'vitest';
import { PerformanceEntry } from '../performance-entry.mycelia.js';

describe('PerformanceEntry', () => {
  describe('constructor', () => {
    it('creates an entry with valid parameters', () => {
      const startTime = Date.now();
      const entry = new PerformanceEntry('test-operation', startTime);
      
      expect(entry.getName()).toBe('test-operation');
      expect(entry.getStartTime()).toBe(startTime);
      expect(entry.getEndTime()).toBeNull();
      expect(entry.getDuration()).toBeNull();
      expect(entry.isComplete()).toBe(false);
    });

    it('creates a completed entry with end time', () => {
      const startTime = Date.now();
      const endTime = startTime + 100;
      const entry = new PerformanceEntry('test-operation', startTime, endTime);
      
      expect(entry.isComplete()).toBe(true);
      expect(entry.getEndTime()).toBe(endTime);
      expect(entry.getDuration()).toBe(100);
    });

    it('creates an entry with metadata and category', () => {
      const metadata = { traceId: 'test-trace', subsystem: 'test' };
      const entry = new PerformanceEntry('test-operation', Date.now(), null, metadata, 'message');
      
      expect(entry.getMetadata()).toEqual(metadata);
      expect(entry.getCategory()).toBe('message');
    });

    it('throws error for empty name', () => {
      expect(() => {
        new PerformanceEntry('', Date.now());
      }).toThrow('name must be a non-empty string');
    });

    it('throws error for invalid startTime', () => {
      expect(() => {
        new PerformanceEntry('test', -1);
      }).toThrow('startTime must be a non-negative number');
    });
  });

  describe('finish', () => {
    it('finishes an entry with current time', () => {
      const startTime = Date.now();
      const entry = new PerformanceEntry('test-operation', startTime);
      
      // Wait a bit to ensure different timestamp
      const beforeFinish = Date.now();
      entry.finish();
      const afterFinish = Date.now();
      
      expect(entry.isComplete()).toBe(true);
      expect(entry.getEndTime()).toBeGreaterThanOrEqual(beforeFinish);
      expect(entry.getEndTime()).toBeLessThanOrEqual(afterFinish);
      expect(entry.getDuration()).toBeGreaterThanOrEqual(0);
    });

    it('finishes an entry with specified end time', () => {
      const startTime = Date.now();
      const endTime = startTime + 150;
      const entry = new PerformanceEntry('test-operation', startTime);
      
      entry.finish(endTime);
      
      expect(entry.getEndTime()).toBe(endTime);
      expect(entry.getDuration()).toBe(150);
    });

    it('throws error if entry is already finished', () => {
      const entry = new PerformanceEntry('test-operation', Date.now());
      entry.finish();
      
      expect(() => {
        entry.finish();
      }).toThrow('entry is already finished');
    });
  });

  describe('updateMetadata', () => {
    it('updates metadata', () => {
      const entry = new PerformanceEntry('test-operation', Date.now());
      entry.updateMetadata({ key1: 'value1' });
      entry.updateMetadata({ key2: 'value2' });
      
      expect(entry.getMetadata()).toEqual({
        key1: 'value1',
        key2: 'value2'
      });
    });
  });

  describe('toJSON', () => {
    it('serializes entry to JSON', () => {
      const startTime = Date.now();
      const endTime = startTime + 100;
      const metadata = { traceId: 'test' };
      const entry = new PerformanceEntry('test-operation', startTime, endTime, metadata, 'message');
      
      const json = entry.toJSON();
      
      expect(json.name).toBe('test-operation');
      expect(json.category).toBe('message');
      expect(json.startTime).toBe(startTime);
      expect(json.endTime).toBe(endTime);
      expect(json.duration).toBe(100);
      expect(json.metadata).toEqual(metadata);
      expect(json.isComplete).toBe(true);
    });
  });
});




