# 📚 Mycelia Kernel Documentation

Welcome to the Mycelia Kernel documentation! This directory contains detailed technical documentation, architectural overviews, and implementation guides.

---

## 📖 Documentation Structure

### **[architecture/](./architecture/)** - System Architecture
Deep dives into the core architectural patterns and flows:

- **[PLUGIN-SYSTEM-ANALYSIS.md](./architecture/PLUGIN-SYSTEM-ANALYSIS.md)** - Hook-based plugin system
- **[KERNEL-CHILD-IDENTITY-FLOW.md](./architecture/KERNEL-CHILD-IDENTITY-FLOW.md)** - Identity propagation
- **[HOT-RELOAD-AND-VERSIONING-ANALYSIS.md](./architecture/HOT-RELOAD-AND-VERSIONING-ANALYSIS.md)** - Hot reload & versioning
- **[REAL-WORLD-USAGE-ANALYSIS.md](./architecture/REAL-WORLD-USAGE-ANALYSIS.md)** - Real-world patterns

### **[design/](./design/)** - Design Documentation
Detailed design specifications for major subsystems:

- **[DESIGN-PATTERNS.md](./design/DESIGN-PATTERNS.md)** - 20+ design patterns used
- **[AUTH-SYSTEM-DESIGN.md](./design/AUTH-SYSTEM-DESIGN.md)** - Authentication architecture
- **[DB-SUBSYSTEM-DESIGN.md](./design/DB-SUBSYSTEM-DESIGN.md)** - Database subsystem
- **[STORAGE-CONTRACT-DESIGN.md](./design/STORAGE-CONTRACT-DESIGN.md)** - Storage contracts
- **[WEBSOCKET-SUBSYSTEM-DESIGN.md](./design/WEBSOCKET-SUBSYSTEM-DESIGN.md)** - WebSocket design
- **[WEBSOCKET-CONTRACT-ANALYSIS.md](./design/WEBSOCKET-CONTRACT-ANALYSIS.md)** - WebSocket contracts
- **[SECURITY-INTEGRATION-SOLUTION.md](./design/SECURITY-INTEGRATION-SOLUTION.md)** - Security implementation

### **[implementation/](./implementation/)** - Implementation Guides
Step-by-step guides for implementing features:

- **[INDEXEDDB-STORAGE-ADAPTER-PLAN.md](./implementation/INDEXEDDB-STORAGE-ADAPTER-PLAN.md)** - IndexedDB adapter
- **[SQLITE-STORAGE-ADAPTER-PLAN.md](./implementation/SQLITE-STORAGE-ADAPTER-PLAN.md)** - SQLite adapter
- **[TESTING-UTILITIES-PLAN.md](./implementation/TESTING-UTILITIES-PLAN.md)** - Testing utilities
- **[OBSERVABILITY-TRACEABILITY-PLAN.md](./implementation/OBSERVABILITY-TRACEABILITY-PLAN.md)** - Observability
- **[OBSERVABILITY-PHASE1-PHASE2-IMPLEMENTATION.md](./implementation/OBSERVABILITY-PHASE1-PHASE2-IMPLEMENTATION.md)** - Implementation phases
- **[TYPESCRIPT_SUPPORT_ANALYSIS.md](./implementation/TYPESCRIPT_SUPPORT_ANALYSIS.md)** - TypeScript support

### **[performance/](./performance/)** - Performance & Benchmarks
Performance optimization strategies and results:

- **[PERFORMANCE-OPTIMIZATION-PLAN.md](./performance/PERFORMANCE-OPTIMIZATION-PLAN.md)** - Optimization strategies
- **[PERFORMANCE-OPTIMIZATION-RESULTS.md](./performance/PERFORMANCE-OPTIMIZATION-RESULTS.md)** - Benchmark results

---

## 🎯 Quick Links

### Getting Started
1. Read the [main README](../README.md)
2. Review [Design Patterns](./design/DESIGN-PATTERNS.md)
3. Understand the [Plugin System](./architecture/PLUGIN-SYSTEM-ANALYSIS.md)

### Core Concepts
- **Message-Driven Architecture** - See main README
- **Hook System** - [Plugin System Analysis](./architecture/PLUGIN-SYSTEM-ANALYSIS.md)
- **Security Model** - [Security Integration](./design/SECURITY-INTEGRATION-SOLUTION.md)

### Implementation
- **Storage Adapters** - [SQLite](./implementation/SQLITE-STORAGE-ADAPTER-PLAN.md) | [IndexedDB](./implementation/INDEXEDDB-STORAGE-ADAPTER-PLAN.md)
- **WebSocket** - [Design](./design/WEBSOCKET-SUBSYSTEM-DESIGN.md)
- **Authentication** - [Auth System](./design/AUTH-SYSTEM-DESIGN.md)

### Advanced Topics
- **Hot Reload** - [Hot Reload & Versioning](./architecture/HOT-RELOAD-AND-VERSIONING-ANALYSIS.md)
- **Performance** - [Optimization Plan](./performance/PERFORMANCE-OPTIMIZATION-PLAN.md)
- **Real-World Usage** - [Usage Patterns](./architecture/REAL-WORLD-USAGE-ANALYSIS.md)

---

## 📊 Documentation Stats

- **Architecture Docs:** 4 files
- **Design Specs:** 7 files
- **Implementation Guides:** 6 files
- **Performance Docs:** 2 files
- **Total:** 19 detailed documents

---

## 🤝 Contributing to Documentation

Found an error or want to improve documentation?

1. Fork the repository
2. Make your changes
3. Submit a pull request

See [CONTRIBUTING.md](../CONTRIBUTING.md) for guidelines.

---

## 📝 Documentation Standards

Our documentation follows these principles:

- **Clear examples** - Every concept has code examples
- **Architecture diagrams** - Visual representations where helpful
- **Real-world context** - Practical use cases
- **Implementation details** - Step-by-step guides
- **Performance data** - Benchmarks and metrics

---

**Happy learning!** 🚀

