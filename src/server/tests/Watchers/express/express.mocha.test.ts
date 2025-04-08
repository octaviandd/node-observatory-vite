import { describe, it, before, after, beforeEach, afterEach } from "mocha";
import { expect } from "chai";
import express, { Request, Response, NextFunction } from "express";
import request from "supertest";

// Import the patching code to ensure it's loaded
import "../../../lib/patchers/patch-express";
import { BaseExpressTest } from "./base-express";

describe('Express Patching Tests', function() {
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
  
  it('should correctly handle basic GET routes', async function() {
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
  
  it('should correctly handle POST routes with JSON body', async function() {
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
      expect(content).to.have.property('responseSize').that.is.greaterThan(0);
    }
  });
  
  it('should correctly handle route parameters', async function() {
    // Set up a route with parameters
    baseTest.app.get('/users/:id', (req, res) => {
      res.status(200).json({ userId: req.params.id });
    });
    
    // Make a request with a parameter
    const response = await request(baseTest.app).get('/users/123');
    
    // Verify the response
    expect(response.status).to.equal(200);
    expect(response.body).to.deep.equal({ userId: '123' });
    
    // Wait for data to be persisted
    await baseTest.waitForDataPersistence();
    
    // Get the request data
    const results = await baseTest.getRequestResults();
    
    // Find the request we just made
    const testRequest = baseTest.findRequest(results, {
      method: 'get',
      route: '/users/123'
    });
    
    // Verify the request was tracked
    expect(testRequest, 'Request was not tracked').to.exist;
  });
  
  it('should correctly handle query parameters', async function() {
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
    const testRequest = results.find((r) => {
      const content = r.content;
      return content.route.startsWith('/search') && content.method === 'get';
    });
    
    // Verify the request was tracked
    expect(testRequest, 'Request was not tracked').to.exist;
    
    // Verify the query parameters were captured
    if (testRequest) {
      const content = testRequest.content;
      expect(content).to.have.property('query').that.deep.include({ q: 'test', page: '1' });
    }
  });
  
  it('should correctly handle middleware chains', async function() {
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
  });
  
  it('should correctly handle error middleware', async function() {
    // Create an error middleware
    const errorMiddleware = (err: Error, req: Request, res: Response, next: NextFunction) => {
      res.status(500).json({ error: err.message });
    };
    
    // Set up a route that throws an error
    baseTest.app.get('/error', (req, res, next) => {
      next(new Error('Test error'));
    });
    
    // Add the error middleware
    baseTest.app.use(errorMiddleware);
    
    // Make a request to the route
    const response = await request(baseTest.app).get('/error');
    
    // Verify the response
    expect(response.status).to.equal(500);
    expect(response.body).to.deep.equal({ error: 'Test error' });
    
    // Wait for data to be persisted
    await baseTest.waitForDataPersistence();
    
    // Get the request data
    const results = await baseTest.getRequestResults('5xx');
    
    // Find the request we just made
    const testRequest = baseTest.findRequest(results, {
      method: 'get',
      route: '/error',
      statusCode: 500
    });
    
    // Verify the request was tracked
    expect(testRequest, 'Request was not tracked').to.exist;
  });
  
  it('should correctly handle async route handlers', async function() {
    // Set up an async route handler
    baseTest.app.get('/async', async (req, res) => {
      // Simulate an async operation
      await new Promise(resolve => setTimeout(resolve, 50));
      res.status(200).json({ message: 'Async success' });
    });
    
    // Make a request to the route
    const response = await request(baseTest.app).get('/async');
    
    // Verify the response
    expect(response.status).to.equal(200);
    expect(response.body).to.deep.equal({ message: 'Async success' });
    
    // Wait for data to be persisted
    await baseTest.waitForDataPersistence();
    
    // Get the request data
    const results = await baseTest.getRequestResults();
    
    // Find the request we just made
    const testRequest = baseTest.findRequest(results, {
      method: 'get',
      route: '/async'
    });
    
    // Verify the request was tracked
    expect(testRequest, 'Request was not tracked').to.exist;
    
    // Verify the duration is at least 50ms
    if (testRequest) {
      const content = testRequest.content;
      expect(parseFloat(content.duration)).to.be.at.least(50);
    }
  });
  
  it('should correctly handle multiple HTTP methods on the same route', async function() {
    // Set up routes with different methods on the same path
    baseTest.app.get('/multi-method', (req, res) => {
      res.status(200).json({ method: 'GET' });
    });
    
    baseTest.app.post('/multi-method', (req, res) => {
      res.status(201).json({ method: 'POST' });
    });
    
    baseTest.app.put('/multi-method', (req, res) => {
      res.status(200).json({ method: 'PUT' });
    });
    
    // Make requests with different methods
    const getResponse = await request(baseTest.app).get('/multi-method');
    expect(getResponse.status).to.equal(200);
    expect(getResponse.body).to.deep.equal({ method: 'GET' });
    
    const postResponse = await request(baseTest.app).post('/multi-method');
    expect(postResponse.status).to.equal(201);
    expect(postResponse.body).to.deep.equal({ method: 'POST' });
    
    const putResponse = await request(baseTest.app).put('/multi-method');
    expect(putResponse.status).to.equal(200);
    expect(putResponse.body).to.deep.equal({ method: 'PUT' });
    
    // Wait for data to be persisted
    await baseTest.waitForDataPersistence();
    
    // Get the request data
    const results = await baseTest.getRequestResults();
    
    // Find the GET request
    const getRequest = baseTest.findRequest(results, {
      method: 'get',
      route: '/multi-method'
    });
    
    // Find the POST request
    const postRequest = baseTest.findRequest(results, {
      method: 'post',
      route: '/multi-method'
    });
    
    // Find the PUT request
    const putRequest = baseTest.findRequest(results, {
      method: 'put',
      route: '/multi-method'
    });
    
    // Verify all requests were tracked
    expect(getRequest, 'GET request was not tracked').to.exist;
    expect(postRequest, 'POST request was not tracked').to.exist;
    expect(putRequest, 'PUT request was not tracked').to.exist;
  });
  
  it('should correctly handle router instances', async function() {
    // Create a router
    const router = express.Router();
    
    // Add routes to the router
    router.get('/route1', (req, res) => {
      res.status(200).json({ route: 'route1' });
    });
    
    router.get('/route2', (req, res) => {
      res.status(200).json({ route: 'route2' });
    });
    
    // Use the router in the app
    baseTest.app.use('/api', router);
    
    // Make requests to the routes
    const response1 = await request(baseTest.app).get('/api/route1');
    expect(response1.status).to.equal(200);
    expect(response1.body).to.deep.equal({ route: 'route1' });
    
    const response2 = await request(baseTest.app).get('/api/route2');
    expect(response2.status).to.equal(200);
    expect(response2.body).to.deep.equal({ route: 'route2' });
    
    // Wait for data to be persisted
    await baseTest.waitForDataPersistence();
    
    // Get the request data
    const results = await baseTest.getRequestResults();
    
    // Find the requests we just made
    const route1Request = baseTest.findRequest(results, {
      method: 'get',
      route: '/api/route1'
    });
    
    const route2Request = baseTest.findRequest(results, {
      method: 'get',
      route: '/api/route2'
    });
    
    // Verify both requests were tracked
    expect(route1Request, 'Route1 request was not tracked').to.exist;
    expect(route2Request, 'Route2 request was not tracked').to.exist;
  });
  
  it('should correctly handle the render method', async function() {
    // Create a mock render function since we don't have actual templates
    baseTest.app.render = function(name: string, options?: object, callback?: (err: Error, html: string) => void) {
      const html = `<html><body>Rendered ${name} with ${JSON.stringify(options)}</body></html>`;
      if (callback) {
        callback(null as any, html);
      }
    };
    
    // Set up a route that uses render
    baseTest.app.get('/render-test', (req, res) => {
      res.render('test-view', { title: 'Test Page' });
    });
    
    // Make a request to the route
    const response = await request(baseTest.app).get('/render-test');
    
    // Verify the response
    expect(response.status).to.equal(200);
    expect(response.text).to.include('Rendered test-view');
    expect(response.text).to.include('Test Page');
    
    // Wait for data to be persisted
    await baseTest.waitForDataPersistence();
    
    // Get the request data
    const results = await baseTest.getRequestResults();
    
    // Find the request we just made
    const testRequest = baseTest.findRequest(results, {
      method: 'get',
      route: '/render-test'
    });
    
    // Verify the request was tracked
    expect(testRequest, 'Request was not tracked').to.exist;
    
    // Get the request details to check for related view data
    if (testRequest) {
      const requestId = testRequest.request_id || testRequest.uuid;
      const relatedData = await baseTest.getRelatedData(requestId);
      
      // Check if there's view data related to this request
      const viewData = relatedData && relatedData.view ? relatedData.view[0] : null;
      
      if (viewData) {
        const viewContent = viewData.content;
        expect(viewContent).to.have.property('view').that.includes('test-view');
        expect(viewContent).to.have.property('options').that.deep.include({ title: 'Test Page' });
        expect(viewContent).to.have.property('status', 'completed');
      }
    }
  });
  
  it('should not log requests to observatory-api endpoints', async function() {
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
    
    // Verify the request and response sizes were captured
    if (testRequest) {
      const content = testRequest.content;
      expect(content).to.have.property('requestSize').that.is.a('number').and.is.greaterThan(0);
      expect(content).to.have.property('responseSize').that.is.a('number').and.is.greaterThan(0);
      
      // The response size should be larger than the request size in this case
      expect(content.responseSize).to.be.greaterThan(content.requestSize);
    }
  });
  
  it('should track responses using res.end() without send', async function() {
    // Set up a route that uses res.end() directly
    baseTest.app.get('/end-only', (req, res) => {
      res.status(204).end();
    });
    
    // Make a request to the route
    const response = await request(baseTest.app).get('/end-only');
    
    // Verify the response
    expect(response.status).to.equal(204);
    expect(response.body).to.deep.equal({});
    
    // Wait for data to be persisted
    await baseTest.waitForDataPersistence();
    
    // Get the request data
    const results = await baseTest.getRequestResults();
    
    // Find the request we just made
    const testRequest = baseTest.findRequest(results, {
      method: 'get',
      route: '/end-only',
      statusCode: 204
    });
    
    // Verify the request was tracked
    expect(testRequest, 'Request using res.end() was not tracked').to.exist;
  });
  
  it('should track responses using res.json()', async function() {
    // Set up a route that uses res.json() directly
    baseTest.app.get('/json-direct', (req, res) => {
      res.json({ direct: 'json response' });
    });
    
    // Make a request to the route
    const response = await request(baseTest.app).get('/json-direct');
    
    // Verify the response
    expect(response.status).to.equal(200);
    expect(response.body).to.deep.equal({ direct: 'json response' });
    
    // Wait for data to be persisted
    await baseTest.waitForDataPersistence();
    
    // Get the request data
    const results = await baseTest.getRequestResults();
    
    // Find the request we just made
    const testRequest = baseTest.findRequest(results, {
      method: 'get',
      route: '/json-direct'
    });
    
    // Verify the request was tracked
    expect(testRequest, 'Request using res.json() was not tracked').to.exist;
  });
  
  it('should track responses using res.redirect()', async function() {
    // Set up a route that uses redirection
    baseTest.app.get('/redirect-test', (req, res) => {
      res.redirect(302, '/destination');
    });
    
    // Make a request to the route
    const response = await request(baseTest.app).get('/redirect-test').redirects(0);
    
    // Verify the response (302 is redirect)
    expect(response.status).to.equal(302);
    expect(response.headers.location).to.equal('/destination');
    
    // Wait for data to be persisted
    await baseTest.waitForDataPersistence();
    
    // Get the request data
    const results = await baseTest.getRequestResults();
    
    // Find the request we just made
    const testRequest = baseTest.findRequest(results, {
      method: 'get',
      route: '/redirect-test',
      statusCode: 302
    });
    
    // Verify the request was tracked
    expect(testRequest, 'Request using res.redirect() was not tracked').to.exist;
  });
  
  it('should track streaming responses using res.write() and res.end()', async function() {
    // Set up a streaming route
    baseTest.app.get('/streaming', (req, res) => {
      res.setHeader('Content-Type', 'text/plain');
      res.write('chunk 1\n');
      res.write('chunk 2\n');
      res.write('chunk 3\n');
      res.end();
    });
    
    // Make a request to the route
    const response = await request(baseTest.app).get('/streaming');
    
    // Verify the response
    expect(response.status).to.equal(200);
    expect(response.text).to.equal('chunk 1\nchunk 2\nchunk 3\n');
    
    // Wait for data to be persisted
    await baseTest.waitForDataPersistence();
    
    // Get the request data
    const results = await baseTest.getRequestResults();
    
    // Find the request we just made
    const testRequest = baseTest.findRequest(results, {
      method: 'get',
      route: '/streaming'
    });
    
    // Verify the request was tracked
    expect(testRequest, 'Streaming request was not tracked').to.exist;
    
    // The responseSize might not accurately reflect the true size with streaming
    if (testRequest) {
      const content = testRequest.content;
      expect(content).to.have.property('responseSize');
    }
  });
  
  it('should track responses sent with res.sendStatus()', async function() {
    // Set up a route that uses sendStatus
    baseTest.app.get('/status-only', (req, res) => {
      res.sendStatus(418); // I'm a teapot
    });
    
    // Make a request to the route
    const response = await request(baseTest.app).get('/status-only');
    
    // Verify the response
    expect(response.status).to.equal(418);
    
    // Wait for data to be persisted
    await baseTest.waitForDataPersistence();
    
    // Get the request data
    const results = await baseTest.getRequestResults();
    
    // Find the request we just made
    const testRequest = baseTest.findRequest(results, {
      method: 'get',
      route: '/status-only',
      statusCode: 418
    });
    
    // Verify the request was tracked
    expect(testRequest, 'Request using res.sendStatus() was not tracked').to.exist;
  });
  
  it('should handle early response termination in middleware', async function() {
    // Set up middleware that ends the response early
    const earlyResponseMiddleware = (req: Request, res: Response, next: NextFunction) => {
      if (req.query.abort === 'true') {
        return res.status(400).json({ error: 'Aborted by middleware' });
      }
      next();
    };
    
    // Add the middleware and a route
    baseTest.app.use(earlyResponseMiddleware);
    baseTest.app.get('/early-abort', (req, res) => {
      // This should never be called when abort=true
      res.status(200).json({ message: 'This should not happen' });
    });
    
    // Make a request that will be terminated by middleware
    const response = await request(baseTest.app).get('/early-abort?abort=true');
    
    // Verify the response came from middleware
    expect(response.status).to.equal(400);
    expect(response.body).to.deep.equal({ error: 'Aborted by middleware' });
    
    // Wait for data to be persisted
    await baseTest.waitForDataPersistence();
    
    // Get the request data
    const results = await baseTest.getRequestResults();
    
    // Find the request we just made
    const testRequest = baseTest.findRequest(results, {
      method: 'get',
      route: '/early-abort?abort=true',
      statusCode: 400
    });
    
    // Verify the request was tracked
    expect(testRequest, 'Early-terminated request was not tracked').to.exist;
  });
  
  it('should correctly handle all HTTP methods', async function() {
    // Set up routes for all HTTP methods
    baseTest.app.get('/method-test', (req, res) => {
      res.status(200).json({ method: 'GET' });
    });
    
    baseTest.app.post('/method-test', (req, res) => {
      res.status(201).json({ method: 'POST' });
    });
    
    baseTest.app.put('/method-test', (req, res) => {
      res.status(200).json({ method: 'PUT' });
    });
    
    baseTest.app.delete('/method-test', (req, res) => {
      res.status(200).json({ method: 'DELETE' });
    });
    
    baseTest.app.patch('/method-test', (req, res) => {
      res.status(200).json({ method: 'PATCH' });
    });
    
    // Test each method
    const getResponse = await request(baseTest.app).get('/method-test');
    expect(getResponse.status).to.equal(200);
    expect(getResponse.body).to.deep.equal({ method: 'GET' });
    
    const postResponse = await request(baseTest.app).post('/method-test');
    expect(postResponse.status).to.equal(201);
    expect(postResponse.body).to.deep.equal({ method: 'POST' });
    
    const putResponse = await request(baseTest.app).put('/method-test');
    expect(putResponse.status).to.equal(200);
    expect(putResponse.body).to.deep.equal({ method: 'PUT' });
    
    const deleteResponse = await request(baseTest.app).delete('/method-test');
    expect(deleteResponse.status).to.equal(200);
    expect(deleteResponse.body).to.deep.equal({ method: 'DELETE' });
    
    const patchResponse = await request(baseTest.app).patch('/method-test');
    expect(patchResponse.status).to.equal(200);
    expect(patchResponse.body).to.deep.equal({ method: 'PATCH' });
    
    // Wait for data to be persisted
    await baseTest.waitForDataPersistence();

    // Get the request data
    const results = await baseTest.getRequestResults();

    // Verify each request was tracked
    const methodTests = ['get', 'post', 'put', 'delete', 'patch'].map(method => {
      return baseTest.findRequest(results, {
        method: method,
        route: '/method-test'
      });
    });

    // Verify all methods were tracked
    methodTests.forEach((request, index) => {
      const method = ['get', 'post', 'put', 'delete', 'patch'][index];
      expect(request, `${method.toUpperCase()} request was not tracked`).to.exist;

      if (request) {
        baseTest.validateRequestData(request, {
          expectedMethod: method,
          expectedRoute: '/method-test',
          expectedStatusCode: method === 'post' ? 201 : 200
        });
      }
    });
  });

  it('should correctly handle and track JSON payload data', async function() {
    // Setup a route that processes JSON payload
    baseTest.app.post('/process-json', (req, res) => {
      // Validate payload
      if (!req.body || !req.body.name) {
        return res.status(400).json({ error: 'Missing required field: name' });
      }
      
      // Process and return the data
      const result = {
        processed: true,
        name: req.body.name.toUpperCase(),
        timestamp: Date.now(),
        extraFields: Object.keys(req.body).filter(key => key !== 'name')
      };
      
      res.status(201).json(result);
    });
    
    // Test payload
    const payload = {
      name: 'test user',
      email: 'test@example.com',
      preferences: {
        theme: 'dark',
        notifications: true
      },
      tags: ['developer', 'tester']
    };
    
    // Send POST request with JSON payload
    const response = await request(baseTest.app)
      .post('/process-json')
      .send(payload)
      .set('Content-Type', 'application/json');
    
    // Verify response
    expect(response.status).to.equal(201);
    expect(response.body.processed).to.equal(true);
    expect(response.body.name).to.equal('TEST USER');
    expect(response.body.extraFields).to.include('email');
    
    // Wait for data to be persisted
    await baseTest.waitForDataPersistence();
    
    // Get the request data
    const results = await baseTest.getRequestResults();
    
    // Find the request we just made
    const testRequest = baseTest.findRequest(results, {
      method: 'post',
      route: '/process-json',
      statusCode: 201
    });
    
    // Verify the request was tracked
    expect(testRequest, 'JSON payload request was not tracked').to.exist;
    // Verify the payload was captured correctly
    if (testRequest) {
      const content = testRequest.content;
      expect(content).to.have.property('payload');
      expect(JSON.parse(content.payload)).to.have.property('name', 'test user');
      expect(content.requestSize).to.be.greaterThan(0);
    }
  });

  it('should correctly handle and track form URL-encoded data', async function() {
    // Setup a route that processes form data
    baseTest.app.post('/process-form', (req, res) => {
      // Check for required fields
      if (!req.body.username || !req.body.password) {
        return res.status(400).json({ error: 'Missing required fields' });
      }
      
      // Simulated form processing
      const formProcessed = {
        success: true,
        username: req.body.username,
        authenticated: req.body.password === 'test-password',
        fields: Object.keys(req.body)
      };
      
      res.status(200).json(formProcessed);
    });
    
    // Send POST request with form data
    const response = await request(baseTest.app)
      .post('/process-form')
      .type('form')
      .send({
        username: 'testuser',
        password: 'test-password',
        remember: 'true',
        csrf: 'token-123'
      });
    
    // Verify response
    expect(response.status).to.equal(200);
    expect(response.body.success).to.equal(true);
    expect(response.body.authenticated).to.equal(true);
    expect(response.body.fields).to.include.members(['username', 'password', 'remember', 'csrf']);
    
    // Wait for data to be persisted
    await baseTest.waitForDataPersistence();
    
    // Get the request data
    const results = await baseTest.getRequestResults();
    
    // Find the request we just made
    const testRequest = baseTest.findRequest(results, {
      method: 'post',
      route: '/process-form'
    });
    
    // Verify the request was tracked
    expect(testRequest, 'Form data request was not tracked').to.exist;
    
    // Verify the payload was captured correctly
    if (testRequest) {
      const content = testRequest.content;
      expect(content).to.have.property('payload');
      expect(content.payload).to.include('username=testuser');
      expect(content.payload).to.include('password=test-password');
      expect(content.requestSize).to.be.greaterThan(0);
    }
  });

  // it('should correctly handle and track large payload data', async function() {
  //   // Setup a route that accepts large payloads
  //   baseTest.app.put('/bulk-data', (req, res) => {
  //     // Check if we received an array
  //     if (!Array.isArray(req.body.items)) {
  //       return res.status(400).json({ error: 'Expected items array' });
  //     }
      
  //     // Process the items (count, summarize)
  //     const count = req.body.items.length;
  //     const processed = {
  //       success: true,
  //       itemCount: count,
  //       firstItem: count > 0 ? req.body.items[0] : null,
  //       lastItem: count > 0 ? req.body.items[count - 1] : null,
  //       payloadSize: JSON.stringify(req.body).length
  //     };
      
  //     res.status(200).json(processed);
  //   });
    
  //   // Create a large payload with 1000 items
  //   const largePayload = {
  //     items: Array(1000).fill(0).map((_, i) => ({
  //       id: i,
  //       name: `Item ${i}`,
  //       description: `This is test item ${i} with some additional text to increase the payload size.`,
  //       tags: [`tag-${i % 5}`, `category-${i % 10}`],
  //       metadata: {
  //         created: new Date().toISOString(),
  //         priority: i % 3,
  //         status: ['pending', 'active', 'completed'][i % 3]
  //       }
  //     }))
  //   };
    
  //   // Send PUT request with large payload
  //   const response = await request(baseTest.app)
  //     .put('/bulk-data')
  //     .send(largePayload);
    
  //   // Verify response
  //   expect(response.status).to.equal(200);
  //   expect(response.body.success).to.equal(true);
  //   expect(response.body.itemCount).to.equal(1000);
  //   expect(response.body.firstItem.id).to.equal(0);
  //   expect(response.body.lastItem.id).to.equal(999);
    
  //   // Wait for data to be persisted
  //   await baseTest.waitForDataPersistence();
    
  //   // Get the request data
  //   const results = await baseTest.getRequestResults();
    
  //   // Find the request we just made
  //   const testRequest = baseTest.findRequest(results, {
  //     method: 'put',
  //     route: '/bulk-data'
  //   });
    
  //   // Verify the request was tracked
  //   expect(testRequest, 'Large payload request was not tracked').to.exist;
    
  //   // Verify the payload size was captured correctly
  //   if (testRequest) {
  //     const content = testRequest.content;
  //     expect(content).to.have.property('requestSize').that.is.a('number').and.is.greaterThan(10000);
  //     expect(content).to.have.property('responseSize').that.is.a('number').and.is.greaterThan(0);
  //   }
  // });

  it('should correctly handle payload validation and errors', async function() {
    // Setup a route that requires specific payload format
    baseTest.app.patch('/validate-data', (req, res) => {
      // Complex validation rules
      const errors: string[] = [];
      
      if (!req.body.id || typeof req.body.id !== 'number') {
        errors.push('id must be a number');
      }
      
      if (!req.body.email || !/^\S+@\S+\.\S+$/.test(req.body.email)) {
        errors.push('email must be valid');
      }
      
      if (!req.body.updates || typeof req.body.updates !== 'object') {
        errors.push('updates object is required');
      } else if (Object.keys(req.body.updates).length === 0) {
        errors.push('at least one update field is required');
      }
      
      // Return errors if validation fails
      if (errors.length > 0) {
        return res.status(400).json({ 
          success: false,
          errors
        });
      }
      
      // Process valid data
      res.status(200).json({
        success: true,
        message: 'Data validated successfully',
        id: req.body.id,
        updateCount: Object.keys(req.body.updates).length
      });
    });
    
    // Test with invalid payload
    const invalidPayload = {
      id: "not-a-number",
      email: "invalid-email",
      updates: {}
    };
    
    const invalidResponse = await request(baseTest.app)
      .patch('/validate-data')
      .send(invalidPayload);
    
    // Verify error response
    expect(invalidResponse.status).to.equal(400);
    expect(invalidResponse.body.success).to.equal(false);
    expect(invalidResponse.body.errors).to.have.lengthOf(3);
    
    // Test with valid payload
    const validPayload = {
      id: 12345,
      email: "user@example.com",
      updates: {
        name: "Updated Name",
        status: "active"
      }
    };
    
    const validResponse = await request(baseTest.app)
      .patch('/validate-data')
      .send(validPayload);
    
    // Verify success response
    expect(validResponse.status).to.equal(200);
    expect(validResponse.body.success).to.equal(true);
    expect(validResponse.body.updateCount).to.equal(2);
    
    // Wait for data to be persisted
    await baseTest.waitForDataPersistence();
    
    // Get the request data
    const results = await baseTest.getRequestResults();
    
    // Find both requests
    const invalidRequest = baseTest.findRequest(results, {
      method: 'patch',
      route: '/validate-data',
      statusCode: 400
    });
    
    const validRequest = baseTest.findRequest(results, {
      method: 'patch',
      route: '/validate-data',
      statusCode: 200
    });
    
    // Verify both requests were tracked
    expect(invalidRequest, 'Invalid payload request was not tracked').to.exist;
    expect(validRequest, 'Valid payload request was not tracked').to.exist;
    
    // Verify the payloads were captured correctly
    if (invalidRequest && validRequest) {
      expect(JSON.parse(invalidRequest.content.payload)).to.have.property('id', 'not-a-number');
      expect(JSON.parse(validRequest.content.payload)).to.have.property('id', 12345);
    }
  });
}); 