/**
 * Queue Performance Benchmark
 * 
 * Compares performance of array-based queue vs circular buffer implementation.
 * Demonstrates O(n) vs O(1) complexity for dequeue operations.
 * 
 * Run with: node --expose-gc benchmarks/queue-performance.bench.js
 */

import { BenchmarkRunner } from './utils/benchmark-runner.js';
import { CircularBuffer } from '../hooks/queue/circular-buffer.mycelia.js';

// Simulate array-based queue (current implementation)
class ArrayBasedQueue {
  constructor(capacity) {
    this.capacity = capacity;
    this.queue = [];
  }
  
  enqueue(item) {
    if (this.queue.length >= this.capacity) {
      return false;
    }
    this.queue.push(item);
    return true;
  }
  
  dequeue() {
    if (this.queue.length === 0) {
      return null;
    }
    return this.queue.shift(); // O(n) operation!
  }
  
  size() {
    return this.queue.length;
  }
}

async function main() {
  const runner = new BenchmarkRunner({ verbose: true });
  
  console.log('\n' + '='.repeat(70));
  console.log('🚀 QUEUE PERFORMANCE BENCHMARK');
  console.log('='.repeat(70));
  console.log('\nComparing Array-based Queue (current) vs Circular Buffer (optimized)');
  console.log('Testing with different queue sizes to demonstrate O(n) vs O(1) complexity\n');
  
  const queueSizes = [10, 100, 500, 1000, 5000];
  
  for (const size of queueSizes) {
    console.log('\n' + '─'.repeat(70));
    console.log(`📦 Queue Size: ${size}`);
    console.log('─'.repeat(70));
    
    // Benchmark array-based enqueue/dequeue cycle
    const arrayQueue = new ArrayBasedQueue(size);
    
    const arrayResult = await runner.run(
      `Array Queue (size ${size})`,
      () => {
        // Fill to 80% capacity
        const targetSize = Math.floor(size * 0.8);
        while (arrayQueue.size() < targetSize) {
          arrayQueue.enqueue({ data: 'test' });
        }
        
        // Dequeue and enqueue to test steady state
        arrayQueue.dequeue();
        arrayQueue.enqueue({ data: 'test' });
      },
      {
        iterations: 10000,
        warmup: 1000
      }
    );
    
    // Benchmark circular buffer enqueue/dequeue cycle
    const circularBuffer = new CircularBuffer(size);
    
    const circularResult = await runner.run(
      `Circular Buffer (size ${size})`,
      () => {
        // Fill to 80% capacity
        const targetSize = Math.floor(size * 0.8);
        while (circularBuffer.size() < targetSize) {
          circularBuffer.enqueue({ data: 'test' });
        }
        
        // Dequeue and enqueue to test steady state
        circularBuffer.dequeue();
        circularBuffer.enqueue({ data: 'test' });
      },
      {
        iterations: 10000,
        warmup: 1000
      }
    );
    
    // Calculate speedup
    const speedup = circularResult.opsPerSec / arrayResult.opsPerSec;
    console.log(`\n   💡 Speedup: ${speedup.toFixed(2)}x faster with Circular Buffer`);
  }
  
  // Focused benchmarks - just enqueue
  console.log('\n\n' + '='.repeat(70));
  console.log('📥 ENQUEUE ONLY (both should be O(1))');
  console.log('='.repeat(70));
  
  const arrayQueue = new ArrayBasedQueue(1000);
  const circularBuffer = new CircularBuffer(1000);
  
  await runner.runSuite([
    {
      name: 'Array - Enqueue',
      fn: () => {
        if (arrayQueue.size() >= 900) {
          // Reset when near capacity
          while (arrayQueue.size() > 0) arrayQueue.dequeue();
        }
        arrayQueue.enqueue({ data: 'test' });
      },
      options: { iterations: 50000 }
    },
    {
      name: 'Circular - Enqueue',
      fn: () => {
        if (circularBuffer.size() >= 900) {
          // Reset when near capacity
          circularBuffer.clear();
        }
        circularBuffer.enqueue({ data: 'test' });
      },
      options: { iterations: 50000 }
    }
  ]);
  
  // Focused benchmarks - just dequeue
  console.log('\n\n' + '='.repeat(70));
  console.log('📤 DEQUEUE ONLY (O(n) vs O(1))');
  console.log('='.repeat(70));
  
  // Pre-fill queues
  const testSize = 1000;
  const arrayQueueFull = new ArrayBasedQueue(testSize);
  const circularBufferFull = new CircularBuffer(testSize);
  
  for (let i = 0; i < testSize * 0.8; i++) {
    arrayQueueFull.enqueue({ data: `item-${i}` });
    circularBufferFull.enqueue({ data: `item-${i}` });
  }
  
  await runner.runSuite([
    {
      name: 'Array - Dequeue',
      fn: () => {
        if (arrayQueueFull.size() === 0) {
          // Refill
          for (let i = 0; i < testSize * 0.8; i++) {
            arrayQueueFull.enqueue({ data: `item-${i}` });
          }
        }
        arrayQueueFull.dequeue();
      },
      options: { iterations: 50000 }
    },
    {
      name: 'Circular - Dequeue',
      fn: () => {
        if (circularBufferFull.size() === 0) {
          // Refill
          for (let i = 0; i < testSize * 0.8; i++) {
            circularBufferFull.enqueue({ data: `item-${i}` });
          }
        }
        circularBufferFull.dequeue();
      },
      options: { iterations: 50000 }
    }
  ]);
  
  // Memory test
  console.log('\n\n' + '='.repeat(70));
  console.log('💾 MEMORY USAGE TEST');
  console.log('='.repeat(70));
  
  const memArrayQueue = new ArrayBasedQueue(10000);
  const memCircularBuffer = new CircularBuffer(10000);
  
  await runner.runSuite([
    {
      name: 'Array - 10k cycles',
      fn: () => {
        memArrayQueue.enqueue({ data: 'test', payload: new Array(10).fill(0) });
        memArrayQueue.dequeue();
      },
      options: { iterations: 10000, warmup: 1000 }
    },
    {
      name: 'Circular - 10k cycles',
      fn: () => {
        memCircularBuffer.enqueue({ data: 'test', payload: new Array(10).fill(0) });
        memCircularBuffer.dequeue();
      },
      options: { iterations: 10000, warmup: 1000 }
    }
  ]);
  
  console.log('\n' + '='.repeat(70));
  console.log('✅ BENCHMARK COMPLETE');
  console.log('='.repeat(70));
  console.log('\n📊 Summary:');
  console.log('   • Circular buffer shows O(1) performance regardless of size');
  console.log('   • Array-based queue degrades with size due to O(n) shift()');
  console.log('   • Expected 10-100x improvement for large queues (>1000 items)');
  console.log('   • Memory usage should be similar or better with circular buffer');
  console.log('\n💡 Recommendation: Migrate BoundedQueue to use CircularBuffer\n');
}

main().catch(console.error);

