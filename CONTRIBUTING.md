# Contributing to Mycelia Kernel

Thank you for your interest in contributing to Mycelia Kernel! This document provides guidelines and information for contributors.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Making Changes](#making-changes)
- [Coding Standards](#coding-standards)
- [Testing](#testing)
- [Pull Request Process](#pull-request-process)
- [Architectural Guidelines](#architectural-guidelines)

## Code of Conduct

By participating in this project, you agree to maintain a respectful and inclusive environment. We expect all contributors to:

- Be respectful and considerate in all interactions
- Welcome newcomers and help them learn
- Accept constructive criticism gracefully
- Focus on what is best for the community and project

## Getting Started

### Prerequisites

- Node.js 18+ (LTS recommended)
- npm 9+
- Git

### Development Setup

1. **Fork and clone the repository**

```bash
git clone https://github.com/YOUR_USERNAME/mycelia-kernel.git
cd mycelia-kernel
```

2. **Install dependencies**

```bash
npm install
```

3. **Run tests to verify setup**

```bash
npm test
```

4. **Start development server** (for UI components)

```bash
npm run dev
```

## Project Structure

```
mycelia-kernel/
├── src/
│   └── messages/
│       └── v2/
│           ├── hooks/          # Hook implementations (30+ types)
│           │   ├── router/     # Routing functionality
│           │   ├── storage/    # Persistence adapters
│           │   ├── server/     # HTTP server adapters
│           │   └── ...
│           ├── models/         # Core models (18+ types)
│           │   ├── base-subsystem/
│           │   ├── kernel-subsystem/
│           │   ├── facet-manager/
│           │   ├── security/
│           │   └── ...
│           ├── tests/          # Test files
│           ├── docs/           # Documentation
│           └── utils/          # Utility functions
├── cli/                        # Command-line interface
├── test-data/                  # Test fixtures
└── dist/                       # Build output
```

## Making Changes

### Branch Naming

Use descriptive branch names:

- `feature/add-redis-storage` - New features
- `fix/router-scope-check` - Bug fixes
- `docs/update-readme` - Documentation updates
- `refactor/simplify-facet-manager` - Code refactoring
- `test/add-websocket-tests` - Test additions

### Commit Messages

Follow conventional commit format:

```
type(scope): brief description

[optional body with more details]

[optional footer]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples:**

```
feat(hooks): add useRedisStorage hook

Implements Redis storage backend with:
- Connection pooling
- TTL support
- Cluster mode

Closes #42
```

```
fix(router): handle null callerId in scope check

Previously threw when callerId was undefined.
Now returns false (deny by default).
```

## Coding Standards

### File Naming

- Source files: `kebab-case.mycelia.js` (e.g., `use-router.mycelia.js`)
- Test files: `*.test.js` or `*.spec.js`
- Documentation: `UPPERCASE-WITH-DASHES.md`

### Code Style

We use ESLint for code quality. Run before committing:

```bash
npm run lint
```

**Key conventions:**

1. **Use `createHook` for all hooks**

```javascript
export const useMyHook = createHook({
  kind: 'myHook',
  version: '1.0.0',
  required: [],        // Dependencies
  attach: true,        // Attach to subsystem
  source: import.meta.url,
  fn: (ctx, api, subsystem) => {
    // Return a Facet
    return new Facet('myHook', { attach: true })
      .add({
        // Methods here
      });
  }
});
```

2. **Use Facet for composable functionality**

```javascript
return new Facet('myKind', { attach: true, source: import.meta.url })
  .add({
    methodOne() { /* ... */ },
    methodTwo() { /* ... */ }
  })
  .init(async (ctx, api, subsystem) => {
    // Initialization logic
  })
  .dispose(async (subsystem) => {
    // Cleanup logic
  });
```

3. **Follow security patterns for protected operations**

```javascript
// Use identity wrappers for permission-checked handlers
const handler = identity.requireWrite(async (message, params, options) => {
  // Only executes if caller has write permission
  return { success: true };
});
```

4. **Use defensive programming**

```javascript
// Validate inputs
if (!kernel || !callerPkr || !scope) {
  return false;  // Fail secure
}

// Graceful fallbacks
const role = getUserRole ? getUserRole(callerPkr) : null;
```

### Documentation

- Add JSDoc comments for all public APIs
- Update relevant docs in `src/messages/v2/docs/`
- Include code examples where helpful

```javascript
/**
 * Register a route pattern with a handler
 * 
 * @param {string} pattern - Route pattern (e.g., 'user/{id}', 'query/*')
 * @param {Function} handler - Handler function: async (message, params, options) => result
 * @param {Object} [options={}] - Route options
 * @param {number} [options.priority=0] - Route priority
 * @returns {boolean} True if registration successful
 * 
 * @example
 * router.registerRoute('user/{id}', async (message, { id }) => {
 *   return await getUser(id);
 * });
 */
registerRoute(pattern, handler, options = {}) {
  // ...
}
```

## Testing

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run specific test file
npx vitest run src/messages/v2/hooks/__tests__/use-router.test.js
```

### Writing Tests

1. **Place tests in `__tests__` directories** next to the code being tested

2. **Use descriptive test names**

```javascript
describe('useRouterWithScopes', () => {
  describe('scope checking', () => {
    test('should deny access when user lacks required scope permission', async () => {
      // ...
    });
    
    test('should allow access when user has required scope permission', async () => {
      // ...
    });
  });
});
```

3. **Test edge cases and error conditions**

```javascript
test('should handle null callerId gracefully', () => {
  const result = checkPermission(null, scope);
  expect(result).toBe(false);  // Fail secure
});
```

4. **Use the provided test utilities**

```javascript
import { 
  createTestSubsystem, 
  createTestKernel,
  expectPermissionDenied 
} from '../../utils/test-utils.mycelia.js';
```

### Test Coverage Goals

- All new hooks should have comprehensive tests
- All new models should have unit tests
- Integration tests for cross-component interactions
- Security-sensitive code requires extra test coverage

## Pull Request Process

1. **Create a feature branch** from `main`

2. **Make your changes** following the guidelines above

3. **Ensure all tests pass**

```bash
npm test
npm run lint
```

4. **Update documentation** if needed

5. **Submit a pull request** with:
   - Clear title describing the change
   - Description of what and why
   - Link to any related issues
   - Screenshots/examples if applicable

6. **Address review feedback** promptly

### PR Checklist

- [ ] Tests pass locally
- [ ] Lint passes
- [ ] Documentation updated (if applicable)
- [ ] Commit messages follow conventions
- [ ] No unrelated changes included
- [ ] Security implications considered

## Architectural Guidelines

### Core Principles

1. **Message-Driven Architecture**
   - Subsystems communicate via messages, never direct references
   - Use path-based routing (`subsystem://path/to/resource`)

2. **Composability via Hooks**
   - Add functionality through hooks, not inheritance
   - Keep BaseSubsystem minimal
   - Use facet dependencies for hook ordering

3. **Security by Default**
   - Deny by default, explicitly grant access
   - Use `sendProtected` for authenticated messaging
   - Validate permissions at boundaries

4. **Loose Coupling**
   - Subsystems should be independently deployable
   - Use contracts for interface compatibility
   - Avoid hardcoded dependencies

### When Adding a New Hook

1. Define the hook using `createHook`
2. Return a `Facet` with well-defined methods
3. Add initialization logic in `.init()`
4. Add cleanup logic in `.dispose()`
5. Write comprehensive tests
6. Document in `src/messages/v2/docs/hooks/`

### When Adding a New Model

1. Create in `src/messages/v2/models/your-model/`
2. Export from the directory index
3. Add to main index if part of public API
4. Write unit tests
5. Document usage and examples

## Getting Help

- **Questions**: Open a GitHub Discussion
- **Bugs**: Open a GitHub Issue with reproduction steps
- **Feature Ideas**: Open a GitHub Issue with use cases

## Recognition

Contributors will be recognized in:
- The project README
- Release notes for significant contributions
- GitHub contributor statistics

Thank you for contributing to Mycelia Kernel! 🍄

