/**
 * Routes-UI Generator
 * Generates routes-ui files from route definitions
 */

import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import { join, dirname, basename } from 'path';
import { findRouteDefinitionFiles, toKebabCase, toCamelCase } from '../utils/file-utils.js';

export async function generateRoutesUI(options = {}) {
  const cwd = process.cwd();
  const routesUIDir = join(cwd, 'src', 'routes-ui');

  console.log('Generating routes-ui files...');

  // Create directory
  if (!existsSync(routesUIDir)) {
    mkdirSync(routesUIDir, { recursive: true });
  }

  // Find all route definition files
  const routeFiles = await findRouteDefinitionFiles(cwd);
  
  if (routeFiles.length === 0) {
    console.warn('Warning: No route definition files found. Run "mycelia-kernel generate subsystem <Name>" first.');
    return;
  }

  // Generate RouteBuilder
  const routeBuilderContent = generateRouteBuilder();
  writeFileSync(join(routesUIDir, 'route-builder.mycelia.js'), routeBuilderContent);

  // Process each route file
  const namespaces = {};
  for (const routeFile of routeFiles) {
    const subsystemName = extractSubsystemName(routeFile);
    const namespace = toCamelCase(subsystemName);
    const routes = parseRouteDefinitions(routeFile);
    
    namespaces[namespace] = {
      subsystemName,
      routes
    };

    // Generate namespace file
    const namespaceContent = generateNamespaceFile(namespace, subsystemName, routes, routeFile);
    const namespaceFileName = `${subsystemName}-routes.mycelia.js`;
    writeFileSync(join(routesUIDir, namespaceFileName), namespaceContent);
  }

  // Generate index file
  const indexContent = generateIndexFile(namespaces);
  writeFileSync(join(routesUIDir, 'index.mycelia.js'), indexContent);

  console.log(`✅ Routes-UI generated: ${routesUIDir}`);
  console.log(`   Generated ${Object.keys(namespaces).length} namespace(s)`);
}

function extractSubsystemName(routeFile) {
  // Extract from path: src/subsystems/example/example.routes.def.mycelia.js
  const parts = routeFile.split(/[/\\]/);
  const subsystemsIndex = parts.indexOf('subsystems');
  if (subsystemsIndex >= 0 && subsystemsIndex < parts.length - 1) {
    return parts[subsystemsIndex + 1];
  }
  return 'unknown';
}

function parseRouteDefinitions(routeFile) {
  const content = readFileSync(routeFile, 'utf-8');
  
  // Extract route definitions using regex
  // Look for export const SUBSYSTEM_ROUTES = { ... }
  const routesMatch = content.match(/export\s+const\s+\w+_ROUTES\s*=\s*\{([\s\S]*?)\};/);
  if (!routesMatch) {
    return [];
  }

  const routesContent = routesMatch[1];
  const routes = [];

  // Parse individual route definitions
  // Pattern: 'routeName': { path: '...', description: '...', handler: '...', metadata: {...} }
  const routePattern = /'([^']+)':\s*\{([^}]+)\}/g;
  let match;
  
  while ((match = routePattern.exec(routesContent)) !== null) {
    const routeName = match[1];
    const routeDef = match[2];
    
    // Extract path
    const pathMatch = routeDef.match(/path:\s*['"]([^'"]+)['"]/);
    const path = pathMatch ? pathMatch[1] : '';
    
    // Extract description
    const descMatch = routeDef.match(/description:\s*['"]([^'"]+)['"]/);
    const description = descMatch ? descMatch[1] : '';
    
    // Extract handler
    const handlerMatch = routeDef.match(/handler:\s*['"]([^'"]+)['"]/);
    const handler = handlerMatch ? handlerMatch[1] : '';
    
    // Extract metadata (simplified - just get the object)
    const metadataMatch = routeDef.match(/metadata:\s*\{([^}]+)\}/);
    let metadata = {};
    if (metadataMatch) {
      try {
        // Try to parse metadata object - extract key-value pairs
        const metadataContent = metadataMatch[1];
        const keyValuePairs = metadataContent.match(/(\w+):\s*([^,}]+)/g);
        if (keyValuePairs) {
          metadata = {};
          for (const pair of keyValuePairs) {
            const [key, value] = pair.split(':').map(s => s.trim());
            // Remove quotes from value
            const cleanValue = value.replace(/^['"]|['"]$/g, '');
            // Try to parse as number or boolean
            if (cleanValue === 'true') metadata[key] = true;
            else if (cleanValue === 'false') metadata[key] = false;
            else if (!isNaN(cleanValue)) metadata[key] = Number(cleanValue);
            else metadata[key] = cleanValue;
          }
        }
      } catch (e) {
        // Fallback to empty object
        metadata = {};
      }
    }

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

function generateRouteBuilder() {
  return `/**
 * RouteBuilder Class
 * Fluent API for building and sending route messages
 */
export class RouteBuilder {
  constructor(subsystem, path, metadata = {}) {
    this.subsystem = subsystem;
    this.path = path;
    this.metadata = metadata;
    this.params = {};
    this.body = null;
    this.meta = {};
    this.options = {};
  }

  /**
   * Set route parameters (for parameterized routes like user/{id})
   * @param {Object} params - Route parameters
   * @returns {RouteBuilder} This builder for chaining
   */
  params(params) {
    this.params = { ...this.params, ...params };
    return this;
  }

  /**
   * Set message body
   * @param {Object} body - Message body
   * @returns {RouteBuilder} This builder for chaining
   */
  body(body) {
    this.body = body;
    return this;
  }

  /**
   * Set message metadata
   * @param {Object} meta - Message metadata
   * @returns {RouteBuilder} This builder for chaining
   */
  meta(meta) {
    this.meta = { ...this.meta, ...meta };
    return this;
  }

  /**
   * Set send options
   * @param {Object} options - Send options (responseRequired, timeout, etc.)
   * @returns {RouteBuilder} This builder for chaining
   */
  options(options) {
    this.options = { ...this.options, ...options };
    return this;
  }

  /**
   * Build the final path with parameters substituted
   * @private
   */
  _buildPath() {
    let finalPath = this.path;
    
    // Replace parameters in path: {paramName} -> actual value
    for (const [paramName, paramValue] of Object.entries(this.params)) {
      finalPath = finalPath.replace(\`{\${paramName}}\`, paramValue);
    }
    
    return finalPath;
  }

  /**
   * Create message using subsystem's message factory
   * @private
   */
  _createMessage() {
    const messagesFacet = this.subsystem.find('messages');
    if (!messagesFacet) {
      throw new Error('RouteBuilder: messages facet not found on subsystem');
    }

    const finalPath = this._buildPath();
    
    return messagesFacet.create(finalPath, this.body, this.meta);
  }

  /**
   * Send the message using sendProtected
   * @returns {Promise<Object>} Send result
   */
  async send() {
    if (!this.subsystem.identity) {
      throw new Error('RouteBuilder: subsystem.identity is required for sendProtected');
    }

    const message = this._createMessage();
    
    // Merge metadata.required into options for sendProtected
    const sendOptions = {
      ...this.options
    };

    return await this.subsystem.identity.sendProtected(message, sendOptions);
  }
}
`;
}

function generateNamespaceFile(namespace, subsystemName, routes, sourceFile) {
  const namespacePascal = namespace.charAt(0).toUpperCase() + namespace.slice(1);
  
  let functions = '';
  for (const route of routes) {
    const functionName = toCamelCase(route.name);
    const routePath = route.path.replace(/'/g, "\\'");
    const description = route.description.replace(/'/g, "\\'");
    const metadataStr = JSON.stringify(route.metadata, null, 2).replace(/\n/g, '\n  ');
    
    functions += `  /**
   * ${description}
   * Route: ${route.path}
   */
  ${functionName}(subsystem) {
    return new RouteBuilder(subsystem, '${routePath}', ${metadataStr});
  },

`;
  }

  return `/**
 * ${subsystemName.charAt(0).toUpperCase() + subsystemName.slice(1)} Subsystem Routes
 * Generated from: ${sourceFile.replace(process.cwd(), '.')}
 * Namespace: ${namespace}
 */
import { RouteBuilder } from './route-builder.mycelia.js';

export const ${namespace} = {
${functions.trimEnd().slice(0, -1)}
};
`;
}

function generateIndexFile(namespaces) {
  let imports = '';
  let exports = '';
  
  for (const [namespace, data] of Object.entries(namespaces)) {
    const fileName = `${data.subsystemName}-routes.mycelia.js`;
    imports += `import { ${namespace} } from './${fileName}';\n`;
    exports += `export { ${namespace} } from './${fileName}';\n`;
  }

  return `/**
 * Routes-UI Index
 * Re-exports all namespaced route functions
 */
${imports}export { RouteBuilder } from './route-builder.mycelia.js';
`;
}

