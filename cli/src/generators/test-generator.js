/**
 * Test Generator
 * Generates test file scaffolding for subsystems
 */

import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { toKebabCase, toPascalCase } from '../utils/file-utils.js';
import { findDefinitionFile } from '../utils/definition-parser.js';

export async function generateTest(subsystemName, options = {}) {
  const cwd = process.cwd();
  const kebabName = toKebabCase(subsystemName);
  const pascalName = toPascalCase(subsystemName);
  
  // Determine test directory structure
  const testDir = options.testDir || 'tests';
  const subsystemTestDir = join(cwd, testDir, 'subsystems', kebabName);
  
  console.log(`Generating test file for: ${pascalName}Subsystem`);

  // Create directory
  if (!existsSync(subsystemTestDir)) {
    mkdirSync(subsystemTestDir, { recursive: true });
  }

  // Check if subsystem exists
  const subsystemFile = join(cwd, 'src', 'subsystems', kebabName, `${kebabName}.subsystem.mycelia.js`);
  if (!existsSync(subsystemFile)) {
    console.warn(`⚠️  Warning: Subsystem file not found: ${subsystemFile}`);
    console.warn('   Generating test file anyway, but you may need to update imports.');
  }

  // Check for route/command/query definitions
  const routesFile = findDefinitionFile(subsystemName, 'routes');
  const commandsFile = findDefinitionFile(subsystemName, 'commands');
  const queriesFile = findDefinitionFile(subsystemName, 'queries');

  // Generate test file
  const testContent = generateTestFile(pascalName, kebabName, {
    hasRoutes: !!routesFile,
    hasCommands: !!commandsFile,
    hasQueries: !!queriesFile
  });
  
  const testFileName = `${kebabName}.subsystem.test.js`;
  writeFileSync(join(subsystemTestDir, testFileName), testContent);

  console.log(`✅ Test file generated: ${join(subsystemTestDir, testFileName)}`);
}

function generateTestFile(pascalName, kebabName, options = {}) {
  const { hasRoutes, hasCommands, hasQueries } = options;
  const subsystemClassName = `${pascalName}Subsystem`;
  const constantName = pascalName.toUpperCase().replace(/-/g, '_');

  // Build imports based on what exists
  const imports = [
    "import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';",
    "import {",
    "  createTestMessageSystem,",
    "  createTestMessage,",
    "  createTestPkr,",
    "  cleanupTestResources",
    "} from '../../mycelia-kernel-v2/utils/test-utils.mycelia.js';",
    "// Import test utilities (if generated)",
    "// import { createMockSubsystem, createMockRouterFacet } from '../../../src/test-utils/index.mycelia.js';",
    `import { ${subsystemClassName} } from '../../../src/subsystems/${kebabName}/${kebabName}.subsystem.mycelia.js';`
  ];

  if (hasRoutes) {
    imports.push(`// import { ${constantName}_ROUTES } from '../../../src/subsystems/${kebabName}/${kebabName}.routes.def.mycelia.js';`);
  }

  return `${imports.join('\n')}

describe('${subsystemClassName}', () => {
  let messageSystem;
  let subsystem;
  let userPkr;

  beforeAll(async () => {
    // Create test MessageSystem
    messageSystem = await createTestMessageSystem({ debug: true });
    
    // Create test user PKR
    userPkr = createTestPkr('friend', { name: 'test-user' });
    
    // Create and register subsystem
    subsystem = new ${subsystemClassName}('${kebabName}', { ms: messageSystem });
    await messageSystem.registerSubsystem(subsystem);
  });

  afterAll(async () => {
    // Cleanup
    await cleanupTestResources(messageSystem);
  });

  beforeEach(() => {
    // Reset state if needed
  });

  describe('Initialization', () => {
    it('should be created successfully', () => {
      expect(subsystem).toBeDefined();
      expect(subsystem.name).toBe('${kebabName}');
    });

    it('should have required facets', () => {
      expect(subsystem.router).toBeDefined();
      ${hasCommands ? "expect(subsystem.commands).toBeDefined();" : ""}
      ${hasQueries ? "expect(subsystem.queries).toBeDefined();" : ""}
    });
  });

${hasRoutes ? generateRouteTests(pascalName, kebabName) : ""}
${hasCommands ? generateCommandTests(pascalName, kebabName) : ""}
${hasQueries ? generateQueryTests(pascalName, kebabName) : ""}
  describe('Message Processing', () => {
    it('should process messages', async () => {
      const message = createTestMessage('${kebabName}://test', { data: 'test' });
      const result = await subsystem.identity.sendProtected(message);
      
      expect(result).toBeDefined();
      // Add specific assertions based on your implementation
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid messages gracefully', async () => {
      const message = createTestMessage('${kebabName}://invalid/path', {});
      // Add error handling tests
    });
  });
});
`;

  function generateRouteTests(pascalName, kebabName) {
    return `  describe('Routes', () => {
    it('should register routes', () => {
      const router = subsystem.router;
      expect(router).toBeDefined();
      // Add route-specific tests
      // Example:
      // expect(router.hasRoute('${kebabName}://example')).toBe(true);
    });

    it('should handle route messages', async () => {
      // Add route handler tests
      // Example:
      // const message = createTestMessage('${kebabName}://example', { data: 'test' });
      // const result = await subsystem.identity.sendProtected(message);
      // expect(result.success).toBe(true);
    });
  });

`;
  }

  function generateCommandTests(pascalName, kebabName) {
    return `  describe('Commands', () => {
    it('should register commands', () => {
      const commands = subsystem.commands;
      expect(commands).toBeDefined();
      // Add command-specific tests
    });

    it('should handle command messages', async () => {
      // Add command handler tests
      // Example:
      // const result = await subsystem.commands.send('exampleCommand', { data: 'test' });
      // expect(result).toBeDefined();
    });
  });

`;
  }

  function generateQueryTests(pascalName, kebabName) {
    return `  describe('Queries', () => {
    it('should register queries', () => {
      const queries = subsystem.queries;
      expect(queries).toBeDefined();
      // Add query-specific tests
    });

    it('should handle query messages', async () => {
      // Add query handler tests
      // Example:
      // const result = await subsystem.queries.ask('exampleQuery', { id: '123' });
      // expect(result).toBeDefined();
    });
  });

`;
  }
}

