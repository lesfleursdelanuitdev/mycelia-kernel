/**
 * base-subsystem.utils.js (Re-export from mycelia-kernel-plugin/system)
 * 
 * Hierarchy lifecycle utilities for collecting, building, and disposing child subsystems.
 * These are read-only helpers that work with or without the useHierarchy facet.
 * 
 * The plugin system version uses the string 'hierarchy' instead of FACET_KINDS.HIERARCHY,
 * but since FACET_KINDS.HIERARCHY === 'hierarchy', the functionality is identical.
 */
export { collectChildren, buildChildren, disposeChildren } from 'mycelia-kernel-plugin/system';
