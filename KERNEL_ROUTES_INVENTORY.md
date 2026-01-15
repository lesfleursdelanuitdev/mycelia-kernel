# Kernel Routes Inventory

## Overview

This document catalogs all `kernel://` routes in Mycelia Kernel and suggests additional routes that should be implemented.

## Current Kernel Routes

### 1. Resource & Friend Creation (KernelSubsystem)

**Location:** `kernel.subsystem.mycelia.js` → `#registerKernelRoutes()`

| Route | Method | Description | Handler |
|-------|--------|-------------|---------|
| `kernel://create/resource` | POST | Create a new Mycelia Resource | `#handleCreateResource()` |
| `kernel://create/friend` | POST | Create a new Mycelia Friend | `#handleCreateFriend()` |

**Security:** Privileged operations (no permission check on kernel, security via `sendProtected`)

**Example:**
```javascript
// Create resource
const resource = await identity.createResourceIdentity('tree-123', resourceInstance, metadata);

// Create friend
const friend = await identity.createFriend('user-456', { endpoint: 'http://...', role: 'user' });
```

### 2. Error Management (ErrorManagerSubsystem)

**Location:** `error-manager.subsystem.mycelia.js` → `onInit()`

| Route | Method | Description | Handler |
|-------|--------|-------------|---------|
| `kernel://error/record/:type` | POST | Record an error event | `#handleRecordRoute()` |
| `kernel://error/query/recent` | GET | Query recent errors | `#handleQueryRecentRoute()` |
| `kernel://error/query/by-type/:type` | GET | Query errors by type | `#handleQueryByTypeRoute()` |
| `kernel://error/query/summary` | GET | Get error summary counts | `#handleQuerySummaryRoute()` |

**Security:** No explicit permission checks (error recording is a system operation)

**Example:**
```javascript
// Record error
await messageSystem.send(new Message('kernel://error/record/timeout', {
  subsystem: 'network',
  message: 'Request timed out',
  code: 'TIMEOUT_001'
}));

// Query recent errors
const result = await messageSystem.send(new Message('kernel://error/query/recent', {
  limit: 50,
  type: 'timeout'
}));
```

### 3. Event Routes (Emitted by KernelSubsystem)

**Location:** `kernel.subsystem.mycelia.js` → `bootstrap()` and `registerSubsystem()`

| Route | Type | Description | Emitted By |
|-------|------|-------------|------------|
| `kernel://event/kernel-bootstapped` | Event | Kernel bootstrap completed | `bootstrap()` |
| `kernel://event/subsystem-registered` | Event | Subsystem registered with kernel | `registerSubsystem()` |
| `kernel://error/event/recorded` | Event | Error was recorded | `ErrorManagerSubsystem.record()` |

**Note:** These are event notifications, not routes that can be called directly.

### 4. Request/Response Routes (Used by Hooks)

**Location:** Various hooks (requests, responses)

| Route | Type | Description | Used By |
|-------|------|-------------|---------|
| `kernel://request/oneShot/:messageId` | Route | One-shot request reply route | `useRequests` hook |
| `kernel://response/receive` | Route | Response receiving route | `useResponses` hook |

**Note:** These are internal routes used by the request/response system.

### 5. Command Routes (Used by Commands Hook)

**Location:** `use-commands.mycelia.js`

| Route | Type | Description | Used By |
|-------|------|-------------|---------|
| `kernel://command/run` | Route | Command execution route | `useCommands` hook |

**Note:** These are example routes; actual command routes are subsystem-specific.

## Missing Kernel Routes (Recommended)

### Resource Management

Currently, we can **create** resources, but we cannot:
- Query resources by name/type
- Update resource metadata
- Delete resources
- List resources owned by a subsystem

**Suggested Routes:**

| Route | Method | Description | Priority |
|-------|--------|-------------|----------|
| `kernel://query/resource/:name` | GET | Get resource by name | High |
| `kernel://query/resources/by-type/:type` | GET | List resources by type | Medium |
| `kernel://query/resources/by-owner` | GET | List resources owned by caller | High |
| `kernel://update/resource/:name` | PUT | Update resource metadata | Medium |
| `kernel://delete/resource/:name` | DELETE | Delete a resource | Low |

**Rationale:**
- Resource querying is essential for resource management
- Subsystems need to list their resources
- Resource lifecycle management requires update/delete

### Friend Management

Currently, we can **create** friends, but we cannot:
- Query friends by name/PKR
- Update friend metadata
- Delete friends
- List all friends

**Suggested Routes:**

| Route | Method | Description | Priority |
|-------|--------|-------------|----------|
| `kernel://query/friend/:name` | GET | Get friend by name | High |
| `kernel://query/friend/by-pkr/:pkrUuid` | GET | Get friend by PKR UUID | High |
| `kernel://query/friends` | GET | List all friends | Medium |
| `kernel://update/friend/:name` | PUT | Update friend metadata | Medium |
| `kernel://delete/friend/:name` | DELETE | Delete a friend | Low |

**Rationale:**
- Friend lookup is needed for authentication/user management
- Friend metadata updates (e.g., role changes)
- Friend lifecycle management

### Permission Management

Currently, permissions are managed via identity methods (`grantReader`, `grantWriter`, etc.), but there's no kernel route for:
- Querying permissions on a resource
- Bulk permission operations
- Permission inheritance management

**Suggested Routes:**

| Route | Method | Description | Priority |
|-------|--------|-------------|----------|
| `kernel://query/permissions/:resourceName` | GET | Get permissions for a resource | High |
| `kernel://grant/permission/:resourceName` | POST | Grant permission on resource | High |
| `kernel://revoke/permission/:resourceName` | POST | Revoke permission on resource | High |
| `kernel://query/permissions/inherited/:resourceName` | GET | Get inherited permissions | Medium |

**Rationale:**
- Permission queries are needed for UI/admin interfaces
- Centralized permission management via kernel routes
- Supports permission inheritance queries

### Channel Management

Currently, channels are managed via direct method calls on `ChannelManagerSubsystem`. Adding kernel routes would:
- Enable message-based channel management
- Support remote channel operations
- Provide consistent API with other kernel operations

**Suggested Routes:**

| Route | Method | Description | Priority |
|-------|--------|-------------|----------|
| `kernel://create/channel` | POST | Create a new channel | Medium |
| `kernel://query/channel/:route` | GET | Get channel by route | Medium |
| `kernel://query/channels` | GET | List all channels owned by caller | Medium |
| `kernel://update/channel/:route` | PUT | Update channel (participants, metadata) | Low |
| `kernel://delete/channel/:route` | DELETE | Delete a channel | Low |

**Rationale:**
- Consistency with resource/friend creation routes
- Enables remote channel management
- Supports channel lifecycle management

### Profile Management

Currently, profiles are managed via direct method calls on `ProfileRegistrySubsystem`. Adding kernel routes would:
- Enable message-based profile management
- Support remote profile operations
- Provide consistent API

**Suggested Routes:**

| Route | Method | Description | Priority |
|-------|--------|-------------|----------|
| `kernel://create/profile` | POST | Create a new security profile | Medium |
| `kernel://query/profile/:name` | GET | Get profile by name | Medium |
| `kernel://query/profiles` | GET | List all profiles | Medium |
| `kernel://apply/profile/:name` | POST | Apply profile to a principal | High |
| `kernel://remove/profile/:name` | POST | Remove profile from a principal | Medium |
| `kernel://delete/profile/:name` | DELETE | Delete a profile | Low |

**Rationale:**
- Consistency with other kernel operations
- Enables remote profile management
- Supports profile lifecycle management

### System Information

Routes for querying system state and information:

| Route | Method | Description | Priority |
|-------|--------|-------------|----------|
| `kernel://query/subsystems` | GET | List all registered subsystems | Medium |
| `kernel://query/subsystem/:name` | GET | Get subsystem information | Medium |
| `kernel://query/status` | GET | Get kernel/system status | Low |
| `kernel://query/statistics` | GET | Get system statistics | Low |

**Rationale:**
- System introspection and debugging
- Administrative interfaces
- Monitoring and observability

## Implementation Priority

### High Priority (Essential for Resource/Friend Management)

1. **Resource Query Routes:**
   - `kernel://query/resource/:name` - Essential for resource lookup
   - `kernel://query/resources/by-owner` - Essential for listing owned resources

2. **Friend Query Routes:**
   - `kernel://query/friend/:name` - Essential for friend lookup
   - `kernel://query/friend/by-pkr/:pkrUuid` - Essential for PKR-based lookup

3. **Permission Management Routes:**
   - `kernel://query/permissions/:resourceName` - Essential for permission queries
   - `kernel://grant/permission/:resourceName` - Essential for permission management
   - `kernel://revoke/permission/:resourceName` - Essential for permission management

### Medium Priority (Useful for Complete Management)

4. **Resource Management:**
   - `kernel://query/resources/by-type/:type` - Useful for filtering
   - `kernel://update/resource/:name` - Useful for metadata updates

5. **Friend Management:**
   - `kernel://query/friends` - Useful for listing all friends
   - `kernel://update/friend/:name` - Useful for metadata updates

6. **Profile Management:**
   - `kernel://apply/profile/:name` - Useful for applying profiles
   - `kernel://query/profiles` - Useful for listing profiles

7. **Channel Management:**
   - `kernel://create/channel` - Consistency with resource/friend creation
   - `kernel://query/channel/:route` - Useful for channel lookup

### Low Priority (Nice to Have)

8. **Delete Operations:**
   - `kernel://delete/resource/:name`
   - `kernel://delete/friend/:name`
   - `kernel://delete/channel/:route`
   - `kernel://delete/profile/:name`

9. **System Information:**
   - `kernel://query/subsystems`
   - `kernel://query/status`
   - `kernel://query/statistics`

## Implementation Pattern

All kernel routes should follow the same pattern:

1. **Register in KernelSubsystem:**
   ```javascript
   router.registerRoute(
     'kernel://query/resource/:name',
     async (message, params, options) => {
       return await this.#handleQueryResource(message, params, options);
     },
     {
       metadata: {
         description: 'Query a resource by name'
       }
     }
   );
   ```

2. **Handler extracts callerId:**
   ```javascript
   async #handleQueryResource(message, params, options) {
     const callerPkr = options.callerId;
     if (!callerPkr || !callerPkr.uuid) {
       throw new Error('KernelSubsystem.queryResource: callerId (PKR) required');
     }
     // ... implementation
   }
   ```

3. **Delegate to appropriate child subsystem:**
   ```javascript
   const accessControl = this.getAccessControl();
   // Use accessControl or other child subsystem
   ```

4. **Return result in consistent format:**
   ```javascript
   return {
     success: true,
     resource: resourceObject
   };
   ```

## Security Considerations

- **No permission checks on kernel routes:** Kernel routes are privileged operations
- **Security via sendProtected:** All routes require `sendProtected()` which verifies `callerId`
- **Owner validation:** Routes should validate that the caller owns the resource/friend being accessed
- **Kernel validation:** Handlers should verify `callerIdSetBy` is the kernel (already done by `sendProtected`)

## Next Steps

1. ✅ **Completed:** `kernel://create/resource` and `kernel://create/friend`
2. **Next:** Implement high-priority query routes:
   - `kernel://query/resource/:name`
   - `kernel://query/resources/by-owner`
   - `kernel://query/friend/:name`
   - `kernel://query/friend/by-pkr/:pkrUuid`
3. **Then:** Implement permission management routes
4. **Finally:** Implement medium/low priority routes as needed

