/**
 * Doctor Check Utilities
 * Health check functions for the doctor command
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { glob } from 'glob';
import { findRouteDefinitionFiles, findCommandDefinitionFiles } from './file-utils.js';
import { parseRouteDefinitions, parseCommandDefinitions, parseQueryDefinitions } from './definition-parser.js';
import { toKebabCase, toPascalCase } from './file-utils.js';

/**
 * Find all subsystem files
 */
async function findSubsystemFiles(cwd = process.cwd()) {
  const subsystemFiles = await glob('src/subsystems/**/*.subsystem.mycelia.js', {
    cwd,
    absolute: true
  });
  return subsystemFiles;
}

/**
 * Extract subsystem name from file path
 */
function extractSubsystemName(filePath) {
  const parts = filePath.split(/[/\\]/);
  const subsystemsIndex = parts.indexOf('subsystems');
  if (subsystemsIndex >= 0 && subsystemsIndex < parts.length - 1) {
    return parts[subsystemsIndex + 1];
  }
  return null;
}

/**
 * Extract method names from subsystem class
 */
function extractMethodsFromSubsystem(subsystemFile) {
  const content = readFileSync(subsystemFile, 'utf-8');
  const methods = [];
  
  // Match method definitions: methodName() { or methodName = () => { or async methodName() {
  const methodPattern = /(?:async\s+)?(\w+)\s*[=(]\s*(?:async\s*)?\(/g;
  let match;
  
  while ((match = methodPattern.exec(content)) !== null) {
    const methodName = match[1];
    // Skip constructor, onInit, and other common methods
    if (!['constructor', 'onInit', 'onDispose', 'accept', 'process'].includes(methodName)) {
      methods.push(methodName);
    }
  }
  
  return methods;
}

/**
 * Check for missing handlers
 */
export async function checkMissingHandlers(cwd = process.cwd()) {
  const errors = [];
  const subsystemFiles = await findSubsystemFiles(cwd);
  
  for (const subsystemFile of subsystemFiles) {
    const subsystemName = extractSubsystemName(subsystemFile);
    if (!subsystemName) continue;
    
    const kebabName = toKebabCase(subsystemName);
    const methods = extractMethodsFromSubsystem(subsystemFile);
    
    // Check routes
    const routesFile = join(cwd, 'src', 'subsystems', kebabName, `${kebabName}.routes.def.mycelia.js`);
    if (existsSync(routesFile)) {
      const routes = parseRouteDefinitions(routesFile);
      for (const route of routes) {
        if (route.handler && !methods.includes(route.handler)) {
          errors.push({
            type: 'missing-handler',
            severity: 'error',
            subsystem: toPascalCase(subsystemName),
            message: `Missing handler: ${toPascalCase(subsystemName)}Subsystem.${route.handler} (route: ${route.name})`,
            details: {
              handler: route.handler,
              route: route.name,
              path: route.path
            }
          });
        }
      }
    }
    
    // Check commands
    const commandsFile = join(cwd, 'src', 'subsystems', kebabName, `${kebabName}.commands.def.mycelia.js`);
    if (existsSync(commandsFile)) {
      const commands = parseCommandDefinitions(commandsFile);
      for (const command of commands) {
        if (command.handler && !methods.includes(command.handler)) {
          errors.push({
            type: 'missing-handler',
            severity: 'error',
            subsystem: toPascalCase(subsystemName),
            message: `Missing handler: ${toPascalCase(subsystemName)}Subsystem.${command.handler} (command: ${command.name})`,
            details: {
              handler: command.handler,
              command: command.name,
              path: command.path
            }
          });
        }
      }
    }
    
    // Check queries
    const queriesFile = join(cwd, 'src', 'subsystems', kebabName, `${kebabName}.queries.def.mycelia.js`);
    if (existsSync(queriesFile)) {
      const queries = parseQueryDefinitions(queriesFile);
      for (const query of queries) {
        if (query.handler && !methods.includes(query.handler)) {
          errors.push({
            type: 'missing-handler',
            severity: 'error',
            subsystem: toPascalCase(subsystemName),
            message: `Missing handler: ${toPascalCase(subsystemName)}Subsystem.${query.handler} (query: ${query.name})`,
            details: {
              handler: query.handler,
              query: query.name,
              path: query.path
            }
          });
        }
      }
    }
  }
  
  return errors;
}

/**
 * Check for malformed metadata
 */
export async function checkMalformedMetadata(cwd = process.cwd()) {
  const errors = [];
  const warnings = [];
  const subsystemFiles = await findSubsystemFiles(cwd);
  
  for (const subsystemFile of subsystemFiles) {
    const subsystemName = extractSubsystemName(subsystemFile);
    if (!subsystemName) continue;
    
    const kebabName = toKebabCase(subsystemName);
    const pascalName = toPascalCase(subsystemName);
    
    // Check routes metadata
    const routesFile = join(cwd, 'src', 'subsystems', kebabName, `${kebabName}.routes.def.mycelia.js`);
    if (existsSync(routesFile)) {
      const routes = parseRouteDefinitions(routesFile);
      for (const route of routes) {
        if (route.metadata) {
          // Check for common required fields (optional check)
          if (!route.metadata.method) {
            warnings.push({
              type: 'malformed-metadata',
              severity: 'warning',
              subsystem: pascalName,
              message: `Route '${route.name}' missing 'method' in metadata`,
              details: {
                route: route.name,
                path: route.path,
                missing: 'method'
              }
            });
          }
        }
      }
    }
    
    // Check commands metadata
    const commandsFile = join(cwd, 'src', 'subsystems', kebabName, `${kebabName}.commands.def.mycelia.js`);
    if (existsSync(commandsFile)) {
      const commands = parseCommandDefinitions(commandsFile);
      for (const command of commands) {
        if (command.metadata) {
          if (!command.metadata.method) {
            warnings.push({
              type: 'malformed-metadata',
              severity: 'warning',
              subsystem: pascalName,
              message: `Command '${command.name}' missing 'method' in metadata`,
              details: {
                command: command.name,
                path: command.path,
                missing: 'method'
              }
            });
          }
        }
      }
    }
    
    // Check queries metadata
    const queriesFile = join(cwd, 'src', 'subsystems', kebabName, `${kebabName}.queries.def.mycelia.js`);
    if (existsSync(queriesFile)) {
      const queries = parseQueryDefinitions(queriesFile);
      for (const query of queries) {
        if (query.metadata) {
          if (!query.metadata.method) {
            warnings.push({
              type: 'malformed-metadata',
              severity: 'warning',
              subsystem: pascalName,
              message: `Query '${query.name}' missing 'method' in metadata`,
              details: {
                query: query.name,
                path: query.path,
                missing: 'method'
              }
            });
          }
        }
      }
    }
  }
  
  return { errors, warnings };
}

/**
 * Extract hooks from subsystem file
 */
function extractHooksFromSubsystem(subsystemFile) {
  const content = readFileSync(subsystemFile, 'utf-8');
  const hooks = [];
  
  // Check for defaultHooks
  if (content.includes('createCanonicalDefaultHooks') || content.includes('createSynchronousDefaultHooks')) {
    // We'll need to check which one - for now, assume canonical
    hooks.push('defaults-canonical');
  }
  
  // Check for use() calls
  const usePattern = /\.use\((\w+)\)/g;
  let match;
  while ((match = usePattern.exec(content)) !== null) {
    hooks.push(match[1]);
  }
  
  return hooks;
}

/**
 * Hook dependency map (known hooks and their requirements)
 */
const HOOK_DEPENDENCIES = {
  'useScheduler': ['queue', 'processor', 'statistics'],
  'useQueries': ['router', 'requests'],
  'useCommands': ['router', 'channels', 'requests'],
  'useListeners': [],
  'useRouter': [],
  'useQueue': [],
  'useMessageProcessor': ['queue'],
  'useStatistics': [],
  'useMessages': [],
  'useRequests': ['messages'],
  'useChannels': [],
  'useResponses': ['messages'],
  'useSynchronous': [],
  'useHierarchy': []
};

/**
 * Get default hooks dependencies
 */
function getDefaultHooksDependencies(defaultHooksType) {
  // These are the hooks included in default sets
  if (defaultHooksType === 'canonical') {
    return {
      'useHierarchy': [],
      'useRouter': [],
      'useMessages': [],
      'useRequests': ['messages'],
      'useChannels': [],
      'useCommands': ['router', 'channels', 'requests'],
      'useResponses': ['messages'],
      'useMessageProcessor': ['queue'],
      'useQueue': [],
      'useScheduler': ['queue', 'processor', 'statistics'],
      'useListeners': [],
      'useStatistics': [],
      'useQueries': ['router', 'requests']
    };
  } else if (defaultHooksType === 'synchronous') {
    return {
      'useListeners': [],
      'useStatistics': [],
      'useQueries': ['router', 'requests'],
      'useRouter': [],
      'useMessages': [],
      'useRequests': ['messages'],
      'useChannels': [],
      'useCommands': ['router', 'channels', 'requests'],
      'useResponses': ['messages'],
      'useQueue': [],
      'useMessageProcessor': ['queue'],
      'useSynchronous': [],
      'useHierarchy': []
    };
  }
  return {};
}

/**
 * Check for missing hook dependencies
 */
export async function checkMissingHookDependencies(cwd = process.cwd()) {
  const errors = [];
  const subsystemFiles = await findSubsystemFiles(cwd);
  
  for (const subsystemFile of subsystemFiles) {
    const subsystemName = extractSubsystemName(subsystemFile);
    if (!subsystemName) continue;
    
    const content = readFileSync(subsystemFile, 'utf-8');
    const pascalName = toPascalCase(subsystemName);
    
    // Determine default hooks type
    let defaultHooksType = null;
    let defaultHooksDeps = {};
    if (content.includes('createCanonicalDefaultHooks')) {
      defaultHooksType = 'canonical';
      defaultHooksDeps = getDefaultHooksDependencies('canonical');
    } else if (content.includes('createSynchronousDefaultHooks')) {
      defaultHooksType = 'synchronous';
      defaultHooksDeps = getDefaultHooksDependencies('synchronous');
    }
    
    // Get all hooks (defaults + explicit)
    const allHooks = new Set();
    const hookDependencies = { ...defaultHooksDeps };
    
    // Add default hooks
    if (defaultHooksType) {
      Object.keys(defaultHooksDeps).forEach(hook => allHooks.add(hook));
    }
    
    // Extract explicit hooks
    const usePattern = /\.use\((\w+)\)/g;
    let match;
    while ((match = usePattern.exec(content)) !== null) {
      const hookName = match[1];
      allHooks.add(hookName);
      // Add known dependencies
      if (HOOK_DEPENDENCIES[hookName]) {
        hookDependencies[hookName] = HOOK_DEPENDENCIES[hookName];
      }
    }
    
    // Check dependencies
    for (const hook of allHooks) {
      const deps = hookDependencies[hook] || HOOK_DEPENDENCIES[hook] || [];
      for (const dep of deps) {
        // Convert dependency name to hook name (e.g., 'queue' -> 'useQueue')
        const depHookName = dep.startsWith('use') ? dep : `use${dep.charAt(0).toUpperCase() + dep.slice(1)}`;
        const depFacetName = dep;
        
        // Check if dependency is satisfied
        const hasHook = allHooks.has(depHookName);
        const hasFacet = Array.from(allHooks).some(h => {
          // Some hooks provide multiple facets
          if (depFacetName === 'processor' && h === 'useMessageProcessor') return true;
          if (depFacetName === 'statistics' && h === 'useStatistics') return true;
          return false;
        });
        
        if (!hasHook && !hasFacet) {
          errors.push({
            type: 'missing-dependency',
            severity: 'error',
            subsystem: pascalName,
            message: `Hook '${hook}' requires '${dep}' but no corresponding hook found`,
            details: {
              hook,
              required: dep,
              missing: depHookName
            }
          });
        }
      }
    }
  }
  
  return errors;
}

/**
 * Check for duplicate route paths
 */
export async function checkDuplicateRoutePaths(cwd = process.cwd()) {
  const errors = [];
  const routeFiles = await findRouteDefinitionFiles(cwd);
  const pathMap = new Map(); // path -> [{ subsystem, route }]
  
  for (const routeFile of routeFiles) {
    const subsystemName = extractSubsystemName(routeFile);
    if (!subsystemName) continue;
    
    const routes = parseRouteDefinitions(routeFile);
    for (const route of routes) {
      if (!pathMap.has(route.path)) {
        pathMap.set(route.path, []);
      }
      pathMap.get(route.path).push({
        subsystem: toPascalCase(subsystemName),
        route: route.name
      });
    }
  }
  
  // Find duplicates
  for (const [path, entries] of pathMap.entries()) {
    if (entries.length > 1) {
      errors.push({
        type: 'duplicate-route',
        severity: 'error',
        message: `Duplicate route path: '${path}'`,
        details: {
          path,
          occurrences: entries
        }
      });
    }
  }
  
  return errors;
}

/**
 * Check for orphaned channels
 */
export async function checkOrphanedChannels(cwd = process.cwd()) {
  const warnings = [];
  const commandFiles = await findCommandDefinitionFiles(cwd);
  const channels = new Map(); // channel -> { subsystem, command }
  
  // Collect all channels from command definitions
  for (const commandFile of commandFiles) {
    const subsystemName = extractSubsystemName(commandFile);
    if (!subsystemName) continue;
    
    const commands = parseCommandDefinitions(commandFile);
    for (const command of commands) {
      if (command.channel && command.createChannel) {
        const channelKey = command.channel;
        if (!channels.has(channelKey)) {
          channels.set(channelKey, []);
        }
        channels.get(channelKey).push({
          subsystem: toPascalCase(subsystemName),
          command: command.name
        });
      }
    }
  }
  
  // Check if channels are referenced in routes or elsewhere
  // For now, we'll just warn about channels that are created
  // A more sophisticated check would scan routes-ui and other files
  for (const [channel, entries] of channels.entries()) {
    // Simple check: see if channel is mentioned in routes-ui or other files
    const routesUIFiles = await glob('src/routes-ui/**/*.mycelia.js', { cwd, absolute: true });
    const commandsUIFiles = await glob('src/commands-ui/**/*.mycelia.js', { cwd, absolute: true });
    
    let found = false;
    for (const file of [...routesUIFiles, ...commandsUIFiles]) {
      const content = readFileSync(file, 'utf-8');
      if (content.includes(channel)) {
        found = true;
        break;
      }
    }
    
    if (!found) {
      warnings.push({
        type: 'orphaned-channel',
        severity: 'warning',
        message: `Channel '${channel}' created but may be unused`,
        details: {
          channel,
          createdBy: entries
        }
      });
    }
  }
  
  return warnings;
}

/**
 * Check for unused command definitions
 */
export async function checkUnusedCommands(cwd = process.cwd()) {
  const warnings = [];
  const commandFiles = await findCommandDefinitionFiles(cwd);
  
  // Get all commands
  const allCommands = [];
  for (const commandFile of commandFiles) {
    const subsystemName = extractSubsystemName(commandFile);
    if (!subsystemName) continue;
    
    const commands = parseCommandDefinitions(commandFile);
    for (const command of commands) {
      allCommands.push({
        subsystem: toPascalCase(subsystemName),
        command: command.name,
        path: command.path
      });
    }
  }
  
  // Check if commands are used in commands-ui
  const commandsUIFiles = await glob('src/commands-ui/**/*.mycelia.js', { cwd, absolute: true });
  const usedCommands = new Set();
  
  for (const file of commandsUIFiles) {
    const content = readFileSync(file, 'utf-8');
    // Look for command invocations (simplified check)
    for (const cmd of allCommands) {
      if (content.includes(cmd.command) || content.includes(cmd.path)) {
        usedCommands.add(`${cmd.subsystem}.${cmd.command}`);
      }
    }
  }
  
  // Report unused commands
  for (const cmd of allCommands) {
    const key = `${cmd.subsystem}.${cmd.command}`;
    if (!usedCommands.has(key)) {
      warnings.push({
        type: 'unused-command',
        severity: 'warning',
        subsystem: cmd.subsystem,
        message: `Command '${cmd.command}' defined but may be unused`,
        details: {
          command: cmd.command,
          path: cmd.path
        }
      });
    }
  }
  
  return warnings;
}

