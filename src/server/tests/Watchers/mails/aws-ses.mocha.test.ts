import { describe, it, before, after } from "mocha";
import { expect } from "chai";
import request from "supertest";

delete require.cache[require.resolve('@aws-sdk/client-ses')];

import { BaseMailTest } from "./base-mail";
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

describe('AWS SES Tests', function(this: any) {
  this.timeout(5000);
  
  const baseTest = new BaseMailTest();
  let sesClient: SESClient;
  
  before(async function() {
    await baseTest.setup();
    
    try {
      sesClient = new SESClient({
        region: process.env.AWS_SES_REGION,
        credentials: {
          accessKeyId: process.env.AWS_SES_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SES_SECRET_ACCESS_KEY
        }
      });
    } catch (error: any) {
      console.error('Email error:', error);
      console.error(error.message);
    }
    
    
    // Define test routes for AWS SES
    baseTest.app.get('/test-aws-ses', async (req, res) => {
      try {
        const params = {
          Destination: {
            ToAddresses: ['octavian.davidd@gmail.com'],
          },
          Message: {
            Body: {
              Html: {
                Charset: 'UTF-8',
                Data: '<p>This is a test email from AWS SES</p>',
              },
              Text: {
                Charset: 'UTF-8',
                Data: 'This is a test email from AWS SES',
              },
            },
            Subject: {
              Charset: 'UTF-8',
              Data: 'AWS SES Test',
            },
          },
          Source: 'octaviandd@yahoo.com',
        };

        const command = new SendEmailCommand(params);
        await sesClient.send(command);
        res.send('AWS SES mail sent');
      } catch (error) {
        res.status(500).send('Mail error');
      }
    });
    
    // Add route for Bull queue mail test
    baseTest.app.get('/test-aws-ses-bull-queue', async (req, res) => {
      // Add job to queue
      await baseTest.mailQueue.add('send-ses-mail', {
        params: {
          Destination: {
            ToAddresses: ['octavian.davidd@gmail.com'],
          },
          Message: {
            Body: {
              Html: {
                Charset: 'UTF-8',
                Data: '<p>This is an email sent from a Bull queue job</p>',
              },
              Text: {
                Charset: 'UTF-8',
                Data: 'This is an email sent from a Bull queue job',
              },
            },
            Subject: {
              Charset: 'UTF-8',
              Data: 'AWS SES Bull Queue Email',
            },
          },
          Source: 'octaviandd@yahoo.com',
        }
      });
      
      res.send('AWS SES Bull queue mail job added');
    });
    
    // Process jobs in the queue
    baseTest.mailQueue.process('send-ses-mail', async (job) => {
      const { data } = job;
      const command = new SendEmailCommand(data.params);
      await sesClient.send(command);
      return { success: true };
    });
  });
  
  after(async function() {
    await baseTest.teardown();
  });
  
  it('should track emails sent with AWS SES', async function() {
    await request(baseTest.app).get('/test-aws-ses');
    
    await baseTest.waitForDataPersistence();
    
    const results = await baseTest.getMailResults();
    
    const sesMail = results.find((r: any) => 
      r.content.subject === 'AWS SES Test'
    );
    
    expect(sesMail).to.exist;
    expect(sesMail.content.from).to.equal('octaviandd@yahoo.com');
    expect(sesMail.content.to).to.include('octavian.davidd@gmail.com');
  });
  
  it('should track emails sent through Bull queue with AWS SES', async function() {
    await request(baseTest.app).get('/test-aws-ses-bull-queue');
    
    // Wait longer for the queue to process the job
    await baseTest.waitForDataPersistence(2000);
    
    const results = await baseTest.getMailResults();
    
    const bullQueueMail = results.find((r: any) => 
      r.content.subject === 'AWS SES Bull Queue Email' && 
      r.content.from === 'octaviandd@yahoo.com'
    );
    
    expect(bullQueueMail).to.exist;
    expect(bullQueueMail.content.to).to.include('octavian.davidd@gmail.com');
  });
});
