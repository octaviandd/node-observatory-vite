import { describe, it, before, after, beforeEach, afterEach } from "mocha";
import { expect } from "chai";
import { Request, Response, NextFunction } from "express";
import request from "supertest";

// Import the patching code to ensure it's loaded
import "../../../lib/patchers/patch-express";
import { BaseExpressTest } from "./base-express";

describe('Express Request Watcher Tests', function() {
  this.timeout(10000);
  
  const baseTest = new BaseExpressTest();
  
  before(async function() {
    await baseTest.setup();
  });
  
  after(async function() {
    await baseTest.teardown();
  });
  
  beforeEach(function() {
    // Reset the app routes for each test
    baseTest.app._router.stack = baseTest.app._router.stack.filter(
      (layer: any) => !layer.route || layer.route.path === '*'
    );
  });
  
  it('should correctly track basic GET routes', async function() {
    // Set up a basic GET route
    baseTest.app.get('/test', (req, res) => {
      res.status(200).json({ message: 'Success' });
    });
    
    // Make a request to the route
    const response = await request(baseTest.app).get('/test');
    
    // Verify the response
    expect(response.status).to.equal(200);
    expect(response.body).to.deep.equal({ message: 'Success' });
    
    // Wait for data to be persisted
    await baseTest.waitForDataPersistence();
    
    // Get the request data
    const results = await baseTest.getRequestResults();
    
    // Find the request we just made
    const testRequest = baseTest.findRequest(results, {
      method: 'get',
      route: '/test',
      statusCode: 200
    });
    
    // Verify the request was tracked
    expect(testRequest, 'Request was not tracked').to.exist;
    
    // Validate the request data
    if (testRequest) {
      baseTest.validateRequestData(testRequest, {
        expectedMethod: 'get',
        expectedRoute: '/test',
        expectedStatusCode: 200
      });
    }
  });
  
  it('should correctly track POST routes with JSON body', async function() {
    // Set up a POST route that accepts JSON
    baseTest.app.post('/api/data', (req, res) => {
      res.status(201).json({ 
        message: 'Created', 
        data: req.body 
      });
    });
    
    // Test data
    const testData = { name: 'Test User', email: 'test@example.com' };
    
    // Make a POST request with JSON data
    const response = await request(baseTest.app)
      .post('/api/data')
      .send(testData)
      .set('Content-Type', 'application/json');
    
    // Verify the response
    expect(response.status).to.equal(201);
    expect(response.body).to.deep.equal({ 
      message: 'Created', 
      data: testData 
    });
    
    // Wait for data to be persisted
    await baseTest.waitForDataPersistence();
    
    // Get the request data
    const results = await baseTest.getRequestResults();
    
    // Find the request we just made
    const testRequest = baseTest.findRequest(results, {
      method: 'post',
      route: '/api/data',
      statusCode: 201
    });
    
    // Verify the request was tracked
    expect(testRequest, 'Request was not tracked').to.exist;
    
    // Validate the request data
    if (testRequest) {
      baseTest.validateRequestData(testRequest, {
        expectedMethod: 'post',
        expectedRoute: '/api/data',
        expectedStatusCode: 201
      });
      
      // Verify the payload was captured
      const content = testRequest.content;
      expect(content).to.have.property('responseSize');
    }
  });
  
  it('should correctly track query parameters', async function() {
    // Set up a route that uses query parameters
    baseTest.app.get('/search', (req, res) => {
      res.status(200).json({ query: req.query });
    });
    
    // Make a request with query parameters
    const response = await request(baseTest.app).get('/search?q=test&page=1');
    
    // Verify the response
    expect(response.status).to.equal(200);
    expect(response.body.query).to.deep.include({ q: 'test', page: '1' });
    
    // Wait for data to be persisted
    await baseTest.waitForDataPersistence();
    
    // Get the request data
    const results = await baseTest.getRequestResults();
    
    // Find the request we just made
    const testRequest = baseTest.findRequest(results, {
      method: 'get',
      route: '/search?q=test&page=1'
    });
    
    // Verify the request was tracked
    expect(testRequest, 'Request was not tracked').to.exist;
    
    // Validate the request data
    if (testRequest) {
      baseTest.validateRequestData(testRequest, {
        expectedMethod: 'get',
        expectedRoute: '/search?q=test&page=1',
        expectedStatusCode: 200
      });
      
      // Verify the query parameters were captured
      const content = testRequest.content;
      expect(content).to.have.property('query');
      expect(content.query).to.deep.include({ q: 'test', page: '1' });
    }
  });
  
  it('should correctly track middleware chains', async function() {
    // Create some test middleware
    const middleware1 = (req: Request, res: Response, next: NextFunction) => {
      (req as any).middleware1Called = true;
      next();
    };
    
    const middleware2 = (req: Request, res: Response, next: NextFunction) => {
      (req as any).middleware2Called = true;
      next();
    };
    
    // Set up a route with middleware
    baseTest.app.get('/middleware-test', 
      middleware1,
      middleware2,
      (req, res) => {
        res.status(200).json({ 
          middleware1Called: (req as any).middleware1Called,
          middleware2Called: (req as any).middleware2Called
        });
      }
    );
    
    // Make a request to the route
    const response = await request(baseTest.app).get('/middleware-test');
    
    // Verify the response
    expect(response.status).to.equal(200);
    expect(response.body).to.deep.equal({ 
      middleware1Called: true,
      middleware2Called: true
    });
    
    // Wait for data to be persisted
    await baseTest.waitForDataPersistence();
    
    // Get the request data
    const results = await baseTest.getRequestResults();
    
    // Find the request we just made
    const testRequest = baseTest.findRequest(results, {
      method: 'get',
      route: '/middleware-test'
    });
    
    // Verify the request was tracked
    expect(testRequest, 'Request was not tracked').to.exist;
    
    // Validate the request data
    if (testRequest) {
      baseTest.validateRequestData(testRequest, {
        expectedMethod: 'get',
        expectedRoute: '/middleware-test',
        expectedStatusCode: 200
      });
    }
  });
  
  it('should not track requests to observatory-api endpoints', async function() {
    // Set up a route that matches the observatory-api pattern
    baseTest.app.get('/observatory-api/metrics', (req, res) => {
      res.status(200).json({ metrics: 'data' });
    });
    
    // Make a request to the route
    const response = await request(baseTest.app).get('/observatory-api/metrics');
    
    // Verify the response
    expect(response.status).to.equal(200);
    expect(response.body).to.deep.equal({ metrics: 'data' });
    
    // Wait for data to be persisted
    await baseTest.waitForDataPersistence();
    
    // Get the request data
    const results = await baseTest.getRequestResults();
    
    // Find the request we just made
    const testRequest = results.find((r) => {
      const content = r.content;
      return content.route === '/observatory-api/metrics';
    });
    
    // Verify the request was NOT tracked
    expect(testRequest, 'Request should not have been tracked').to.not.exist;
  });
  
  it('should correctly track multiple requests to the same endpoint', async function() {
    // Set up a route
    baseTest.app.get('/multi-request', (req, res) => {
      res.status(200).json({ timestamp: Date.now() });
    });
    
    // Make multiple requests to the route
    await request(baseTest.app).get('/multi-request');
    await request(baseTest.app).get('/multi-request');
    await request(baseTest.app).get('/multi-request');
    
    // Wait for data to be persisted
    await baseTest.waitForDataPersistence();
    
    // Get the request data
    const results = await baseTest.getRequestResults();
    
    // Find the requests we just made
    const testRequests = results.filter((r) => {
      const content = r.content;
      return content.route === '/multi-request';
    });
    
    // Verify that all requests were tracked
    expect(testRequests.length, 'Not all requests were tracked').to.equal(3);
    
    // Validate each request
    testRequests.forEach((request) => {
      baseTest.validateRequestData(request, {
        expectedMethod: 'get',
        expectedRoute: '/multi-request',
        expectedStatusCode: 200
      });
    });
  });
  
  it('should correctly track request and response sizes', async function() {
    // Set up a route that returns a large response
    baseTest.app.post('/size-test', (req, res) => {
      // Generate a large response
      const responseData = {
        input: req.body,
        output: new Array(100).fill('test data')
      };
      res.status(200).json(responseData);
    });
    
    // Create a large request body
    const requestBody = {
      data: new Array(100).fill('request data')
    };
    
    // Make a request to the route
    const response = await request(baseTest.app)
      .post('/size-test')
      .send(requestBody);
    
    // Verify the response
    expect(response.status).to.equal(200);
    expect(response.body.input).to.deep.equal(requestBody);
    
    // Wait for data to be persisted
    await baseTest.waitForDataPersistence();
    
    // Get the request data
    const results = await baseTest.getRequestResults();
    
    // Find the request we just made
    const testRequest = baseTest.findRequest(results, {
      method: 'post',
      route: '/size-test'
    });
    
    // Verify the request was tracked
    expect(testRequest, 'Request was not tracked').to.exist;
    
    // Validate the request data
    if (testRequest) {
      baseTest.validateRequestData(testRequest, {
        expectedMethod: 'post',
        expectedRoute: '/size-test',
        expectedStatusCode: 200
      });
      
      // Verify the request and response sizes were captured
      const content = testRequest.content;
      expect(content).to.have.property('requestSize').that.is.a('number').and.is.greaterThan(0);
      expect(content).to.have.property('responseSize').that.is.a('number').and.is.greaterThan(0);
      
      // The response size should be larger than the request size in this case
      expect(content.responseSize).to.be.greaterThan(content.requestSize);
    }
  });
  
  it('should handle high volume of concurrent requests', async function() {
    // Set up a simple route for load testing
    baseTest.app.get('/high-load', (req, res) => {
      res.status(200).json({ message: 'Success' });
    });
    
    // Number of concurrent requests to make
    const requestCount = 50;
    
    // Create an array of request promises
    const requests = Array(requestCount).fill(0).map(() => 
      request(baseTest.app).get('/high-load')
    );
    
    // Execute all requests concurrently
    const responses = await Promise.all(requests);
    
    // Verify all responses are successful
    responses.forEach(response => {
      expect(response.status).to.equal(200);
      expect(response.body).to.deep.equal({ message: 'Success' });
    });
    
    // Wait for data to be persisted (may need longer time for many requests)
    await baseTest.waitForDataPersistence();
    
    // Get the request data
    const results = await baseTest.getRequestResults('all', 50);
    
    // Find the requests we just made
    const highLoadRequests = results.filter((r) => {
      const content = r.content;
      return content.route === '/high-load';
    });
    
    // Verify that all requests were tracked
    expect(highLoadRequests.length, 'Not all high-load requests were tracked').to.equal(requestCount);
    
    // Validate each request
    highLoadRequests.forEach((request) => {
      baseTest.validateRequestData(request, {
        expectedMethod: 'get',
        expectedRoute: '/high-load',
        expectedStatusCode: 200
      });
    });
  });
}); 