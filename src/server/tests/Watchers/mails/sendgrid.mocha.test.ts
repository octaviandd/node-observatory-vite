import { describe, it, before, after } from "mocha";
import { expect } from "chai";
import request from "supertest";

import { BaseMailTest } from "./base-mail";
import sgMail from '@sendgrid/mail';

describe('SendGrid Tests', function(this: any) {
  this.timeout(5000);
  
  const baseTest = new BaseMailTest();
  
  before(async function() {
    await baseTest.setup();
    
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    
    // Define test routes for SendGrid
    baseTest.app.get('/test-sendgrid', async (req, res) => {
      try {
        await sgMail.send({
          to: 'octaviandd@yahoo.com',
          from: 'octavian.davidd@gmail.com',
          subject: 'SendGrid Test',
          text: 'This is a test email from SendGrid',
          html: '<p>This is a test email from SendGrid</p>'
        });

        res.send('SendGrid mail sent');
      } catch (error) {
        res.status(500).send('Mail error');
      }
    });

    // Add route for Bull queue mail test
    baseTest.app.get('/test-sendgrid-bull-queue', async (req, res) => {
      // Add job to queue
      await baseTest.mailQueue.add('send-sendgrid-mail', {
        to: 'octaviandd@yahoo.com',
        from: 'octavian.davidd@gmail.com',
        subject: 'SendGrid Bull Queue Email',
        text: 'This is an email sent from a Bull queue job',
        html: '<p>This is an email sent from a Bull queue job</p>'
      });

      res.send('SendGrid Bull queue mail job added');
    });

    // Process jobs in the queue
    baseTest.mailQueue.process('send-sendgrid-mail', async (job) => {
      const { data } = job;
      await sgMail.send(data);
      return { success: true };
    });
  });
  
  after(async function() {
    await baseTest.teardown();
  });
  
  it('should track emails sent with SendGrid', async function() {
    await request(baseTest.app).get('/test-sendgrid');
    
    await baseTest.waitForDataPersistence();
    
    const results = await baseTest.getMailResults();
    
    const sendgridMail = results.find((r: any) => 
      r.content.subject === 'SendGrid Test'
    );
    
    expect(sendgridMail).to.exist;
    expect(sendgridMail.content.from).to.include('octavian.davidd@gmail.com');
    expect(sendgridMail.content.to).to.include('octaviandd@yahoo.com');
  });
  
  it('should track emails sent through Bull queue with SendGrid', async function() {
    await request(baseTest.app).get('/test-sendgrid-bull-queue');
    
    // Wait longer for the queue to process the job
    await baseTest.waitForDataPersistence(4000);
    
    const results = await baseTest.getMailResults();
    
    const bullQueueMail = results.find((r: any) => 
      r.content.subject === 'SendGrid Bull Queue Email' && 
      r.content.from === 'octavian.davidd@gmail.com'
    );
    
    expect(bullQueueMail).to.exist;
    expect(bullQueueMail.content.to).to.include('octaviandd@yahoo.com');
  });
});
