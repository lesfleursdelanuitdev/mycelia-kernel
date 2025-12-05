/**
 * File Utilities
 * Helper functions for file operations
 */

import { existsSync, mkdirSync, readdirSync, statSync, copyFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { glob } from 'glob';

/**
 * Create directory if it doesn't exist
 */
export function createDirectory(path) {
  if (!existsSync(path)) {
    mkdirSync(path, { recursive: true });
  }
}

/**
 * Convert name to kebab-case
 */
export function toKebabCase(str) {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();
}

/**
 * Convert name to camelCase
 */
export function toCamelCase(str) {
  return str
    .replace(/-([a-z])/g, (g) => g[1].toUpperCase())
    .replace(/^[A-Z]/, (g) => g.toLowerCase());
}

/**
 * Convert name to PascalCase
 */
export function toPascalCase(str) {
  return str
    .split(/[-_\s]/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('');
}

/**
 * Copy directory recursively with exclusions
 */
export async function copyDirectory(source, dest, options = {}) {
  const { exclude = [] } = options;
  
  createDirectory(dest);

  // Get all files
  const files = await glob('**/*', {
    cwd: source,
    dot: true,
    ignore: exclude
  });

  for (const file of files) {
    const sourcePath = join(source, file);
    const destPath = join(dest, file);

    // Check if excluded
    const isExcluded = exclude.some(pattern => {
      if (typeof pattern === 'string') {
        // Simple string matching (glob patterns are handled by glob's ignore option)
        return file.includes(pattern);
      }
      return false;
    });

    if (isExcluded) {
      continue;
    }

    const stat = statSync(sourcePath);
    
    if (stat.isDirectory()) {
      createDirectory(destPath);
    } else {
      createDirectory(dirname(destPath));
      copyFileSync(sourcePath, destPath);
    }
  }
}

/**
 * Find all route definition files
 */
export async function findRouteDefinitionFiles(cwd = process.cwd()) {
  const routeFiles = await glob('src/subsystems/**/*.routes.def.mycelia.js', {
    cwd,
    absolute: true
  });
  return routeFiles;
}

/**
 * Find all command definition files
 */
export async function findCommandDefinitionFiles(cwd = process.cwd()) {
  const commandFiles = await glob('src/subsystems/**/*.commands.def.mycelia.js', {
    cwd,
    absolute: true
  });
  return commandFiles;
}

/**
 * Find all query definition files
 */
export async function findQueryDefinitionFiles(cwd = process.cwd()) {
  const queryFiles = await glob('src/subsystems/**/*.queries.def.mycelia.js', {
    cwd,
    absolute: true
  });
  return queryFiles;
}

