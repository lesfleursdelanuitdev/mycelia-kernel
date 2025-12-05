# Security System Documentation

## Overview

The v2 security system provides a comprehensive identity and access control framework for the Mycelia Kernel. It implements a PKR (Public Key Record) based identity model with fine-grained permissions through ReaderWriterSet (RWS).

## Table of Contents

### Core Identity Components

- [Public Key Record (PKR)](./PUBLIC-KEY-RECORD.md) - Immutable, shareable identity references with expiration
- [Principal](./PRINCIPAL.md) - Internal entity representation (kernel, subsystems, friends, resources)
- [Principal Registry](./PRINCIPAL-REGISTRY.md) - Centralized principal management and identity creation

### Access Control

- [Access Control Subsystem](./ACCESS-CONTROL-SUBSYSTEM.md) - Kernel subsystem for identity and access control
- [ReaderWriterSet](./READER-WRITER-SET.md) - Fine-grained access control (read/write/grant permissions)
- [createIdentity](./CREATE-IDENTITY.md) - Full identity wrapper factory with permission-checked methods
- [createFriendIdentity](./CREATE-FRIEND-IDENTITY.md) - Friend-specific identity wrapper factory
- [createResourceIdentity](./CREATE-RESOURCE-IDENTITY.md) - Resource-specific identity wrapper factory with owner check

### Supporting Classes

- [Friend](./FRIEND.md) - Trusted peer representation
- [Resource](./RESOURCE.md) - Managed object representation

### Hooks

- [usePrincipals](../hooks/principals/USE-PRINCIPALS.md) - Principal registry hook for subsystems
- [useRouterWithScopes](../hooks/router/USE-ROUTER-WITH-SCOPES.md) - Router hook with scope-based permission checking

## Quick Start

1. Start with [Public Key Record](./PUBLIC-KEY-RECORD.md) to understand identity references
2. Read [Principal](./PRINCIPAL.md) to learn about entity representation
3. Check [Principal Registry](./PRINCIPAL-REGISTRY.md) for principal management
4. See [ReaderWriterSet](./READER-WRITER-SET.md) for access control
5. Review [createIdentity](./CREATE-IDENTITY.md) for identity wrappers

## Architecture Overview

```
PrincipalRegistry (Central Manager)
├── Principal (Entity Representation)
│   ├── PKR (Public Key Record) - Lazy creation
│   └── Instance binding (kernel, subsystem, friend, resource)
├── ReaderWriterSet (Access Control)
│   ├── Reader permissions
│   ├── Writer permissions
│   └── Grant permissions
├── Identity Wrappers
│   ├── createIdentity (Full RWS-based identity)
│   ├── createFriendIdentity (Friend-specific identity)
│   └── createResourceIdentity (Resource-specific identity with owner check)
└── Supporting Classes
    ├── Friend (Trusted peer representation)
    └── Resource (Managed object representation)
```

## Key Concepts

### PKR (Public Key Record)
Immutable, shareable identity references that expire automatically. Used for external identity sharing.

### Principal
Internal representation of entities (kernel, subsystems, friends, resources) with UUID, keys, and metadata.

### ReaderWriterSet (RWS)
Fine-grained access control system with three permission levels:
- **Read**: View/access resources
- **Write**: Modify resources
- **Grant**: Delegate permissions to others

### Identity Wrappers
Permission-checked function wrappers that provide secure access to resources with automatic permission validation.

## Security Features

- ✅ **Immutable PKRs**: Cannot be modified after creation
- ✅ **Automatic Expiration**: PKRs expire based on configurable time periods
- ✅ **Key Rotation**: Support for PKR refresh on expiration
- ✅ **Fine-grained Permissions**: Read/Write/Grant access control
- ✅ **Kernel Privileges**: Kernel has full access by design
- ✅ **Owner Permissions**: Owners have full access to their resources
- ✅ **Permission Validation**: All operations validate permissions
- ✅ **Granter Verification**: Only authorized granters can grant permissions

