# Production vs Development Patterns

This guide explains the differences between production and development patterns in Mycelia Kernel, and when to use each approach.

## Kernel Access Patterns

### ❌ Don't Do This (Production)

```javascript
// This only works in debug mode
const messageSystem = new MessageSystem('app');
await messageSystem.bootstrap();
const kernel = messageSystem.getKernel(); // Returns null in production!
kernel.getProfileRegistry(); // Fails
```

### ✅ Do This (Production)

```javascript
// Use production-safe initialization methods
const messageSystem = new MessageSystem('app');
await messageSystem.bootstrap();

// Production-safe profile initialization
await messageSystem.initializeProfiles({
  'user': { 'api:read': 'r', 'api:write': 'rw' },
  'admin': { 'api:*': 'rwg' }
});

// Or use getKernelForInit() for other initialization tasks
const kernel = messageSystem.getKernelForInit();
const profileRegistry = kernel.getProfileRegistry();
await profileRegistry.createProfile('custom', { 'scope:read': 'r' });
```

### ✅ Do This (Development/Testing)

```javascript
// Debug mode enables full kernel access
const messageSystem = new MessageSystem('app', { debug: true });
await messageSystem.bootstrap();
const kernel = messageSystem.getKernel(); // Available in debug mode
const profileRegistry = kernel.getProfileRegistry();
```

## Initialization Patterns

### Production Pattern

**Use production-safe methods:**

```javascript
const messageSystem = new MessageSystem('my-app');
await messageSystem.bootstrap();

// Initialize profiles (production-safe)
await messageSystem.initializeProfiles({
  'user': { 'api:read': 'r' },
  'admin': { 'api:*': 'rwg' }
});

// Access kernel for initialization only
const kernel = messageSystem.getKernelForInit();
// Use kernel for setup tasks only
```

**Key Points:**
- No debug mode required
- Use `initializeProfiles()` for profiles
- Use `getKernelForInit()` for initialization tasks only
- Don't use kernel for runtime business logic

### Development Pattern

**Use debug mode for testing:**

```javascript
const messageSystem = new MessageSystem('my-app', { debug: true });
await messageSystem.bootstrap();

// Full kernel access available
const kernel = messageSystem.getKernel();
const profileRegistry = kernel.getProfileRegistry();
const accessControl = kernel.getAccessControl();
// ... full access for testing
```

**Key Points:**
- Enable debug mode: `{ debug: true }`
- Full kernel access via `getKernel()`
- Use for testing, debugging, development
- Not recommended for production

## Security Profile Initialization

### Recommended: Production-Safe Method

```javascript
// ✅ Recommended (works in production)
await messageSystem.initializeProfiles({
  'user': { 'api:read': 'r', 'api:write': 'rw' },
  'admin': { 'api:*': 'rwg' }
});
```

### Alternative: Direct Access (Debug Mode Only)

```javascript
// ⚠️ Only works in debug mode
const kernel = messageSystem.getKernel();
if (kernel) {
  const profileRegistry = kernel.getProfileRegistry();
  await profileRegistry.createProfile('user', { 'api:read': 'r' });
}
```

### Alternative: Production-Safe Direct Access

```javascript
// ✅ Works in production (for initialization)
const kernel = messageSystem.getKernelForInit();
const profileRegistry = kernel.getProfileRegistry();
await profileRegistry.createProfile('user', { 'api:read': 'r' });
```

## When to Use Each Method

### `getKernel()` - Debug Mode Only
- **Use for**: Testing, debugging, development
- **Returns**: Kernel instance (debug mode) or null (production)
- **Purpose**: Full access for development/testing

### `getKernelForInit()` - Production-Safe
- **Use for**: Initialization, setup, configuration
- **Returns**: Kernel instance (always available)
- **Purpose**: Legitimate initialization tasks

### `initializeProfiles()` - Production-Safe
- **Use for**: Setting up security profiles
- **Works in**: Both production and development
- **Purpose**: Convenient profile initialization

## Best Practices

1. **Use `initializeProfiles()` for profiles** - It's production-safe and convenient
2. **Use `getKernelForInit()` for other initialization** - When you need kernel access for setup
3. **Avoid `getKernel()` in production** - It returns null unless debug mode is enabled
4. **Enable debug mode only in development** - Use environment variables to control it

## Example: Complete Production Setup

```javascript
import { MessageSystem, BaseSubsystem, useRouter } from 'mycelia-kernel';

// Create message system (no debug mode needed)
const messageSystem = new MessageSystem('my-app');
await messageSystem.bootstrap();

// Initialize security profiles (production-safe)
await messageSystem.initializeProfiles({
  'user': { 'api:read': 'r', 'api:write': 'rw' },
  'admin': { 'api:*': 'rwg' }
});

// Create and register subsystems
const apiSubsystem = new BaseSubsystem('api', { ms: messageSystem });
apiSubsystem.use(useRouter);
await apiSubsystem.build();
await messageSystem.registerSubsystem(apiSubsystem);

// Register routes
apiSubsystem.router.registerRoute('api://users/{id}', async (message, params) => {
  return { user: { id: params.id } };
});
```

## Migration Guide

If you're currently using debug mode for initialization:

### Before
```javascript
const messageSystem = new MessageSystem('app', { debug: true });
await messageSystem.bootstrap();
const kernel = messageSystem.getKernel();
const profileRegistry = kernel.getProfileRegistry();
await profileRegistry.createProfile('user', {...});
```

### After
```javascript
const messageSystem = new MessageSystem('app');
await messageSystem.bootstrap();
await messageSystem.initializeProfiles({
  'user': {...}
});
```

## Summary

- **Production**: Use `initializeProfiles()` and `getKernelForInit()`
- **Development**: Use `getKernel()` with debug mode enabled
- **Testing**: Enable debug mode for full access
- **Initialization**: Always use production-safe methods

