import { describe, it, before, after } from "mocha";
import { expect } from "chai";
import request from "supertest";

delete require.cache[require.resolve('node-schedule')];

import { BaseScheduleTest } from "./base-schedule";
import schedule from "node-schedule";

describe('Node-Schedule Tests', function(this: any) {
  this.timeout(10000);
  
  const baseTest = new BaseScheduleTest();
  
  before(async function() {
    await baseTest.setup();
    
    // Define test routes for Node-Schedule
    baseTest.app.get('/test-node-schedule', (req, res) => {
      try {
        // Schedule a job to run in 1 second
        const job = schedule.scheduleJob('test-job', new Date(Date.now() + 1000), function() {
          console.log('Node-schedule job executed at', new Date().toISOString());
        });
        res.send('Node-schedule job scheduled');
      } catch (error) {
        console.error(error);
        res.status(500).send('Error scheduling node-schedule job');
      }
    });
    
    baseTest.app.get('/test-node-schedule-cancel', (req, res) => {
      try {
        // Schedule a job and then cancel it
        const job = schedule.scheduleJob('cancel-job', new Date(Date.now() + 5000), function() {
          console.log('This job should not run');
      });
      
      // Cancel the job after a short delay
      setTimeout(() => {
        job.cancel();
      }, 500);
      
        res.send('Node-schedule job scheduled and canceled');
      } catch (error) {
        console.error(error);
        res.status(500).send('Error scheduling or canceling node-schedule job');
      }
    });
  });
  
  after(async function() {
    await baseTest.teardown();
  });
  
  it('should track schedules created with Node-Schedule', async function() {
    await request(baseTest.app).get('/test-node-schedule');
    
    await baseTest.waitForDataPersistence();
    
    const results = await baseTest.getAllEntries();
    
    const scheduleJob = results.find((r: any) => 
      r.content.package === 'node-schedule' && 
      r.content.type === 'set'
    );
    
    expect(scheduleJob).to.exist;
    expect(scheduleJob.content.type).to.equal('set');
  });
  
  it('should track canceled schedules with Node-Schedule', async function() {
    await request(baseTest.app).get('/test-node-schedule-cancel');
    
    await baseTest.waitForDataPersistence();
    
    const results = await baseTest.getAllEntries();
    
    const canceledJob = results.find((r: any) => 
      r.content.package === 'node-schedule' && r.content.name === 'cancel-job'
    );
    
    expect(canceledJob).to.exist;
    expect(canceledJob.content.type).to.equal('set');
  });
  
  it('should retrieve schedule details', async function() {
    await request(baseTest.app).get('/test-node-schedule');
    
    await baseTest.waitForDataPersistence();
    
    const results = await baseTest.getAllEntries();
    const scheduleId = results.find((r: any) => 
      r.content.package === 'node-schedule'
    ).uuid;
    
    const scheduleData = await baseTest.getScheduleDetails(scheduleId);
    
    expect(scheduleData).to.have.property('schedule');
    expect(scheduleData.schedule[0].type).to.equal('schedule');
    expect(scheduleData.schedule[0].content).to.have.property('name');
  });
  
  it('should get graph data for schedules', async function() {
    await request(baseTest.app).get('/test-node-schedule');
    
    await baseTest.waitForDataPersistence();
    
    const graphData = await baseTest.getGraphData();
    
    expect(graphData).to.have.property('countFormattedData');
    expect(graphData).to.have.property('count');
  });
}); 