# Listener Configuration

## Overview

This document describes all configurable options for the listener system, including `ListenerManager` constructor options, `useListeners` hook configuration, and policy-specific options.

## useListeners Hook Configuration

The `useListeners` hook reads configuration from `ctx.config.listeners`:

```javascript
{
  registrationPolicy: string,
  debug: boolean,
  policyOptions: object
}
```

### Configuration Location

```javascript
const subsystem = new BaseSubsystem('my-subsystem', {
  ms: messageSystem,
  config: {
    listeners: {
      // Listener configuration here
    }
  }
});
```

### Configuration Options

#### `registrationPolicy`

**Type:** `string`

**Default:** `'multiple'`

**Description:** Registration policy that controls how listeners are registered for each path.

**Possible Values:**

| Value | Description | Behavior |
|-------|-------------|----------|
| `'multiple'` | Allow multiple listeners per path | New listeners are always added to the end |
| `'single'` | Only one listener per path | Registration fails if a listener already exists |
| `'replace'` | Replace all existing listeners | New listener replaces all existing listeners |
| `'append'` | Always add to end | Same as `multiple` (always appends) |
| `'prepend'` | Always add to beginning | New listener is added at the start |
| `'priority'` | Sort by priority | Listeners are sorted by priority (higher first) |
| `'limited'` | Limit number of listeners | Maximum listeners per path (requires `policyOptions.maxListeners`) |

**Example:**
```javascript
config: {
  listeners: {
    registrationPolicy: 'single'
  }
}
```

#### `debug`

**Type:** `boolean`

**Default:** `false`

**Description:** Enable debug logging for the listener system. Falls back to `ctx.debug` if not specified.

**Possible Values:**
- `true` - Enable debug logging
- `false` - Disable debug logging

**Example:**
```javascript
config: {
  listeners: {
    debug: true
  }
}
```

#### `policyOptions`

**Type:** `object`

**Default:** `{}`

**Description:** Policy-specific configuration options. Options vary by registration policy.

**Structure:**
```javascript
{
  // Policy-specific options (see below)
}
```

**Example:**
```javascript
config: {
  listeners: {
    registrationPolicy: 'limited',
    policyOptions: {
      maxListeners: 5
    }
  }
}
```

## Policy-Specific Options

### Priority Policy Options

When using `registrationPolicy: 'priority'`:

#### `priority`

**Type:** `number`

**Default:** `0`

**Description:** Handler priority. Higher values are called first. Can be negative.

**Possible Values:**
- Any number (integer or float)
- Higher values = higher priority = called first
- Default is `0` if not specified

**Example:**
```javascript
config: {
  listeners: {
    registrationPolicy: 'priority',
    policyOptions: {
      priority: 10  // High priority
    }
  }
}
```

**Usage:**
```javascript
// Register with priority
listenerManager.setListenerPolicy('priority', { priority: 10 });
listenerManager.on('path', handler1);  // priority: 10

listenerManager.setListenerPolicy('priority', { priority: 5 });
listenerManager.on('path', handler2);  // priority: 5

// Handler1 will be called before handler2
```

### Limited Policy Options

When using `registrationPolicy: 'limited'`:

#### `maxListeners`

**Type:** `number`

**Default:** `10`

**Description:** Maximum number of listeners allowed per path.

**Possible Values:**
- Positive integer (`>= 1`)
- Must be `>= 1`

**Validation:**
- Must be a number
- Must be `>= 1`
- Registration fails if limit is reached

**Example:**
```javascript
config: {
  listeners: {
    registrationPolicy: 'limited',
    policyOptions: {
      maxListeners: 5  // Allow maximum 5 listeners per path
    }
  }
}
```

**Usage:**
```javascript
// Set limited policy with maxListeners
listenerManager.setListenerPolicy('limited', { maxListeners: 3 });

// Register 3 listeners (succeeds)
listenerManager.on('path', handler1);
listenerManager.on('path', handler2);
listenerManager.on('path', handler3);

// 4th registration fails
listenerManager.on('path', handler4);  // Throws error: "Maximum 3 listeners allowed..."
```

## ListenerManager Constructor Options

When creating a `ListenerManager` directly (not through the hook):

```javascript
const listenerManager = new ListenerManager({
  registrationPolicy: string,
  debug: boolean,
  policyOptions: object
});
```

### Options

All options are the same as `useListeners` hook configuration:

- **`registrationPolicy`**: Same as above
- **`debug`**: Same as above
- **`policyOptions`**: Same as above

**Example:**
```javascript
const listenerManager = new ListenerManager({
  registrationPolicy: 'single',
  debug: true,
  policyOptions: {}
});
```

## Runtime Configuration

### enableListeners() Options

When calling `enableListeners()` on the facet, you can override configuration:

```javascript
subsystem.listeners.enableListeners({
  registrationPolicy: 'limited',
  debug: true,
  policyOptions: {
    maxListeners: 10
  }
});
```

**Options:**
- Same structure as hook configuration
- Overrides `ctx.config.listeners` values
- Only applied on first call (subsequent calls are no-ops)

## Configuration Examples

### Basic Configuration

```javascript
const subsystem = new BaseSubsystem('my-subsystem', {
  ms: messageSystem,
  config: {
    listeners: {
      registrationPolicy: 'multiple',
      debug: false
    }
  }
});
```

### Single Listener Policy

```javascript
config: {
  listeners: {
    registrationPolicy: 'single',
    debug: true
  }
}
```

### Limited Listeners Policy

```javascript
config: {
  listeners: {
    registrationPolicy: 'limited',
    debug: false,
    policyOptions: {
      maxListeners: 5
    }
  }
}
```

### Priority Policy

```javascript
config: {
  listeners: {
    registrationPolicy: 'priority',
    debug: true,
    policyOptions: {
      priority: 10  // Default priority for all registrations
    }
  }
}
```

### Replace Policy

```javascript
config: {
  listeners: {
    registrationPolicy: 'replace',
    debug: false
  }
}
```

### Prepend Policy

```javascript
config: {
  listeners: {
    registrationPolicy: 'prepend',
    debug: false
  }
}
```

## Configuration Precedence

Configuration is resolved in the following order (highest to lowest priority):

1. **Runtime Options** (via `enableListeners(listenerOptions)`)
2. **Hook Configuration** (`ctx.config.listeners`)
3. **Context Debug** (`ctx.debug`)
4. **Defaults**

**Example:**
```javascript
// Context-level debug
const subsystem = new BaseSubsystem('my-subsystem', {
  ms: messageSystem,
  debug: true,  // Context-level
  config: {
    listeners: {
      registrationPolicy: 'multiple',
      debug: false  // Overrides context-level for listeners
    }
  }
});

// Runtime override
subsystem.listeners.enableListeners({
  debug: true  // Overrides config.debug
});
```

## Policy Behavior Summary

| Policy | Multiple Listeners | Registration Behavior | Use Case |
|--------|-------------------|----------------------|----------|
| `multiple` | ✅ Yes | Always adds to end | Default, most flexible |
| `single` | ❌ No | Fails if listener exists | One handler per path |
| `replace` | ❌ No | Replaces all existing | Always use latest handler |
| `append` | ✅ Yes | Always adds to end | Same as `multiple` |
| `prepend` | ✅ Yes | Always adds to start | Latest handler called first |
| `priority` | ✅ Yes | Sorted by priority | Control execution order |
| `limited` | ✅ Yes (up to limit) | Adds until limit reached | Resource management |

## Validation

### Policy Validation

- Unknown policies throw errors
- Policy names are case-sensitive
- Default policies cannot be unregistered

### Option Validation

**Priority Policy:**
- `priority` must be a number (if provided)
- No minimum/maximum constraints

**Limited Policy:**
- `maxListeners` must be a number
- `maxListeners` must be `>= 1`
- Registration fails if limit is reached

**Example - Invalid Configuration:**
```javascript
// Invalid: maxListeners must be >= 1
config: {
  listeners: {
    registrationPolicy: 'limited',
    policyOptions: {
      maxListeners: 0  // ❌ Error: must be positive
    }
  }
}

// Invalid: priority must be a number
config: {
  listeners: {
    registrationPolicy: 'priority',
    policyOptions: {
      priority: 'high'  // ❌ Error: must be a number
    }
  }
}
```

## Custom Policies

You can register custom policies at runtime:

```javascript
listenerManager.registerPolicy('my-custom', (existingListeners, path, handler, options) => {
  // Custom policy logic
  return {
    success: boolean,
    listeners: Array<Function>,
    error: string | null
  };
});
```

**Custom Policy Function Signature:**
```javascript
function customPolicy(existingListeners, path, handler, options) {
  // existingListeners: Array<Function> - Current handlers
  // path: string - Message path
  // handler: Function - New handler to register
  // options: Object - Policy options
  //   - policy: string - Policy name
  //   - debug: boolean - Debug flag
  //   - ...policyOptions - Custom options
  
  return {
    success: boolean,      // Whether registration succeeded
    listeners: Array,      // New listeners array
    error: string | null  // Error message if failed
  };
}
```

## See Also

- [useListeners Hook](./USE-LISTENERS.md) - Hook documentation
- [ListenerManager](./LISTENER-MANAGER.md) - Class documentation
- [Listener Manager Policies](../../listener-manager-policies.mycelia.js) - Policy implementations

