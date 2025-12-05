import { describe, it, expect } from 'vitest';
import {
  routerContract,
  queueContract,
  processorContract,
  listenersContract,
  hierarchyContract,
  schedulerContract,
  serverContract,
} from '../index.js';

const ctx = {};
const api = {};
const subsystem = {};

describe('facet contracts', () => {
  it('enforces router contract requirements', () => {
    const routerFacet = {
      registerRoute() {},
      match() {},
      route() {},
      unregisterRoute() {},
      hasRoute() {},
      getRoutes() {},
      _routeRegistry: {},
    };
    expect(() => routerContract.enforce(ctx, api, subsystem, routerFacet)).not.toThrow();
    routerFacet._routeRegistry = null;
    expect(() => routerContract.enforce(ctx, api, subsystem, routerFacet)).toThrow(/_routeRegistry/);
  });

  it('enforces queue contract requirements', () => {
    const queueFacet = {
      selectNextMessage() {},
      hasMessagesToProcess() {},
      getQueueStatus() {},
      _queueManager: { enqueue() {} },
      queue: {},
    };
    expect(() => queueContract.enforce(ctx, api, subsystem, queueFacet)).not.toThrow();
    queueFacet._queueManager = {};
    expect(() => queueContract.enforce(ctx, api, subsystem, queueFacet)).toThrow(/enqueue/);
  });

  it('enforces processor contract requirements', () => {
    const processorFacet = {
      accept() {},
      processMessage() {},
      processTick() {},
      processImmediately() {},
    };
    expect(() => processorContract.enforce(ctx, api, subsystem, processorFacet)).not.toThrow();
    delete processorFacet.accept;
    expect(() => processorContract.enforce(ctx, api, subsystem, processorFacet)).toThrow(/missing required methods/);
  });

  it('enforces listeners contract requirements', () => {
    const listenersFacet = {
      on() {},
      off() {},
      hasListeners() { return false; },
      enableListeners() {},
      disableListeners() {},
      get listeners() { return {}; },
      _listenerManager: () => ({}),
    };
    expect(() => listenersContract.enforce(ctx, api, subsystem, listenersFacet)).not.toThrow();
    listenersFacet._listenerManager = () => null;
    expect(() => listenersContract.enforce(ctx, api, subsystem, listenersFacet)).not.toThrow();
    listenersFacet._listenerManager = 'bad';
    expect(() => listenersContract.enforce(ctx, api, subsystem, listenersFacet)).toThrow(/_listenerManager/);
  });

  it('enforces hierarchy contract requirements', () => {
    const hierarchyFacet = {
      addChild() {},
      removeChild() {},
      getChild() {},
      listChildren() {},
      setParent() {},
      getParent() {},
      isRoot() { return true; },
      getRoot() { return this; },
      getLineage() { return []; },
      children: {},
    };
    expect(() => hierarchyContract.enforce(ctx, api, subsystem, hierarchyFacet)).not.toThrow();
    hierarchyFacet.children = null;
    expect(() => hierarchyContract.enforce(ctx, api, subsystem, hierarchyFacet)).toThrow(/children/);
  });

  it('enforces scheduler contract requirements', () => {
    const schedulerFacet = {
      process() {},
      pauseProcessing() {},
      resumeProcessing() {},
      isPaused() { return false; },
      isProcessing() { return true; },
      getPriority() { return 1; },
      setPriority() {},
      configureScheduler() {},
      getScheduler() {},
      _scheduler: {},
    };
    expect(() => schedulerContract.enforce(ctx, api, subsystem, schedulerFacet)).not.toThrow();
    schedulerFacet._scheduler = null;
    expect(() => schedulerContract.enforce(ctx, api, subsystem, schedulerFacet)).toThrow(/_scheduler/);
  });

  it('enforces server contract requirements', () => {
    const serverFacet = {
      // lifecycle
      start() {},
      stop() {},
      isRunning() { return true; },
      // single routes
      get() {},
      post() {},
      put() {},
      patch() {},
      delete() {},
      all() {},
      // batch
      registerRoutes() {},
      registerMyceliaRoutes() {},
      // middleware
      use() {},
      useRoute() {},
      // errors
      setErrorHandler() {},
      // info
      getAddress() {},
      getPort() {},
      // integration
      registerMyceliaRoute() {},
      registerMyceliaCommand() {},
      registerMyceliaQuery() {},
      _server: {},
      _isRunning: true,
    };
    expect(() => serverContract.enforce(ctx, api, subsystem, serverFacet)).not.toThrow();
    serverFacet._isRunning = 'nope';
    expect(() => serverContract.enforce(ctx, api, subsystem, serverFacet)).toThrow(/_isRunning/);
  });
});

