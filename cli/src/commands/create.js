/**
 * Create Command
 * Creates a new project from a template
 */

import { generateFullstackTemplate } from '../generators/fullstack-generator.js';

export async function createCommand(template, projectName, options) {
  if (!template) {
    console.error('Error: Template name is required');
    console.error('Available templates: fullstack');
    process.exit(1);
  }

  if (!projectName) {
    console.error('Error: Project name is required');
    console.error('Usage: mycelia-kernel create <template> <project-name>');
    process.exit(1);
  }

  // Validate template
  const validTemplates = ['fullstack'];
  if (!validTemplates.includes(template)) {
    console.error(`Error: Unknown template "${template}"`);
    console.error(`Available templates: ${validTemplates.join(', ')}`);
    process.exit(1);
  }

  try {
    switch (template) {
      case 'fullstack':
        await generateFullstackTemplate(projectName, {
          database: options.database || 'postgresql',
          withAuth: options.withAuth || false,
          withWebsocket: options.withWebsocket || false,
          packageManager: options.packageManager || 'npm',
        });
        break;
      default:
        console.error(`Error: Template "${template}" not implemented`);
        process.exit(1);
    }
  } catch (error) {
    console.error(`Error creating project:`, error.message);
    process.exit(1);
  }
}


