# Mycelia Kernel CLI

Command-line interface for Mycelia Kernel v2 project management and code generation.

## Installation

The CLI is included with the Mycelia Kernel package. To use it:

```bash
# Install dependencies
npm install

# Link the CLI globally (optional)
npm link
```

## Commands

### `mycelia-kernel init`

Initialize a new Mycelia Kernel project in the current directory.

**Options:**
- `--force`: Overwrite existing files
- `--name <name>`: Project name (default: current directory name)

**Example:**
```bash
mycelia-kernel init
mycelia-kernel init --name my-project
mycelia-kernel init --force
```

**Creates:**
- `mycelia-kernel-v2/` - Copy of Mycelia Kernel v2 source
- `src/hooks/` - Directory for custom hooks
- `src/facet-contracts/` - Directory for custom facet contracts
- `src/subsystems/` - Directory for custom subsystems
- `src/routes-ui/` - Directory for route UI helpers
- `bootstrap.mycelia.js` - Bootstrap file
- `package.json` - Project package.json
- `.gitignore` - Git ignore file

### `mycelia-kernel generate subsystem <Name>`

Generate a new subsystem with route definitions, command definitions, and query definitions.

**Options:**
- `--use-defaults-async`: Use canonical (asynchronous) default hooks. Includes: hierarchy, router, messages, requests, channels, commands, responses, messageProcessor, queue, scheduler, listeners, statistics, queries. Suitable for most general-purpose subsystems.
- `--use-defaults-sync`: Use synchronous default hooks. Includes: listeners, statistics, queries, router, messages, requests, channels, commands, responses, queue, messageProcessor, synchronous, hierarchy. Suitable for kernel-like subsystems that need immediate processing.

**Note:** These options are mutually exclusive. If neither is provided, no default hooks are included (manual hook registration required).

**Example:**
```bash
# Generate subsystem with async defaults (most common)
mycelia-kernel generate subsystem UserService --use-defaults-async

# Generate subsystem with sync defaults (kernel-like)
mycelia-kernel generate subsystem KernelCache --use-defaults-sync

# Generate subsystem without defaults (manual hook registration)
mycelia-kernel generate subsystem CustomSubsystem
```

**Creates:**
- `src/subsystems/<name>/<name>.subsystem.mycelia.js` - Subsystem class
- `src/subsystems/<name>/<name>.routes.def.mycelia.js` - Route definitions
- `src/subsystems/<name>/<name>.commands.def.mycelia.js` - Command definitions
- `src/subsystems/<name>/<name>.queries.def.mycelia.js` - Query definitions

### `mycelia-kernel generate hook <Name>`

Generate a new hook with validation utilities.

**Example:**
```bash
mycelia-kernel generate hook CustomLogger
mycelia-kernel generate hook DataValidator
```

**Creates:**
- `src/hooks/<name>/use-<name>.mycelia.js` - Hook implementation
- `src/hooks/<name>/<name>.validation.mycelia.js` - Validation utilities

### `mycelia-kernel generate facet-contract <Name>`

Generate a new facet contract with validation utilities.

**Options:**
- `--with-example`: Include example adapter

**Example:**
```bash
mycelia-kernel generate facet-contract StorageContract
mycelia-kernel generate facet-contract CacheContract --with-example
```

**Creates:**
- `src/facet-contracts/<name>/<name>.contract.mycelia.js` - Contract definition
- `src/facet-contracts/<name>/<name>.validation.mycelia.js` - Validation utilities
- `src/facet-contracts/<name>/<name>.adapter.example.mycelia.js` - Example adapter (if --with-example)

### `mycelia-kernel generate routes-ui`

Generate routes-ui helper functions from route definitions.

**Example:**
```bash
mycelia-kernel generate routes-ui
```

**Creates:**
- `src/routes-ui/route-builder.mycelia.js` - RouteBuilder class
- `src/routes-ui/<subsystem>-routes.mycelia.js` - Namespaced route functions (one per subsystem)
- `src/routes-ui/index.mycelia.js` - Index file with all exports

**Note:** This command scans all `*.routes.def.mycelia.js` files in `src/subsystems/` and generates corresponding route functions.

### `mycelia-kernel generate commands-ui`

Generate commands-ui helper functions from command definitions.

**Example:**
```bash
mycelia-kernel generate commands-ui
```

**Creates:**
- `src/commands-ui/command-builder.mycelia.js` - CommandBuilder class
- `src/commands-ui/<subsystem>-commands.mycelia.js` - Namespaced command functions (one per subsystem)
- `src/commands-ui/index.mycelia.js` - Index file with all exports

**Note:** This command scans all `*.commands.def.mycelia.js` files in `src/subsystems/` and generates corresponding command functions. Commands are automatically registered and channels are auto-created when the subsystem initializes.

### `mycelia-kernel generate queries-ui`

Generate queries-ui helper functions from query definitions.

**Example:**
```bash
mycelia-kernel generate queries-ui
```

**Creates:**
- `src/queries-ui/query-builder.mycelia.js` - QueryBuilder class
- `src/queries-ui/<subsystem>-queries.mycelia.js` - Namespaced query functions (one per subsystem)
- `src/queries-ui/index.mycelia.js` - Index file with all exports

**Note:** This command scans all `*.queries.def.mycelia.js` files in `src/subsystems/` and generates corresponding query functions. Queries use the `subsystem.queries.ask()` method for synchronous, read-only operations.

### `mycelia-kernel routes <subsystem>`

List all routes for a subsystem.

**Example:**
```bash
mycelia-kernel routes Example
mycelia-kernel routes UserManager
```

**Output:**
- Displays all routes defined in the subsystem's route definition file
- Shows route name, path, description, handler, and metadata

### `mycelia-kernel commands <subsystem>`

List all commands for a subsystem.

**Example:**
```bash
mycelia-kernel commands Example
mycelia-kernel commands UserManager
```

**Output:**
- Displays all commands defined in the subsystem's command definition file
- Shows command name, path, description, handler, channel, timeout, and metadata

### `mycelia-kernel queries <subsystem>`

List all queries for a subsystem.

**Example:**
```bash
mycelia-kernel queries Example
mycelia-kernel queries DataService
```

**Output:**
- Displays all queries defined in the subsystem's query definition file
- Shows query name, path, description, handler, and metadata

### `mycelia-kernel doctor`

Run health checks on the Mycelia Kernel project. This command performs comprehensive validation of your project structure and configuration.

**Example:**
```bash
mycelia-kernel doctor
```

**Checks Performed:**

1. **Missing Handlers** (Error)
   - Verifies that all handlers referenced in route/command/query definitions exist in the subsystem class
   - Reports: `Missing handler: ExampleSubsystem.handleGetUser (route: getUser)`

2. **Malformed Metadata** (Warning)
   - Checks for missing or invalid metadata fields in definitions
   - Reports: `Route 'createExample' missing 'method' in metadata`

3. **Missing Hook Dependencies** (Error)
   - Validates that all required hook dependencies are satisfied
   - Reports: `Hook 'useScheduler' requires 'queue' but no corresponding hook found`

4. **Duplicate Route Paths** (Error)
   - Detects duplicate route paths across subsystems
   - Reports: `Duplicate route path: 'example://operation/create'`

5. **Orphaned Channels** (Warning)
   - Identifies channels created in command definitions that may be unused
   - Reports: `Channel 'data-replies' created but may be unused`

6. **Unused Command Definitions** (Warning)
   - Finds command definitions that are not referenced in commands-ui
   - Reports: `Command 'processData' defined but may be unused`

**Output:**
```
🔍 Running Mycelia Kernel Doctor...

❌ Errors (2):
  • Missing handler: ExampleSubsystem.handleGetUser (route: getUser)
  • Hook 'useScheduler' requires 'queue' but no corresponding hook found

⚠️  Warnings (3):
  • Route 'createExample' missing 'method' in metadata
  • Channel 'data-replies' created but may be unused
  • Command 'processData' defined but may be unused

Summary: 2 error(s), 3 warning(s)
```

**Exit Codes:**
- `0` - All checks passed or only warnings found
- `1` - Errors found (missing handlers, missing dependencies, duplicate routes)

### `mycelia-kernel glossary [term]`

Display definitions for Mycelia Kernel terms. This command provides access to the comprehensive glossary of key concepts and terminology used throughout the Mycelia Kernel system.

**Usage:**
```bash
# View a specific term
mycelia-kernel glossary subsystem
mycelia-kernel glossary hook
mycelia-kernel glossary command

# List all available terms
mycelia-kernel glossary list

# Search for terms
mycelia-kernel glossary search router
mycelia-kernel glossary search security
```

**Example:**
```bash
$ mycelia-kernel glossary subsystem

Subsystem
Category: Core Architecture

A subsystem is a core building block in Mycelia that extends BaseSubsystem...

Characteristics:
- Extends BaseSubsystem
- Can process messages
- Manages its own state
- Composable via hooks
- Can have parent-child relationships

Related: BaseSubsystem, Facet, Hook, MessageSystem
Example: UserServiceSubsystem, DataProcessorSubsystem
```

**Note:** See the [Glossary](#glossary) section below for a complete reference of all terms.

## Usage Examples

### Complete Workflow

```bash
# 1. Initialize project
mycelia-kernel init --name my-app

# 2. Generate subsystems
mycelia-kernel generate subsystem Example
mycelia-kernel generate subsystem UserManager

# 3. Generate hooks
mycelia-kernel generate hook CustomLogger

# 4. Generate facet contracts
mycelia-kernel generate facet-contract StorageContract

# 5. Generate routes-ui (after defining routes in route definition files)
mycelia-kernel generate routes-ui

# 6. Generate commands-ui (after defining commands in command definition files)
mycelia-kernel generate commands-ui

# 7. Generate queries-ui (after defining queries in query definition files)
mycelia-kernel generate queries-ui
```

## Generated File Structure

### Subsystem

```
src/subsystems/example/
├── example.subsystem.mycelia.js      # Subsystem class
├── example.routes.def.mycelia.js     # Route definitions
├── example.commands.def.mycelia.js  # Command definitions
└── example.queries.def.mycelia.js    # Query definitions
```

### Hook

```
src/hooks/custom-logger/
├── use-custom-logger.mycelia.js      # Hook implementation
└── custom-logger.validation.mycelia.js  # Validation utilities
```

### Facet Contract

```
src/facet-contracts/storage-contract/
├── storage-contract.contract.mycelia.js      # Contract definition
├── storage-contract.validation.mycelia.js    # Validation utilities
└── storage-contract.adapter.example.mycelia.js  # Example adapter (optional)
```

### Routes-UI

```
src/routes-ui/
├── route-builder.mycelia.js          # RouteBuilder class
├── example-routes.mycelia.js         # Example subsystem routes
├── user-manager-routes.mycelia.js    # UserManager subsystem routes
└── index.mycelia.js                  # Re-exports
```

### Commands-UI

```
src/commands-ui/
├── command-builder.mycelia.js        # CommandBuilder class
├── example-commands.mycelia.js       # Example subsystem commands
├── user-manager-commands.mycelia.js  # UserManager subsystem commands
└── index.mycelia.js                  # Re-exports
```

### Queries-UI

```
src/queries-ui/
├── query-builder.mycelia.js          # QueryBuilder class
├── example-queries.mycelia.js        # Example subsystem queries
├── user-manager-queries.mycelia.js  # UserManager subsystem queries
└── index.mycelia.js                  # Re-exports
```

## Route Definitions Format

Route definition files should follow this format:

```javascript
export const EXAMPLE_ROUTES = {
  'createExample': {
    path: 'example://operation/create',
    description: 'Create a new example resource',
    handler: 'handleCreate',
    metadata: {
      method: 'POST',
      required: 'write'
    }
  },
  'getExample': {
    path: 'example://operation/read',
    description: 'Retrieve a single example resource by ID',
    handler: 'handleGet',
    metadata: {
      method: 'GET',
      required: 'read'
    }
  }
};
```

## Command Definitions Format

Command definition files should follow this format:

```javascript
export const EXAMPLE_COMMANDS = {
  'processData': {
    path: 'processor://data/process',
    description: 'Process data asynchronously',
    handler: 'handleProcessData',
    channel: 'data-replies',              // Channel name (local, will be: subsystem://channel/data-replies)
    createChannel: true,                   // Auto-create channel
    channelOptions: {
      participants: [],
      metadata: { description: 'Data processing replies' }
    },
    timeout: 30000,
    metadata: {
      method: 'POST',
      required: 'write'
    }
  },
  'exportReport': {
    path: 'processor://report/export',
    description: 'Export report asynchronously',
    handler: 'handleExportReport',
    replyChannel: 'ui://channel/report-replies',  // Explicit full channel path
    createChannel: false,                          // Use existing channel
    timeout: 60000,
    metadata: {
      method: 'POST',
      required: 'read'
    }
  }
};
```

## Query Definitions Format

Query definition files should follow this format:

```javascript
export const EXAMPLE_QUERIES = {
  'getUser': {
    name: 'getUser',                          // Query name (optional, defaults to key)
    path: 'example://query/getUser',          // Full path (optional, auto-generated if not provided)
    description: 'Get user by ID',
    handler: 'handleGetUser',                 // Method name on subsystem
    metadata: {
      method: 'GET',
      required: 'read'
    }
  },
  'getUserById': {
    name: 'getUserById',
    path: 'example://query/user/{id}',        // Parameterized path
    description: 'Get user by ID with path params',
    handler: 'handleGetUserById',
    metadata: {
      method: 'GET',
      required: 'read'
    }
  },
  'getStatus': {
    // Minimal definition - name defaults to key, path auto-generated
    description: 'Get subsystem status',
    handler: 'handleGetStatus',
    metadata: {
      method: 'GET',
      required: 'read'
    }
  }
};
```

**Notes:**
- `name`: Optional. If provided, uses `queries.register(name, handler)`. If not, defaults to the object key.
- `path`: Optional. If provided, uses `queries.registerRoute(path, handler)`. If not provided, path is auto-generated as `subsystem://query/name`.
- `handler`: Required. Method name on the subsystem class that handles the query.
- `metadata`: Optional. Additional metadata for the query (e.g., method, required permissions).

## Routes-UI Usage

After generating routes-ui, you can use the generated functions:

```javascript
import { example, userManager } from './src/routes-ui/index.mycelia.js';

// Simple route
const result = await example.createExample(subsystem)
  .body({ name: 'My Example' })
  .send();

// Route with parameters
const user = await userManager.getUserById(subsystem)
  .params({ id: 'user-123' })
  .send();

// Route with options
const response = await example.createExample(subsystem)
  .body({ data: 'test' })
  .options({
    responseRequired: {
      replyTo: 'ui://channel/replies',
      timeout: 5000
    }
  })
  .send();
```

## Commands-UI Usage

After generating commands-ui, you can use the generated functions:

```javascript
import { example, processor } from './src/commands-ui/index.mycelia.js';

// Send command - channel auto-created, command auto-registered
const result = await example.processData(subsystem, {
  data: [1, 2, 3, 4, 5],
  operation: 'sum'
});

// Command with timeout override
const result = await processor.exportReport(subsystem, {
  reportId: 'report-123',
  format: 'pdf'
})
.options({
  timeout: 90000  // Override default timeout
})
.send();
```

**Note:** Commands are automatically registered and channels are auto-created when the subsystem's `onInit()` is called. The commands-ui helpers use the registered command names.

## Queries-UI Usage

After generating queries-ui, you can use the generated functions:

```javascript
import { example, dataService } from './src/queries-ui/index.mycelia.js';

// Simple query - uses logical name (resolved to query/getUser)
const user = await example.getUser(subsystem, { userId: 'user-123' })
  .ask();

// Query with explicit path
const userById = await example.getUserById(subsystem, { id: 'user-123' })
  .ask();

// Query with options
const status = await example.getStatus(subsystem)
  .options({
    timeout: 5000  // Optional timeout
  })
  .ask();
```

**Note:** Queries are synchronous, read-only operations that bypass the message queue. They use `subsystem.queries.ask()` internally. The queries-ui helpers use either the query name (resolved to `query/<name>`) or the explicit path if provided in the definition.

## Naming Conventions

- **Subsystems**: PascalCase class names (e.g., `ExampleSubsystem`)
- **Hooks**: camelCase function names (e.g., `useCustomLogger`)
- **Facet Contracts**: PascalCase contract names (e.g., `StorageContract`)
- **Directories**: kebab-case (e.g., `custom-logger`, `storage-contract`)
- **Route Namespaces**: camelCase (e.g., `example`, `userManager`)

## Troubleshooting

### "Project already initialized"

Use `--force` to overwrite existing files:
```bash
mycelia-kernel init --force
```

### "No route definition files found"

Make sure you've generated subsystems first:
```bash
mycelia-kernel generate subsystem Example
```

Then edit the route definition file before generating routes-ui.

### "Handler not found" warnings

Make sure your subsystem class implements all handlers referenced in route definitions.

## Glossary

This glossary defines key terms and concepts used throughout the Mycelia Kernel system. You can also view glossary terms using the CLI: `mycelia-kernel glossary <term>` or `mycelia-kernel glossary list`.

### Core Architecture

#### **Subsystem**
A subsystem is a core building block in Mycelia that extends BaseSubsystem. It represents a modular, composable unit of functionality that can process messages, manage state, and integrate with other subsystems.

**Characteristics:**
- Extends BaseSubsystem
- Can process messages
- Manages its own state
- Composable via hooks
- Can have parent-child relationships

**Related:** BaseSubsystem, Facet, Hook, MessageSystem  
**Example:** `UserServiceSubsystem`, `DataProcessorSubsystem`

#### **BaseSubsystem**
The base class for all subsystems in Mycelia. It provides the foundation for hook-based architecture, facet management, lifecycle management, and message processing capabilities.

**Characteristics:**
- Base class for all subsystems
- Manages hooks and facets
- Provides build/dispose lifecycle
- Supports hierarchical structure
- Handles message processing

**Related:** Subsystem, Facet, Hook, Builder  
**Example:** `class MySubsystem extends BaseSubsystem { ... }`

#### **Facet**
A facet is an object that provides specific capabilities to a subsystem. Facets are created by hooks during the build process and are managed by the FacetManager. They can be attached to subsystems for easy access.

**Characteristics:**
- Created by hooks
- Managed by FacetManager
- Can be attached to subsystem
- Provides specific functionality
- Has a unique kind identifier

**Related:** Hook, BaseSubsystem, FacetManager  
**Example:** `router facet`, `queue facet`, `scheduler facet`

#### **Hook**
A hook is a function that creates and returns a Facet. Hooks are the primary mechanism for extending subsystem functionality. They encapsulate metadata (dependencies, behavior) and factory logic.

**Characteristics:**
- Function that creates a Facet
- Has metadata (kind, required, attach)
- Executed during build
- Can declare dependencies
- Enables composable architecture

**Related:** Facet, BaseSubsystem, Builder  
**Example:** `useRouter`, `useQueue`, `useScheduler`

#### **MessageSystem**
The central coordinator for message-driven architecture in Mycelia. It manages subsystems, routes messages, coordinates scheduling, and provides the kernel subsystem for system-level operations.

**Characteristics:**
- Central coordinator
- Manages subsystem registry
- Routes messages between subsystems
- Coordinates global scheduling
- Provides kernel subsystem

**Related:** Subsystem, Message, KernelSubsystem, Route  
**Example:** `const ms = new MessageSystem("main"); await ms.bootstrap();`

### Communication

#### **Message**
A structured data object used for inter-subsystem communication in Mycelia. Messages contain payload data, metadata, and a path that determines routing. They support commands, queries, and events.

**Characteristics:**
- Structured data object
- Contains path for routing
- Has payload and metadata
- Supports multiple communication types
- Enables loose coupling

**Related:** Route, Command, Query, Event, MessageSystem  
**Example:** `const msg = messages.create("user://get", { userId: "123" });`

#### **Command**
An asynchronous operation that performs an action and returns a result via a channel. Commands are fire-and-forget with channel-based replies, making them ideal for operations that may take time or need to notify multiple parties.

**Characteristics:**
- Asynchronous operation
- Channel-based replies
- Fire-and-forget pattern
- Can notify multiple parties
- Supports timeout handling

**Related:** Channel, Request, useCommands, Response  
**Example:** `await subsystem.commands.send("saveData", { data: {...} });`

#### **Query**
A synchronous, read-only operation that retrieves data immediately. Queries bypass the message queue and use one-shot requests for immediate response, making them ideal for data retrieval and status checks.

**Characteristics:**
- Synchronous execution
- Read-only operation
- Bypasses message queue
- Immediate response
- Uses one-shot requests

**Related:** Request, useQueries, Message  
**Example:** `const result = await subsystem.queries.ask("getUser", { userId: "123" });`

#### **Route**
A path-based message routing pattern in Mycelia. Routes define how messages are matched and which handlers process them. Routes support pattern matching and parameter extraction.

**Characteristics:**
- Path-based routing
- Pattern matching support
- Parameter extraction
- Handler registration
- Caching for performance

**Related:** Message, useRouter, MessageSystem  
**Example:** `"user://get/{id}"`, `"data://process"`

#### **Event**
A one-to-many event broadcasting mechanism in Mycelia. Events allow subsystems to notify multiple listeners about state changes or occurrences. Events use the standard EventEmitter API (on, off, emit).

**Characteristics:**
- One-to-many broadcasting
- Standard EventEmitter API
- Pattern matching support
- Handler groups support
- Registration policies

**Related:** useListeners, Message, ListenerManager  
**Example:** `subsystem.listeners.emit("user/created", message);`

#### **Channel**
A multi-party communication mechanism in Mycelia. Channels enable multiple subsystems to participate in conversations, making them ideal for command replies and coordinated operations. Channels are managed by the ChannelManagerSubsystem.

**Characteristics:**
- Multi-party communication
- Managed by kernel
- Used for command replies
- Supports participants
- Has a route for routing

**Related:** Command, useChannels, ChannelManagerSubsystem  
**Example:** `const channel = channels.create("replies", { participants: [...] });`

### Security

#### **Principal**
An internal entity in the Mycelia system that can represent a kernel, subsystem (top-level or child), friend, or resource. Each Principal owns a UUID, kind, publicKey, and optional instance binding.

**Characteristics:**
- Represents an entity
- Has UUID and kind
- Owns a public key
- Can bind to instances
- Supports key rotation

**Related:** PKR, Identity, sendProtected, RWS  
**Example:** `kernel principal`, `top-level subsystem principal`, `friend principal`

#### **sendProtected**
A secure messaging mechanism used by all communication types in Mycelia. It verifies the sender's identity, checks permissions, and ensures messages are sent with proper authentication. All commands, queries, and events use sendProtected internally.

**Characteristics:**
- Secure messaging mechanism
- Verifies sender identity
- Checks permissions
- Used by all communication types
- Kernel-enforced authentication

**Related:** Identity, Principal, PKR, Command, Query  
**Example:** `await identity.sendProtected("user://get", { userId: "123" });`

#### **PKR**
Public Key Record - the identity mechanism in Mycelia's security system. A PKR contains a public key, metadata, and is used to verify identity and manage permissions. PKRs are created lazily and cached by Principals.

**Characteristics:**
- Public key record
- Identity mechanism
- Lazy creation
- Cached by Principals
- Supports key rotation

**Related:** Principal, Identity, sendProtected  
**Example:** `principal.pkr` - automatically created and cached

#### **Identity**
A wrapper that provides permission-checked access to subsystems. Identities are created from PKRs and provide the sendProtected method for secure messaging. They are automatically attached to subsystems upon registration.

**Characteristics:**
- Permission-checked wrapper
- Created from PKR
- Provides sendProtected
- Auto-attached to subsystems
- Reused unless rotated

**Related:** Principal, PKR, sendProtected  
**Example:** `const identity = createIdentity(principalPkr); await identity.sendProtected(...);`

### Build System

#### **Builder**
The two-phase build system that transforms subsystems from configuration into fully functional components. The builder orchestrates hooks, creates facets, resolves dependencies, and ensures subsystems are correctly initialized.

**Characteristics:**
- Two-phase build system
- Orchestrates hooks
- Resolves dependencies
- Validates configuration
- Manages transactions

**Related:** Hook, Facet, BaseSubsystem, Dependency Resolution  
**Example:** `await subsystem.build();` - automatically called during registration

#### **Contract**
A facet contract defines the interface and behavior that a facet must implement. Contracts provide type safety, runtime validation, and enable adapter patterns. They ensure facets meet expected requirements.

**Characteristics:**
- Defines facet interface
- Type safety
- Runtime validation
- Adapter patterns
- Enforced during build

**Related:** Facet, Hook, Builder  
**Example:** `const contract = { name: "storage", methods: ["get", "set"] };`

### Hooks

#### **useRouter**
A hook that provides route registration and matching capabilities to subsystems. It enables path-based message routing with pattern matching, parameter extraction, and route caching for performance.

**Characteristics:**
- Route registration
- Pattern matching
- Parameter extraction
- Route caching
- Integration with message processing

**Related:** Route, Hook, Facet  
**Example:** `router.registerRoute("user://get/{id}", handler);`

#### **useCommands**
A high-level hook that provides command execution capabilities. It simplifies sending and handling commands with channel-based replies, timeout handling, and automatic command registration.

**Characteristics:**
- Command execution
- Channel-based replies
- Timeout handling
- Automatic registration
- Simplified API

**Related:** Command, Channel, Hook  
**Example:** `await subsystem.commands.send("saveData", { data });`

#### **useQueries**
A high-level hook that provides query handling capabilities. It enables synchronous, read-only data retrieval with immediate responses, bypassing the message queue for fast operations.

**Characteristics:**
- Query handling
- Synchronous execution
- Read-only operations
- Immediate responses
- Bypasses queue

**Related:** Query, Request, Hook  
**Example:** `const result = await subsystem.queries.ask("getUser", { userId });`

#### **useListeners**
A hook that provides event listener functionality with a standard EventEmitter API (on, off, emit). It supports pattern matching, handler groups, registration policies, and centralized management via MessageSystem.

**Characteristics:**
- Standard EventEmitter API
- Pattern matching
- Handler groups
- Registration policies
- Centralized management

**Related:** Event, ListenerManager, Hook  
**Example:** `subsystem.listeners.on("user/created", handler); subsystem.listeners.emit("user/created", msg);`

## See Also

- [Mycelia Kernel v2 Documentation](../../src/messages/v2/docs/README.md)
- [Subsystem Communication](../../src/messages/v2/docs/communication/COMMUNICATION-TYPES-SUPPORTED.md)
- [Hooks Documentation](../../src/messages/v2/docs/hooks/HOOKS.md)

