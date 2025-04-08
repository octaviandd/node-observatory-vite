import { describe, it, before, after } from "mocha";
import { expect } from "chai";
import request from "supertest";

import { BaseMailTest } from "./base-mail";
import nodemailer from "nodemailer";

describe('Nodemailer Tests', function(this: any) {
  this.timeout(5000); // Increased timeout for queue processing
  
  const baseTest = new BaseMailTest();
  let testMailer: any;
  
  before(async function() {
    await baseTest.setup();
    
    testMailer = nodemailer.createTransport({
      jsonTransport: true // This is a special transport that doesn't actually send emails
    });
    
    // Define test routes for Nodemailer
    baseTest.app.get('/test-nodemailer', async (req, res) => {
      try {
        await testMailer.sendMail({
          from: '"Maddison Foo Koch 👻" <maddison53@ethereal.email>',
          to: "octavian.davidd@gmail.com",
          subject: 'Nodemailer Test',
          text: 'This is a test email from Nodemailer',
          html: '<p>This is a test email from Nodemailer</p>'
        });
        res.send('Nodemailer mail sent');
      } catch (error) {
        res.status(500).send('Mail error');
      }
    });
    
    baseTest.app.get('/test-mail-error', async (req, res) => {
      try {
        // Force an error by using an invalid transport
        const invalidTransport = nodemailer.createTransport({
          host: 'nonexistent.example.com',
          port: 25,
          secure: false
        });
        
        await invalidTransport.sendMail({
          from: 'test@example.com',
          to: 'recipient@example.com',
          subject: 'Error Email',
          text: 'This should fail'
        });
      } catch (error) {
        // The error will be caught by the patcher
        res.status(500).send('Mail error');
        return;
      }
      
      res.send('Mail sent (should not happen)');
    });
    
    baseTest.app.get('/test-mail-in-job', async (req, res) => {
      // Simulate sending mail in a background job
      setTimeout(async () => {
        try {
          await testMailer.sendMail({
            from: 'job@example.com',
            to: 'recipient@example.com',
            subject: 'Job Email',
            text: 'This is an email sent from a background job',
            html: '<p>This is an email sent from a background job</p>'
          });
        } catch (error) {
          console.error('Error sending mail in job:', error);
        }
      }, 500);
      
      res.send('Mail job scheduled');
    });
    
    // Add route for Bull queue mail test
    baseTest.app.get('/test-bull-queue-mail', async (req, res) => {
      try {
        // Add job to queue
        await baseTest.mailQueue.add('send-mail', {
          from: '"Maddison Foo Koch 👻" <maddison53@ethereal.email>',
        to: "octavian.davidd@gmail.com",
        subject: 'Bull Queue Email',
        text: 'This is an email sent from a Bull queue job',
        html: '<p>This is an email sent from a Bull queue job</p>'
      });
      
        res.send('Bull queue mail job added');
      } catch (error) {
        console.error('Error adding mail job to queue:', error);
        res.status(500).send('Mail error');
      }
    });
    
    // Process jobs in the queue
    baseTest.mailQueue.process('send-mail', async (job) => {
      const { data } = job;
      await testMailer.sendMail(data);
      return { success: true };
    });
  });
  
  after(async function() {
    await baseTest.teardown();
  });
  
  it('should track emails sent with Nodemailer', async function() {
    await request(baseTest.app).get('/test-nodemailer');
    
    await baseTest.waitForDataPersistence();
    
    const results = await baseTest.getMailResults();
    
    const nodemailerMail = results.find((r: any) => 
      r.content.subject === 'Nodemailer Test'
    );
    
    expect(nodemailerMail).to.exist;
    expect(nodemailerMail.content.from).to.equal('"Maddison Foo Koch 👻" <maddison53@ethereal.email>');
    expect(nodemailerMail.content.to).to.include('octavian.davidd@gmail.com');
    expect(nodemailerMail.content.body).to.equal('<p>This is a test email from Nodemailer</p>');
  });
  
  it('should filter mails by status', async function() {
    // Generate successful mail
    await request(baseTest.app).get('/test-nodemailer');
    
    // Generate error mail
    await request(baseTest.app).get('/test-mail-error').expect(500);
    
    await baseTest.waitForDataPersistence();
    
    // Get only successful mails
    const successResults = await baseTest.getMailResults('finished');
    
    // Verify we have successful mails
    expect(successResults.length).to.be.at.least(1);
    expect(successResults[0].content.event).to.equal('SUCCESS');
    
    // Get only failed mails
    const failedResults = await baseTest.getMailResults('failed');

    // Verify we have failed mails
    expect(failedResults.length).to.be.at.least(1);
    expect(failedResults[0].content.event).to.equal('ERROR');
  });
  
  it('should retrieve mail details using handleViewSQL', async function() {
    await request(baseTest.app).get('/test-nodemailer');
    
    await baseTest.waitForDataPersistence();
    
    const results = await baseTest.getMailResults('finished');
    const mailId = results[0].uuid;
    
    const mailData = await baseTest.getMailDetails(mailId);
    
    expect(mailData).to.have.property('mail');
    expect(mailData.mail[0].type).to.equal('mail');
    expect(mailData.mail[0].content.from).to.equal('"Maddison Foo Koch 👻" <maddison53@ethereal.email>');
    expect(mailData.mail[0].content.to).to.include('octavian.davidd@gmail.com');
    expect(mailData.mail[0].content.subject).to.equal('Nodemailer Test');
  });
  
  it('should track emails sent in setTimeout jobs', async function() {
    await request(baseTest.app).get('/test-mail-in-job');
    
    await baseTest.waitForDataPersistence(3000);
    
    const results = await baseTest.getMailResults();
    
    const jobMail = results.find((r: any) => 
      r.content.subject === 'Job Email' && r.content.from === 'job@example.com'
    );
    
    expect(jobMail).to.exist;
    expect(jobMail.content.body).to.equal('<p>This is an email sent from a background job</p>');
  });
  
  it('should track emails sent through Bull queue', async function() {
    await request(baseTest.app).get('/test-bull-queue-mail');
    
    // Wait longer for the queue to process the job
    await baseTest.waitForDataPersistence(2000);
    
    const results = await baseTest.getMailResults();
    
    const bullQueueMail = results.find((r: any) => 
      r.content.subject === 'Bull Queue Email' && 
      r.content.from === '"Maddison Foo Koch 👻" <maddison53@ethereal.email>'
    );
    
    expect(bullQueueMail).to.exist;
    expect(bullQueueMail.content.body).to.equal('<p>This is an email sent from a Bull queue job</p>');
  });
});
