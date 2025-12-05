/**
 * Message Pool Stress Test - WITH MESSAGE PROCESSING
 * 
 * This test validates the pool under realistic conditions:
 * - Scheduler running
 * - Messages processed through handlers
 * - End-to-end flow
 * - Real-world performance metrics
 */

import { MessageSystem } from '../models/message-system/message-system.v2.mycelia.js';
import { BaseSubsystem } from '../models/base-subsystem/base.subsystem.mycelia.js';
import { useQueue } from '../hooks/queue/use-queue.mycelia.js';
import { useMessageProcessor } from '../hooks/message-processor/use-message-processor.mycelia.js';
import { useRouter } from '../hooks/router/use-router.mycelia.js';
import { useStatistics } from '../hooks/statistics/use-statistics.mycelia.js';

class TestSubsystem extends BaseSubsystem {
  constructor(name, ms) {
    super(name, { ms });
    this.use(useStatistics);
    this.use(useQueue);
    this.use(useMessageProcessor);
    this.use(useRouter);
  }
}

console.log('\n╔' + '═'.repeat(68) + '╗');
console.log('║  🔥 STRESS TEST - WITH MESSAGE PROCESSING (1M+ MESSAGES)       ║');
console.log('╚' + '═'.repeat(68) + '╝\n');

async function stressTestWithProcessing() {
  // Setup MessageSystem with moderate pool
  const messageSystem = new MessageSystem('stress-test-processing', {
    messagePoolSize: 3000,
    debug: true,
    timeSliceDuration: 50  // 50ms time slices for processing
  });
  
  await messageSystem.bootstrap();
  messageSystem.warmupPool(3000);
  
  console.log('✓ MessageSystem ready');
  console.log(`✓ Pool warmed up: ${messageSystem.getPoolStats().poolSize} messages\n`);

  // Create subsystems
  const apiSubsystem = new TestSubsystem('api', messageSystem);
  const dbSubsystem = new TestSubsystem('db', messageSystem);
  
  await apiSubsystem.build();
  await dbSubsystem.build();
  
  await messageSystem.registerSubsystem(apiSubsystem);
  await messageSystem.registerSubsystem(dbSubsystem);

  // Track handler performance
  let handlerCalls = 0;
  let totalHandlerTime = 0;
  
  // Register realistic handlers with some work
  apiSubsystem.registerRoute('users/{id}', async (msg, params) => {
    const start = Date.now();
    handlerCalls++;
    
    // Simulate some work (validation, processing)
    const userId = params.id;
    const action = msg.body.action || 'get';
    
    // Small delay to simulate real work (0-2ms)
    if (handlerCalls % 100 === 0) {
      await new Promise(resolve => setTimeout(resolve, 1));
    }
    
    totalHandlerTime += Date.now() - start;
    return { userId, action, status: 'ok' };
  });
  
  dbSubsystem.registerRoute('query', async (msg) => {
    const start = Date.now();
    handlerCalls++;
    
    // Simulate DB query
    const queryType = msg.body.type || 'read';
    
    // Occasional slower query
    if (handlerCalls % 500 === 0) {
      await new Promise(resolve => setTimeout(resolve, 2));
    }
    
    totalHandlerTime += Date.now() - start;
    return { result: 'success', type: queryType };
  });

  console.log('✓ Subsystems registered');
  console.log('✓ Routes configured\n');

  // Metrics tracking
  const metrics = {
    samples: [],
    startTime: Date.now(),
    messagesSent: 0,
    messagesCompleted: 0,
    errors: 0
  };

  // Sample metrics every second
  const sampleInterval = setInterval(() => {
    const now = Date.now();
    const elapsed = (now - metrics.startTime) / 1000;
    const mem = process.memoryUsage();
    const poolStats = messageSystem.getPoolStats();
    
    const apiStats = apiSubsystem.getStatistics();
    const dbStats = dbSubsystem.getStatistics();
    
    const sample = {
      time: elapsed.toFixed(1),
      heapUsedMB: (mem.heapUsed / 1024 / 1024).toFixed(2),
      heapTotalMB: (mem.heapTotal / 1024 / 1024).toFixed(2),
      messagesSent: metrics.messagesSent,
      handlerCalls: handlerCalls,
      throughput: Math.floor(metrics.messagesSent / elapsed),
      handlerThroughput: Math.floor(handlerCalls / elapsed),
      poolSize: poolStats.poolSize,
      reused: poolStats.reused,
      reuseRate: poolStats.reuseRate,
      apiQueueSize: apiStats.queueSize,
      dbQueueSize: dbStats.queueSize,
      apiProcessed: apiStats.messagesProcessed,
      dbProcessed: dbStats.messagesProcessed
    };
    
    metrics.samples.push(sample);
    
    // Print progress every 5 seconds
    if (metrics.samples.length % 5 === 0) {
      console.log(`[${sample.time}s] Sent: ${sample.messagesSent.toLocaleString()}, ` +
                  `Processed: ${sample.handlerCalls.toLocaleString()}, ` +
                  `Heap: ${sample.heapUsedMB} MB, ` +
                  `Queues: ${sample.apiQueueSize + sample.dbQueueSize}, ` +
                  `Reuse: ${sample.reuseRate}`);
    }
  }, 1000);

  console.log('═'.repeat(70));
  console.log('🚀 STRESS TEST STARTING (WITH PROCESSING)');
  console.log('═'.repeat(70));
  console.log('Target: 1,000,000+ messages with full processing\n');

  const testStart = Date.now();
  const targetMessages = 1_000_000;
  
  // Send messages in controlled batches to allow processing
  const batchSize = 1000;
  const batchDelay = 10; // 10ms between batches
  
  try {
    for (let batch = 0; batch < targetMessages / batchSize; batch++) {
      // Send batch
      const batchPromises = [];
      for (let i = 0; i < batchSize; i++) {
        const msgNum = batch * batchSize + i;
        
        // Alternate between routes
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
      
      // Wait for batch to be accepted (not necessarily processed)
      await Promise.all(batchPromises);
      
      // Small delay to allow processing
      if (batchDelay > 0) {
        await new Promise(resolve => setTimeout(resolve, batchDelay));
      }
      
      // Stop after 60 seconds
      if (Date.now() - testStart > 60000) {
        console.log('\n⏱️  60 second time limit reached, stopping send...');
        break;
      }
    }
  } catch (error) {
    console.error('\n❌ Error during stress test:', error.message);
    metrics.errors++;
  }

  console.log('\n⏸️  Finished sending, waiting for processing to complete...\n');
  
  // Wait for queues to drain
  let waitTime = 0;
  const maxWaitTime = 30000; // Max 30 seconds to drain
  while (waitTime < maxWaitTime) {
    const apiStats = apiSubsystem.getStatistics();
    const dbStats = dbSubsystem.getStatistics();
    const totalQueued = apiStats.queueSize + dbStats.queueSize;
    
    if (totalQueued === 0) {
      console.log('✓ All queues drained\n');
      break;
    }
    
    if (waitTime % 5000 === 0) {
      console.log(`   Waiting... ${totalQueued} messages still queued`);
    }
    
    await new Promise(resolve => setTimeout(resolve, 500));
    waitTime += 500;
  }

  clearInterval(sampleInterval);
  
  const testDuration = (Date.now() - testStart) / 1000;

  console.log('\n' + '═'.repeat(70));
  console.log('✅ STRESS TEST COMPLETE (WITH PROCESSING)');
  console.log('═'.repeat(70));

  // Final statistics
  const finalMem = process.memoryUsage();
  const finalPoolStats = messageSystem.getPoolStats();
  const apiStats = apiSubsystem.getStatistics();
  const dbStats = dbSubsystem.getStatistics();
  
  const initialMem = metrics.samples[0];
  const finalSample = metrics.samples[metrics.samples.length - 1];
  const heapGrowth = parseFloat(finalSample.heapUsedMB) - parseFloat(initialMem.heapUsedMB);

  console.log('\n📊 FINAL STATISTICS:\n');
  console.log(`   Duration:            ${testDuration.toFixed(1)}s`);
  console.log(`   Messages Sent:       ${metrics.messagesSent.toLocaleString()}`);
  console.log(`   Handler Calls:       ${handlerCalls.toLocaleString()}`);
  console.log(`   Completion Rate:     ${((handlerCalls / metrics.messagesSent) * 100).toFixed(1)}%`);
  console.log(`   Errors:              ${metrics.errors}`);
  console.log(`   Send Throughput:     ${Math.floor(metrics.messagesSent / testDuration).toLocaleString()} msg/s`);
  console.log(`   Process Throughput:  ${Math.floor(handlerCalls / testDuration).toLocaleString()} msg/s`);
  console.log(`   Avg Handler Time:    ${(totalHandlerTime / handlerCalls).toFixed(3)} ms`);

  console.log('\n💾 MEMORY ANALYSIS:\n');
  console.log(`   Initial Heap:        ${initialMem.heapUsedMB} MB`);
  console.log(`   Final Heap:          ${(finalMem.heapUsed / 1024 / 1024).toFixed(2)} MB`);
  console.log(`   Heap Growth:         ${heapGrowth.toFixed(2)} MB`);
  console.log(`   Growth Rate:         ${(heapGrowth / testDuration * 60).toFixed(2)} MB/min`);
  console.log(`   Per Message:         ${((heapGrowth * 1024) / handlerCalls).toFixed(3)} KB`);

  console.log('\n🔄 POOL STATISTICS:\n');
  console.log(`   Pool Size:           ${finalPoolStats.poolSize}`);
  console.log(`   Created:             ${finalPoolStats.created.toLocaleString()}`);
  console.log(`   Reused:              ${finalPoolStats.reused.toLocaleString()}`);
  console.log(`   Released:            ${finalPoolStats.released.toLocaleString()}`);
  console.log(`   Reuse Rate:          ${finalPoolStats.reuseRate}`);
  console.log(`   Efficiency:          ${finalPoolStats.efficiency}`);

  console.log('\n📈 SUBSYSTEM STATISTICS:\n');
  console.log(`   API Messages:        ${apiStats.messagesProcessed.toLocaleString()}`);
  console.log(`   API Queue (final):   ${apiStats.queueSize}`);
  console.log(`   DB Messages:         ${dbStats.messagesProcessed.toLocaleString()}`);
  console.log(`   DB Queue (final):    ${dbStats.queueSize}`);

  // Throughput stability
  const throughputs = metrics.samples.map(s => s.handlerThroughput);
  const avgThroughput = throughputs.reduce((a, b) => a + b, 0) / throughputs.length;
  const minThroughput = Math.min(...throughputs);
  const maxThroughput = Math.max(...throughputs);
  const stdDev = Math.sqrt(
    throughputs.reduce((sum, t) => sum + Math.pow(t - avgThroughput, 2), 0) / throughputs.length
  );
  const variability = (stdDev / avgThroughput * 100).toFixed(1);

  console.log('\n📊 PROCESSING THROUGHPUT STABILITY:\n');
  console.log(`   Average:             ${Math.floor(avgThroughput).toLocaleString()} msg/s`);
  console.log(`   Min:                 ${minThroughput.toLocaleString()} msg/s`);
  console.log(`   Max:                 ${maxThroughput.toLocaleString()} msg/s`);
  console.log(`   Std Deviation:       ${Math.floor(stdDev).toLocaleString()} msg/s`);
  console.log(`   Variability:         ${variability}%`);

  // Memory stability
  const heaps = metrics.samples.map(s => parseFloat(s.heapUsedMB));
  const heapTrend = heaps[heaps.length - 1] - heaps[0];
  const heapStable = Math.abs(heapTrend) < 10;

  console.log('\n💾 MEMORY STABILITY:\n');
  console.log(`   Trend:               ${heapTrend > 0 ? '+' : ''}${heapTrend.toFixed(2)} MB`);
  console.log(`   Status:              ${heapStable ? '✅ STABLE' : '⚠️  GROWING'}`);

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
  
  // Check 1: Completion rate
  const completionRate = (handlerCalls / metrics.messagesSent) * 100;
  if (completionRate > 99) {
    checks.push(`✅ Excellent completion rate (${completionRate.toFixed(1)}%)`);
  } else if (completionRate > 95) {
    checks.push(`⚠️  Good completion rate (${completionRate.toFixed(1)}%)`);
  } else {
    checks.push(`❌ Low completion rate (${completionRate.toFixed(1)}%) - messages lost?`);
  }

  // Check 2: Heap stability
  if (heapStable) {
    checks.push('✅ Heap remains stable (< 10MB growth)');
  } else if (heapTrend < 30) {
    checks.push('⚠️  Minor heap growth detected (<30MB)');
  } else {
    checks.push('❌ Significant heap growth - potential leak');
  }

  // Check 3: Throughput stability
  if (parseFloat(variability) < 15) {
    checks.push('✅ Processing throughput stable (<15% variability)');
  } else if (parseFloat(variability) < 30) {
    checks.push('⚠️  Moderate throughput variation (<30%)');
  } else {
    checks.push('❌ High throughput variability - investigate');
  }

  // Check 4: Reuse rate
  if (parseFloat(finalPoolStats.reuseRate) > 95) {
    checks.push('✅ Excellent reuse rate (>95%)');
  } else if (parseFloat(finalPoolStats.reuseRate) > 80) {
    checks.push('⚠️  Good reuse rate (>80%)');
  } else {
    checks.push('❌ Low reuse rate - pool underutilized');
  }

  // Check 5: Errors
  if (metrics.errors === 0) {
    checks.push('✅ Zero errors during test');
  } else if (metrics.errors < 100) {
    checks.push(`⚠️  ${metrics.errors} errors detected (<0.01%)`);
  } else {
    checks.push(`❌ ${metrics.errors} errors - investigate failures`);
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
    console.log('   End-to-end processing validated under sustained load.\n');
  } else if (passedChecks >= totalChecks - 1) {
    console.log('   ✅ GOOD! Most checks passed.');
    console.log('   System performs well with minor areas for improvement.\n');
  } else {
    console.log('   ⚠️  ACCEPTABLE. Some issues detected.');
    console.log('   Review warnings before production deployment.\n');
  }

  await messageSystem.dispose();
}

// Run the stress test
stressTestWithProcessing().catch(error => {
  console.error('\n❌ Stress test failed:', error);
  console.error(error.stack);
  process.exit(1);
});

