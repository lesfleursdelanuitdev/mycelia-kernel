/**
 * Init Command
 * Creates a new Mycelia Kernel project structure
 */

import { existsSync, mkdirSync, writeFileSync, copyFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { copyDirectory, createDirectory } from '../utils/file-utils.js';
import { generateBootstrapFile, generatePackageJson, generateGitignore } from '../generators/project-generator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export async function initCommand(options) {
  const cwd = process.cwd();
  const projectName = options.name || cwd.split(/[/\\]/).pop();
  const force = options.force || false;

  console.log(`Initializing Mycelia Kernel project: ${projectName}`);

  // Check if already initialized
  const markerFile = join(cwd, '.mycelia-kernel');
  if (existsSync(markerFile) && !force) {
    console.error('Error: Project already initialized. Use --force to overwrite.');
    process.exit(1);
  }

  try {
    // Create directory structure
    console.log('Creating directory structure...');
    createDirectory(join(cwd, 'src', 'hooks'));
    createDirectory(join(cwd, 'src', 'facet-contracts'));
    createDirectory(join(cwd, 'src', 'subsystems'));
    createDirectory(join(cwd, 'src', 'routes-ui'));
    createDirectory(join(cwd, 'src', 'commands-ui'));

    // Copy mycelia-kernel-v2
    console.log('Copying Mycelia Kernel v2...');
    const kernelSource = join(__dirname, '../../../src/messages/v2');
    const kernelDest = join(cwd, 'mycelia-kernel-v2');
    
    if (existsSync(kernelDest) && !force) {
      console.warn(`Warning: ${kernelDest} already exists. Skipping copy.`);
    } else {
      await copyDirectory(kernelSource, kernelDest, {
        exclude: [
          '**/tests/**',
          '**/CODEBASE_ANALYSIS*.md',
          '**/node_modules/**'
        ]
      });
    }

    // Generate bootstrap file
    console.log('Generating bootstrap file...');
    const bootstrapContent = generateBootstrapFile(projectName);
    writeFileSync(join(cwd, 'bootstrap.mycelia.js'), bootstrapContent);

    // Generate package.json
    console.log('Generating package.json...');
    const packageJsonContent = generatePackageJson(projectName);
    writeFileSync(join(cwd, 'package.json'), packageJsonContent);

    // Generate .gitignore
    console.log('Generating .gitignore...');
    const gitignoreContent = generateGitignore();
    writeFileSync(join(cwd, '.gitignore'), gitignoreContent);

    // Create marker file
    writeFileSync(markerFile, JSON.stringify({ version: '1.0.0', initialized: new Date().toISOString() }, null, 2));

    console.log('\n✅ Project initialized successfully!');
    console.log('\nNext steps:');
    console.log('  1. npm install');
    console.log('  2. mycelia-kernel generate subsystem <Name>');
    console.log('  3. node bootstrap.mycelia.js');
  } catch (error) {
    console.error('Error initializing project:', error.message);
    process.exit(1);
  }
}


