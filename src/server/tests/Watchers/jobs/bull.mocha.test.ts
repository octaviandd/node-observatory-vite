import { describe, it, before, after } from "mocha";
import { expect } from "chai";
import request from "supertest";

import { BaseJobTest } from "./base-job";
import Queue from "bull";

describe('Bull Job Queue Tests', function(this: any) {
  this.timeout(15000); // Increased timeout for delayed jobs
  
  const baseTest = new BaseJobTest();
  let bullQueue: Queue.Queue;
  
  before(async function() {
    await baseTest.setup();
    
    // Initialize Bull queue
    bullQueue = new Queue('test-queue', {
      redis: { port: 6379, host: 'localhost' },
      defaultJobOptions: {
        removeOnComplete: false,
        removeOnFail: false
      }
    });
    
    // Define test routes for Bull
    baseTest.app.get('/test-bull-job', async (req, res) => {
      try {
        await bullQueue.add('test-job', { data: 'test-data' });
        res.send('Bull job added');
      } catch (error) {
        console.error(error)
        res.status(500).send('Bull job failed');
      }
    });
    
    baseTest.app.get('/test-bull-job-completed', async (req, res) => {
      try {
        const job = await bullQueue.add('completed-job', { data: 'completed-data' });
        res.send('Bull job completed');
      } catch (error) {
        console.error(error)
        res.status(500).send('Bull job failed');
      }
    });
    
    baseTest.app.get('/test-bull-job-failed', async (req, res) => {
      try {
        const job = await bullQueue.add('failed-job', { data: 'failed-data' });
        res.send('Bull job failed');
      } catch (error) {
        console.error(error)
        res.status(500).send('Bull job failed');
      }
    });
    
    // New route for delayed job
    baseTest.app.get('/test-bull-job-delayed', async (req, res) => {
      try {
        // Add a job with a delay of 1 second
        await bullQueue.add('delayed-job', { data: 'delayed-data' }, { delay: 1000 });
        res.send('Delayed Bull job added');
      } catch (error) {
        console.error(error)
        res.status(500).send('Bull job failed');
      }
    });
    
    // New route for job with retries
    baseTest.app.get('/test-bull-job-retries', async (req, res) => {
      try {
        // Add a job that will fail but has 3 retries with backoff
        const job = await bullQueue.add(
          'retry-job', 
          { data: 'retry-data', shouldFail: true }, 
          { 
            attempts: 3, 
            backoff: {
              type: 'exponential',
              delay: 200
            }
          }
        );
        res.send('Bull job with retries added');
      } catch (error) {
        console.error(error)
        res.status(500).send('Bull job failed');
      }
    });
    
    // New route for job with priority
    baseTest.app.get('/test-bull-job-priority', async (req, res) => {
      try {
        // Add a high priority job
        await bullQueue.add(
          'priority-job', 
          { data: 'priority-data' }, 
          { priority: 1 } // Lower number = higher priority
        );
        res.send('High priority Bull job added');
      } catch (error) {
        console.error(error)
        res.status(500).send('Bull job failed');
      }
    });
    
    // New route for removing a job
    baseTest.app.get('/test-bull-job-remove', async (req, res) => {
      try {
        const job = await bullQueue.add('remove-job', { data: 'remove-data' });
        await job.remove();
        res.send('Bull job removed');
      } catch (error) {
        console.error(error)
        res.status(500).send('Bull job failed');
      }
    });
    
    // Process jobs
    bullQueue.process('test-job', async (job) => {
      return { result: 'processed' };
    });

    bullQueue.process('completed-job', async (job) => {
      return { result: 'completed' };
    });

    bullQueue.process('failed-job', (job, done) => {
      done(new Error('Job failed'));
    });
    
    // Process handler for delayed job
    bullQueue.process('delayed-job', async (job) => {
      return { result: 'delayed job completed' };
    });
    
    // Process handler for retry job
    bullQueue.process('retry-job', async (job) => {
      if (job.attemptsMade < 2 && job.data.shouldFail) {
        throw new Error('Job failed, will retry' + job.attemptsMade);
      }
    });
    
    // Process handler for priority job
    bullQueue.process('priority-job', async (job) => {
      return { result: 'priority job completed' };
    });
    
    // Process handler for remove job
    bullQueue.process('remove-job', async (job) => {
      return { result: 'remove job completed' };
    });
  });
  
  after(async function() {
    await baseTest.teardown();
    await bullQueue.close();
  });
  
  it('should track jobs created with Bull', async function() {
    await request(baseTest.app).get('/test-bull-job');
    
    await baseTest.waitForDataPersistence();
    
    const results = await baseTest.getAllJobResults();

    const bullJob = results.find((r: any) => 
      r.content.queue === 'test-queue' && r.content.method === 'add'
    );
    
    expect(bullJob).to.exist;
    expect(bullJob.content.package).to.equal('bull');
  });
  
  it('should track completed jobs with Bull', async function() {
    await request(baseTest.app).get('/test-bull-job-completed');
    
    await baseTest.waitForDataPersistence();
    
    const results = await baseTest.getJobResults('completed');
    
    const completedJob = results.find((r: any) => 
      r.content.queue === 'test-queue' && r.content.method === 'processJob' && r.content.status === 'completed'
    );
    
    expect(completedJob).to.exist;
    expect(completedJob.content.status).to.equal('completed');
  });
  
  it('should track failed jobs with Bull', async function() {
    await request(baseTest.app).get('/test-bull-job-failed');
    
    await baseTest.waitForDataPersistence();
    
    const results = await baseTest.getAllJobResults();
    
    const failedJob = results.find((r: any) => 
      r.content.queue === 'test-queue' && 
      r.content.method === 'processJob' &&
      r.content.status === 'failed'
    );
    
    expect(failedJob).to.exist;
    expect(failedJob.content.status).to.equal('failed');
    expect(failedJob.content.failedReason).to.include('Job failed');
  });
  
  it('should track delayed jobs with Bull', async function() {
    await request(baseTest.app).get('/test-bull-job-delayed');
    
    // Wait for the job to be added to the delayed set
    await baseTest.waitForDataPersistence();
    
    // First check for the initial job creation
    let results = await baseTest.getAllJobResults();
    const delayedJobCreation = results.find((r: any) => 
      r.content.queue === 'test-queue' && r.content.method === 'add' && r.content.jobData?.data === 'delayed-data'
    );
    
    expect(delayedJobCreation).to.exist;
    
    // Wait for the delayed job to complete (delay is 1000ms)
    await new Promise(resolve => setTimeout(resolve, 1500));
    await baseTest.waitForDataPersistence();
    
    // Now check for job completion
    results = await baseTest.getJobResults('completed');
    const delayedJobCompletion = results.find((r: any) => 
      r.content.queue === 'test-queue' && r.content.method === 'processJob' && r.content.status === 'completed'
    );
    
    expect(delayedJobCompletion).to.exist;
  });
  
  it('should track retried jobs with Bull', async function() {
    await request(baseTest.app).get('/test-bull-job-retries');
    
    // Give time for the job to be processed multiple times
    await new Promise(resolve => setTimeout(resolve, 2000));
    await baseTest.waitForDataPersistence();
    
    // Check for the initial job failure
    let results = await baseTest.getJobResults('failed');
    const retryJobFailure = results.find((r: any) => 
      r.content.queue === 'test-queue' && 
      r.content.failedReason?.includes('Job failed, will retry')
    );
    
    expect(retryJobFailure).to.exist;
    
    // Check for subsequent retry attempts
    results = await baseTest.getJobResults();
    const retryJobAttempts = results.filter((r: any) => 
      r.content.queue === 'test-queue' && 
      r.content.method === 'processJob' && 
      r.content.attemptsMade > 0
    );
    
    // There should be at least one retry attempt
    expect(retryJobAttempts.length).to.be.greaterThan(0);
    
    // Eventually the job should succeed (after retry)
    results = await baseTest.getJobResults('completed');
    const retryJobSuccess = results.find((r: any) => 
      r.content.queue === 'test-queue' && 
      r.content.method === 'processJob' && 
      r.content.status === 'completed' &&
      r.content.attemptsMade > 0
    );
    
    // This might be flaky if the job hasn't succeeded yet, but we've added enough delay
    expect(retryJobSuccess).to.exist;
  });
  
  it('should track high priority jobs with Bull', async function() {
    await request(baseTest.app).get('/test-bull-job-priority');
    
    await baseTest.waitForDataPersistence();
    
    const results = await baseTest.getAllJobResults();
    const priorityJob = results.find((r: any) => 
      r.content.queue === 'test-queue' && 
      r.content.method === 'add' && 
      r.content.jobData?.data === 'priority-data'
    );
    
    expect(priorityJob).to.exist;
    
    await new Promise(resolve => setTimeout(resolve, 500));
    await baseTest.waitForDataPersistence();
    
    // Verify the job was completed
    const completedResults = await baseTest.getJobResults('completed');
    const completedPriorityJob = completedResults.find((r: any) => 
      r.content.queue === 'test-queue' && 
      r.content.method === 'processJob' && 
      r.content.status === 'completed'
    );
    
    expect(completedPriorityJob).to.exist;
  });
  
  it('should track removed jobs with Bull', async function() {
    await request(baseTest.app).get('/test-bull-job-remove');
    
    await baseTest.waitForDataPersistence();
    
    // The job should be added and then removed
    const results = await baseTest.getAllJobResults();
    const removedJob = results.find((r: any) => 
      r.content.queue === 'test-queue' && 
      r.content.method === 'add' && 
      r.content.jobData?.data === 'remove-data'
    );
    
    expect(removedJob).to.exist;
  });
  
  it('should retrieve job details', async function() {
    await request(baseTest.app).get('/test-bull-job');
    
    await baseTest.waitForDataPersistence();
    
    const results = await baseTest.getAllJobResults();
    const jobResult = results.find((r: any) => 
      r.content.queue === 'test-queue' && r.content.method === 'add'
    );
    
    expect(jobResult).to.exist;
    const jobId = jobResult.uuid;
    
    const jobData = await baseTest.getJobDetails(jobId);
    
    expect(jobData).to.have.property('job');
    expect(jobData.job[0].type).to.equal('job');
    expect(jobData.job[0].content).to.have.property('queue');
  });
  
  it('should get graph data for jobs', async function() {
    await request(baseTest.app).get('/test-bull-job');
    await request(baseTest.app).get('/test-bull-job-completed');
    await request(baseTest.app).get('/test-bull-job-failed');
    
    await baseTest.waitForDataPersistence();
    
    const graphData = await baseTest.getGraphData();
    
    expect(graphData).to.have.property('countFormattedData');
    expect(graphData).to.have.property('durationFormattedData');
    expect(graphData).to.have.property('count');
    
    // Job watcher should have data for different statuses
    const countData = graphData.countFormattedData.find((d: any) => 
      d.completed > 0 || d.failed > 0 || d.released > 0
    );
    expect(countData).to.exist;
  });
  
  it('should get group data for jobs', async function() {
    // Generate jobs with different job types
    await bullQueue.add('job-type-1', { data: 'data1' });
    await bullQueue.add('job-type-2', { data: 'data2' });
    await bullQueue.add('job-type-3', { data: 'data3' });
    
    await baseTest.waitForDataPersistence();
    
    const { results } = await baseTest.getGroupData();
    
    expect(results.length).to.be.at.least(1);
    expect(results[0]).to.have.property('queue');
    expect(results[0]).to.have.property('total');
  });
}); 