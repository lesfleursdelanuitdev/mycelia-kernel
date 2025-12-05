# Debug Flag Utilities

## Overview

The `debug-flag.utils.mycelia.js` module provides standardized debug flag extraction from configuration and context objects. This utility ensures consistent debug flag resolution across all hooks and subsystems.

## Purpose

Debug flags control whether debug logging is enabled. They can be set at multiple levels:
1. **Facet-specific configuration** (`config.debug`) - Most specific
2. **Context-level** (`ctx.debug`) - General fallback
3. **Default** (`false`) - When neither is set

The `getDebugFlag()` function implements a consistent fallback chain to determine the final debug state.

## API

### `getDebugFlag(config, ctx)`

Extract debug flag from config and context with proper fallback chain.

**Parameters:**
- `config` (Object, optional) - Facet-specific configuration object. May be `undefined`.
- `ctx` (Object, optional) - Context object with debug flag. May be `undefined`.

**Returns:** `boolean` - Debug flag value

**Fallback Chain:**
1. If `config.debug` is explicitly set (including `false`), use that value
2. Otherwise, if `ctx.debug` is set, use that value
3. Otherwise, return `false` (default)

## Usage

### In Hooks

The most common use case is extracting the debug flag in hook functions:

```javascript
import { getDebugFlag } from '../../utils/debug-flag.utils.mycelia.js';

export const useMyHook = createHook({
  kind: 'myhook',
  fn: (ctx, api, subsystem) => {
    const config = ctx.config?.myhook || {};
    const debug = getDebugFlag(config, ctx);
    
    // Use debug flag to configure behavior
    const manager = new MyManager({ debug });
    
    return new Facet('myhook', { attach: true })
      .add({
        // ... facet methods
      });
  }
});
```

### Configuration Examples

#### Explicit Config Debug (Takes Precedence)

```javascript
const subsystem = new BaseSubsystem('my-subsystem', {
  ms: messageSystem,
  config: {
    router: {
      debug: true  // Router will have debug enabled
    }
  },
  debug: false  // General debug is false, but router overrides
});
```

#### Context-Level Debug (Fallback)

```javascript
const subsystem = new BaseSubsystem('my-subsystem', {
  ms: messageSystem,
  config: {
    router: {
      // No debug specified
    }
  },
  debug: true  // Router will use this fallback
});
```

#### No Debug (Default)

```javascript
const subsystem = new BaseSubsystem('my-subsystem', {
  ms: messageSystem,
  config: {
    router: {
      // No debug specified
    }
  }
  // No debug at context level either
  // Router will have debug = false
});
```

#### Explicitly Disable Debug

```javascript
const subsystem = new BaseSubsystem('my-subsystem', {
  ms: messageSystem,
  config: {
    router: {
      debug: false  // Explicitly disabled, even if ctx.debug is true
    }
  },
  debug: true  // This is ignored for router
});
```

## Implementation Details

### Boolean Coercion

The function uses double negation (`!!`) to ensure the result is always a boolean:

```javascript
if (config?.debug !== undefined) {
  return !!config.debug;  // Converts to boolean
}
```

This means:
- `undefined` → falls through to next check
- `null` → treated as `false`
- `0` → treated as `false`
- `''` → treated as `false`
- `1`, `true`, `'true'` → treated as `true`

### Why This Pattern?

The three-level fallback chain provides flexibility:

1. **Facet-specific control**: Each hook can have its own debug setting
2. **Context-level defaults**: Set debug for all hooks at once
3. **Safe defaults**: Never undefined, always a boolean

This pattern is used consistently across all hooks in the system.

## Integration with Logger

The debug flag is typically used with the logger utility:

```javascript
import { getDebugFlag } from '../../utils/debug-flag.utils.mycelia.js';
import { createLogger } from '../../utils/logger.utils.mycelia.js';

const config = ctx.config?.myhook || {};
const debug = getDebugFlag(config, ctx);
const logger = createLogger(debug, `useMyHook ${name}`);

logger.log('Initialized');  // Only logs if debug is true
```

## Best Practices

1. **Always use `getDebugFlag()`** - Don't manually check `config.debug` or `ctx.debug`
2. **Extract config first** - Use `ctx.config?.hookKind || {}` pattern
3. **Pass to components** - Pass the debug flag to managers, routers, etc.
4. **Use with logger** - Combine with `createLogger()` for consistent logging

## See Also

- [Logger Utilities](./LOGGER-UTILS.md) - For creating loggers that respect debug flags
- [Hooks Documentation](./hooks/HOOKS.md) - For hook development patterns
- [Base Subsystem](./BASE-SUBSYSTEM.md) - For subsystem configuration

