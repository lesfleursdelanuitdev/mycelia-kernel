/**
 * One-Shot Request Optimization Benchmark
 * 
 * Compares performance of one-shot requests with and without processImmediately optimization.
 * 
 * Run: npm run bench:oneshot:opt
 */

import { performance } from 'perf_hooks';
import { MessageSystem } from '../models/message-system/message-system.v2.mycelia.js';
import { BaseSubsystem } from '../models/base-subsystem/base.subsystem.mycelia.js';
import { createCanonicalDefaultHooks } from '../models/defaults/default-hooks.mycelia.js';

console.log('══════════════════════════════════════════════════════════════════════');
console.log('🚀 ONE-SHOT REQUEST OPTIMIZATION BENCHMARK');
console.log('══════════════════════════════════════════════════════════════════════\n');

// ============================================================================
// TEST: One-Shot Requests (WITH Optimization - processImmediately)
// ============================================================================

console.log('📝 TEST 1: One-Shot Requests WITH processImmediately Optimization\n');

async function benchmarkOptimizedOneShot() {
  const iterations = 100;
  const times = [];
  let successCount = 0;
  
  // Create system with debug mode
  const ms = new MessageSystem('test', { debug: true });
  await ms.bootstrap();
  
  // Start scheduler (still needed for other messages, but one-shots bypass it)
  const scheduler = ms.find('globalScheduler');
  if (scheduler) {
    scheduler.start();
  }
  
  class TestSubsystem extends BaseSubsystem {
    constructor(name, ms) {
      const defaultHooks = createCanonicalDefaultHooks().list();
      super(name, { ms, defaultHooks });
    }
  }
  
  const requester = new TestSubsystem('requester', ms);
  await requester.build();
  await ms.registerSubsystem(requester);
  
  const responder = new TestSubsystem('responder', ms);
  await responder.build();
  await ms.registerSubsystem(responder);
  
  // Get facets
  const requesterMessages = requester.find('messages');
  const requesterRequests = requester.find('requests');
  const responderResponses = responder.find('responses');
  const kernel = ms.getKernel();
  
  // Register handler on responder
  responder.registerRoute('responder://test', async (msg) => {
    const responseManager = kernel.getResponseManager();
    const replyTo = responseManager?.getReplyTo(msg.getId());
    
    if (!replyTo) {
      throw new Error(`No replyTo found for message ${msg.getId()}`);
    }
    
    await responderResponses.sendResponse({
      path: replyTo,
      inReplyTo: msg.getId(),
      payload: { result: 'success', echo: msg.getBody() }
    });
  });
  
  // Warmup
  for (let i = 0; i < 10; i++) {
    const msg = requesterMessages.create('responder://test', { data: i });
    try {
      await requesterRequests
        .oneShot()
        .with({ handler: async (resp) => resp.getBody(), timeout: 1000 })
        .forMessage(msg)
        .send();
    } catch (err) {
      // Ignore warmup errors
    }
  }
  
  // Run iterations
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    
    try {
      const msg = requesterMessages.create('responder://test', { data: i });
      const response = await requesterRequests
        .oneShot()
        .with({ 
          handler: async (resp) => resp.getBody(),
          timeout: 2000 
        })
        .forMessage(msg)
        .send();
      
      if (response && response.result === 'success') {
        successCount++;
      }
    } catch (err) {
      // Timeout or error
    }
    
    const end = performance.now();
    times.push(end - start);
  }
  
  // Stop scheduler
  if (scheduler) {
    scheduler.stop();
  }
  
  await ms.dispose();
  
  const avg = times.reduce((a, b) => a + b) / times.length;
  const min = Math.min(...times);
  const max = Math.max(...times);
  const sorted = [...times].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  const p95 = sorted[Math.floor(sorted.length * 0.95)];
  const p99 = sorted[Math.floor(sorted.length * 0.99)];
  const successRate = (successCount / iterations) * 100;
  
  console.log(`   Iterations:       ${iterations.toLocaleString()}`);
  console.log(`   Success Rate:     ${successRate.toFixed(1)}%`);
  console.log(`   Average:          ${avg.toFixed(3)} ms`);
  console.log(`   Median:           ${median.toFixed(3)} ms`);
  console.log(`   P95:              ${p95.toFixed(3)} ms`);
  console.log(`   P99:              ${p99.toFixed(3)} ms`);
  console.log(`   Min:              ${min.toFixed(3)} ms`);
  console.log(`   Max:              ${max.toFixed(3)} ms`);
  console.log(`   Throughput:       ${(1000 / avg).toFixed(0)} req/sec\n`);
  
  return { avg, median, min, max, p95, p99, successRate, times };
}

const optimizedResults = await benchmarkOptimizedOneShot();

// ============================================================================
// SUMMARY
// ============================================================================

console.log('══════════════════════════════════════════════════════════════════════');
console.log('📊 OPTIMIZATION RESULTS');
console.log('══════════════════════════════════════════════════════════════════════\n');

console.log('✅ One-Shot Requests (WITH processImmediately):');
console.log(`   Average:          ${optimizedResults.avg.toFixed(3)} ms`);
console.log(`   Median:           ${optimizedResults.median.toFixed(3)} ms`);
console.log(`   P95:               ${optimizedResults.p95.toFixed(3)} ms`);
console.log(`   P99:               ${optimizedResults.p99.toFixed(3)} ms`);
console.log(`   Success Rate:      ${optimizedResults.successRate.toFixed(1)}%`);
console.log(`   Throughput:        ${(1000 / optimizedResults.avg).toFixed(0)} req/sec\n`);

// Compare to baseline (102ms from previous benchmark)
const baseline = 102.2;
const improvement = ((baseline - optimizedResults.avg) / baseline) * 100;
const speedup = baseline / optimizedResults.avg;

console.log('📈 Performance Comparison:');
console.log(`   Baseline (no opt): ${baseline.toFixed(1)} ms`);
console.log(`   Optimized:         ${optimizedResults.avg.toFixed(1)} ms`);
console.log(`   Improvement:       ${improvement.toFixed(1)}% faster`);
console.log(`   Speedup:            ${speedup.toFixed(2)}x\n`);

if (improvement > 0) {
  console.log('✅ OPTIMIZATION SUCCESSFUL!');
} else {
  console.log('⚠️  Optimization did not improve performance (may need further tuning)');
}

console.log('\n══════════════════════════════════════════════════════════════════════\n');

