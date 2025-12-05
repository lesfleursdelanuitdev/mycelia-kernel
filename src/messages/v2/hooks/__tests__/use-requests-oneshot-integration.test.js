/**
 * Integration Tests for One-Shot Request Pattern
 * 
 * Tests the complete one-shot request/response flow:
 * 1. Requester sends message with replyTo
 * 2. Responder receives message and sends response
 * 3. Requester receives response on temporary route
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MessageSystem } from '../../models/message-system/message-system.v2.mycelia.js';
import { BaseSubsystem } from '../../models/base-subsystem/base.subsystem.mycelia.js';
import { createCanonicalDefaultHooks } from '../../models/defaults/default-hooks.mycelia.js';

describe('One-Shot Request Integration', () => {
  let messageSystem;
  let requester;
  let responder;

  beforeEach(async () => {
    // Create message system with debug enabled (needed to access kernel)
    messageSystem = new MessageSystem('test', { debug: true });
    await messageSystem.bootstrap();

    // Get access control for wiring identities  
    const kernel = messageSystem.api;
    const accessControl = kernel?.getAccessControl();

    // Create requester subsystem
    class TestSubsystem extends BaseSubsystem {
      constructor(name, ms) {
        const defaultHooks = createCanonicalDefaultHooks().list();
        super(name, { ms, defaultHooks });
      }
    }

    requester = new TestSubsystem('requester', messageSystem);
    await requester.build();
    await messageSystem.registerSubsystem(requester);
    
    // Wire identity
    if (accessControl) {
      accessControl.createResource(requester, 'requester-resource', requester);
    }

    responder = new TestSubsystem('responder', messageSystem);
    await responder.build();
    await messageSystem.registerSubsystem(responder);
    
    // Wire identity
    if (accessControl) {
      accessControl.createResource(responder, 'responder-resource', responder);
    }

    // Check identities
    console.log('Requester has identity:', !!requester.identity);
    console.log('Responder has identity:', !!responder.identity);
    
    // START THE SCHEDULER! Messages won't be processed without it
    const globalScheduler = messageSystem.find('globalScheduler');
    if (globalScheduler) {
      globalScheduler.start();
      console.log('Global scheduler started');
    } else {
      console.log('WARNING: No global scheduler found');
    }
  });

  afterEach(async () => {
    if (messageSystem) {
      // Stop scheduler before disposing
      const globalScheduler = messageSystem.find('globalScheduler');
      if (globalScheduler) {
        globalScheduler.stop();
      }
      await messageSystem.dispose();
    }
  });

  it('should complete one-shot request with proper response', async () => {
    // Get facets
    const requesterMessages = requester.find('messages');
    const requesterRequests = requester.find('requests');
    const responderResponses = responder.find('responses');

    expect(requesterMessages).toBeDefined();
    expect(requesterRequests).toBeDefined();
    expect(responderResponses).toBeDefined();

    // Capture kernel and messageSystem in closure for handler
    const kernel = messageSystem.getKernel();

    // Register handler on responder that sends a proper response
    responder.registerRoute('responder://test', async (msg) => {
      console.log('Handler called! Message ID:', msg.getId());
      
      // Query ResponseManager from the kernel
      const responseManager = kernel.getResponseManager();
      console.log('ResponseManager found:', !!responseManager);
      
      if (!responseManager) {
        throw new Error('ResponseManager not found');
      }

      // Get the replyTo path using the message ID as correlation ID
      const replyTo = responseManager.getReplyTo(msg.getId());
      console.log('ReplyTo path:', replyTo);
      
      if (!replyTo) {
        throw new Error(`No replyTo found for message ${msg.getId()}`);
      }

      // Send response to the replyTo path
      console.log('Sending response to:', replyTo);
      await responderResponses.sendResponse({
        path: replyTo,
        inReplyTo: msg.getId(),
        payload: { result: 'success', echo: msg.getBody() }
      });
      console.log('Response sent!');
    });

    // Create message
    const msg = requesterMessages.create('responder://test', { data: 123 });

    console.log('Sending one-shot request for message:', msg.getId());
    console.log('Message path:', msg.getPath());

    // Send one-shot request
    const promise = requesterRequests
      .oneShot()
      .with({ 
        handler: async (resp) => {
          console.log('Response handler called with:', resp.getBody());
          return resp.getBody();
        },
        timeout: 2000 
      })
      .forMessage(msg)
      .send();

    console.log('Request sent, waiting for response...');

    // Wait for response
    const result = await promise;
    
    console.log('Got result:', result);

    expect(result).toBeDefined();
    expect(result.result).toBe('success');
    expect(result.echo).toEqual({ data: 123 });
  });

  it('should timeout if no response is sent', async () => {
    const requesterMessages = requester.find('messages');
    const requesterRequests = requester.find('requests');

    // Register handler that doesn't send a response
    responder.registerRoute('responder://no-response', async (msg) => {
      // Do nothing - no response sent
      console.log('Handler called but not sending response');
    });

    const msg = requesterMessages.create('responder://no-response', { data: 456 });

    // Should timeout
    await expect(
      requesterRequests
        .oneShot()
        .with({ 
          handler: async (resp) => resp.getBody(),
          timeout: 500 
        })
        .forMessage(msg)
        .send()
    ).rejects.toThrow(/timed out/i);
  });

  it('should handle multiple concurrent one-shot requests', async () => {
    const requesterMessages = requester.find('messages');
    const requesterRequests = requester.find('requests');
    const responderResponses = responder.find('responses');

    // Capture kernel in closure for handler
    const kernel = messageSystem.getKernel();

    // Register handler
    responder.registerRoute('responder://concurrent', async (msg) => {
      // Query ResponseManager from kernel
      const responseManager = kernel.getResponseManager();
      if (!responseManager) {
        throw new Error('ResponseManager not found');
      }

      const replyTo = responseManager.getReplyTo(msg.getId());
      if (!replyTo) {
        throw new Error('No replyTo found');
      }

      await responderResponses.sendResponse({
        path: replyTo,
        inReplyTo: msg.getId(),
        payload: { result: 'success', id: msg.getBody().id }
      });
    });

    // Send 5 concurrent requests
    const promises = [];
    for (let i = 0; i < 5; i++) {
      const msg = requesterMessages.create('responder://concurrent', { id: i });
      const promise = requesterRequests
        .oneShot()
        .with({ 
          handler: async (resp) => resp.getBody(),
          timeout: 2000 
        })
        .forMessage(msg)
        .send();
      promises.push(promise);
    }

    const results = await Promise.all(promises);

    expect(results).toHaveLength(5);
    results.forEach((result, i) => {
      expect(result.result).toBe('success');
      expect(result.id).toBe(i);
    });
  });
});

