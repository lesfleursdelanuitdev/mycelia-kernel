# useHealthCheck Hook

## Overview

The `useHealthCheck` hook provides health check functionality to subsystems. It tracks subsystem health status and provides methods for querying health, registering custom health checks, and aggregating health information.

**Key Features:**
- **Default Health Checks**: Automatic checks for build status, statistics, and queue
- **Custom Health Checks**: Register custom health check functions
- **Health Status Aggregation**: Aggregate health from multiple checks
- **Error Handling**: Graceful handling of health check failures

## Hook Metadata

```javascript
{
  kind: 'healthCheck',
  overwrite: false,
  required: [],
  attach: true,
  source: import.meta.url
}
```

### Properties

- **`kind`**: `'healthCheck'` - Unique identifier for this facet
- **`overwrite`**: `false` - Does not allow overwriting existing health check facet
- **`required`**: `[]` - No required dependencies (optional dependencies: statistics, queue)
- **`attach`**: `true` - Facet is automatically attached to the subsystem as `subsystem.healthCheck`
- **`source`**: `import.meta.url` - Source file location for debugging

## Configuration

The hook reads configuration from `ctx.config.healthCheck`:

```javascript
{
  debug: boolean
}
```

### Configuration Options

- **`debug`** (boolean, optional): Enable debug logging for this hook. Falls back to `ctx.debug` if not specified.

## Facet Methods

### `getHealth()`

Get current health status of the subsystem.

**Signature:**
```javascript
getHealth() => Promise<HealthStatus>
```

**Returns:** `Promise<HealthStatus>` - Health status object

**Behavior:**
- Runs all registered custom health checks
- If no custom checks are registered, runs default health checks (built, statistics, queue)
- Aggregates results into overall health status
- Returns `HealthStatus` instance with status, checks, and metadata

**Example:**
```javascript
const health = await subsystem.healthCheck.getHealth();
console.log(health.status); // 'healthy', 'degraded', or 'unhealthy'
console.log(health.checks); // Object with individual check results
```

### `registerCheck(name, check, options)`

Register a custom health check.

**Signature:**
```javascript
registerCheck(name: string, check: Function, options?: Object) => this
```

**Parameters:**
- **`name`** (string): Unique name for the health check
- **`check`** (Function): Health check function
- **`options`** (Object, optional): Check-specific options

**Returns:** `this` - For method chaining

**Health Check Function Signature:**
```javascript
async function check(subsystem, options) {
  // Perform health check
  // Return one of:
  // - HealthStatus instance
  // - Object with { status, message, metadata }
  // - Boolean (true = healthy, false = unhealthy)
  // - String ('healthy', 'degraded', or 'unhealthy')
}
```

**Example:**
```javascript
subsystem.healthCheck.registerCheck('database', async (subsystem, options) => {
  try {
    await database.ping();
    return { status: 'healthy', message: 'Database connected' };
  } catch (error) {
    return { status: 'unhealthy', message: `Database error: ${error.message}` };
  }
});
```

### `unregisterCheck(name)`

Unregister a health check.

**Signature:**
```javascript
unregisterCheck(name: string) => boolean
```

**Parameters:**
- **`name`** (string): Name of the health check to remove

**Returns:** `boolean` - `true` if check was removed, `false` if not found

**Example:**
```javascript
const removed = subsystem.healthCheck.unregisterCheck('database');
```

### `getRegisteredChecks()`

Get all registered health check names.

**Signature:**
```javascript
getRegisteredChecks() => Array<string>
```

**Returns:** `Array<string>` - Array of registered check names

**Example:**
```javascript
const checks = subsystem.healthCheck.getRegisteredChecks();
// ['database', 'cache', 'external-api']
```

## Default Health Checks

When no custom health checks are registered, the hook automatically performs these checks:

### Built Check

Checks if the subsystem is built.

- **Status**: `healthy` if built, `unhealthy` if not built
- **Message**: "Subsystem is built" or "Subsystem is not built"

### Statistics Check

Checks error rate from statistics (if statistics facet is available).

- **Status**:
  - `healthy`: Error rate < 5%
  - `degraded`: Error rate 5-10%
  - `unhealthy`: Error rate > 10%
- **Message**: "Error rate: X.XX%"
- **Metadata**: Includes `messagesAccepted`, `messagesProcessed`, `processingErrors`, `errorRate`

### Queue Check

Checks queue utilization (if queue facet is available).

- **Status**:
  - `healthy`: Utilization < 80%
  - `degraded`: Utilization 80-100%
  - `unhealthy`: Utilization = 100% (queue full)
- **Message**: "Queue utilization: X.X%"
- **Metadata**: Includes `size`, `capacity`, `utilization`

## Health Status Aggregation

The hook aggregates health check results to determine overall status:

- **Overall Status**: `unhealthy` if any check is `unhealthy`
- **Overall Status**: `degraded` if any check is `degraded` (and none are `unhealthy`)
- **Overall Status**: `healthy` if all checks are `healthy`

## Error Handling

Health checks that throw errors are handled gracefully:

- Error is caught and logged
- Check result is marked as `unhealthy`
- Error message is included in check result
- Overall health status is updated accordingly

## Usage Examples

### Basic Usage

```javascript
import { BaseSubsystem } from './models/base-subsystem/base.subsystem.mycelia.js';
import { useHealthCheck } from './hooks/health/use-health-check.mycelia.js';
import { createCanonicalDefaultHooks } from './models/defaults/default-hooks.mycelia.js';

const subsystem = new BaseSubsystem('my-subsystem', {
  ms: messageSystem
});

await subsystem
  .use(...createCanonicalDefaultHooks())
  .use(useHealthCheck)
  .build();

// Get health status
const health = await subsystem.healthCheck.getHealth();
console.log(health.status);
```

### Custom Health Checks

```javascript
// Register multiple custom checks
subsystem.healthCheck
  .registerCheck('database', async (subsystem) => {
    const connected = await checkDatabase();
    return connected ? 'healthy' : 'unhealthy';
  })
  .registerCheck('cache', async (subsystem) => {
    const latency = await measureCacheLatency();
    if (latency < 50) return 'healthy';
    if (latency < 200) return 'degraded';
    return 'unhealthy';
  })
  .registerCheck('external-api', async (subsystem) => {
    try {
      await externalApi.ping();
      return { status: 'healthy', message: 'API reachable' };
    } catch (error) {
      return { status: 'unhealthy', message: error.message };
    }
  });

// Get health with custom checks
const health = await subsystem.healthCheck.getHealth();
```

### Health Check with Metadata

```javascript
subsystem.healthCheck.registerCheck('database', async (subsystem) => {
  const stats = await getDatabaseStats();
  return {
    status: stats.connections < stats.maxConnections ? 'healthy' : 'degraded',
    message: `Connections: ${stats.connections}/${stats.maxConnections}`,
    metadata: {
      connections: stats.connections,
      maxConnections: stats.maxConnections,
      latency: stats.avgLatency
    }
  };
});
```

## Integration with ServerSubsystem

The `ServerSubsystem` automatically uses `useHealthCheck` and exposes health endpoints:

- `GET /health` - Full system health
- `GET /ready` - Readiness status
- `GET /live` - Liveness status

See [Health Checks](../observability/HEALTH-CHECKS.md) for more information.

## See Also

- [Health Checks](../observability/HEALTH-CHECKS.md) - Complete health check documentation
- [HealthStatus](../../models/health/HEALTH-STATUS.md) - Health status model
- [Statistics Hook](../statistics/USE-STATISTICS.md) - Statistics tracking
- [Queue Hook](../queue/USE-QUEUE.md) - Queue management




