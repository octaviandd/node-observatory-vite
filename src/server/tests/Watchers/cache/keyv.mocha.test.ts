import { describe, it, expect } from 'vitest'
import request from "supertest";

delete require.cache[require.resolve('keyv')];

import { BaseCacheTest } from "./base-cache";
import Keyv from "keyv";

describe('Keyv Tests', function(this: any) {
  this.timeout(5000);
  
  const baseTest = new BaseCacheTest();
  let testKeyv: Keyv;
  
  before(async function() {
    await baseTest.setup();
    
    // Create Keyv instance
    testKeyv = new Keyv();
    
    // Define test routes for Keyv
    baseTest.app.get('/test-keyv-set', async (req, res) => {
      await testKeyv.set('keyv-key', 'keyv-value');
      res.send('Keyv set');
    });
    
    baseTest.app.get('/test-keyv-get-hit', async (req, res) => {
      await testKeyv.set('keyv-hit-key', 'keyv-hit-value');
      const value = await testKeyv.get('keyv-hit-key');
      res.send(value || 'Not found');
    });
    
    baseTest.app.get('/test-keyv-get-miss', async (req, res) => {
      const value = await testKeyv.get('non-existent-key');
      res.send(value || 'Not found');
    });
    
    baseTest.app.get('/test-keyv-delete', async (req, res) => {
      await testKeyv.set('keyv-delete-key', 'delete-value');
      await testKeyv.delete('keyv-delete-key');
      res.send('Keyv deleted');
    });
    
    baseTest.app.get('/test-keyv-has', async (req, res) => {
      await testKeyv.set('keyv-has-key', 'has-value');
      const exists = await testKeyv.has('keyv-has-key');
      res.send(exists ? 'Exists' : 'Not found');
    });
    
    // Add route for Bull queue cache test
    baseTest.app.get('/test-keyv-bull-queue', async (req, res) => {
      // Add job to queue
      await baseTest.cacheQueue.add('keyv-operation', {
        operation: 'set',
        key: 'queue-key',
        value: 'queue-value'
      });
      
      res.send('Keyv Bull queue job added');
    });
    
    // Process jobs in the queue
    baseTest.cacheQueue.process('keyv-operation', async (job) => {
      const { data } = job;
      if (data.operation === 'set') {
        await testKeyv.set(data.key, data.value);
      } else if (data.operation === 'get') {
        return await testKeyv.get(data.key);
      } else if (data.operation === 'delete') {
        await testKeyv.delete(data.key);
      }
      return { success: true };
    });
  });
  
  after(async function() {
    await baseTest.teardown();
    await baseTest.cacheQueue.close();
  });
  
  it('should track set operations with Keyv', async function() {
    await request(baseTest.app).get('/test-keyv-set');
    
    await baseTest.waitForDataPersistence();
    
    const results = await baseTest.getCacheResults();
    
    const setCacheOp = results.find((r: any) => 
      r.content.package === 'keyv' && 
      r.content.key === 'keyv-key' && 
      r.content.type === 'set'
    );
    
    expect(setCacheOp).to.exist;
    expect(setCacheOp.content.value).to.equal('keyv-value');
    expect(setCacheOp.content.writes).to.equal(1);
  });
  
  it('should track get hit operations with Keyv', async function() {
    await request(baseTest.app).get('/test-keyv-get-hit');
    
    await baseTest.waitForDataPersistence();
    
    const results = await baseTest.getCacheResults();
    
    const getCacheOp = results.find((r: any) => 
      r.content.package === 'keyv' && 
      r.content.key === 'keyv-hit-key' && 
      r.content.type === 'get' &&
      r.content.hits === 1
    );
    
    expect(getCacheOp).to.exist;
    expect(getCacheOp.content.value).to.equal('keyv-hit-value');
    expect(getCacheOp.content.hits).to.equal(1);
    expect(getCacheOp.content.misses).to.equal(0);
  });
  
  it('should track get miss operations with Keyv', async function() {
    await request(baseTest.app).get('/test-keyv-get-miss');
    
    await baseTest.waitForDataPersistence();
    
    const results = await baseTest.getCacheResults();
    
    const getCacheOp = results.find((r: any) => 
      r.content.package === 'keyv' && 
      r.content.key === 'non-existent-key' && 
      r.content.type === 'get' &&
      r.content.misses === 1
    );
    
    expect(getCacheOp).to.exist;
    expect(getCacheOp.content.hits).to.equal(0);
    expect(getCacheOp.content.misses).to.equal(1);
  });
  
  it('should track delete operations with Keyv', async function() {
    await request(baseTest.app).get('/test-keyv-delete');
    
    await baseTest.waitForDataPersistence();
    
    const results = await baseTest.getCacheResults();
    
    const deleteCacheOp = results.find((r: any) => 
      r.content.package === 'keyv' && 
      r.content.key === 'keyv-delete-key' && 
      r.content.type === 'delete'
    );
    
    expect(deleteCacheOp).to.exist;
    expect(deleteCacheOp.content.writes).to.equal(1);
  });
  
  it('should track has operations with Keyv', async function() {
    await request(baseTest.app).get('/test-keyv-has');
    
    await baseTest.waitForDataPersistence();
    
    const results = await baseTest.getCacheResults();
    
    const hasCacheOp = results.find((r: any) => 
      r.content.package === 'keyv' && 
      r.content.key === 'keyv-has-key' && 
      r.content.type === 'has'
    );
    
    expect(hasCacheOp).to.exist;
    expect(hasCacheOp.content.hits).to.equal(1);
    expect(hasCacheOp.content.misses).to.equal(0);
  });
  
  it('should track cache operations made through Bull queue with Keyv', async function() {
    await request(baseTest.app).get('/test-keyv-bull-queue');
    
    // Wait longer for the queue to process the job
    await baseTest.waitForDataPersistence(4000);
    
    const results = await baseTest.getCacheResults();
    
    const queueCacheOp = results.find((r: any) => 
      r.content.package === 'keyv' && 
      r.content.key === 'queue-key' && 
      r.content.type === 'set'
    );

    expect(queueCacheOp).to.exist;
    expect(queueCacheOp.content.value).to.equal('queue-value');
    expect(queueCacheOp.content.writes).to.equal(1);
  });
}); 