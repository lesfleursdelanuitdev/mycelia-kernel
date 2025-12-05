/**
 * StorageQuery Model
 * 
 * Represents a query/filter for storage operations.
 * Supports various operators for filtering data.
 */

/**
 * Storage Query Filter
 * 
 * @typedef {Object} StorageFilter
 * @property {string} field - Field name to filter on
 * @property {'eq'|'ne'|'gt'|'gte'|'lt'|'lte'|'contains'|'startsWith'|'endsWith'|'in'|'nin'} operator - Comparison operator
 * @property {*} value - Value to compare against
 */

export class StorageQuery {
  #filters;
  #limit;
  #offset;
  #sort;

  /**
   * Create a new StorageQuery
   * 
   * @param {StorageFilter|Array<StorageFilter>} [filters=[]] - Filter criteria
   * @param {Object} [options={}] - Query options
   * @param {number} [options.limit] - Maximum number of results
   * @param {number} [options.offset] - Number of results to skip
   * @param {Object} [options.sort] - Sort configuration {field: string, order: 'asc'|'desc'}
   */
  constructor(filters = [], options = {}) {
    this.#filters = Array.isArray(filters) ? [...filters] : [filters];
    this.#limit = options.limit;
    this.#offset = options.offset || 0;
    this.#sort = options.sort;
  }

  /**
   * Get filters
   * @returns {Array<StorageFilter>}
   */
  getFilters() {
    return [...this.#filters];
  }

  /**
   * Add a filter
   * @param {StorageFilter} filter - Filter to add
   * @returns {StorageQuery} - Returns self for chaining
   */
  addFilter(filter) {
    this.#filters.push(filter);
    return this;
  }

  /**
   * Get limit
   * @returns {number|undefined}
   */
  getLimit() {
    return this.#limit;
  }

  /**
   * Set limit
   * @param {number} limit - Maximum number of results
   * @returns {StorageQuery} - Returns self for chaining
   */
  setLimit(limit) {
    this.#limit = limit;
    return this;
  }

  /**
   * Get offset
   * @returns {number}
   */
  getOffset() {
    return this.#offset;
  }

  /**
   * Set offset
   * @param {number} offset - Number of results to skip
   * @returns {StorageQuery} - Returns self for chaining
   */
  setOffset(offset) {
    this.#offset = offset;
    return this;
  }

  /**
   * Get sort configuration
   * @returns {Object|undefined}
   */
  getSort() {
    return this.#sort ? { ...this.#sort } : undefined;
  }

  /**
   * Set sort configuration
   * @param {string} field - Field to sort by
   * @param {'asc'|'desc'} [order='asc'] - Sort order
   * @returns {StorageQuery} - Returns self for chaining
   */
  setSort(field, order = 'asc') {
    this.#sort = { field, order };
    return this;
  }

  /**
   * Test if a value matches the query filters
   * @param {*} value - Value to test
   * @param {Object} [metadata={}] - Optional metadata to test against
   * @returns {boolean} - True if value matches all filters
   */
  matches(value, metadata = {}) {
    if (this.#filters.length === 0) {
      return true;
    }

    // For now, we'll do simple value matching
    // Backends can implement more sophisticated matching
    for (const filter of this.#filters) {
      if (!this.#matchFilter(value, metadata, filter)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Match a single filter
   * @private
   * @param {*} value - Value to test
   * @param {Object} metadata - Metadata to test against
   * @param {StorageFilter} filter - Filter to apply
   * @returns {boolean}
   */
  #matchFilter(value, metadata, filter) {
    const { field, operator, value: filterValue } = filter;

    // Get the value to compare (from value object or metadata)
    let compareValue;
    if (field === 'value' || field === '$value') {
      compareValue = value;
    } else if (field === 'key' || field === '$key') {
      compareValue = metadata.key;
    } else {
      // Try to get from value object or metadata
      compareValue = typeof value === 'object' && value !== null && field in value
        ? value[field]
        : metadata[field];
    }

    if (compareValue === undefined) {
      return false;
    }

    // Apply operator
    switch (operator) {
      case 'eq':
        return compareValue === filterValue;
      case 'ne':
        return compareValue !== filterValue;
      case 'gt':
        return compareValue > filterValue;
      case 'gte':
        return compareValue >= filterValue;
      case 'lt':
        return compareValue < filterValue;
      case 'lte':
        return compareValue <= filterValue;
      case 'contains':
        return String(compareValue).includes(String(filterValue));
      case 'startsWith':
        return String(compareValue).startsWith(String(filterValue));
      case 'endsWith':
        return String(compareValue).endsWith(String(filterValue));
      case 'in':
        return Array.isArray(filterValue) && filterValue.includes(compareValue);
      case 'nin':
        return Array.isArray(filterValue) && !filterValue.includes(compareValue);
      default:
        return false;
    }
  }

  /**
   * Convert to JSON
   * @returns {Object}
   */
  toJSON() {
    return {
      filters: this.#filters,
      limit: this.#limit,
      offset: this.#offset,
      sort: this.#sort
    };
  }

  /**
   * Create from JSON
   * @param {Object} obj - JSON object
   * @returns {StorageQuery}
   */
  static fromJSON(obj) {
    return new StorageQuery(obj.filters || [], {
      limit: obj.limit,
      offset: obj.offset,
      sort: obj.sort
    });
  }
}



