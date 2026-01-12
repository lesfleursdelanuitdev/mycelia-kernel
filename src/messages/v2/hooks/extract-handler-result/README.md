# useExtractHandlerResult Hook

## Overview

The `useExtractHandlerResult` hook provides utility functionality for extracting handler results from Mycelia routing results. It handles nested result structures from the MessageSystem router and normalizes them into a consistent format.

This hook is particularly useful for subsystems that need to process routing results, such as HTTP gateways or API adapters that need to extract actual handler results from the routing response structure.

## Hook Metadata

```javascript
{
  kind: 'extractHandlerResult',
  version: '1.0.0',
  overwrite: false,
  required: [],
  attach: true,
  source: import.meta.url
}
```

### Properties

- **`kind`**: `'extractHandlerResult'` - Unique identifier for this facet
- **`overwrite`**: `false` - Does not allow overwriting existing facet
- **`required`**: `[]` - No dependencies (pure utility hook)
- **`attach`**: `true` - Facet is automatically attached to the subsystem as `subsystem.extractHandlerResult`

## Usage

### Basic Usage

```javascript
import { BaseSubsystem } from 'mycelia-kernel';
import { useExtractHandlerResult } from 'mycelia-kernel';

const subsystem = new BaseSubsystem('my-subsystem', { ms: messageSystem })
  .use(useExtractHandlerResult);

// Extract handler result from routing result
const routingResult = await subsystem.identity.sendProtected(message);
const handlerResult = subsystem.extractHandlerResult.extract(routingResult);
```

### Safe Extraction (No Error Throwing)

```javascript
// Extract without throwing on error
const handlerResult = subsystem.extractHandlerResult.extractSafe(routingResult);
// Returns null if result indicates failure
```

### With Options

```javascript
// Extract with custom options
const handlerResult = subsystem.extractHandlerResult.extract(routingResult, {
  throwOnError: false  // Don't throw on error, return null instead
});
```

## Result Structures Handled

The hook handles the following result structures:

### 1. MessageSystem Router Result

```javascript
{
  success: true,
  subsystem: 'my-subsystem',
  messageId: 'msg-123',
  result: { /* handler result */ }
}
```

### 2. Accepted Structure

```javascript
{
  accepted: {
    status: 200,
    data: { /* actual data */ },
    headers: { /* response headers */ }
  }
}
```

### 3. Data Wrapper

```javascript
{
  data: { /* actual data */ }
}
```

### 4. Error Result

```javascript
{
  success: false,
  error: { message: 'Error message' }
}
```

## API

### `extract(result, options)`

Extract handler result from routing result.

**Parameters:**
- `result` (Object) - Result from `sendProtected()` or `router.route()`
- `options` (Object, optional) - Extraction options
  - `throwOnError` (boolean, default: `true`) - Throw error if result indicates failure

**Returns:** `Object|null` - Extracted handler result or null if not found

**Throws:** `Error` - If result indicates failure and `throwOnError` is true

### `extractSafe(result)`

Extract handler result without throwing on error (convenience method).

**Parameters:**
- `result` (Object) - Result from `sendProtected()` or `router.route()`

**Returns:** `Object|null` - Extracted handler result or null if not found/error

## Examples

### HTTP Gateway Handler

```javascript
export function createProtectedHandler(subsystem, myceliaPath) {
  return async (req, res) => {
    const message = new Message(pathWithParams, body, { pkr });
    const routingResult = await subsystem.identity.sendProtected(message);
    
    // Extract handler result
    let handlerResult;
    try {
      handlerResult = subsystem.extractHandlerResult.extract(routingResult);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
    
    if (!handlerResult) {
      return res.status(404).json({ error: 'Route not found' });
    }
    
    return res.status(200).json(handlerResult);
  };
}
```

### Safe Extraction Pattern

```javascript
const routingResult = await subsystem.identity.sendProtected(message);
const handlerResult = subsystem.extractHandlerResult.extractSafe(routingResult);

if (handlerResult) {
  // Process result
} else {
  // Handle not found or error
}
```

## When to Use

Use this hook when:

- Building HTTP gateways or API adapters
- Processing routing results that may have nested structures
- Normalizing results from different routing sources
- Extracting actual handler results from MessageSystem router responses

## See Also

- [useMessages Hook](./../messages/README.md) - For creating messages
- [useRouter Hook](./../router/README.md) - For routing messages
- [useSynchronous Hook](./../synchronous/README.md) - For immediate message processing

