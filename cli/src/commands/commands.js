/**
 * Commands List Command
 * List all commands for a subsystem
 */

import { findDefinitionFile, parseCommandDefinitions } from '../utils/definition-parser.js';
import { formatCommands } from '../utils/formatter.js';
import { toPascalCase } from '../utils/file-utils.js';

export function commandsCommand(subsystemName) {
  if (!subsystemName) {
    console.error('Error: Subsystem name is required');
    console.error('Usage: mycelia-kernel commands <subsystem>');
    process.exit(1);
  }

  const definitionFile = findDefinitionFile(subsystemName, 'commands');
  
  if (!definitionFile) {
    console.error(`Error: Command definition file not found for subsystem "${subsystemName}"`);
    console.error(`Expected: src/subsystems/${subsystemName.toLowerCase()}/${subsystemName.toLowerCase()}.commands.def.mycelia.js`);
    process.exit(1);
  }

  try {
    const commands = parseCommandDefinitions(definitionFile);
    const pascalName = toPascalCase(subsystemName);
    const output = formatCommands(commands, pascalName);
    console.log(output);
  } catch (error) {
    console.error(`Error parsing command definitions:`, error.message);
    process.exit(1);
  }
}


