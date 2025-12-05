/**
 * Request Core Implementation
 * 
 * Core logic for performing request/response operations.
 * Registers a temporary route, sends a message, and waits for a response.
 * 
 * One-shot request helper:
 * - Registers a temporary reply route for this message
 * - Sends the message via identity.sendProtected with { replyTo, responseRequired }
 * - Waits for the first reply, then:
 *   - unregisters the route
 *   - clears the timeout
 *   - resolves/rejects the promise
 * 
 * Assumptions:
 * - message.meta is frozen elsewhere; we DO NOT mutate it.
 * - reply semantics live in the send options only.
 * - message.getId() must return a valid id.
 */

/**
 * Perform a request/response operation
 * 
 * @param {BaseSubsystem} subsystem - Subsystem instance
 * @param {Function} handler - Handler function to process the response: async (responseMessage, params, options) => result
 * @param {Message} message - Message to send
 * @param {number|Object} [timeoutOrOptions] - Timeout in milliseconds or options object
 * @returns {Promise<any>} Result from the handler function
 * @throws {Error} If router or identity is not available, or if request times out
 */
export async function performRequest(subsystem, handler, message, timeoutOrOptions) {
  // Get router facet
  const routerFacet = subsystem.router || subsystem.find?.('router');
  if (!routerFacet) {
    throw new Error('performRequest: subsystem requires router facet');
  }

  // Get identity
  const identity = subsystem.identity;
  if (!identity?.sendProtected) {
    throw new Error('performRequest: subsystem requires identity.sendProtected()');
  }

  // Normalize options
  let opts = {};
  if (typeof timeoutOrOptions === 'number') {
    opts.timeout = timeoutOrOptions;
  } else if (typeof timeoutOrOptions === 'object' && timeoutOrOptions !== null) {
    opts = { ...timeoutOrOptions };
  }

  const {
    timeout = 10_000,
    replyTo: explicitReplyTo,
    ...sendOptions
  } = opts;

  // Get subsystem name string
  const nameString = subsystem.getNameString?.() || subsystem.name || 'subsystem';

  // Get message ID (v2 uses getId() method)
  const messageId = message.getId?.();
  if (!messageId) {
    throw new Error('performRequest: message.getId() must return a valid id for oneShot requests.');
  }

  // Generate reply route
  // One-shot reply route, owned by this subsystem
  // Example: "kernel://request/oneShot/1234"
  const replyTo = explicitReplyTo ?? `${nameString}://request/oneShot/${messageId}`;
  const routeForHandler = replyTo; // We treat replyTo as the route we register.

  // NO metadata mutation - reply semantics live in send options only
  // Message metadata is frozen in v2

  return new Promise((resolve, reject) => {
    let timeoutId = null;

    const wrappedHandler = async (responseMessage, params, localHandlerOptions = {}) => {
      try {
        routerFacet.unregisterRoute(routeForHandler);
        if (timeoutId) clearTimeout(timeoutId);
        const result = await handler(responseMessage, params, localHandlerOptions);
        resolve(result);
      } catch (err) {
        reject(err);
      }
    };

    try {
      routerFacet.registerRoute(routeForHandler, wrappedHandler, {
        metadata: { description: `Auto reply route for message ${messageId}` }
      });
    } catch (err) {
      return reject(err);
    }

    if (timeout > 0) {
      timeoutId = setTimeout(() => {
        routerFacet.unregisterRoute(routeForHandler);
        reject(new Error(`Request timed out after ${timeout}ms`));
      }, timeout);
    }

    identity
      .sendProtected(message, {
        ...sendOptions,
        responseRequired: {
          replyTo,
          timeout
        }
      })
      .catch((err) => {
        routerFacet.unregisterRoute(routeForHandler);
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        reject(err);
      });
  });
}

