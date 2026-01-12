#!/usr/bin/env node

/**
 * Mycelia Kernel CLI
 * Entry point for CLI commands
 */

import { program } from 'commander';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Import commands
import { initCommand } from '../src/commands/init.js';
import { generateCommand } from '../src/commands/generate.js';
import { createCommand } from '../src/commands/create.js';
import { routesCommand } from '../src/commands/routes.js';
import { commandsCommand } from '../src/commands/commands.js';
import { queriesCommand } from '../src/commands/queries.js';
import { doctorCommand } from '../src/commands/doctor.js';
import { glossaryCommand } from '../src/commands/glossary.js';

// Get version from package.json
let version = '1.0.0';
try {
  const packageJsonPath = join(__dirname, '../../package.json');
  const packageJsonContent = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
  version = packageJsonContent.version || '1.0.0';
} catch (e) {
  // Use default version
}

program
  .name('mycelia-kernel')
  .description('CLI tool for Mycelia Kernel v2 project management')
  .version(version);

// Init command
program
  .command('init')
  .description('Initialize a new Mycelia Kernel project')
  .option('--force', 'Overwrite existing files')
  .option('--name <name>', 'Project name (default: current directory name)')
  .action(initCommand);

// Create command
program
  .command('create')
  .description('Create a new project from a template')
  .argument('<template>', 'Template name: fullstack')
  .argument('<project-name>', 'Name for the new project')
  .option('--database <type>', 'Database type: postgresql, mysql, sqlite (default: postgresql)')
  .option('--with-auth', 'Include authentication subsystem')
  .option('--with-websocket', 'Include WebSocket support')
  .option('--package-manager <manager>', 'Package manager: npm, yarn, pnpm (default: npm)')
  .action(createCommand);

// Generate command
program
  .command('generate')
  .alias('g')
  .description('Generate code files')
  .argument('<type>', 'Type to generate: subsystem, hook, facet-contract, routes-ui, commands-ui, queries-ui, test-utilities, test')
  .argument('[name]', 'Name for the generated item (required for: subsystem, hook, facet-contract, test)')
  .option('--with-example', 'Include example code')
  .option('--use-defaults-async', 'Use canonical (asynchronous) default hooks for subsystem')
  .option('--use-defaults-sync', 'Use synchronous default hooks for subsystem (kernel-like)')
  .option('--test-dir <dir>', 'Test directory (default: tests)')
  .action(generateCommand);

// Routes command
program
  .command('routes')
  .description('List all routes for a subsystem')
  .argument('<subsystem>', 'Subsystem name')
  .action(routesCommand);

// Commands command
program
  .command('commands')
  .description('List all commands for a subsystem')
  .argument('<subsystem>', 'Subsystem name')
  .action(commandsCommand);

// Queries command
program
  .command('queries')
  .description('List all queries for a subsystem')
  .argument('<subsystem>', 'Subsystem name')
  .action(queriesCommand);

// Doctor command
program
  .command('doctor')
  .description('Run health checks on the Mycelia Kernel project')
  .action(doctorCommand);

// Glossary command
program
  .command('glossary')
  .description('Display definitions for Mycelia Kernel terms')
  .argument('[term]', 'Term to look up, or "list" to see all terms, or "search <query>" to search')
  .action(glossaryCommand);

program.parse();

