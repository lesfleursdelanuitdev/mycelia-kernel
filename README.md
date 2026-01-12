# Mycelia Kernel

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Tests](https://img.shields.io/badge/tests-713%20passing-brightgreen)]()
[![Code Quality](https://img.shields.io/badge/code%20quality-8.5%2F10-brightgreen)]()
[![Documentation](https://img.shields.io/badge/docs-151%2B%20files-blue)]()

> A sophisticated message-driven architecture framework with composable hooks, built-in security, and multi-backend support.

---

## 🎯 What is Mycelia Kernel?

Mycelia Kernel is a **production-ready framework** for building message-driven systems with:

- 🔌 **Hook-based composition** - Extend subsystems without modification
- 📨 **Pure message-driven** - Zero direct references between components
- 🔒 **Built-in security** - PKR-based identity and fine-grained permissions
- 🔄 **Multi-backend** - SQLite, IndexedDB, Memory with identical API
- 🌐 **Web server adapters** - Fastify, Express, Hono support
- 📊 **Production features** - Observability, tracing, health checks
- 🚀 **High performance** - 50k+ queue ops/sec with circular buffer

---

## ⚡ Quick Start

**🚀 Recommended: Use the CLI for the best developer experience!**

```bash
# Install
npm install mycelia-kernel

# Initialize a new project (recommended)
npx mycelia-kernel init --name my-app

# Generate a subsystem with proper structure
npx mycelia-kernel generate subsystem UserService --use-defaults-async

# Generate test utilities and test files
npx mycelia-kernel generate test-utilities
npx mycelia-kernel generate test UserService

# Run health checks
npx mycelia-kernel doctor

# Learn terminology
npx mycelia-kernel glossary subsystem
```

**Or use manually:**

```bash
# Install
npm install mycelia-kernel

# Create your first subsystem
import { MessageSystem, BaseSubsystem } from 'mycelia-kernel';

// Bootstrap the system
const messageSystem = new MessageSystem('my-app');
await messageSystem.bootstrap();

// Create a subsystem with hooks
class MySubsystem extends BaseSubsystem {
  constructor(name, ms) {
    super(name, { ms });
    this.use(useRouter);
    this.use(useQueue);
  }
}

// Register and use
const subsystem = new MySubsystem('api', messageSystem);
await subsystem.build();
await messageSystem.registerSubsystem(subsystem);

// Register routes
subsystem.router.registerRoute('users/{id}', async (message, params) => {
  return { user: { id: params.id } };
});

// ✅ CORRECT: Send messages from a subsystem using identity.sendProtected()
// This ensures proper security, caller authentication, and access control
const message = new Message('api://users/123', {});
const result = await subsystem.identity.sendProtected(message);

// ❌ INCORRECT: Don't use messageSystem.send() from within subsystems
// const result = await messageSystem.send(message); // Wrong!
```

> **💡 Tip:** The CLI provides code generation, health checks, and a comprehensive glossary. See [CLI Documentation](./cli/README.md) for details.

---

## 🌟 Key Features

### **Message-Driven Architecture**
- Path-based routing: `subsystem://path/to/resource`
- Loose coupling between components
- Async-first design
- Built for distributed systems

**Sending Messages from Subsystems:**
```javascript
// ✅ CORRECT: Use subsystem.identity.sendProtected()
// This ensures proper security, caller authentication, and access control
const message = new Message('other-subsystem://action', { data: 'value' });
const result = await subsystem.identity.sendProtected(message);

// ❌ INCORRECT: Don't use messageSystem.send() from within subsystems
// This bypasses security and caller authentication
// const result = await messageSystem.send(message); // Wrong!
```

**Why use `identity.sendProtected()`?**
- ✅ Automatic caller authentication (uses subsystem's PKR)
- ✅ Prevents message spoofing
- ✅ Enforces access control and permissions
- ✅ Proper security guarantees
- ✅ Works with all communication types (routes, commands, queries, requests)

### **Hook-Based Composition**
```javascript
subsystem
  .use(useRouter)           // Add routing
  .use(useQueue)            // Add message queue
  .use(useAuthStrategies)   // Add authentication
  .use(useSQLiteStorage)    // Add SQLite storage
  .build();
```

### **Security System**
- PKR-based identity management
- Reader-Writer-Set (RWS) permissions
- Scope-based access control
- Protected messaging with caller authentication

### **Multi-Backend Storage**
```javascript
// Use SQLite
subsystem.use(useSQLiteStorage, {
  config: { storage: { dbPath: './data.db' } }
});

// Or IndexedDB (browser)
subsystem.use(useIndexedDBStorage, {
  config: { storage: { dbName: 'myapp' } }
});

// Or Memory (testing)
subsystem.use(useMemoryStorage);
```

### **HTTP Server Adapters**
```javascript
// Choose your server
subsystem.use(useFastifyServer);  // Fastify
// OR
subsystem.use(useExpressServer);  // Express
// OR
subsystem.use(useHonoServer);     // Hono
```

---

## 🛠️ CLI Tools

**The Mycelia Kernel CLI makes development easier:**

- **`mycelia-kernel init`** - Initialize new projects with proper structure
- **`mycelia-kernel generate subsystem`** - Generate subsystems with correct patterns
- **`mycelia-kernel generate hook`** - Generate custom hooks
- **`mycelia-kernel generate test-utilities`** - Generate testing utilities (mocks, helpers)
- **`mycelia-kernel generate test <subsystem>`** - Generate test file scaffolding
- **`mycelia-kernel doctor`** - Run health checks (missing handlers, dependencies, etc.)
- **`mycelia-kernel glossary`** - Learn Mycelia terminology (30+ terms)
- **`mycelia-kernel routes/commands/queries`** - Discover subsystem capabilities

See [**CLI Documentation**](./cli/README.md) for complete reference.

---

## 📚 Documentation

Extensive documentation with **151+ markdown files**:

- [**CLI Documentation**](./cli/README.md) - **Start here!** Code generation and project management
- [**Documentation Index**](./docs/README.md) - Organized docs
- [**Design Patterns**](./docs/design/DESIGN-PATTERNS.md) - 20+ patterns explained
- [**Architecture Overview**](./docs/architecture/PLUGIN-SYSTEM-ANALYSIS.md) - Hook-based plugin system
- [**Security Model**](./docs/design/SECURITY-INTEGRATION-SOLUTION.md) - PKR identity & RWS permissions
- [**Performance Guide**](./docs/performance/PERFORMANCE-OPTIMIZATION-PLAN.md) - Optimization strategies
- [**Real-World Usage**](./docs/architecture/REAL-WORLD-USAGE-ANALYSIS.md) - Production patterns
- [**API Reference**](./src/messages/v2/docs/) - Detailed API documentation

---

## 🧪 Testing

Comprehensive test suite with **713 tests** (99.8% pass rate):

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# Run benchmarks
npm run bench
```

---

## 🚀 Performance

**Queue Performance:**
- **50,000+ operations/sec** with circular buffer
- **16x faster** than array-based implementation for large queues
- **<1ms latency** at p95

**Benchmarks:**
```bash
npm run bench:queue
```

See [Performance Optimization Plan](./docs/performance/PERFORMANCE-OPTIMIZATION-PLAN.md) for details.

---

## 🎨 Design Patterns

Mycelia implements **20+ design patterns**:

- Hook Pattern (composable extensions)
- Strategy Pattern (pluggable algorithms)
- Factory Pattern (object creation)
- Observer Pattern (events/listeners)
- Repository Pattern (storage abstraction)
- Adapter Pattern (multi-backend support)
- [And 14 more...](./docs/design/DESIGN-PATTERNS.md)

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────┐
│              MessageSystem                      │
│        (Central Coordinator)                    │
└─────────────────────────────────────────────────┘
                     │
        ┌────────────┼────────────┐
        │            │            │
        ▼            ▼            ▼
   ┌────────┐  ┌────────┐  ┌────────┐
   │ Kernel │  │  API   │  │  DB    │
   │Subsystem  │Subsystem  │Subsystem
   └────────┘  └────────┘  └────────┘
        │            │            │
     Messages    Messages    Messages
```

---

## 🔧 Use Cases

Perfect for:
- **Canvas/Drawing Applications** - Layer management, tool coordination
- **Workflow Systems** - Task orchestration, state machines
- **Microservices** - Service coordination, message-based communication
- **Real-Time Apps** - WebSocket, event broadcasting
- **Modular Backends** - Plugin-based architecture, multi-tenant systems

**Already Used In:**
- Math Whiteboard - Collaborative tutoring application

---

## 🤝 Contributing

We welcome contributions! See [CONTRIBUTING.md](./CONTRIBUTING.md) for:
- Code of conduct
- Development setup
- Pull request process
- Coding standards

---

## 📄 License

MIT License - see [LICENSE](./LICENSE) for details.

---

## 🌐 Links

- **GitHub:** https://github.com/lesfleursdelanuitdev/mycelia-kernel
- **Documentation:** [Comprehensive docs](./src/messages/v2/docs/README.md)
- **Issues:** https://github.com/lesfleursdelanuitdev/mycelia-kernel/issues

---

## 📊 Stats

- **301** JavaScript files
- **713** tests (99.8% pass rate)
- **151+** documentation files
- **20+** design patterns
- **8.5/10** code quality rating

---

## 🙏 Acknowledgments

Built with modern tools:
- Vite for build system
- Vitest for testing
- ESLint for code quality

---

Made with ❤️ by [@lesfleursdelanuitdev](https://github.com/lesfleursdelanuitdev)

