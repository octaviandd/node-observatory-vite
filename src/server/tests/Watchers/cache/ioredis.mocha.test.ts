import { describe, it, expect } from 'vitest'
import request from "supertest";

import { BaseCacheTest } from "./base-cache";
import Redis from "ioredis";

describe('IoRedis Tests', function(this: any) {
  this.timeout(5000);
  
  const baseTest = new BaseCacheTest();
  let testIoRedis: Redis;
  
  before(async function() {
    await baseTest.setup();
    
    // Create IoRedis instance
    testIoRedis = new Redis({
      host: 'localhost',
      port: 6379,
      lazyConnect: true
    });
    
    try {
      await testIoRedis.connect();
    } catch (error) {
      console.error('IoRedis connection error:', error);
    }
    
    // Define test routes for IoRedis
    baseTest.app.get('/test-ioredis-set', async (req, res) => {
      await testIoRedis.set('ioredis-key', 'ioredis-value');
      res.send('IoRedis set');
    });
    
    baseTest.app.get('/test-ioredis-get-hit', async (req, res) => {
      await testIoRedis.set('ioredis-hit-key', 'ioredis-hit-value');
      const value = await testIoRedis.get('ioredis-hit-key');
      res.send(value || 'Not found');
    });
    
    baseTest.app.get('/test-ioredis-get-miss', async (req, res) => {
      const value = await testIoRedis.get('non-existent-key');
      res.send(value || 'Not found');
    });
    
    baseTest.app.get('/test-ioredis-delete', async (req, res) => {
      await testIoRedis.set('ioredis-delete-key', 'delete-value');
      await testIoRedis.del('ioredis-delete-key');
      res.send('IoRedis deleted');
    });
    
    baseTest.app.get('/test-ioredis-exists', async (req, res) => {
      await testIoRedis.set('ioredis-exists-key', 'exists-value');
      const exists = await testIoRedis.exists('ioredis-exists-key');
      res.send(exists ? 'Exists' : 'Not found');
    });
    
    // Multiple key operations
    baseTest.app.get('/test-ioredis-mset', async (req, res) => {
      await testIoRedis.mset('mset-key1', 'value1', 'mset-key2', 'value2', 'mset-key3', 'value3');
      res.send('Multiple keys set');
    });
    
    baseTest.app.get('/test-ioredis-mset-object', async (req, res) => {
      const obj = {
        'mset-obj-key1': 'value1',
        'mset-obj-key2': 'value2',
        'mset-obj-key3': 'value3'
      };
      await testIoRedis.mset(obj);
      res.send('Multiple keys set (object)');
    });
    
    baseTest.app.get('/test-ioredis-mget', async (req, res) => {
      await testIoRedis.mset('mget-key1', 'value1', 'mget-key2', 'value2');
      const values = await testIoRedis.mget('mget-key1', 'mget-key2', 'mget-nonexistent');
      res.json(values);
    });
    
    baseTest.app.get('/test-ioredis-multi-del', async (req, res) => {
      await testIoRedis.set('multi-key1', 'value1');
      await testIoRedis.set('multi-key2', 'value2');
      await testIoRedis.set('multi-key3', 'value3');
      const deleted = await testIoRedis.del(['multi-key1', 'multi-key2', 'multi-key3']);
      res.send(`Deleted ${deleted} keys`);
    });
    
    // Add route for Bull queue cache test
    baseTest.app.get('/test-ioredis-bull-queue', async (req, res) => {
      // Add job to queue
      await baseTest.cacheQueue.add('ioredis-operation', {
        operation: 'set',
        key: 'queue-key',
        value: 'queue-value'
      });
      
      res.send('IoRedis Bull queue job added');
    });
    
    // Process jobs in the queue
    baseTest.cacheQueue.process('ioredis-operation', async (job) => {
      const { data } = job;
      if (data.operation === 'set') {
        await testIoRedis.set(data.key, data.value);
      } else if (data.operation === 'get') {
        return await testIoRedis.get(data.key);
      } else if (data.operation === 'delete') {
        await testIoRedis.del(data.key);
      }
      return { success: true };
    });
  });
  
  after(async function() {
  });
  
  it('should track cache set operations with IoRedis', async function() {
    await request(baseTest.app).get('/test-ioredis-set');
    
    await baseTest.waitForDataPersistence();
    
    const results = await baseTest.getCacheResults();
    
    const setCacheOp = results.find((r: any) => 
      r.content.package === 'ioredis' && r.content.key === 'ioredis-key' && r.content.type === 'set'
    );
    
    expect(setCacheOp).to.exist;
    expect(setCacheOp.content.value).to.equal('ioredis-value');
    expect(setCacheOp.content.writes).to.equal(1);
  });
  
  it('should track cache get hit operations with IoRedis', async function() {
    await request(baseTest.app).get('/test-ioredis-get-hit');
    
    await baseTest.waitForDataPersistence();
    
    const results = await baseTest.getCacheResults();
    
    const getCacheOp = results.find((r: any) => 
      r.content.package === 'ioredis' && 
      r.content.key === 'ioredis-hit-key' && 
      r.content.type === 'get'
    );
    
    expect(getCacheOp).to.exist;
    expect(getCacheOp.content.hits).to.equal(1);
    expect(getCacheOp.content.misses).to.equal(0);
    expect(getCacheOp.content.value).to.equal('ioredis-hit-value');
  });
  
  it('should track cache get miss operations with IoRedis', async function() {
    await request(baseTest.app).get('/test-ioredis-get-miss');
    
    await baseTest.waitForDataPersistence();
    
    const results = await baseTest.getCacheResults();
    
    const getCacheOp = results.find((r: any) => 
      r.content.package === 'ioredis' && 
      r.content.key === 'non-existent-key' && 
      r.content.type === 'get'
    );
    
    expect(getCacheOp).to.exist;
    expect(getCacheOp.content.hits).to.equal(0);
    expect(getCacheOp.content.misses).to.equal(1);
    expect(getCacheOp.content.value).to.be.null;
  });
  
  it('should track cache delete operations with IoRedis', async function() {
    await request(baseTest.app).get('/test-ioredis-delete');
    
    await baseTest.waitForDataPersistence();
    
    const results = await baseTest.getCacheResults();
    
    const deleteCacheOp = results.find((r: any) => 
      r.content.package === 'ioredis' && r.content.key === 'ioredis-delete-key' && r.content.type === 'del'
    );
    
    expect(deleteCacheOp).to.exist;
    expect(deleteCacheOp.content.writes).to.equal(1);
  });
  
  it('should track exists operations with IoRedis', async function() {
    await request(baseTest.app).get('/test-ioredis-exists');
    
    await baseTest.waitForDataPersistence();
    
    const results = await baseTest.getCacheResults();
    
    const existsCacheOp = results.find((r: any) => 
      r.content.package === 'ioredis' && 
      r.content.key === 'ioredis-exists-key' && 
      r.content.type === 'exists'
    );
    
    expect(existsCacheOp).to.exist;
    expect(existsCacheOp.content.hits).to.equal(1);
    expect(existsCacheOp.content.misses).to.equal(0);
  });

  // it('should track mset operations with IoRedis (argument list)', async function() {
  //   await request(baseTest.app).get('/test-ioredis-mset');
    
  //   await baseTest.waitForDataPersistence();
    
  //   const results = await baseTest.getCacheResults();
    
  //   const msetOp = results.find((r: any) => 
  //     r.content.package === 'ioredis' && 
  //     r.content.type === 'mset'
  //   );
    
  //   expect(msetOp).to.exist;
  //   expect(msetOp.content.writes).to.equal(3);
  // });
  
  // it('should track mset operations with IoRedis (object form)', async function() {
  //   await request(baseTest.app).get('/test-ioredis-mset-object');
    
  //   await baseTest.waitForDataPersistence();
    
  //   const results = await baseTest.getCacheResults();
    
  //   const msetOp = results.find((r: any) => 
  //     r.content.package === 'ioredis' && 
  //     r.content.type === 'mset' &&
  //     r.content.key.length === 3
  //   );
    
  //   expect(msetOp).to.exist;
  //   expect(msetOp.content.writes).to.equal(3);
  // });
  
  // it('should track mget operations with IoRedis', async function() {
  //   await request(baseTest.app).get('/test-ioredis-mget');
    
  //   await baseTest.waitForDataPersistence();
    
  //   const results = await baseTest.getCacheResults();
    
  //   const mgetOp = results.find((r: any) => 
  //     r.content.package === 'ioredis' && 
  //     r.content.type === 'mget'
  //   );
    
  //   expect(mgetOp).to.exist;
  //   expect(mgetOp.content.hits).to.equal(2);
  //   expect(mgetOp.content.misses).to.equal(1);
  //   expect(mgetOp.content.value).to.deep.equal(['value1', 'value2', null]);
  // });
  
  // it('should track multiple key deletions with IoRedis', async function() {
  //   await request(baseTest.app).get('/test-ioredis-multi-del');
    
  //   await baseTest.waitForDataPersistence();
    
  //   const results = await baseTest.getCacheResults();
    
  //   const multiDelOp = results.find((r: any) => 
  //     r.content.package === 'ioredis' && 
  //     r.content.type === 'del' &&
  //     Array.isArray(r.content.key)
  //   );
    
  //   expect(multiDelOp).to.exist;
  //   expect(multiDelOp.content.key).to.have.members(['multi-key1', 'multi-key2', 'multi-key3']);
  //   expect(multiDelOp.content.writes).to.equal(1);
  // });
  
  it('should track cache operations made through Bull queue with IoRedis', async function() {
    await request(baseTest.app).get('/test-ioredis-bull-queue');
    
    // Wait longer for the queue to process the job
    await baseTest.waitForDataPersistence(2000);
    
    const results = await baseTest.getCacheResults();
    
    const queueCacheOp = results.find((r: any) => 
      r.content.package === 'ioredis' && 
      r.content.key === 'queue-key' && 
      r.content.type === 'set'
    );
    
    expect(queueCacheOp).to.exist;
    expect(queueCacheOp.content.value).to.equal('queue-value');
    expect(queueCacheOp.content.writes).to.equal(1);
  });
}); 