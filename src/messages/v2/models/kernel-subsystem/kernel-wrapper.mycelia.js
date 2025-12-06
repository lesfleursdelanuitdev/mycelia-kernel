/**
 * KernelWrapper
 * 
 * Creates wrapper objects that expose limited subsystem methods.
 * Optionally includes listeners if the subsystem has a listeners facet.
 * 
 * @example
 * const wrapper = KernelWrapper.create(subsystem);
 * await wrapper.accept(message);
 * wrapper.pause();
 */
export class KernelWrapper {
  /**
   * Create a wrapper object that exposes limited subsystem methods.
   * Optionally includes listeners if the subsystem has a listeners facet.
   * 
   * @param {BaseSubsystem} subsystem - The subsystem instance to wrap
   * @returns {Object} Wrapper object with limited subsystem methods:
   *   - accept(message, options) - Accept and process a message
   *   - process(timeSlice) - Process messages in the queue
   *   - getNameString() - Get fully-qualified subsystem name
   *   - pause() - Pause message processing
   *   - resume() - Resume message processing
   *   - dispose() - Dispose the subsystem
   *   - listeners {Object} - Optional listeners API (only if subsystem has listeners facet):
   *     - on(path, handler, opts) - Register a listener (auto-enables if needed)
   *     - off(path, handler, opts) - Unregister a listener
   *     - emit(...args) - Emit an event (if supported)
   *     - hasListeners() - Check if listeners are enabled
   *     - enable() - Enable listeners
   */
  static create(subsystem) {
    // Create base wrapper with core methods
    // Subsystem instance is captured in closure (not exposed as property)
    const wrapper = {
      accept: (message, options) => subsystem.accept(message, options),
      process: (timeSlice) => subsystem.process(timeSlice),
      getNameString: () => subsystem.getNameString(),
      pause: () => subsystem.pause(),
      resume: () => subsystem.resume(),
      dispose: () => subsystem.dispose()
    };

    // Optional listeners surface
    const listenersFacet = subsystem.find('listeners');
    if (listenersFacet) {
      wrapper.listeners = {
        on: (path, handler, opts) => {
          if (!listenersFacet.hasListeners()) {
            listenersFacet.enableListeners();
          }
          return listenersFacet.on(path, handler, opts);
        },
        off: (path, handler, opts) => listenersFacet.off(path, handler, opts),
        // Optional helpers
        emit: (...args) => listenersFacet.emit?.(...args),
        hasListeners: () => listenersFacet.hasListeners(),
        enable: () => listenersFacet.enableListeners()
      };
    }

    return wrapper;
  }
}





