/**
 * Commands-UI Generator
 * Generates commands-ui files from command definitions
 */

import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import { join } from 'path';
import { findCommandDefinitionFiles, toCamelCase } from '../utils/file-utils.js';

export async function generateCommandsUI(options = {}) {
  const cwd = process.cwd();
  const commandsUIDir = join(cwd, 'src', 'commands-ui');

  console.log('Generating commands-ui files...');

  // Create directory
  if (!existsSync(commandsUIDir)) {
    mkdirSync(commandsUIDir, { recursive: true });
  }

  // Find all command definition files
  const commandFiles = await findCommandDefinitionFiles(cwd);
  
  if (commandFiles.length === 0) {
    console.warn('Warning: No command definition files found. Run "mycelia-kernel generate subsystem <Name>" first.');
    return;
  }

  // Generate CommandBuilder
  const commandBuilderContent = generateCommandBuilder();
  writeFileSync(join(commandsUIDir, 'command-builder.mycelia.js'), commandBuilderContent);

  // Process each command file
  const namespaces = {};
  for (const commandFile of commandFiles) {
    const subsystemName = extractSubsystemName(commandFile);
    const namespace = toCamelCase(subsystemName);
    const commands = parseCommandDefinitions(commandFile);
    
    namespaces[namespace] = {
      subsystemName,
      commands
    };

    // Generate namespace file
    const namespaceContent = generateNamespaceFile(namespace, subsystemName, commands, commandFile);
    const namespaceFileName = `${subsystemName}-commands.mycelia.js`;
    writeFileSync(join(commandsUIDir, namespaceFileName), namespaceContent);
  }

  // Generate index file
  const indexContent = generateIndexFile(namespaces);
  writeFileSync(join(commandsUIDir, 'index.mycelia.js'), indexContent);

  console.log(`✅ Commands-UI generated: ${commandsUIDir}`);
  console.log(`   Generated ${Object.keys(namespaces).length} namespace(s)`);
}

function extractSubsystemName(commandFile) {
  // Extract from path: src/subsystems/example/example.commands.def.mycelia.js
  const parts = commandFile.split(/[/\\]/);
  const subsystemsIndex = parts.indexOf('subsystems');
  if (subsystemsIndex >= 0 && subsystemsIndex < parts.length - 1) {
    return parts[subsystemsIndex + 1];
  }
  return 'unknown';
}

function parseCommandDefinitions(commandFile) {
  const content = readFileSync(commandFile, 'utf-8');
  
  // Extract command definitions using regex
  // Look for export const SUBSYSTEM_COMMANDS = { ... }
  const commandsMatch = content.match(/export\s+const\s+\w+_COMMANDS\s*=\s*\{([\s\S]*?)\};/);
  if (!commandsMatch) {
    return [];
  }

  const commandsContent = commandsMatch[1];
  const commands = [];

  // Parse individual command definitions
  // Pattern: 'commandName': { path: '...', description: '...', handler: '...', channel: '...', ... }
  const commandPattern = /'([^']+)':\s*\{([^}]+)\}/g;
  let match;
  
  while ((match = commandPattern.exec(commandsContent)) !== null) {
    const commandName = match[1];
    const commandDef = match[2];
    
    // Extract path
    const pathMatch = commandDef.match(/path:\s*['"]([^'"]+)['"]/);
    const path = pathMatch ? pathMatch[1] : '';
    
    // Extract description
    const descMatch = commandDef.match(/description:\s*['"]([^'"]+)['"]/);
    const description = descMatch ? descMatch[1] : '';
    
    // Extract handler
    const handlerMatch = commandDef.match(/handler:\s*['"]([^'"]+)['"]/);
    const handler = handlerMatch ? handlerMatch[1] : '';
    
    // Extract channel
    const channelMatch = commandDef.match(/channel:\s*['"]([^'"]+)['"]/);
    const channel = channelMatch ? channelMatch[1] : null;
    
    // Extract replyChannel
    const replyChannelMatch = commandDef.match(/replyChannel:\s*['"]([^'"]+)['"]/);
    const replyChannel = replyChannelMatch ? replyChannelMatch[1] : null;
    
    // Extract createChannel
    const createChannelMatch = commandDef.match(/createChannel:\s*(true|false)/);
    const createChannel = createChannelMatch ? createChannelMatch[1] === 'true' : false;
    
    // Extract timeout
    const timeoutMatch = commandDef.match(/timeout:\s*(\d+)/);
    const timeout = timeoutMatch ? parseInt(timeoutMatch[1], 10) : null;
    
    // Extract metadata (simplified - just get the object)
    const metadataMatch = commandDef.match(/metadata:\s*\{([^}]+)\}/);
    let metadata = {};
    if (metadataMatch) {
      try {
        const metadataContent = metadataMatch[1];
        const keyValuePairs = metadataContent.match(/(\w+):\s*([^,}]+)/g);
        if (keyValuePairs) {
          metadata = {};
          for (const pair of keyValuePairs) {
            const [key, value] = pair.split(':').map(s => s.trim());
            const cleanValue = value.replace(/^['"]|['"]$/g, '');
            if (cleanValue === 'true') metadata[key] = true;
            else if (cleanValue === 'false') metadata[key] = false;
            else if (!isNaN(cleanValue)) metadata[key] = Number(cleanValue);
            else metadata[key] = cleanValue;
          }
        }
      } catch (e) {
        metadata = {};
      }
    }

    commands.push({
      name: commandName,
      path,
      description,
      handler,
      channel,
      replyChannel,
      createChannel,
      timeout,
      metadata
    });
  }

  return commands;
}

function generateCommandBuilder() {
  return `/**
 * CommandBuilder Class
 * Fluent API for building and sending command messages
 */
export class CommandBuilder {
  constructor(subsystem, commandName, payload, config) {
    this.subsystem = subsystem;
    this.commandName = commandName;
    this.payload = payload;
    this.config = config;
    this.options = {};
  }

  /**
   * Set send options
   * @param {Object} options - Send options (timeout, etc.)
   * @returns {CommandBuilder} This builder for chaining
   */
  options(options) {
    this.options = { ...this.options, ...options };
    return this;
  }

  /**
   * Send the command using subsystem.commands.send()
   * @returns {Promise<Object>} Command result
   */
  async send() {
    const commands = this.subsystem.find('commands');
    if (!commands) {
      throw new Error('CommandBuilder: commands facet not found on subsystem. Ensure useCommands hook is used.');
    }

    // Merge config timeout with options timeout (options take precedence)
    const finalOptions = {
      timeout: this.options.timeout || this.config.timeout,
      ...this.options
    };

    return await commands.send(this.commandName, this.payload, finalOptions);
  }
}
`;
}

function generateNamespaceFile(namespace, subsystemName, commands, sourceFile) {
  let functions = '';
  for (const command of commands) {
    const functionName = toCamelCase(command.name);
    const commandPath = command.path.replace(/'/g, "\\'");
    const description = command.description.replace(/'/g, "\\'");
    const metadataStr = JSON.stringify(command.metadata, null, 2).replace(/\n/g, '\n  ');
    
    functions += `  /**
   * ${description}
   * Command: ${command.path}
   * Channel: ${command.channel || command.replyChannel || 'auto-created'}
   */
  ${functionName}(subsystem, payload) {
    return new CommandBuilder(subsystem, '${command.name}', payload, {
      path: '${commandPath}',
      channel: ${command.channel ? `'${command.channel}'` : 'null'},
      replyChannel: ${command.replyChannel ? `'${command.replyChannel}'` : 'null'},
      timeout: ${command.timeout || 'null'},
      metadata: ${metadataStr}
    });
  },

`;
  }

  return `/**
 * ${subsystemName.charAt(0).toUpperCase() + subsystemName.slice(1)} Subsystem Commands
 * Generated from: ${sourceFile.replace(process.cwd(), '.')}
 * Namespace: ${namespace}
 */
import { CommandBuilder } from './command-builder.mycelia.js';

export const ${namespace} = {
${functions.trimEnd().slice(0, -1)}
};
`;
}

function generateIndexFile(namespaces) {
  let imports = '';
  
  for (const [namespace, data] of Object.entries(namespaces)) {
    const fileName = `${data.subsystemName}-commands.mycelia.js`;
    imports += `import { ${namespace} } from './${fileName}';\n`;
  }

  return `/**
 * Commands-UI Index
 * Re-exports all namespaced command functions
 */
${imports}export { CommandBuilder } from './command-builder.mycelia.js';
`;
}


