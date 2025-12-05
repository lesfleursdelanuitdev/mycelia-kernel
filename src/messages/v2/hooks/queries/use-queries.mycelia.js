// src/hooks/queries/use-queries.mycelia.js

import { createHook } from '../create-hook.mycelia.js';
import { Facet } from '../../models/facet-manager/facet.mycelia.js';
import { QueryHandlerManager } from './QueryHandlerManager.mycelia.js';

export const useQueries = createHook({
  kind: 'queries',
  version: '1.0.0',
  overwrite: false,
  required: ['router', 'requests'], // needs router for handlers, requests for ask()
  attach: true,
  source: import.meta.url,
  contract: null, // optional: you can define a 'queries' contract later
  fn: (ctx, api, subsystem) => {
    const { name } = api;
    // Use subsystem.find() to access required facets
    const routerFacet = subsystem.find('router');
    const requestsFacet = subsystem.find('requests');

    if (!routerFacet) {
      throw new Error('useQueries: router facet is required');
    }

    if (!requestsFacet) {
      throw new Error('useQueries: requests facet is required');
    }

    const debug = ctx.debug || subsystem.debug || false;

    const qhm = new QueryHandlerManager({
      router: routerFacet,
      name,
      debug
    });

    /**
     * Utility: resolve a "name or path" into:
     * - local route: `query/<name>`
     * - or pass through if it looks like a full path / explicit path
     */
    function resolveQueryPath(nameOrPath) {
      if (!nameOrPath) {
        throw new Error('queries.ask: nameOrPath is required');
      }

      // Heuristic: if it contains '://' or '/', assume it's already a path.
      // Otherwise treat it as a short name.
      if (nameOrPath.includes('://') || nameOrPath.includes('/')) {
        return nameOrPath;
      }

      return `query/${nameOrPath}`;
    }

    const facet = new Facet('queries', {
      attach: true,
      source: import.meta.url
    }).add({
      /**
       * Register a query on a specific path.
       *
       * @param {string} path - Route path (local or absolute, depending on router)
       * @param {Function} handler - (message, params, routeOptions) => any
       * @param {Object} [options]
       */
      registerRoute(path, handler, options = {}) {
        return qhm.registerRoute(path, handler, options);
      },

      /**
       * Register a named query using conventional path: `query/<name>`
       * (or override with options.path).
       *
       * @param {string} name - Logical query name
       * @param {Function} handler - (message, params, routeOptions) => any
       * @param {Object} [options]
       */
      register(name, handler, options = {}) {
        return qhm.registerNamedQuery(name, handler, options);
      },

      /**
       * Perform a query as a one-shot request.
       *
       * @param {string} nameOrPath - logical name ("getBoard") or explicit path
       * @param {any} [payload] - body for the message
       * @param {Object} [options] - forwarded to RequestBuilder.with(options)
       *
       * Options **do not** set meta; replyTo / responseRequired stay in send options,
       * consistent with your frozen meta design.
       */
      async ask(nameOrPath, payload, options = {}) {
        const path = resolveQueryPath(nameOrPath);

        // Let the messages facet (if present) build messages;
        // fall back to constructing manually if needed.
        const messagesFacet = subsystem.find?.('messages');
        const msg = messagesFacet
          ? messagesFacet.create(path, payload)
          : { path, body: payload, meta: {} }; // minimal shape; your real Message class will be used in practice

        // Delegate to the RequestBuilder from useRequests
        return await requestsFacet
          .oneShot()
          .with(options)
          .forMessage(msg)
          .send();
      }
    });

    return facet;
  }
});
