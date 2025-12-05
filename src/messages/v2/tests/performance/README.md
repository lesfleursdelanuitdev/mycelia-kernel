# Performance Benchmarks

This directory contains comprehensive performance benchmarks for Mycelia Kernel operations. The benchmarks use the built-in performance profiler to measure and report on key operations.

## Overview

The performance benchmark suite tests the following areas:

1. **Message Creation Performance** - Creating messages with and without metadata
2. **Message Routing Performance** - Routing messages within subsystems and across the message system
3. **Subsystem Operations Performance** - Route registration, facet lookup
4. **Queue Operations Performance** - Enqueue operations
5. **Message System Operations Performance** - Cross-subsystem routing
6. **Security Operations Performance** - Principal creation
7. **Performance Report Generation** - Report generation with many entries
8. **Concurrent Operations Performance** - Concurrent message routing
9. **Memory Usage Performance** - Memory efficiency with many entries
10. **Overall Performance Summary** - Comprehensive performance report

## Running Benchmarks

```bash
# Run all performance benchmarks
npm test -- src/messages/v2/tests/performance/performance.benchmark.test.js

# Run with verbose output
npm test -- src/messages/v2/tests/performance/performance.benchmark.test.js --reporter=verbose
```

## Benchmark Results

### Message Creation Performance

- **Average**: ~0.014ms per message
- **P95**: < 0.001ms
- **P99**: ~1ms
- **Iterations**: 1000

Message creation is extremely fast, typically completing in microseconds.

### Message Routing Performance

- **Average**: ~0.004ms per route
- **P95**: < 0.001ms
- **Iterations**: 500

Message routing within a subsystem is very efficient, with most operations completing in microseconds.

### Subsystem Operations Performance

#### Route Registration
- **Average**: < 0.001ms per registration
- **Iterations**: 100

#### Facet Lookup
- **Average**: ~0.001ms per lookup
- **P95**: < 0.001ms
- **Iterations**: 30,000 (3 lookups per iteration)

Facet lookup is extremely fast, leveraging O(1) Map lookups.

### Queue Operations Performance

- **Average**: < 2ms per enqueue
- **Iterations**: 1000

Queue operations are fast and efficient.

### Message System Operations Performance

- **Average**: ~0.016ms per route
- **P95**: < 0.001ms
- **Iterations**: 500

Cross-subsystem routing includes registry lookup but remains very fast.

### Security Operations Performance

- **Average**: ~0.280ms per principal creation
- **P95**: ~1ms
- **Iterations**: 100

Principal creation includes key minting, which adds some overhead but is still very fast.

### Concurrent Operations Performance

- **Average**: ~0.135ms per operation
- **P95**: ~1ms
- **P99**: ~1ms
- **Total Operations**: 1000
- **Concurrent**: 50

The system handles concurrent operations efficiently with minimal contention.

### Memory Usage Performance

- **Total Entries**: 10,000
- **Unique Operations**: 100
- **Report Size**: ~1.4MB (JSON)

The profiler efficiently handles large numbers of entries while maintaining performance.

### Performance Report Generation

- **Report Generation Time**: < 1000ms for 1000 entries
- **Operations Tracked**: Variable
- **Bottlenecks Found**: Top 10 automatically identified

Report generation is fast even with many entries, enabling real-time performance monitoring.

## Performance Characteristics

### Strengths

1. **Message Creation**: Extremely fast (< 0.1ms average)
2. **Facet Lookup**: O(1) Map lookups (< 0.001ms average)
3. **Message Routing**: Very efficient (< 0.01ms average)
4. **Concurrent Operations**: Handles 50+ concurrent operations efficiently
5. **Memory Efficiency**: Handles 10,000+ entries efficiently

### Areas for Optimization

1. **Principal Creation**: Could be optimized further (currently ~0.28ms)
2. **Report Generation**: Could be optimized for very large datasets (> 10,000 entries)

## Performance Expectations

The benchmarks establish baseline performance expectations:

- **Message Operations**: < 1ms average
- **Routing Operations**: < 0.1ms average
- **Facet Operations**: < 0.01ms average
- **Queue Operations**: < 2ms average
- **Security Operations**: < 1ms average
- **Concurrent Operations**: < 1ms average per operation

## Using Benchmarks for Regression Testing

These benchmarks can be used to detect performance regressions:

1. Run benchmarks before and after changes
2. Compare average, P95, and P99 metrics
3. Flag significant increases (> 20%) as potential regressions
4. Use in CI/CD pipeline to catch performance issues early

## Example Output

```
=== Overall Performance Summary ===
=== Performance Report ===

Time Range: 2025-11-29T09:52:16.629Z - 2025-11-29T09:52:16.639Z
Total Duration: 10.00ms
Total Entries: 6500 (6500 completed, 0 incomplete)
Operations Tracked: 3

=== Top Bottlenecks ===
1. summary.message.route
   Average: 4.00μs
   Max: 1.00ms
   Count: 500
   Total: 2.00ms (20.00%)
   P95: 0.00μs, P99: 0.00μs

2. summary.message.create
   Average: 3.00μs
   Max: 1.00ms
   Count: 1000
   Total: 3.00ms (30.00%)
   P95: 0.00μs, P99: 0.00μs

3. summary.facet.find
   Average: 0.20μs
   Max: 1.00ms
   Count: 5000
   Total: 1.00ms (10.00%)
   P95: 0.00μs, P99: 0.00μs
```

## Future Enhancements

1. **Automated Regression Detection**: Compare against baseline metrics
2. **Performance Budgets**: Set and enforce performance budgets
3. **Load Testing**: Add benchmarks for high-load scenarios
4. **Memory Profiling**: Add memory usage benchmarks
5. **CPU Profiling**: Add CPU usage benchmarks
6. **Network Performance**: Add benchmarks for HTTP/WebSocket operations

## See Also

- [Performance Profiler Documentation](../../docs/observability/PERFORMANCE-PROFILER.md)
- [Performance Profiler Hook](../../hooks/profiler/use-profiler.mycelia.js)
- [Performance Entry Model](../../models/profiler/performance-entry.mycelia.js)
- [Performance Report Model](../../models/profiler/performance-report.mycelia.js)

