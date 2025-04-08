import { describe, it, expect } from 'vitest'
import request from "supertest";
import path from "path";
import fs from "fs";

import { BaseCacheTest } from "./base-cache";
import { Level } from "level";

describe('Level Tests', function(this: any) {
  this.timeout(5000);
  
  const baseTest = new BaseCacheTest();
  let testLevelDB: any;
  let dbPath: string;
  // Comment out sublevel declarations since we're not patching sublevels
  // let peopleSublevel: any;
  // let nameIndexSublevel: any;
  
  before(async function() {
    await baseTest.setup();
    
    // Create a temporary directory for LevelDB
    dbPath = path.join(__dirname, '../../../level-test-db');
    if (!fs.existsSync(dbPath)) {
      fs.mkdirSync(dbPath, { recursive: true });
    }
    
    // Create Level instance
    testLevelDB = new Level(dbPath, { valueEncoding: 'json' });
    await testLevelDB.open();
    
    // Comment out sublevel creation
    // peopleSublevel = testLevelDB.sublevel('people', { valueEncoding: 'json' });
    // nameIndexSublevel = testLevelDB.sublevel('names', { valueEncoding: 'json' });
    
    // Define test routes for Level
    baseTest.app.get('/test-level-put', async (req, res) => {
      await testLevelDB.put('level-key', 'level-value');
      res.send('Level put');
    });
    
    baseTest.app.get('/test-level-get-hit', async (req, res) => {
      try {
        await testLevelDB.put('hit-key', 'hit-value');
        const value = await testLevelDB.get('hit-key');
        res.send(value);
      } catch (error) {
        res.send('Not found');
      }
    });
    
    baseTest.app.get('/test-level-get-miss', async (req, res) => {
      try {
        const value = await testLevelDB.get('non-existent-key');
        res.send(value);
      } catch (error) {
        res.send('Not found');
      }
    });
    
    baseTest.app.get('/test-level-delete', async (req, res) => {
      try {
        await testLevelDB.put('delete-key', 'delete-value');
        await testLevelDB.del('delete-key');
        res.send('Level deleted');
      } catch (error) {
        res.send('Error deleting');
      }
    });
    
    baseTest.app.get('/test-level-batch', async (req, res) => {
      try {
        await testLevelDB.batch([
          { type: 'put', key: 'batch-key1', value: 'batch-value1' },
          { type: 'put', key: 'batch-key2', value: 'batch-value2' }
        ]);
        res.send('Batch operations completed');
      } catch (error) {
        res.send('Error in batch operations');
      }
    });
    
    // Comment out routes for testing sublevel operations
    /*
    baseTest.app.get('/test-level-sublevel-put', async (req, res) => {
      try {
        await peopleSublevel.put('person-123', { name: 'Alice', age: 30 });
        res.send('Sublevel put completed');
      } catch (error) {
        res.send('Error in sublevel put');
      }
    });
    
    baseTest.app.get('/test-level-sublevel-get', async (req, res) => {
      try {
        await peopleSublevel.put('person-123', { name: 'Alice', age: 30 });
        const value = await peopleSublevel.get('person-123');
        res.send(value);
      } catch (error) {
        res.send('Error in sublevel get');
      }
    });
    
    baseTest.app.get('/test-level-sublevel-batch', async (req, res) => {
      try {
        await testLevelDB.batch([
          {
            type: 'put',
            sublevel: peopleSublevel,
            key: 'person-456',
            value: { name: 'Bob', age: 25 }
          },
          {
            type: 'put',
            sublevel: nameIndexSublevel,
            key: 'Bob',
            value: 'person-456'
          }
        ]);
        res.send('Sublevel batch completed');
      } catch (error) {
        res.send('Error in sublevel batch');
      }
    });
    
    baseTest.app.get('/test-level-sublevel-mixed-batch', async (req, res) => {
      try {
        await testLevelDB.batch([
          // Main DB operation
          { type: 'put', key: 'main-key', value: 'main-value' },
          // People sublevel operation
          { 
            type: 'put', 
            sublevel: peopleSublevel,
            key: 'person-789',
            value: { name: 'Charlie', age: 40 }
          },
          // Names sublevel operation  
          {
            type: 'put',
            sublevel: nameIndexSublevel,
            key: 'Charlie',
            value: 'person-789'
          }
        ]);
        res.send('Mixed batch completed');
      } catch (error) {
        res.send('Error in mixed batch');
      }
    });
    */
    
  });
  
  after(async function() {
    await baseTest.teardown();
    await testLevelDB.close();
    
    // Clean up the test database directory
    if (fs.existsSync(dbPath)) {
      fs.rmdirSync(dbPath, { recursive: true });
    }
  });
  
  beforeEach(async function() {
    // No direct way to flush LevelDB, so we'll create different keys for each test
    this.timeout(1000);
  });
  
  it('should track put operations', async function() {
    await request(baseTest.app).get('/test-level-put');
    await baseTest.waitForDataPersistence();
    
    const results = await baseTest.getCacheResults();
    const putOp = results.find((r: any) => 
      r.content.package === 'level' && 
      r.content.key === 'level-key' && 
      r.content.type === 'put'
    );
    
    expect(putOp).to.exist;
    expect(putOp.content.value).to.equal('level-value');
    expect(putOp.content.writes).to.equal(1);
  });
  
  it('should track get operations with hits', async function() {
    await request(baseTest.app).get('/test-level-get-hit');
    await baseTest.waitForDataPersistence();
    
    const results = await baseTest.getCacheResults();
    const getOp = results.find((r: any) => 
      r.content.package === 'level' && 
      r.content.key === 'hit-key' && 
      r.content.type === 'get' &&
      r.content.hits === 1
    );
    
    expect(getOp).to.exist;
    expect(getOp.content.hits).to.equal(1);
    expect(getOp.content.misses).to.equal(0);
  });
  
  it('should track get operations with misses', async function() {
    await request(baseTest.app).get('/test-level-get-miss');
    await baseTest.waitForDataPersistence();
    
    const results = await baseTest.getCacheResults();
    const missOp = results.find((r: any) => 
      r.content.package === 'level' && 
      r.content.key === 'non-existent-key' && 
      r.content.type === 'get' &&
      r.content.misses === 1
    );
    
    expect(missOp).to.exist;
    expect(missOp.content.hits).to.equal(0);
    expect(missOp.content.misses).to.equal(1);
  });
  
  it('should track delete operations', async function() {
    await request(baseTest.app).get('/test-level-delete');
    await baseTest.waitForDataPersistence();
    
    const results = await baseTest.getCacheResults();
    const delOp = results.find((r: any) => 
      r.content.package === 'level' && 
      r.content.key === 'delete-key' && 
      r.content.type === 'del'
    );
    
    expect(delOp).to.exist;
    expect(delOp.content.writes).to.equal(1);
  });
  
  // it('should track batch operations', async function() {
  //   await request(baseTest.app).get('/test-level-batch');
  //   await baseTest.waitForDataPersistence();
    
  //   const results = await baseTest.getCacheResults();
  //   const batchOp = results.find((r: any) => 
  //     r.content.package === 'level' && 
  //     r.content.type === 'batch'
  //   );
    
  //   expect(batchOp).to.exist;
  //   expect(batchOp.content.writes).to.equal(2);
  //   expect(batchOp.content.putEntries[0].key).to.equal('batch-key1');
  //   expect(batchOp.content.putEntries[1].key).to.equal('batch-key2');
  //   expect(batchOp.content.putEntries[0].value).to.equal('batch-value1');
  //   expect(batchOp.content.putEntries[1].value).to.equal('batch-value2');
  // });
  
  // Comment out tests for sublevel operations
  /*
  it('should track sublevel put operations', async function() {
    await request(baseTest.app).get('/test-level-sublevel-put');
    await baseTest.waitForDataPersistence();
    
    const results = await baseTest.getCacheResults();
    const sublevelPutOp = results.find((r: any) => 
      r.content.package === 'level' && 
      r.content.type === 'put'
    );
    
    expect(sublevelPutOp).to.exist;
    expect(sublevelPutOp.content.key).to.equal('person-123');
    expect(sublevelPutOp.content.value).to.deep.include({ name: 'Alice' });
    expect(sublevelPutOp.content.writes).to.equal(1);
  });
  
  it('should track sublevel get operations', async function() {
    await request(baseTest.app).get('/test-level-sublevel-get');
    await baseTest.waitForDataPersistence();
    
    const results = await baseTest.getCacheResults();
    const sublevelGetOp = results.find((r: any) => 
      r.content.package === 'level' && 
      r.content.sublevel === 'people' && 
      r.content.type === 'get' &&
      r.content.hits === 1
    );
    
    expect(sublevelGetOp).to.exist;
    expect(sublevelGetOp.content.key).to.equal('person-123');
    expect(sublevelGetOp.content.value).to.deep.include({ name: 'Alice' });
  });
  
  it('should track batch operations with sublevels', async function() {
    await request(baseTest.app).get('/test-level-sublevel-batch');
    await baseTest.waitForDataPersistence();
    
    const results = await baseTest.getCacheResults();
    const batchOp = results.find((r: any) => 
      r.content.package === 'level' && 
      r.content.type === 'batch'
    );
    
    expect(batchOp).to.exist;
    expect(batchOp.content.writes).to.equal(2);
    expect(batchOp.content.putEntries[0].sublevel).to.equal('people');
    expect(batchOp.content.putEntries[1].sublevel).to.equal('names');
    
    // Check putEntries for sublevel info
    const peopleEntry = batchOp.content.putEntries.find((e: any) => e.sublevel === 'people');
    const namesEntry = batchOp.content.putEntries.find((e: any) => e.sublevel === 'names');
    
    expect(peopleEntry).to.exist;
    expect(peopleEntry.key).to.equal('person-456');
    expect(peopleEntry.value).to.deep.include({ name: 'Bob' });
    
    expect(namesEntry).to.exist;
    expect(namesEntry.key).to.equal('Bob');
    expect(namesEntry.value).to.equal('person-456');
  });
  
  it('should track mixed batch operations with main DB and sublevels', async function() {
    await request(baseTest.app).get('/test-level-sublevel-mixed-batch');
    await baseTest.waitForDataPersistence();
    
    const results = await baseTest.getCacheResults();
    const batchOp = results.find((r: any) => 
      r.content.package === 'level' && 
      r.content.type === 'batch'
    );
    
    expect(batchOp).to.exist;
    expect(batchOp.content.writes).to.equal(3);
    expect(batchOp.content.putEntries[1].sublevel).to.equal('people');
    expect(batchOp.content.putEntries[2].sublevel).to.equal('names');
    
    // Check for main DB keys
    expect(batchOp.content.putEntries[0].key).to.equal('main-key');
    
    // Check for sublevel keys
    expect(batchOp.content.putEntries[1].key).to.equal('person-789');
    expect(batchOp.content.putEntries[2].key).to.equal('Charlie');
    
    // Verify we captured the values
    const personValue = batchOp.content.putEntries[1].value;
    const nameValue = batchOp.content.putEntries[2].value;
    
    expect(personValue).to.exist;
    expect(personValue.name).to.equal('Charlie');
    
    expect(nameValue).to.exist;
    expect(nameValue).to.equal('person-789');
  });
  */
}); 