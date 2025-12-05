/**
 * Message Pool - Sustained Load Test (Longer Duration)
 * 
 * Tests the pool with ACTUAL message processing over extended time.
 * This test sends messages at a controlled rate to allow the scheduler
 * to process them, validating end-to-end performance.
 */

import { MessageSystem } from '../models/message-system/message-system.v2.mycelia.js';
import { BaseSubsystem } from '../models/base-subsystem/base.subsystem.mycelia.js';
import { useQueue } from '../hooks/queue/use-queue.mycelia.js';
import { useMessageProcessor } from '../hooks/message-processor/use-message-processor.mycelia.js';
import { useScheduler } from '../hooks/scheduler/use-scheduler.mycelia.js';
import { useRouter } from '../hooks/router/use-router.mycelia.js';
import { useStatistics } from '../hooks/statistics/use-statistics.mycelia.js';
import { useQueries } from '../hooks/queries/use-queries.mycelia.js';

class TestSubsystem extends BaseSubsystem {
  constructor(name, ms) {
    super(name, { ms });
    this.use(useStatistics);
    this.use(useQueries);     // Required by scheduler
    this.use(useQueue);
    this.use(useMessageProcessor);
    this.use(useScheduler);  // CRITICAL: Needed for process() to work!
    this.use(useRouter);
  }
}

console.log('\n╔' + '═'.repeat(68) + '╗');
console.log('║  🕐 SUSTAINED LOAD TEST - WITH PROCESSING (90 seconds)         ║');
console.log('╚' + '═'.repeat(68) + '╝\n');

async function sustainedLoadTest() {
  const messageSystem = new MessageSystem('sustained-test', {
    messagePoolSize: 2000,
    debug: true,
    timeSliceDuration: 20  // 20ms time slices for faster processing
  });
  
  await messageSystem.bootstrap();
  messageSystem.warmupPool(2000);
  
  console.log('✓ MessageSystem ready');
  console.log(`✓ Pool warmed up: ${messageSystem.getPoolStats().poolSize} messages`);
  console.log('✓ Time slice: 20ms (optimized for throughput)\n');

  // Create subsystems
  const apiSubsystem = new TestSubsystem('api', messageSystem);
  const dbSubsystem = new TestSubsystem('db', messageSystem);
  
  await apiSubsystem.build();
  await dbSubsystem.build();
  
  await messageSystem.registerSubsystem(apiSubsystem);
  await messageSystem.registerSubsystem(dbSubsystem);

  // Start scheduler BEFORE sending messages
  const scheduler = messageSystem.find('globalScheduler');
  if (scheduler) {
    scheduler.start();
    console.log('✓ Scheduler started (running in background)\n');
  }

  // Track metrics
  let handlerCalls = 0;
  let totalHandlerTime = 0;
  
  // Register fast, simple handlers
  apiSubsystem.registerRoute('users/{id}', async (msg, params) => {
    const start = Date.now();
    handlerCalls++;
    totalHandlerTime += Date.now() - start;
    return { userId: params.id, status: 'ok' };
  });
  
  dbSubsystem.registerRoute('query', async (msg) => {
    const start = Date.now();
    handlerCalls++;
    totalHandlerTime += Date.now() - start;
    return { result: 'success' };
  });

  console.log('✓ Handlers registered\n');

  // Metrics
  const metrics = {
    samples: [],
    startTime: Date.now(),
    messagesSent: 0,
    errors: 0
  };

  // Sample every 2 seconds (less overhead)
  const sampleInterval = setInterval(() => {
    const now = Date.now();
    const elapsed = (now - metrics.startTime) / 1000;
    const mem = process.memoryUsage();
    const poolStats = messageSystem.getPoolStats();
    
    const apiStats = apiSubsystem.find('statistics') || { messagesProcessed: 0 };
    const dbStats = dbSubsystem.find('statistics') || { messagesProcessed: 0 };
    const apiQueue = apiSubsystem.getQueueStatus();
    const dbQueue = dbSubsystem.getQueueStatus();
    
    const sample = {
      time: elapsed.toFixed(1),
      heapUsedMB: (mem.heapUsed / 1024 / 1024).toFixed(2),
      messagesSent: metrics.messagesSent,
      handlerCalls: handlerCalls,
      apiProcessed: apiStats.messagesProcessed || 0,
      dbProcessed: dbStats.messagesProcessed || 0,
      apiQueueSize: apiQueue.size,
      dbQueueSize: dbQueue.size,
      totalQueued: apiQueue.size + dbQueue.size,
      poolSize: poolStats.poolSize,
      reuseRate: poolStats.reuseRate
    };
    
    metrics.samples.push(sample);
    
    // Print progress every 10 seconds
    if (metrics.samples.length % 5 === 0) {
      const processed = sample.apiProcessed + sample.dbProcessed;
      const completionRate = metrics.messagesSent > 0 
        ? ((processed / metrics.messagesSent) * 100).toFixed(1)
        : '0.0';
      
      console.log(`[${sample.time}s] Sent: ${sample.messagesSent.toLocaleString()}, ` +
                  `Processed: ${processed.toLocaleString()} (${completionRate}%), ` +
                  `Queued: ${sample.totalQueued}, ` +
                  `Heap: ${sample.heapUsedMB} MB, ` +
                  `Reuse: ${sample.reuseRate}`);
    }
  }, 2000);

  console.log('═'.repeat(70));
  console.log('🚀 SUSTAINED LOAD TEST STARTING');
  console.log('═'.repeat(70));
  console.log('Target: 500,000 messages over 90 seconds');
  console.log('Rate:   ~5,500 msg/sec (controlled for processing)\n');

  const testStart = Date.now();
  const targetMessages = 500_000;
  const targetDuration = 90000; // 90 seconds
  
  // Controlled sending with backpressure
  const batchSize = 500;  // Smaller batches
  const batchDelay = 80;  // More delay between batches
  
  try {
    for (let batch = 0; batch < targetMessages / batchSize; batch++) {
      // Check if we should continue
      if (Date.now() - testStart > targetDuration) {
        console.log('\n⏱️  90 second duration reached, stopping send...');
        break;
      }

      // Send batch
      const batchPromises = [];
      for (let i = 0; i < batchSize; i++) {
        const msgNum = batch * batchSize + i;
        
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
      
      await Promise.all(batchPromises);
      
      // Delay to allow processing
      if (batchDelay > 0) {
        await new Promise(resolve => setTimeout(resolve, batchDelay));
      }
    }
  } catch (error) {
    console.error('\n❌ Error during test:', error.message);
    metrics.errors++;
  }

  console.log('\n⏸️  Finished sending, waiting for processing to complete...\n');
  
  // Wait for queues to drain (max 30 seconds)
  let waitTime = 0;
  const maxWaitTime = 30000;
  while (waitTime < maxWaitTime) {
    const apiQueue = apiSubsystem.getQueueStatus();
    const dbQueue = dbSubsystem.getQueueStatus();
    const totalQueued = apiQueue.size + dbQueue.size;
    
    if (totalQueued === 0) {
      console.log('✓ All queues drained\n');
      break;
    }
    
    if (waitTime % 5000 === 0) {
      const apiStats = apiSubsystem.find('statistics') || { messagesProcessed: 0 };
      const dbStats = dbSubsystem.find('statistics') || { messagesProcessed: 0 };
      const processed = (apiStats.messagesProcessed || 0) + (dbStats.messagesProcessed || 0);
      console.log(`   Waiting... ${totalQueued} messages queued, ${processed.toLocaleString()} processed`);
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    waitTime += 1000;
  }

  clearInterval(sampleInterval);
  
  const testDuration = (Date.now() - testStart) / 1000;

  // Stop scheduler
  if (scheduler) {
    scheduler.stop();
  }

  console.log('\n' + '═'.repeat(70));
  console.log('✅ SUSTAINED LOAD TEST COMPLETE');
  console.log('═'.repeat(70));

  // Final statistics
  const finalMem = process.memoryUsage();
  const finalPoolStats = messageSystem.getPoolStats();
  const apiStats = apiSubsystem.find('statistics') || { messagesProcessed: 0 };
  const dbStats = dbSubsystem.find('statistics') || { messagesProcessed: 0 };
  const apiQueue = apiSubsystem.getQueueStatus();
  const dbQueue = dbSubsystem.getQueueStatus();
  
  const totalProcessed = (apiStats.messagesProcessed || 0) + (dbStats.messagesProcessed || 0);
  const completionRate = (totalProcessed / metrics.messagesSent) * 100;

  console.log('\n📊 FINAL STATISTICS:\n');
  console.log(`   Duration:            ${testDuration.toFixed(1)}s`);
  console.log(`   Messages Sent:       ${metrics.messagesSent.toLocaleString()}`);
  console.log(`   Messages Processed:  ${totalProcessed.toLocaleString()}`);
  console.log(`   Completion Rate:     ${completionRate.toFixed(1)}%`);
  console.log(`   Handler Calls:       ${handlerCalls.toLocaleString()}`);
  console.log(`   Errors:              ${metrics.errors}`);
  console.log(`   Send Throughput:     ${Math.floor(metrics.messagesSent / testDuration).toLocaleString()} msg/s`);
  console.log(`   Process Throughput:  ${Math.floor(totalProcessed / testDuration).toLocaleString()} msg/s`);
  console.log(`   Avg Handler Time:    ${(totalHandlerTime / handlerCalls).toFixed(3)} ms`);

  console.log('\n💾 MEMORY ANALYSIS:\n');
  const initialSample = metrics.samples[0];
  const finalSample = metrics.samples[metrics.samples.length - 1];
  const heapGrowth = parseFloat(finalSample.heapUsedMB) - parseFloat(initialSample.heapUsedMB);
  
  console.log(`   Initial Heap:        ${initialSample.heapUsedMB} MB`);
  console.log(`   Final Heap:          ${(finalMem.heapUsed / 1024 / 1024).toFixed(2)} MB`);
  console.log(`   Heap Growth:         ${heapGrowth.toFixed(2)} MB`);
  console.log(`   Growth Rate:         ${(heapGrowth / testDuration * 60).toFixed(2)} MB/min`);
  console.log(`   Per Message:         ${((heapGrowth * 1024) / totalProcessed).toFixed(3)} KB`);

  console.log('\n🔄 POOL STATISTICS:\n');
  console.log(`   Pool Size:           ${finalPoolStats.poolSize}`);
  console.log(`   Created:             ${finalPoolStats.created.toLocaleString()}`);
  console.log(`   Reused:              ${finalPoolStats.reused.toLocaleString()}`);
  console.log(`   Released:            ${finalPoolStats.released.toLocaleString()}`);
  console.log(`   Reuse Rate:          ${finalPoolStats.reuseRate}`);
  console.log(`   Efficiency:          ${finalPoolStats.efficiency}`);

  console.log('\n📈 SUBSYSTEM STATISTICS:\n');
  console.log(`   API Processed:       ${(apiStats.messagesProcessed || 0).toLocaleString()}`);
  console.log(`   API Queue (final):   ${apiQueue.size}`);
  console.log(`   DB Processed:        ${(dbStats.messagesProcessed || 0).toLocaleString()}`);
  console.log(`   DB Queue (final):    ${dbQueue.size}`);

  // Processing over time
  console.log('\n📊 PROCESSING OVER TIME:\n');
  for (let i = 0; i < Math.min(10, metrics.samples.length); i += 2) {
    const s = metrics.samples[i * Math.floor(metrics.samples.length / 10)];
    if (!s) continue;
    const processed = s.apiProcessed + s.dbProcessed;
    const rate = s.messagesSent > 0 ? ((processed / s.messagesSent) * 100).toFixed(1) : '0.0';
    console.log(`   ${s.time.padStart(5)}s: Sent ${s.messagesSent.toString().padStart(7)}, ` +
                `Processed ${processed.toString().padStart(7)} (${rate.padStart(5)}%), ` +
                `Queued ${s.totalQueued.toString().padStart(5)}`);
  }

  // Health checks
  console.log('\n' + '═'.repeat(70));
  console.log('🏥 HEALTH ASSESSMENT');
  console.log('═'.repeat(70) + '\n');

  const checks = [];
  
  if (completionRate > 95) {
    checks.push(`✅ Excellent completion rate (${completionRate.toFixed(1)}%)`);
  } else if (completionRate > 80) {
    checks.push(`⚠️  Good completion rate (${completionRate.toFixed(1)}%)`);
  } else {
    checks.push(`❌ Low completion rate (${completionRate.toFixed(1)}%)`);
  }

  if (Math.abs(heapGrowth) < 10) {
    checks.push('✅ Heap stable (< 10MB growth)');
  } else if (heapGrowth < 30) {
    checks.push('⚠️  Minor heap growth (<30MB)');
  } else {
    checks.push('❌ Significant heap growth');
  }

  if (parseFloat(finalPoolStats.reuseRate) > 95) {
    checks.push('✅ Excellent reuse rate (>95%)');
  } else if (parseFloat(finalPoolStats.reuseRate) > 80) {
    checks.push('⚠️  Good reuse rate (>80%)');
  } else {
    checks.push('❌ Low reuse rate');
  }

  if (metrics.errors === 0) {
    checks.push('✅ Zero errors');
  } else {
    checks.push(`❌ ${metrics.errors} errors`);
  }

  if (apiQueue.size + dbQueue.size === 0) {
    checks.push('✅ All queues drained');
  } else {
    checks.push(`⚠️  ${apiQueue.size + dbQueue.size} messages still queued`);
  }

  checks.forEach(check => console.log('   ' + check));

  const passedChecks = checks.filter(c => c.startsWith('   ✅')).length;

  console.log('\n' + '═'.repeat(70));
  console.log('🎯 VERDICT');
  console.log('═'.repeat(70) + '\n');

  if (passedChecks === checks.length) {
    console.log('   🎉 EXCELLENT! All checks passed.');
    console.log('   End-to-end processing validated with sustained load.\n');
  } else if (passedChecks >= checks.length - 1) {
    console.log('   ✅ GOOD! Most checks passed.');
    console.log('   System performs well under sustained load.\n');
  } else {
    console.log('   ⚠️  ACCEPTABLE. Some areas for improvement.\n');
  }

  await messageSystem.dispose();
}

// Run the test
sustainedLoadTest().catch(error => {
  console.error('\n❌ Test failed:', error);
  console.error(error.stack);
  process.exit(1);
});

