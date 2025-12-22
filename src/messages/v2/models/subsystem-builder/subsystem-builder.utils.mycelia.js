/**
 * SubsystemBuilder Utilities (Re-export from mycelia-kernel-plugin)
 * 
 * Re-exports builder utilities from the plugin system package for backward compatibility.
 * All code should import from this file to maintain existing import paths.
 */
export { 
  verifySubsystemBuild,
  buildSubsystem,
  deepMerge
} from 'mycelia-kernel-plugin/builder';
