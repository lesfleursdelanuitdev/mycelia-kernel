import { useState } from 'react';
import { useStatistics } from '../hooks/statistics/use-statistics.mycelia.js';
import { SubsystemStatistics } from '../hooks/statistics/subsystem-statistics.mycelia.js';

/**
 * UseStatisticsTest - React component test suite for useStatistics hook
 * Tests the useStatistics hook directly without building subsystems
 */
export function UseStatisticsTest() {
  const [results, setResults] = useState(new Map());
  const [selectedTest, setSelectedTest] = useState(null);
  const [runningTests, setRunningTests] = useState(new Set());

  // Helper to create a statistics facet with fresh mocks
  const createStatisticsFacet = (config = {}) => {
    const subsystem = { name: 'test-subsystem' };
    const api = { name: 'test-subsystem' };
    const ctx = { config: { statistics: config } };
    return useStatistics(ctx, api, subsystem);
  };

  const testCases = [
    { name: 'Hook returns Facet', category: 'Initialization' },
    { name: 'Statistics instance created immediately', category: 'Initialization' },
    { name: '_statistics is SubsystemStatistics instance', category: 'Initialization' },
    { name: 'getStatistics() - returns object with correct structure', category: 'getStatistics()' },
    { name: 'getStatistics() - returns initial values (zeros)', category: 'getStatistics()' },
    { name: 'getStatistics() - returns copy (immutability)', category: 'getStatistics()' },
    { name: 'getProcessingMetrics() - returns correct structure', category: 'getProcessingMetrics()' },
    { name: 'getProcessingMetrics() - includes averageProcessingTime', category: 'getProcessingMetrics()' },
    { name: 'getProcessingMetrics() - averageProcessingTime is 0 initially', category: 'getProcessingMetrics()' },
    { name: 'recordAccepted() - increments messagesAccepted', category: 'Statistics Recording' },
    { name: 'recordProcessed() - increments messagesProcessed', category: 'Statistics Recording' },
    { name: 'recordProcessed() - adds to totalProcessingTime', category: 'Statistics Recording' },
    { name: 'recordError() - increments processingErrors', category: 'Statistics Recording' },
    { name: 'recordQueueFull() - increments queueFullEvents', category: 'Statistics Recording' },
    { name: 'recordTimeSlice() - increments timeSlicesReceived', category: 'Statistics Recording' },
    { name: 'Multiple recordings accumulate correctly', category: 'Statistics Recording' },
    { name: 'getStatistics() reflects all recorded events', category: 'Statistics Recording' },
    { name: 'getAverageProcessingTime() - returns 0 when no messages', category: 'Average Processing Time' },
    { name: 'getAverageProcessingTime() - calculates correctly', category: 'Average Processing Time' },
    { name: 'Configuration - debug flag from config', category: 'Configuration' },
    { name: 'Statistics reset clears all values', category: 'Integration' },
    { name: 'Full workflow test', category: 'Integration' },
  ];

  const runTest = async (testName) => {
    if (runningTests.has(testName) || results.has(testName)) {
      return;
    }

    setRunningTests(prev => new Set(prev).add(testName));

    setTimeout(() => {
      try {
        let result;
        
        switch (testName) {
          case 'Hook returns Facet':
            result = testHookReturnsFacet();
            break;
          case 'Statistics instance created immediately':
            result = testStatisticsInstanceCreated();
            break;
          case '_statistics is SubsystemStatistics instance':
            result = testStatisticsInstanceType();
            break;
          case 'getStatistics() - returns object with correct structure':
            result = testGetStatisticsStructure();
            break;
          case 'getStatistics() - returns initial values (zeros)':
            result = testGetStatisticsInitialValues();
            break;
          case 'getStatistics() - returns copy (immutability)':
            result = testGetStatisticsImmutability();
            break;
          case 'getProcessingMetrics() - returns correct structure':
            result = testGetProcessingMetricsStructure();
            break;
          case 'getProcessingMetrics() - includes averageProcessingTime':
            result = testGetProcessingMetricsIncludesAverage();
            break;
          case 'getProcessingMetrics() - averageProcessingTime is 0 initially':
            result = testGetProcessingMetricsInitialAverage();
            break;
          case 'recordAccepted() - increments messagesAccepted':
            result = testRecordAccepted();
            break;
          case 'recordProcessed() - increments messagesProcessed':
            result = testRecordProcessed();
            break;
          case 'recordProcessed() - adds to totalProcessingTime':
            result = testRecordProcessedAddsTime();
            break;
          case 'recordError() - increments processingErrors':
            result = testRecordError();
            break;
          case 'recordQueueFull() - increments queueFullEvents':
            result = testRecordQueueFull();
            break;
          case 'recordTimeSlice() - increments timeSlicesReceived':
            result = testRecordTimeSlice();
            break;
          case 'Multiple recordings accumulate correctly':
            result = testMultipleRecordings();
            break;
          case 'getStatistics() reflects all recorded events':
            result = testGetStatisticsReflectsEvents();
            break;
          case 'getAverageProcessingTime() - returns 0 when no messages':
            result = testAverageProcessingTimeZero();
            break;
          case 'getAverageProcessingTime() - calculates correctly':
            result = testAverageProcessingTimeCalculation();
            break;
          case 'Configuration - debug flag from config':
            result = testConfigurationDebug();
            break;
          case 'Statistics reset clears all values':
            result = testStatisticsReset();
            break;
          case 'Full workflow test':
            result = testFullWorkflow();
            break;
          default:
            result = { success: false, error: 'Unknown test case' };
        }

        setResults(prev => new Map(prev).set(testName, {
          name: testName,
          success: result.success,
          message: result.message,
          data: result.data,
          error: result.error
        }));
      } catch (error) {
        setResults(prev => new Map(prev).set(testName, {
          name: testName,
          success: false,
          error: error.message,
          stack: error.stack
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

  const testHookReturnsFacet = () => {
    const facet = createStatisticsFacet();
    
    if (!facet || typeof facet !== 'object') {
      return { success: false, error: 'Hook should return an object' };
    }
    if (facet.getKind() !== 'statistics') {
      return { success: false, error: `Facet kind should be 'statistics', got '${facet.getKind()}'` };
    }
    
    return {
      success: true,
      message: 'Hook returns a Facet with correct kind',
      data: { kind: facet.getKind() }
    };
  };

  const testStatisticsInstanceCreated = () => {
    const facet = createStatisticsFacet();
    
    if (!facet._statistics) {
      return { success: false, error: 'Statistics instance should be created immediately' };
    }
    
    return {
      success: true,
      message: 'Statistics instance is created immediately',
      data: {}
    };
  };

  const testStatisticsInstanceType = () => {
    const facet = createStatisticsFacet();
    
    if (!(facet._statistics instanceof SubsystemStatistics)) {
      return { success: false, error: '_statistics should be a SubsystemStatistics instance' };
    }
    
    return {
      success: true,
      message: '_statistics is a SubsystemStatistics instance',
      data: { instanceType: facet._statistics.constructor.name }
    };
  };

  const testGetStatisticsStructure = () => {
    const facet = createStatisticsFacet();
    const stats = facet.getStatistics();
    
    if (!stats || typeof stats !== 'object') {
      return { success: false, error: 'getStatistics should return an object' };
    }
    
    const expectedKeys = [
      'messagesAccepted',
      'messagesProcessed',
      'processingErrors',
      'queueFullEvents',
      'timeSlicesReceived',
      'totalProcessingTime'
    ];
    
    for (const key of expectedKeys) {
      if (!(key in stats)) {
        return { success: false, error: `Missing expected key: ${key}` };
      }
      if (typeof stats[key] !== 'number') {
        return { success: false, error: `Key ${key} should be a number, got ${typeof stats[key]}` };
      }
    }
    
    return {
      success: true,
      message: 'getStatistics returns object with correct structure',
      data: { keys: Object.keys(stats) }
    };
  };

  const testGetStatisticsInitialValues = () => {
    const facet = createStatisticsFacet();
    const stats = facet.getStatistics();
    
    if (stats.messagesAccepted !== 0) {
      return { success: false, error: `Expected messagesAccepted to be 0, got ${stats.messagesAccepted}` };
    }
    if (stats.messagesProcessed !== 0) {
      return { success: false, error: `Expected messagesProcessed to be 0, got ${stats.messagesProcessed}` };
    }
    if (stats.processingErrors !== 0) {
      return { success: false, error: `Expected processingErrors to be 0, got ${stats.processingErrors}` };
    }
    if (stats.queueFullEvents !== 0) {
      return { success: false, error: `Expected queueFullEvents to be 0, got ${stats.queueFullEvents}` };
    }
    if (stats.timeSlicesReceived !== 0) {
      return { success: false, error: `Expected timeSlicesReceived to be 0, got ${stats.timeSlicesReceived}` };
    }
    if (stats.totalProcessingTime !== 0) {
      return { success: false, error: `Expected totalProcessingTime to be 0, got ${stats.totalProcessingTime}` };
    }
    
    return {
      success: true,
      message: 'getStatistics returns initial values (all zeros)',
      data: { stats }
    };
  };

  const testGetStatisticsImmutability = () => {
    const facet = createStatisticsFacet();
    const stats1 = facet.getStatistics();
    const stats2 = facet.getStatistics();
    
    // Should return copies, not same reference
    if (stats1 === stats2) {
      return { success: false, error: 'getStatistics should return a new object each time' };
    }
    
    // Modifying returned object should not affect internal state
    stats1.messagesAccepted = 999;
    const stats3 = facet.getStatistics();
    if (stats3.messagesAccepted !== 0) {
      return { success: false, error: 'Modifying returned object should not affect internal state' };
    }
    
    return {
      success: true,
      message: 'getStatistics returns independent copies',
      data: {}
    };
  };

  const testGetProcessingMetricsStructure = () => {
    const facet = createStatisticsFacet();
    const metrics = facet.getProcessingMetrics();
    
    if (!metrics || typeof metrics !== 'object') {
      return { success: false, error: 'getProcessingMetrics should return an object' };
    }
    
    const expectedKeys = [
      'messagesAccepted',
      'messagesProcessed',
      'averageProcessingTime',
      'processingErrors',
      'queueFullEvents',
      'timeSlicesReceived'
    ];
    
    for (const key of expectedKeys) {
      if (!(key in metrics)) {
        return { success: false, error: `Missing expected key: ${key}` };
      }
      if (typeof metrics[key] !== 'number') {
        return { success: false, error: `Key ${key} should be a number, got ${typeof metrics[key]}` };
      }
    }
    
    return {
      success: true,
      message: 'getProcessingMetrics returns object with correct structure',
      data: { keys: Object.keys(metrics) }
    };
  };

  const testGetProcessingMetricsIncludesAverage = () => {
    const facet = createStatisticsFacet();
    const metrics = facet.getProcessingMetrics();
    
    if (!('averageProcessingTime' in metrics)) {
      return { success: false, error: 'getProcessingMetrics should include averageProcessingTime' };
    }
    if (typeof metrics.averageProcessingTime !== 'number') {
      return { success: false, error: 'averageProcessingTime should be a number' };
    }
    
    return {
      success: true,
      message: 'getProcessingMetrics includes averageProcessingTime',
      data: { averageProcessingTime: metrics.averageProcessingTime }
    };
  };

  const testGetProcessingMetricsInitialAverage = () => {
    const facet = createStatisticsFacet();
    const metrics = facet.getProcessingMetrics();
    
    if (metrics.averageProcessingTime !== 0) {
      return { success: false, error: `Expected averageProcessingTime to be 0 initially, got ${metrics.averageProcessingTime}` };
    }
    
    return {
      success: true,
      message: 'getProcessingMetrics returns averageProcessingTime as 0 initially',
      data: { averageProcessingTime: metrics.averageProcessingTime }
    };
  };

  const testRecordAccepted = () => {
    const facet = createStatisticsFacet();
    
    facet._statistics.recordAccepted();
    const stats = facet.getStatistics();
    
    if (stats.messagesAccepted !== 1) {
      return { success: false, error: `Expected messagesAccepted to be 1, got ${stats.messagesAccepted}` };
    }
    
    // Record again
    facet._statistics.recordAccepted();
    const stats2 = facet.getStatistics();
    if (stats2.messagesAccepted !== 2) {
      return { success: false, error: `Expected messagesAccepted to be 2, got ${stats2.messagesAccepted}` };
    }
    
    return {
      success: true,
      message: 'recordAccepted increments messagesAccepted correctly',
      data: { messagesAccepted: stats2.messagesAccepted }
    };
  };

  const testRecordProcessed = () => {
    const facet = createStatisticsFacet();
    
    facet._statistics.recordProcessed();
    const stats = facet.getStatistics();
    
    if (stats.messagesProcessed !== 1) {
      return { success: false, error: `Expected messagesProcessed to be 1, got ${stats.messagesProcessed}` };
    }
    
    // Record again
    facet._statistics.recordProcessed();
    const stats2 = facet.getStatistics();
    if (stats2.messagesProcessed !== 2) {
      return { success: false, error: `Expected messagesProcessed to be 2, got ${stats2.messagesProcessed}` };
    }
    
    return {
      success: true,
      message: 'recordProcessed increments messagesProcessed correctly',
      data: { messagesProcessed: stats2.messagesProcessed }
    };
  };

  const testRecordProcessedAddsTime = () => {
    const facet = createStatisticsFacet();
    
    facet._statistics.recordProcessed(10.5);
    const stats = facet.getStatistics();
    
    if (stats.totalProcessingTime !== 10.5) {
      return { success: false, error: `Expected totalProcessingTime to be 10.5, got ${stats.totalProcessingTime}` };
    }
    
    // Record another with different time
    facet._statistics.recordProcessed(5.2);
    const stats2 = facet.getStatistics();
    if (stats2.totalProcessingTime !== 15.7) {
      return { success: false, error: `Expected totalProcessingTime to be 15.7, got ${stats2.totalProcessingTime}` };
    }
    
    return {
      success: true,
      message: 'recordProcessed adds to totalProcessingTime correctly',
      data: { totalProcessingTime: stats2.totalProcessingTime }
    };
  };

  const testRecordError = () => {
    const facet = createStatisticsFacet();
    
    facet._statistics.recordError();
    const stats = facet.getStatistics();
    
    if (stats.processingErrors !== 1) {
      return { success: false, error: `Expected processingErrors to be 1, got ${stats.processingErrors}` };
    }
    
    // Record again
    facet._statistics.recordError();
    const stats2 = facet.getStatistics();
    if (stats2.processingErrors !== 2) {
      return { success: false, error: `Expected processingErrors to be 2, got ${stats2.processingErrors}` };
    }
    
    return {
      success: true,
      message: 'recordError increments processingErrors correctly',
      data: { processingErrors: stats2.processingErrors }
    };
  };

  const testRecordQueueFull = () => {
    const facet = createStatisticsFacet();
    
    facet._statistics.recordQueueFull();
    const stats = facet.getStatistics();
    
    if (stats.queueFullEvents !== 1) {
      return { success: false, error: `Expected queueFullEvents to be 1, got ${stats.queueFullEvents}` };
    }
    
    // Record again
    facet._statistics.recordQueueFull();
    const stats2 = facet.getStatistics();
    if (stats2.queueFullEvents !== 2) {
      return { success: false, error: `Expected queueFullEvents to be 2, got ${stats2.queueFullEvents}` };
    }
    
    return {
      success: true,
      message: 'recordQueueFull increments queueFullEvents correctly',
      data: { queueFullEvents: stats2.queueFullEvents }
    };
  };

  const testRecordTimeSlice = () => {
    const facet = createStatisticsFacet();
    
    facet._statistics.recordTimeSlice();
    const stats = facet.getStatistics();
    
    if (stats.timeSlicesReceived !== 1) {
      return { success: false, error: `Expected timeSlicesReceived to be 1, got ${stats.timeSlicesReceived}` };
    }
    
    // Record again
    facet._statistics.recordTimeSlice();
    const stats2 = facet.getStatistics();
    if (stats2.timeSlicesReceived !== 2) {
      return { success: false, error: `Expected timeSlicesReceived to be 2, got ${stats2.timeSlicesReceived}` };
    }
    
    return {
      success: true,
      message: 'recordTimeSlice increments timeSlicesReceived correctly',
      data: { timeSlicesReceived: stats2.timeSlicesReceived }
    };
  };

  const testMultipleRecordings = () => {
    const facet = createStatisticsFacet();
    
    // Record various events
    facet._statistics.recordAccepted();
    facet._statistics.recordAccepted();
    facet._statistics.recordProcessed(10);
    facet._statistics.recordProcessed(20);
    facet._statistics.recordError();
    facet._statistics.recordQueueFull();
    facet._statistics.recordTimeSlice();
    
    const stats = facet.getStatistics();
    
    if (stats.messagesAccepted !== 2) {
      return { success: false, error: `Expected messagesAccepted to be 2, got ${stats.messagesAccepted}` };
    }
    if (stats.messagesProcessed !== 2) {
      return { success: false, error: `Expected messagesProcessed to be 2, got ${stats.messagesProcessed}` };
    }
    if (stats.totalProcessingTime !== 30) {
      return { success: false, error: `Expected totalProcessingTime to be 30, got ${stats.totalProcessingTime}` };
    }
    if (stats.processingErrors !== 1) {
      return { success: false, error: `Expected processingErrors to be 1, got ${stats.processingErrors}` };
    }
    if (stats.queueFullEvents !== 1) {
      return { success: false, error: `Expected queueFullEvents to be 1, got ${stats.queueFullEvents}` };
    }
    if (stats.timeSlicesReceived !== 1) {
      return { success: false, error: `Expected timeSlicesReceived to be 1, got ${stats.timeSlicesReceived}` };
    }
    
    return {
      success: true,
      message: 'Multiple recordings accumulate correctly',
      data: { stats }
    };
  };

  const testGetStatisticsReflectsEvents = () => {
    const facet = createStatisticsFacet();
    
    // Record events
    facet._statistics.recordAccepted();
    facet._statistics.recordProcessed(5);
    facet._statistics.recordError();
    
    const stats = facet.getStatistics();
    
    if (stats.messagesAccepted !== 1 || stats.messagesProcessed !== 1 || stats.processingErrors !== 1) {
      return { success: false, error: 'getStatistics should reflect all recorded events' };
    }
    
    // Record more events
    facet._statistics.recordAccepted();
    facet._statistics.recordProcessed(10);
    
    const stats2 = facet.getStatistics();
    if (stats2.messagesAccepted !== 2 || stats2.messagesProcessed !== 2) {
      return { success: false, error: 'getStatistics should reflect updated counts' };
    }
    
    return {
      success: true,
      message: 'getStatistics reflects all recorded events',
      data: { 
        initial: { accepted: stats.messagesAccepted, processed: stats.messagesProcessed },
        updated: { accepted: stats2.messagesAccepted, processed: stats2.messagesProcessed }
      }
    };
  };

  const testAverageProcessingTimeZero = () => {
    const facet = createStatisticsFacet();
    const metrics = facet.getProcessingMetrics();
    
    if (metrics.averageProcessingTime !== 0) {
      return { success: false, error: `Expected averageProcessingTime to be 0 when no messages, got ${metrics.averageProcessingTime}` };
    }
    
    // Also test via _statistics directly
    const avgTime = facet._statistics.getAverageProcessingTime();
    if (avgTime !== 0) {
      return { success: false, error: `Expected getAverageProcessingTime to return 0, got ${avgTime}` };
    }
    
    return {
      success: true,
      message: 'getAverageProcessingTime returns 0 when no messages processed',
      data: { averageProcessingTime: metrics.averageProcessingTime }
    };
  };

  const testAverageProcessingTimeCalculation = () => {
    const facet = createStatisticsFacet();
    
    // Process one message
    facet._statistics.recordProcessed(10);
    let metrics = facet.getProcessingMetrics();
    if (metrics.averageProcessingTime !== 10) {
      return { success: false, error: `Expected averageProcessingTime to be 10, got ${metrics.averageProcessingTime}` };
    }
    
    // Process more messages
    facet._statistics.recordProcessed(20);
    facet._statistics.recordProcessed(30);
    metrics = facet.getProcessingMetrics();
    const expectedAvg = (10 + 20 + 30) / 3;
    if (Math.abs(metrics.averageProcessingTime - expectedAvg) > 0.001) {
      return { success: false, error: `Expected averageProcessingTime to be ${expectedAvg}, got ${metrics.averageProcessingTime}` };
    }
    
    return {
      success: true,
      message: 'getAverageProcessingTime calculates correctly',
      data: { 
        averageProcessingTime: metrics.averageProcessingTime,
        expected: expectedAvg,
        messagesProcessed: metrics.messagesProcessed
      }
    };
  };

  const testConfigurationDebug = () => {
    const facet = createStatisticsFacet({ debug: true });
    
    if (!facet._statistics.isDebugEnabled()) {
      return { success: false, error: 'Debug flag from config should be passed to SubsystemStatistics' };
    }
    
    // Test with debug: false
    const facet2 = createStatisticsFacet({ debug: false });
    if (facet2._statistics.isDebugEnabled()) {
      return { success: false, error: 'Debug flag false should be passed to SubsystemStatistics' };
    }
    
    return {
      success: true,
      message: 'Configuration debug flag is passed to SubsystemStatistics',
      data: { 
        debugEnabled: facet._statistics.isDebugEnabled(),
        debugDisabled: facet2._statistics.isDebugEnabled()
      }
    };
  };

  const testStatisticsReset = () => {
    const facet = createStatisticsFacet();
    
    // Record some events
    facet._statistics.recordAccepted();
    facet._statistics.recordProcessed(10);
    facet._statistics.recordError();
    
    // Verify they're recorded
    let stats = facet.getStatistics();
    if (stats.messagesAccepted === 0) {
      return { success: false, error: 'Events should be recorded before reset test' };
    }
    
    // Reset
    facet._statistics.reset();
    
    // Verify all zeros
    stats = facet.getStatistics();
    if (stats.messagesAccepted !== 0 || stats.messagesProcessed !== 0 || stats.processingErrors !== 0) {
      return { success: false, error: 'Statistics should be reset to zeros' };
    }
    if (stats.totalProcessingTime !== 0) {
      return { success: false, error: 'totalProcessingTime should be reset to 0' };
    }
    
    return {
      success: true,
      message: 'Statistics reset clears all values',
      data: { statsAfterReset: stats }
    };
  };

  const testFullWorkflow = () => {
    const facet = createStatisticsFacet();
    
    // Initial state
    let stats = facet.getStatistics();
    if (stats.messagesAccepted !== 0) {
      return { success: false, error: 'Should start with zeros' };
    }
    
    // Record various events
    facet._statistics.recordAccepted();
    facet._statistics.recordAccepted();
    facet._statistics.recordProcessed(5);
    facet._statistics.recordProcessed(15);
    facet._statistics.recordError();
    facet._statistics.recordQueueFull();
    facet._statistics.recordTimeSlice();
    
    // Verify via getStatistics
    stats = facet.getStatistics();
    if (stats.messagesAccepted !== 2 || stats.messagesProcessed !== 2 || stats.processingErrors !== 1) {
      return { success: false, error: 'Statistics should reflect all recorded events' };
    }
    
    // Verify via getProcessingMetrics
    const metrics = facet.getProcessingMetrics();
    if (metrics.messagesAccepted !== 2 || metrics.messagesProcessed !== 2) {
      return { success: false, error: 'getProcessingMetrics should reflect recorded events' };
    }
    if (metrics.averageProcessingTime !== 10) {
      return { success: false, error: `Expected averageProcessingTime to be 10, got ${metrics.averageProcessingTime}` };
    }
    
    // Reset and verify
    facet._statistics.reset();
    stats = facet.getStatistics();
    if (stats.messagesAccepted !== 0) {
      return { success: false, error: 'Statistics should be reset' };
    }
    
    return {
      success: true,
      message: 'Full workflow: record events → getStatistics → getProcessingMetrics → reset works correctly',
      data: { 
        finalStats: stats,
        metricsBeforeReset: metrics
      }
    };
  };

  const runAllTests = () => {
    testCases.forEach(test => {
      if (!results.has(test.name) && !runningTests.has(test.name)) {
        runTest(test.name);
      }
    });
  };

  const clearResults = () => {
    setResults(new Map());
    setSelectedTest(null);
  };

  const selectedResult = selectedTest ? results.get(selectedTest) : null;
  const isRunning = selectedTest ? runningTests.has(selectedTest) : false;

  // Group tests by category
  const testsByCategory = testCases.reduce((acc, test) => {
    if (!acc[test.category]) {
      acc[test.category] = [];
    }
    acc[test.category].push(test);
    return acc;
  }, {});

  return (
    <div style={{ display: 'flex', height: '100%', gap: '16px' }}>
      {/* Side Panel */}
      <div style={{
        width: '300px',
        backgroundColor: '#f9fafb',
        borderRight: '1px solid #e5e7eb',
        padding: '16px',
        overflowY: 'auto'
      }}>
        <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px' }}>
          useStatistics Tests
        </h3>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          <button 
            onClick={runAllTests}
            style={{
              flex: 1,
              padding: '8px 16px',
              backgroundColor: '#3b82f6',
              color: 'white',
              borderRadius: '4px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = '#2563eb'}
            onMouseOut={(e) => e.target.style.backgroundColor = '#3b82f6'}
          >
            Run All
          </button>
          <button 
            onClick={clearResults}
            style={{
              flex: 1,
              padding: '8px 16px',
              backgroundColor: '#6b7280',
              color: 'white',
              borderRadius: '4px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = '#4b5563'}
            onMouseOut={(e) => e.target.style.backgroundColor = '#6b7280'}
          >
            Clear
          </button>
        </div>

        {/* Test Categories */}
        {Object.entries(testsByCategory).map(([category, tests]) => (
          <div key={category} style={{ marginBottom: '16px' }}>
            <h4 style={{ 
              fontSize: '12px', 
              fontWeight: '600', 
              color: '#6b7280',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginBottom: '8px'
            }}>
              {category}
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {tests.map((test, idx) => {
                const result = results.get(test.name);
                const isRunning = runningTests.has(test.name);
                const hasResult = results.has(test.name);
                const isSelected = selectedTest === test.name;
                
                let bgColor, borderColor, selectedBgColor, selectedBorderColor;
                if (isRunning) {
                  bgColor = '#fef3c7';
                  borderColor = '#fcd34d';
                  selectedBgColor = '#fde68a';
                  selectedBorderColor = '#fbbf24';
                } else if (hasResult) {
                  bgColor = result.success ? '#f0fdf4' : '#fef2f2';
                  borderColor = result.success ? '#86efac' : '#fca5a5';
                  selectedBgColor = result.success ? '#dcfce7' : '#fee2e2';
                  selectedBorderColor = result.success ? '#4ade80' : '#f87171';
                } else {
                  bgColor = '#f3f4f6';
                  borderColor = '#d1d5db';
                  selectedBgColor = '#e5e7eb';
                  selectedBorderColor = '#9ca3af';
                }
                
                return (
                  <button
                    key={idx}
                    onClick={() => {
                      setSelectedTest(test.name);
                      if (!hasResult && !isRunning) {
                        runTest(test.name);
                      }
                    }}
                    style={{
                      padding: '10px 12px',
                      textAlign: 'left',
                      backgroundColor: isSelected ? selectedBgColor : bgColor,
                      border: '2px solid',
                      borderColor: isSelected ? selectedBorderColor : borderColor,
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '13px',
                      color: '#111827',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontWeight: isSelected ? '600' : '400'
                    }}
                    onMouseOver={(e) => {
                      if (!isSelected) {
                        if (hasResult) {
                          e.target.style.backgroundColor = result.success ? '#dcfce7' : '#fee2e2';
                          e.target.style.borderColor = result.success ? '#4ade80' : '#f87171';
                        } else {
                          e.target.style.backgroundColor = '#e5e7eb';
                          e.target.style.borderColor = '#9ca3af';
                        }
                      }
                    }}
                    onMouseOut={(e) => {
                      if (!isSelected) {
                        e.target.style.backgroundColor = bgColor;
                        e.target.style.borderColor = borderColor;
                      }
                    }}
                  >
                    <span style={{ 
                      color: isRunning ? '#d97706' : (hasResult ? (result.success ? '#16a34a' : '#dc2626') : '#6b7280'),
                      fontWeight: 'bold',
                      fontSize: '14px'
                    }}>
                      {isRunning ? '⟳' : (hasResult ? (result.success ? '✓' : '✗') : '○')}
                    </span>
                    <span>{test.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Main Content Panel */}
      <div style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
        {selectedTest ? (
          <div>
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '16px' }}>
              {selectedTest}
            </h2>
            
            {isRunning ? (
              <div style={{
                padding: '16px',
                backgroundColor: '#fef3c7',
                border: '2px solid #fcd34d',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span style={{ fontSize: '20px' }}>⟳</span>
                <span>Running test...</span>
              </div>
            ) : selectedResult && selectedResult.success ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{
                  padding: '12px',
                  backgroundColor: '#f0fdf4',
                  border: '2px solid #86efac',
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <span style={{ color: '#16a34a', fontWeight: 'bold', fontSize: '20px' }}>✓</span>
                  <span style={{ color: '#16a34a', fontWeight: '600' }}>Test Passed</span>
                </div>
                <div>
                  <h3 style={{ fontWeight: 'bold', marginBottom: '8px', fontSize: '16px' }}>Message:</h3>
                  <div style={{
                    backgroundColor: '#f3f4f6',
                    padding: '12px',
                    borderRadius: '4px',
                    fontSize: '14px',
                    border: '1px solid #e5e7eb'
                  }}>
                    {selectedResult.message}
                  </div>
                </div>
                {selectedResult.data && Object.keys(selectedResult.data).length > 0 && (
                  <div>
                    <h3 style={{ fontWeight: 'bold', marginBottom: '8px', fontSize: '16px' }}>Data:</h3>
                    <pre style={{
                      backgroundColor: '#f3f4f6',
                      padding: '16px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      overflow: 'auto',
                      border: '1px solid #e5e7eb'
                    }}>
                      {JSON.stringify(selectedResult.data, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            ) : selectedResult ? (
              <div style={{
                padding: '16px',
                backgroundColor: '#fef2f2',
                border: '2px solid #fca5a5',
                borderRadius: '4px',
                color: '#dc2626'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <span style={{ fontWeight: 'bold', fontSize: '20px' }}>✗</span>
                  <strong>Test Failed</strong>
                </div>
                <div style={{ marginBottom: '8px' }}>
                  <strong>Error:</strong> {selectedResult.error}
                </div>
                {selectedResult.stack && (
                  <details style={{ marginTop: '8px' }}>
                    <summary style={{ cursor: 'pointer', fontWeight: '500' }}>Stack Trace</summary>
                    <pre style={{
                      marginTop: '8px',
                      padding: '8px',
                      backgroundColor: '#fee2e2',
                      borderRadius: '4px',
                      fontSize: '11px',
                      overflow: 'auto'
                    }}>
                      {selectedResult.stack}
                    </pre>
                  </details>
                )}
              </div>
            ) : (
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                height: '200px',
                color: '#6b7280'
              }}>
                <p>Click the test name to run it</p>
              </div>
            )}
          </div>
        ) : (
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            height: '100%',
            color: '#6b7280'
          }}>
            <p>Select a test from the side panel to view results</p>
          </div>
        )}
      </div>
    </div>
  );
}







