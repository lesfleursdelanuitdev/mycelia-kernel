# useKernelServices Hook

## Overview

The `useKernelServices` hook installs kernel child subsystems (access-control, error-manager, etc.) for the KernelSubsystem. It creates child subsystem instances and adds them to the hierarchy. Children are automatically built by `buildChildren()` after all hooks are installed.

**Key Features:**
- **Child Subsystem Creation**: Automatically creates kernel child subsystems
- **Hierarchy Integration**: Adds child subsystems to the hierarchy
- **Automatic Building**: Children are built automatically after all hooks are installed
- **Configurable Services**: Supports per-service configuration
- **Kernel Integration**: Passes kernel instance to child subsystems that need it

## Hook Metadata

```javascript
{
  kind: 'kernelServices',
  overwrite: false,
  required: ['hierarchy'],
  attach: false,
  source: import.meta.url
}
```

### Properties

- **`kind`**: `'kernelServices'` - Unique identifier for this facet
- **`overwrite`**: `false` - Does not allow overwriting existing kernelServices facet
- **`required`**: `['hierarchy']` - Requires `hierarchy` facet
- **`attach`**: `false` - Facet is not attached to the subsystem (for consistency only)
- **`source`**: `import.meta.url` - Source file location for debugging

## Configuration

The hook reads configuration from `ctx.config.kernelServices`:

```javascript
{
  services: {
    'access-control': {
      // AccessControlSubsystem configuration
    },
    'error-manager': {
      // ErrorManagerSubsystem configuration
    }
  }
}
```

### Configuration Options

- **`services`** (object, optional) - Service-specific configuration:
  - `'access-control'` (object, optional) - AccessControlSubsystem configuration
  - `'error-manager'` (object, optional) - ErrorManagerSubsystem configuration

**Note:** The hook also reads `ctx.config.errorManager` for backward compatibility with ErrorManagerSubsystem configuration.

**Example:**
```javascript
const kernel = new KernelSubsystem('kernel', {
  ms: messageSystem,
  config: {
    kernelServices: {
      services: {
        'access-control': {
          // AccessControlSubsystem config
        },
        'error-manager': {
          // ErrorManagerSubsystem config
          boundedErrorStore: {
            capacity: 5000
          }
        }
      }
    },
    // Backward compatibility: errorManager config
    errorManager: {
      boundedErrorStore: {
        capacity: 5000
      }
    }
  }
});
```

## Installed Child Subsystems

The hook automatically creates and installs the following child subsystems:

### Access Control Subsystem

**Name:** `'access-control'`

**Class:** `AccessControlSubsystem`

**Configuration:**
- Automatically receives `kernel` instance in `config.principals.kernel`
- Merges `config.kernelServices.services['access-control']` if provided

**Example:**
```javascript
// AccessControlSubsystem is automatically created
const kernel = new KernelSubsystem('kernel', { ms: messageSystem });
await kernel.bootstrap();

// Access via kernel
const accessControl = kernel.getAccessControl();
```

### Error Manager Subsystem

**Name:** `'error-manager'`

**Class:** `ErrorManagerSubsystem`

**Configuration:**
- Merges `ctx.config.errorManager` (for backward compatibility)
- Merges `config.kernelServices.services['error-manager']` if provided

**Example:**
```javascript
// ErrorManagerSubsystem is automatically created
const kernel = new KernelSubsystem('kernel', { ms: messageSystem });
await kernel.bootstrap();

// Access via kernel
const errorManager = kernel.getErrorManager();
```

## Behavior

### Child Subsystem Creation

During hook execution:

1. **Verifies Hierarchy**: Checks that `hierarchy` facet exists
2. **Reads Configuration**: Gets configuration from `ctx.config.kernelServices`
3. **Creates Child Subsystems**: Instantiates each child subsystem with:
   - Name from child definition
   - MessageSystem from parent (`subsystem.ms` or `subsystem.messageSystem`)
   - Merged configuration
   - Debug flag from context or parent
4. **Adds to Hierarchy**: Adds each child to the hierarchy via `hierarchy.addChild()`
5. **Automatic Building**: Children are automatically built by `buildChildren()` after all hooks are installed

### Automatic Building

Child subsystems are automatically built by the parent subsystem's `buildChildren()` method after all hooks are installed. This ensures:

- All parent hooks are installed first
- Child subsystems are created in the correct order
- Child subsystems are built with proper context

## Usage Patterns

### Basic Usage

```javascript
import { KernelSubsystem } from './models/kernel-subsystem/kernel.subsystem.mycelia.js';
import { MessageSystem } from './models/message-system/message-system.v2.mycelia.js';

// Create kernel with default child subsystems
const messageSystem = new MessageSystem('main-system');
const kernel = new KernelSubsystem('kernel', {
  ms: messageSystem
});

// Bootstrap (builds kernel and child subsystems)
await kernel.bootstrap();

// Access child subsystems
const accessControl = kernel.getAccessControl();
const errorManager = kernel.getErrorManager();
```

### With Configuration

```javascript
const kernel = new KernelSubsystem('kernel', {
  ms: messageSystem,
  config: {
    kernelServices: {
      services: {
        'access-control': {
          // AccessControlSubsystem configuration
        },
        'error-manager': {
          boundedErrorStore: {
            capacity: 5000
          }
        }
      }
    }
  }
});

await kernel.bootstrap();
```

### Backward Compatibility

The hook supports backward compatibility with `ctx.config.errorManager`:

```javascript
const kernel = new KernelSubsystem('kernel', {
  ms: messageSystem,
  config: {
    // Old way (still works)
    errorManager: {
      boundedErrorStore: {
        capacity: 5000
      }
    },
    // New way (preferred)
    kernelServices: {
      services: {
        'error-manager': {
          boundedErrorStore: {
            capacity: 5000
          }
        }
      }
    }
  }
});
```

## Integration with KernelSubsystem

The `useKernelServices` hook is automatically installed by `KernelSubsystem`:

```javascript
export class KernelSubsystem extends BaseSubsystem {
  constructor(name = 'kernel', options = {}) {
    super(name, options);
    this.defaultHooks = createSynchronousDefaultHooks();
    
    // Install kernel services hook (creates and adds child subsystems)
    this.use(useKernelServices);
  }

  async bootstrap(opts) {
    // Build the subsystem (this will run all hooks including useKernelServices)
    await this.build(opts);
  }

  getAccessControl() {
    const hierarchy = this.find('hierarchy');
    if (!hierarchy) return null;
    return hierarchy.getChild('access-control') || null;
  }

  getErrorManager() {
    const hierarchy = this.find('hierarchy');
    if (!hierarchy) return null;
    return hierarchy.getChild('error-manager') || null;
  }
}
```

## Child Subsystem Lifecycle

### Creation Phase

1. Hook executes during `build()`
2. Child subsystems are instantiated
3. Children are added to hierarchy via `hierarchy.addChild()`

### Building Phase

1. After all hooks are installed, `buildChildren()` is called
2. Each child subsystem's `build()` method is called
3. Children are fully initialized and ready to use

### Access Phase

After bootstrap, child subsystems can be accessed:

```javascript
await kernel.bootstrap();

// Access child subsystems
const accessControl = kernel.getAccessControl();
const errorManager = kernel.getErrorManager();

// Use child subsystems
if (accessControl) {
  const resource = accessControl.createResource(owner, 'my-resource', instance);
}

if (errorManager) {
  const result = errorManager.record(error, {
    messageSubsystem: 'my-subsystem'
  });
}
```

## Error Handling

### Missing Hierarchy Facet

If the `hierarchy` facet is not found, the hook throws an error:

```javascript
try {
  // Hook execution during build
  await kernel.build();
} catch (error) {
  console.error(error.message);
  // "useKernelServices: hierarchy facet is required but not found"
}
```

**Solution:** Ensure `useHierarchy` hook is installed before `useKernelServices`.

## Configuration Merging

### Access Control Configuration

AccessControlSubsystem configuration is merged as follows:

```javascript
{
  principals: {
    kernel: subsystem  // Always set to parent kernel subsystem
  },
  ...(kernelServicesConfig['access-control'] || {})  // User config
}
```

### Error Manager Configuration

ErrorManagerSubsystem configuration is merged as follows:

```javascript
{
  ...(ctx.config?.errorManager || {}),  // Backward compatibility
  ...(kernelServicesConfig['error-manager'] || {})  // User config
}
```

**Note:** `kernelServicesConfig['error-manager']` takes precedence over `ctx.config.errorManager`.

## Best Practices

1. **Use KernelSubsystem**: Typically used via `KernelSubsystem`, not directly
2. **Configure Services**: Use `config.kernelServices.services` for service-specific configuration
3. **Access After Bootstrap**: Always access child subsystems after `bootstrap()` completes
4. **Check for Null**: Always check if child subsystems exist before using them
5. **Use Helper Methods**: Use `kernel.getAccessControl()` and `kernel.getErrorManager()` instead of accessing hierarchy directly

## Adding Custom Child Subsystems

To add custom child subsystems, you can extend the hook or create a custom hook:

```javascript
// Custom hook that extends kernel services
export const useCustomKernelServices = createHook({
  kind: 'customKernelServices',
  required: ['hierarchy'],
  attach: false,
  fn: (ctx, api, subsystem) => {
    const hierarchy = subsystem.find('hierarchy');
    
    // Add custom child subsystem
    const customChild = new CustomSubsystem('custom-service', {
      ms: subsystem.ms || subsystem.messageSystem,
      config: ctx.config?.customService || {}
    });
    
    hierarchy.addChild(customChild);
    
    return new Facet('customKernelServices', { attach: false });
  }
});
```

## See Also

- [Kernel Subsystem](../message/MESSAGE-SYSTEM.md) - Kernel subsystem that uses this hook
- [Access Control Subsystem](../security/ACCESS-CONTROL-SUBSYSTEM.md) - Access control subsystem created by this hook
- [Error Manager Subsystem](../errors/ERROR-MANAGER-SUBSYSTEM.md) - Error manager subsystem created by this hook
- [useHierarchy](./../hierarchy/USE-HIERARCHY.md) - Hierarchy hook required by this hook
- [Base Subsystem](../BASE-SUBSYSTEM.md) - Core building block for all subsystems
- [Hooks Documentation](../HOOKS.md) - Understanding hooks and how they work

