# useMessageProcessor Complexity Analysis

## Current Structure

### Layer 1: useMessageProcessor Hook
```javascript
useMessageProcessor
  ↓
  - Gets router, statistics, queue facets
  - Creates processMessageCore with dependencies
  - Exposes: processMessage, processImmediately, processTick, accept
```

### Layer 2: createProcessMessageCore Factory
```javascript
createProcessMessageCore(dependencies)
  ↓
  Returns: processMessageCore(message, options)
    ↓
    Calls: processMessage(context, message, options)
```

### Layer 3: processMessage Function
```javascript
processMessage(context, message, options)
  ↓
  - Gets router facet at runtime: getRouterFacet()
  - Tries: routerFacet.route() (preferred)
  - Falls back: routeRegistry.match() + executeHandler()
```

## Complexity Issues

### 1. **Unnecessary Factory Pattern** ⚠️
**Current**: `createProcessMessageCore` → returns function → calls `processMessage`
**Why Complex**: Extra layer of indirection
**Simplification**: Could directly use `processMessage` or inline the logic

### 2. **Runtime Router Facet Lookup** ⚠️
**Current**: `getRouterFacet: () => subsystem.find('router')` closure
**Why Complex**: Adds indirection, makes testing harder
**Simplification**: Could get router facet directly in hook, pass it to processMessage

### 3. **Dual Path Logic** ⚠️
**Current**: 
- Preferred: `routerFacet.route()`
- Fallback: `routeRegistry.match() + executeHandler()`
**Why Complex**: Two different code paths to maintain
**Simplification**: Router facet should always be available (required dependency), fallback might be unnecessary

### 4. **Scattered Helper Functions** ⚠️
**Current**: `matchRoute()` and `executeHandler()` as separate functions
**Why Complex**: Logic is split across multiple functions
**Simplification**: Could be inlined or simplified

### 5. **Unnecessary Local Copy** ❌
**Current**: `const localApi = api;` (line 30)
**Why Complex**: Completely unnecessary - just use `api` directly
**Simplification**: Remove it

### 6. **Complex Dependency Injection** ⚠️
**Current**: Passes errorReporter, statisticsRecorder, errorRecorder as functions
**Why Complex**: Creates closures, makes dependencies unclear
**Simplification**: Could pass facets directly, call methods when needed

### 7. **Error Reporter Complexity** ⚠️
**Current**: errorReporter is an async function that sends to error system
**Why Complex**: Adds async complexity, might not always be needed
**Simplification**: Could be optional or simplified

## Proposed Simplifications

### Option 1: Inline processMessageCore Logic

**Current**:
```javascript
const processMessageCore = createProcessMessageCore({
  getRouterFacet: () => subsystem.find('router'),
  routeRegistry: routerFacet._routeRegistry,
  ms,
  statisticsFacet,
  debug,
  subsystemName: name
});

async processImmediately(message, options = {}) {
  return await processMessageCore(message, options);
}
```

**Simplified**:
```javascript
async processImmediately(message, options = {}) {
  // Get router facet at runtime (supports overwrites like useRouterWithScopes)
  const routerFacet = subsystem.find('router');
  
  if (!routerFacet) {
    throw new Error(`No router facet found`);
  }
  
  if (typeof routerFacet.route === 'function') {
    // Use router facet's route() method (includes scope checking)
    const result = await routerFacet.route(message, options);
    
    // Record statistics
    if (result && result.success !== false && statisticsFacet?._statistics) {
      statisticsFacet._statistics.recordProcessed(Date.now());
    }
    
    return result;
  }
  
  // Fallback: use route registry directly
  const match = routerFacet._routeRegistry?.match(message.getPath());
  if (!match) {
    return { success: false, error: 'No route found' };
  }
  
  // Execute handler
  const { callerIdSetBy: _, ...sanitizedOptions } = options;
  return await match.routeEntry.handler(message, match.params, sanitizedOptions);
}
```

### Option 2: Simplify Dependency Structure

**Current**: Multiple layers of function factories and closures
**Simplified**: Direct method calls with clear dependencies

### Option 3: Remove Unnecessary Abstraction

**Current**: `createProcessMessageCore` factory pattern
**Simplified**: Direct implementation in facet methods

## Key Questions

1. **Is the factory pattern necessary?**
   - Currently: Yes, for dependency injection
   - Could be: No, if we pass dependencies directly

2. **Is runtime router facet lookup necessary?**
   - Currently: Yes, to support overwrites (useRouterWithScopes)
   - Could be: Simplified if we always use `subsystem.find('router')` directly

3. **Is the fallback path necessary?**
   - Currently: Yes, for backward compatibility
   - Could be: Removed if router facet is always required

4. **Is errorReporter complexity necessary?**
   - Currently: Yes, for error system integration
   - Could be: Simplified or made optional

## Recommended Simplification

### Simplified useMessageProcessor

```javascript
export const useMessageProcessor = createHook({
  kind: 'processor',
  overwrite: false,
  required: ['router', 'statistics', 'queue'],
  attach: true,
  source: import.meta.url,
  contract: 'processor',
  fn: (ctx, api, subsystem) => {
    const { name } = api;
    const { ms } = ctx;
    const config = ctx.config?.processor || {};
    const debug = getDebugFlag(config, ctx);
    
    // Get required facets
    const routerFacet = subsystem.find('router');
    if (!routerFacet) {
      throw new Error(`useMessageProcessor ${name}: router facet not found`);
    }
    const statisticsFacet = subsystem.find('statistics');
    if (!statisticsFacet) {
      throw new Error(`useMessageProcessor ${name}: statistics facet not found`);
    }
    const queueFacet = subsystem.find('queue');
    if (!queueFacet) {
      throw new Error(`useMessageProcessor ${name}: queue facet not found`);
    }
    
    return new Facet('processor', { attach: true, source: import.meta.url, contract: 'processor' })
      .add({
        async processImmediately(message, options = {}) {
          // Get router facet at runtime (supports overwrites)
          const runtimeRouterFacet = subsystem.find('router');
          
          if (!runtimeRouterFacet) {
            throw new Error(`No router facet available`);
          }
          
          if (typeof runtimeRouterFacet.route === 'function') {
            const startTime = Date.now();
            try {
              const result = await runtimeRouterFacet.route(message, options);
              
              // Record statistics
              if (result && result.success !== false && statisticsFacet?._statistics) {
                const processingTime = Date.now() - startTime;
                statisticsFacet._statistics.recordProcessed(processingTime);
              }
              
              return result;
            } catch (error) {
              if (statisticsFacet?._statistics) {
                statisticsFacet._statistics.recordError();
              }
              throw error;
            }
          }
          
          // Fallback: use route registry directly
          const routeRegistry = routerFacet._routeRegistry;
          if (!routeRegistry) {
            throw new Error(`No route registry available`);
          }
          
          const path = message.getPath();
          const match = routeRegistry.match(path);
          if (!match) {
            if (statisticsFacet?._statistics) {
              statisticsFacet._statistics.recordError();
            }
            return {
              success: false,
              error: `No route handler found for path: ${path}`
            };
          }
          
          // Execute handler
          const { callerIdSetBy: _, ...sanitizedOptions } = options;
          const startTime = Date.now();
          try {
            const result = await match.routeEntry.handler(
              message,
              match.params,
              sanitizedOptions
            );
            
            if (result && result.success !== false && statisticsFacet?._statistics) {
              const processingTime = Date.now() - startTime;
              statisticsFacet._statistics.recordProcessed(processingTime);
            }
            
            return result;
          } catch (error) {
            if (statisticsFacet?._statistics) {
              statisticsFacet._statistics.recordError();
            }
            throw error;
          }
        },
        
        async processMessage(pairOrMessage, options = {}) {
          // Extract message and options
          let message, finalOptions;
          if (pairOrMessage && typeof pairOrMessage === 'object' && 'msg' in pairOrMessage) {
            message = pairOrMessage.msg;
            finalOptions = { ...(pairOrMessage.options || {}), ...options };
          } else {
            message = pairOrMessage;
            finalOptions = options;
          }
          
          return await this.processImmediately(message, finalOptions);
        },
        
        async processTick() {
          const pair = queueFacet.selectNextMessage();
          if (!pair) {
            return null;
          }
          return await this.processMessage(pair);
        },
        
        async accept(message, options = {}) {
          return await acceptMessage(
            {
              queueManager: queueFacet._queueManager,
              statisticsRecorder: () => {
                if (statisticsFacet?._statistics) {
                  statisticsFacet._statistics.recordAccepted();
                }
              },
              errorRecorder: () => {
                if (statisticsFacet?._statistics) {
                  statisticsFacet._statistics.recordError();
                }
              },
              debug: options.debug || false,
              subsystemName: name
            },
            message,
            options
          );
        }
      });
  }
});
```

## Benefits of Simplification

1. **Removes factory pattern**: Direct implementation is clearer
2. **Removes unnecessary abstraction**: Less indirection
3. **Clearer dependencies**: Facets are accessed directly
4. **Easier to test**: No complex dependency injection
5. **Easier to debug**: Logic is in one place
6. **Still supports overwrites**: Uses `subsystem.find('router')` at runtime

## Trade-offs

1. **Loses errorReporter**: Would need to handle error reporting differently
2. **More code in hook**: But clearer and easier to understand
3. **Less reusable**: But processMessageCore wasn't reused elsewhere anyway

## Recommendation

**Simplify by inlining processMessageCore logic directly into useMessageProcessor hook methods.**

This will:
- Remove unnecessary abstraction
- Make code easier to understand
- Make debugging easier
- Still support router facet overwrites
- Still support fallback path
- Still record statistics
- Still handle errors

The only thing we'd lose is the errorReporter integration, which could be added back if needed, or handled differently.

