/**
 * Generate Command
 * Generates code files (subsystem, hook, facet-contract, routes-ui)
 */

import { generateSubsystem } from '../generators/subsystem-generator.js';
import { generateHook } from '../generators/hook-generator.js';
import { generateFacetContract } from '../generators/facet-contract-generator.js';
import { generateRoutesUI } from '../generators/routes-ui-generator.js';
import { generateCommandsUI } from '../generators/commands-ui-generator.js';
import { generateQueriesUI } from '../generators/queries-ui-generator.js';

export async function generateCommand(type, name, options) {
  if (!name && type !== 'routes-ui' && type !== 'commands-ui' && type !== 'queries-ui') {
    console.error(`Error: Name is required for generating ${type}`);
    process.exit(1);
  }

  // Validate default hooks options (mutually exclusive)
  if (type === 'subsystem') {
    if (options.useDefaultsAsync && options.useDefaultsSync) {
      console.error('Error: Cannot use both --use-defaults-async and --use-defaults-sync');
      process.exit(1);
    }
  }

  try {
    switch (type) {
      case 'subsystem':
        await generateSubsystem(name, options);
        break;
      case 'hook':
        await generateHook(name, options);
        break;
      case 'facet-contract':
        await generateFacetContract(name, options);
        break;
      case 'routes-ui':
        await generateRoutesUI(options);
        break;
      case 'commands-ui':
        await generateCommandsUI(options);
        break;
      case 'queries-ui':
        await generateQueriesUI(options);
        break;
      default:
        console.error(`Error: Unknown type "${type}"`);
        console.error('Valid types: subsystem, hook, facet-contract, routes-ui, commands-ui, queries-ui');
        process.exit(1);
    }
  } catch (error) {
    console.error(`Error generating ${type}:`, error.message);
    process.exit(1);
  }
}


