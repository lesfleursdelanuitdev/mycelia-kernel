/**
 * Configuration Loader
 * 
 * Loads and validates Mycelia application configuration from config.bootstrap.mycelia.js
 * This is an optional system - applications can still bootstrap manually if preferred.
 * 
 * @example
 * // Load config
 * const config = await loadConfig('./config.bootstrap.mycelia.js');
 * 
 * // Use config to bootstrap
 * const messageSystem = await bootstrapFromConfig(config);
 */

import { resolve } from 'path';
import { existsSync } from 'fs';

/**
 * Load configuration from a file
 * 
 * @param {string} [configPath] - Path to config file (defaults to 'config.bootstrap.mycelia.js' in cwd)
 * @returns {Promise<Object>} Configuration object
 * @throws {Error} If config file is invalid or missing (when explicitly provided)
 */
export async function loadConfig(configPath) {
  // Default to config.bootstrap.mycelia.js in current working directory
  const defaultPath = configPath || 'config.bootstrap.mycelia.js';
  
  // Resolve path (support relative and absolute)
  const resolvedPath = resolve(process.cwd(), defaultPath);
  
  // Check if file exists
  if (!existsSync(resolvedPath)) {
    // If no explicit path provided, return null (config is optional)
    if (!configPath) {
      return null;
    }
    // If explicit path provided, throw error
    throw new Error(`Configuration file not found: ${resolvedPath}`);
  }
  
  try {
    // Read and evaluate the config file
    // Note: In a production environment, you might want to use a safer evaluation method
    const configModule = await import(`file://${resolvedPath}`);
    
    // Config file should export a default object or a function that returns config
    let config = configModule.default || configModule.config || configModule;
    
    // If config is a function, call it
    if (typeof config === 'function') {
      config = await config();
    }
    
    // Validate basic structure
    if (!config || typeof config !== 'object') {
      throw new Error('Configuration must export an object or function that returns an object');
    }
    
    // Merge with environment variables (env vars take precedence)
    config = mergeEnvOverrides(config);
    
    return config;
  } catch (error) {
    if (error.code === 'ERR_MODULE_NOT_FOUND' || error.code === 'ENOENT') {
      if (!configPath) {
        return null; // Config is optional
      }
      throw new Error(`Configuration file not found: ${resolvedPath}`);
    }
    throw new Error(`Failed to load configuration: ${error.message}`);
  }
}

/**
 * Merge environment variable overrides into config
 * Environment variables take precedence over config file values
 * 
 * @param {Object} config - Configuration object
 * @returns {Object} Merged configuration
 */
function mergeEnvOverrides(config) {
  const merged = { ...config };
  
  // Override environment
  if (process.env.NODE_ENV) {
    merged.environment = process.env.NODE_ENV;
  }
  
  // Override debug
  if (process.env.DEBUG !== undefined) {
    merged.debug = process.env.DEBUG === 'true' || process.env.DEBUG === '1';
  }
  
  // Override database connection string
  if (process.env.DATABASE_URL && merged.database?.prisma) {
    merged.database.prisma.connectionString = process.env.DATABASE_URL;
  }
  
  // Override server port
  if (process.env.PORT && merged.subsystems?.server) {
    merged.subsystems.server.port = parseInt(process.env.PORT, 10);
  }
  
  // Override websocket port
  if (process.env.WS_PORT && merged.subsystems?.websocket) {
    merged.subsystems.websocket.port = parseInt(process.env.WS_PORT, 10);
  }
  
  // Override JWT secret
  if (process.env.JWT_SECRET && merged.subsystems?.auth?.tokens) {
    merged.subsystems.auth.tokens.signingKey = process.env.JWT_SECRET;
  }
  
  return merged;
}

/**
 * Validate configuration structure
 * 
 * @param {Object} config - Configuration object to validate
 * @returns {Object} Validation result with { valid: boolean, errors: string[] }
 */
export function validateConfig(config) {
  const errors = [];
  
  if (!config || typeof config !== 'object') {
    errors.push('Configuration must be an object');
    return { valid: false, errors };
  }
  
  // Validate environment
  if (config.environment && !['development', 'production', 'test'].includes(config.environment)) {
    errors.push('environment must be one of: development, production, test');
  }
  
  // Validate database config if present
  if (config.database) {
    if (config.database.type && !['prisma', 'sqlite', 'indexeddb', 'memory', null].includes(config.database.type)) {
      errors.push('database.type must be one of: prisma, sqlite, indexeddb, memory, null');
    }
    
    if (config.database.type === 'prisma' && !config.database.prisma) {
      errors.push('database.prisma configuration is required when database.type is "prisma"');
    }
  }
  
  // Validate subsystems config if present
  if (config.subsystems) {
    // Validate server config
    if (config.subsystems.server) {
      if (config.subsystems.server.type && !['hono', 'express', 'fastify', null].includes(config.subsystems.server.type)) {
        errors.push('subsystems.server.type must be one of: hono, express, fastify, null');
      }
      
      if (config.subsystems.server.port && (typeof config.subsystems.server.port !== 'number' || config.subsystems.server.port < 1 || config.subsystems.server.port > 65535)) {
        errors.push('subsystems.server.port must be a number between 1 and 65535');
      }
    }
    
    // Validate websocket config
    if (config.subsystems.websocket) {
      if (config.subsystems.websocket.type && !['ws', 'socket.io', null].includes(config.subsystems.websocket.type)) {
        errors.push('subsystems.websocket.type must be one of: ws, socket.io, null');
      }
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Get default configuration
 * 
 * @returns {Object} Default configuration object
 */
export function getDefaultConfig() {
  return {
    environment: process.env.NODE_ENV || 'development',
    debug: process.env.NODE_ENV === 'development',
    logging: {
      level: 'info',
      format: 'text'
    },
    app: {
      name: 'mycelia-app',
      version: '1.0.0'
    },
    database: {
      enabled: false,
      type: null
    },
    subsystems: {
      auth: {
        enabled: false
      },
      server: {
        enabled: false,
        type: null
      },
      websocket: {
        enabled: false,
        type: null
      }
    }
  };
}

