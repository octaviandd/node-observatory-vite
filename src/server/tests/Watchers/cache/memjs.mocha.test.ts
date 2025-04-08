// import { describe, it, before, after, beforeEach } from "mocha";
// import { expect } from "chai";
// import request from "supertest";

// // Clear any existing cache of memjs to ensure fresh patching
// delete require.cache[require.resolve('memjs')];

// import { BaseCacheTest } from "./base-cache";
// import memjs from "memjs";

// describe('Memjs Tests', function(this: any) {
//   // Increase timeout for real database operations
//   this.timeout(10000);
  
//   const baseTest = new BaseCacheTest();
//   let testMemjs: any;
  
//   before(async function() {
//     console.log("Setting up test environment with real memcached connections...");
//     await baseTest.setup();
    
//     // Create Memjs client instance
//     testMemjs = memjs.Client.create('localhost:11211');
    
//     // Create test routes for Memjs
//     baseTest.app.get('/test-memjs-set', async (req, res) => {
//       console.log("Setting key 'memjs-key' in Memjs");
//       try {
//         await testMemjs.set('memjs-key', 'memjs-value');
//         res.send('Memjs set');
//       } catch (error) {
//         console.error("Error setting key in Memjs:", error);
//         res.status(500).send('Error setting key in Memjs');
//       }
//     });
    
//     baseTest.app.get('/test-memjs-set-ttl', async (req, res) => {
//       console.log("Setting key with TTL");
//       try {
//         await testMemjs.set('ttl-key', 'ttl-value', { expires: 60 }); // 60 second TTL
//         res.send('Memjs set with TTL');
//       } catch (error) {
//         console.error("Error setting key with TTL in Memjs:", error);
//         res.status(500).send('Error setting key with TTL in Memjs');
//       }
//     });
    
//     baseTest.app.get('/test-memjs-get-hit', async (req, res) => {
//       console.log("Getting existing key (testing cache hit)");
//       try {
//         await testMemjs.set('hit-key', 'hit-value');
//         const { value } = await testMemjs.get('hit-key');
//         res.send(value ? value.toString() : 'Not found');
//       } catch (error) {
//         console.error("Error getting key in Memjs:", error);
//         res.status(500).send('Error getting key in Memjs');
//       }
//     });
    
//     baseTest.app.get('/test-memjs-get-miss', async (req, res) => {
//       console.log("Getting non-existent key (testing cache miss)");
//       try {
//         const { value } = await testMemjs.get('non-existent-key');
//         res.send(value ? value.toString() : 'Not found');
//       } catch (error) {
//         console.error("Error getting non-existent key in Memjs:", error);
//         res.status(500).send('Error getting non-existent key in Memjs');
//       }
//     });
    
//     baseTest.app.get('/test-memjs-delete', async (req, res) => {
//       console.log("Deleting key");
//       try {
//         await testMemjs.set('delete-key', 'delete-value');
//         await testMemjs.delete('delete-key');
//         res.send('Memjs deleted');
//       } catch (error) {
//         console.error("Error deleting key in Memjs:", error);
//         res.status(500).send('Error deleting key in Memjs');
//       }
//     });
    
//     baseTest.app.get('/test-memjs-replace', async (req, res) => {
//       console.log("Replacing key");
//       try {
//         await testMemjs.set('replace-key', 'original-value');
//         await testMemjs.replace('replace-key', 'replaced-value');
//         res.send('Memjs replaced');
//       } catch (error) {
//         console.error("Error replacing key in Memjs:", error);
//         res.status(500).send('Error replacing key in Memjs');
//       }
//     });
    
//     baseTest.app.get('/test-memjs-increment', async (req, res) => {
//       console.log("Incrementing counter");
//       try {
//         await testMemjs.set('counter-key', '10');
//         await testMemjs.increment('counter-key', 5);
//         res.send('Memjs incremented');
//       } catch (error) {
//         console.error("Error incrementing counter in Memjs:", error);
//         res.status(500).send('Error incrementing counter in Memjs');
//       }
//     });
    
//     baseTest.app.get('/test-memjs-decrement', async (req, res) => {
//       console.log("Decrementing counter");
//       try {
//         await testMemjs.set('counter-key', '10');
//         await testMemjs.decrement('counter-key', 3);
//         res.send('Memjs decremented');
//       } catch (error) {
//         console.error("Error decrementing counter in Memjs:", error);
//         res.status(500).send('Error decrementing counter in Memjs');
//       }
//     });
    
//     console.log("Test environment setup complete");
//   });
  
//   after(async function() {
    
//   });
  
//   it('should track simple cache set operations', async function() {
//     await request(baseTest.app).get('/test-memjs-set');
//     await baseTest.waitForDataPersistence(1000);
    
//     const results = await baseTest.getCacheResults();
//     const setCacheOp = results.find((r: any) => 
//       r.content.package === 'memjs' && 
//       r.content.key === 'memjs-key' && 
//       r.content.type === 'set'
//     );
    
//     expect(setCacheOp).to.exist;
//     expect(setCacheOp.content.value).to.equal('memjs-value');
//     expect(setCacheOp.content.writes).to.equal(1);
//   });
  
//   it('should track cache set with TTL', async function() {
//     await request(baseTest.app).get('/test-memjs-set-ttl');
//     await baseTest.waitForDataPersistence(1000);
    
//     const results = await baseTest.getCacheResults();
//     const setCacheOp = results.find((r: any) => 
//       r.content.package === 'memjs' && 
//       r.content.key === 'ttl-key' && 
//       r.content.type === 'set'
//     );
    
//     expect(setCacheOp).to.exist;
//     expect(setCacheOp.content.value).to.equal('ttl-value');
//     expect(setCacheOp.content.writes).to.equal(1);
//     expect(setCacheOp.content.options).to.have.property('expires', 60);
//   });
  
//   it('should track cache hit operations', async function() {
//     await request(baseTest.app).get('/test-memjs-get-hit');
//     await baseTest.waitForDataPersistence(1000);
    
//     const results = await baseTest.getCacheResults();
//     const getCacheOp = results.find((r: any) => 
//       r.content.package === 'memjs' && 
//       r.content.key === 'hit-key' && 
//       r.content.type === 'get'
//     );
    
//     expect(getCacheOp).to.exist;
//     expect(getCacheOp.content.hits).to.equal(1);
//     expect(getCacheOp.content.misses).to.equal(0);
//     expect(getCacheOp.content.value.toString()).to.equal('hit-value');
//   });
  
//   it('should track cache miss operations', async function() {
//     await request(baseTest.app).get('/test-memjs-get-miss');
//     await baseTest.waitForDataPersistence(1000);
    
//     const results = await baseTest.getCacheResults();
//     const missCacheOp = results.find((r: any) => 
//       r.content.package === 'memjs' && 
//       r.content.key === 'non-existent-key' && 
//       r.content.type === 'get'
//     );
    
//     expect(missCacheOp).to.exist;
//     expect(missCacheOp.content.hits).to.equal(0);
//     expect(missCacheOp.content.misses).to.equal(1);
//   });
  
//   it('should track delete operations', async function() {
//     await request(baseTest.app).get('/test-memjs-delete');
//     await baseTest.waitForDataPersistence(1000);
    
//     const results = await baseTest.getCacheResults();
//     const delCacheOp = results.find((r: any) => 
//       r.content.package === 'memjs' && 
//       r.content.key === 'delete-key' && 
//       r.content.type === 'delete'
//     );
    
//     expect(delCacheOp).to.exist;
//     expect(delCacheOp.content.writes).to.equal(1);
//   });
  
//   it('should track replace operations', async function() {
//     await request(baseTest.app).get('/test-memjs-replace');
//     await baseTest.waitForDataPersistence(1000);
    
//     const results = await baseTest.getCacheResults();
//     const replaceCacheOp = results.find((r: any) => 
//       r.content.package === 'memjs' && 
//       r.content.key === 'replace-key' && 
//       r.content.type === 'replace'
//     );
    
//     expect(replaceCacheOp).to.exist;
//     expect(replaceCacheOp.content.value).to.equal('replaced-value');
//     expect(replaceCacheOp.content.writes).to.equal(1);
//   });
  
//   it('should track increment operations', async function() {
//     await request(baseTest.app).get('/test-memjs-increment');
//     await baseTest.waitForDataPersistence(1000);
    
//     const results = await baseTest.getCacheResults();
//     const incCacheOp = results.find((r: any) => 
//       r.content.package === 'memjs' && 
//       r.content.key === 'counter-key' && 
//       r.content.type === 'increment'
//     );
    
//     expect(incCacheOp).to.exist;
//     expect(incCacheOp.content.writes).to.equal(1);
//     expect(parseInt(incCacheOp.content.value)).to.equal(15); // 10 + 5
//   });
  
//   it('should track decrement operations', async function() {
//     await request(baseTest.app).get('/test-memjs-decrement');
//     await baseTest.waitForDataPersistence(1000);
    
//     const results = await baseTest.getCacheResults();
//     const decCacheOp = results.find((r: any) => 
//       r.content.package === 'memjs' && 
//       r.content.key === 'counter-key' && 
//       r.content.type === 'decrement'
//     );
    
//     expect(decCacheOp).to.exist;
//     expect(decCacheOp.content.writes).to.equal(1);
//     expect(parseInt(decCacheOp.content.value)).to.equal(7); // 10 - 3
//   });
  
//   it('should verify original cache functionality works correctly', async function() {
//     // Make sure our patching doesn't break the original functionality
//     await testMemjs.set('test-key', 'test-value');
//     const { value } = await testMemjs.get('test-key');
//     expect(value.toString()).to.equal('test-value');
    
//     await testMemjs.delete('test-key');
//     const { value: deletedValue } = await testMemjs.get('test-key');
//     expect(deletedValue).to.be.null;
//   });
// });
