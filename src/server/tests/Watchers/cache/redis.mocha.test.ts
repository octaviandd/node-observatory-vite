import { describe, it, expect, beforeAll } from 'vitest'
import request from "supertest";

import { BaseCacheTest } from "./base-cache";
import { createClient } from "redis";

describe('Redis Tests', function(this: any) {
  this.timeout(5000);
  
  const baseTest = new BaseCacheTest();
  let testRedis: any;
  
  beforeAll(async function() {
    await baseTest.setup();
    
    // Create Redis client
    testRedis = createClient({
      url: "redis://localhost:6379",
    });
    await testRedis.connect();
    
    // Define test routes for Redis
    baseTest.app.get('/test-redis-set', async (req, res) => {
      await testRedis.set('redis-key', 'redis-value');
      res.send('Redis set');
    });
    
    baseTest.app.get('/test-redis-get-hit', async (req, res) => {
      await testRedis.set('redis-hit-key', 'redis-hit-value');
      const value = await testRedis.get('redis-hit-key');
      res.send(value || 'Not found');
    });
    
    baseTest.app.get('/test-redis-get-miss', async (req, res) => {
      const value = await testRedis.get('non-existent-key');
      res.send(value || 'Not found');
    });
    
    baseTest.app.get('/test-redis-delete', async (req, res) => {
      await testRedis.set('redis-delete-key', 'delete-value');
      await testRedis.del('redis-delete-key');
      res.send('Redis deleted');
    });
    
    baseTest.app.get('/test-redis-exists', async (req, res) => {
      await testRedis.set('redis-exists-key', 'exists-value');
      const exists = await testRedis.exists('redis-exists-key');
      res.send(exists ? 'Exists' : 'Not found');
    });
    
    // Multiple key operations
    baseTest.app.get('/test-redis-mset', async (req, res) => {
      await testRedis.mSet({
        'mset-key1': 'value1',
        'mset-key2': 'value2',
        'mset-key3': 'value3'
      });
      res.send('Multiple keys set');
    });
    
    baseTest.app.get('/test-redis-mget', async (req, res) => {
      await testRedis.mSet({
        'mget-key1': 'value1',
        'mget-key2': 'value2'
      });
      const values = await testRedis.mGet(['mget-key1', 'mget-key2', 'mget-nonexistent']);
      res.json(values);
    });
    
    baseTest.app.get('/test-redis-multi-del', async (req, res) => {
      await testRedis.set('multi-key1', 'value1');
      await testRedis.set('multi-key2', 'value2');
      await testRedis.set('multi-key3', 'value3');
      const deleted = await testRedis.del(['multi-key1', 'multi-key2', 'multi-key3']);
      res.send(`Deleted ${deleted} keys`);
    });
    
    // Bull queue route
    baseTest.app.get('/test-redis-bull-queue', async (req, res) => {
      // Add job to queue
      await baseTest.cacheQueue.add('redis-operation', {
        operation: 'set',
        key: 'queue-key',
        value: 'queue-value'
      });
      
      res.send('Redis Bull queue job added');
    });
    
    // Process jobs in the queue
    baseTest.cacheQueue.process('redis-operation', async (job) => {
      const { data } = job;
      if (data.operation === 'set') {
        await testRedis.set(data.key, data.value);
      } else if (data.operation === 'get') {
        return await testRedis.get(data.key);
      } else if (data.operation === 'delete') {
        await testRedis.del(data.key);
      }
      return { success: true };
    });
  });
  
  after(async function() {
    try {
      if (testRedis) {
        await testRedis.quit();
      }
    } catch (error) {
      console.error('Error disconnecting Redis:', error);
    }
    
    await baseTest.cacheQueue.close();
  });
  
  it('should track cache set operations with Redis', async function() {
    await request(baseTest.app).get('/test-redis-set');
    
    await baseTest.waitForDataPersistence();
    
    const results = await baseTest.getCacheResults();
    
    const setCacheOp = results.find((r: any) => 
      r.content.package === 'redis' && r.content.key === 'redis-key' && r.content.type === 'set'
    );
    
    expect(setCacheOp).to.exist;
    expect(setCacheOp.content.value).to.equal('redis-value');
    expect(setCacheOp.content.writes).to.equal(1);
  });
  
  it('should track cache get hit operations with Redis', async function() {
    await request(baseTest.app).get('/test-redis-get-hit');
    
    await baseTest.waitForDataPersistence();
    
    const results = await baseTest.getCacheResults();
    
    const getCacheOp = results.find((r: any) => 
      r.content.package === 'redis' && 
      r.content.key === 'redis-hit-key' && 
      r.content.type === 'get'
    );
    
    expect(getCacheOp).to.exist;
    expect(getCacheOp.content.hits).to.equal(1);
    expect(getCacheOp.content.misses).to.equal(0);
    expect(getCacheOp.content.value).to.equal('redis-hit-value');
  });
  
  it('should track cache get miss operations with Redis', async function() {
    await request(baseTest.app).get('/test-redis-get-miss');
    
    await baseTest.waitForDataPersistence();
    
    const results = await baseTest.getCacheResults();
    
    const getCacheOp = results.find((r: any) => 
      r.content.package === 'redis' && 
      r.content.key === 'non-existent-key' && 
      r.content.type === 'get'
    );
    
    expect(getCacheOp).to.exist;
    expect(getCacheOp.content.hits).to.equal(0);
    expect(getCacheOp.content.misses).to.equal(1);
    expect(getCacheOp.content.value).to.be.null;
  });
  
  it('should track cache delete operations with Redis', async function() {
    await request(baseTest.app).get('/test-redis-delete');
    
    await baseTest.waitForDataPersistence();
    
    const results = await baseTest.getCacheResults();
    
    const deleteCacheOp = results.find((r: any) => 
      r.content.package === 'redis' && r.content.key === 'redis-delete-key' && r.content.type === 'del'
    );
    
    expect(deleteCacheOp).to.exist;
    expect(deleteCacheOp.content.writes).to.equal(1);
  });
  
  it('should track exists operations with Redis', async function() {
    await request(baseTest.app).get('/test-redis-exists');
    
    await baseTest.waitForDataPersistence();
    
    const results = await baseTest.getCacheResults();
    
    const existsCacheOp = results.find((r: any) => 
      r.content.package === 'redis' && 
      r.content.key === 'redis-exists-key' && 
      r.content.type === 'exists'
    );
    
    expect(existsCacheOp).to.exist;
    expect(existsCacheOp.content.hits).to.equal(1);
    expect(existsCacheOp.content.misses).to.equal(0);
  });

  // it('should track mset operations with Redis', async function() {
  //   await request(baseTest.app).get('/test-redis-mset');
    
  //   await baseTest.waitForDataPersistence();
    
  //   const results = await baseTest.getCacheResults();
    
  //   const msetOp = results.find((r: any) => 
  //     r.content.package === 'redis' && 
  //     r.content.type === 'mSet'
  //   );
    
  //   expect(msetOp).to.exist;
  //   expect(msetOp.content.keyValueObj).to.deep.include({
  //     'mset-key1': 'value1',
  //     'mset-key2': 'value2',
  //     'mset-key3': 'value3'
  //   });
  //   expect(msetOp.content.writes).to.equal(3);
  // });
  
  // it('should track mget operations with Redis', async function() {
  //   await request(baseTest.app).get('/test-redis-mget');
    
  //   await baseTest.waitForDataPersistence();
    
  //   const results = await baseTest.getCacheResults();
    
  //   const mgetOp = results.find((r: any) => 
  //     r.content.package === 'redis' && 
  //     r.content.type === 'mGet'
  //   );
    
  //   expect(mgetOp).to.exist;
  //   expect(mgetOp.content.hits).to.equal(2);
  //   expect(mgetOp.content.misses).to.equal(1);
  //   expect(mgetOp.content.value).to.deep.equal(['value1', 'value2', null]);
  // });
  
  // it('should track multiple key deletions with Redis', async function() {
  //   await request(baseTest.app).get('/test-redis-multi-del');
    
  //   await baseTest.waitForDataPersistence();
    
  //   const results = await baseTest.getCacheResults();
    
  //   const multiDelOp = results.find((r: any) => 
  //     r.content.package === 'redis' && 
  //     r.content.type === 'del' &&
  //     Array.isArray(r.content.key)
  //   );
    
  //   expect(multiDelOp).to.exist;
  //   expect(multiDelOp.content.key).to.have.members(['multi-key1', 'multi-key2', 'multi-key3']);
  //   expect(multiDelOp.content.writes).to.equal(1);
  // });
  
  it('should track cache operations made through Bull queue with Redis', async function() {
    await request(baseTest.app).get('/test-redis-bull-queue');
    
    // Wait longer for the queue to process the job
    await baseTest.waitForDataPersistence(4000);
    
    const results = await baseTest.getCacheResults();
    
    const queueCacheOp = results.find((r: any) => 
      r.content.package === 'redis' && 
      r.content.key === 'queue-key' && 
      r.content.type === 'set'
    );
    
    expect(queueCacheOp).to.exist;
    expect(queueCacheOp.content.value).to.equal('queue-value');
    expect(queueCacheOp.content.writes).to.equal(1);
  });
  
  it('should retrieve cache operation details', async function() {
    await request(baseTest.app).get('/test-redis-set');
    
    await baseTest.waitForDataPersistence();
    
    const results = await baseTest.getCacheResults();
    const cacheId = results.find((r: any) => 
      r.content.package === 'redis' && r.content.type === 'set'
    ).uuid;
    
    const cacheData = await baseTest.getCacheDetails(cacheId);
    
    expect(cacheData).to.have.property('cache');
    expect(cacheData.cache[0].type).to.equal('cache');
    expect(cacheData.cache[0].content).to.have.property('key');
    expect(cacheData.cache[0].content).to.have.property('value');
  });
  
  it('should get graph data for cache operations', async function() {
    await request(baseTest.app).get('/test-redis-set');
    await request(baseTest.app).get('/test-redis-get-hit');
    
    await baseTest.waitForDataPersistence();
    
    const graphData = await baseTest.getGraphData();
    
    expect(graphData).to.have.property('countFormattedData');
    expect(graphData).to.have.property('count');
  });
});
