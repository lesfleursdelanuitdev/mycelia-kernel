/**
 * findFacet Utility (Re-export from mycelia-kernel-plugin)
 * 
 * Safely finds a facet by kind from a FacetManager.
 * 
 * @param {FacetManager} facetManager - The FacetManager instance (e.g., api.__facets)
 * @param {string} kind - The facet kind to find
 * @returns {false|{result: true, facet: Object}} - Returns false if not found, or an object with result and facet if found
 * 
 * @example
 * const found = findFacet(api.__facets, 'router');
 * if (found) {
 *   const routerFacet = found.facet;
 *   // Use routerFacet...
 * }
 */
export { findFacet } from 'mycelia-kernel-plugin';

