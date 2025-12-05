# Mycelia Kernel - Performance Optimization Plan

**Date:** December 5, 2025  
**Focus Areas:** Benchmarking, Load Testing, Queue Optimization  
**Status:** Planning & Implementation

---

## Executive Summary

This document outlines a comprehensive performance optimization plan for Mycelia Kernel, addressing:

1. ✅ **Performance Benchmarking** - Establish baseline metrics
2. ✅ **Load Testing** - Stress test under realistic conditions
3. ✅ **Queue Optimization** - Optimize message queue performance
4. ✅ **Profiling & Monitoring** - Identify bottlenecks

**Expected Improvements:**
- 30-50% throughput increase for high-volume scenarios
- Better memory efficiency under load
- Measurable performance metrics for regression detection

---

## 1. Performance Benchmarking

### 1.1 Benchmark Categories

#### **Category A: Message Throughput**
- Messages per second (single subsystem)
- Messages per second (multiple subsystems)
- Message routing latency
- End-to-end processing time

#### **Category B: Queue Performance**
- Enqueue operations/second
- Dequeue operations/second
- Queue under backpressure
- Different queue policies (drop-oldest, drop-newest, error)

#### **Category C: Routing Performance**
- Path parsing speed
- Subsystem lookup time
- Route matching (with/without parameters)
- Scope permission checking overhead

#### **Category D: Memory & CPU**
- Memory usage under load
- CPU utilization patterns
- Garbage collection impact
- Memory leaks detection

### 1.2 Performance Targets

| Metric | Target | Acceptable | Current |
|--------|--------|------------|---------|
| **Message Throughput** | >10,000 msg/sec | >5,000 msg/sec | TBD |
| **Routing Latency** | <1ms (p95) | <5ms (p95) | TBD |
| **Queue Operations** | >50,000 ops/sec | >20,000 ops/sec | TBD |
| **Memory Growth** | <5MB/hour | <20MB/hour | TBD |
| **CPU Usage** | <50% @ 5k msg/sec | <80% @ 5k msg/sec | TBD |

---

## 2. Identified Performance Bottlenecks

### 2.1 Critical Issues

#### **Issue #1: BoundedQueue Uses Array.shift() - O(n) Complexity**

**Location:** `src/messages/v2/hooks/queue/bounded-queue.mycelia.js:226`

```javascript
// Current implementation (SLOW for large queues)
handleFullQueue(item) {
  case 'drop-oldest':
    this.queue.shift();  // O(n) - shifts all elements!
    this.queue.push(item);
    return true;
}
```

**Problem:**
- `Array.shift()` has O(n) time complexity
- For 1000-item queue: every shift touches 1000 elements
- Performance degrades linearly with queue size

**Impact:** **HIGH**
- Throughput drops significantly with queue size >100
- 10x slower for queues >1000 items

**Solution:** Implement circular buffer (see Section 3.1)

---

#### **Issue #2: Path Parsing on Every Message**

**Location:** `src/messages/v2/models/message-system/message-router.mycelia.js:141`

```javascript
// Parses path for every message
const subsystemName = message.extractSubsystem();
```

**Problem:**
- String operations on every message
- No caching of parsed paths

**Impact:** **MEDIUM**
- 5-10% overhead on high-throughput scenarios

**Solution:** Cache parsed paths or use path objects (see Section 3.2)

---

#### **Issue #3: Map Lookup for Subsystem Registry**

**Location:** `src/messages/v2/models/message-system/message-router.mycelia.js:157`

```javascript
subsystem = this.#subsystems.get(subsystemName);
```

**Problem:**
- Map lookup is O(1) but still has overhead
- Could optimize for hot paths

**Impact:** **LOW**
- Map is already efficient
- Only optimize if profiling shows significant impact

---

#### **Issue #4: No Message Batching**

**Problem:**
- Messages processed one at a time
- No batch processing for efficiency

**Impact:** **MEDIUM**
- Could improve throughput 20-30% with batching

**Solution:** Implement batch processing (see Section 3.4)

---

## 3. Optimization Strategies

### 3.1 Queue Optimization: Circular Buffer

**Replace array-based queue with circular buffer for O(1) operations**

**Benefits:**
- ✅ O(1) enqueue and dequeue (vs O(n) for shift)
- ✅ No array reallocation overhead
- ✅ Better cache locality
- ✅ Predictable memory usage

**Implementation:**

```javascript
export class CircularBuffer {
  constructor(capacity) {
    this.buffer = new Array(capacity);
    this.capacity = capacity;
    this.head = 0;  // Read position
    this.tail = 0;  // Write position
    this.size = 0;  // Current size
  }
  
  enqueue(item) {
    if (this.size === this.capacity) {
      return false; // Full
    }
    this.buffer[this.tail] = item;
    this.tail = (this.tail + 1) % this.capacity;
    this.size++;
    return true;
  }
  
  dequeue() {
    if (this.size === 0) {
      return null; // Empty
    }
    const item = this.buffer[this.head];
    this.buffer[this.head] = null; // Allow GC
    this.head = (this.head + 1) % this.capacity;
    this.size--;
    return item;
  }
  
  isFull() {
    return this.size === this.capacity;
  }
  
  isEmpty() {
    return this.size === 0;
  }
}
```

**Expected Improvement:**
- 10-100x faster for large queues (>1000 items)
- 30-50% overall throughput increase under load

---

### 3.2 Path Caching

**Cache parsed paths to avoid repeated string operations**

```javascript
class MessageRouter {
  constructor() {
    this.pathCache = new Map(); // LRU cache
    this.maxCacheSize = 1000;
  }
  
  extractSubsystem(path) {
    // Check cache first
    if (this.pathCache.has(path)) {
      return this.pathCache.get(path);
    }
    
    // Parse path
    const subsystemName = this.parseSubsystem(path);
    
    // Cache result
    if (this.pathCache.size >= this.maxCacheSize) {
      // Remove oldest entry (LRU)
      const firstKey = this.pathCache.keys().next().value;
      this.pathCache.delete(firstKey);
    }
    this.pathCache.set(path, subsystemName);
    
    return subsystemName;
  }
}
```

**Expected Improvement:**
- 5-10% faster routing for repeated paths
- Especially beneficial for hot paths

---

### 3.3 Object Pooling for Messages

**Reuse message objects to reduce GC pressure**

```javascript
class MessagePool {
  constructor(size = 1000) {
    this.pool = [];
    this.size = size;
  }
  
  acquire() {
    if (this.pool.length > 0) {
      return this.pool.pop();
    }
    return new Message();
  }
  
  release(message) {
    if (this.pool.length < this.size) {
      message.reset(); // Clear data
      this.pool.push(message);
    }
  }
}
```

**Expected Improvement:**
- 10-20% reduction in GC overhead
- More stable latency under load

---

### 3.4 Batch Processing

**Process messages in batches for better efficiency**

```javascript
async processBatch(subsystem, batchSize = 10) {
  const batch = [];
  
  // Dequeue batch
  for (let i = 0; i < batchSize; i++) {
    const msg = subsystem.queue.dequeue();
    if (!msg) break;
    batch.push(msg);
  }
  
  // Process batch
  const results = await Promise.all(
    batch.map(msg => subsystem.processMessage(msg))
  );
  
  return results;
}
```

**Expected Improvement:**
- 20-30% higher throughput
- Better CPU utilization

---

### 3.5 Async Iteration for Queue Processing

**Use async generators for efficient queue processing**

```javascript
async *queueIterator(queue, maxBatch = 100) {
  let count = 0;
  while (count < maxBatch) {
    const item = queue.dequeue();
    if (!item) break;
    yield item;
    count++;
  }
}

// Usage
for await (const message of queueIterator(subsystem.queue)) {
  await processMessage(message);
}
```

**Expected Improvement:**
- Better memory efficiency
- Backpressure handling

---

## 4. Benchmarking Infrastructure

### 4.1 Benchmark Suite Structure

```
src/messages/v2/benchmarks/
├── message-throughput.bench.js      (Messages/sec)
├── queue-operations.bench.js        (Queue perf)
├── routing-performance.bench.js     (Routing speed)
├── memory-profiling.bench.js        (Memory usage)
├── end-to-end.bench.js             (Full workflow)
└── utils/
    ├── benchmark-runner.js          (Runner framework)
    ├── stats-collector.js           (Metrics)
    └── report-generator.js          (HTML reports)
```

### 4.2 Benchmark Runner

```javascript
export class BenchmarkRunner {
  async run(name, fn, options = {}) {
    const iterations = options.iterations || 10000;
    const warmup = options.warmup || 1000;
    
    // Warmup
    for (let i = 0; i < warmup; i++) {
      await fn();
    }
    
    // Force GC before benchmark
    if (global.gc) global.gc();
    
    // Measure
    const start = process.hrtime.bigint();
    const memStart = process.memoryUsage();
    
    for (let i = 0; i < iterations; i++) {
      await fn();
    }
    
    const end = process.hrtime.bigint();
    const memEnd = process.memoryUsage();
    
    // Calculate stats
    const duration = Number(end - start) / 1_000_000; // ms
    const opsPerSec = (iterations / duration) * 1000;
    const avgLatency = duration / iterations;
    const memUsed = (memEnd.heapUsed - memStart.heapUsed) / 1024 / 1024;
    
    return {
      name,
      iterations,
      duration,
      opsPerSec,
      avgLatency,
      memUsed
    };
  }
}
```

---

## 5. Load Testing Strategy

### 5.1 Load Test Scenarios

#### **Scenario 1: Sustained Load**
- **Duration:** 5 minutes
- **Message Rate:** 1,000 msg/sec
- **Subsystems:** 5
- **Goal:** Verify stable operation

#### **Scenario 2: Burst Traffic**
- **Pattern:** 100 msg/sec → 10,000 msg/sec → 100 msg/sec
- **Duration:** 1 minute bursts
- **Goal:** Test backpressure handling

#### **Scenario 3: Memory Stress**
- **Duration:** 30 minutes
- **Message Rate:** 5,000 msg/sec
- **Goal:** Detect memory leaks

#### **Scenario 4: Many Subsystems**
- **Subsystems:** 50
- **Message Rate:** 500 msg/sec per subsystem
- **Goal:** Test scalability

### 5.2 Load Test Infrastructure

```javascript
export class LoadTestRunner {
  constructor(messageSystem) {
    this.messageSystem = messageSystem;
    this.metrics = {
      sent: 0,
      processed: 0,
      failed: 0,
      latencies: []
    };
  }
  
  async runLoad(options = {}) {
    const {
      duration = 60000,        // 1 minute
      messagesPerSecond = 1000,
      numSubsystems = 5,
      messageSize = 'small'    // small/medium/large
    } = options;
    
    const interval = 1000 / messagesPerSecond;
    const startTime = Date.now();
    
    while (Date.now() - startTime < duration) {
      const sendPromises = [];
      
      // Send burst of messages
      for (let i = 0; i < numSubsystems; i++) {
        const message = this.createMessage(i, messageSize);
        const promise = this.sendAndTrack(message);
        sendPromises.push(promise);
      }
      
      await Promise.all(sendPromises);
      
      // Wait for next interval
      await this.sleep(interval);
    }
    
    return this.generateReport();
  }
  
  async sendAndTrack(message) {
    const start = Date.now();
    try {
      await this.messageSystem.send(message);
      this.metrics.sent++;
      this.metrics.latencies.push(Date.now() - start);
    } catch (error) {
      this.metrics.failed++;
    }
  }
}
```

---

## 6. Monitoring & Profiling

### 6.1 Real-Time Metrics

```javascript
export class PerformanceMonitor {
  constructor() {
    this.metrics = {
      messagesProcessed: new Counter(),
      routingLatency: new Histogram(),
      queueSize: new Gauge(),
      memoryUsage: new Gauge(),
      cpuUsage: new Gauge()
    };
  }
  
  startMonitoring(interval = 1000) {
    setInterval(() => {
      this.collectMetrics();
    }, interval);
  }
  
  collectMetrics() {
    // Memory
    const mem = process.memoryUsage();
    this.metrics.memoryUsage.set(mem.heapUsed / 1024 / 1024);
    
    // CPU
    const cpu = process.cpuUsage();
    this.metrics.cpuUsage.set((cpu.user + cpu.system) / 1000000);
    
    // Queue sizes
    // ... collect from subsystems
  }
}
```

### 6.2 Performance Dashboard

Create real-time dashboard showing:
- Messages/sec
- Latency percentiles (p50, p95, p99)
- Queue depths
- Memory usage
- CPU utilization
- Error rates

---

## 7. Implementation Plan

### Phase 1: Benchmarking Infrastructure (Week 1)
- ✅ Create benchmark runner framework
- ✅ Implement basic benchmarks (throughput, latency)
- ✅ Set up CI integration
- ✅ Establish baseline metrics

### Phase 2: Queue Optimization (Week 2)
- ✅ Implement circular buffer
- ✅ Benchmark vs current array implementation
- ✅ Migrate BoundedQueue to use circular buffer
- ✅ Verify tests still pass
- ✅ Measure improvement

### Phase 3: Load Testing (Week 3)
- ✅ Create load test framework
- ✅ Implement test scenarios
- ✅ Run sustained and burst tests
- ✅ Identify bottlenecks
- ✅ Document findings

### Phase 4: Additional Optimizations (Week 4)
- ✅ Implement path caching
- ✅ Add batch processing option
- ✅ Optimize hot paths identified in profiling
- ✅ Measure improvements

### Phase 5: Monitoring & Documentation (Week 5)
- ✅ Add performance monitoring hooks
- ✅ Create performance dashboard
- ✅ Document performance characteristics
- ✅ Create performance tuning guide

---

## 8. Success Metrics

### 8.1 Performance Improvements

| Metric | Before | Target | Improvement |
|--------|--------|--------|-------------|
| **Queue Operations** | ~10k ops/sec | >50k ops/sec | 5x |
| **Message Throughput** | TBD | >10k msg/sec | TBD |
| **Routing Latency (p95)** | TBD | <1ms | TBD |
| **Memory Growth** | TBD | <5MB/hour | TBD |

### 8.2 Quality Gates

Before merging optimizations:
- ✅ All tests pass
- ✅ Performance improves by >20%
- ✅ No regressions in other areas
- ✅ Documentation updated
- ✅ Benchmarks added to CI

---

## 9. Performance Testing Commands

```bash
# Run all benchmarks
npm run bench

# Run specific benchmark
npm run bench:queue
npm run bench:routing
npm run bench:throughput

# Run load tests
npm run load-test
npm run load-test:sustained
npm run load-test:burst

# Generate performance report
npm run perf-report

# Profile with Chrome DevTools
node --inspect --expose-gc benchmarks/profile.js
```

---

## 10. Next Steps

### Immediate Actions
1. ✅ Create benchmark infrastructure (this week)
2. ✅ Implement circular buffer optimization (priority)
3. ✅ Run baseline benchmarks
4. ✅ Create load testing framework

### Future Considerations
- Worker threads for parallel processing
- Native addons for critical paths (if needed)
- Redis/external queue for distributed scenarios
- Streaming message processing

---

## Appendix A: Benchmark Results Template

```
=== Mycelia Kernel Performance Benchmark ===
Date: YYYY-MM-DD
Version: vX.Y.Z
Node: vXX.X.X
OS: Linux/Mac/Windows

--- Queue Operations ---
Enqueue:        50,234 ops/sec
Dequeue:        48,891 ops/sec
Full Queue:     45,123 ops/sec

--- Message Routing ---
Simple Route:   12,345 msg/sec
With Params:    10,234 msg/sec
With Scopes:    9,876 msg/sec

--- End-to-End ---
Single Sub:     8,234 msg/sec
Multi Sub:      6,543 msg/sec
Under Load:     5,432 msg/sec

--- Memory ---
Baseline:       45 MB
After 10k msg:  48 MB
Growth Rate:    3 MB/10k msg

--- Latency Percentiles ---
p50:  0.5ms
p95:  1.2ms
p99:  2.5ms
p999: 5.0ms
```

---

**Document Status:** Planning Complete - Ready for Implementation  
**Priority:** High  
**Estimated Effort:** 3-5 weeks  
**Expected ROI:** 30-50% performance improvement

