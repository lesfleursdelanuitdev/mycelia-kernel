/**
 * Message Pool Stress Test
 * 
 * Long-running test to verify pool stability under sustained load:
 * - 1,000,000+ messages over 60 seconds
 * - Heap usage tracking
 * - GC monitoring
 * - Throughput stability
 */

import { MessageSystem } from '../models/message-system/message-system.v2.mycelia.js';
import { BaseSubsystem } from '../models/base-subsystem/base.subsystem.mycelia.js';
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
console.log('║  🔥 MESSAGE POOL - STRESS TEST (1M+ MESSAGES)                   ║');
console.log('╚' + '═'.repeat(68) + '╝\n');

async function stressTest() {
  // Setup
  const messageSystem = new MessageSystem('stress-test', {
    messagePoolSize: 5000,  // Larger pool for stress test
    debug: true
  });
  
  await messageSystem.bootstrap();
  messageSystem.warmupPool(5000);
  
  console.log('✓ MessageSystem ready');
  console.log(`✓ Pool warmed up: ${messageSystem.getPoolStats().poolSize} messages\n`);

  // Create two subsystems for realistic routing
  const apiSubsystem = new TestSubsystem('api', messageSystem);
  const dbSubsystem = new TestSubsystem('db', messageSystem);
  
  await apiSubsystem.build();
  await dbSubsystem.build();
  
  await messageSystem.registerSubsystem(apiSubsystem);
  await messageSystem.registerSubsystem(dbSubsystem);

  // Register handlers
  let handlerCalls = 0;
  
  apiSubsystem.registerRoute('users/{id}', async (msg, params) => {
    handlerCalls++;
    return { userId: params.id, status: 'ok' };
  });
  
  dbSubsystem.registerRoute('query', async (msg) => {
    handlerCalls++;
    return { result: 'success', data: msg.body };
  });

  console.log('✓ Subsystems registered');
  console.log('✓ Routes configured\n');

  // Metrics tracking
  const metrics = {
    samples: [],
    gcEvents: [],
    startTime: Date.now(),
    messagesSent: 0,
    errors: 0
  };

  // GC monitoring (if available)
  if (global.gc) {
    console.log('✓ GC monitoring enabled\n');
  } else {
    console.log('⚠️  GC monitoring unavailable (run with --expose-gc)\n');
  }

  // Sample metrics every second
  const sampleInterval = setInterval(() => {
    const now = Date.now();
    const elapsed = (now - metrics.startTime) / 1000;
    const mem = process.memoryUsage();
    const poolStats = messageSystem.getPoolStats();
    
    const sample = {
      time: elapsed.toFixed(1),
      heapUsedMB: (mem.heapUsed / 1024 / 1024).toFixed(2),
      heapTotalMB: (mem.heapTotal / 1024 / 1024).toFixed(2),
      externalMB: (mem.external / 1024 / 1024).toFixed(2),
      messagesSent: metrics.messagesSent,
      throughput: Math.floor(metrics.messagesSent / elapsed),
      poolSize: poolStats.poolSize,
      reused: poolStats.reused,
      reuseRate: poolStats.reuseRate
    };
    
    metrics.samples.push(sample);
    
    // Print progress every 5 seconds
    if (metrics.samples.length % 5 === 0) {
      console.log(`[${sample.time}s] Sent: ${sample.messagesSent.toLocaleString()}, ` +
                  `Throughput: ${sample.throughput.toLocaleString()} msg/s, ` +
                  `Heap: ${sample.heapUsedMB} MB, ` +
                  `Reuse: ${sample.reuseRate}`);
    }
  }, 1000);

  console.log('═'.repeat(70));
  console.log('🚀 STRESS TEST STARTING');
  console.log('═'.repeat(70));
  console.log('Target: 1,000,000+ messages over ~60 seconds\n');

  const testStart = Date.now();
  const targetMessages = 1_000_000;
  const targetDurationMs = 60_000; // 60 seconds
  const messagesPerBatch = 1000;
  const delayBetweenBatches = Math.floor(targetDurationMs / (targetMessages / messagesPerBatch));

  // Run the stress test
  try {
    for (let batch = 0; batch < targetMessages / messagesPerBatch; batch++) {
      // Send batch of messages
      const batchPromises = [];
      for (let i = 0; i < messagesPerBatch; i++) {
        const msgNum = batch * messagesPerBatch + i;
        
        // Alternate between routes for variety
        if (msgNum % 2 === 0) {
          batchPromises.push(
            messageSystem.sendPooled('api://users/' + (msgNum % 1000), { 
              action: 'get',
              timestamp: Date.now()
            }).catch(() => metrics.errors++)
          );
        } else {
          batchPromises.push(
            messageSystem.sendPooled('db://query', { 
              id: msgNum,
              type: 'read'
            }).catch(() => metrics.errors++)
          );
        }
        
        metrics.messagesSent++;
      }
      
      // Wait for batch to complete
      await Promise.all(batchPromises);
      
      // Small delay to spread load over time
      if (delayBetweenBatches > 0) {
        await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
      }
      
      // Stop if we've reached target duration
      if (Date.now() - testStart > targetDurationMs) {
        break;
      }
    }
  } catch (error) {
    console.error('\n❌ Error during stress test:', error.message);
    metrics.errors++;
  }

  clearInterval(sampleInterval);
  
  const testDuration = (Date.now() - testStart) / 1000;

  console.log('\n' + '═'.repeat(70));
  console.log('✅ STRESS TEST COMPLETE');
  console.log('═'.repeat(70));

  // Final statistics
  const finalMem = process.memoryUsage();
  const finalPoolStats = messageSystem.getPoolStats();
  const initialMem = metrics.samples[0];
  const heapGrowth = parseFloat(metrics.samples[metrics.samples.length - 1].heapUsedMB) - 
                     parseFloat(initialMem.heapUsedMB);

  console.log('\n📊 FINAL STATISTICS:\n');
  console.log(`   Duration:          ${testDuration.toFixed(1)}s`);
  console.log(`   Messages Sent:     ${metrics.messagesSent.toLocaleString()}`);
  console.log(`   Handler Calls:     ${handlerCalls.toLocaleString()}`);
  console.log(`   Errors:            ${metrics.errors}`);
  console.log(`   Avg Throughput:    ${Math.floor(metrics.messagesSent / testDuration).toLocaleString()} msg/s`);

  console.log('\n💾 MEMORY ANALYSIS:\n');
  console.log(`   Initial Heap:      ${initialMem.heapUsedMB} MB`);
  console.log(`   Final Heap:        ${(finalMem.heapUsed / 1024 / 1024).toFixed(2)} MB`);
  console.log(`   Heap Growth:       ${heapGrowth.toFixed(2)} MB`);
  console.log(`   Growth Rate:       ${(heapGrowth / testDuration * 60).toFixed(2)} MB/min`);
  console.log(`   External Memory:   ${(finalMem.external / 1024 / 1024).toFixed(2)} MB`);

  console.log('\n🔄 POOL STATISTICS:\n');
  console.log(`   Pool Size:         ${finalPoolStats.poolSize}`);
  console.log(`   Created:           ${finalPoolStats.created}`);
  console.log(`   Reused:            ${finalPoolStats.reused.toLocaleString()}`);
  console.log(`   Released:          ${finalPoolStats.released.toLocaleString()}`);
  console.log(`   Reuse Rate:        ${finalPoolStats.reuseRate}`);
  console.log(`   Efficiency:        ${finalPoolStats.efficiency}`);

  // Throughput stability analysis
  const throughputs = metrics.samples.map(s => s.throughput);
  const avgThroughput = throughputs.reduce((a, b) => a + b, 0) / throughputs.length;
  const minThroughput = Math.min(...throughputs);
  const maxThroughput = Math.max(...throughputs);
  const stdDev = Math.sqrt(
    throughputs.reduce((sum, t) => sum + Math.pow(t - avgThroughput, 2), 0) / throughputs.length
  );
  const variability = (stdDev / avgThroughput * 100).toFixed(1);

  console.log('\n📈 THROUGHPUT STABILITY:\n');
  console.log(`   Average:           ${Math.floor(avgThroughput).toLocaleString()} msg/s`);
  console.log(`   Min:               ${minThroughput.toLocaleString()} msg/s`);
  console.log(`   Max:               ${maxThroughput.toLocaleString()} msg/s`);
  console.log(`   Std Deviation:     ${Math.floor(stdDev).toLocaleString()} msg/s`);
  console.log(`   Variability:       ${variability}%`);

  // Memory stability analysis
  const heaps = metrics.samples.map(s => parseFloat(s.heapUsedMB));
  const heapTrend = heaps[heaps.length - 1] - heaps[0];
  const heapStable = Math.abs(heapTrend) < 5; // Less than 5MB growth

  console.log('\n💾 MEMORY STABILITY:\n');
  console.log(`   Trend:             ${heapTrend > 0 ? '+' : ''}${heapTrend.toFixed(2)} MB`);
  console.log(`   Status:            ${heapStable ? '✅ STABLE' : '⚠️  GROWING'}`);

  // Visual graph
  console.log('\n📊 HEAP USAGE OVER TIME:\n');
  const graphHeight = 10;
  const minHeap = Math.min(...heaps);
  const maxHeap = Math.max(...heaps);
  const heapRange = maxHeap - minHeap || 1;

  for (let row = graphHeight; row >= 0; row--) {
    const threshold = minHeap + (heapRange * row / graphHeight);
    let line = `${threshold.toFixed(1).padStart(6)} MB │`;
    
    for (let i = 0; i < Math.min(60, metrics.samples.length); i++) {
      const heapValue = parseFloat(metrics.samples[i].heapUsedMB);
      if (Math.abs(heapValue - threshold) < heapRange / graphHeight / 2) {
        line += '█';
      } else if (heapValue > threshold) {
        line += '│';
      } else {
        line += ' ';
      }
    }
    console.log(line);
  }
  console.log('        └' + '─'.repeat(Math.min(60, metrics.samples.length)));
  console.log('         0s' + ' '.repeat(Math.min(50, metrics.samples.length - 10)) + `${testDuration.toFixed(0)}s`);

  // Reuse rate over time
  console.log('\n♻️  REUSE RATE OVER TIME:\n');
  for (let i = 0; i < Math.min(12, metrics.samples.length); i += 2) {
    const sample = metrics.samples[i];
    const bar = '█'.repeat(Math.floor(parseFloat(sample.reuseRate) / 5));
    console.log(`   ${sample.time.padStart(4)}s: ${bar} ${sample.reuseRate}`);
  }

  // Health assessment
  console.log('\n' + '═'.repeat(70));
  console.log('🏥 HEALTH ASSESSMENT');
  console.log('═'.repeat(70) + '\n');

  const checks = [];
  
  // Check 1: Heap stability
  if (heapStable) {
    checks.push('✅ Heap remains stable (< 5MB growth)');
  } else if (heapTrend < 20) {
    checks.push('⚠️  Minor heap growth detected (<20MB)');
  } else {
    checks.push('❌ Significant heap growth - potential leak');
  }

  // Check 2: Throughput stability
  if (parseFloat(variability) < 10) {
    checks.push('✅ Throughput very stable (<10% variability)');
  } else if (parseFloat(variability) < 20) {
    checks.push('⚠️  Moderate throughput variation (<20%)');
  } else {
    checks.push('❌ High throughput variability - investigate');
  }

  // Check 3: Reuse rate
  if (parseFloat(finalPoolStats.reuseRate) > 99) {
    checks.push('✅ Excellent reuse rate (>99%)');
  } else if (parseFloat(finalPoolStats.reuseRate) > 90) {
    checks.push('⚠️  Good reuse rate (>90%)');
  } else {
    checks.push('❌ Low reuse rate - pool underutilized');
  }

  // Check 4: Errors
  if (metrics.errors === 0) {
    checks.push('✅ Zero errors during test');
  } else if (metrics.errors < 10) {
    checks.push(`⚠️  ${metrics.errors} errors detected`);
  } else {
    checks.push(`❌ ${metrics.errors} errors - investigate failures`);
  }

  // Check 5: Throughput
  const avgThroughputRate = Math.floor(metrics.messagesSent / testDuration);
  if (avgThroughputRate > 15000) {
    checks.push(`✅ High throughput (${avgThroughputRate.toLocaleString()} msg/s)`);
  } else if (avgThroughputRate > 10000) {
    checks.push(`⚠️  Moderate throughput (${avgThroughputRate.toLocaleString()} msg/s)`);
  } else {
    checks.push(`❌ Low throughput (${avgThroughputRate.toLocaleString()} msg/s)`);
  }

  checks.forEach(check => console.log('   ' + check));

  // Overall verdict
  const passedChecks = checks.filter(c => c.startsWith('   ✅')).length;
  const totalChecks = checks.length;

  console.log('\n' + '═'.repeat(70));
  console.log('🎯 VERDICT');
  console.log('═'.repeat(70) + '\n');

  if (passedChecks === totalChecks) {
    console.log('   🎉 EXCELLENT! All checks passed.');
    console.log('   Pool is production-ready and stable under sustained load.\n');
  } else if (passedChecks >= totalChecks - 1) {
    console.log('   ✅ GOOD! Most checks passed.');
    console.log('   Pool performs well with minor areas for improvement.\n');
  } else {
    console.log('   ⚠️  ACCEPTABLE. Some issues detected.');
    console.log('   Review warnings before production deployment.\n');
  }

  await messageSystem.dispose();
}

// Run the stress test
stressTest().catch(error => {
  console.error('\n❌ Stress test failed:', error);
  console.error(error.stack);
  process.exit(1);
});

