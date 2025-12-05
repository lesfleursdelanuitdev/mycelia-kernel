/**
 * Routes List Command
 * List all routes for a subsystem
 */

import { findDefinitionFile, parseRouteDefinitions } from '../utils/definition-parser.js';
import { formatRoutes } from '../utils/formatter.js';
import { toPascalCase } from '../utils/file-utils.js';

export function routesCommand(subsystemName) {
  if (!subsystemName) {
    console.error('Error: Subsystem name is required');
    console.error('Usage: mycelia-kernel routes <subsystem>');
    process.exit(1);
  }

  const definitionFile = findDefinitionFile(subsystemName, 'routes');
  
  if (!definitionFile) {
    console.error(`Error: Route definition file not found for subsystem "${subsystemName}"`);
    console.error(`Expected: src/subsystems/${subsystemName.toLowerCase()}/${subsystemName.toLowerCase()}.routes.def.mycelia.js`);
    process.exit(1);
  }

  try {
    const routes = parseRouteDefinitions(definitionFile);
    const pascalName = toPascalCase(subsystemName);
    const output = formatRoutes(routes, pascalName);
    console.log(output);
  } catch (error) {
    console.error(`Error parsing route definitions:`, error.message);
    process.exit(1);
  }
}


