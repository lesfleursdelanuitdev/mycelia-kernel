import { describe, it, expect } from 'vitest';
import {
  defaultContractRegistry,
  routerContract,
  queueContract,
  processorContract,
  listenersContract,
  hierarchyContract,
  schedulerContract,
  serverContract,
} from '../index.js';

describe('facet-contract index', () => {
  it('exports default registry with all contracts', () => {
    const names = defaultContractRegistry.list().sort();
    expect(names).toEqual(
      expect.arrayContaining([
        'router',
        'queue',
        'processor',
        'listeners',
        'hierarchy',
        'scheduler',
        'server',
      ]),
    );
    expect(defaultContractRegistry.has('router')).toBe(true);
  });

  it('exposes individual contract instances', () => {
    expect(routerContract.name).toBe('router');
    expect(queueContract.name).toBe('queue');
    expect(processorContract.name).toBe('processor');
    expect(listenersContract.name).toBe('listeners');
    expect(hierarchyContract.name).toBe('hierarchy');
    expect(schedulerContract.name).toBe('scheduler');
    expect(serverContract.name).toBe('server');
  });
});

