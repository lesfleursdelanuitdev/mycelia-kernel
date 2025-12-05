# Health Checks

## Overview

Health checks provide a way to monitor the operational status of subsystems and the entire system. Mycelia Kernel includes a comprehensive health check system that can be used to determine if subsystems are healthy, degraded, or unhealthy.

**Key Features:**
- **Subsystem Health Checks**: Track individual subsystem health status
- **System-Wide Aggregation**: Aggregate health from all subsystems
- **Readiness/Liveness Endpoints**: Standard Kubernetes-style health endpoints
- **Custom Health Checks**: Register custom health check functions
- **Automatic Checks**: Built-in checks for statistics, queue, and build status

## Health Status

Health status is represented by the `HealthStatus` class, which has three possible states:

- **`healthy`**: System is operating normally
- **`degraded`**: System is operating but with reduced performance or some issues
- **`unhealthy`**: System is not operating correctly

### HealthStatus Class

```javascript
import { HealthStatus } from './models/health/health-status.mycelia.js';

// Create a health status
const health = new HealthStatus('healthy', {
  subsystem: 'my-subsystem',
  message: 'All systems operational',
  metadata: { version: '1.0' }
});

// Add individual checks
health.addCheck('database', 'healthy', 'Database connected');
health.addCheck('cache', 'degraded', 'Cache slow', { latency: 500 });

// Check status
if (health.isHealthy()) {
  console.log('System is healthy');
}

// Convert to JSON
const json = health.toJSON();
```

## useHealthCheck Hook

The `useHealthCheck` hook provides health check functionality to subsystems.

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
console.log(health.status); // 'healthy', 'degraded', or 'unhealthy'
```

### Default Health Checks

When no custom health checks are registered, `useHealthCheck` automatically performs these checks:

1. **Built Check**: Verifies the subsystem is built
2. **Statistics Check**: Checks error rate from statistics
   - `healthy`: Error rate < 5%
   - `degraded`: Error rate 5-10%
   - `unhealthy`: Error rate > 10%
3. **Queue Check**: Checks queue utilization
   - `healthy`: Utilization < 80%
   - `degraded`: Utilization 80-100%
   - `unhealthy`: Utilization = 100% (queue full)

### Custom Health Checks

You can register custom health checks:

```javascript
// Register a custom health check
subsystem.healthCheck.registerCheck('database', async (subsystem, options) => {
  try {
    // Check database connection
    await database.ping();
    return {
      status: 'healthy',
      message: 'Database connected'
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      message: `Database error: ${error.message}`
    };
  }
});

// Health check can return:
// - HealthStatus instance
// - Object with { status, message, metadata }
// - Boolean (true = healthy, false = unhealthy)
// - String ('healthy' or 'unhealthy')
```

### Health Check Function Signature

```javascript
async function healthCheck(subsystem, options) {
  // Perform health check
  // Return HealthStatus, object, boolean, or string
  return { status: 'healthy', message: 'OK' };
}
```

### Managing Health Checks

```javascript
// Register a check
subsystem.healthCheck.registerCheck('my-check', checkFunction);

// Unregister a check
subsystem.healthCheck.unregisterCheck('my-check');

// Get all registered checks
const checks = subsystem.healthCheck.getRegisteredChecks();
// ['database', 'cache', 'my-check']
```

## System-Wide Health

The health aggregator utilities provide system-wide health status:

```javascript
import {
  getSystemHealth,
  getReadinessStatus,
  getLivenessStatus
} from './models/health/health-aggregator.utils.mycelia.js';

// Get aggregated health from all subsystems
const systemHealth = await getSystemHealth(messageSystem, {
  systemName: 'my-system',
  excludeSubsystems: ['internal'] // Exclude certain subsystems
});

console.log(systemHealth.status); // Overall system status
console.log(systemHealth.metadata.healthyCount); // Number of healthy subsystems
console.log(systemHealth.metadata.degradedCount); // Number of degraded subsystems
console.log(systemHealth.metadata.unhealthyCount); // Number of unhealthy subsystems

// Get readiness status (is system ready to accept traffic?)
const readiness = await getReadinessStatus(messageSystem);
// Returns healthy if no subsystems are unhealthy

// Get liveness status (is system alive?)
const liveness = await getLivenessStatus(messageSystem);
// Returns healthy if MessageSystem is built and registry is available
```

## HTTP Health Endpoints

The `ServerSubsystem` automatically registers health check endpoints when the `useHealthCheck` hook is enabled:

- **`GET /health`**: Full system health status
- **`GET /ready`**: Readiness status (returns 200 if ready, 503 if not)
- **`GET /live`**: Liveness status (returns 200 if alive, 503 if not)

### Example HTTP Responses

**GET /health**
```json
{
  "status": "healthy",
  "subsystem": "system",
  "checks": {
    "server.built": {
      "status": "healthy",
      "message": "Subsystem is built",
      "timestamp": 1234567890
    },
    "server.statistics": {
      "status": "healthy",
      "message": "Error rate: 1.00%",
      "metadata": {
        "messagesAccepted": 100,
        "messagesProcessed": 99,
        "processingErrors": 1,
        "errorRate": 0.01
      },
      "timestamp": 1234567890
    }
  },
  "message": "System health aggregated from 3 subsystems",
  "metadata": {
    "subsystemCount": 3,
    "healthyCount": 3,
    "degradedCount": 0,
    "unhealthyCount": 0
  },
  "timestamp": 1234567890
}
```

**GET /ready**
```json
{
  "status": "healthy",
  "subsystem": "system",
  "checks": { ... },
  "message": "System is ready",
  "metadata": {
    "readiness": true
  },
  "timestamp": 1234567890,
  "statusCode": 200
}
```

**GET /live**
```json
{
  "status": "healthy",
  "subsystem": "system",
  "message": "System is alive",
  "metadata": {
    "built": true,
    "registryAvailable": true
  },
  "timestamp": 1234567890,
  "statusCode": 200
}
```

### Enabling Health Endpoints

Health endpoints are enabled by default. To disable them:

```javascript
const serverSubsystem = new ServerSubsystem('server', {
  ms: messageSystem,
  config: {
    healthCheck: {
      enabled: false // Disable health check hook and endpoints
    }
  }
});
```

## Configuration

### useHealthCheck Configuration

```javascript
const subsystem = new BaseSubsystem('my-subsystem', {
  ms: messageSystem,
  config: {
    healthCheck: {
      debug: true // Enable debug logging
    }
  }
});
```

### ServerSubsystem Health Configuration

```javascript
const serverSubsystem = new ServerSubsystem('server', {
  ms: messageSystem,
  config: {
    healthCheck: {
      enabled: true, // Enable health check hook (default: true)
      debug: false   // Enable debug logging
    }
  }
});
```

## Best Practices

1. **Register Custom Checks**: Add custom health checks for critical dependencies (databases, external APIs, etc.)

2. **Use Appropriate Status Levels**:
   - `healthy`: System is operating normally
   - `degraded`: System is operating but with reduced performance
   - `unhealthy`: System is not operating correctly

3. **Include Metadata**: Add metadata to health checks for debugging:
   ```javascript
   health.addCheck('database', 'healthy', 'Connected', {
     latency: 45,
     connectionCount: 10
   });
   ```

4. **Handle Errors Gracefully**: Health checks should never throw errors. Catch and return unhealthy status instead.

5. **Use Readiness/Liveness Separately**:
   - **Readiness**: Can the system accept traffic? (checks all subsystems)
   - **Liveness**: Is the system alive? (checks MessageSystem state)

6. **Monitor Health Regularly**: Set up monitoring to check health endpoints regularly and alert on unhealthy status.

## Integration with Kubernetes

The `/ready` and `/live` endpoints follow Kubernetes conventions:

- **Readiness Probe**: Use `GET /ready` to determine if the pod is ready to receive traffic
- **Liveness Probe**: Use `GET /live` to determine if the pod is alive and should be restarted

Example Kubernetes configuration:

```yaml
livenessProbe:
  httpGet:
    path: /live
    port: 3000
  initialDelaySeconds: 30
  periodSeconds: 10

readinessProbe:
  httpGet:
    path: /ready
    port: 3000
  initialDelaySeconds: 5
  periodSeconds: 5
```

## See Also

- [Distributed Tracing](./TRACING.md) - End-to-end request tracing
- [Structured Logging](./STRUCTURED-LOGGING.md) - JSON-formatted logs
- [ServerSubsystem](../models/server-subsystem/SERVER-SUBSYSTEM.md) - HTTP server subsystem
- [Statistics Hook](../hooks/statistics/USE-STATISTICS.md) - Statistics tracking

