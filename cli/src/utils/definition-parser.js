/**
 * Definition Parser Utilities
 * Parse route, command, and query definition files
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { existsSync } from 'fs';
import { toKebabCase } from './file-utils.js';

/**
 * Find definition file for a subsystem
 */
export function findDefinitionFile(subsystemName, type, cwd = process.cwd()) {
  const kebabName = toKebabCase(subsystemName);
  const filePath = join(cwd, 'src', 'subsystems', kebabName, `${kebabName}.${type}.def.mycelia.js`);
  
  if (!existsSync(filePath)) {
    return null;
  }
  
  return filePath;
}

/**
 * Parse metadata object from definition string
 */
function parseMetadata(metadataString) {
  if (!metadataString) return {};
  
  try {
    const metadata = {};
    const keyValuePairs = metadataString.match(/(\w+):\s*([^,}]+)/g);
    if (keyValuePairs) {
      for (const pair of keyValuePairs) {
        const [key, value] = pair.split(':').map(s => s.trim());
        const cleanValue = value.replace(/^['"]|['"]$/g, '');
        if (cleanValue === 'true') metadata[key] = true;
        else if (cleanValue === 'false') metadata[key] = false;
        else if (!isNaN(cleanValue)) metadata[key] = Number(cleanValue);
        else metadata[key] = cleanValue;
      }
    }
    return metadata;
  } catch (e) {
    return {};
  }
}

/**
 * Parse route definitions from file
 */
export function parseRouteDefinitions(routeFile) {
  const content = readFileSync(routeFile, 'utf-8');
  
  // Extract route definitions using regex
  const routesMatch = content.match(/export\s+const\s+\w+_ROUTES\s*=\s*\{([\s\S]*?)\};/);
  if (!routesMatch) {
    return [];
  }

  const routesContent = routesMatch[1];
  const routes = [];

  // Parse individual route definitions
  const routePattern = /'([^']+)':\s*\{([^}]+)\}/g;
  let match;
  
  while ((match = routePattern.exec(routesContent)) !== null) {
    const routeName = match[1];
    const routeDef = match[2];
    
    const pathMatch = routeDef.match(/path:\s*['"]([^'"]+)['"]/);
    const path = pathMatch ? pathMatch[1] : '';
    
    const descMatch = routeDef.match(/description:\s*['"]([^'"]+)['"]/);
    const description = descMatch ? descMatch[1] : '';
    
    const handlerMatch = routeDef.match(/handler:\s*['"]([^'"]+)['"]/);
    const handler = handlerMatch ? handlerMatch[1] : '';
    
    const metadataMatch = routeDef.match(/metadata:\s*\{([^}]+)\}/);
    const metadata = parseMetadata(metadataMatch ? metadataMatch[1] : null);

    routes.push({
      name: routeName,
      path,
      description,
      handler,
      metadata
    });
  }

  return routes;
}

/**
 * Parse command definitions from file
 */
export function parseCommandDefinitions(commandFile) {
  const content = readFileSync(commandFile, 'utf-8');
  
  // Extract command definitions using regex
  const commandsMatch = content.match(/export\s+const\s+\w+_COMMANDS\s*=\s*\{([\s\S]*?)\};/);
  if (!commandsMatch) {
    return [];
  }

  const commandsContent = commandsMatch[1];
  const commands = [];

  // Parse individual command definitions
  const commandPattern = /'([^']+)':\s*\{([^}]+)\}/g;
  let match;
  
  while ((match = commandPattern.exec(commandsContent)) !== null) {
    const commandName = match[1];
    const commandDef = match[2];
    
    const pathMatch = commandDef.match(/path:\s*['"]([^'"]+)['"]/);
    const path = pathMatch ? pathMatch[1] : '';
    
    const descMatch = commandDef.match(/description:\s*['"]([^'"]+)['"]/);
    const description = descMatch ? descMatch[1] : '';
    
    const handlerMatch = commandDef.match(/handler:\s*['"]([^'"]+)['"]/);
    const handler = handlerMatch ? handlerMatch[1] : '';
    
    const channelMatch = commandDef.match(/channel:\s*['"]([^'"]+)['"]/);
    const channel = channelMatch ? channelMatch[1] : null;
    
    const replyChannelMatch = commandDef.match(/replyChannel:\s*['"]([^'"]+)['"]/);
    const replyChannel = replyChannelMatch ? replyChannelMatch[1] : null;
    
    const createChannelMatch = commandDef.match(/createChannel:\s*(true|false)/);
    const createChannel = createChannelMatch ? createChannelMatch[1] === 'true' : false;
    
    const timeoutMatch = commandDef.match(/timeout:\s*(\d+)/);
    const timeout = timeoutMatch ? parseInt(timeoutMatch[1], 10) : null;
    
    const metadataMatch = commandDef.match(/metadata:\s*\{([^}]+)\}/);
    const metadata = parseMetadata(metadataMatch ? metadataMatch[1] : null);

    commands.push({
      name: commandName,
      path,
      description,
      handler,
      channel,
      replyChannel,
      createChannel,
      timeout,
      metadata
    });
  }

  return commands;
}

/**
 * Parse query definitions from file
 */
export function parseQueryDefinitions(queryFile) {
  const content = readFileSync(queryFile, 'utf-8');
  
  // Extract query definitions using regex
  const queriesMatch = content.match(/export\s+const\s+\w+_QUERIES\s*=\s*\{([\s\S]*?)\};/);
  if (!queriesMatch) {
    return [];
  }

  const queriesContent = queriesMatch[1];
  const queries = [];

  // Parse individual query definitions
  const queryPattern = /'([^']+)':\s*\{([^}]+)\}/g;
  let match;
  
  while ((match = queryPattern.exec(queriesContent)) !== null) {
    const queryName = match[1];
    const queryDef = match[2];
    
    const nameMatch = queryDef.match(/name:\s*['"]([^'"]+)['"]/);
    const name = nameMatch ? nameMatch[1] : queryName;
    
    const pathMatch = queryDef.match(/path:\s*['"]([^'"]+)['"]/);
    const path = pathMatch ? pathMatch[1] : null;
    
    const descMatch = queryDef.match(/description:\s*['"]([^'"]+)['"]/);
    const description = descMatch ? descMatch[1] : '';
    
    const handlerMatch = queryDef.match(/handler:\s*['"]([^'"]+)['"]/);
    const handler = handlerMatch ? handlerMatch[1] : '';
    
    const metadataMatch = queryDef.match(/metadata:\s*\{([^}]+)\}/);
    const metadata = parseMetadata(metadataMatch ? metadataMatch[1] : null);

    queries.push({
      name,
      path,
      description,
      handler,
      metadata
    });
  }

  return queries;
}


