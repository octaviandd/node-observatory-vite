// import { describe, it, before, after } from "mocha";
// import { expect } from "chai";
// import request from "supertest";

// import { BaseMailTest } from "./base-mail";
// const postmark = require("postmark");

// describe('Postmark Tests', function(this: any) {
//   this.timeout(5000);
  
//   const baseTest = new BaseMailTest();
//   let postmarkClient: any;
  
//   before(async function() {
//     await baseTest.setup();
//     try {
//       postmarkClient = new postmark.ServerClient(process.env.POSTMARK_API_KEY);
//     } catch (error: any) {
//       console.error('Email error:', error);
//       console.error(error.message);
//     }
    
//     // Define test routes for Postmark
//     baseTest.app.get('/test-postmark', async (req, res) => {
//       try {
//         await postmarkClient.sendEmail({
//           From: 'octavian.davidd@gmail.com',
//           To: 'octaviandd@yahoo.com',
//           Subject: 'Postmark Test',
//           TextBody: 'This is a test email from Postmark',
//           HtmlBody: '<p>This is a test email from Postmark</p>'
//         });

//         res.send('Postmark mail sent');
//       } catch (error) {
//         res.status(500).send('Mail error');
//       }
//     });
    
//     // Add route for Bull queue mail test
//     baseTest.app.get('/test-postmark-bull-queue', async (req, res) => {
//       // Add job to queue
//       await baseTest.mailQueue.add('send-postmark-mail', {
//         From: 'bull-queue@example.com',
//         To: 'recipient@example.com',
//         Subject: 'Postmark Bull Queue Email',
//         TextBody: 'This is an email sent from a Bull queue job',
//         HtmlBody: '<p>This is an email sent from a Bull queue job</p>'
//       });
      
//       res.send('Postmark Bull queue mail job added');
//     });
    
//     // Process jobs in the queue
//     baseTest.mailQueue.process('send-postmark-mail', async (job) => {
//       const { data } = job;
//       await postmarkClient.sendEmail(data);
//       return { success: true };
//     });
//   });
  
//   after(async function() {
//     await baseTest.teardown();
//   });
  
//   it('should track emails sent with Postmark', async function() {
//     await request(baseTest.app).get('/test-postmark');
    
//     await baseTest.waitForDataPersistence();
    
//     const results = await baseTest.getMailResults();
    
//     const postmarkMail = results.find((r: any) => 
//       r.content.subject === 'Postmark Test'
//     );
    
//     expect(postmarkMail).to.exist;
//     expect(postmarkMail.content.from).to.include('octavian.davidd@gmail.com');
//     expect(postmarkMail.content.to).to.include('octaviandd@yahoo.com');
//   });
  
//   it('should track emails sent through Bull queue with Postmark', async function() {
//     await request(baseTest.app).get('/test-postmark-bull-queue');
    
//     // Wait longer for the queue to process the job
//     await baseTest.waitForDataPersistence(2000);
    
//     const results = await baseTest.getMailResults();
    
//     const bullQueueMail = results.find((r: any) => 
//       r.content.subject === 'Postmark Bull Queue Email' && 
//       r.content.from === 'bull-queue@example.com'
//     );
    
//     expect(bullQueueMail).to.exist;
//     expect(bullQueueMail.content.body).to.include('This is an email sent from a Bull queue job');
//   });
// });
