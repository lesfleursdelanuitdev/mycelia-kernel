/**
 * Formatter Utilities
 * Format output for CLI display
 */

/**
 * Format routes for display
 */
export function formatRoutes(routes, subsystemName) {
  if (routes.length === 0) {
    return `No routes found for ${subsystemName}Subsystem.\n`;
  }

  let output = `\nRoutes for ${subsystemName}Subsystem:\n`;
  output += '━'.repeat(80) + '\n\n';

  for (const route of routes) {
    output += `  ${route.name}\n`;
    output += `    Path:        ${route.path}\n`;
    if (route.description) {
      output += `    Description: ${route.description}\n`;
    }
    output += `    Handler:     ${route.handler}\n`;
    if (Object.keys(route.metadata).length > 0) {
      output += `    Metadata:    ${JSON.stringify(route.metadata)}\n`;
    }
    output += '\n';
  }

  return output;
}

/**
 * Format commands for display
 */
export function formatCommands(commands, subsystemName) {
  if (commands.length === 0) {
    return `No commands found for ${subsystemName}Subsystem.\n`;
  }

  let output = `\nCommands for ${subsystemName}Subsystem:\n`;
  output += '━'.repeat(80) + '\n\n';

  for (const command of commands) {
    output += `  ${command.name}\n`;
    output += `    Path:          ${command.path}\n`;
    if (command.description) {
      output += `    Description:   ${command.description}\n`;
    }
    output += `    Handler:       ${command.handler}\n`;
    if (command.channel) {
      output += `    Channel:       ${command.channel}${command.createChannel ? ' (auto-created)' : ''}\n`;
    }
    if (command.replyChannel) {
      output += `    Reply Channel: ${command.replyChannel}\n`;
    }
    if (command.timeout) {
      output += `    Timeout:       ${command.timeout}ms\n`;
    }
    if (Object.keys(command.metadata).length > 0) {
      output += `    Metadata:      ${JSON.stringify(command.metadata)}\n`;
    }
    output += '\n';
  }

  return output;
}

/**
 * Format queries for display
 */
export function formatQueries(queries, subsystemName) {
  if (queries.length === 0) {
    return `No queries found for ${subsystemName}Subsystem.\n`;
  }

  let output = `\nQueries for ${subsystemName}Subsystem:\n`;
  output += '━'.repeat(80) + '\n\n';

  for (const query of queries) {
    output += `  ${query.name}\n`;
    if (query.path) {
      output += `    Path:        ${query.path}\n`;
    } else {
      output += `    Path:        (auto-generated: subsystem://query/${query.name})\n`;
    }
    if (query.description) {
      output += `    Description: ${query.description}\n`;
    }
    output += `    Handler:     ${query.handler}\n`;
    if (Object.keys(query.metadata).length > 0) {
      output += `    Metadata:    ${JSON.stringify(query.metadata)}\n`;
    }
    output += '\n';
  }

  return output;
}


