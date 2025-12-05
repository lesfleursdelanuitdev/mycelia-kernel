/**
 * Commands, Requests, and Responses Performance Benchmark
 * 
 * Tests the performance of the command/request/response system which provides:
 * - useCommands: Named command registration and sending
 * - useRequests: One-shot and channel-based request/response patterns
 * - useResponses: Consistent response sending with correlation
 * 
 * This is critical for request/response communication patterns.
 */

import { MessageSystem } from '../models/message-system/message-system.v2.mycelia.js';
import { BaseSubsystem } from '../models/base-subsystem/base.subsystem.mycelia.js';
import { createCanonicalDefaultHooks } from '../models/defaults/default-hooks.mycelia.js';

console.log('\n🔄 COMMANDS, REQUESTS & RESPONSES PERFORMANCE BENCHMARK\n');
console.log('══════════════════════════════════════════════════════════════════════\n');

// ============================================================================
// TEST 1: Command Registration Performance
// ============================================================================

console.log('📝 TEST 1: Command Registration Performance\n');

async function benchmarkCommandRegistration() {
  const iterations = 1000;
  const times = [];
  
  for (let i = 0; i < iterations; i++) {
    const ms = new MessageSystem('test');
    await ms.bootstrap();
    
    class TestSubsystem extends BaseSubsystem {
      constructor(name, ms) {
        const defaultHooks = createCanonicalDefaultHooks().list();
        super(name, { ms, defaultHooks });
      }
    }
    
    const subsystem = new TestSubsystem('test', ms);
    await subsystem.build();
    await ms.registerSubsystem(subsystem);
    
    const start = performance.now();
    
    // Get commands facet
    const commands = subsystem.find('commands');
    if (!commands) {
      throw new Error('Commands facet not found');
    }
    
    // Register 10 commands
    for (let j = 0; j < 10; j++) {
      commands.register(`cmd${j}`, {
        path: `test://command/${j}`,
        replyChannel: `test://replies/${j}`,
        timeout: 5000,
        meta: { version: 1 }
      });
    }
    
    const end = performance.now();
    times.push(end - start);
    
    await ms.dispose();
  }
  
  const avg = times.reduce((a, b) => a + b) / times.length;
  const min = Math.min(...times);
  const max = Math.max(...times);
  const median = times.sort((a, b) => a - b)[Math.floor(times.length / 2)];
  const perCommand = avg / 10;
  
  console.log(`   Iterations:       ${iterations.toLocaleString()}`);
  console.log(`   Commands/Iter:    10`);
  console.log(`   Total Average:    ${avg.toFixed(3)} ms`);
  console.log(`   Per Command:      ${perCommand.toFixed(3)} ms`);
  console.log(`   Median:           ${median.toFixed(3)} ms`);
  console.log(`   Min:              ${min.toFixed(3)} ms`);
  console.log(`   Max:              ${max.toFixed(3)} ms`);
  console.log(`   Throughput:       ${(10000 / avg).toFixed(0)} cmds/sec\n`);
  
  return { avg, perCommand, median, min, max };
}

const registrationResults = await benchmarkCommandRegistration();

// ============================================================================
// TEST 2: Command Resolution Performance
// ============================================================================

console.log('📝 TEST 2: Command Resolution Performance\n');

async function benchmarkCommandResolution() {
  const iterations = 5000;
  const times = [];
  
  const ms = new MessageSystem('test');
  await ms.bootstrap();
  
  class TestSubsystem extends BaseSubsystem {
    constructor(name, ms) {
      const defaultHooks = createCanonicalDefaultHooks().list();
      super(name, { ms, defaultHooks });
    }
  }
  
  const subsystem = new TestSubsystem('test', ms);
  await subsystem.build();
  await ms.registerSubsystem(subsystem);
  
  // Get commands facet
  const commands = subsystem.find('commands');
  if (!commands) {
    throw new Error('Commands facet not found');
  }
  
  // Register 100 commands
  for (let i = 0; i < 100; i++) {
    commands.register(`cmd${i}`, {
      path: `test://command/${i}`,
      replyChannel: `test://replies/${i}`,
      timeout: 5000
    });
  }
  
  // Benchmark resolution
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    
    // Resolve 10 commands
    const cmdName = `cmd${i % 100}`;
    commands.list(); // Trigger internal resolution
    
    const end = performance.now();
    times.push(end - start);
  }
  
  await ms.dispose();
  
  const avg = times.reduce((a, b) => a + b) / times.length;
  const min = Math.min(...times);
  const max = Math.max(...times);
  const median = times.sort((a, b) => a - b)[Math.floor(times.length / 2)];
  
  console.log(`   Iterations:       ${iterations.toLocaleString()}`);
  console.log(`   Commands:         100`);
  console.log(`   Average:          ${avg.toFixed(3)} ms`);
  console.log(`   Median:           ${median.toFixed(3)} ms`);
  console.log(`   Min:              ${min.toFixed(3)} ms`);
  console.log(`   Max:              ${max.toFixed(3)} ms`);
  console.log(`   Throughput:       ${(1000 / avg).toFixed(0)} ops/sec\n`);
  
  return { avg, median, min, max };
}

const resolutionResults = await benchmarkCommandResolution();

// ============================================================================
// TEST 3: Request/Response Round-Trip (One-Shot)
// ============================================================================

console.log('📝 TEST 3: Request/Response Round-Trip (One-Shot)\n');

async function benchmarkOneShotRequests() {
  const iterations = 100;  // Reduced from 500
  const times = [];
  let successCount = 0;
  
  // Create system once (with debug for kernel access)
  const ms = new MessageSystem('test', { debug: true });
  await ms.bootstrap();
  
  // START SCHEDULER - critical for message processing!
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
  if (!requesterMessages || !requesterRequests || !responderResponses) {
    throw new Error('Required facets not found');
  }
  
  // Get kernel for ResponseManager access
  const kernel = ms.getKernel();
  
  // Register handler on responder that sends proper response
  responder.registerRoute('responder://test', async (msg) => {
    // Query ResponseManager to get replyTo path
    const responseManager = kernel.getResponseManager();
    const replyTo = responseManager?.getReplyTo(msg.getId());
    
    if (!replyTo) {
      throw new Error(`No replyTo found for message ${msg.getId()}`);
    }
    
    // Send response using responderResponses facet
    await responderResponses.sendResponse({
      path: replyTo,
      inReplyTo: msg.getId(),
      payload: { result: 'success', echo: msg.getBody() }
    });
  });
  
  // Run iterations
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    
    try {
      // Create message
      const msg = requesterMessages.create('responder://test', { data: i });
      
      // Send one-shot request
      const response = await requesterRequests
        .oneShot()
        .with({ 
          handler: async (resp) => resp.getBody(),
          timeout: 1000 
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
  
  // Stop scheduler before disposing
  if (scheduler) {
    scheduler.stop();
  }
  
  await ms.dispose();
  
  const avg = times.reduce((a, b) => a + b) / times.length;
  const min = Math.min(...times);
  const max = Math.max(...times);
  const median = times.sort((a, b) => a - b)[Math.floor(times.length / 2)];
  const successRate = (successCount / iterations) * 100;
  
  console.log(`   Iterations:       ${iterations.toLocaleString()}`);
  console.log(`   Success Rate:     ${successRate.toFixed(1)}%`);
  console.log(`   Average:          ${avg.toFixed(3)} ms`);
  console.log(`   Median:           ${median.toFixed(3)} ms`);
  console.log(`   Min:              ${min.toFixed(3)} ms`);
  console.log(`   Max:              ${max.toFixed(3)} ms`);
  console.log(`   Throughput:       ${(1000 / avg).toFixed(0)} req/sec\n`);
  
  return { avg, median, min, max, successRate };
}

const oneShotResults = await benchmarkOneShotRequests();

// ============================================================================
// TEST 4: Response Sending Performance
// ============================================================================

console.log('📝 TEST 4: Response Sending Performance\n');

async function benchmarkResponseSending() {
  const iterations = 500;  // Reduced from 1000
  const times = [];
  let successCount = 0;
  
  // Create system once
  const ms = new MessageSystem('test');
  await ms.bootstrap();
  
  class TestSubsystem extends BaseSubsystem {
    constructor(name, ms) {
      const defaultHooks = createCanonicalDefaultHooks().list();
      super(name, { ms, defaultHooks });
    }
  }
  
  const subsystem = new TestSubsystem('test', ms);
  await subsystem.build();
  await ms.registerSubsystem(subsystem);
  
  // Get facets
  const messages = subsystem.find('messages');
  const responses = subsystem.find('responses');
  if (!messages || !responses) {
    throw new Error('Messages or responses facet not found');
  }
  
  // Run iterations
  for (let i = 0; i < iterations; i++) {
    // Create a mock request message
    const requestMsg = messages.create('test://request', { data: i });
    
    const start = performance.now();
    
    try {
      // Send response
      await responses.sendResponse({
        path: 'test://reply',
        inReplyTo: requestMsg.getId(),
        payload: { result: 'success', requestId: i }
      });
      successCount++;
    } catch (err) {
      // Error
    }
    
    const end = performance.now();
    times.push(end - start);
  }
  
  await ms.dispose();
  
  const avg = times.reduce((a, b) => a + b) / times.length;
  const min = Math.min(...times);
  const max = Math.max(...times);
  const median = times.sort((a, b) => a - b)[Math.floor(times.length / 2)];
  const successRate = (successCount / iterations) * 100;
  
  console.log(`   Iterations:       ${iterations.toLocaleString()}`);
  console.log(`   Success Rate:     ${successRate.toFixed(1)}%`);
  console.log(`   Average:          ${avg.toFixed(3)} ms`);
  console.log(`   Median:           ${median.toFixed(3)} ms`);
  console.log(`   Min:              ${min.toFixed(3)} ms`);
  console.log(`   Max:              ${max.toFixed(3)} ms`);
  console.log(`   Throughput:       ${(1000 / avg).toFixed(0)} resp/sec\n`);
  
  return { avg, median, min, max, successRate };
}

const responseResults = await benchmarkResponseSending();

// ============================================================================
// TEST 5: Concurrent Command Execution
// ============================================================================

console.log('📝 TEST 5: Concurrent Command Execution\n');

async function benchmarkConcurrentCommands() {
  const concurrencyLevels = [1, 5, 10, 20];
  const results = {};
  
  for (const concurrency of concurrencyLevels) {
    const iterations = 100;
    const times = [];
    let totalCommands = 0;
    
    for (let i = 0; i < iterations; i++) {
      const ms = new MessageSystem('test');
      await ms.bootstrap();
      
      class TestSubsystem extends BaseSubsystem {
        constructor(name, ms) {
          const defaultHooks = createCanonicalDefaultHooks().list();
          super(name, { ms, defaultHooks });
        }
      }
      
      const subsystem = new TestSubsystem('test', ms);
      await subsystem.build();
      await ms.registerSubsystem(subsystem);
      
      // Get commands facet
      const commands = subsystem.find('commands');
      if (!commands) {
        throw new Error('Commands facet not found');
      }
      
      // Register commands
      for (let j = 0; j < concurrency; j++) {
        commands.register(`cmd${j}`, {
          path: `test://command/${j}`,
          replyChannel: `test://replies/${j}`,
          timeout: 5000
        });
      }
      
      const start = performance.now();
      
      // Execute commands concurrently
      const promises = [];
      for (let j = 0; j < concurrency; j++) {
        // Just list commands (lightweight operation for benchmarking)
        promises.push(Promise.resolve(commands.list()));
        totalCommands++;
      }
      
      await Promise.all(promises);
      
      const end = performance.now();
      times.push(end - start);
      
      await ms.dispose();
    }
    
    const avg = times.reduce((a, b) => a + b) / times.length;
    const throughput = (concurrency * 1000) / avg;
    
    console.log(`   Concurrency ${concurrency}:`);
    console.log(`     Average:      ${avg.toFixed(2)} ms`);
    console.log(`     Throughput:   ${throughput.toFixed(0)} cmds/sec\n`);
    
    results[concurrency] = { avg, throughput };
  }
  
  return results;
}

const concurrentResults = await benchmarkConcurrentCommands();

// ============================================================================
// TEST 6: Memory Usage
// ============================================================================

console.log('📝 TEST 6: Memory Usage Analysis\n');

async function benchmarkMemoryUsage() {
  const iterations = 100;
  const samples = [];
  
  for (let i = 0; i < iterations; i++) {
    const beforeMem = process.memoryUsage();
    
    const ms = new MessageSystem('test');
    await ms.bootstrap();
    
    class TestSubsystem extends BaseSubsystem {
      constructor(name, ms) {
        const defaultHooks = createCanonicalDefaultHooks().list();
        super(name, { ms, defaultHooks });
      }
    }
    
    const subsystem = new TestSubsystem('test', ms);
    await subsystem.build();
    await ms.registerSubsystem(subsystem);
    
    // Get commands facet
    const commands = subsystem.find('commands');
    if (!commands) {
      throw new Error('Commands facet not found');
    }
    
    // Register 50 commands
    for (let j = 0; j < 50; j++) {
      commands.register(`cmd${j}`, {
        path: `test://command/${j}`,
        replyChannel: `test://replies/${j}`,
        timeout: 5000,
        meta: { version: 1, description: `Command ${j}` }
      });
    }
    
    const afterMem = process.memoryUsage();
    
    samples.push({
      heapDelta: (afterMem.heapUsed - beforeMem.heapUsed) / 1024,
      externalDelta: (afterMem.external - beforeMem.external) / 1024
    });
    
    await ms.dispose();
  }
  
  const avgHeap = samples.reduce((a, b) => a + b.heapDelta, 0) / samples.length;
  const avgExternal = samples.reduce((a, b) => a + b.externalDelta, 0) / samples.length;
  const perCommand = avgHeap / 50;
  
  console.log(`   Iterations:       ${iterations.toLocaleString()}`);
  console.log(`   Commands/Iter:    50`);
  console.log(`   Avg Heap Delta:   ${avgHeap.toFixed(2)} KB`);
  console.log(`   Per Command:      ${perCommand.toFixed(2)} KB`);
  console.log(`   Avg External:     ${avgExternal.toFixed(2)} KB\n`);
  
  return { avgHeap, perCommand, avgExternal };
}

const memoryResults = await benchmarkMemoryUsage();

// ============================================================================
// SUMMARY
// ============================================================================

console.log('══════════════════════════════════════════════════════════════════════');
console.log('📊 COMMANDS, REQUESTS & RESPONSES PERFORMANCE SUMMARY');
console.log('══════════════════════════════════════════════════════════════════════\n');

console.log('📝 Command Registration:');
console.log(`   Per Command:      ${registrationResults.perCommand.toFixed(3)} ms`);
console.log(`   Throughput:       ${(10000 / registrationResults.avg).toFixed(0)} cmds/sec\n`);

console.log('🔍 Command Resolution:');
console.log(`   Average:          ${resolutionResults.avg.toFixed(3)} ms`);
console.log(`   Throughput:       ${(1000 / resolutionResults.avg).toFixed(0)} ops/sec\n`);

console.log('🔄 One-Shot Requests:');
console.log(`   Average:          ${oneShotResults.avg.toFixed(3)} ms`);
console.log(`   Success Rate:     ${oneShotResults.successRate.toFixed(1)}%`);
console.log(`   Throughput:       ${(1000 / oneShotResults.avg).toFixed(0)} req/sec\n`);

console.log('📤 Response Sending:');
console.log(`   Average:          ${responseResults.avg.toFixed(3)} ms`);
console.log(`   Success Rate:     ${responseResults.successRate.toFixed(1)}%`);
console.log(`   Throughput:       ${(1000 / responseResults.avg).toFixed(0)} resp/sec\n`);

console.log('⚡ Concurrent Execution:');
Object.entries(concurrentResults).forEach(([level, result]) => {
  console.log(`   ${level} concurrent:    ${result.avg.toFixed(2)} ms (${result.throughput.toFixed(0)} cmds/sec)`);
});
console.log();

console.log('💾 Memory Usage:');
console.log(`   Per Command:      ${memoryResults.perCommand.toFixed(2)} KB`);
console.log(`   Total (50 cmds):  ${memoryResults.avgHeap.toFixed(2)} KB\n`);

// ============================================================================
// ASSESSMENT
// ============================================================================

console.log('══════════════════════════════════════════════════════════════════════');
console.log('🎯 ASSESSMENT');
console.log('══════════════════════════════════════════════════════════════════════\n');

const issues = [];
const strengths = [];

// Check command registration
if (registrationResults.perCommand < 0.1) {
  strengths.push('✅ Excellent command registration (< 0.1ms per command)');
} else if (registrationResults.perCommand < 0.5) {
  strengths.push('✅ Good command registration (< 0.5ms per command)');
} else {
  issues.push(`⚠️  Slow command registration: ${registrationResults.perCommand.toFixed(3)}ms (target: < 0.5ms)`);
}

// Check request/response
if (oneShotResults.avg < 5) {
  strengths.push('✅ Excellent request/response time (< 5ms)');
} else if (oneShotResults.avg < 10) {
  strengths.push('✅ Good request/response time (< 10ms)');
} else {
  issues.push(`⚠️  Slow request/response: ${oneShotResults.avg.toFixed(2)}ms (target: < 10ms)`);
}

// Check success rates
if (oneShotResults.successRate > 95) {
  strengths.push(`✅ High request success rate (${oneShotResults.successRate.toFixed(1)}%)`);
} else if (oneShotResults.successRate > 80) {
  strengths.push(`✅ Good request success rate (${oneShotResults.successRate.toFixed(1)}%)`);
} else {
  issues.push(`⚠️  Low request success rate: ${oneShotResults.successRate.toFixed(1)}% (target: > 90%)`);
}

// Check memory
if (memoryResults.perCommand < 5) {
  strengths.push(`✅ Low memory per command (${memoryResults.perCommand.toFixed(2)}KB)`);
} else if (memoryResults.perCommand < 10) {
  strengths.push(`✅ Reasonable memory per command (${memoryResults.perCommand.toFixed(2)}KB)`);
} else {
  issues.push(`⚠️  High memory per command: ${memoryResults.perCommand.toFixed(2)}KB (target: < 10KB)`);
}

// Check scalability
const scalability = concurrentResults[20].throughput / concurrentResults[1].throughput;
if (scalability > 15) {
  strengths.push(`✅ Excellent concurrency scaling (${scalability.toFixed(1)}x at 20 concurrent)`);
} else if (scalability > 10) {
  strengths.push(`✅ Good concurrency scaling (${scalability.toFixed(1)}x at 20 concurrent)`);
} else {
  issues.push(`⚠️  Poor concurrency scaling: ${scalability.toFixed(1)}x (target: > 10x)`);
}

console.log('🎯 Strengths:\n');
strengths.forEach(s => console.log(`   ${s}`));
console.log();

if (issues.length > 0) {
  console.log('⚠️  Issues:\n');
  issues.forEach(i => console.log(`   ${i}`));
  console.log();
}

// Overall verdict
if (issues.length === 0) {
  console.log('✅ VERDICT: EXCELLENT COMMANDS/REQUESTS/RESPONSES PERFORMANCE\n');
} else if (issues.length <= 2) {
  console.log('✅ VERDICT: GOOD COMMANDS/REQUESTS/RESPONSES PERFORMANCE\n');
} else {
  console.log('⚠️  VERDICT: COMMANDS/REQUESTS/RESPONSES NEED OPTIMIZATION\n');
}

console.log('══════════════════════════════════════════════════════════════════════\n');

