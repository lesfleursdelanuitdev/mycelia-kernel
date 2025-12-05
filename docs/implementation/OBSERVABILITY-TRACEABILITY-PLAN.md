# Observability and Traceability Improvement Plan

## Executive Summary

This plan outlines improvements to observability and traceability in Mycelia Kernel to enable better debugging, monitoring, and understanding of system behavior in production environments.

## Current State Analysis

### ✅ What Exists

1. **Basic Logging**
   - `createLogger()` utility with debug flag control
   - Prefix-based log formatting
   - Error logging (always on, even without debug)

2. **Message Tracking**
   - Message IDs (`message.id`)
   - Correlation IDs for request/response matching (`correlationId`, `inReplyTo`)
   - Message metadata with timestamps

3. **Basic Statistics**
   - `useStatistics` hook tracks:
     - Messages accepted/processed
     - Processing errors
     - Queue full events
     - Average processing time
   - Subsystem-level statistics

4. **Error Management**
   - `ErrorManagerSubsystem` with bounded error store
   - Error classification and normalization
   - Error query APIs

### ❌ What's Missing

1. **Distributed Tracing**
   - No trace IDs that span across subsystems
   - Cannot follow a request through the entire system
   - No parent-child span relationships

2. **Structured Logging**
   - Logs are plain text with prefixes
   - No JSON structured format
   - No correlation/trace IDs in logs
   - Difficult to parse and analyze

3. **Request/Response Tracing**
   - HTTP requests don't have trace IDs
   - Cannot correlate HTTP requests with internal messages
   - No visibility into HTTP → Message → Response flow

4. **Advanced Metrics**
   - No histogram/percentile metrics
   - No rate metrics
   - No custom business metrics
   - Limited performance profiling

5. **Observability Integration**
   - No OpenTelemetry support
   - No integration with monitoring tools (Prometheus, Grafana, etc.)
   - No log aggregation support

6. **Health Checks**
   - No system health endpoints
   - No subsystem health status
   - No readiness/liveness checks

## Improvement Plan

### Phase 1: Distributed Tracing Foundation (High Priority)

**Goal:** Enable end-to-end request tracing across subsystems

#### 1.1 Trace ID Generation and Propagation

**Implementation:**
- Add `traceId` to message metadata (fixed metadata)
- Generate trace IDs using UUID v4 or similar
- Propagate trace IDs through message routing
- Support trace ID inheritance (child messages inherit parent trace ID)

**Files to Modify:**
- `src/messages/v2/models/message/message-metadata.mycelia.js` - Add traceId to fixed metadata
- `src/messages/v2/models/message/message-factory.mycelia.js` - Generate trace IDs
- `src/messages/v2/models/message-system/message-router.mycelia.js` - Propagate trace IDs

**New Files:**
- `src/messages/v2/utils/trace.utils.mycelia.js` - Trace ID utilities

#### 1.2 Span Tracking

**Implementation:**
- Create `Span` class to track operation boundaries
- Track spans per subsystem
- Support span hierarchy (parent-child relationships)
- Store span metadata (operation name, start/end time, tags)

**New Files:**
- `src/messages/v2/models/tracing/span.mycelia.js` - Span class
- `src/messages/v2/models/tracing/span-context.mycelia.js` - Span context for propagation

#### 1.3 Trace Context Propagation

**Implementation:**
- Propagate trace context through message routing
- Support trace context in HTTP headers (for HTTP adapters)
- Maintain trace context across async boundaries

**Files to Modify:**
- `src/messages/v2/hooks/server/use-*-server.utils.mycelia.js` - Extract/inject trace IDs from HTTP headers
- `src/messages/v2/models/message-system/message-router.mycelia.js` - Propagate trace context

### Phase 2: Structured Logging (High Priority)

**Goal:** Replace console.log with structured, parseable logs

#### 2.1 Structured Logger

**Implementation:**
- Create structured logger that outputs JSON
- Include trace ID, correlation ID, subsystem name, timestamp
- Support log levels (DEBUG, INFO, WARN, ERROR)
- Maintain backward compatibility with existing logger API

**New Files:**
- `src/messages/v2/utils/structured-logger.utils.mycelia.js` - Structured logger implementation

**Files to Modify:**
- `src/messages/v2/utils/logger.utils.mycelia.js` - Add structured logging option

#### 2.2 Log Context

**Implementation:**
- Add log context to messages (trace ID, correlation ID, subsystem)
- Automatically include context in all logs
- Support adding custom context fields

**Files to Modify:**
- `src/messages/v2/utils/logger.utils.mycelia.js` - Add context support

### Phase 3: Enhanced Metrics (Medium Priority)

**Goal:** Provide detailed metrics for monitoring and alerting

#### 3.1 Metrics Collection Hook

**Implementation:**
- Create `useMetrics` hook with histogram, counter, gauge support
- Track message processing latency (p50, p95, p99)
- Track message rates (messages/second)
- Track queue depth over time
- Support custom business metrics

**New Files:**
- `src/messages/v2/hooks/metrics/use-metrics.mycelia.js` - Metrics hook
- `src/messages/v2/hooks/metrics/metrics-collector.mycelia.js` - Metrics collector

#### 3.2 Metrics Export

**Implementation:**
- Export metrics in Prometheus format
- Support metrics endpoint on ServerSubsystem
- Allow custom metric exporters

**New Files:**
- `src/messages/v2/utils/metrics-export.utils.mycelia.js` - Metrics export utilities

### Phase 4: HTTP Request Tracing (Medium Priority)

**Goal:** Trace HTTP requests through the system

#### 4.1 HTTP Trace ID Injection

**Implementation:**
- Extract trace ID from HTTP headers (`X-Trace-Id` or `traceparent`)
- Generate trace ID if not present
- Inject trace ID into Mycelia messages
- Return trace ID in HTTP response headers

**Files to Modify:**
- `src/messages/v2/hooks/server/use-*-server.utils.mycelia.js` - Trace ID handling

#### 4.2 Request/Response Logging

**Implementation:**
- Log HTTP request details with trace ID
- Log HTTP response details with trace ID
- Include timing information
- Support request/response body logging (with sanitization)

**Files to Modify:**
- `src/messages/v2/hooks/server/use-*-server.utils.mycelia.js` - Request/response logging

### Phase 5: OpenTelemetry Integration (Low Priority)

**Goal:** Integrate with industry-standard observability tools

#### 5.1 OpenTelemetry Support

**Implementation:**
- Add OpenTelemetry SDK dependency (optional)
- Create OpenTelemetry adapter for traces
- Export traces to OpenTelemetry collectors
- Support OpenTelemetry metrics

**New Files:**
- `src/messages/v2/integrations/opentelemetry/opentelemetry-adapter.mycelia.js` - OpenTelemetry adapter
- `src/messages/v2/integrations/opentelemetry/opentelemetry-tracer.mycelia.js` - OpenTelemetry tracer wrapper

#### 5.2 Configuration

**Implementation:**
- Make OpenTelemetry optional (feature flag)
- Support configuration for exporters (Jaeger, Zipkin, etc.)
- Support sampling configuration

### Phase 6: Health Checks and System Status (Medium Priority)

**Goal:** Provide system health and status information

#### 6.1 Health Check Hook

**Implementation:**
- Create `useHealthCheck` hook
- Track subsystem health status
- Support health check endpoints
- Aggregate system health

**New Files:**
- `src/messages/v2/hooks/health/use-health-check.mycelia.js` - Health check hook
- `src/messages/v2/models/health/health-status.mycelia.js` - Health status model

#### 6.2 System Status API

**Implementation:**
- Add system status route to ServerSubsystem
- Return subsystem status, statistics, health
- Support readiness/liveness endpoints

**Files to Modify:**
- `src/messages/v2/models/server-subsystem/server.subsystem.mycelia.js` - Add health endpoints

### Phase 7: Performance Profiling (Low Priority)

**Goal:** Enable performance profiling and bottleneck identification

#### 7.1 Performance Profiler

**Implementation:**
- Create performance profiler hook
- Track function execution times
- Identify slow operations
- Generate performance reports

**New Files:**
- `src/messages/v2/hooks/profiler/use-profiler.mycelia.js` - Performance profiler hook

## Implementation Priority

### High Priority (Do First)
1. **Phase 1: Distributed Tracing Foundation** - Critical for debugging production issues
2. **Phase 2: Structured Logging** - Essential for log analysis and debugging

### Medium Priority (Do Next)
3. **Phase 3: Enhanced Metrics** - Important for monitoring and alerting
4. **Phase 4: HTTP Request Tracing** - Important for web applications
5. **Phase 6: Health Checks** - Important for production deployments

### Low Priority (Nice to Have)
6. **Phase 5: OpenTelemetry Integration** - Industry standard, but can be added later
7. **Phase 7: Performance Profiling** - Useful for optimization, but not critical

## Detailed Implementation: Phase 1 (Distributed Tracing)

### Step 1: Add Trace ID to Message Metadata

**File:** `src/messages/v2/models/message/message-metadata.utils.mycelia.js`

```javascript
// Add traceId to fixed metadata
const fixedMeta = {
  timestamp: Date.now(),
  type: messageType,
  traceId: options.traceId || generateTraceId(), // NEW
  // ... existing fields
};
```

### Step 2: Generate Trace IDs

**New File:** `src/messages/v2/utils/trace.utils.mycelia.js`

```javascript
/**
 * Generate a unique trace ID
 * @returns {string} Trace ID (UUID v4 format)
 */
export function generateTraceId() {
  return crypto.randomUUID?.() || generateUUIDv4();
}

/**
 * Check if trace ID should be inherited from parent
 * @param {Message} parentMessage - Parent message
 * @returns {string|null} Trace ID or null
 */
export function inheritTraceId(parentMessage) {
  if (!parentMessage) return null;
  const meta = parentMessage.getMeta?.();
  return meta?.getFixedField?.('traceId') || null;
}
```

### Step 3: Propagate Trace IDs in Message Router

**File:** `src/messages/v2/models/message-system/message-router.mycelia.js`

```javascript
// When routing messages, ensure trace ID is propagated
if (message.meta) {
  const traceId = message.meta.getFixedField('traceId');
  if (!traceId) {
    // Generate trace ID if missing
    message.meta.setFixedField('traceId', generateTraceId());
  }
}
```

### Step 4: Add Trace ID to Logs

**File:** `src/messages/v2/utils/logger.utils.mycelia.js`

```javascript
export function createLogger(debug = false, prefix = '', context = {}) {
  const prefixStr = prefix ? `[${prefix}] ` : '';
  const traceId = context.traceId || context.message?.meta?.getFixedField?.('traceId');
  
  return {
    log(...args) {
      if (debug) {
        const logEntry = {
          level: 'INFO',
          timestamp: new Date().toISOString(),
          prefix,
          traceId,
          message: args
        };
        console.log(JSON.stringify(logEntry));
      }
    },
    // ... other methods
  };
}
```

## Detailed Implementation: Phase 2 (Structured Logging)

### Step 1: Create Structured Logger

**New File:** `src/messages/v2/utils/structured-logger.utils.mycelia.js`

```javascript
export function createStructuredLogger(config = {}) {
  const {
    level = 'INFO',
    subsystem = '',
    traceId = null,
    correlationId = null,
    outputFormat = 'json' // 'json' or 'text'
  } = config;

  function log(level, message, metadata = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      subsystem,
      traceId,
      correlationId,
      message,
      ...metadata
    };

    if (outputFormat === 'json') {
      console.log(JSON.stringify(logEntry));
    } else {
      console.log(`[${level}] [${subsystem}] ${message}`, metadata);
    }
  }

  return {
    debug: (msg, meta) => log('DEBUG', msg, meta),
    info: (msg, meta) => log('INFO', msg, meta),
    warn: (msg, meta) => log('WARN', msg, meta),
    error: (msg, meta) => log('ERROR', msg, meta)
  };
}
```

## Testing Strategy

### Unit Tests
- Test trace ID generation and uniqueness
- Test trace ID propagation through messages
- Test structured logger output format
- Test metrics collection accuracy

### Integration Tests
- Test end-to-end tracing across multiple subsystems
- Test HTTP request tracing through ServerSubsystem
- Test trace ID propagation in request/response flows

### Performance Tests
- Measure overhead of tracing (should be minimal)
- Measure structured logging performance
- Measure metrics collection overhead

## Migration Path

### Backward Compatibility
- Keep existing logger API working
- Make structured logging opt-in via configuration
- Make tracing opt-in (default: off for performance)
- Maintain existing statistics API

### Gradual Rollout
1. **Phase 1**: Add trace IDs to messages (non-breaking)
2. **Phase 2**: Add structured logging as opt-in feature
3. **Phase 3**: Enable tracing by default in development
4. **Phase 4**: Enable tracing in production with sampling

## Configuration

### Example Configuration

```javascript
const messageSystem = new MessageSystem('my-app', {
  debug: false,
  observability: {
    tracing: {
      enabled: true,
      sampleRate: 1.0, // 100% in dev, 0.1 in prod
      traceIdHeader: 'X-Trace-Id'
    },
    logging: {
      structured: true,
      level: 'INFO', // DEBUG, INFO, WARN, ERROR
      format: 'json' // 'json' or 'text'
    },
    metrics: {
      enabled: true,
      exportInterval: 60000, // 1 minute
      exportFormat: 'prometheus'
    },
    healthCheck: {
      enabled: true,
      endpoint: '/health'
    }
  }
});
```

## Success Metrics

### Observability Goals
- **100% request traceability**: Every request has a trace ID
- **Sub-second log search**: Structured logs enable fast searching
- **Real-time metrics**: Metrics available within 1 minute
- **Zero performance impact**: Tracing overhead < 1%

### Traceability Goals
- **End-to-end visibility**: Can trace request from HTTP → Message → Response
- **Cross-subsystem tracing**: Can follow message across multiple subsystems
- **Error correlation**: Errors include trace IDs for correlation

## Documentation Updates

### New Documentation Files
- `docs/observability/TRACING.md` - Distributed tracing guide
- `docs/observability/STRUCTURED-LOGGING.md` - Structured logging guide
- `docs/observability/METRICS.md` - Metrics collection guide
- `docs/observability/HEALTH-CHECKS.md` - Health check guide

### Updated Documentation
- Update `README.md` with observability features
- Update `SERVER-SUBSYSTEM.md` with tracing information
- Add observability examples to all subsystem documentation

## Timeline Estimate

- **Phase 1 (Distributed Tracing)**: 2-3 weeks
- **Phase 2 (Structured Logging)**: 1-2 weeks
- **Phase 3 (Enhanced Metrics)**: 2-3 weeks
- **Phase 4 (HTTP Tracing)**: 1 week
- **Phase 5 (OpenTelemetry)**: 2-3 weeks
- **Phase 6 (Health Checks)**: 1 week
- **Phase 7 (Profiling)**: 2 weeks

**Total Estimated Time**: 11-15 weeks (can be done in parallel)

## Next Steps

1. **Review and approve plan** - Get stakeholder buy-in
2. **Start Phase 1** - Implement distributed tracing foundation
3. **Create feature branch** - `feature/observability-tracing`
4. **Write tests first** - TDD approach for critical features
5. **Iterate and refine** - Get feedback early and often

