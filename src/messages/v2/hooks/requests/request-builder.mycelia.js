/**
 * RequestBuilder Class
 * 
 * Fluent builder for creating request/response chains.
 * Supports multiple request types: 'oneShot' and 'command'.
 * 
 * @example
 * // One-shot request
 * const result = await subsystem.requests
 *   .oneShot()
 *   .with({ handler: async (r) => r.getBody(), timeout: 5000 })
 *   .forMessage(message)
 *   .send();
 * 
 * @example
 * // Command request
 * const response = await subsystem.requests
 *   .command()
 *   .with({ replyTo: 'subsystem://channel/replies', timeout: 5000 })
 *   .forMessage(commandMessage)
 *   .send();
 */
export class RequestBuilder {
  #type;
  #subsystem;
  #performRequest;
  #commandManager;
  #options = {};
  #message = null;

  /**
   * Create a new RequestBuilder
   * 
   * @param {Object} params - Builder parameters
   * @param {string} params.type - Request type: 'oneShot' or 'command'
   * @param {BaseSubsystem} params.subsystem - Subsystem instance
   * @param {Function} params.performRequest - performRequest function reference
   * @param {CommandManager} params.commandManager - CommandManager instance
   * @throws {Error} If parameters are invalid
   */
  constructor({ type, subsystem, performRequest, commandManager }) {
    if (type !== 'oneShot' && type !== 'command') {
      throw new Error(`RequestBuilder: type must be 'oneShot' or 'command', got "${type}"`);
    }
    if (!subsystem) {
      throw new Error('RequestBuilder: subsystem is required');
    }
    if (type === 'oneShot' && typeof performRequest !== 'function') {
      throw new Error('RequestBuilder: performRequest function is required for oneShot type');
    }
    if (type === 'command' && !commandManager) {
      throw new Error('RequestBuilder: commandManager is required for command type');
    }

    this.#type = type;
    this.#subsystem = subsystem;
    this.#performRequest = performRequest;
    this.#commandManager = commandManager;
    this.#options = {};
    this.#message = null;
  }

  /**
   * Add options to the builder
   * 
   * Can be called multiple times to incrementally build options.
   * Options are merged (later calls override earlier ones).
   * 
   * @param {Object} [options={}] - Options to merge
   * @returns {RequestBuilder} This builder instance for chaining
   * 
   * @example
   * builder.with({ timeout: 5000 }).with({ handler: myHandler });
   */
  with(options = {}) {
    this.#options = { ...(this.#options || {}), ...(options || {}) };
    return this;
  }

  /**
   * Set the message to send
   * 
   * @param {Message} message - Message to send
   * @returns {RequestBuilder} This builder instance for chaining
   * 
   * @example
   * builder.forMessage(myMessage);
   */
  forMessage(message) {
    this.#message = message;
    return this;
  }

  /**
   * Execute the request
   * 
   * Validates that message is set, then executes based on type:
   * - 'oneShot': Uses performRequest with handler from options
   * - 'command': Uses CommandManager.sendCommand
   * 
   * @returns {Promise<any>} Result from the request (varies by type)
   * @throws {Error} If message is not set, handler is missing (oneShot), or CommandManager is unavailable (command)
   * 
   * @example
   * const result = await builder.send();
   */
  async send() {
    const type = this.#type;
    const subsystem = this.#subsystem;
    const message = this.#message;
    const options = this.#options || {};

    if (!message) {
      throw new Error('RequestBuilder.send: no message provided. Call forMessage() first.');
    }

    switch (type) {
      case 'oneShot': {
        // Delegate to existing performRequest helper
        const handler = options.handler;
        if (typeof handler !== 'function') {
          throw new Error('RequestBuilder(oneShot).send: options.handler (function) is required.');
        }

        // v2: Extract options (use replyTo instead of replyPath)
        const { timeout, replyTo, ...sendOptions } = options;
        return this.#performRequest(subsystem, handler, message, {
          timeout,
          replyTo,
          ...sendOptions
        });
      }

      case 'command': {
        if (!this.#commandManager) {
          throw new Error('RequestBuilder(command).send: CommandManager is not available.');
        }

        return this.#commandManager.sendCommand({
          message,
          options
        });
      }

      default:
        throw new Error(`RequestBuilder.send: unknown request type "${type}".`);
    }
  }
}
