import { describe, it, before, after } from "mocha";
import { expect } from "chai";
import request from "supertest";

delete require.cache[require.resolve('node-cron')];

import { BaseScheduleTest } from "./base-schedule";
import cron from "node-cron";

describe('Node-Cron Tests', function(this: any) {
  this.timeout(10000);
  
  const baseTest = new BaseScheduleTest();
  
  before(async function() {
    await baseTest.setup();
    
    // Define test routes for Node-Cron
    baseTest.app.get('/test-node-cron', (req, res) => {
      try { 
        // Schedule a cron job to run every second
        const task = cron.schedule('* * * * * *', () => {
          console.log('Node-cron job executed at', new Date().toISOString());
      }, {
        scheduled: false
      });
      
      task.start();
      
      // Store task reference to stop it later
      res.locals.cronTask = task;
        
        res.send('Node-cron job scheduled');
      } catch (error) {
        console.error(error);
        res.status(500).send('Error scheduling cron job');
      }
    });
    
    baseTest.app.get('/test-node-cron-stop', (req, res) => {
      // Schedule a cron job and then stop it
      try {
      const task = cron.schedule('* * * * * *', () => {
        console.log('This job should not run frequently');
      });
      
      // Stop the task after a short delay
      setTimeout(() => {
        task.stop();
      }, 500);
      
        res.send('Node-cron job scheduled and stopped');
      } catch (error) {
        console.error(error);
        res.status(500).send('Error scheduling or stopping cron job');
      }
    });
  });
  
  after(async function() {
    await baseTest.teardown();
  });
  
  it('should track schedules created with Node-Cron', async function() {
    await request(baseTest.app).get('/test-node-cron');
    
    await baseTest.waitForDataPersistence();
    
    const results = await baseTest.getAllEntries();
    
    const cronJob = results.find((r: any) => 
      r.content.package === 'node-cron' && r.content.cronExpression === '* * * * * *' && r.content.type === 'set'
    );
    
    expect(cronJob).to.exist;
    expect(cronJob.content.type).to.equal('set');
  });
  
  it('should track stopped schedules with Node-Cron', async function() {
    await request(baseTest.app).get('/test-node-cron-stop');
    
    await baseTest.waitForDataPersistence();
    
    const results = await baseTest.getAllEntries();
    
    const stoppedJob = results.find((r: any) => 
      r.content.package === 'node-cron' && r.content.cronExpression === '* * * * * *' && r.content.type === 'stop'
    );
    
    expect(stoppedJob).to.exist;
    expect(stoppedJob.content.type).to.equal('stop');
  });
}); 