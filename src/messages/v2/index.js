/**
 * BaseSubsystem v2 - Composable Subsystem Architecture
 * 
 * Export all hooks and the base class for easy importing.
 */

// Core classes
export { BaseSubsystem } from './models/base-subsystem/base.subsystem.mycelia.js';
export { StandalonePluginSystem } from './models/standalone-plugin-system/standalone-plugin-system.mycelia.js';
export { MessageSystem } from './models/message-system/message-system.v2.mycelia.js';
export { Message } from './models/message/message.mycelia.js';

// Kernel subsystems
export { KernelSubsystem } from './models/kernel-subsystem/kernel.subsystem.mycelia.js';
export { ProfileRegistrySubsystem } from './models/kernel-subsystem/profile-registry-subsystem/profile-registry.subsystem.mycelia.js';
export { AccessControlSubsystem } from './models/kernel-subsystem/access-control-subsystem/access-control.subsystem.mycelia.js';

// Security models
export { SecurityProfile } from './models/security/security-profile.mycelia.js';
export { Principal } from './models/security/principal.mycelia.js';

// Hooks
export { useStatistics } from './hooks/statistics/use-statistics.mycelia.js';
export { useQueue } from './hooks/queue/use-queue.mycelia.js';
export { useScheduler } from './hooks/scheduler/use-scheduler.mycelia.js';
export { useGlobalScheduler } from './hooks/global-scheduler/use-global-scheduler.mycelia.js';
export { useListeners } from './hooks/listeners/use-listeners.mycelia.js';
export { useRouter } from './hooks/router/use-router.mycelia.js';
export { useRouterWithScopes } from './hooks/router/use-router-with-scopes.mycelia.js';
export { useMessageSystemRouter } from './hooks/message-system-router/use-message-system-router.mycelia.js';
export { useMessageSystemRegistry } from './hooks/message-system-registry/use-message-system-registry.mycelia.js';
export { useMessageProcessor } from './hooks/message-processor/use-message-processor.mycelia.js';
export { useMessages } from './hooks/messages/use-messages.mycelia.js';
export { useResponses } from './hooks/responses/use-responses.mycelia.js';
export { useChannels } from './hooks/channels/use-channels.mycelia.js';
export { useHierarchy } from './hooks/hierarchy/use-hierarchy.mycelia.js';
export { useRequests } from './hooks/requests/use-requests.mycelia.js';
export { useQueries } from './hooks/queries/use-queries.mycelia.js';
export { useSynchronous } from './hooks/synchronous/use-synchronous.mycelia.js';
export { ChildSubsystemRegistry } from './hooks/hierarchy/child-subsystem-registry.mycelia.js';
export { DefaultHooks, createCanonicalDefaultHooks, createSynchronousDefaultHooks, FACET_KINDS } from './models/defaults/default-hooks.mycelia.js';
export { useHealthCheck } from './hooks/health/use-health-check.mycelia.js';
export { useProfiler } from './hooks/profiler/use-profiler.mycelia.js';
export { useMemoryStorage } from './hooks/storage/memory/use-memory-storage.mycelia.js';
export { useSQLiteStorage } from './hooks/storage/sqlite/use-sqlite-storage.mycelia.js';
export { useIndexedDBStorage } from './hooks/storage/indexeddb/use-indexeddb-storage.mycelia.js';
export { usePrismaStorage } from './hooks/storage/prisma/use-prisma-storage.mycelia.js';
export { usePrisma } from './hooks/prisma/use-prisma.mycelia.js';
export { DBSubsystem } from './models/subsystem/db/db.subsystem.mycelia.js';
export { useDBStorage } from './hooks/db/use-db-storage.mycelia.js';
export { AuthSubsystem } from './models/subsystem/auth/auth.subsystem.mycelia.js';
export { useAuthStorage } from './hooks/auth/use-auth-storage.mycelia.js';
export { usePrismaAuthStorage } from './hooks/auth/use-prisma-auth-storage.mycelia.js';
export { usePasswordManager } from './hooks/auth/use-password-manager.mycelia.js';
export { useTokenManager } from './hooks/auth/use-token-manager.mycelia.js';
export { useSessionManager } from './hooks/auth/use-session-manager.mycelia.js';
export { useAuthStrategies } from './hooks/auth/use-auth-strategies.mycelia.js';
export { useExpressServer } from './hooks/server/express/use-express-server.mycelia.js';
export { useFastifyServer } from './hooks/server/fastify/use-fastify-server.mycelia.js';
export { useHonoServer } from './hooks/server/hono/use-hono-server.mycelia.js';

// Utilities
export { collectChildren, buildChildren, disposeChildren } from './models/base-subsystem/base-subsystem.utils.mycelia.js';
export { loadConfig, validateConfig, getDefaultConfig } from './utils/config-loader.mycelia.js';
export { bootstrapFromConfig } from './utils/bootstrap-from-config.mycelia.js';
export {
  createMockPkr,
  createMockPkrs,
  createTestMessage,
  createImmediateMessage,
  createTestMessageSystem,
  createTestSubsystem,
  extractHandlerResult,
  processMessageImmediately,
  createTestUser,
  waitFor,
  createMockSubsystem,
  cleanupTestResources,
  PRINCIPAL_KINDS,
  // Result assertion helpers
  expectSuccess,
  expectFailure,
  extractData,
  expectData,
  extractId,
  extractError,
  // Permission testing helpers
  expectPermissionDenied,
  expectAccessGranted,
  expectScopeRequired
} from './utils/test-utils.mycelia.js';

// Router Security Utilities
export { 
  createGetUserRole, 
  createScopeMapper, 
  getRolePermissionForScope 
} from './utils/router-security-utils.mycelia.js';

