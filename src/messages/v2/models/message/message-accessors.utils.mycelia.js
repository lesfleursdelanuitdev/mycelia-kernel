/**
 * Message Accessors Utilities
 * 
 * Provides getter methods and metadata accessors for messages.
 */

/**
 * Get message metadata accessors
 * 
 * @param {Message} message - Message instance
 * @returns {Object} Object with metadata accessor methods
 */
export function createMessageAccessors(message) {
  return {
    getTimestamp() {
      return message.meta.getTimestamp();
    },

    getRetries() {
      return message.meta.getRetries();
    },

    getMaxRetries() {
      return message.meta.getMaxRetries();
    },

    incrementRetry() {
      return message.meta.incrementRetry();
    },

    resetRetries() {
      message.meta.resetRetries();
    },

    getQueryResult() {
      return message.meta.getQueryResult();
    },

    setQueryResult(result) {
      message.meta.setQueryResult(result);
    },

    getTransaction() {
      return message.meta.getTransaction();
    },

    getSeq() {
      return message.meta.getSeq();
    },

    getSenderId() {
      return message.meta.getSenderId();
    },

    getCaller() {
      return message.meta.getCaller();
    }
  };
}




