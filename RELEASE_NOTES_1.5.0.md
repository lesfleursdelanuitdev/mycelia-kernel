# Release Notes - v1.5.0

## Summary

This minor release improves the developer experience by exporting core classes (`MessageSystem` and `Message`) from the main package entry point, eliminating the need for deep path imports.

## What's New

### ✅ Core Classes Now Exported

**MessageSystem** - The main message system class
```javascript
import { MessageSystem } from 'mycelia-kernel';

const messageSystem = new MessageSystem('my-app');
await messageSystem.bootstrap();
```

**Message** - The message class for inter-subsystem communication
```javascript
import { Message } from 'mycelia-kernel';

const message = new Message('subsystem://path/to/resource', { data: 'value' });
```

## Breaking Changes

**None** - This is a backward-compatible release. Existing code continues to work.

## Migration Guide

If you're using deep imports, you can simplify your code:

### Before (v1.4.7)
```javascript
import { MessageSystem } from 'mycelia-kernel/src/messages/v2/models/message-system/message-system.v2.mycelia.js';
import { Message } from 'mycelia-kernel/src/messages/v2/models/message/message.mycelia.js';
```

### After (v1.5.0)
```javascript
import { MessageSystem, Message } from 'mycelia-kernel';
```

## All Exports Available

The main package export now includes:
- `BaseSubsystem` - Base class for subsystems
- `MessageSystem` - Main message system class ✨ NEW
- `Message` - Message class ✨ NEW
- `useRouter` - Router hook
- `useRouterWithScopes` - Scoped router hook
- `createGetUserRole` - Security utility
- And 50+ other hooks and utilities

## Testing

All existing tests pass. No breaking changes.

## Installation

```bash
npm install mycelia-kernel@^1.5.0
```

## Documentation

See [CHANGELOG.md](./CHANGELOG.md) for full details.

