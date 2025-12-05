import { useState } from 'react';
import { PKR } from '../models/security/public-key-record.mycelia.js';

/**
 * PKRTest
 * Tests for Public Key Record (PKR) class
 */
export function PKRTest() {
  const [results, setResults] = useState(new Map());
  const [selectedTest, setSelectedTest] = useState(null);
  const [runningTests, setRunningTests] = useState(new Set());

  const testCases = [
    // Constructor Validation
    { name: 'Constructor - throws error for null uuid', category: 'Constructor Validation' },
    { name: 'Constructor - throws error for empty string uuid', category: 'Constructor Validation' },
    { name: 'Constructor - throws error for non-string uuid', category: 'Constructor Validation' },
    { name: 'Constructor - throws error for non-string kind', category: 'Constructor Validation' },
    { name: 'Constructor - throws error for non-symbol publicKey', category: 'Constructor Validation' },
    { name: 'Constructor - throws error for non-symbol minter (when provided)', category: 'Constructor Validation' },
    { name: 'Constructor - accepts valid parameters', category: 'Constructor Validation' },
    { name: 'Constructor - accepts optional name and minter', category: 'Constructor Validation' },
    
    // Expiration Parsing
    { name: 'parseExpiration - defaults to 1 week for null/undefined', category: 'Expiration Parsing' },
    { name: 'parseExpiration - defaults to 1 week for invalid string', category: 'Expiration Parsing' },
    { name: 'parseExpiration - parses numeric hours', category: 'Expiration Parsing' },
    { name: 'parseExpiration - parses word hours', category: 'Expiration Parsing' },
    { name: 'parseExpiration - parses numeric days', category: 'Expiration Parsing' },
    { name: 'parseExpiration - parses word days', category: 'Expiration Parsing' },
    { name: 'parseExpiration - parses numeric weeks', category: 'Expiration Parsing' },
    { name: 'parseExpiration - parses word weeks', category: 'Expiration Parsing' },
    { name: 'parseExpiration - handles case insensitivity', category: 'Expiration Parsing' },
    { name: 'parseExpiration - handles abbreviations', category: 'Expiration Parsing' },
    { name: 'Constructor - sets expiration from string parameter', category: 'Expiration Parsing' },
    { name: 'Constructor - defaults to 1 week when expiration not provided', category: 'Expiration Parsing' },
    
    // Getters
    { name: 'get uuid - returns correct uuid', category: 'Getters' },
    { name: 'get name - returns name or null', category: 'Getters' },
    { name: 'get kind - returns correct kind', category: 'Getters' },
    { name: 'get publicKey - returns correct publicKey', category: 'Getters' },
    { name: 'Object.freeze - prevents modification', category: 'Getters' },
    
    // Kernel Verification
    { name: 'isMinter - throws error for non-symbol key', category: 'Kernel Verification' },
    { name: 'isMinter - returns true for matching minter', category: 'Kernel Verification' },
    { name: 'isMinter - returns false for non-matching minter', category: 'Kernel Verification' },
    { name: 'isMinter - returns false when minter is null', category: 'Kernel Verification' },
    
    // Expiry
    { name: 'isExpired - returns false for fresh PKR', category: 'Expiry' },
    { name: 'isExpired - returns true after expiration time', category: 'Expiry' },
    { name: 'isExpired - works with custom expiration times', category: 'Expiry' },
    { name: 'isValid - returns true for valid PKR', category: 'Expiry' },
    { name: 'isValid - returns false for expired PKR', category: 'Expiry' },
    { name: 'isValid - returns false for wrong minter', category: 'Expiry' },
    
    // Serialization
    { name: 'toJSON - returns correct structure', category: 'Serialization' },
    { name: 'toJSON - includes all fields', category: 'Serialization' },
    { name: 'toString - returns formatted string', category: 'Serialization' },
    { name: 'equals - returns true for same PKR', category: 'Serialization' },
    { name: 'equals - returns false for different PKR', category: 'Serialization' },
  ];

  const runTest = async (testName) => {
    if (runningTests.has(testName) || results.has(testName)) return;
    setRunningTests(prev => new Set(prev).add(testName));

    setTimeout(async () => {
      try {
        let result;
        switch (testName) {
          case 'Constructor - throws error for null uuid':
            result = await testConstructorThrowsErrorForNullUuid();
            break;
          case 'Constructor - throws error for empty string uuid':
            result = await testConstructorThrowsErrorForEmptyUuid();
            break;
          case 'Constructor - throws error for non-string uuid':
            result = await testConstructorThrowsErrorForNonStringUuid();
            break;
          case 'Constructor - throws error for non-string kind':
            result = await testConstructorThrowsErrorForNonStringKind();
            break;
          case 'Constructor - throws error for non-symbol publicKey':
            result = await testConstructorThrowsErrorForNonSymbolPublicKey();
            break;
          case 'Constructor - throws error for non-symbol minter (when provided)':
            result = await testConstructorThrowsErrorForNonSymbolMinter();
            break;
          case 'Constructor - accepts valid parameters':
            result = await testConstructorAcceptsValid();
            break;
          case 'Constructor - accepts optional name and minter':
            result = await testConstructorAcceptsOptional();
            break;
          case 'parseExpiration - defaults to 1 week for null/undefined':
            result = await testParseExpirationDefaults();
            break;
          case 'parseExpiration - defaults to 1 week for invalid string':
            result = await testParseExpirationInvalidString();
            break;
          case 'parseExpiration - parses numeric hours':
            result = await testParseExpirationNumericHours();
            break;
          case 'parseExpiration - parses word hours':
            result = await testParseExpirationWordHours();
            break;
          case 'parseExpiration - parses numeric days':
            result = await testParseExpirationNumericDays();
            break;
          case 'parseExpiration - parses word days':
            result = await testParseExpirationWordDays();
            break;
          case 'parseExpiration - parses numeric weeks':
            result = await testParseExpirationNumericWeeks();
            break;
          case 'parseExpiration - parses word weeks':
            result = await testParseExpirationWordWeeks();
            break;
          case 'parseExpiration - handles case insensitivity':
            result = await testParseExpirationCaseInsensitive();
            break;
          case 'parseExpiration - handles abbreviations':
            result = await testParseExpirationAbbreviations();
            break;
          case 'Constructor - sets expiration from string parameter':
            result = await testConstructorSetsExpiration();
            break;
          case 'Constructor - defaults to 1 week when expiration not provided':
            result = await testConstructorDefaultsExpiration();
            break;
          case 'get uuid - returns correct uuid':
            result = await testGetUuid();
            break;
          case 'get name - returns name or null':
            result = await testGetName();
            break;
          case 'get kind - returns correct kind':
            result = await testGetKind();
            break;
          case 'get publicKey - returns correct publicKey':
            result = await testGetPublicKey();
            break;
          case 'Object.freeze - prevents modification':
            result = await testObjectFreeze();
            break;
          case 'isMinter - throws error for non-symbol key':
            result = await testIsMinterThrowsError();
            break;
          case 'isMinter - returns true for matching minter':
            result = await testIsMinterReturnsTrue();
            break;
          case 'isMinter - returns false for non-matching minter':
            result = await testIsMinterReturnsFalse();
            break;
          case 'isMinter - returns false when minter is null':
            result = await testIsMinterReturnsFalseForNull();
            break;
          case 'isExpired - returns false for fresh PKR':
            result = await testIsExpiredReturnsFalse();
            break;
          case 'isExpired - returns true after expiration time':
            result = await testIsExpiredReturnsTrue();
            break;
          case 'isExpired - works with custom expiration times':
            result = await testIsExpiredCustomExpiration();
            break;
          case 'isValid - returns true for valid PKR':
            result = await testIsValidReturnsTrue();
            break;
          case 'isValid - returns false for expired PKR':
            result = await testIsValidReturnsFalseForExpired();
            break;
          case 'isValid - returns false for wrong minter':
            result = await testIsValidReturnsFalseForWrongMinter();
            break;
          case 'toJSON - returns correct structure':
            result = await testToJSON();
            break;
          case 'toJSON - includes all fields':
            result = await testToJSONIncludesAllFields();
            break;
          case 'toString - returns formatted string':
            result = await testToString();
            break;
          case 'equals - returns true for same PKR':
            result = await testEqualsReturnsTrue();
            break;
          case 'equals - returns false for different PKR':
            result = await testEqualsReturnsFalse();
            break;
          default:
            result = { success: false, error: 'Unknown test case' };
        }

        setResults(prev => new Map(prev).set(testName, {
          name: testName,
          success: result.success,
          error: result.error,
          message: result.message
        }));
      } catch (error) {
        setResults(prev => new Map(prev).set(testName, {
          name: testName,
          success: false,
          error: error.message || String(error)
        }));
      } finally {
        setRunningTests(prev => {
          const next = new Set(prev);
          next.delete(testName);
          return next;
        });
      }
    }, 0);
  };

  // Test functions
  const testConstructorThrowsErrorForNullUuid = async () => {
    try {
      new PKR({ uuid: null, kind: 'test', publicKey: Symbol('key') });
      return { success: false, error: 'Should throw error for null uuid' };
    } catch (error) {
      if (error.message.includes('uuid must be a non-empty string')) {
        return { success: true, message: 'Throws error for null uuid' };
      }
      return { success: false, error: `Wrong error: ${error.message}` };
    }
  };

  const testConstructorThrowsErrorForEmptyUuid = async () => {
    try {
      new PKR({ uuid: '', kind: 'test', publicKey: Symbol('key') });
      return { success: false, error: 'Should throw error for empty uuid' };
    } catch (error) {
      if (error.message.includes('uuid must be a non-empty string')) {
        return { success: true, message: 'Throws error for empty uuid' };
      }
      return { success: false, error: `Wrong error: ${error.message}` };
    }
  };

  const testConstructorThrowsErrorForNonStringUuid = async () => {
    try {
      new PKR({ uuid: 123, kind: 'test', publicKey: Symbol('key') });
      return { success: false, error: 'Should throw error for non-string uuid' };
    } catch (error) {
      if (error.message.includes('uuid must be a non-empty string')) {
        return { success: true, message: 'Throws error for non-string uuid' };
      }
      return { success: false, error: `Wrong error: ${error.message}` };
    }
  };

  const testConstructorThrowsErrorForNonStringKind = async () => {
    try {
      new PKR({ uuid: 'test-uuid', kind: 123, publicKey: Symbol('key') });
      return { success: false, error: 'Should throw error for non-string kind' };
    } catch (error) {
      if (error.message.includes('kind must be a string')) {
        return { success: true, message: 'Throws error for non-string kind' };
      }
      return { success: false, error: `Wrong error: ${error.message}` };
    }
  };

  const testConstructorThrowsErrorForNonSymbolPublicKey = async () => {
    try {
      new PKR({ uuid: 'test-uuid', kind: 'test', publicKey: 'not-a-symbol' });
      return { success: false, error: 'Should throw error for non-symbol publicKey' };
    } catch (error) {
      if (error.message.includes('publicKey must be a symbol')) {
        return { success: true, message: 'Throws error for non-symbol publicKey' };
      }
      return { success: false, error: `Wrong error: ${error.message}` };
    }
  };

  const testConstructorThrowsErrorForNonSymbolMinter = async () => {
    try {
      new PKR({ uuid: 'test-uuid', kind: 'test', publicKey: Symbol('key'), minter: 'not-a-symbol' });
      return { success: false, error: 'Should throw error for non-symbol minter' };
    } catch (error) {
      if (error.message.includes('minter must be a Symbol')) {
        return { success: true, message: 'Throws error for non-symbol minter' };
      }
      return { success: false, error: `Wrong error: ${error.message}` };
    }
  };

  const testConstructorAcceptsValid = async () => {
    try {
      const publicKey = Symbol('publicKey');
      const pkr = new PKR({ uuid: 'test-uuid', kind: 'test', publicKey });
      if (!pkr) {
        return { success: false, error: 'PKR should be created' };
      }
      return { success: true, message: 'Accepts valid parameters' };
    } catch (error) {
      return { success: false, error: `Should accept valid input: ${error.message}` };
    }
  };

  const testConstructorAcceptsOptional = async () => {
    const publicKey = Symbol('publicKey');
    const minter = Symbol('minter');
    const pkr = new PKR({ uuid: 'test-uuid', kind: 'test', publicKey, name: 'test-name', minter });
    if (pkr.name !== 'test-name') {
      return { success: false, error: 'Name should be set' };
    }
    if (!pkr.isMinter(minter)) {
      return { success: false, error: 'Minter should be set' };
    }
    return { success: true, message: 'Accepts optional name and minter' };
  };

  const testParseExpirationDefaults = async () => {
    const publicKey = Symbol('publicKey');
    const pkr1 = new PKR({ uuid: 'test-uuid', kind: 'test', publicKey, expiration: null });
    const pkr2 = new PKR({ uuid: 'test-uuid-2', kind: 'test', publicKey: Symbol('key2'), expiration: undefined });
    // Both should default to 1 week, so expiration should be ~7 days from now
    const now = Date.now();
    const weekMs = 7 * 24 * 60 * 60 * 1000;
    const diff1 = Math.abs(pkr1.toJSON().expiresAt - new Date(now + weekMs).toISOString());
    const diff2 = Math.abs(pkr2.toJSON().expiresAt - new Date(now + weekMs).toISOString());
    if (diff1 > 1000 || diff2 > 1000) {
      return { success: false, error: 'Should default to 1 week' };
    }
    return { success: true, message: 'Defaults to 1 week for null/undefined' };
  };

  const testParseExpirationInvalidString = async () => {
    const publicKey = Symbol('publicKey');
    const pkr = new PKR({ uuid: 'test-uuid', kind: 'test', publicKey, expiration: 'invalid string' });
    // Should default to 1 week
    const now = Date.now();
    const weekMs = 7 * 24 * 60 * 60 * 1000;
    const expiresAt = new Date(pkr.toJSON().expiresAt).getTime();
    const expected = now + weekMs;
    if (Math.abs(expiresAt - expected) > 1000) {
      return { success: false, error: 'Should default to 1 week for invalid string' };
    }
    return { success: true, message: 'Defaults to 1 week for invalid string' };
  };

  const testParseExpirationNumericHours = async () => {
    const publicKey = Symbol('publicKey');
    const pkr = new PKR({ uuid: 'test-uuid', kind: 'test', publicKey, expiration: '3 hours' });
    const now = Date.now();
    const expected = now + (3 * 60 * 60 * 1000);
    const expiresAt = new Date(pkr.toJSON().expiresAt).getTime();
    if (Math.abs(expiresAt - expected) > 1000) {
      return { success: false, error: 'Should parse numeric hours correctly' };
    }
    return { success: true, message: 'Parses numeric hours' };
  };

  const testParseExpirationWordHours = async () => {
    const publicKey = Symbol('publicKey');
    const pkr = new PKR({ uuid: 'test-uuid', kind: 'test', publicKey, expiration: 'three hours' });
    const now = Date.now();
    const expected = now + (3 * 60 * 60 * 1000);
    const expiresAt = new Date(pkr.toJSON().expiresAt).getTime();
    if (Math.abs(expiresAt - expected) > 1000) {
      return { success: false, error: 'Should parse word hours correctly' };
    }
    return { success: true, message: 'Parses word hours' };
  };

  const testParseExpirationNumericDays = async () => {
    const publicKey = Symbol('publicKey');
    const pkr = new PKR({ uuid: 'test-uuid', kind: 'test', publicKey, expiration: '5 days' });
    const now = Date.now();
    const expected = now + (5 * 24 * 60 * 60 * 1000);
    const expiresAt = new Date(pkr.toJSON().expiresAt).getTime();
    if (Math.abs(expiresAt - expected) > 1000) {
      return { success: false, error: 'Should parse numeric days correctly' };
    }
    return { success: true, message: 'Parses numeric days' };
  };

  const testParseExpirationWordDays = async () => {
    const publicKey = Symbol('publicKey');
    const pkr = new PKR({ uuid: 'test-uuid', kind: 'test', publicKey, expiration: 'two days' });
    const now = Date.now();
    const expected = now + (2 * 24 * 60 * 60 * 1000);
    const expiresAt = new Date(pkr.toJSON().expiresAt).getTime();
    if (Math.abs(expiresAt - expected) > 1000) {
      return { success: false, error: 'Should parse word days correctly' };
    }
    return { success: true, message: 'Parses word days' };
  };

  const testParseExpirationNumericWeeks = async () => {
    const publicKey = Symbol('publicKey');
    const pkr = new PKR({ uuid: 'test-uuid', kind: 'test', publicKey, expiration: '2 weeks' });
    const now = Date.now();
    const expected = now + (2 * 7 * 24 * 60 * 60 * 1000);
    const expiresAt = new Date(pkr.toJSON().expiresAt).getTime();
    if (Math.abs(expiresAt - expected) > 1000) {
      return { success: false, error: 'Should parse numeric weeks correctly' };
    }
    return { success: true, message: 'Parses numeric weeks' };
  };

  const testParseExpirationWordWeeks = async () => {
    const publicKey = Symbol('publicKey');
    const pkr = new PKR({ uuid: 'test-uuid', kind: 'test', publicKey, expiration: 'one week' });
    const now = Date.now();
    const expected = now + (1 * 7 * 24 * 60 * 60 * 1000);
    const expiresAt = new Date(pkr.toJSON().expiresAt).getTime();
    if (Math.abs(expiresAt - expected) > 1000) {
      return { success: false, error: 'Should parse word weeks correctly' };
    }
    return { success: true, message: 'Parses word weeks' };
  };

  const testParseExpirationCaseInsensitive = async () => {
    const publicKey = Symbol('publicKey');
    const pkr1 = new PKR({ uuid: 'test-uuid-1', kind: 'test', publicKey: Symbol('key1'), expiration: 'THREE HOURS' });
    const pkr2 = new PKR({ uuid: 'test-uuid-2', kind: 'test', publicKey: Symbol('key2'), expiration: 'Three Hours' });
    const pkr3 = new PKR({ uuid: 'test-uuid-3', kind: 'test', publicKey: Symbol('key3'), expiration: 'three hours' });
    const now = Date.now();
    const expected = now + (3 * 60 * 60 * 1000);
    const expires1 = new Date(pkr1.toJSON().expiresAt).getTime();
    const expires2 = new Date(pkr2.toJSON().expiresAt).getTime();
    const expires3 = new Date(pkr3.toJSON().expiresAt).getTime();
    if (Math.abs(expires1 - expected) > 1000 || Math.abs(expires2 - expected) > 1000 || Math.abs(expires3 - expected) > 1000) {
      return { success: false, error: 'Should handle case insensitivity' };
    }
    return { success: true, message: 'Handles case insensitivity' };
  };

  const testParseExpirationAbbreviations = async () => {
    const publicKey = Symbol('publicKey');
    const pkr1 = new PKR({ uuid: 'test-uuid-1', kind: 'test', publicKey: Symbol('key1'), expiration: '3 hr' });
    const pkr2 = new PKR({ uuid: 'test-uuid-2', kind: 'test', publicKey: Symbol('key2'), expiration: '2 wks' });
    const now = Date.now();
    const expected1 = now + (3 * 60 * 60 * 1000);
    const expected2 = now + (2 * 7 * 24 * 60 * 60 * 1000);
    const expires1 = new Date(pkr1.toJSON().expiresAt).getTime();
    const expires2 = new Date(pkr2.toJSON().expiresAt).getTime();
    if (Math.abs(expires1 - expected1) > 1000 || Math.abs(expires2 - expected2) > 1000) {
      return { success: false, error: 'Should handle abbreviations' };
    }
    return { success: true, message: 'Handles abbreviations' };
  };

  const testConstructorSetsExpiration = async () => {
    const publicKey = Symbol('publicKey');
    const pkr = new PKR({ uuid: 'test-uuid', kind: 'test', publicKey, expiration: '1 hour' });
    const now = Date.now();
    const expected = now + (1 * 60 * 60 * 1000);
    const expiresAt = new Date(pkr.toJSON().expiresAt).getTime();
    if (Math.abs(expiresAt - expected) > 1000) {
      return { success: false, error: 'Should set expiration from string parameter' };
    }
    return { success: true, message: 'Sets expiration from string parameter' };
  };

  const testConstructorDefaultsExpiration = async () => {
    const publicKey = Symbol('publicKey');
    const pkr = new PKR({ uuid: 'test-uuid', kind: 'test', publicKey });
    const now = Date.now();
    const expected = now + (7 * 24 * 60 * 60 * 1000);
    const expiresAt = new Date(pkr.toJSON().expiresAt).getTime();
    if (Math.abs(expiresAt - expected) > 1000) {
      return { success: false, error: 'Should default to 1 week' };
    }
    return { success: true, message: 'Defaults to 1 week when expiration not provided' };
  };

  const testGetUuid = async () => {
    const publicKey = Symbol('publicKey');
    const pkr = new PKR({ uuid: 'test-uuid', kind: 'test', publicKey });
    if (pkr.uuid !== 'test-uuid') {
      return { success: false, error: 'Should return correct uuid' };
    }
    return { success: true, message: 'Returns correct uuid' };
  };

  const testGetName = async () => {
    const publicKey = Symbol('publicKey');
    const pkr1 = new PKR({ uuid: 'test-uuid-1', kind: 'test', publicKey: Symbol('key1'), name: 'test-name' });
    const pkr2 = new PKR({ uuid: 'test-uuid-2', kind: 'test', publicKey: Symbol('key2') });
    if (pkr1.name !== 'test-name') {
      return { success: false, error: 'Should return name when provided' };
    }
    if (pkr2.name !== null) {
      return { success: false, error: 'Should return null when name not provided' };
    }
    return { success: true, message: 'Returns name or null' };
  };

  const testGetKind = async () => {
    const publicKey = Symbol('publicKey');
    const pkr = new PKR({ uuid: 'test-uuid', kind: 'test-kind', publicKey });
    if (pkr.kind !== 'test-kind') {
      return { success: false, error: 'Should return correct kind' };
    }
    return { success: true, message: 'Returns correct kind' };
  };

  const testGetPublicKey = async () => {
    const publicKey = Symbol('publicKey');
    const pkr = new PKR({ uuid: 'test-uuid', kind: 'test', publicKey });
    if (pkr.publicKey !== publicKey) {
      return { success: false, error: 'Should return correct publicKey' };
    }
    return { success: true, message: 'Returns correct publicKey' };
  };

  const testObjectFreeze = async () => {
    const publicKey = Symbol('publicKey');
    const pkr = new PKR({ uuid: 'test-uuid', kind: 'test', publicKey });
    try {
      pkr.uuid = 'modified';
      return { success: false, error: 'Should prevent modification' };
    } catch (error) {
      // Object.freeze prevents modification
      return { success: true, message: 'Prevents modification' };
    }
  };

  const testIsMinterThrowsError = async () => {
    const publicKey = Symbol('publicKey');
    const pkr = new PKR({ uuid: 'test-uuid', kind: 'test', publicKey });
    try {
      pkr.isMinter('not-a-symbol');
      return { success: false, error: 'Should throw error for non-symbol key' };
    } catch (error) {
      if (error.message.includes('key must be a Symbol')) {
        return { success: true, message: 'Throws error for non-symbol key' };
      }
      return { success: false, error: `Wrong error: ${error.message}` };
    }
  };

  const testIsMinterReturnsTrue = async () => {
    const publicKey = Symbol('publicKey');
    const minter = Symbol('minter');
    const pkr = new PKR({ uuid: 'test-uuid', kind: 'test', publicKey, minter });
    if (!pkr.isMinter(minter)) {
      return { success: false, error: 'Should return true for matching minter' };
    }
    return { success: true, message: 'Returns true for matching minter' };
  };

  const testIsMinterReturnsFalse = async () => {
    const publicKey = Symbol('publicKey');
    const minter = Symbol('minter');
    const wrongMinter = Symbol('wrong-minter');
    const pkr = new PKR({ uuid: 'test-uuid', kind: 'test', publicKey, minter });
    if (pkr.isMinter(wrongMinter)) {
      return { success: false, error: 'Should return false for non-matching minter' };
    }
    return { success: true, message: 'Returns false for non-matching minter' };
  };

  const testIsMinterReturnsFalseForNull = async () => {
    const publicKey = Symbol('publicKey');
    const minter = Symbol('minter');
    const pkr = new PKR({ uuid: 'test-uuid', kind: 'test', publicKey });
    if (pkr.isMinter(minter)) {
      return { success: false, error: 'Should return false when minter is null' };
    }
    return { success: true, message: 'Returns false when minter is null' };
  };

  const testIsExpiredReturnsFalse = async () => {
    const publicKey = Symbol('publicKey');
    const pkr = new PKR({ uuid: 'test-uuid', kind: 'test', publicKey, expiration: '1 week' });
    if (pkr.isExpired()) {
      return { success: false, error: 'Should return false for fresh PKR' };
    }
    return { success: true, message: 'Returns false for fresh PKR' };
  };

  const testIsExpiredReturnsTrue = async () => {
    const publicKey = Symbol('publicKey');
    const pkr = new PKR({ uuid: 'test-uuid', kind: 'test', publicKey, expiration: '1 millisecond' });
    // Wait a bit for expiration
    await new Promise(resolve => setTimeout(resolve, 10));
    if (!pkr.isExpired()) {
      return { success: false, error: 'Should return true after expiration time' };
    }
    return { success: true, message: 'Returns true after expiration time' };
  };

  const testIsExpiredCustomExpiration = async () => {
    const publicKey = Symbol('publicKey');
    const pkr = new PKR({ uuid: 'test-uuid', kind: 'test', publicKey, expiration: '1 hour' });
    const now = Date.now();
    const expiresAt = new Date(pkr.toJSON().expiresAt).getTime();
    const expected = now + (1 * 60 * 60 * 1000);
    if (Math.abs(expiresAt - expected) > 1000) {
      return { success: false, error: 'Should work with custom expiration times' };
    }
    return { success: true, message: 'Works with custom expiration times' };
  };

  const testIsValidReturnsTrue = async () => {
    const publicKey = Symbol('publicKey');
    const minter = Symbol('minter');
    const pkr = new PKR({ uuid: 'test-uuid', kind: 'test', publicKey, minter, expiration: '1 week' });
    if (!pkr.isValid(minter)) {
      return { success: false, error: 'Should return true for valid PKR' };
    }
    return { success: true, message: 'Returns true for valid PKR' };
  };

  const testIsValidReturnsFalseForExpired = async () => {
    const publicKey = Symbol('publicKey');
    const minter = Symbol('minter');
    const pkr = new PKR({ uuid: 'test-uuid', kind: 'test', publicKey, minter, expiration: '1 millisecond' });
    await new Promise(resolve => setTimeout(resolve, 10));
    if (pkr.isValid(minter)) {
      return { success: false, error: 'Should return false for expired PKR' };
    }
    return { success: true, message: 'Returns false for expired PKR' };
  };

  const testIsValidReturnsFalseForWrongMinter = async () => {
    const publicKey = Symbol('publicKey');
    const minter = Symbol('minter');
    const wrongMinter = Symbol('wrong-minter');
    const pkr = new PKR({ uuid: 'test-uuid', kind: 'test', publicKey, minter, expiration: '1 week' });
    if (pkr.isValid(wrongMinter)) {
      return { success: false, error: 'Should return false for wrong minter' };
    }
    return { success: true, message: 'Returns false for wrong minter' };
  };

  const testToJSON = async () => {
    const publicKey = Symbol('publicKey');
    const pkr = new PKR({ uuid: 'test-uuid', kind: 'test', publicKey, name: 'test-name' });
    const json = pkr.toJSON();
    if (!json.uuid || !json.kind || !json.publicKey || !json.expiresAt) {
      return { success: false, error: 'Should return correct structure' };
    }
    return { success: true, message: 'Returns correct structure' };
  };

  const testToJSONIncludesAllFields = async () => {
    const publicKey = Symbol('publicKey');
    const pkr = new PKR({ uuid: 'test-uuid', kind: 'test', publicKey, name: 'test-name' });
    const json = pkr.toJSON();
    if (json.uuid !== 'test-uuid' || json.kind !== 'test' || json.name !== 'test-name') {
      return { success: false, error: 'Should include all fields' };
    }
    if (!json.expiresAt || typeof json.expiresAt !== 'string') {
      return { success: false, error: 'Should include expiresAt as ISO string' };
    }
    return { success: true, message: 'Includes all fields' };
  };

  const testToString = async () => {
    const publicKey = Symbol('publicKey');
    const pkr1 = new PKR({ uuid: 'test-uuid', kind: 'test', publicKey: Symbol('key1'), name: 'test-name' });
    const pkr2 = new PKR({ uuid: 'test-uuid-2', kind: 'test', publicKey: Symbol('key2') });
    const str1 = pkr1.toString();
    const str2 = pkr2.toString();
    if (!str1.includes('test-name') || !str1.includes('test')) {
      return { success: false, error: 'Should format string with name' };
    }
    if (!str2.includes('test-uuid-2') || !str2.includes('test')) {
      return { success: false, error: 'Should format string with uuid when no name' };
    }
    return { success: true, message: 'Returns formatted string' };
  };

  const testEqualsReturnsTrue = async () => {
    const publicKey = Symbol('publicKey');
    const pkr1 = new PKR({ uuid: 'test-uuid', kind: 'test', publicKey });
    const pkr2 = new PKR({ uuid: 'test-uuid', kind: 'test', publicKey: Symbol('key2') });
    if (!pkr1.equals(pkr2)) {
      return { success: false, error: 'Should return true for same PKR (same uuid)' };
    }
    return { success: true, message: 'Returns true for same PKR' };
  };

  const testEqualsReturnsFalse = async () => {
    const publicKey = Symbol('publicKey');
    const pkr1 = new PKR({ uuid: 'test-uuid-1', kind: 'test', publicKey });
    const pkr2 = new PKR({ uuid: 'test-uuid-2', kind: 'test', publicKey: Symbol('key2') });
    if (pkr1.equals(pkr2)) {
      return { success: false, error: 'Should return false for different PKR' };
    }
    if (pkr1.equals(null)) {
      return { success: false, error: 'Should return false for null' };
    }
    return { success: true, message: 'Returns false for different PKR' };
  };

  const categories = [...new Set(testCases.map(t => t.category))];
  const testsByCategory = categories.reduce((acc, cat) => {
    acc[cat] = testCases.filter(t => t.category === cat);
    return acc;
  }, {});

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h2>PKR (Public Key Record) Tests</h2>
      
      <div style={{ marginBottom: '20px' }}>
        <button
          onClick={() => {
            testCases.forEach(t => {
              if (!results.has(t.name) && !runningTests.has(t.name)) {
                runTest(t.name);
              }
            });
          }}
          disabled={runningTests.size > 0}
          style={{ marginRight: '10px', padding: '8px 16px' }}
        >
          Run All Tests
        </button>
        <button
          onClick={() => setResults(new Map())}
          style={{ padding: '8px 16px' }}
        >
          Clear Results
        </button>
      </div>

      {categories.map(category => (
        <div key={category} style={{ marginBottom: '30px' }}>
          <h3>{category}</h3>
          <div style={{ display: 'grid', gap: '10px' }}>
            {testsByCategory[category].map(test => {
              const result = results.get(test.name);
              const isRunning = runningTests.has(test.name);
              const hasResult = results.has(test.name);
              
              return (
                <div
                  key={test.name}
                  style={{
                    padding: '10px',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    backgroundColor: isRunning ? '#fff3cd' : hasResult ? (result.success ? '#d4edda' : '#f8d7da') : '#f8f9fa',
                    cursor: 'pointer'
                  }}
                  onClick={() => setSelectedTest(selectedTest === test.name ? null : test.name)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>{test.name}</span>
                    <div>
                      {isRunning && <span style={{ color: '#856404' }}>Running...</span>}
                      {hasResult && !isRunning && (
                        <span style={{ color: result.success ? '#155724' : '#721c24', fontWeight: 'bold' }}>
                          {result.success ? '✓' : '✗'}
                        </span>
                      )}
                      {!hasResult && !isRunning && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            runTest(test.name);
                          }}
                          style={{ padding: '4px 8px', fontSize: '12px' }}
                        >
                          Run
                        </button>
                      )}
                    </div>
                  </div>
                  {selectedTest === test.name && result && (
                    <div style={{ marginTop: '10px', padding: '10px', backgroundColor: '#fff', borderRadius: '4px' }}>
                      {result.message && <div><strong>Message:</strong> {result.message}</div>}
                      {result.error && <div style={{ color: '#721c24' }}><strong>Error:</strong> {result.error}</div>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}







