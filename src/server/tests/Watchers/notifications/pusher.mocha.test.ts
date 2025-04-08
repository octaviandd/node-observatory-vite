import { describe, it, before, after } from "mocha";
import { expect } from "chai";
import request from "supertest";

import { BaseNotificationsTest } from "./base-notifications";
import Pusher from "pusher";

describe('Pusher Notifications Tests', function(this: any) {
  this.timeout(5000);
  
  const baseTest = new BaseNotificationsTest();
  let pusher: Pusher;
  
  before(async function() {
    await baseTest.setup();
    
    // Initialize Pusher client
    pusher = new Pusher({
      appId: process.env.PUSHER_APP_ID,
      key: process.env.PUSHER_KEY,
      secret: process.env.PUSHER_SECRET,
      cluster: process.env.PUSHER_CLUSTER,
    });
    
    // Define test routes for Pusher notifications
    baseTest.app.get('/test-pusher-info', async (req, res) => {
      const notificationData = {
        title: 'Info Notification via Pusher',
        message: 'This is an info notification sent via Pusher',
        type: 'info',
        timestamp: new Date().toISOString()
      };
      
      try {
        await pusher.trigger('notifications', 'info-event', 'test');
        res.send('Pusher info notification sent');
      } catch (error) {
        console.error('Pusher error:', error);
        res.status(500).send('Failed to send Pusher notification');
      }
    });
    
    baseTest.app.get('/test-pusher-error', async (req, res) => {
      const notificationData = {
        title: 'Error Notification via Pusher',
        message: 'This is an error notification sent via Pusher',
        type: 'error',
        timestamp: new Date().toISOString()
      };
      
      // Send via Pusher with invalid channel name to force error
      try {
        await pusher.trigger('', 'error-event', notificationData); // Empty channel name will cause error
        res.send('Pusher error notification sent');
      } catch (error) {
        console.error('Pusher error:', error);
        res.status(500).send('Failed to send Pusher notification');
      }
    });
    
    // Add route for Bull queue notification test
    baseTest.app.get('/test-pusher-bull-queue', async (req, res) => {
      // Add job to queue
      await baseTest.notificationQueue.add('send-pusher-notification', {
        title: 'Queue Notification via Pusher',
        message: 'This is a notification from a Bull queue job via Pusher',
        type: 'info',
        channel: 'notifications',
        event: 'queue-event'
      });
      
      res.send('Pusher Bull queue notification job added');
    });
    
    // Process jobs in the queue
    baseTest.notificationQueue.process('send-pusher-notification', async (job) => {
      const { data } = job;
      
      await pusher.trigger(data.channel, data.event, data);
      return { success: true };
    });
  });
  
  after(async function() {
    await baseTest.teardown();
  });
  
  it('should track info notifications sent via Pusher', async function() {
    await request(baseTest.app).get('/test-pusher-info');
    
    await baseTest.waitForDataPersistence();
    
    const results = await baseTest.getNotificationResults();
    
    const infoNotification = results.find((r: any) => 
      r.content.event === 'info-event'
    );
    
    expect(infoNotification).to.exist;
    expect(infoNotification.request_id).to.exist;
  });
  
  it('should track error notifications sent via Pusher', async function() {
    await request(baseTest.app).get('/test-pusher-error');
    
    await baseTest.waitForDataPersistence();
    
    const results = await baseTest.getNotificationResults('failed');

    const errorNotification = results.find((r: any) => 
      r.content.status === 'failed'
    );
    
    expect(errorNotification).to.exist;
    expect(errorNotification.request_id).to.exist;
  });
  
  it('should track notifications sent through Bull queue with Pusher', async function() {
    await request(baseTest.app).get('/test-pusher-bull-queue');
    
    // Wait longer for the queue to process the job
    await baseTest.waitForDataPersistence(3000);
    
    const results = await baseTest.getNotificationResults();
    
    const queueNotification = results.find((r: any) => 
      r.content.event === 'queue-event'
    );
    
    expect(queueNotification).to.exist;
    expect(queueNotification.job_id).to.exist;
  });
}); 