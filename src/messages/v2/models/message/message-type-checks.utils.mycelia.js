/**
 * Message Type Checks Utilities
 * 
 * Provides type checking methods for messages.
 */

/**
 * Create type check methods for a message
 * 
 * @param {Message} message - Message instance
 * @returns {Object} Object with type check methods
 */
export function createTypeChecks(message) {
  return {
    isAtomic() {
      return message.meta.isAtomic();
    },

    isBatch() {
      return message.meta.isBatch();
    },

    isQuery() {
      return message.meta.isQuery();
    },

    isCommand() {
      return message.meta.isCommand();
    },

    isError() {
      return message.meta.isError();
    }
  };
}





