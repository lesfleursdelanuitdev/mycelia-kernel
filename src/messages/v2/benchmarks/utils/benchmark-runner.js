/**
 * BenchmarkRunner
 * 
 * Framework for running performance benchmarks with accurate timing and statistics.
 * Supports warmup, multiple iterations, memory profiling, and detailed reporting.
 * 
 * @example
 * const runner = new BenchmarkRunner();
 * const result = await runner.run('My Benchmark', () => {
 *   // Code to benchmark
 * }, { iterations: 10000 });
 * console.log(result);
 */

export class BenchmarkRunner {
  constructor(options = {}) {
    this.options = {
      verbose: options.verbose !== false, // true by default
      ...options
    };
  }
  
  /**
   * Run a benchmark
   * 
   * @param {string} name - Benchmark name
   * @param {Function} fn - Function to benchmark
   * @param {Object} options - Benchmark options
   * @param {number} [options.iterations=10000] - Number of iterations
   * @param {number} [options.warmup=1000] - Warmup iterations
   * @param {boolean} [options.async=false] - Whether function is async
   * @param {boolean} [options.gc=true] - Force GC before benchmark
   * @returns {Promise<Object>} Benchmark results
   */
  async run(name, fn, options = {}) {
    const iterations = options.iterations || 10000;
    const warmup = options.warmup || 1000;
    const isAsync = options.async || false;
    const forceGC = options.gc !== false;
    
    if (this.options.verbose) {
      console.log(`\n📊 Running: ${name}`);
      console.log(`   Warmup: ${warmup} iterations`);
      console.log(`   Benchmark: ${iterations} iterations`);
    }
    
    // Warmup phase
    if (this.options.verbose) {
      process.stdout.write('   Warming up... ');
    }
    
    for (let i = 0; i < warmup; i++) {
      if (isAsync) {
        await fn();
      } else {
        fn();
      }
    }
    
    if (this.options.verbose) {
      console.log('✓');
    }
    
    // Force garbage collection before benchmark
    if (forceGC && global.gc) {
      if (this.options.verbose) {
        process.stdout.write('   Forcing GC... ');
      }
      global.gc();
      if (this.options.verbose) {
        console.log('✓');
      }
    }
    
    // Measure memory before
    const memBefore = process.memoryUsage();
    
    // Run benchmark
    if (this.options.verbose) {
      process.stdout.write('   Benchmarking... ');
    }
    
    const startTime = process.hrtime.bigint();
    
    for (let i = 0; i < iterations; i++) {
      if (isAsync) {
        await fn();
      } else {
        fn();
      }
    }
    
    const endTime = process.hrtime.bigint();
    
    if (this.options.verbose) {
      console.log('✓');
    }
    
    // Measure memory after
    const memAfter = process.memoryUsage();
    
    // Calculate statistics
    const durationNs = Number(endTime - startTime);
    const durationMs = durationNs / 1_000_000;
    const opsPerSec = (iterations / durationMs) * 1000;
    const avgLatencyMs = durationMs / iterations;
    const avgLatencyUs = (durationNs / iterations) / 1000;
    
    const memUsedMB = (memAfter.heapUsed - memBefore.heapUsed) / 1024 / 1024;
    const memPerOp = ((memAfter.heapUsed - memBefore.heapUsed) / iterations) / 1024;
    
    const result = {
      name,
      iterations,
      durationMs: Math.round(durationMs * 100) / 100,
      opsPerSec: Math.round(opsPerSec),
      avgLatencyMs: Math.round(avgLatencyMs * 10000) / 10000,
      avgLatencyUs: Math.round(avgLatencyUs * 100) / 100,
      memUsedMB: Math.round(memUsedMB * 100) / 100,
      memPerOpKB: Math.round(memPerOp * 100) / 100
    };
    
    if (this.options.verbose) {
      this.printResult(result);
    }
    
    return result;
  }
  
  /**
   * Run multiple benchmarks and compare
   * 
   * @param {Array<{name: string, fn: Function, options?: Object}>} benchmarks
   * @returns {Promise<Array<Object>>} Array of results
   */
  async runSuite(benchmarks) {
    const results = [];
    
    console.log('\n' + '='.repeat(70));
    console.log('📊 BENCHMARK SUITE');
    console.log('='.repeat(70));
    
    for (const bench of benchmarks) {
      const result = await this.run(bench.name, bench.fn, bench.options || {});
      results.push(result);
    }
    
    console.log('\n' + '='.repeat(70));
    console.log('📈 COMPARISON');
    console.log('='.repeat(70));
    
    this.printComparison(results);
    
    return results;
  }
  
  /**
   * Print single benchmark result
   */
  printResult(result) {
    console.log('\n   Results:');
    console.log(`     Duration:       ${result.durationMs.toFixed(2)} ms`);
    console.log(`     Operations:     ${result.opsPerSec.toLocaleString()} ops/sec`);
    console.log(`     Avg Latency:    ${result.avgLatencyUs.toFixed(2)} μs`);
    console.log(`     Memory Used:    ${result.memUsedMB.toFixed(2)} MB`);
    console.log(`     Mem/Operation:  ${result.memPerOpKB.toFixed(2)} KB`);
  }
  
  /**
   * Print comparison table
   */
  printComparison(results) {
    if (results.length === 0) return;
    
    // Find fastest
    const fastest = results.reduce((a, b) => 
      a.opsPerSec > b.opsPerSec ? a : b
    );
    
    console.log('\n' + '-'.repeat(70));
    console.log('Name'.padEnd(30) + 'Ops/Sec'.padEnd(15) + 'Latency'.padEnd(15) + 'vs Fastest');
    console.log('-'.repeat(70));
    
    for (const result of results) {
      const name = result.name.substring(0, 28).padEnd(30);
      const ops = result.opsPerSec.toLocaleString().padEnd(15);
      const latency = `${result.avgLatencyUs.toFixed(2)} μs`.padEnd(15);
      
      const ratio = fastest.opsPerSec / result.opsPerSec;
      const comparison = result === fastest 
        ? '(fastest)' 
        : `${ratio.toFixed(2)}x slower`;
      
      console.log(name + ops + latency + comparison);
    }
    
    console.log('-'.repeat(70));
    
    // Show winner
    console.log(`\n🏆 Winner: ${fastest.name}`);
    console.log(`   ${fastest.opsPerSec.toLocaleString()} ops/sec`);
  }
}

/**
 * Helper to format numbers with units
 */
export function formatNumber(num, unit = '') {
  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(2)}M${unit}`;
  } else if (num >= 1_000) {
    return `${(num / 1_000).toFixed(2)}K${unit}`;
  }
  return `${num.toFixed(2)}${unit}`;
}

/**
 * Helper to format duration
 */
export function formatDuration(ms) {
  if (ms < 1) {
    return `${(ms * 1000).toFixed(2)} μs`;
  } else if (ms < 1000) {
    return `${ms.toFixed(2)} ms`;
  }
  return `${(ms / 1000).toFixed(2)} s`;
}


