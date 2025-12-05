/**
 * Build System Performance Benchmark
 * 
 * Tests the performance of the subsystem builder which:
 * - Resolves context
 * - Orders hooks by dependencies
 * - Creates and validates facets
 * - Builds dependency graphs
 * - Uses caching for optimization
 * 
 * This is a critical path for subsystem initialization.
 */

import { MessageSystem } from '../models/message-system/message-system.v2.mycelia.js';
import { BaseSubsystem } from '../models/base-subsystem/base.subsystem.mycelia.js';
import { DependencyGraphCache } from '../models/subsystem-builder/dependency-graph-cache.mycelia.js';
import { createCanonicalDefaultHooks } from '../models/defaults/default-hooks.mycelia.js';
import { useRouter } from '../hooks/router/use-router.mycelia.js';
import { useQueue } from '../hooks/queue/use-queue.mycelia.js';
import { useStatistics } from '../hooks/statistics/use-statistics.mycelia.js';

console.log('\n🏗️  BUILD SYSTEM PERFORMANCE BENCHMARK\n');
console.log('══════════════════════════════════════════════════════════════════════\n');

// ============================================================================
// TEST 1: Single Subsystem Build (No Cache)
// ============================================================================

console.log('📦 TEST 1: Single Subsystem Build (No Cache)\n');

async function benchmarkSingleBuild() {
  const iterations = 1000;
  const times = [];
  
  for (let i = 0; i < iterations; i++) {
    const ms = new MessageSystem('test');
    await ms.bootstrap();
    
    const start = performance.now();
    
    class TestSubsystem extends BaseSubsystem {
      constructor(name, ms) {
        const defaultHooks = createCanonicalDefaultHooks().list();
        super(name, { ms, defaultHooks });
      }
    }
    
    const subsystem = new TestSubsystem('test', ms);
    await subsystem.build();
    
    const end = performance.now();
    times.push(end - start);
    
    await ms.dispose();
  }
  
  const avg = times.reduce((a, b) => a + b) / times.length;
  const min = Math.min(...times);
  const max = Math.max(...times);
  const median = times.sort((a, b) => a - b)[Math.floor(times.length / 2)];
  
  console.log(`   Iterations:    ${iterations.toLocaleString()}`);
  console.log(`   Average:       ${avg.toFixed(3)} ms`);
  console.log(`   Median:        ${median.toFixed(3)} ms`);
  console.log(`   Min:           ${min.toFixed(3)} ms`);
  console.log(`   Max:           ${max.toFixed(3)} ms`);
  console.log(`   Total:         ${times.reduce((a, b) => a + b).toFixed(0)} ms\n`);
  
  return { avg, median, min, max };
}

const noCacheResults = await benchmarkSingleBuild();

// ============================================================================
// TEST 2: Single Subsystem Build (WITH Cache)
// ============================================================================

console.log('📦 TEST 2: Single Subsystem Build (WITH Cache)\n');

async function benchmarkCachedBuild() {
  const iterations = 1000;
  const times = [];
  const cache = new DependencyGraphCache();
  let cacheHits = 0;
  let cacheMisses = 0;
  
  for (let i = 0; i < iterations; i++) {
    const ms = new MessageSystem('test');
    await ms.bootstrap();
    
    // Check cache before build
    const sizeBefore = cache.size();
    
    const start = performance.now();
    
    class TestSubsystem extends BaseSubsystem {
      constructor(name, ms) {
        const defaultHooks = createCanonicalDefaultHooks().list();
        super(name, { ms, defaultHooks });
        // Inject cache into context
        this.ctx.graphCache = cache;
      }
    }
    
    const subsystem = new TestSubsystem('test', ms);
    await subsystem.build();
    
    const end = performance.now();
    times.push(end - start);
    
    // Check if cache was hit (size didn't change) or missed (size increased)
    const sizeAfter = cache.size();
    if (sizeAfter > sizeBefore) {
      cacheMisses++;
    } else {
      cacheHits++;
    }
    
    await ms.dispose();
  }
  
  const avg = times.reduce((a, b) => a + b) / times.length;
  const min = Math.min(...times);
  const max = Math.max(...times);
  const median = times.sort((a, b) => a - b)[Math.floor(times.length / 2)];
  const hitRate = (cacheHits / (cacheHits + cacheMisses)) * 100;
  const cacheStats = { hits: cacheHits, misses: cacheMisses, hitRate, size: cache.size() };
  
  console.log(`   Iterations:    ${iterations.toLocaleString()}`);
  console.log(`   Average:       ${avg.toFixed(3)} ms`);
  console.log(`   Median:        ${median.toFixed(3)} ms`);
  console.log(`   Min:           ${min.toFixed(3)} ms`);
  console.log(`   Max:           ${max.toFixed(3)} ms`);
  console.log(`   Total:         ${times.reduce((a, b) => a + b).toFixed(0)} ms`);
  console.log(`   Cache Hits:    ${cacheStats.hits}`);
  console.log(`   Cache Misses:  ${cacheStats.misses}`);
  console.log(`   Cache Size:    ${cacheStats.size}`);
  console.log(`   Hit Rate:      ${cacheStats.hitRate.toFixed(1)}%\n`);
  
  return { avg, median, min, max, cacheStats };
}

const cachedResults = await benchmarkCachedBuild();

// Calculate cache speedup
const speedup = ((noCacheResults.avg - cachedResults.avg) / noCacheResults.avg * 100);
console.log(`💡 Cache Impact: ${speedup > 0 ? '+' : ''}${speedup.toFixed(1)}% ${speedup > 0 ? 'faster' : 'slower'}\n`);

// ============================================================================
// TEST 3: Multiple Subsystems (Simulating Real Application)
// ============================================================================

console.log('📦 TEST 3: Multiple Subsystems (Real Application)\n');

async function benchmarkMultipleSubsystems() {
  const iterations = 100;
  const subsystemCounts = [5, 10, 20];
  const results = {};
  
  for (const count of subsystemCounts) {
    const times = [];
    
    for (let i = 0; i < iterations; i++) {
      const ms = new MessageSystem('test');
      await ms.bootstrap();
      
      const start = performance.now();
      
      // Create multiple subsystems
      for (let j = 0; j < count; j++) {
        class TestSubsystem extends BaseSubsystem {
          constructor(name, ms) {
            const defaultHooks = createCanonicalDefaultHooks().list();
            super(name, { ms, defaultHooks });
          }
        }
        
        const subsystem = new TestSubsystem(`test-${j}`, ms);
        await subsystem.build();
        await ms.registerSubsystem(subsystem);
      }
      
      const end = performance.now();
      times.push(end - start);
      
      await ms.dispose();
    }
    
    const avg = times.reduce((a, b) => a + b) / times.length;
    const perSubsystem = avg / count;
    
    console.log(`   ${count} Subsystems:`);
    console.log(`     Total:        ${avg.toFixed(2)} ms`);
    console.log(`     Per Subsystem: ${perSubsystem.toFixed(2)} ms\n`);
    
    results[count] = { avg, perSubsystem };
  }
  
  return results;
}

const multiResults = await benchmarkMultipleSubsystems();

// ============================================================================
// TEST 4: Build with Different Hook Configurations
// ============================================================================

console.log('📦 TEST 4: Hook Configuration Performance\n');

async function benchmarkHookConfigurations() {
  const iterations = 500;
  const configurations = [
    { name: 'Minimal (3 hooks)', hooks: [useRouter, useQueue, useStatistics] },
    { name: 'Standard (canonical)', hooks: createCanonicalDefaultHooks().list() },
  ];
  
  const results = {};
  
  for (const config of configurations) {
    const times = [];
    
    for (let i = 0; i < iterations; i++) {
      const ms = new MessageSystem('test');
      await ms.bootstrap();
      
      const start = performance.now();
      
      class TestSubsystem extends BaseSubsystem {
        constructor(name, ms) {
          super(name, { ms, defaultHooks: config.hooks });
        }
      }
      
      const subsystem = new TestSubsystem('test', ms);
      await subsystem.build();
      
      const end = performance.now();
      times.push(end - start);
      
      await ms.dispose();
    }
    
    const avg = times.reduce((a, b) => a + b) / times.length;
    const median = times.sort((a, b) => a - b)[Math.floor(times.length / 2)];
    
    console.log(`   ${config.name}:`);
    console.log(`     Average:  ${avg.toFixed(3)} ms`);
    console.log(`     Median:   ${median.toFixed(3)} ms`);
    console.log(`     Hooks:    ${config.hooks.length}\n`);
    
    results[config.name] = { avg, median, hookCount: config.hooks.length };
  }
  
  return results;
}

const hookResults = await benchmarkHookConfigurations();

// ============================================================================
// TEST 5: Build + Bootstrap Integration
// ============================================================================

console.log('📦 TEST 5: Full System Bootstrap\n');

async function benchmarkFullBootstrap() {
  const iterations = 200;
  const times = [];
  const bootstrapTimes = [];
  const buildTimes = [];
  const registerTimes = [];
  
  for (let i = 0; i < iterations; i++) {
    const totalStart = performance.now();
    
    // Bootstrap MessageSystem
    const bootstrapStart = performance.now();
    const ms = new MessageSystem('test');
    await ms.bootstrap();
    const bootstrapEnd = performance.now();
    bootstrapTimes.push(bootstrapEnd - bootstrapStart);
    
    // Build subsystem
    const buildStart = performance.now();
    class TestSubsystem extends BaseSubsystem {
      constructor(name, ms) {
        const defaultHooks = createCanonicalDefaultHooks().list();
        super(name, { ms, defaultHooks });
      }
    }
    const subsystem = new TestSubsystem('test', ms);
    await subsystem.build();
    const buildEnd = performance.now();
    buildTimes.push(buildEnd - buildStart);
    
    // Register subsystem
    const registerStart = performance.now();
    await ms.registerSubsystem(subsystem);
    const registerEnd = performance.now();
    registerTimes.push(registerEnd - registerStart);
    
    const totalEnd = performance.now();
    times.push(totalEnd - totalStart);
    
    await ms.dispose();
  }
  
  const avgTotal = times.reduce((a, b) => a + b) / times.length;
  const avgBootstrap = bootstrapTimes.reduce((a, b) => a + b) / bootstrapTimes.length;
  const avgBuild = buildTimes.reduce((a, b) => a + b) / buildTimes.length;
  const avgRegister = registerTimes.reduce((a, b) => a + b) / registerTimes.length;
  
  console.log(`   Iterations:       ${iterations.toLocaleString()}`);
  console.log(`   Total:            ${avgTotal.toFixed(3)} ms`);
  console.log(`   Bootstrap:        ${avgBootstrap.toFixed(3)} ms (${(avgBootstrap/avgTotal*100).toFixed(1)}%)`);
  console.log(`   Build:            ${avgBuild.toFixed(3)} ms (${(avgBuild/avgTotal*100).toFixed(1)}%)`);
  console.log(`   Register:         ${avgRegister.toFixed(3)} ms (${(avgRegister/avgTotal*100).toFixed(1)}%)\n`);
  
  return { avgTotal, avgBootstrap, avgBuild, avgRegister };
}

const bootstrapResults = await benchmarkFullBootstrap();

// ============================================================================
// TEST 6: Memory Usage During Build
// ============================================================================

console.log('📦 TEST 6: Memory Usage Analysis\n');

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
    
    const afterMem = process.memoryUsage();
    
    samples.push({
      heapDelta: (afterMem.heapUsed - beforeMem.heapUsed) / 1024,
      externalDelta: (afterMem.external - beforeMem.external) / 1024
    });
    
    await ms.dispose();
  }
  
  const avgHeap = samples.reduce((a, b) => a + b.heapDelta, 0) / samples.length;
  const avgExternal = samples.reduce((a, b) => a + b.externalDelta, 0) / samples.length;
  
  console.log(`   Iterations:       ${iterations.toLocaleString()}`);
  console.log(`   Avg Heap Delta:   ${avgHeap.toFixed(2)} KB`);
  console.log(`   Avg External:     ${avgExternal.toFixed(2)} KB\n`);
  
  return { avgHeap, avgExternal };
}

const memoryResults = await benchmarkMemoryUsage();

// ============================================================================
// SUMMARY
// ============================================================================

console.log('══════════════════════════════════════════════════════════════════════');
console.log('📊 BUILD SYSTEM PERFORMANCE SUMMARY');
console.log('══════════════════════════════════════════════════════════════════════\n');

console.log('🏗️  Single Build Performance:');
console.log(`   Without Cache:    ${noCacheResults.avg.toFixed(3)} ms`);
console.log(`   With Cache:       ${cachedResults.avg.toFixed(3)} ms`);
console.log(`   Cache Speedup:    ${speedup > 0 ? '+' : ''}${speedup.toFixed(1)}%`);
console.log(`   Cache Hit Rate:   ${cachedResults.cacheStats.hitRate.toFixed(1)}%\n`);

console.log('🔢 Scalability:');
Object.entries(multiResults).forEach(([count, result]) => {
  console.log(`   ${count} Subsystems:    ${result.avg.toFixed(2)} ms (${result.perSubsystem.toFixed(2)} ms each)`);
});
console.log();

console.log('⚙️  Hook Configuration Impact:');
Object.entries(hookResults).forEach(([name, result]) => {
  console.log(`   ${name}: ${result.avg.toFixed(3)} ms (${result.hookCount} hooks)`);
});
console.log();

console.log('🚀 Full Bootstrap Breakdown:');
console.log(`   Total Time:       ${bootstrapResults.avgTotal.toFixed(3)} ms`);
console.log(`   Bootstrap:        ${bootstrapResults.avgBootstrap.toFixed(3)} ms (${(bootstrapResults.avgBootstrap/bootstrapResults.avgTotal*100).toFixed(1)}%)`);
console.log(`   Build:            ${bootstrapResults.avgBuild.toFixed(3)} ms (${(bootstrapResults.avgBuild/bootstrapResults.avgTotal*100).toFixed(1)}%)`);
console.log(`   Register:         ${bootstrapResults.avgRegister.toFixed(3)} ms (${(bootstrapResults.avgRegister/bootstrapResults.avgTotal*100).toFixed(1)}%)\n`);

console.log('💾 Memory Impact:');
console.log(`   Heap Delta:       ${memoryResults.avgHeap.toFixed(2)} KB per build`);
console.log(`   External Delta:   ${memoryResults.avgExternal.toFixed(2)} KB per build\n`);

// ============================================================================
// ASSESSMENT
// ============================================================================

console.log('══════════════════════════════════════════════════════════════════════');
console.log('🎯 ASSESSMENT');
console.log('══════════════════════════════════════════════════════════════════════\n');

const issues = [];
const strengths = [];

// Check build time
if (noCacheResults.avg < 5) {
  strengths.push('✅ Excellent build performance (< 5ms)');
} else if (noCacheResults.avg < 10) {
  strengths.push('✅ Good build performance (< 10ms)');
} else {
  issues.push(`⚠️  Slow build time: ${noCacheResults.avg.toFixed(2)}ms (target: < 10ms)`);
}

// Check cache effectiveness
if (cachedResults.cacheStats.hitRate > 95) {
  strengths.push(`✅ Excellent cache hit rate (${cachedResults.cacheStats.hitRate.toFixed(1)}%)`);
} else if (cachedResults.cacheStats.hitRate > 80) {
  strengths.push(`✅ Good cache hit rate (${cachedResults.cacheStats.hitRate.toFixed(1)}%)`);
} else {
  issues.push(`⚠️  Low cache hit rate: ${cachedResults.cacheStats.hitRate.toFixed(1)}% (target: > 90%)`);
}

// Check cache speedup
if (speedup > 20) {
  strengths.push(`✅ Strong cache speedup (${speedup.toFixed(1)}%)`);
} else if (speedup > 0) {
  strengths.push(`✅ Moderate cache speedup (${speedup.toFixed(1)}%)`);
} else {
  issues.push(`⚠️  Cache not improving performance`);
}

// Check memory usage
if (memoryResults.avgHeap < 100) {
  strengths.push(`✅ Low memory footprint (${memoryResults.avgHeap.toFixed(0)}KB)`);
} else if (memoryResults.avgHeap < 500) {
  strengths.push(`✅ Reasonable memory usage (${memoryResults.avgHeap.toFixed(0)}KB)`);
} else {
  issues.push(`⚠️  High memory usage: ${memoryResults.avgHeap.toFixed(0)}KB (target: < 500KB)`);
}

// Check scalability
const scalabilityFactor = multiResults[20].perSubsystem / multiResults[5].perSubsystem;
if (scalabilityFactor < 1.2) {
  strengths.push(`✅ Excellent scalability (${scalabilityFactor.toFixed(2)}x overhead at 4x subsystems)`);
} else if (scalabilityFactor < 1.5) {
  strengths.push(`✅ Good scalability (${scalabilityFactor.toFixed(2)}x overhead at 4x subsystems)`);
} else {
  issues.push(`⚠️  Scalability concern: ${scalabilityFactor.toFixed(2)}x overhead at 4x subsystems`);
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
  console.log('✅ VERDICT: EXCELLENT BUILD SYSTEM PERFORMANCE\n');
} else if (issues.length <= 2) {
  console.log('✅ VERDICT: GOOD BUILD SYSTEM PERFORMANCE\n');
} else {
  console.log('⚠️  VERDICT: BUILD SYSTEM NEEDS OPTIMIZATION\n');
}

console.log('══════════════════════════════════════════════════════════════════════\n');

