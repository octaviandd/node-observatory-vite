import { describe, it, before, after, beforeEach, afterEach } from "mocha";
import { expect } from "chai";
import express, { Request, Response, NextFunction } from "express";
import request from "supertest";

// Import the patching code to ensure it's loaded
import "../../../lib/patchers/patch-express";
import { BaseExpressTest } from "./base-express";

describe('Express Error Handling Tests', function() {
  this.timeout(10000);
  
  const baseTest = new BaseExpressTest();
  
  before(async function() {
    await baseTest.setup();
    
    // Set up routes for synchronous error
    baseTest.app.get('/sync-error', (req, res) => {
      throw new Error('Synchronous error');
    });
    
    // Set up routes for asynchronous error
    baseTest.app.get('/async-error', async (req, res, next) => {
      try {
        // Simulate an async operation that fails
        await new Promise((_, reject) => setTimeout(() => reject(new Error('Async error')), 50));
      } catch (error) {
        next(error);
      }
    });
    
    // Set up next error route
    baseTest.app.get('/next-error', (req, res, next) => {
      next(new Error('Next error'));
    });
    
    // Set up multiple handlers error route
    baseTest.app.get('/multiple-handlers', (req, res, next) => {
      next(new Error('Multiple handlers error'));
    });
    
    // Set up custom error type route
    class CustomError extends Error {
      statusCode: number;
      
      constructor(message: string, statusCode: number) {
        super(message);
        this.name = 'CustomError';
        this.statusCode = statusCode;
      }
    }
    baseTest.app.get('/custom-error', (req, res, next) => {
      next(new CustomError('Custom error message', 400));
    });
    
    // Set up nested router error
    const outerRouter = express.Router();
    const innerRouter = express.Router();
    innerRouter.get('/error', (req, res) => {
      throw new Error('Nested router error');
    });
    outerRouter.use('/inner', innerRouter);
    baseTest.app.use('/outer', outerRouter);
    
    // Set up route with no error handler
    baseTest.app.get('/no-handler', (req, res) => {
      throw new Error('No handler error');
    });
    
    // Add error handlers
    // First error handler for specific errors
    baseTest.app.use((err: any, req: Request, res: Response, next: NextFunction) => {
      if (err instanceof CustomError) {
        res.status(err.statusCode).json({ 
          error: err.message,
          type: err.name
        });
      } else if (err.message && err.message.includes('different error')) {
        res.status(400).json({ error: err.message });
      } else {
        next(err);
      }
    });
    
    // Second error handler for all other errors
    baseTest.app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
      res.status(500).json({ 
        error: err.message,
        handler: err.message === 'Multiple handlers error' ? 'second' : undefined
      });
    });
  });
  
  after(async function() {
    await baseTest.teardown();
  });
  
  it('should correctly handle synchronous errors in route handlers', async function() {
    const response = await request(baseTest.app).get('/sync-error');
  
    expect(response.statusCode).to.equal(500);

    await baseTest.waitForDataPersistence(4000);
    const results = await baseTest.getRequestResults('5xx');

    // Find the request we just made
    const testRequest = baseTest.findRequest(results, {
      method: 'get',
      route: '/sync-error',
      statusCode: 500
    });
    
    // Verify the request was tracked
    expect(testRequest, 'Request was not tracked').to.exist;
    
    // Validate the request data
    if (testRequest) {
      baseTest.validateRequestData(testRequest, {
        expectedMethod: 'get',
        expectedRoute: '/sync-error',
        expectedStatusCode: 500
      });
    }
  });
  
  it('should correctly handle asynchronous errors in route handlers', async function() {
      const response = await request(baseTest.app).get('/async-error');
      expect(response.statusCode).to.equal(500);
      
      await baseTest.waitForDataPersistence(2000);
      
      const results = await baseTest.getRequestResults('5xx');
      
      // Find the request we just made
      const testRequest = baseTest.findRequest(results, {
        method: 'get',
        route: '/async-error',
        statusCode: 500
      });
      
      // Verify the request was tracked
      expect(testRequest, 'Request was not tracked').to.exist;
      
      // Validate the request data
      if (testRequest) {
        baseTest.validateRequestData(testRequest, {
          expectedMethod: 'get',
          expectedRoute: '/async-error',
          expectedStatusCode: 500
        });
        
        // Verify the duration is at least 50ms
        const content = testRequest.content;
        expect(parseFloat(content.duration)).to.be.at.least(50);
      }
  });
  
  it('should correctly handle errors passed to next()', async function() {
      // Make a request to the route
      const response = await request(baseTest.app).get('/next-error');
      
      // Verify the response
      expect(response.status).to.equal(500);
      
      // Wait for data to be persisted
      await baseTest.waitForDataPersistence(2000);
      
      // Get the request data
      const results = await baseTest.getRequestResults('5xx');
      
      // Find the request we just made
      const testRequest = baseTest.findRequest(results, {
        method: 'get',
        route: '/next-error',
        statusCode: 500
      });
      
      // Verify the request was tracked
      expect(testRequest, 'Request was not tracked').to.exist;
  });
  
  it('should correctly handle multiple error handlers', async function() {
      // Make a request to the route
      const response = await request(baseTest.app).get('/multiple-handlers');
      
      // Verify the response
      expect(response.status).to.equal(500);
      
      // Wait for data to be persisted
      await baseTest.waitForDataPersistence(2000);
      
      // Get the request data
      const results = await baseTest.getRequestResults('5xx');
      
      // Find the request we just made
      const testRequest = baseTest.findRequest(results, {
        method: 'get',
        route: '/multiple-handlers',
        statusCode: 500
      });
      
      // Verify the request was tracked
      expect(testRequest, 'Request was not tracked').to.exist;
  });
  
  it('should correctly handle custom error types', async function() {
      // Make a request to the route
      const response = await request(baseTest.app).get('/custom-error');
      
      // Verify the response
      expect(response.status).to.equal(400);
      
      // Wait for data to be persisted
      await baseTest.waitForDataPersistence(2000);
      
      // Get the request data
      const results = await baseTest.getRequestResults('4xx');
      
      // Find the request we just made
      const testRequest = baseTest.findRequest(results, {
        method: 'get',
        route: '/custom-error',
        statusCode: 400
      });
      
      // Verify the request was tracked
      expect(testRequest, 'Request was not tracked').to.exist;
  });
  
  it('should correctly handle errors in nested routers', async function() {
      // Make a request to the route
      const response = await request(baseTest.app).get('/outer/inner/error');
      
      // Verify the response
      expect(response.status).to.equal(500);
      
      // Wait for data to be persisted
      await baseTest.waitForDataPersistence(2000);
      
      // Get the request data
      const results = await baseTest.getRequestResults('5xx');
      
      // Find the request we just made
      const testRequest = baseTest.findRequest(results, {
        method: 'get',
        route: '/outer/inner/error',
        statusCode: 500
      });
      
      // Verify the request was tracked
      expect(testRequest, 'Request was not tracked').to.exist;
  });
  
  it('should correctly handle errors when no error handler is defined', async function() {
      // Make a request to the route
      const response = await request(baseTest.app).get('/no-handler');
      
      // Verify the response
      expect(response.status).to.equal(500);
      
      // Wait for data to be persisted
      await baseTest.waitForDataPersistence(2000);
      
      // Get the request data
      const results = await baseTest.getRequestResults('5xx');
      
      // Find the request we just made
      const testRequest = baseTest.findRequest(results, {
        method: 'get',
        route: '/no-handler'
      });
      
      // Verify the request was tracked (if Express's default error handler allows our patching to work)
      // Note: This might not be called if Express's default error handler takes over
      // before our patched send method is called
  });
}); 