/**
 * Mycelia Kernel Glossary
 * Definitions for key terms and concepts
 */

export const GLOSSARY = {
  // Tier 1: Core Architecture
  'subsystem': {
    term: 'Subsystem',
    category: 'Core Architecture',
    definition: 'A subsystem is a core building block in Mycelia that extends BaseSubsystem. It represents a modular, composable unit of functionality that can process messages, manage state, and integrate with other subsystems.',
    characteristics: [
      'Extends BaseSubsystem',
      'Can process messages',
      'Manages its own state',
      'Composable via hooks',
      'Can have parent-child relationships'
    ],
    related: ['BaseSubsystem', 'Facet', 'Hook', 'MessageSystem'],
    example: 'UserServiceSubsystem, DataProcessorSubsystem'
  },

  'basesubsystem': {
    term: 'BaseSubsystem',
    category: 'Core Architecture',
    definition: 'The base class for all subsystems in Mycelia. It provides the foundation for hook-based architecture, facet management, lifecycle management, and message processing capabilities.',
    characteristics: [
      'Base class for all subsystems',
      'Manages hooks and facets',
      'Provides build/dispose lifecycle',
      'Supports hierarchical structure',
      'Handles message processing'
    ],
    related: ['Subsystem', 'Facet', 'Hook', 'Builder'],
    example: 'class MySubsystem extends BaseSubsystem { ... }'
  },

  'facet': {
    term: 'Facet',
    category: 'Core Architecture',
    definition: 'A facet is an object that provides specific capabilities to a subsystem. Facets are created by hooks during the build process and are managed by the FacetManager. They can be attached to subsystems for easy access.',
    characteristics: [
      'Created by hooks',
      'Managed by FacetManager',
      'Can be attached to subsystem',
      'Provides specific functionality',
      'Has a unique kind identifier'
    ],
    related: ['Hook', 'BaseSubsystem', 'FacetManager'],
    example: 'router facet, queue facet, scheduler facet'
  },

  'hook': {
    term: 'Hook',
    category: 'Core Architecture',
    definition: 'A hook is a function that creates and returns a Facet. Hooks are the primary mechanism for extending subsystem functionality. They encapsulate metadata (dependencies, behavior) and factory logic.',
    characteristics: [
      'Function that creates a Facet',
      'Has metadata (kind, required, attach)',
      'Executed during build',
      'Can declare dependencies',
      'Enables composable architecture'
    ],
    related: ['Facet', 'BaseSubsystem', 'Builder'],
    example: 'useRouter, useQueue, useScheduler'
  },

  'messagesystem': {
    term: 'MessageSystem',
    category: 'Core Architecture',
    definition: 'The central coordinator for message-driven architecture in Mycelia. It manages subsystems, routes messages, coordinates scheduling, and provides the kernel subsystem for system-level operations.',
    characteristics: [
      'Central coordinator',
      'Manages subsystem registry',
      'Routes messages between subsystems',
      'Coordinates global scheduling',
      'Provides kernel subsystem'
    ],
    related: ['Subsystem', 'Message', 'KernelSubsystem', 'Route'],
    example: 'const ms = new MessageSystem("main"); await ms.bootstrap();'
  },

  'message': {
    term: 'Message',
    category: 'Communication',
    definition: 'A structured data object used for inter-subsystem communication in Mycelia. Messages contain payload data, metadata, and a path that determines routing. They support commands, queries, and events.',
    characteristics: [
      'Structured data object',
      'Contains path for routing',
      'Has payload and metadata',
      'Supports multiple communication types',
      'Enables loose coupling'
    ],
    related: ['Route', 'Command', 'Query', 'Event', 'MessageSystem'],
    example: 'const msg = messages.create("user://get", { userId: "123" });'
  },

  'command': {
    term: 'Command',
    category: 'Communication',
    definition: 'An asynchronous operation that performs an action and returns a result via a channel. Commands are fire-and-forget with channel-based replies, making them ideal for operations that may take time or need to notify multiple parties.',
    characteristics: [
      'Asynchronous operation',
      'Channel-based replies',
      'Fire-and-forget pattern',
      'Can notify multiple parties',
      'Supports timeout handling'
    ],
    related: ['Channel', 'Request', 'useCommands', 'Response'],
    example: 'await subsystem.commands.send("saveData", { data: {...} });'
  },

  'query': {
    term: 'Query',
    category: 'Communication',
    definition: 'A synchronous, read-only operation that retrieves data immediately. Queries bypass the message queue and use one-shot requests for immediate response, making them ideal for data retrieval and status checks.',
    characteristics: [
      'Synchronous execution',
      'Read-only operation',
      'Bypasses message queue',
      'Immediate response',
      'Uses one-shot requests'
    ],
    related: ['Request', 'useQueries', 'Message'],
    example: 'const result = await subsystem.queries.ask("getUser", { userId: "123" });'
  },

  'principal': {
    term: 'Principal',
    category: 'Security',
    definition: 'An internal entity in the Mycelia system that can represent a kernel, subsystem (top-level or child), friend, or resource. Each Principal owns a UUID, kind, publicKey, and optional instance binding.',
    characteristics: [
      'Represents an entity',
      'Has UUID and kind',
      'Owns a public key',
      'Can bind to instances',
      'Supports key rotation'
    ],
    related: ['PKR', 'Identity', 'sendProtected', 'RWS'],
    example: 'kernel principal, top-level subsystem principal, friend principal'
  },

  'sendprotected': {
    term: 'sendProtected',
    category: 'Security',
    definition: 'A secure messaging mechanism used by all communication types in Mycelia. It verifies the sender\'s identity, checks permissions, and ensures messages are sent with proper authentication. All commands, queries, and events use sendProtected internally.',
    characteristics: [
      'Secure messaging mechanism',
      'Verifies sender identity',
      'Checks permissions',
      'Used by all communication types',
      'Kernel-enforced authentication'
    ],
    related: ['Identity', 'Principal', 'PKR', 'Command', 'Query'],
    example: 'await identity.sendProtected("user://get", { userId: "123" });'
  },

  // Tier 2: Important Concepts
  'route': {
    term: 'Route',
    category: 'Communication',
    definition: 'A path-based message routing pattern in Mycelia. Routes define how messages are matched and which handlers process them. Routes support pattern matching and parameter extraction.',
    characteristics: [
      'Path-based routing',
      'Pattern matching support',
      'Parameter extraction',
      'Handler registration',
      'Caching for performance'
    ],
    related: ['Message', 'useRouter', 'MessageSystem'],
    example: '"user://get/{id}", "data://process"'
  },

  'event': {
    term: 'Event',
    category: 'Communication',
    definition: 'A one-to-many event broadcasting mechanism in Mycelia. Events allow subsystems to notify multiple listeners about state changes or occurrences. Events use the standard EventEmitter API (on, off, emit).',
    characteristics: [
      'One-to-many broadcasting',
      'Standard EventEmitter API',
      'Pattern matching support',
      'Handler groups support',
      'Registration policies'
    ],
    related: ['useListeners', 'Message', 'ListenerManager'],
    example: 'subsystem.listeners.emit("user/created", message);'
  },

  'channel': {
    term: 'Channel',
    category: 'Communication',
    definition: 'A multi-party communication mechanism in Mycelia. Channels enable multiple subsystems to participate in conversations, making them ideal for command replies and coordinated operations. Channels are managed by the ChannelManagerSubsystem.',
    characteristics: [
      'Multi-party communication',
      'Managed by kernel',
      'Used for command replies',
      'Supports participants',
      'Has a route for routing'
    ],
    related: ['Command', 'useChannels', 'ChannelManagerSubsystem'],
    example: 'const channel = channels.create("replies", { participants: [...] });'
  },

  'pkr': {
    term: 'PKR',
    category: 'Security',
    definition: 'Public Key Record - the identity mechanism in Mycelia\'s security system. A PKR contains a public key, metadata, and is used to verify identity and manage permissions. PKRs are created lazily and cached by Principals.',
    characteristics: [
      'Public key record',
      'Identity mechanism',
      'Lazy creation',
      'Cached by Principals',
      'Supports key rotation'
    ],
    related: ['Principal', 'Identity', 'sendProtected'],
    example: 'principal.pkr - automatically created and cached'
  },

  'identity': {
    term: 'Identity',
    category: 'Security',
    definition: 'A wrapper that provides permission-checked access to subsystems. Identities are created from PKRs and provide the sendProtected method for secure messaging. They are automatically attached to subsystems upon registration.',
    characteristics: [
      'Permission-checked wrapper',
      'Created from PKR',
      'Provides sendProtected',
      'Auto-attached to subsystems',
      'Reused unless rotated'
    ],
    related: ['Principal', 'PKR', 'sendProtected'],
    example: 'const identity = createIdentity(principalPkr); await identity.sendProtected(...);'
  },

  'builder': {
    term: 'Builder',
    category: 'Build System',
    definition: 'The two-phase build system that transforms subsystems from configuration into fully functional components. The builder orchestrates hooks, creates facets, resolves dependencies, and ensures subsystems are correctly initialized.',
    characteristics: [
      'Two-phase build system',
      'Orchestrates hooks',
      'Resolves dependencies',
      'Validates configuration',
      'Manages transactions'
    ],
    related: ['Hook', 'Facet', 'BaseSubsystem', 'Dependency Resolution'],
    example: 'await subsystem.build(); - automatically called during registration'
  },

  'userouter': {
    term: 'useRouter',
    category: 'Hooks',
    definition: 'A hook that provides route registration and matching capabilities to subsystems. It enables path-based message routing with pattern matching, parameter extraction, and route caching for performance.',
    characteristics: [
      'Route registration',
      'Pattern matching',
      'Parameter extraction',
      'Route caching',
      'Integration with message processing'
    ],
    related: ['Route', 'Hook', 'Facet'],
    example: 'router.registerRoute("user://get/{id}", handler);'
  },

  'usecommands': {
    term: 'useCommands',
    category: 'Hooks',
    definition: 'A high-level hook that provides command execution capabilities. It simplifies sending and handling commands with channel-based replies, timeout handling, and automatic command registration.',
    characteristics: [
      'Command execution',
      'Channel-based replies',
      'Timeout handling',
      'Automatic registration',
      'Simplified API'
    ],
    related: ['Command', 'Channel', 'Hook'],
    example: 'await subsystem.commands.send("saveData", { data });'
  },

  'usequeries': {
    term: 'useQueries',
    category: 'Hooks',
    definition: 'A high-level hook that provides query handling capabilities. It enables synchronous, read-only data retrieval with immediate responses, bypassing the message queue for fast operations.',
    characteristics: [
      'Query handling',
      'Synchronous execution',
      'Read-only operations',
      'Immediate responses',
      'Bypasses queue'
    ],
    related: ['Query', 'Request', 'Hook'],
    example: 'const result = await subsystem.queries.ask("getUser", { userId });'
  },

  'uselisteners': {
    term: 'useListeners',
    category: 'Hooks',
    definition: 'A hook that provides event listener functionality with a standard EventEmitter API (on, off, emit). It supports pattern matching, handler groups, registration policies, and centralized management via MessageSystem.',
    characteristics: [
      'Standard EventEmitter API',
      'Pattern matching',
      'Handler groups',
      'Registration policies',
      'Centralized management'
    ],
    related: ['Event', 'ListenerManager', 'Hook'],
    example: 'subsystem.listeners.on("user/created", handler); subsystem.listeners.emit("user/created", msg);'
  },

  // Additional: Contract
  'contract': {
    term: 'Contract',
    category: 'Build System',
    definition: 'A facet contract defines the interface and behavior that a facet must implement. Contracts provide type safety, runtime validation, and enable adapter patterns. They ensure facets meet expected requirements.',
    characteristics: [
      'Defines facet interface',
      'Type safety',
      'Runtime validation',
      'Adapter patterns',
      'Enforced during build'
    ],
    related: ['Facet', 'Hook', 'Builder'],
    example: 'const contract = { name: "storage", methods: ["get", "set"] };'
  }
};

/**
 * Get all glossary terms
 */
export function getAllTerms() {
  return Object.keys(GLOSSARY);
}

/**
 * Get a glossary entry by term (case-insensitive)
 */
export function getTerm(term) {
  const key = term.toLowerCase();
  return GLOSSARY[key] || null;
}

/**
 * Search glossary terms
 */
export function searchTerms(query) {
  const lowerQuery = query.toLowerCase();
  const results = [];
  
  for (const [key, entry] of Object.entries(GLOSSARY)) {
    if (
      key.includes(lowerQuery) ||
      entry.term.toLowerCase().includes(lowerQuery) ||
      entry.definition.toLowerCase().includes(lowerQuery) ||
      entry.category.toLowerCase().includes(lowerQuery)
    ) {
      results.push(entry);
    }
  }
  
  return results;
}

/**
 * Get terms by category
 */
export function getTermsByCategory(category) {
  const results = [];
  for (const entry of Object.values(GLOSSARY)) {
    if (entry.category.toLowerCase() === category.toLowerCase()) {
      results.push(entry);
    }
  }
  return results;
}


