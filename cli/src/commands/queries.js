/**
 * Queries List Command
 * List all queries for a subsystem
 */

import { findDefinitionFile, parseQueryDefinitions } from '../utils/definition-parser.js';
import { formatQueries } from '../utils/formatter.js';
import { toPascalCase } from '../utils/file-utils.js';

export function queriesCommand(subsystemName) {
  if (!subsystemName) {
    console.error('Error: Subsystem name is required');
    console.error('Usage: mycelia-kernel queries <subsystem>');
    process.exit(1);
  }

  const definitionFile = findDefinitionFile(subsystemName, 'queries');
  
  if (!definitionFile) {
    console.error(`Error: Query definition file not found for subsystem "${subsystemName}"`);
    console.error(`Expected: src/subsystems/${subsystemName.toLowerCase()}/${subsystemName.toLowerCase()}.queries.def.mycelia.js`);
    process.exit(1);
  }

  try {
    const queries = parseQueryDefinitions(definitionFile);
    const pascalName = toPascalCase(subsystemName);
    const output = formatQueries(queries, pascalName);
    console.log(output);
  } catch (error) {
    console.error(`Error parsing query definitions:`, error.message);
    process.exit(1);
  }
}


