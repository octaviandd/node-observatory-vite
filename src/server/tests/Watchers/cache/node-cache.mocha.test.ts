import { describe, it, expect, beforeAll } from 'vitest'
import request from "supertest";

import { BaseCacheTest } from "./base-cache";
import NodeCache from "node-cache";

describe('NodeCache Tests', function(this: any) {
  // Increase timeout for real database operations
  this.timeout(10000);
  
  const baseTest = new BaseCacheTest();
  let testNodeCache: NodeCache;
  
  beforeAll(async function() {
    console.log("Setting up test environment with real database connections...");
    await baseTest.setup();
    
    // Create NodeCache instance
    testNodeCache = new NodeCache();
    
    // Create more comprehensive test routes for NodeCache
    baseTest.app.get('/test-nodecache-set', (req, res) => {
      console.log("Setting key 'nodecache-key' in NodeCache");
      testNodeCache.set('nodecache-key', 'nodecache-value');
      res.send('NodeCache set');
    });
    
    baseTest.app.get('/test-nodecache-set-ttl', (req, res) => {
      console.log("Setting key with TTL");
      testNodeCache.set('ttl-key', 'ttl-value', 60); // 60 second TTL
      res.send('NodeCache set with TTL');
    });
    
    baseTest.app.get('/test-nodecache-get-hit', (req, res) => {
      console.log("Getting existing key (testing cache hit)");
      testNodeCache.set('hit-key', 'hit-value');
      const value = testNodeCache.get('hit-key');
      res.send(value || 'Not found');
    });
    
    baseTest.app.get('/test-nodecache-get-miss', (req, res) => {
      console.log("Getting non-existent key (testing cache miss)");
      const value = testNodeCache.get('non-existent-key');
      res.send(value || 'Not found');
    });
    
    baseTest.app.get('/test-nodecache-has-hit', (req, res) => {
      testNodeCache.set('has-key', 'has-value');
      const exists = testNodeCache.has('has-key');
      res.send(exists ? 'Exists' : 'Does not exist');
    });
    
    baseTest.app.get('/test-nodecache-has-miss', (req, res) => {
      const exists = testNodeCache.has('missing-key');
      res.send(exists ? 'Exists' : 'Does not exist');
    });
    
    baseTest.app.get('/test-nodecache-take-hit', (req, res) => {
      testNodeCache.set('take-key', 'take-value');
      const value = testNodeCache.take('take-key');
      res.send(value || 'Not found');
    });
    
    baseTest.app.get('/test-nodecache-take-miss', (req, res) => {
      const value = testNodeCache.take('missing-take-key');
      res.send(value || 'Not found');
    });
    
    baseTest.app.get('/test-nodecache-delete', (req, res) => {
      testNodeCache.set('delete-key', 'delete-value');
      testNodeCache.del('delete-key');
      res.send('NodeCache deleted');
    });
    
    baseTest.app.get('/test-nodecache-multi-del', (req, res) => {
      testNodeCache.set('mdel-key1', 'mdel-value1');
      testNodeCache.set('mdel-key2', 'mdel-value2');
      testNodeCache.del(['mdel-key1', 'mdel-key2']);
      res.send('NodeCache multi-deleted');
    });
    
    baseTest.app.get('/test-nodecache-mset', (req, res) => {
      testNodeCache.mset([
        { key: 'mset-key1', val: 'mset-value1' },
        { key: 'mset-key2', val: 'mset-value2' }
      ]);
      res.send('NodeCache multi-set');
    });
    
    baseTest.app.get('/test-nodecache-mget-hit', (req, res) => {
      testNodeCache.set('mget-key1', 'mget-value1');
      testNodeCache.set('mget-key2', 'mget-value2');
      const values = testNodeCache.mget(['mget-key1', 'mget-key2']);
      res.json(values);
    });
    
    baseTest.app.get('/test-nodecache-mget-mixed', (req, res) => {
      testNodeCache.set('mget-key1', 'mget-value1');
      const values = testNodeCache.mget(['mget-key1', 'mget-missing']);
      res.json(values);
    });
    
    baseTest.app.get('/test-nodecache-mget-miss', (req, res) => {
      const values = testNodeCache.mget(['mget-missing1', 'mget-missing2']);
      res.json(values);
    });
    
    baseTest.app.get('/test-nodecache-flush-all', (req, res) => {
      testNodeCache.set('flush-key1', 'flush-value1');
      testNodeCache.set('flush-key2', 'flush-value2');
      testNodeCache.flushAll();
      res.send('Cache flushed');
    });
    
    console.log("Test environment setup complete");
  });
  
  after(async function() {
    console.log("Cleaning up test resources...");
    await baseTest.teardown();
    console.log("Test resources cleaned up");
  });
  
  beforeEach(async function() {
    // Clean up the cache before each test to ensure test isolation
    testNodeCache.flushAll();
    this.timeout(1000);   
  });
  
  it('should track simple cache set operations', async function() {
    await request(baseTest.app).get('/test-nodecache-set');
    await baseTest.waitForDataPersistence(1000);
    
    const results = await baseTest.getCacheResults();
    const setCacheOp = results.find((r: any) => 
      r.content.package === 'node-cache' && 
      r.content.key === 'nodecache-key' && 
      r.content.type === 'set'
    );
    
    expect(setCacheOp).to.exist;
    expect(setCacheOp.content.value).to.equal('nodecache-value');
    expect(setCacheOp.content.writes).to.be.at.least(1);
  });
  
  it('should track cache set with TTL', async function() {
    await request(baseTest.app).get('/test-nodecache-set-ttl');
    await baseTest.waitForDataPersistence(1000);
    
    const results = await baseTest.getCacheResults();
    const setCacheOp = results.find((r: any) => 
      r.content.package === 'node-cache' && 
      r.content.key === 'ttl-key' && 
      r.content.type === 'set'
    );
    
    expect(setCacheOp).to.exist;
    expect(setCacheOp.content.value).to.equal('ttl-value');
    expect(setCacheOp.content.writes).to.be.at.least(1);
  });
  
  it('should track cache hit operations', async function() {
    await request(baseTest.app).get('/test-nodecache-get-hit');
    await baseTest.waitForDataPersistence(1000);
    
    const results = await baseTest.getCacheResults();
    const getCacheOp = results.find((r: any) => 
      r.content.package === 'node-cache' && 
      r.content.key === 'hit-key' && 
      r.content.type === 'get'
    );
    
    expect(getCacheOp).to.exist;
    expect(getCacheOp.content.hits).to.equal(1);
    expect(getCacheOp.content.misses).to.equal(0);
    expect(getCacheOp.content.value).to.equal('hit-value');
  });
  
  it('should track cache miss operations', async function() {
    await request(baseTest.app).get('/test-nodecache-get-miss');
    await baseTest.waitForDataPersistence(1000);
    
    const results = await baseTest.getCacheResults();
    const missCacheOp = results.find((r: any) => 
      r.content.package === 'node-cache' && 
      r.content.key === 'non-existent-key' && 
      r.content.type === 'get'
    );
    
    expect(missCacheOp).to.exist;
    expect(missCacheOp.content.hits).to.equal(0);
    expect(missCacheOp.content.misses).to.equal(1);
  });
  
  it('should track has operations with hits', async function() {
    await request(baseTest.app).get('/test-nodecache-has-hit');
    await baseTest.waitForDataPersistence(1000);
    
    const results = await baseTest.getCacheResults();
    const hasCacheOp = results.find((r: any) => 
      r.content.package === 'node-cache' && 
      r.content.key === 'has-key' && 
      r.content.type === 'has'
    );
    
    expect(hasCacheOp).to.exist;
    expect(hasCacheOp.content.hits).to.equal(1);
    expect(hasCacheOp.content.misses).to.equal(0);
  });
  
  it('should track has operations with misses', async function() {
    await request(baseTest.app).get('/test-nodecache-has-miss');
    await baseTest.waitForDataPersistence(1000);
    
    const results = await baseTest.getCacheResults();
    const hasCacheOp = results.find((r: any) => 
      r.content.package === 'node-cache' && 
      r.content.key === 'missing-key' && 
      r.content.type === 'has'
    );
    
    expect(hasCacheOp).to.exist;
    expect(hasCacheOp.content.hits).to.equal(0);
    expect(hasCacheOp.content.misses).to.equal(1);
  });
  
  it('should track take operations with hits', async function() {
    await request(baseTest.app).get('/test-nodecache-take-hit');
    await baseTest.waitForDataPersistence(1000);
    
    const results = await baseTest.getCacheResults();
    const takeCacheOp = results.find((r: any) => 
      r.content.package === 'node-cache' && 
      r.content.key === 'take-key' && 
      r.content.type === 'take'
    );
    
    expect(takeCacheOp).to.exist;
    expect(takeCacheOp.content.hits).to.equal(1);
    expect(takeCacheOp.content.misses).to.equal(0);
    expect(takeCacheOp.content.value).to.equal('take-value');
  });
  
  it('should track take operations with misses', async function() {
    await request(baseTest.app).get('/test-nodecache-take-miss');
    await baseTest.waitForDataPersistence(1000);
    
    const results = await baseTest.getCacheResults();
    const takeCacheOp = results.find((r: any) => 
      r.content.package === 'node-cache' && 
      r.content.key === 'missing-take-key' && 
      r.content.type === 'take'
    );
    
    expect(takeCacheOp).to.exist;
    expect(takeCacheOp.content.hits).to.equal(0);
    expect(takeCacheOp.content.misses).to.equal(1);
  });
  
  it('should track delete operations', async function() {
    await request(baseTest.app).get('/test-nodecache-delete');
    await baseTest.waitForDataPersistence(1000);
    
    const results = await baseTest.getCacheResults();
    const delCacheOp = results.find((r: any) => 
      r.content.package === 'node-cache' && 
      r.content.key === 'delete-key' && 
      r.content.type === 'del'
    );
    
    expect(delCacheOp).to.exist;
    expect(delCacheOp.content.writes).to.equal(1);
  });
  
  // it('should track multi-delete operations', async function() {
  //   await request(baseTest.app).get('/test-nodecache-multi-del');
  //   await baseTest.waitForDataPersistence(1000);
    
  //   const results = await baseTest.getCacheResults();
  //   const delCacheOp = results.find((r: any) => 
  //     r.content.package === 'node-cache' && 
  //     r.content.type === 'del'
  //   );    
    
  //   expect(delCacheOp).to.exist;
  //   expect(delCacheOp.content.writes).to.equal(2); // Deleted 2 keys
  //   expect(delCacheOp.content.keys).to.include.members(['mdel-key1', 'mdel-key2']);
  // });
  
  // it('should track multi-set operations', async function() {
  //   await request(baseTest.app).get('/test-nodecache-mset');
  //   await baseTest.waitForDataPersistence(1000);
    
  //   const results = await baseTest.getCacheResults();
  //   const msetCacheOp = results.find((r: any) => 
  //     r.content.package === 'node-cache' && 
  //     r.content.type === 'mset'
  //   );
    
  //   expect(msetCacheOp).to.exist;
  //   expect(msetCacheOp.content.writes).to.equal(2); // Setting 2 keys
  //   expect(msetCacheOp.content.keys).to.include.members(['mset-key1', 'mset-key2']);
  // });
  
  // it('should track multi-get operations with all hits', async function() {
  //   await request(baseTest.app).get('/test-nodecache-mget-hit');
  //   await baseTest.waitForDataPersistence(1000);
    
  //   const results = await baseTest.getCacheResults();
  //   const mgetCacheOp = results.find((r: any) => 
  //     r.content.package === 'node-cache' && 
  //     r.content.type === 'mget'
  //   );
    
  //   expect(mgetCacheOp).to.exist;
  //   expect(mgetCacheOp.content.hits).to.equal(2);
  //   expect(mgetCacheOp.content.misses).to.equal(0);
  // });
  
  // it('should track multi-get operations with mixed hits/misses', async function() {
  //   await request(baseTest.app).get('/test-nodecache-mget-mixed');
  //   await baseTest.waitForDataPersistence(1000);
    
  //   const results = await baseTest.getCacheResults();
  //   const mgetCacheOp = results.find((r: any) => 
  //     r.content.package === 'node-cache' && 
  //     r.content.type === 'mget'
  //   );
    
  //   expect(mgetCacheOp).to.exist;
  //   expect(mgetCacheOp.content.hits).to.equal(1);
  //   expect(mgetCacheOp.content.misses).to.equal(1);
  // });
  
  // it('should track multi-get operations with all misses', async function() {
  //   await request(baseTest.app).get('/test-nodecache-mget-miss');
  //   await baseTest.waitForDataPersistence(1000);
    
  //   const results = await baseTest.getCacheResults();
  //   const mgetCacheOp = results.find((r: any) => 
  //     r.content.package === 'node-cache' && 
  //     r.content.type === 'mget'
  //   );
    
  //   expect(mgetCacheOp).to.exist;
  //   expect(mgetCacheOp.content.hits).to.equal(0);
  //   expect(mgetCacheOp.content.misses).to.equal(2);
  // });
  
  // it('should track flushAll operations', async function() {
  //   await request(baseTest.app).get('/test-nodecache-flush-all');
  //   await baseTest.waitForDataPersistence(1000);
    
  //   const results = await baseTest.getCacheResults();
  //   const flushCacheOp = results.find((r: any) => 
  //     r.content.package === 'node-cache' && 
  //     r.content.type === 'flushAll'
  //   );
    
  //   expect(flushCacheOp).to.exist;
  //   expect(flushCacheOp.content.writes).to.be.at.least(1);
  // });
  
  it('should verify original cache functionality works correctly', function() {
    // Make sure our patching doesn't break the original functionality
    testNodeCache.set('test-key', 'test-value');
    const value = testNodeCache.get('test-key');
    expect(value).to.equal('test-value');
    
    testNodeCache.del('test-key');
    const deletedValue = testNodeCache.get('test-key');
    expect(deletedValue).to.be.undefined;
  });
}); 