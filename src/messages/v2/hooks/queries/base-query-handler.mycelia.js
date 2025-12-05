/**
 * BaseQueryHandler Class
 * 
 * Base class for query handlers that provides common query processing logic.
 * Subclasses must implement getOperationHandlers() to define their operation mappings.
 * 
 * @example
 * // Create a custom query handler
 * class MyQueryHandler extends BaseQueryHandler {
 *   getOperationHandlers() {
 *     return {
 *       'get-data': this.handleGetData,
 *       'get-statistics': this.handleGetStatistics
 *     };
 *   }
 *   
 *   handleGetData(queryBody) {
 *     const data = this.subsystem.getData(...);
 *     return { success: true, data };
 *   }
 * }
 */
export class BaseQueryHandler {
  /**
   * Create a new BaseQueryHandler instance
   * 
   * @param {BaseSubsystem} subsystem - Reference to subsystem for query operations
   * 
   * @example
   * // Create query handler
   * const queryHandler = new ErrorQueryHandler(errorSubsystem);
   */
  constructor(subsystem) {
    this.subsystem = subsystem; // Generic subsystem reference
    this.debug = subsystem?.debug || false;

    if (!subsystem) {
      throw new Error(`${this.constructor.name} requires subsystem reference`);
    }

    // Subclasses must provide operation mapping
    this.operations = this.getOperationHandlers();

    if (this.debug) {
      console.log(`${this.constructor.name}: Initialized`);
    }
  }

  /**
   * Process a query message
   * 
   * Routes query messages to appropriate handler based on operation type.
   * Provides common validation and error handling logic.
   * 
   * @param {Message} message - Query message (path: subsystem://query/<operation>)
   * @returns {Promise<Object>} Query result
   * 
   * @example
   * // Process query: error://query/get-errors
   * const result = await queryHandler.processQuery(message);
   */
  async processQuery(message) {
    try {
      const queryPath = message.getSubsystemPath(); // 'query/get-errors' from 'error://query/get-errors'

      // Validate path format
      if (!queryPath || !queryPath.startsWith('query/')) {
        if (this.debug) {
          console.warn(`${this.constructor.name}: Invalid query path: ${queryPath}`);
        }
        return this._error(`Invalid query path: ${queryPath}. Expected format: 'query/<operation>'`);
      }

      // Extract operation from path: 'query/get-errors' -> 'get-errors'
      const operation = queryPath.split('/')[1];

      if (!operation) {
        if (this.debug) {
          console.warn(`${this.constructor.name}: No operation specified in path: ${queryPath}`);
        }
        return this._error(`No operation specified in query path: ${queryPath}`);
      }

      const queryBody = message.getBody() || {};

      if (this.debug) {
        console.log(`${this.constructor.name}: Processing query operation '${operation}'`);
      }

      // Route to handler via mapping (subclass provides)
      const handler = this.operations[operation];
      if (!handler) {
        if (this.debug) {
          console.warn(`${this.constructor.name}: Unknown query operation: ${operation}`);
        }
        return this._error(`Unknown query operation: ${operation}`);
      }

      // Call handler (subclass implements)
      return await handler.call(this, queryBody);

    } catch (error) {
      if (this.debug) {
        console.error(`${this.constructor.name}: Error processing query:`, error);
      }
      return this._error(error.message || 'Unknown error processing query');
    }
  }

  /**
   * Get operation handlers mapping
   * 
   * Subclasses must implement this method to return a mapping of
   * operation names to handler methods.
   * 
   * @returns {Object<string, Function>} Mapping of operation names to handler functions
   * 
   * @example
   * getOperationHandlers() {
   *   return {
   *     'get-data': this.handleGetData,
   *     'get-statistics': this.handleGetStatistics
   *   };
   * }
   */
  getOperationHandlers() {
    throw new Error('Subclasses must implement getOperationHandlers()');
  }

  /**
   * Create error response
   * 
   * @param {string} message - Error message
   * @returns {Object} Error response object
   * @private
   */
  _error(message) {
    if (this.debug) {
      console.error(`${this.constructor.name}: ${message}`);
    }
    return {
      success: false,
      error: message
    };
  }
}

