/**
 * Simple Message Pool Integration Test
 * 
 * Direct comparison of send() vs sendPooled() performance
 */

import { MessageSystem } from '../models/message-system/message-system.v2.mycelia.js';
import { BaseSubsystem } from '../models/base-subsystem/base.subsystem.mycelia.js';
import { Message } from '../models/message/message.mycelia.js';
import { useRouter } from '../hooks/router/use-router.mycelia.js';
import { useStatistics } from '../hooks/statistics/use-statistics.mycelia.js';

class TestSubsystem extends BaseSubsystem {
  constructor(name, ms) {
    super(name, { ms });
    this.use(useStatistics);
    this.use(useRouter);
  }
}

console.log('\n╔' + '═'.repeat(68) + '╗');
console.log('║  🔥 MESSAGE POOL INTEGRATION - SIMPLE TEST                      ║');
console.log('╚' + '═'.repeat(68) + '╝\n');

async function runTest() {
  const messageSystem = new MessageSystem('pool-test', {
    messagePoolSize: 2000,
    debug: true  // Enable stats tracking
  });
  
  await messageSystem.bootstrap();
  
  // Warmup pool
  console.log('🔥 Warming up pool...');
  const warmed = messageSystem.warmupPool(2000);
  console.log(`✓ Pool ready: ${warmed} messages pre-allocated\n`);

  const subsystem = new TestSubsystem('api', messageSystem);
  await subsystem.build();
  await messageSystem.registerSubsystem(subsystem);

  subsystem.registerRoute('test', async (msg) => ({ 
    id: msg.body.id,
    ok: true 
  }));

  // Force GC
  if (global.gc) {
    global.gc();
  }

  // ============================================================================
  // Test 1: Traditional send()
  // ============================================================================

  console.log('📊 Test 1: Traditional send() - 10,000 messages');
  const memBefore1 = process.memoryUsage();
  const start1 = Date.now();
  
  for (let i = 0; i < 10000; i++) {
    const msg = new Message('api://test', { id: i });
    await messageSystem.send(msg);
  }
  
  const duration1 = Date.now() - start1;
  if (global.gc) global.gc();
  const memAfter1 = process.memoryUsage();
  const heapGrowth1 = (memAfter1.heapUsed - memBefore1.heapUsed) / 1024 / 1024;

  console.log(`   Duration:     ${duration1} ms`);
  console.log(`   Throughput:   ${Math.floor(10000 / (duration1 / 1000)).toLocaleString()} msg/sec`);
  console.log(`   Heap Growth:  ${heapGrowth1.toFixed(2)} MB`);
  console.log(`   Per Message:  ${((heapGrowth1 * 1024) / 10000).toFixed(2)} KB\n`);

  // ============================================================================
  // Test 2: Pooled sendPooled()
  // ============================================================================

  console.log('📊 Test 2: Pooled sendPooled() - 10,000 messages');
  const memBefore2 = process.memoryUsage();
  const start2 = Date.now();
  
  for (let i = 0; i < 10000; i++) {
    await messageSystem.sendPooled('api://test', { id: i });
  }
  
  const duration2 = Date.now() - start2;
  if (global.gc) global.gc();
  const memAfter2 = process.memoryUsage();
  const heapGrowth2 = (memAfter2.heapUsed - memBefore2.heapUsed) / 1024 / 1024;

  console.log(`   Duration:     ${duration2} ms`);
  console.log(`   Throughput:   ${Math.floor(10000 / (duration2 / 1000)).toLocaleString()} msg/sec`);
  console.log(`   Heap Growth:  ${heapGrowth2.toFixed(2)} MB`);
  console.log(`   Per Message:  ${((heapGrowth2 * 1024) / 10000).toFixed(2)} KB\n`);

  // ============================================================================
  // Results
  // ============================================================================

  const speedImprovement = ((duration1 - duration2) / duration1 * 100).toFixed(1);
  const throughput1 = 10000 / (duration1 / 1000);
  const throughput2 = 10000 / (duration2 / 1000);
  const throughputImprovement = ((throughput2 - throughput1) / throughput1 * 100).toFixed(1);
  const memoryReduction = ((heapGrowth1 - heapGrowth2) / heapGrowth1 * 100).toFixed(1);

  console.log('═'.repeat(70));
  console.log('📈 RESULTS');
  console.log('═'.repeat(70));
  console.log(`\n⚡ Speed:          ${speedImprovement}% faster`);
  console.log(`📊 Throughput:     +${throughputImprovement}%`);
  console.log(`💾 Memory:         ${memoryReduction}% reduction\n`);

  console.log('📊 Pool Statistics:');
  const stats = messageSystem.getPoolStats();
  console.log(`   Pool Size:     ${stats.poolSize}`);
  console.log(`   Created:       ${stats.created}`);
  console.log(`   Reused:        ${stats.reused}`);
  console.log(`   Reuse Rate:    ${stats.reuseRate}`);
  console.log(`   Efficiency:    ${stats.efficiency}\n`);

  if (parseFloat(stats.reuseRate) > 95) {
    console.log('✅ EXCELLENT: 95%+ reuse rate achieved!');
  } else if (parseFloat(stats.reuseRate) > 80) {
    console.log('✅ GOOD: 80%+ reuse rate achieved');
  } else {
    console.log('⚠️  WARNING: Low reuse rate - check pool configuration');
  }

  console.log('\n💡 Conclusion:');
  if (parseFloat(speedImprovement) > 0) {
    console.log(`   sendPooled() is ${speedImprovement}% faster than send()`);
    console.log(`   Recommended for high-frequency messaging\n`);
  } else {
    console.log(`   Results inconclusive - may need longer test duration\n`);
  }

  await messageSystem.dispose();
}

runTest().catch(console.error);

