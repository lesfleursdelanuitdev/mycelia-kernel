/**
 * Doctor Command
 * Health check for Mycelia Kernel project
 */

import {
  checkMissingHandlers,
  checkMalformedMetadata,
  checkMissingHookDependencies,
  checkDuplicateRoutePaths,
  checkOrphanedChannels,
  checkUnusedCommands
} from '../utils/doctor-checks.js';

export async function doctorCommand() {
  console.log('🔍 Running Mycelia Kernel Doctor...\n');
  
  const errors = [];
  const warnings = [];
  
  try {
    // Run all checks
    const [
      missingHandlers,
      malformedMetadata,
      missingDependencies,
      duplicateRoutes,
      orphanedChannels,
      unusedCommands
    ] = await Promise.all([
      checkMissingHandlers(),
      checkMalformedMetadata(),
      checkMissingHookDependencies(),
      checkDuplicateRoutePaths(),
      checkOrphanedChannels(),
      checkUnusedCommands()
    ]);
    
    // Collect errors
    errors.push(...missingHandlers);
    errors.push(...malformedMetadata.errors);
    errors.push(...missingDependencies);
    errors.push(...duplicateRoutes);
    
    // Collect warnings
    warnings.push(...malformedMetadata.warnings);
    warnings.push(...orphanedChannels);
    warnings.push(...unusedCommands);
    
    // Display results
    if (errors.length === 0 && warnings.length === 0) {
      console.log('✅ All checks passed!\n');
      return;
    }
    
    // Display errors
    if (errors.length > 0) {
      console.log(`❌ Errors (${errors.length}):`);
      for (const error of errors) {
        console.log(`  • ${error.message}`);
        if (error.details && error.details.path) {
          console.log(`    Path: ${error.details.path}`);
        }
      }
      console.log('');
    }
    
    // Display warnings
    if (warnings.length > 0) {
      console.log(`⚠️  Warnings (${warnings.length}):`);
      for (const warning of warnings) {
        console.log(`  • ${warning.message}`);
        if (warning.details && warning.details.path) {
          console.log(`    Path: ${warning.details.path}`);
        }
      }
      console.log('');
    }
    
    // Summary
    console.log(`Summary: ${errors.length} error(s), ${warnings.length} warning(s)\n`);
    
    // Exit with error code if there are errors
    if (errors.length > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error('Error running doctor checks:', error.message);
    process.exit(1);
  }
}


