/**
 * Queries-UI Generator
 * Generates queries-ui files from query definitions
 */

import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { findQueryDefinitionFiles, toCamelCase } from '../utils/file-utils.js';
import { parseQueryDefinitions } from '../utils/definition-parser.js';

export async function generateQueriesUI(options = {}) {
  const cwd = process.cwd();
  const queriesUIDir = join(cwd, 'src', 'queries-ui');

  console.log('Generating queries-ui files...');

  // Create directory
  if (!existsSync(queriesUIDir)) {
    mkdirSync(queriesUIDir, { recursive: true });
  }

  // Find all query definition files
  const queryFiles = await findQueryDefinitionFiles(cwd);
  
  if (queryFiles.length === 0) {
    console.warn('Warning: No query definition files found. Run "mycelia-kernel generate subsystem <Name>" first.');
    return;
  }

  // Generate QueryBuilder
  const queryBuilderContent = generateQueryBuilder();
  writeFileSync(join(queriesUIDir, 'query-builder.mycelia.js'), queryBuilderContent);

  // Process each query file
  const namespaces = {};
  for (const queryFile of queryFiles) {
    const subsystemName = extractSubsystemName(queryFile);
    const namespace = toCamelCase(subsystemName);
    const queries = parseQueryDefinitions(queryFile);
    
    namespaces[namespace] = {
      subsystemName,
      queries
    };

    // Generate namespace file
    const namespaceContent = generateNamespaceFile(namespace, subsystemName, queries, queryFile);
    const namespaceFileName = `${subsystemName}-queries.mycelia.js`;
    writeFileSync(join(queriesUIDir, namespaceFileName), namespaceContent);
  }

  // Generate index file
  const indexContent = generateIndexFile(namespaces);
  writeFileSync(join(queriesUIDir, 'index.mycelia.js'), indexContent);

  console.log(`✅ Queries-UI generated: ${queriesUIDir}`);
  console.log(`   Generated ${Object.keys(namespaces).length} namespace(s)`);
}

function extractSubsystemName(queryFile) {
  // Extract from path: src/subsystems/example/example.queries.def.mycelia.js
  const parts = queryFile.split(/[/\\]/);
  const subsystemsIndex = parts.indexOf('subsystems');
  if (subsystemsIndex >= 0 && subsystemsIndex < parts.length - 1) {
    return parts[subsystemsIndex + 1];
  }
  return 'unknown';
}

function generateQueryBuilder() {
  return `/**
 * QueryBuilder Class
 * Fluent API for building and sending query messages
 */
export class QueryBuilder {
  constructor(subsystem, queryNameOrPath, payload) {
    this.subsystem = subsystem;
    this.queryNameOrPath = queryNameOrPath;
    this.payload = payload;
    this.options = {};
  }

  /**
   * Set query options
   * @param {Object} options - Query options (timeout, etc.)
   * @returns {QueryBuilder} This builder for chaining
   */
  options(options) {
    this.options = { ...this.options, ...options };
    return this;
  }

  /**
   * Execute the query using subsystem.queries.ask()
   * @returns {Promise<any>} Query result
   */
  async ask() {
    const queries = this.subsystem.find('queries');
    if (!queries) {
      throw new Error('QueryBuilder: queries facet not found on subsystem. Ensure useQueries hook is used.');
    }

    return await queries.ask(this.queryNameOrPath, this.payload, this.options);
  }
}
`;
}

function generateNamespaceFile(namespace, subsystemName, queries, sourceFile) {
  let functions = '';
  for (const query of queries) {
    const functionName = toCamelCase(query.name);
    const queryPath = query.path ? query.path.replace(/'/g, "\\'") : null;
    const description = query.description.replace(/'/g, "\\'");
    const metadataStr = JSON.stringify(query.metadata, null, 2).replace(/\n/g, '\n  ');
    
    // Use the query name (logical name) or path if provided
    // If path is provided, use it; otherwise use the name which will be resolved to query/<name>
    const queryIdentifier = query.path || query.name;
    
    functions += `  /**
   * ${description}
   * Query: ${query.path || `query/${query.name}`}
   */
  ${functionName}(subsystem, payload) {
    return new QueryBuilder(subsystem, ${query.path ? `'${queryPath}'` : `'${query.name}'`}, payload);
  },

`;
  }

  return `/**
 * ${subsystemName.charAt(0).toUpperCase() + subsystemName.slice(1)} Subsystem Queries
 * Generated from: ${sourceFile.replace(process.cwd(), '.')}
 * Namespace: ${namespace}
 */
import { QueryBuilder } from './query-builder.mycelia.js';

export const ${namespace} = {
${functions.trimEnd().slice(0, -1)}
};
`;
}

function generateIndexFile(namespaces) {
  let imports = '';
  
  for (const [namespace, data] of Object.entries(namespaces)) {
    const fileName = `${data.subsystemName}-queries.mycelia.js`;
    imports += `import { ${namespace} } from './${fileName}';\n`;
  }

  return `/**
 * Queries-UI Index
 * Re-exports all namespaced query functions
 */
${imports}export { QueryBuilder } from './query-builder.mycelia.js';
`;
}


