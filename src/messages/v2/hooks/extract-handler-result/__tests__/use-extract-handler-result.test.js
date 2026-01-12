import { describe, it, expect } from 'vitest';
import { useExtractHandlerResult } from '../use-extract-handler-result.mycelia.js';

// Mock facet structure
const createFacet = () => {
  const api = {
    name: 'test-subsystem',
    __facets: {}
  };
  const subsystem = {};
  const ctx = { config: {} };
  const facet = useExtractHandlerResult(ctx, api, subsystem);
  return { facet, api, subsystem };
};

describe('useExtractHandlerResult', () => {
  it('should extract handler result from MessageSystem router result', () => {
    const { facet } = createFacet();
    
    // MessageSystem router result structure
    const routingResult = {
      success: true,
      subsystem: 'test-subsystem',
      messageId: 'msg-123',
      result: { data: 'handler result' }
    };
    
    const extracted = facet.extract(routingResult);
    expect(extracted).toEqual({ data: 'handler result' });
  });
  
  it('should extract from accepted structure', () => {
    const { facet } = createFacet();
    
    const routingResult = {
      success: true,
      subsystem: 'test-subsystem',
      messageId: 'msg-123',
      result: {
        accepted: {
          status: 200,
          data: { files: [] },
          headers: {}
        }
      }
    };
    
    const extracted = facet.extract(routingResult);
    expect(extracted).toEqual({ files: [] });
  });
  
  it('should extract from data wrapper', () => {
    const { facet } = createFacet();
    
    const routingResult = {
      data: { result: 'data' }
    };
    
    const extracted = facet.extract(routingResult);
    expect(extracted).toEqual({ result: 'data' });
  });
  
  it('should throw on error result when throwOnError is true', () => {
    const { facet } = createFacet();
    
    const routingResult = {
      success: false,
      error: { message: 'Test error' }
    };
    
    expect(() => {
      facet.extract(routingResult);
    }).toThrow('Test error');
  });
  
  it('should return null on error result when throwOnError is false', () => {
    const { facet } = createFacet();
    
    const routingResult = {
      success: false,
      error: { message: 'Test error' }
    };
    
    const extracted = facet.extract(routingResult, { throwOnError: false });
    expect(extracted).toBeNull();
  });
  
  it('should return null for null result', () => {
    const { facet } = createFacet();
    
    const extracted = facet.extract(null);
    expect(extracted).toBeNull();
  });
  
  it('should use extractSafe convenience method', () => {
    const { facet } = createFacet();
    
    const routingResult = {
      success: false,
      error: { message: 'Test error' }
    };
    
    const extracted = facet.extractSafe(routingResult);
    expect(extracted).toBeNull();
  });
  
  it('should return result as-is if already a handler result', () => {
    const { facet } = createFacet();
    
    const handlerResult = { result: 'direct result' };
    const extracted = facet.extract(handlerResult);
    expect(extracted).toEqual(handlerResult);
  });
});

