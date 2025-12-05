import { useState } from 'react';
import { DefaultHooksTest } from './DefaultHooksTest.jsx';
import { UseHierarchyTest } from './UseHierarchyTest.jsx';
import { UseListenersTest } from './UseListenersTest.jsx';
import { UseStatisticsTest } from './UseStatisticsTest.jsx';
import { UseRouterTest } from './UseRouterTest.jsx';
import { UseQueueTest } from './UseQueueTest.jsx';
import { UseMessageProcessorTest } from './UseMessageProcessorTest.jsx';
import { UseQueriesTest } from './UseQueriesTest.jsx';
import { UseSchedulerTest } from './UseSchedulerTest.jsx';
import { UseSynchronousTest } from './UseSynchronousTest.jsx';
import { FacetTest } from './FacetTest.jsx';
import { FacetManagerTest } from './FacetManagerTest.jsx';
import { FacetManagerTransactionTest } from './FacetManagerTransactionTest.jsx';
import { FacetManagerParallelInitTest } from './FacetManagerParallelInitTest.jsx';
import { DependencyGraphCacheTest } from './DependencyGraphCacheTest.jsx';
import { SubsystemBuilderUtilsVerificationContextTest } from './SubsystemBuilderUtilsVerificationContextTest.jsx';
import { SubsystemBuilderUtilsVerificationFacetsTest } from './SubsystemBuilderUtilsVerificationFacetsTest.jsx';
import { SubsystemBuilderUtilsVerificationDependenciesTest } from './SubsystemBuilderUtilsVerificationDependenciesTest.jsx';
import { SubsystemBuilderUtilsBuildPlanTest } from './SubsystemBuilderUtilsBuildPlanTest.jsx';
import { SubsystemBuilderUtilsBuildFacetsTest } from './SubsystemBuilderUtilsBuildFacetsTest.jsx';
import { SubsystemBuilderUtilsBuildTransactionsTest } from './SubsystemBuilderUtilsBuildTransactionsTest.jsx';
import { SubsystemBuilderUtilsBuildChildrenTest } from './SubsystemBuilderUtilsBuildChildrenTest.jsx';
import { SubsystemBuilderConstructorTest } from './SubsystemBuilderConstructorTest.jsx';
import { SubsystemBuilderContextManagementTest } from './SubsystemBuilderContextManagementTest.jsx';
import { SubsystemBuilderPlanManagementTest } from './SubsystemBuilderPlanManagementTest.jsx';
import { SubsystemBuilderBuildExecutionTest } from './SubsystemBuilderBuildExecutionTest.jsx';
import { SubsystemBuilderGraphCacheIntegrationTest } from './SubsystemBuilderGraphCacheIntegrationTest.jsx';
import { SubsystemBuilderIntegrationTest } from './SubsystemBuilderIntegrationTest.jsx';
import { SubsystemBuilderErrorHandlingTest } from './SubsystemBuilderErrorHandlingTest.jsx';
import { SubsystemBuilderEdgeCasesTest } from './SubsystemBuilderEdgeCasesTest.jsx';
import { BaseSubsystemConstructorTest } from './BaseSubsystemConstructorTest.jsx';
import { BaseSubsystemHierarchyTest } from './BaseSubsystemHierarchyTest.jsx';
import { BaseSubsystemStateTest } from './BaseSubsystemStateTest.jsx';
import { BaseSubsystemHookRegistrationTest } from './BaseSubsystemHookRegistrationTest.jsx';
import { BaseSubsystemBuildLifecycleTest } from './BaseSubsystemBuildLifecycleTest.jsx';
import { BaseSubsystemDisposeLifecycleTest } from './BaseSubsystemDisposeLifecycleTest.jsx';
import { BaseSubsystemMessageFlowTest } from './BaseSubsystemMessageFlowTest.jsx';
import { BaseSubsystemRoutingTest } from './BaseSubsystemRoutingTest.jsx';
import { BaseSubsystemFacetAccessTest } from './BaseSubsystemFacetAccessTest.jsx';
import { BaseSubsystemIntegrationTest } from './BaseSubsystemIntegrationTest.jsx';
import { StandalonePluginSystemConstructorTest } from './StandalonePluginSystemConstructorTest.jsx';
import { StandalonePluginSystemMessageFlowNoOpTest } from './StandalonePluginSystemMessageFlowNoOpTest.jsx';
import { StandalonePluginSystemRoutingNoOpTest } from './StandalonePluginSystemRoutingNoOpTest.jsx';
import { StandalonePluginSystemInheritedMethodsTest } from './StandalonePluginSystemInheritedMethodsTest.jsx';
import { StandalonePluginSystemDefaultHooksTest } from './StandalonePluginSystemDefaultHooksTest.jsx';
import { StandalonePluginSystemIntegrationTest } from './StandalonePluginSystemIntegrationTest.jsx';
import { StandalonePluginSystemNoOpBehaviorTest } from './StandalonePluginSystemNoOpBehaviorTest.jsx';
import { StandalonePluginSystemEdgeCasesTest } from './StandalonePluginSystemEdgeCasesTest.jsx';
import { PKRTest } from './PKRTest.jsx';
import { PrincipalTest } from './PrincipalTest.jsx';
import { FriendTest } from './FriendTest.jsx';
import { ResourceTest } from './ResourceTest.jsx';
import { ReaderWriterSetTest } from './ReaderWriterSetTest.jsx';
import { CreateIdentityTest } from './CreateIdentityTest.jsx';
import { CreateFriendIdentityTest } from './CreateFriendIdentityTest.jsx';
import { PrincipalRegistryTest } from './PrincipalRegistryTest.jsx';
import { UsePrincipalsTest } from './UsePrincipalsTest.jsx';
import { FacetContractTest } from './FacetContractTest.jsx';
import { FacetContractRegistryTest } from './FacetContractRegistryTest.jsx';
import { RouterContractTest } from './RouterContractTest.jsx';
import { ProcessorContractTest } from './ProcessorContractTest.jsx';
import { QueueContractTest } from './QueueContractTest.jsx';
import { ListenersContractTest } from './ListenersContractTest.jsx';
import { HierarchyContractTest } from './HierarchyContractTest.jsx';
import { SchedulerContractTest } from './SchedulerContractTest.jsx';
import { FacetContractIndexTest } from './FacetContractIndexTest.jsx';
import { ValidateFacetsIntegrationTest } from './ValidateFacetsIntegrationTest.jsx';
import { VerifySubsystemBuildIntegrationTest } from './VerifySubsystemBuildIntegrationTest.jsx';

/**
 * V2TestPage - Test page for v2 message system components
 */
export function V2TestPage() {
  const [activeTest, setActiveTest] = useState('default-hooks');
  const [menuOpen, setMenuOpen] = useState(true);

  const testItems = [
    { id: 'default-hooks', label: 'DefaultHooks Tests' },
    { id: 'use-hierarchy', label: 'useHierarchy Tests' },
    { id: 'use-listeners', label: 'useListeners Tests' },
    { id: 'use-statistics', label: 'useStatistics Tests' },
    { id: 'use-router', label: 'useRouter Tests' },
    { id: 'use-queue', label: 'useQueue Tests' },
    { id: 'use-message-processor', label: 'useMessageProcessor Tests' },
    { id: 'use-queries', label: 'useQueries Tests' },
    { id: 'use-scheduler', label: 'useScheduler Tests' },
            { id: 'use-synchronous', label: 'useSynchronous Tests' },
            { id: 'facet', label: 'Facet Tests' },
            { id: 'facet-manager', label: 'FacetManager Tests' },
            { id: 'facet-manager-transaction', label: 'FacetManagerTransaction Tests' },
            { id: 'facet-manager-parallel-init', label: 'FacetManager: Parallel Initialization' },
            { id: 'dependency-graph-cache', label: 'DependencyGraphCache Tests' },
            { id: 'verification-context', label: 'Verification: Context & Hooks' },
            { id: 'verification-facets', label: 'Verification: Facets' },
            { id: 'verification-dependencies', label: 'Verification: Dependencies' },
            { id: 'build-plan', label: 'Build: Plan & Context' },
            { id: 'build-facets', label: 'Build: Facets' },
            { id: 'build-transactions', label: 'Build: Transactions' },
            { id: 'build-children', label: 'Build: Children' },
            { id: 'builder-constructor', label: 'Builder: Constructor' },
            { id: 'builder-context', label: 'Builder: Context Management' },
            { id: 'builder-plan', label: 'Builder: Plan Management' },
            { id: 'builder-build', label: 'Builder: Build Execution' },
            { id: 'builder-graphcache', label: 'Builder: GraphCache Integration' },
            { id: 'builder-integration', label: 'Builder: Integration' },
            { id: 'builder-errors', label: 'Builder: Error Handling' },
            { id: 'builder-edgecases', label: 'Builder: Edge Cases' },
            { id: 'base-constructor', label: 'BaseSubsystem: Constructor' },
            { id: 'base-hierarchy', label: 'BaseSubsystem: Hierarchy' },
            { id: 'base-state', label: 'BaseSubsystem: State' },
            { id: 'base-hooks', label: 'BaseSubsystem: Hook Registration' },
            { id: 'base-build', label: 'BaseSubsystem: Build Lifecycle' },
            { id: 'base-dispose', label: 'BaseSubsystem: Dispose Lifecycle' },
            { id: 'base-messageflow', label: 'BaseSubsystem: Message Flow' },
            { id: 'base-routing', label: 'BaseSubsystem: Routing' },
            { id: 'base-facets', label: 'BaseSubsystem: Facet Access' },
            { id: 'base-integration', label: 'BaseSubsystem: Integration' },
            { id: 'standalone-constructor', label: 'StandalonePluginSystem: Constructor' },
            { id: 'standalone-messageflow', label: 'StandalonePluginSystem: Message Flow No-Op' },
            { id: 'standalone-routing', label: 'StandalonePluginSystem: Routing No-Op' },
            { id: 'standalone-inherited', label: 'StandalonePluginSystem: Inherited Methods' },
            { id: 'standalone-defaults', label: 'StandalonePluginSystem: Default Hooks' },
            { id: 'standalone-integration', label: 'StandalonePluginSystem: Integration' },
            { id: 'standalone-noop', label: 'StandalonePluginSystem: No-Op Behavior' },
            { id: 'standalone-edgecases', label: 'StandalonePluginSystem: Edge Cases' },
            { id: 'pkr', label: 'Security: PKR (Public Key Record)' },
            { id: 'principal', label: 'Security: Principal' },
            { id: 'friend', label: 'Security: Friend' },
            { id: 'resource', label: 'Security: Resource' },
            { id: 'reader-writer-set', label: 'Security: ReaderWriterSet' },
            { id: 'create-identity', label: 'Security: createIdentity' },
            { id: 'create-friend-identity', label: 'Security: createFriendIdentity' },
            { id: 'principal-registry', label: 'Security: PrincipalRegistry' },
            { id: 'use-principals', label: 'Security: usePrincipals Hook' },
            { id: 'facet-contract', label: 'Facet Contract: FacetContract Class' },
            { id: 'facet-contract-registry', label: 'Facet Contract: FacetContractRegistry' },
            { id: 'router-contract', label: 'Facet Contract: Router Contract' },
            { id: 'processor-contract', label: 'Facet Contract: Processor Contract' },
            { id: 'queue-contract', label: 'Facet Contract: Queue Contract' },
            { id: 'listeners-contract', label: 'Facet Contract: Listeners Contract' },
            { id: 'hierarchy-contract', label: 'Facet Contract: Hierarchy Contract' },
            { id: 'scheduler-contract', label: 'Facet Contract: Scheduler Contract' },
            { id: 'facet-contract-index', label: 'Facet Contract: Default Registry & Exports' },
            { id: 'validate-facets-integration', label: 'Facet Contract: validateFacets Integration' },
            { id: 'verify-build-integration', label: 'Facet Contract: verifySubsystemBuild Integration' },
          ];

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ backgroundColor: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', borderBottom: '1px solid #e5e7eb', zIndex: 10 }}>
        <div style={{ padding: '16px 24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            style={{
              padding: '8px',
              backgroundColor: 'transparent',
              border: '1px solid #e5e7eb',
              borderRadius: '4px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '36px',
              height: '36px'
            }}
            title={menuOpen ? 'Close menu' : 'Open menu'}
          >
            <span style={{ fontSize: '18px' }}>{menuOpen ? '☰' : '☰'}</span>
          </button>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827', margin: 0 }}>Message System v2 Tests</h1>
            <p style={{ color: '#4b5563', marginTop: '4px', margin: 0, fontSize: '14px' }}>Test v2 subsystem architecture, hooks, and facets</p>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Sidebar Menu */}
        <div
          style={{
            width: menuOpen ? '280px' : '0',
            backgroundColor: 'white',
            borderRight: '1px solid #e5e7eb',
            transition: 'width 0.3s ease',
            overflow: 'hidden',
            boxShadow: menuOpen ? '2px 0 4px rgba(0,0,0,0.05)' : 'none',
            zIndex: 5
          }}
        >
          <div style={{ padding: '16px', overflowY: 'auto', height: '100%' }}>
            <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {testItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTest(item.id);
                    // Auto-close menu on mobile after selection (optional)
                  }}
                  style={{
                    padding: '12px 16px',
                    textAlign: 'left',
                    backgroundColor: activeTest === item.id ? '#eff6ff' : 'transparent',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: activeTest === item.id ? '500' : '400',
                    color: activeTest === item.id ? '#2563eb' : '#4b5563',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                  onMouseOver={(e) => {
                    if (activeTest !== item.id) {
                      e.target.style.backgroundColor = '#f9fafb';
                      e.target.style.color = '#111827';
                    }
                  }}
                  onMouseOut={(e) => {
                    if (activeTest !== item.id) {
                      e.target.style.backgroundColor = 'transparent';
                      e.target.style.color = '#4b5563';
                    }
                  }}
                >
                  <span style={{ 
                    width: '6px', 
                    height: '6px', 
                    borderRadius: '50%', 
                    backgroundColor: activeTest === item.id ? '#2563eb' : 'transparent',
                    transition: 'background-color 0.2s'
                  }}></span>
                  {item.label}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Content Area */}
        <div style={{ flex: 1, overflow: 'auto', padding: '24px' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', minHeight: '100%' }}>
            <div style={{ padding: '24px' }}>
            {activeTest === 'default-hooks' && <DefaultHooksTest />}
            {activeTest === 'use-hierarchy' && <UseHierarchyTest />}
            {activeTest === 'use-listeners' && <UseListenersTest />}
            {activeTest === 'use-statistics' && <UseStatisticsTest />}
            {activeTest === 'use-router' && <UseRouterTest />}
            {activeTest === 'use-queue' && <UseQueueTest />}
            {activeTest === 'use-message-processor' && <UseMessageProcessorTest />}
            {activeTest === 'use-queries' && <UseQueriesTest />}
            {activeTest === 'use-scheduler' && <UseSchedulerTest />}
                      {activeTest === 'use-synchronous' && <UseSynchronousTest />}
                      {activeTest === 'facet' && <FacetTest />}
                      {activeTest === 'facet-manager' && <FacetManagerTest />}
                      {activeTest === 'facet-manager-transaction' && <FacetManagerTransactionTest />}
                      {activeTest === 'facet-manager-parallel-init' && <FacetManagerParallelInitTest />}
                      {activeTest === 'dependency-graph-cache' && <DependencyGraphCacheTest />}
                      {activeTest === 'verification-context' && <SubsystemBuilderUtilsVerificationContextTest />}
                      {activeTest === 'verification-facets' && <SubsystemBuilderUtilsVerificationFacetsTest />}
                      {activeTest === 'verification-dependencies' && <SubsystemBuilderUtilsVerificationDependenciesTest />}
                      {activeTest === 'build-plan' && <SubsystemBuilderUtilsBuildPlanTest />}
                      {activeTest === 'build-facets' && <SubsystemBuilderUtilsBuildFacetsTest />}
                      {activeTest === 'build-transactions' && <SubsystemBuilderUtilsBuildTransactionsTest />}
                      {activeTest === 'build-children' && <SubsystemBuilderUtilsBuildChildrenTest />}
                      {activeTest === 'builder-constructor' && <SubsystemBuilderConstructorTest />}
                      {activeTest === 'builder-context' && <SubsystemBuilderContextManagementTest />}
                      {activeTest === 'builder-plan' && <SubsystemBuilderPlanManagementTest />}
                      {activeTest === 'builder-build' && <SubsystemBuilderBuildExecutionTest />}
                      {activeTest === 'builder-graphcache' && <SubsystemBuilderGraphCacheIntegrationTest />}
                      {activeTest === 'builder-integration' && <SubsystemBuilderIntegrationTest />}
                      {activeTest === 'builder-errors' && <SubsystemBuilderErrorHandlingTest />}
                      {activeTest === 'builder-edgecases' && <SubsystemBuilderEdgeCasesTest />}
                      {activeTest === 'base-constructor' && <BaseSubsystemConstructorTest />}
                      {activeTest === 'base-hierarchy' && <BaseSubsystemHierarchyTest />}
                      {activeTest === 'base-state' && <BaseSubsystemStateTest />}
                      {activeTest === 'base-hooks' && <BaseSubsystemHookRegistrationTest />}
                      {activeTest === 'base-build' && <BaseSubsystemBuildLifecycleTest />}
                      {activeTest === 'base-dispose' && <BaseSubsystemDisposeLifecycleTest />}
                      {activeTest === 'base-messageflow' && <BaseSubsystemMessageFlowTest />}
                      {activeTest === 'base-routing' && <BaseSubsystemRoutingTest />}
                      {activeTest === 'base-facets' && <BaseSubsystemFacetAccessTest />}
                      {activeTest === 'base-integration' && <BaseSubsystemIntegrationTest />}
                      {activeTest === 'standalone-constructor' && <StandalonePluginSystemConstructorTest />}
                      {activeTest === 'standalone-messageflow' && <StandalonePluginSystemMessageFlowNoOpTest />}
                      {activeTest === 'standalone-routing' && <StandalonePluginSystemRoutingNoOpTest />}
                      {activeTest === 'standalone-inherited' && <StandalonePluginSystemInheritedMethodsTest />}
                      {activeTest === 'standalone-defaults' && <StandalonePluginSystemDefaultHooksTest />}
                      {activeTest === 'standalone-integration' && <StandalonePluginSystemIntegrationTest />}
                      {activeTest === 'standalone-noop' && <StandalonePluginSystemNoOpBehaviorTest />}
                      {activeTest === 'standalone-edgecases' && <StandalonePluginSystemEdgeCasesTest />}
                      {activeTest === 'pkr' && <PKRTest />}
                      {activeTest === 'principal' && <PrincipalTest />}
                      {activeTest === 'friend' && <FriendTest />}
                      {activeTest === 'resource' && <ResourceTest />}
                      {activeTest === 'reader-writer-set' && <ReaderWriterSetTest />}
                      {activeTest === 'create-identity' && <CreateIdentityTest />}
                      {activeTest === 'create-friend-identity' && <CreateFriendIdentityTest />}
                      {activeTest === 'principal-registry' && <PrincipalRegistryTest />}
                      {activeTest === 'use-principals' && <UsePrincipalsTest />}
                      {activeTest === 'facet-contract' && <FacetContractTest />}
                      {activeTest === 'facet-contract-registry' && <FacetContractRegistryTest />}
                      {activeTest === 'router-contract' && <RouterContractTest />}
                      {activeTest === 'processor-contract' && <ProcessorContractTest />}
                      {activeTest === 'queue-contract' && <QueueContractTest />}
                      {activeTest === 'listeners-contract' && <ListenersContractTest />}
                      {activeTest === 'hierarchy-contract' && <HierarchyContractTest />}
                      {activeTest === 'scheduler-contract' && <SchedulerContractTest />}
                      {activeTest === 'facet-contract-index' && <FacetContractIndexTest />}
                      {activeTest === 'validate-facets-integration' && <ValidateFacetsIntegrationTest />}
                      {activeTest === 'verify-build-integration' && <VerifySubsystemBuildIntegrationTest />}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        }

