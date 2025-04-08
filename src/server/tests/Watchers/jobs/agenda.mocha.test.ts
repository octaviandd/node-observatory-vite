import { describe, it, before, after } from "mocha";
import { expect } from "chai";
import request from "supertest";

import { BaseJobTest } from "./base-job";
import Agenda from "agenda";

describe('Agenda Job Queue Tests', function(this: any) {
  this.timeout(10000); // Increased timeout for complex scenarios
  
  const baseTest = new BaseJobTest();
  let agenda: Agenda;
  
  before(async function() {
    await baseTest.setup();
    
    // Initialize Agenda with retry options
    try {
      agenda = new Agenda({
        db: { address: process.env.MONGODB_URI },
        defaultConcurrency: 5,
        defaultLockLifetime: 10000
      });
    } catch (error) {
      console.error(error);
    }
    
    // Define Agenda jobs
    agenda.define('test-agenda-job', async (job: any) => {
      return { result: 'processed' };
    });
    
    agenda.define('completed-agenda-job', async (job: any) => {
      return { result: 'completed' };
    });
    
    agenda.define('failed-agenda-job', async (job: any) => {
      throw new Error('Agenda job failed');
    });

    // Define job with retries
    agenda.define('retry-agenda-job', async (job: any) => {
      const { attemptsMade = 0 } = job.attrs.data;
      job.attrs.data.attemptsMade = attemptsMade + 1;
      
      if (attemptsMade < 2) {
        throw new Error('Job failed, will retry ' + attemptsMade);
      }
      return { result: 'retry eventually succeeded' };
    });

    // Define job with priority
    agenda.define('priority-agenda-job', async (job: any) => {
      return { result: 'priority job completed' };
    });

    // Define job that can be removed
    agenda.define('remove-agenda-job', async (job: any) => {
      return { result: 'remove job completed' };
    });

    // Define delayed job
    agenda.define('delayed-agenda-job', async (job: any) => {
      return { result: 'delayed job completed' };
    });
    
    // Start Agenda
    await agenda.start();
    
    // Define test routes for Agenda
    baseTest.app.get('/test-agenda-job', async (req, res) => {
      await agenda.now('test-agenda-job', { data: 'test-data' });
      res.send('Agenda job added');
    });
    
    baseTest.app.get('/test-agenda-job-completed', async (req, res) => {
      await agenda.now('completed-agenda-job', { data: 'completed-data' });
      res.send('Agenda job completed');
    });
    
    baseTest.app.get('/test-agenda-job-failed', async (req, res) => {
      await agenda.now('failed-agenda-job', { data: 'failed-data' });
      res.send('Agenda job failed');
    });

    // New route for job with retries
    baseTest.app.get('/test-agenda-job-retries', async (req, res) => {
      try {
        const job = agenda.create('retry-agenda-job', { 
          data: 'retry-data',
          attemptsMade: 0,
          maxAttempts: 3
        });
        await job.save();
        res.send('Agenda job with retries added');
      } catch (error) {
        console.error(error);
        res.status(500).send('Agenda job failed');
      }
    });

    // New route for job with priority
    baseTest.app.get('/test-agenda-job-priority', async (req, res) => {
      try {
        const job = agenda.create('priority-agenda-job', { data: 'priority-data' });
        job.priority('high');
        await job.save();
        res.send('High priority Agenda job added');
      } catch (error) {
        console.error(error);
        res.status(500).send('Agenda job failed');
      }
    });

    // New route for removing a job
    baseTest.app.get('/test-agenda-job-remove', async (req, res) => {
      try {
        const job = agenda.create('remove-agenda-job', { data: 'remove-data' });
        await job.save();
        await job.remove();
        res.send('Agenda job removed');
      } catch (error) {
        console.error(error);
        res.status(500).send('Agenda job failed');
      }
    });

    // New route for delayed job
    baseTest.app.get('/test-agenda-job-delayed', async (req, res) => {
      try {
        const job = agenda.create('delayed-agenda-job', { data: 'delayed-data' });
        job.schedule('in 1 second');
        await job.save();
        res.send('Delayed Agenda job added');
      } catch (error) {
        console.error(error);
        res.status(500).send('Agenda job failed');
      }
    });
  });
  
  after(async function() {
    await agenda.stop();
  });
  
  it('should track jobs created with Agenda', async function() {
    await request(baseTest.app).get('/test-agenda-job');
    
    await baseTest.waitForDataPersistence(3000);
    
    const results = await baseTest.getJobResults();
    
    const agendaJob = results.find((r: any) => 
      r.content.jobName === 'test-agenda-job'
    );
    
    expect(agendaJob).to.exist;
    expect(agendaJob.content.package).to.equal('agenda');
  });
  
  it('should track completed jobs with Agenda', async function() {
    await request(baseTest.app).get('/test-agenda-job-completed');
    
    await baseTest.waitForDataPersistence(3000);
    
    const results = await baseTest.getJobResults('completed');
    
    const completedJob = results.find((r: any) => 
      r.content.jobName === 'completed-agenda-job'
    );
    
    expect(completedJob).to.exist;
    expect(completedJob.content.status).to.equal('completed');
  });
  
  it('should track failed jobs with Agenda', async function() {
    await request(baseTest.app).get('/test-agenda-job-failed');
    
    await baseTest.waitForDataPersistence(3000);
    
    const results = await baseTest.getJobResults('failed');
    
    const failedJob = results.find((r: any) => 
      r.content.jobName === 'failed-agenda-job'
    );
    
    expect(failedJob).to.exist;
    expect(failedJob.content.status).to.equal('failed');
    expect(failedJob.content.error).to.include('Agenda job failed');
  });

  it('should track retried jobs with Agenda', async function() {
    await request(baseTest.app).get('/test-agenda-job-retries');
    
    // Give time for the job to be processed multiple times
    await new Promise(resolve => setTimeout(resolve, 5000));
    await baseTest.waitForDataPersistence();
    
    // Check for the initial job failure
    let results = await baseTest.getJobResults('failed');
    const retryJobFailure = results.find((r: any) => 
      r.content.jobName === 'retry-agenda-job' && 
      r.content.error?.includes('Job failed, will retry')
    );
    
    expect(retryJobFailure).to.exist;
    
    // Check for subsequent retry attempts
    results = await baseTest.getJobResults();
    const retryJobAttempts = results.filter((r: any) => 
      r.content.jobName === 'retry-agenda-job' && 
      r.content.data?.attemptsMade > 0
    );
    
    // There should be at least one retry attempt
    expect(retryJobAttempts.length).to.be.greaterThan(0);
    
    // Eventually the job should succeed
    results = await baseTest.getJobResults('completed');
    const retryJobSuccess = results.find((r: any) => 
      r.content.jobName === 'retry-agenda-job' && 
      r.content.status === 'completed' &&
      r.content.data?.attemptsMade > 0
    );
    
    expect(retryJobSuccess).to.exist;
  });

  it('should track delayed jobs with Agenda', async function() {
    await request(baseTest.app).get('/test-agenda-job-delayed');
    
    // Wait for the job to be added
    await baseTest.waitForDataPersistence();
    
    // First check for the initial job creation
    let results = await baseTest.getAllJobResults();
    const delayedJobCreation = results.find((r: any) => 
      r.content.jobName === 'delayed-agenda-job' && 
      r.content.data?.data === 'delayed-data'
    );
    
    expect(delayedJobCreation).to.exist;
    
    // Wait for the delayed job to complete (delay is 1 second)
    await new Promise(resolve => setTimeout(resolve, 1500));
    await baseTest.waitForDataPersistence();
    
    // Now check for job completion
    results = await baseTest.getJobResults('completed');
    const delayedJobCompletion = results.find((r: any) => 
      r.content.jobName === 'delayed-agenda-job' && 
      r.content.status === 'completed'
    );
    
    expect(delayedJobCompletion).to.exist;
  });

  it('should track high priority jobs with Agenda', async function() {
    await request(baseTest.app).get('/test-agenda-job-priority');
    
    await baseTest.waitForDataPersistence();
    
    const results = await baseTest.getAllJobResults();
    const priorityJob = results.find((r: any) => 
      r.content.jobName === 'priority-agenda-job' && 
      r.content.data?.data === 'priority-data'
    );
    
    expect(priorityJob).to.exist;
    
    await new Promise(resolve => setTimeout(resolve, 500));
    await baseTest.waitForDataPersistence();
    
    // Verify the job was completed
    const completedResults = await baseTest.getJobResults('completed');
    const completedPriorityJob = completedResults.find((r: any) => 
      r.content.jobName === 'priority-agenda-job' && 
      r.content.status === 'completed'
    );
    
    expect(completedPriorityJob).to.exist;
  });

  it('should track removed jobs with Agenda', async function() {
    await request(baseTest.app).get('/test-agenda-job-remove');
    
    await baseTest.waitForDataPersistence();
    
    // The job should be added and then removed
    const results = await baseTest.getAllJobResults();
    const removedJob = results.find((r: any) => 
      r.content.jobName === 'remove-agenda-job' && 
      r.content.data?.data === 'remove-data'
    );
    
    expect(removedJob).to.exist;
  });
}); 