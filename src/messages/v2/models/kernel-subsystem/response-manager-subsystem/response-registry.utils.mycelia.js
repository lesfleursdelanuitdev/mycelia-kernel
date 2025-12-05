/**
 * Response Registry Utilities
 * 
 * Manages the registry of pending responses by correlation ID and owner PKR.
 */

/**
 * Finalize a pending entry (remove from maps and clear timeout)
 * 
 * @param {PendingResponse} entry - Entry to finalize
 * @param {Map} pendingByCorrelation - Map of correlation ID to pending entries
 * @param {Map} pendingByOwner - Map of owner PKR to sets of pending entries
 */
export function finalizeEntry(entry, pendingByCorrelation, pendingByOwner) {
  entry.clearTimeout();
  const { correlationId, ownerPkr } = entry;

  pendingByCorrelation.delete(correlationId);

  const ownerSet = pendingByOwner.get(ownerPkr);
  if (ownerSet) {
    ownerSet.delete(entry);
    if (ownerSet.size === 0) {
      pendingByOwner.delete(ownerPkr);
    }
  }
}

/**
 * Register a pending response entry
 * 
 * @param {PendingResponse} pending - The pending response entry
 * @param {Map} pendingByCorrelation - Map of correlation ID to pending entries
 * @param {Map} pendingByOwner - Map of owner PKR to sets of pending entries
 */
export function registerPending(pending, pendingByCorrelation, pendingByOwner) {
  const { correlationId, ownerPkr } = pending;
  
  pendingByCorrelation.set(correlationId, pending);
  
  let ownerSet = pendingByOwner.get(ownerPkr);
  if (!ownerSet) {
    ownerSet = new Set();
    pendingByOwner.set(ownerPkr, ownerSet);
  }
  ownerSet.add(pending);
}




