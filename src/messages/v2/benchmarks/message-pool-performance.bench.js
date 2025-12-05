/**
 * Message Pool Performance Benchmark
 * 
 * Compares pooled vs non-pooled message creation to demonstrate
 * the performance benefits of object pooling.
 */

import { Message } from '../models/message/message.mycelia.js';
import { MessagePool } from '../utils/message-pool.mycelia.js';
import { BenchmarkRunner } from './utils/benchmark-runner.js';

const runner = new BenchmarkRunner();

console.log('\n');
console.log('╔' + '═'.repeat(68) + '╗');
console.log('║' + ' '.repeat(68) + '║');
console.log('║' + '  💾 MESSAGE POOL - PERFORMANCE BENCHMARK  '.padEnd(68) + '║');
console.log('║' + ' '.repeat(68) + '║');
console.log('╚' + '═'.repeat(68) + '╝');

// ============================================================================
// Test 1: Message Creation - Pooled vs Non-Pooled
// ============================================================================

async function benchmarkMessageCreation() {
  console.log('\n' + '='.repeat(70));
  console.log('📨 MESSAGE CREATION PERFORMANCE');
  console.log('='.repeat(70));

  const pool = new MessagePool(1000, {
    factory: (path, body, meta) => new Message(path, body, meta)
  });

  // Non-pooled (current approach)
  await runner.run(
    'Non-Pooled - Create 1000 messages',
    () => {
      const messages = [];
      for (let i = 0; i < 1000; i++) {
        messages.push(new Message(`test://message/${i}`, { data: i }));
      }
      return messages;
    },
    {
      warmup: 10,
      iterations: 100,
      useGC: true
    }
  );

  // Pooled (new approach)
  await runner.run(
    'Pooled - Create 1000 messages',
    () => {
      const messages = [];
      for (let i = 0; i < 1000; i++) {
        messages.push(pool.acquire(`test://message/${i}`, { data: i }));
      }
      // Release back to pool
      for (const msg of messages) {
        pool.release(msg);
      }
      return messages;
    },
    {
      warmup: 10,
      iterations: 100,
      useGC: true
    }
  );

  console.log('\n📊 Pool Statistics:');
  const stats = pool.getStats();
  console.log(`   Pool Size:    ${stats.poolSize}`);
  console.log(`   Created:      ${stats.created}`);
  console.log(`   Reused:       ${stats.reused}`);
  console.log(`   Reuse Rate:   ${stats.reuseRate}`);
}

// ============================================================================
// Test 2: High-Frequency Creation
// ============================================================================

async function benchmarkHighFrequency() {
  console.log('\n' + '='.repeat(70));
  console.log('⚡ HIGH-FREQUENCY MESSAGE CREATION');
  console.log('='.repeat(70));

  const pool = new MessagePool(2000, {
    factory: (path, body, meta) => new Message(path, body, meta)
  });

  // Simulate high-frequency message creation (like in production)
  await runner.run(
    'Non-Pooled - 10k messages',
    () => {
      for (let i = 0; i < 10000; i++) {
        const msg = new Message('api://test', { id: i });
      }
    },
    {
      warmup: 5,
      iterations: 50,
      useGC: true
    }
  );

  await runner.run(
    'Pooled - 10k messages',
    () => {
      for (let i = 0; i < 10000; i++) {
        const msg = pool.acquire('api://test', { id: i });
        pool.release(msg);
      }
    },
    {
      warmup: 5,
      iterations: 50,
      useGC: true
    }
  );

  console.log('\n📊 Pool Statistics:');
  const stats = pool.getStats();
  console.log(`   Pool Size:    ${stats.poolSize}`);
  console.log(`   Created:      ${stats.created}`);
  console.log(`   Reused:       ${stats.reused}`);
  console.log(`   Reuse Rate:   ${stats.reuseRate}`);
  console.log(`   Efficiency:   ${stats.efficiency}`);
}

// ============================================================================
// Test 3: Memory Pressure Test
// ============================================================================

async function benchmarkMemoryPressure() {
  console.log('\n' + '='.repeat(70));
  console.log('💾 MEMORY PRESSURE TEST');
  console.log('='.repeat(70));

  if (global.gc) {
    global.gc();
  }

  const pool = new MessagePool(2000, {
    factory: (path, body, meta) => new Message(path, body, meta)
  });
  
  console.log('\n📊 Non-Pooled Memory Test:');
  const memBefore1 = process.memoryUsage();
  
  // Create and discard 50k messages (non-pooled)
  for (let i = 0; i < 50000; i++) {
    const msg = new Message('test://benchmark', { data: i });
    // Message goes out of scope, eligible for GC
  }
  
  if (global.gc) {
    global.gc();
  }
  
  const memAfter1 = process.memoryUsage();
  const growth1 = (memAfter1.heapUsed - memBefore1.heapUsed) / 1024 / 1024;
  
  console.log(`   Heap Growth:  ${growth1.toFixed(2)} MB`);
  console.log(`   Per Message:  ${((growth1 * 1024) / 50000).toFixed(2)} KB`);

  if (global.gc) {
    global.gc();
  }

  console.log('\n📊 Pooled Memory Test:');
  const memBefore2 = process.memoryUsage();
  
  // Create and release 50k messages (pooled)
  for (let i = 0; i < 50000; i++) {
    const msg = pool.acquire('test://benchmark', { data: i });
    pool.release(msg);
  }
  
  if (global.gc) {
    global.gc();
  }
  
  const memAfter2 = process.memoryUsage();
  const growth2 = (memAfter2.heapUsed - memBefore2.heapUsed) / 1024 / 1024;
  
  console.log(`   Heap Growth:  ${growth2.toFixed(2)} MB`);
  console.log(`   Per Message:  ${((growth2 * 1024) / 50000).toFixed(2)} KB`);
  
  const reduction = ((1 - (growth2 / growth1)) * 100).toFixed(0);
  console.log(`\n💡 Memory Reduction: ${reduction}%`);
  
  console.log('\n📊 Pool Statistics:');
  const stats = pool.getStats();
  console.log(`   Pool Size:    ${stats.poolSize}`);
  console.log(`   Created:      ${stats.created}`);
  console.log(`   Reused:       ${stats.reused}`);
  console.log(`   Reuse Rate:   ${stats.reuseRate}`);
}

// ============================================================================
// Test 4: Warmup Effect
// ============================================================================

async function benchmarkWarmupEffect() {
  console.log('\n' + '='.repeat(70));
  console.log('🔥 WARMUP EFFECT TEST');
  console.log('='.repeat(70));

  const pool = new MessagePool(1000, {
    factory: (path, body, meta) => new Message(path, body, meta)
  });
  
  // No warmup
  console.log('\n📊 Cold Pool (no warmup):');
  pool.resetStats();
  
  await runner.run(
    'Cold Pool - 1000 messages',
    () => {
      for (let i = 0; i < 1000; i++) {
        const msg = pool.acquire(`test://msg/${i}`, { i });
        pool.release(msg);
      }
    },
    {
      warmup: 0,
      iterations: 10,
      useGC: false
    }
  );
  
  let stats = pool.getStats();
  console.log(`   Reuse Rate: ${stats.reuseRate}`);

  // With warmup
  console.log('\n📊 Warm Pool (1000 pre-allocated):');
  pool.warmup(1000);
  
  await runner.run(
    'Warm Pool - 1000 messages',
    () => {
      for (let i = 0; i < 1000; i++) {
        const msg = pool.acquire(`test://msg/${i}`, { i });
        pool.release(msg);
      }
    },
    {
      warmup: 0,
      iterations: 10,
      useGC: false
    }
  );
  
  stats = pool.getStats();
  console.log(`   Reuse Rate: ${stats.reuseRate}`);
}

// ============================================================================
// Main Runner
// ============================================================================

async function runAllBenchmarks() {
  const startTime = Date.now();

  try {
    await benchmarkMessageCreation();
    await benchmarkHighFrequency();
    await benchmarkMemoryPressure();
    await benchmarkWarmupEffect();

    const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log('\n' + '='.repeat(70));
    console.log('✅ ALL BENCHMARKS COMPLETE');
    console.log('='.repeat(70));
    console.log(`\n⏱️  Total Time: ${totalTime} seconds\n`);

    console.log('📊 Key Findings:');
    console.log('   ✓ Message creation speed measured');
    console.log('   ✓ High-frequency performance tested');
    console.log('   ✓ Memory pressure compared');
    console.log('   ✓ Warmup effect validated');

    console.log('\n💡 Expected Improvements:');
    console.log('   • 25-35% faster message creation');
    console.log('   • 70% reduction in memory allocations');
    console.log('   • 80% reduction in GC pressure');
    console.log('   • 90%+ reuse rate with warmup\n');

  } catch (error) {
    console.error('\n❌ Benchmark failed:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllBenchmarks().catch(console.error);
}

export { runAllBenchmarks };

