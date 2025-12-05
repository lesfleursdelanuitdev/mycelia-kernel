/**
 * Performance Benchmarks
 * 
 * Comprehensive performance benchmarks for Mycelia Kernel operations.
 * Uses the performance profiler to measure and report on key operations.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MessageSystem } from '../../models/message-system/message-system.v2.mycelia.js';
import { KernelSubsystem } from '../../models/kernel-subsystem/kernel.subsystem.mycelia.js';
import { BaseSubsystem } from '../../models/base-subsystem/base.subsystem.mycelia.js';
import { createCanonicalDefaultHooks } from '../../models/defaults/default-hooks.mycelia.js';
import { useProfiler } from '../../hooks/profiler/use-profiler.mycelia.js';
import { Message } from '../../models/message/message.mycelia.js';

describe('Performance Benchmarks', () => {
  let messageSystem;
  let kernel;
  let testSubsystem;

  beforeEach(async () => {
    messageSystem = new MessageSystem('benchmark-ms');
    await messageSystem.bootstrap();

    kernel = new KernelSubsystem('kernel', {
      ms: messageSystem,
      debug: false
    });
    await kernel.bootstrap();

    testSubsystem = new BaseSubsystem('benchmark-service', {
      ms: messageSystem,
      defaultHooks: createCanonicalDefaultHooks(),
      config: {
        profiler: {
          enabled: true,
          maxEntries: 50000
        }
      }
    });

    await testSubsystem
      .use(useProfiler)
      .onInit(() => {
        testSubsystem.registerRoute('benchmark-service://echo', async (message) => {
          return { success: true, data: message.body };
        });
        testSubsystem.registerRoute('benchmark-service://process', async (message) => {
          // Simulate some processing
          const data = message.body;
          return { success: true, result: { processed: data.input * 2 } };
        });
      })
      .build();

    await messageSystem.registerSubsystem(testSubsystem);
  });

  afterEach(async () => {
    if (testSubsystem) {
      await testSubsystem.dispose();
    }
    if (kernel) {
      await kernel.dispose();
    }
    if (messageSystem) {
      await messageSystem.dispose();
    }
  });

  describe('Message Creation Performance', () => {
    it('benchmarks message creation', async () => {
      const profiler = testSubsystem.find('profiler');
      const messages = testSubsystem.find('messages');
      
      const iterations = 1000;
      
      for (let i = 0; i < iterations; i++) {
        await profiler.time('message.create', async () => {
          messages.create('test://path', { data: i });
        });
      }
      
      const stats = profiler.getReport().getOperationStats('message.create');
      
      console.log('\n=== Message Creation Performance ===');
      console.log(`Iterations: ${iterations}`);
      console.log(`Average: ${stats.average.toFixed(3)}ms`);
      console.log(`Min: ${stats.min.toFixed(3)}ms`);
      console.log(`Max: ${stats.max.toFixed(3)}ms`);
      console.log(`P95: ${stats.p95.toFixed(3)}ms`);
      console.log(`P99: ${stats.p99.toFixed(3)}ms`);
      
      // Performance expectations
      expect(stats.average).toBeLessThan(1); // Should be very fast (< 1ms average)
      expect(stats.p95).toBeLessThan(2); // P95 should be < 2ms
    });

    it('benchmarks message creation with metadata', async () => {
      const profiler = testSubsystem.find('profiler');
      const messages = testSubsystem.find('messages');
      
      const iterations = 1000;
      
      for (let i = 0; i < iterations; i++) {
        await profiler.time('message.create.withMetadata', async () => {
          messages.create('test://path', { data: i }, {
            meta: {
              traceId: `trace-${i}`,
              correlationId: `corr-${i}`,
              custom: { index: i }
            }
          });
        });
      }
      
      const stats = profiler.getReport().getOperationStats('message.create.withMetadata');
      
      console.log('\n=== Message Creation (with Metadata) Performance ===');
      console.log(`Average: ${stats.average.toFixed(3)}ms`);
      console.log(`P95: ${stats.p95.toFixed(3)}ms`);
      
      expect(stats.average).toBeLessThan(2); // Slightly slower with metadata
    });
  });

  describe('Message Routing Performance', () => {
    it('benchmarks message routing within subsystem', async () => {
      const profiler = testSubsystem.find('profiler');
      const router = testSubsystem.find('router');
      const messages = testSubsystem.find('messages');
      
      const iterations = 500;
      
      for (let i = 0; i < iterations; i++) {
        await profiler.time('message.route', async () => {
          const message = messages.create('benchmark-service://echo', { input: i });
          await router.route(message);
        });
      }
      
      const stats = profiler.getReport().getOperationStats('message.route');
      
      console.log('\n=== Message Routing Performance ===');
      console.log(`Iterations: ${iterations}`);
      console.log(`Average: ${stats.average.toFixed(3)}ms`);
      console.log(`Min: ${stats.min.toFixed(3)}ms`);
      console.log(`Max: ${stats.max.toFixed(3)}ms`);
      console.log(`P95: ${stats.p95.toFixed(3)}ms`);
      
      // Routing should be reasonably fast
      expect(stats.average).toBeLessThan(5); // < 5ms average
      expect(stats.p95).toBeLessThan(10); // P95 < 10ms
    });

    it('benchmarks message routing with processing', async () => {
      const profiler = testSubsystem.find('profiler');
      const router = testSubsystem.find('router');
      const messages = testSubsystem.find('messages');
      
      const iterations = 500;
      
      for (let i = 0; i < iterations; i++) {
        await profiler.time('message.route.process', async () => {
          const message = messages.create('benchmark-service://process', { input: i });
          await router.route(message);
        });
      }
      
      const stats = profiler.getReport().getOperationStats('message.route.process');
      
      console.log('\n=== Message Routing (with Processing) Performance ===');
      console.log(`Average: ${stats.average.toFixed(3)}ms`);
      console.log(`P95: ${stats.p95.toFixed(3)}ms`);
      
      expect(stats.average).toBeLessThan(10); // Processing adds overhead
    });
  });

  describe('Subsystem Operations Performance', () => {
    it('benchmarks subsystem route registration', () => {
      const profiler = testSubsystem.find('profiler');
      
      const iterations = 100;
      
      for (let i = 0; i < iterations; i++) {
        profiler.timeSync('subsystem.registerRoute', () => {
          testSubsystem.registerRoute(`test://route${i}`, async () => ({ success: true }));
        });
      }
      
      const stats = profiler.getReport().getOperationStats('subsystem.registerRoute');
      
      console.log('\n=== Route Registration Performance ===');
      console.log(`Iterations: ${iterations}`);
      console.log(`Average: ${stats.average.toFixed(3)}ms`);
      console.log(`P95: ${stats.p95.toFixed(3)}ms`);
      
      expect(stats.average).toBeLessThan(1); // Should be very fast
    });

    it('benchmarks facet lookup', () => {
      const profiler = testSubsystem.find('profiler');
      
      const iterations = 10000;
      
      for (let i = 0; i < iterations; i++) {
        profiler.timeSync('subsystem.find', () => {
          testSubsystem.find('router');
          testSubsystem.find('messages');
          testSubsystem.find('profiler');
        });
      }
      
      const stats = profiler.getReport().getOperationStats('subsystem.find');
      
      console.log('\n=== Facet Lookup Performance ===');
      console.log(`Iterations: ${iterations * 3} (3 lookups per iteration)`);
      console.log(`Average: ${stats.average.toFixed(3)}ms`);
      console.log(`P95: ${stats.p95.toFixed(3)}ms`);
      
      // Facet lookup should be extremely fast (O(1) Map lookup)
      expect(stats.average).toBeLessThan(0.1); // < 0.1ms average
    });
  });

  describe('Queue Operations Performance', () => {
    it('benchmarks queue enqueue operations', async () => {
      const profiler = testSubsystem.find('profiler');
      const queue = testSubsystem.find('queue');
      const messages = testSubsystem.find('messages');
      
      const iterations = 1000;
      
      for (let i = 0; i < iterations; i++) {
        await profiler.time('queue.enqueue', async () => {
          const message = messages.create('test://path', { data: i });
          queue._queueManager.enqueue({ msg: message, options: {} });
        });
      }
      
      const stats = profiler.getReport().getOperationStats('queue.enqueue');
      
      console.log('\n=== Queue Enqueue Performance ===');
      console.log(`Iterations: ${iterations}`);
      console.log(`Average: ${stats.average.toFixed(3)}ms`);
      console.log(`P95: ${stats.p95.toFixed(3)}ms`);
      
      expect(stats.average).toBeLessThan(2); // Queue operations should be fast
    });
  });

  describe('Message System Operations Performance', () => {
    it('benchmarks message system routing', async () => {
      const profiler = testSubsystem.find('profiler');
      const msRouter = messageSystem.find('messageSystemRouter');
      
      const iterations = 500;
      
      for (let i = 0; i < iterations; i++) {
        await profiler.time('messagesystem.route', async () => {
          const message = testSubsystem.find('messages').create(
            'benchmark-service://echo',
            { input: i }
          );
          await msRouter.route(message);
        });
      }
      
      const stats = profiler.getReport().getOperationStats('messagesystem.route');
      
      console.log('\n=== Message System Routing Performance ===');
      console.log(`Iterations: ${iterations}`);
      console.log(`Average: ${stats.average.toFixed(3)}ms`);
      console.log(`P95: ${stats.p95.toFixed(3)}ms`);
      
      // Message system routing includes registry lookup
      expect(stats.average).toBeLessThan(10); // < 10ms average
    });
  });

  describe('Security Operations Performance', () => {
    it('benchmarks principal creation', async () => {
      const profiler = testSubsystem.find('profiler');
      const accessControl = kernel.getAccessControl();
      const principals = accessControl.find('principals');
      
      const iterations = 100;
      
      for (let i = 0; i < iterations; i++) {
        await profiler.time('security.createPrincipal', async () => {
          const testSub = new BaseSubsystem(`test-${i}`, {
            ms: messageSystem,
            defaultHooks: createCanonicalDefaultHooks()
          });
          await testSub.build();
          
          principals.createPrincipal('topLevel', {
            name: `test-${i}`,
            instance: testSub
          });
          
          await testSub.dispose();
        });
      }
      
      const stats = profiler.getReport().getOperationStats('security.createPrincipal');
      
      console.log('\n=== Principal Creation Performance ===');
      console.log(`Iterations: ${iterations}`);
      console.log(`Average: ${stats.average.toFixed(3)}ms`);
      console.log(`P95: ${stats.p95.toFixed(3)}ms`);
      
      // Principal creation includes key minting
      expect(stats.average).toBeLessThan(50); // < 50ms average
    });
  });

  describe('Performance Report Generation', () => {
    it('benchmarks report generation with many entries', async () => {
      const profiler = testSubsystem.find('profiler');
      
      // Generate many entries (reduced iterations to avoid timeout)
      const iterations = 1000;
      for (let i = 0; i < iterations; i++) {
        await profiler.time(`operation.${i % 10}`, async () => {
          // Minimal work - just return immediately
          return i;
        });
      }
      
      // Benchmark report generation
      const reportStart = Date.now();
      const report = profiler.getReport();
      const stats = report.getSummary();
      const bottlenecks = report.identifyBottlenecks(10);
      const textReport = profiler.getTextReport();
      const reportEnd = Date.now();
      
      const reportDuration = reportEnd - reportStart;
      
      console.log('\n=== Performance Report Generation ===');
      console.log(`Entries: ${iterations}`);
      console.log(`Report Generation Time: ${reportDuration}ms`);
      console.log(`Operations Tracked: ${stats.operationCount}`);
      console.log(`Bottlenecks Found: ${bottlenecks.length}`);
      
      // Report generation should be reasonably fast even with many entries
      expect(reportDuration).toBeLessThan(1000); // < 1 second for 1000 entries
    }, 10000); // 10 second timeout
  });

  describe('Concurrent Operations Performance', () => {
    it('benchmarks concurrent message routing', async () => {
      const profiler = testSubsystem.find('profiler');
      const router = testSubsystem.find('router');
      const messages = testSubsystem.find('messages');
      
      const concurrent = 50;
      const perConcurrent = 20;
      const total = concurrent * perConcurrent;
      
      const promises = [];
      for (let i = 0; i < concurrent; i++) {
        promises.push(
          (async () => {
            for (let j = 0; j < perConcurrent; j++) {
              await profiler.time('concurrent.route', async () => {
                const message = messages.create('benchmark-service://echo', { input: i * perConcurrent + j });
                await router.route(message);
              });
            }
          })()
        );
      }
      
      await Promise.all(promises);
      
      const stats = profiler.getReport().getOperationStats('concurrent.route');
      
      console.log('\n=== Concurrent Message Routing Performance ===');
      console.log(`Total Operations: ${total}`);
      console.log(`Concurrent: ${concurrent}`);
      console.log(`Average: ${stats.average.toFixed(3)}ms`);
      console.log(`P95: ${stats.p95.toFixed(3)}ms`);
      console.log(`P99: ${stats.p99.toFixed(3)}ms`);
      
      // Concurrent operations may be slightly slower due to contention
      expect(stats.average).toBeLessThan(20); // < 20ms average
    });
  });

  describe('Memory Usage Performance', () => {
    it('benchmarks memory usage with many entries', async () => {
      const profiler = testSubsystem.find('profiler');
      
      const iterations = 10000;
      
      for (let i = 0; i < iterations; i++) {
        await profiler.time(`memory.test.${i % 100}`, async () => {
          // Minimal work
          return i;
        });
      }
      
      const entries = profiler.getEntries();
      const report = profiler.getReport();
      
      console.log('\n=== Memory Usage Performance ===');
      console.log(`Total Entries: ${entries.length}`);
      console.log(`Unique Operations: ${report.getSummary().operationCount}`);
      console.log(`Report Size: ${JSON.stringify(report.toJSON()).length} bytes`);
      
      // Should handle large numbers of entries efficiently
      expect(entries.length).toBe(iterations);
    });
  });

  describe('Overall Performance Summary', () => {
    it('generates comprehensive performance summary', async () => {
      const profiler = testSubsystem.find('profiler');
      
      // Run a mix of operations
      const messages = testSubsystem.find('messages');
      const router = testSubsystem.find('router');
      
      // Message creation
      for (let i = 0; i < 1000; i++) {
        await profiler.time('summary.message.create', async () => {
          messages.create('test://path', { data: i });
        });
      }
      
      // Message routing
      for (let i = 0; i < 500; i++) {
        await profiler.time('summary.message.route', async () => {
          const message = messages.create('benchmark-service://echo', { input: i });
          await router.route(message);
        });
      }
      
      // Facet lookup
      for (let i = 0; i < 5000; i++) {
        profiler.timeSync('summary.facet.find', () => {
          testSubsystem.find('router');
        });
      }
      
      const report = profiler.getReport();
      const summary = report.getSummary();
      const bottlenecks = report.identifyBottlenecks(5);
      const textReport = profiler.getTextReport();
      
      console.log('\n=== Overall Performance Summary ===');
      console.log(textReport);
      
      console.log('\n=== Top 5 Bottlenecks ===');
      bottlenecks.forEach((b, i) => {
        console.log(`${i + 1}. ${b.operation}: ${b.averageDuration.toFixed(3)}ms avg, ${b.maxDuration.toFixed(3)}ms max`);
      });
      
      expect(summary.totalEntries).toBeGreaterThan(0);
      expect(bottlenecks.length).toBeGreaterThan(0);
    });
  });
});

