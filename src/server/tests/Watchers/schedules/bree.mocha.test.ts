// import { describe, it, before, after } from "mocha";
// import { expect } from "chai";
// import request from "supertest";

// delete require.cache[require.resolve('bree')];

// import { BaseScheduleTest } from "./base-schedule";
// import Bree from "bree";


// describe('Bree Tests', function(this: any) {
//   this.timeout(10000);
  
//   const baseTest = new BaseScheduleTest();
//   let breeInstance: Bree;
  
//   before(async function() {
//     await baseTest.setup();
    
//     // Initialize Bree instance
//     breeInstance = new Bree({
//       root: baseTest.jobsDir,
//       jobs: []
//     });
    
//     // Define test routes for Bree
//     baseTest.app.get('/test-bree', async (req, res) => {
//       try {
//         // Add a job to Bree
//         breeInstance.add({
//           name: 'test-job',
//           path: './test-job.js',
//           interval: '3s'
//         });

//         await breeInstance.start();
      
//         res.send('Bree job scheduled');
//       } catch (error) {
//         console.error(error);
//         res.status(500).send('Error scheduling Bree job');
//       }
//     });
    
//     baseTest.app.get('/test-bree-stop', async (req, res) => {
//       // Add a job to Bree and then stop it
//       try {
//         breeInstance.add({
//           name: 'stop-job',
//           path: './test-job.js',
//           interval: '5s'
//         });

//         await breeInstance.start();
        
//         // Stop the job after a short delay
//         setTimeout(() => {
//           breeInstance.stop('stop-job');
//         }, 500);
        
//         res.send('Bree job scheduled and stopped');
//       } catch (error) {
//         console.error(error);
//         res.status(500).send('Error scheduling or stopping Bree job');
//       }
//     });
//   });
  
//   after(async function() {
//     await baseTest.teardown();
//   });
  
//   it('should track schedules created with Bree', async function() {
//     await request(baseTest.app).get('/test-bree');
    
//     await baseTest.waitForDataPersistence();
    
//     const results = await baseTest.getAllEntries();
    
//     const breeJob = results.find((r: any) => 
//       r.content.package === 'bree' && r.content.type === 'set'
//     );
    
//     expect(breeJob).to.exist;
//     expect(breeJob.content.type).to.equal('set');
//   });
  
//   it('should track stopped schedules with Bree', async function() {
//     await request(baseTest.app).get('/test-bree-stop');
    
//     await baseTest.waitForDataPersistence();
    
//     const results = await baseTest.getAllEntries();
    
//     const stoppedJob = results.find((r: any) => 
//       r.content.package === 'bree' && r.content.type === 'stop'
//     );
    
//     expect(stoppedJob).to.exist;
//     expect(stoppedJob.content.type).to.equal('stop');
//   });
  
//   it('should get group data for schedules', async function() {
//     await request(baseTest.app).get('/test-bree');
//     await request(baseTest.app).get('/test-node-cron');
    
//     await baseTest.waitForDataPersistence();
    
//     const { results } = await baseTest.getGroupData();
    
//     expect(results.length).to.be.at.least(1);
//     expect(results[0]).to.have.property('type');
//     expect(results[0]).to.have.property('total');
//   });
// }); 