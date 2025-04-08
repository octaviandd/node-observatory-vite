import { describe, it, before, after } from "mocha";
import { expect } from "chai";
import request from "supertest";

import { BaseNotificationsTest } from "./base-notifications";
import * as Ably from "ably";

describe('Ably Notifications Tests', function(this: any) {
  this.timeout(10000); // Increased timeout for Ably operations
  
  const baseTest = new BaseNotificationsTest();
  let ablyRest: Ably.Rest;
  let ablyRealtime: Ably.Realtime;
  
  before(async function() {
    await baseTest.setup();
    
    // Initialize Ably clients
    ablyRest = new Ably.Rest({
      key: process.env.ABLY_API_KEY,
    });

    ablyRealtime = new Ably.Realtime({
      key: process.env.ABLY_API_KEY,
      clientId: 'test-client'
    });
    
    // Define test routes for Ably Rest notifications
    baseTest.app.get('/test-ably-rest-info', async (req, res) => {
      const notificationData = {
        title: 'Info Notification via Ably Rest',
        message: 'This is an info notification sent via Ably Rest',
        type: 'info',
        timestamp: new Date().toISOString()
      };
      
      // Send via Ably Rest
      try {
        const channel = ablyRest.channels.get('notifications');
        await channel.publish('info-event', notificationData);
        res.send('Ably Rest info notification sent');
      } catch (error) {
        console.error('Ably Rest error:', error);
        res.status(500).send('Failed to send Ably Rest notification');
      }
    });
    
    // Test with error to trigger error handling
    baseTest.app.get('/test-ably-rest-error', async (req, res) => {
      const notificationData = {
        title: 'Error Notification via Ably Rest',
        message: 'This is an error notification sent via Ably Rest',
        type: 'error',
        timestamp: new Date().toISOString()
      };
      
      // Send via Ably Rest with invalid channel name to force error
      try {
        const channel = ablyRest.channels.get('');  // Empty channel name will cause error
        await channel.publish('error-event', notificationData);
        res.send('Ably Rest error notification sent');
      } catch (error) {
        console.error('Ably Rest error:', error);
        res.status(500).send('Failed to send Ably Rest notification');
      }
    });
    
    // Define test routes for Ably Realtime notifications
    baseTest.app.get('/test-ably-realtime-info', async (req, res) => {
      const notificationData = {
        title: 'Info Notification via Ably Realtime',
        message: 'This is an info notification sent via Ably Realtime',
        type: 'info',
        timestamp: new Date().toISOString()
      };
      
      // Send via Ably Realtime
      try {
        const channel = ablyRealtime.channels.get('notifications');
        
        // Use Promise to handle the publish
        await channel.publish('info-event', notificationData);
        
        res.send('Ably Realtime info notification sent');
      } catch (error) {
        console.error('Ably Realtime error:', error);
        res.status(500).send('Failed to send Ably Realtime notification');
      }
    });
    
    // Test with error to trigger error handling for Realtime
    baseTest.app.get('/test-ably-realtime-error', async (req, res) => {
      const notificationData = {
        title: 'Error Notification via Ably Realtime',
        message: 'This is an error notification sent via Ably Realtime',
        type: 'error',
        timestamp: new Date().toISOString()
      };
      
      // Send via Ably Realtime with invalid channel name to force error
      try {
        const channel = ablyRealtime.channels.get('');  // Empty channel name will cause error
        
        // Use Promise to handle the publish
        await channel.publish('error-event', notificationData);
        res.send('Ably Realtime error notification sent');
      } catch (error) {
        console.error('Ably Realtime error:', error);
        res.status(500).send('Failed to send Ably Realtime notification');
      }
    });
    
    // Add route for Bull queue notification test with Rest
    baseTest.app.get('/test-ably-rest-bull-queue', async (req, res) => {
      // Add job to queue
      await baseTest.notificationQueue.add('send-ably-rest-notification', {
        title: 'Queue Notification via Ably Rest',
        message: 'This is a notification from a Bull queue job via Ably Rest',
        type: 'success',
        channelName: 'notifications',
        eventName: 'queue-event'
      });
      
      res.send('Ably Rest Bull queue notification job added');
    });
    
    // Add route for Bull queue notification test with Realtime
    baseTest.app.get('/test-ably-realtime-bull-queue', async (req, res) => {
      // Add job to queue
      await baseTest.notificationQueue.add('send-ably-realtime-notification', {
        title: 'Queue Notification via Ably Realtime',
        message: 'This is a notification from a Bull queue job via Ably Realtime',
        type: 'success',
        channelName: 'notifications',
        eventName: 'queue-event'
      });
      
      res.send('Ably Realtime Bull queue notification job added');
    });
    
    // Process jobs in the queue for Rest
    baseTest.notificationQueue.process('send-ably-rest-notification', async (job) => {
      const { data } = job;
      
      // Send via Ably Rest
      const channel = ablyRest.channels.get(data.channelName);
      await channel.publish(data.eventName, data);
      return { success: true };
    });
    
    // Process jobs in the queue for Realtime
    baseTest.notificationQueue.process('send-ably-realtime-notification', async (job) => {
      const { data } = job;
      
      // Send via Ably Realtime
      const channel = ablyRealtime.channels.get(data.channelName);
      
      // Use Promise to handle the publish
      await channel.publish(data.eventName, data);
      return { success: true };
    });
  });
  
  after(async function() {
    // Close the Realtime connection
    if (ablyRealtime && ablyRealtime.close) {
      ablyRealtime.close();
    }
    
    await baseTest.teardown();
  });
  
  it('should track info notifications sent via Ably Rest', async function() {
    await request(baseTest.app).get('/test-ably-rest-info');
    
    await baseTest.waitForDataPersistence(2000);
    
    const results = await baseTest.getNotificationResults();
    
    const infoNotification = results.find((r: any) => 
      r.content.type === 'publish' && 
      r.content.event === 'info-event' &&
      r.content.data
    );
    
    expect(infoNotification).to.exist;
    expect(infoNotification.content.status).to.equal('completed');
    expect(infoNotification.request_id).to.exist;
  });
  
  it('should track error notifications sent via Ably Rest', async function() {
    await request(baseTest.app).get('/test-ably-rest-error');
    
    await baseTest.waitForDataPersistence(2000);
    
    const results = await baseTest.getNotificationResults('failed');
    
    const errorNotification = results.find((r: any) => 
      r.content.type === 'publish' && 
      r.content.event === 'error-event' &&
      r.content.status === 'failed'
    );
    
    expect(errorNotification).to.exist;
    expect(errorNotification.content.error).to.exist;
    expect(errorNotification.request_id).to.exist;
  });
  
  it('should track info notifications sent via Ably Realtime', async function() {
    await request(baseTest.app).get('/test-ably-realtime-info');
    
    await baseTest.waitForDataPersistence(2000);
    
    const results = await baseTest.getNotificationResults();
    
    const infoNotification = results.find((r: any) => 
      r.content.type === 'publish' && 
      r.content.event === 'info-event' &&
      r.content.data
    );    
    
    expect(infoNotification).to.exist;
    expect(infoNotification.content.status).to.equal('completed');
  });
  
  it('should track error notifications sent via Ably Realtime', async function() {
    await request(baseTest.app).get('/test-ably-realtime-error');
    
    await baseTest.waitForDataPersistence(2000);
    
    const results = await baseTest.getNotificationResults('failed');
    
    const errorNotification = results.find((r: any) => 
      r.content.type === 'publish' && 
      r.content.event === 'error-event' &&
      r.content.status === 'failed'
    );
    
    expect(errorNotification).to.exist;
    expect(errorNotification.content.error).to.exist;
    expect(errorNotification.request_id).to.exist;
  });
  
  it('should track notifications sent through Bull queue with Ably Rest', async function() {
    await request(baseTest.app).get('/test-ably-rest-bull-queue');
    
    // Wait longer for the queue to process the job
    await baseTest.waitForDataPersistence(2000);
    
    const results = await baseTest.getNotificationResults();
    
    const queueNotification = results.find((r: any) => 
      r.content.type === 'publish' && 
      r.content.event === 'queue-event' &&
      r.content.data
    );
    
    expect(queueNotification).to.exist;
    expect(queueNotification.content.status).to.equal('completed');
    expect(queueNotification.job_id).to.exist;
  });
  
  it('should track notifications sent through Bull queue with Ably Realtime', async function() {
    await request(baseTest.app).get('/test-ably-realtime-bull-queue');
    
    // Wait longer for the queue to process the job
    await baseTest.waitForDataPersistence(3000);
    
    const results = await baseTest.getNotificationResults();
    
    const queueNotification = results.find((r: any) => 
      r.content.type === 'publish' && 
      r.content.event === 'queue-event' &&
      r.content.data
    );
    
    expect(queueNotification).to.exist;
    expect(queueNotification.content.status).to.equal('completed');
    expect(queueNotification.job_id).to.exist;
  });
}); 