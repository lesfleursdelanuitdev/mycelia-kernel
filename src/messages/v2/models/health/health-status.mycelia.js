/**
 * HealthStatus Class
 * 
 * Represents the health status of a subsystem or the entire system.
 * Provides structured health information including status, checks, and metadata.
 * 
 * @example
 * const health = new HealthStatus('healthy', {
 *   subsystem: 'my-subsystem',
 *   checks: {
 *     queue: { status: 'healthy', message: 'Queue utilization: 45%' },
 *     processing: { status: 'healthy', message: 'Processing normally' }
 *   }
 * });
 */
export class HealthStatus {
  /**
   * Create a new HealthStatus instance
   * 
   * @param {string} status - Health status: 'healthy', 'degraded', or 'unhealthy'
   * @param {Object} [options={}] - Health status options
   * @param {string} [options.subsystem] - Subsystem name
   * @param {Object} [options.checks={}] - Individual health checks
   * @param {string} [options.message] - Health status message
   * @param {Object} [options.metadata={}] - Additional metadata
   * @param {number} [options.timestamp] - Timestamp (defaults to now)
   * 
   * @example
   * const health = new HealthStatus('healthy', {
   *   subsystem: 'my-subsystem',
   *   message: 'All systems operational'
   * });
   */
  constructor(status, options = {}) {
    if (!['healthy', 'degraded', 'unhealthy'].includes(status)) {
      throw new Error(`HealthStatus: Invalid status "${status}". Must be 'healthy', 'degraded', or 'unhealthy'`);
    }

    this.status = status;
    this.subsystem = options.subsystem || null;
    this.checks = options.checks || {};
    this.message = options.message || null;
    this.metadata = options.metadata || {};
    this.timestamp = options.timestamp || Date.now();
  }

  /**
   * Check if the health status is healthy
   * @returns {boolean} True if status is 'healthy'
   */
  isHealthy() {
    return this.status === 'healthy';
  }

  /**
   * Check if the health status is degraded
   * @returns {boolean} True if status is 'degraded'
   */
  isDegraded() {
    return this.status === 'degraded';
  }

  /**
   * Check if the health status is unhealthy
   * @returns {boolean} True if status is 'unhealthy'
   */
  isUnhealthy() {
    return this.status === 'unhealthy';
  }

  /**
   * Add a health check result
   * 
   * @param {string} name - Check name
   * @param {string} checkStatus - Check status: 'healthy', 'degraded', or 'unhealthy'
   * @param {string} [message] - Check message
   * @param {Object} [metadata={}] - Check metadata
   * @returns {this}
   * 
   * @example
   * health.addCheck('queue', 'healthy', 'Queue utilization: 45%');
   */
  addCheck(name, checkStatus, message = null, metadata = {}) {
    if (!['healthy', 'degraded', 'unhealthy'].includes(checkStatus)) {
      throw new Error(`HealthStatus.addCheck: Invalid check status "${checkStatus}". Must be 'healthy', 'degraded', or 'unhealthy'`);
    }

    this.checks[name] = {
      status: checkStatus,
      message: message || null,
      metadata: metadata || {},
      timestamp: Date.now()
    };

    // Update overall status based on checks
    this.updateStatusFromChecks();

    return this;
  }

  /**
   * Update overall status based on individual checks
   * @private
   */
  updateStatusFromChecks() {
    const checkValues = Object.values(this.checks);
    if (checkValues.length === 0) return;

    // Determine status: unhealthy > degraded > healthy
    const hasUnhealthy = checkValues.some(check => check.status === 'unhealthy');
    const hasDegraded = checkValues.some(check => check.status === 'degraded');

    if (hasUnhealthy) {
      this.status = 'unhealthy';
    } else if (hasDegraded) {
      this.status = 'degraded';
    } else {
      this.status = 'healthy';
    }
  }

  /**
   * Get health status as JSON
   * @returns {Object} JSON representation
   */
  toJSON() {
    return {
      status: this.status,
      subsystem: this.subsystem,
      checks: this.checks,
      message: this.message,
      metadata: this.metadata,
      timestamp: this.timestamp
    };
  }

  /**
   * Create health status from JSON
   * @param {Object} json - JSON representation
   * @returns {HealthStatus} Health status instance
   */
  static fromJSON(json) {
    return new HealthStatus(json.status, {
      subsystem: json.subsystem,
      checks: json.checks,
      message: json.message,
      metadata: json.metadata,
      timestamp: json.timestamp
    });
  }

  /**
   * Merge multiple health statuses into a system-wide status
   * 
   * @param {Array<HealthStatus>} statuses - Array of health statuses
   * @param {Object} [options={}] - Merge options
   * @param {string} [options.systemName] - System name
   * @returns {HealthStatus} Aggregated health status
   * 
   * @example
   * const systemHealth = HealthStatus.merge([
   *   subsystem1Health,
   *   subsystem2Health,
   *   subsystem3Health
   * ], { systemName: 'my-system' });
   */
  static merge(statuses, options = {}) {
    if (!Array.isArray(statuses) || statuses.length === 0) {
      return new HealthStatus('healthy', {
        subsystem: options.systemName || 'system',
        message: 'No subsystems to check'
      });
    }

    // Determine overall status: unhealthy > degraded > healthy
    const hasUnhealthy = statuses.some(s => s.isUnhealthy());
    const hasDegraded = statuses.some(s => s.isDegraded());

    let overallStatus = 'healthy';
    if (hasUnhealthy) {
      overallStatus = 'unhealthy';
    } else if (hasDegraded) {
      overallStatus = 'degraded';
    }

    // Aggregate checks from all subsystems
    const aggregatedChecks = {};
    for (const status of statuses) {
      const subsystemName = status.subsystem || 'unknown';
      for (const [checkName, checkData] of Object.entries(status.checks)) {
        const aggregatedName = `${subsystemName}.${checkName}`;
        aggregatedChecks[aggregatedName] = {
          ...checkData,
          subsystem: subsystemName
        };
      }
    }

    // Create aggregated metadata
    const metadata = {
      subsystemCount: statuses.length,
      healthyCount: statuses.filter(s => s.isHealthy()).length,
      degradedCount: statuses.filter(s => s.isDegraded()).length,
      unhealthyCount: statuses.filter(s => s.isUnhealthy()).length
    };

    return new HealthStatus(overallStatus, {
      subsystem: options.systemName || 'system',
      checks: aggregatedChecks,
      message: options.message || `System health: ${overallStatus}`,
      metadata
    });
  }
}




