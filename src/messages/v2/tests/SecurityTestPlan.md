# Security System Test Plan

This document outlines the comprehensive test plan for all security-related files in the v2 codebase.

## Overview

The security system consists of:
- **PKR (Public Key Record)**: Immutable identity reference with expiration
- **Principal**: Internal entity representation
- **PrincipalRegistry**: Central manager for all principals
- **ReaderWriterSet**: Access control mechanism
- **createIdentity**: Identity wrapper factory
- **createFriendIdentity**: Friend-specific identity factory
- **Friend**: Trusted peer representation
- **Resource**: Generic managed object
- **usePrincipals**: Hook for subsystem integration

---

## 1. PKR (Public Key Record) Tests

**File**: `public-key-record.mycelia.js`  
**Test File**: `PKRTest.jsx`

### Categories:

#### 1.1 Constructor Validation (8 tests)
- Constructor - throws error for null uuid
- Constructor - throws error for empty string uuid
- Constructor - throws error for non-string uuid
- Constructor - throws error for non-string kind
- Constructor - throws error for non-symbol publicKey
- Constructor - throws error for non-symbol minter (when provided)
- Constructor - accepts valid parameters
- Constructor - accepts optional name and minter

#### 1.2 Expiration Parsing (12 tests)
- parseExpiration - defaults to 1 week for null/undefined
- parseExpiration - defaults to 1 week for invalid string
- parseExpiration - parses numeric hours (e.g., "3 hours")
- parseExpiration - parses word hours (e.g., "three hours")
- parseExpiration - parses numeric days (e.g., "5 days")
- parseExpiration - parses word days (e.g., "two days")
- parseExpiration - parses numeric weeks (e.g., "2 weeks")
- parseExpiration - parses word weeks (e.g., "one week")
- parseExpiration - handles case insensitivity
- parseExpiration - handles abbreviations (hr, hrs, wk, wks)
- Constructor - sets expiration from string parameter
- Constructor - defaults to 1 week when expiration not provided

#### 1.3 Getters (5 tests)
- get uuid - returns correct uuid
- get name - returns name or null
- get kind - returns correct kind
- get publicKey - returns correct publicKey
- Object.freeze - prevents modification

#### 1.4 Kernel Verification (4 tests)
- isMinter - throws error for non-symbol key
- isMinter - returns true for matching minter
- isMinter - returns false for non-matching minter
- isMinter - returns false when minter is null

#### 1.5 Expiry (6 tests)
- isExpired - returns false for fresh PKR
- isExpired - returns true after expiration time
- isExpired - works with custom expiration times
- isValid - returns true for valid PKR
- isValid - returns false for expired PKR
- isValid - returns false for wrong minter

#### 1.6 Serialization (4 tests)
- toJSON - returns correct structure
- toJSON - includes all fields
- toString - returns formatted string
- equals - returns true for same PKR
- equals - returns false for different PKR

**Total: ~39 tests**

---

## 2. Principal Tests

**File**: `principal.mycelia.js`  
**Test File**: `PrincipalTest.jsx`

### Categories:

#### 2.1 Constructor Validation (7 tests)
- Constructor - throws error for missing kind
- Constructor - throws error for non-string kind
- Constructor - throws error for non-symbol publicKey
- Constructor - throws error for non-symbol kernelId (when provided)
- Constructor - accepts valid parameters
- Constructor - generates UUID automatically
- Constructor - sets createdAt timestamp

#### 2.2 Getters (7 tests)
- get uuid - returns generated UUID
- get name - returns name or null
- get kind - returns correct kind
- get publicKey - returns correct publicKey
- get metadata - returns metadata object
- get createdAt - returns Date object
- get instance - returns null initially

#### 2.3 Instance Binding (8 tests)
- attachInstance - throws error if instance already attached
- attachInstance - throws error for non-object
- attachInstance - throws error for invalid kind (resource without owner)
- attachInstance - accepts kernel instance
- attachInstance - accepts topLevel/child instance
- attachInstance - accepts friend instance
- attachInstance - accepts resource instance
- attachInstance - can attach in constructor

#### 2.4 PKR Generation (5 tests)
- get pkr - creates PKR lazily
- get pkr - returns same PKR on subsequent calls
- get pkr - includes correct UUID
- get pkr - includes correct name
- get pkr - includes kernelId as minter

#### 2.5 PKR Refresh (5 tests)
- refresh - throws error for non-symbol newPublicKey
- refresh - updates publicKey
- refresh - creates new PKR
- refresh - preserves UUID and name
- refresh - invalidates old PKR cache

#### 2.6 Name Management (2 tests)
- rename - updates name
- rename - accepts null to clear name

#### 2.7 Serialization (3 tests)
- toRecord - returns correct structure
- equals - returns true for same principal
- toString - returns formatted string

**Total: ~37 tests**

---

## 3. PrincipalRegistry Tests

**File**: `principal-registry.mycelia.js`  
**Test File**: `PrincipalRegistryTest.jsx`

### Categories:

#### 3.1 Constructor (4 tests)
- Constructor - initializes with empty registry
- Constructor - creates kernel principal when kernel provided
- Constructor - creates kernel identity when kernel provided
- Constructor - stores kernel reference

#### 3.2 Key Minting (8 tests)
- mint - throws error for invalid kind
- mint - returns publicKey for all kinds
- mint - returns privateKey for kernel/topLevel/friend
- mint - does not return privateKey for child/resource
- mint - generates unique symbols
- mint - defaults to resource kind

#### 3.3 Principal Creation (15 tests)
- createPrincipal - throws error for invalid kind
- createPrincipal - throws error for duplicate kernel
- createPrincipal - creates principal with correct kind
- createPrincipal - generates keys via mint
- createPrincipal - sets name from opts or instance
- createPrincipal - attaches instance if provided
- createPrincipal - registers principal internally
- createPrincipal - returns PKR
- createPrincipal - supports all principal kinds
- createPrincipal - sets kernelId for kernel
- createPrincipal - links owner for child/resource
- createPrincipal - handles metadata
- createPrincipal - prevents duplicate UUIDs
- createPrincipal - prevents duplicate names
- createPrincipal - prevents duplicate publicKeys

#### 3.4 PKR Resolution (6 tests)
- resolvePKR - throws error for invalid PKR
- resolvePKR - returns undefined for unknown PKR
- resolvePKR - returns privateKey for known PKR
- resolvePKR - works after key rotation
- resolvePKR - handles expired PKRs
- resolvePKR - works with all principal kinds

#### 3.5 Principal Refresh (12 tests)
- refreshPrincipal - throws error for unknown publicKey
- refreshPrincipal - throws error for unregistered principal
- refreshPrincipal - throws error for invalid type
- refreshPrincipal - returns current PKR if not expired
- refreshPrincipal - returns current PKR if already refreshed
- refreshPrincipal - creates new publicKey on expiration
- refreshPrincipal - updates internal mappings
- refreshPrincipal - preserves privateKey mapping
- refreshPrincipal - creates new identity wrapper for instance
- refreshPrincipal - uses createFriendIdentity for friends
- refreshPrincipal - uses createIdentity for others
- refreshPrincipal - prevents concurrent refresh (lock)

#### 3.6 ReaderWriterSet Creation (5 tests)
- createRWS - throws error for invalid PKR
- createRWS - throws error for unknown principal
- createRWS - creates new RWS
- createRWS - returns cached RWS on subsequent calls
- createRWS - links to correct principal

#### 3.7 Identity Creation (8 tests)
- createIdentity - throws error for invalid PKR
- createIdentity - throws error for unknown PKR
- createIdentity - throws error for missing kernel
- createIdentity - throws error for kernel without sendProtected
- createIdentity - returns identity wrapper
- createIdentity - includes permission methods
- createIdentity - includes sendProtected method
- createIdentity - links to correct principal

#### 3.8 Friend Identity Creation (6 tests)
- createFriendIdentity - throws error for invalid PKR
- createFriendIdentity - throws error for unknown principal
- createFriendIdentity - throws error for non-friend principal
- createFriendIdentity - throws error for missing kernel
- createFriendIdentity - returns identity wrapper
- createFriendIdentity - validates friend kind

#### 3.9 Lookups (8 tests)
- get - returns principal by UUID
- get - returns undefined for unknown UUID
- has - returns true for UUID
- has - returns true for name
- has - returns true for publicKey
- has - returns true for privateKey
- has - returns false for unknown id
- has - handles all identifier types

#### 3.10 Deletion (6 tests)
- delete - returns null for unknown UUID
- delete - removes principal from all maps
- delete - removes name mapping
- delete - removes key mappings
- delete - clears kernelId if kernel deleted
- delete - removes RWS cache

#### 3.11 Clear (2 tests)
- clear - removes all principals
- clear - resets kernelId

#### 3.12 Iteration & Info (5 tests)
- size - returns correct count
- Symbol.iterator - iterates over principals
- list - returns array of principals
- kernelId - returns kernel private key
- isKernel - checks if PKR belongs to kernel

**Total: ~85 tests**

---

## 4. ReaderWriterSet Tests

**File**: `reader-writer-set.mycelia.js`  
**Test File**: `ReaderWriterSetTest.jsx`

### Categories:

#### 4.1 Constructor (4 tests)
- Constructor - throws error for missing pkr
- Constructor - throws error for missing principals
- Constructor - initializes with empty sets
- Constructor - generates UUID

#### 4.2 Reader Management (8 tests)
- addReader - returns false for invalid granter
- addReader - returns false for invalid grantee
- addReader - returns false if granter cannot grant
- addReader - adds reader successfully
- addReader - prevents duplicate readers
- removeReader - returns false for invalid inputs
- removeReader - removes reader successfully
- removeReader - returns false if not a reader

#### 4.3 Writer Management (8 tests)
- addWriter - returns false for invalid granter
- addWriter - returns false for invalid grantee
- addWriter - returns false if granter cannot grant
- addWriter - adds writer successfully
- addWriter - prevents duplicate writers
- removeWriter - returns false for invalid inputs
- removeWriter - removes writer successfully
- removeWriter - returns false if not a writer

#### 4.4 Promotion/Demotion (6 tests)
- promote - moves reader to writer
- promote - returns false for invalid inputs
- promote - returns false if not a reader
- demote - moves writer to reader
- demote - returns false for invalid inputs
- demote - returns false if not a writer

#### 4.5 Access Checks (12 tests)
- isOwner - returns true for owner PKR
- isOwner - returns false for non-owner
- isOwner - returns false for invalid PKR
- canRead - returns true for kernel
- canRead - returns true for owner
- canRead - returns true for readers
- canRead - returns true for writers
- canRead - returns false for others
- canWrite - returns true for kernel
- canWrite - returns true for owner
- canWrite - returns true for writers
- canWrite - returns false for readers/others

#### 4.6 Grant Permissions (4 tests)
- canGrant - returns true for kernel
- canGrant - returns true for owner
- canGrant - returns false for others
- canGrant - returns false for invalid PKR

#### 4.7 Introspection (6 tests)
- hasReader - checks if PKR is a reader
- hasWriter - checks if PKR is a writer
- readerCount - returns correct count
- writerCount - returns correct count
- isKernel - delegates to principals registry
- clear - removes all readers and writers

#### 4.8 Cloning (3 tests)
- clone - creates independent copy
- clone - preserves readers and writers
- clone - shares same PKR and principals

#### 4.9 Serialization (3 tests)
- toRecord - returns correct structure
- toString - returns formatted string
- UUID - is accessible via toRecord

**Total: ~54 tests**

---

## 5. createIdentity Tests

**File**: `create-identity.mycelia.js`  
**Test File**: `CreateIdentityTest.jsx`

### Categories:

#### 5.1 Validation (6 tests)
- createIdentity - throws error for invalid principals
- createIdentity - throws error for invalid PKR
- createIdentity - throws error for missing kernel
- createIdentity - throws error for kernel without sendProtected
- createIdentity - validates PKR via resolvePKR
- createIdentity - creates RWS via principals

#### 5.2 Return Value Structure (8 tests)
- createIdentity - returns object with pkr
- createIdentity - returns canRead function
- createIdentity - returns canWrite function
- createIdentity - returns canGrant function
- createIdentity - returns requireRead wrapper
- createIdentity - returns requireWrite wrapper
- createIdentity - returns requireGrant wrapper
- createIdentity - returns requireAuth wrapper

#### 5.3 Permission Queries (6 tests)
- canRead - delegates to RWS.canRead
- canWrite - delegates to RWS.canWrite
- canGrant - delegates to RWS.canGrant
- canRead - works with owner PKR
- canWrite - works with owner PKR
- canGrant - works with owner PKR

#### 5.4 Permission Wrappers (9 tests)
- requireRead - throws error if cannot read
- requireRead - executes function if can read
- requireWrite - throws error if cannot write
- requireWrite - executes function if can write
- requireGrant - throws error if cannot grant
- requireGrant - executes function if can grant
- requireAuth - throws error for invalid type
- requireAuth - throws error for non-function handler
- requireAuth - works with all permission types

#### 5.5 Grant/Revoke Helpers (8 tests)
- grantReader - delegates to RWS.addReader
- grantWriter - delegates to RWS.addWriter
- revokeReader - delegates to RWS.removeReader
- revokeWriter - delegates to RWS.removeWriter
- promote - delegates to RWS.promote
- demote - delegates to RWS.demote
- grantReader - requires grant permission
- grantWriter - requires grant permission

#### 5.6 Protected Messaging (4 tests)
- sendProtected - calls kernel.sendProtected
- sendProtected - passes owner PKR
- sendProtected - passes message
- sendProtected - passes options

**Total: ~41 tests**

---

## 6. createFriendIdentity Tests

**File**: `create-friend-identity.mycelia.js`  
**Test File**: `CreateFriendIdentityTest.jsx`

### Categories:

#### 6.1 Validation (6 tests)
- createFriendIdentity - throws error for invalid PKR
- createFriendIdentity - throws error for unknown PKR
- createFriendIdentity - throws error for missing kernel
- createFriendIdentity - throws error for kernel without sendProtected
- createFriendIdentity - throws error for non-friend principal
- createFriendIdentity - validates PKR via resolvePKR

#### 6.2 Principal Kind Check (4 tests)
- createFriendIdentity - throws error for kernel principal
- createFriendIdentity - throws error for topLevel principal
- createFriendIdentity - throws error for resource principal
- createFriendIdentity - accepts friend principal

#### 6.3 Identity Creation (3 tests)
- createFriendIdentity - calls createIdentity
- createFriendIdentity - returns identity wrapper
- createFriendIdentity - includes all identity methods

**Total: ~13 tests**

---

## 7. Friend Tests

**File**: `friend.mycelia.js`  
**Test File**: `FriendTest.jsx`

### Categories:

#### 7.1 Constructor (4 tests)
- Constructor - accepts name and endpoint
- Constructor - initializes with default values
- Constructor - sets connected to false
- Constructor - sets lastSeen to null

#### 7.2 Getters (7 tests)
- get kind - returns PRINCIPAL_KINDS.FRIEND
- get isFriend - returns true
- get name - returns name
- get endpoint - returns endpoint
- get metadata - returns metadata
- get sessionKey - returns sessionKey
- get connected - returns connection status

#### 7.3 Connection Management (5 tests)
- connect - sets connected to true
- connect - updates lastSeen timestamp
- disconnect - sets connected to false
- disconnect - does not clear lastSeen
- connect - can be called multiple times

#### 7.4 Protected Messaging (5 tests)
- sendProtected - throws error if not connected
- sendProtected - throws error for missing MessageSystem
- sendProtected - calls MessageSystem.sendProtected
- sendProtected - passes friend instance
- sendProtected - passes message

#### 7.5 Serialization (3 tests)
- getNameString - returns formatted string
- toRecord - returns correct structure
- toString - returns formatted string

**Total: ~24 tests**

---

## 8. Resource Tests

**File**: `resource.mycelia.js`  
**Test File**: `ResourceTest.jsx`

### Categories:

#### 8.1 Constructor (4 tests)
- Constructor - accepts name and metadata
- Constructor - initializes with default values
- Constructor - sets createdAt timestamp
- Constructor - accepts optional owner

#### 8.2 Getters (6 tests)
- get kind - returns PRINCIPAL_KINDS.RESOURCE
- get isResource - returns true
- get name - returns name
- get metadata - returns metadata
- get createdAt - returns Date object
- get owner - returns owner or null

#### 8.3 Name String (4 tests)
- getNameString - returns simple format without owner
- getNameString - includes owner prefix
- getNameString - handles owner without getNameString
- getNameString - handles trailing slashes

#### 8.4 Serialization (3 tests)
- toRecord - returns correct structure
- toRecord - includes owner UUID
- toString - returns formatted string

**Total: ~17 tests**

---

## 9. usePrincipals Hook Tests

**File**: `use-principals.mycelia.js`  
**Test File**: `UsePrincipalsTest.jsx`

### Categories:

#### 9.1 Hook Configuration (4 tests)
- usePrincipals - has correct kind
- usePrincipals - has correct overwrite setting
- usePrincipals - has correct required dependencies
- usePrincipals - has correct attach setting

#### 9.2 Validation (3 tests)
- usePrincipals - throws error for missing kernel
- usePrincipals - throws error for undefined kernel
- usePrincipals - accepts valid kernel in config

#### 9.3 Registry Creation (3 tests)
- usePrincipals - creates PrincipalRegistry instance
- usePrincipals - passes kernel to registry
- usePrincipals - exposes registry property

#### 9.4 Exposed Methods (12 tests)
- mint - delegates to registry.mint
- createPrincipal - delegates to registry.createPrincipal
- resolvePKR - delegates to registry.resolvePKR
- createRWS - delegates to registry.createRWS
- createIdentity - delegates to registry.createIdentity
- createFriendIdentity - delegates to registry.createFriendIdentity
- isKernel - delegates to registry.isKernel
- get - delegates to registry.get
- has - delegates to registry.has
- refreshPrincipal - delegates to registry.refreshPrincipal
- registry - returns PrincipalRegistry instance
- All methods - are callable from facet

#### 9.5 Integration (5 tests)
- usePrincipals - works with BaseSubsystem
- usePrincipals - facet is accessible via find
- usePrincipals - can create principals via facet
- usePrincipals - can resolve PKRs via facet
- usePrincipals - can create identities via facet

**Total: ~27 tests**

---

## Summary

| File | Test File | Categories | Estimated Tests |
|------|-----------|------------|-----------------|
| PKR | PKRTest.jsx | 6 | ~39 |
| Principal | PrincipalTest.jsx | 7 | ~37 |
| PrincipalRegistry | PrincipalRegistryTest.jsx | 12 | ~85 |
| ReaderWriterSet | ReaderWriterSetTest.jsx | 9 | ~54 |
| createIdentity | CreateIdentityTest.jsx | 6 | ~41 |
| createFriendIdentity | CreateFriendIdentityTest.jsx | 3 | ~13 |
| Friend | FriendTest.jsx | 5 | ~24 |
| Resource | ResourceTest.jsx | 4 | ~17 |
| usePrincipals | UsePrincipalsTest.jsx | 5 | ~27 |

**Total: 9 test files, ~337 test cases**

---

## Test File Organization

Each test file will follow the same structure as existing test files:
- React component with state management
- Test case definitions with categories
- Individual test functions
- "Run All Tests" and "Clear Results" buttons
- Visual indicators for test status
- Expandable test details

## Integration Considerations

Some tests will require:
- Mock PrincipalRegistry instances
- Mock kernel objects with sendProtected
- Mock MessageSystem instances
- Time manipulation for expiration tests
- Symbol generation for key testing







