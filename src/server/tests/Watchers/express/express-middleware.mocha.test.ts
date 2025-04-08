import { describe, it, before, after, beforeEach, afterEach } from "mocha";
import { expect } from "chai";
import express, { Request, Response, NextFunction } from "express";
import request from "supertest";

// Import the patching code to ensure it's loaded
import "../../../lib/patchers/patch-express";
import { BaseExpressTest } from "./base-express";
import { requestLocalStorage } from "../../../lib/patchers/store";

describe('Express Middleware Patching Tests', function() {
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
  
  it('should correctly apply global middleware', async function() {
    // Create a global middleware
    const globalMiddleware = (req: Request, res: Response, next: NextFunction) => {
      (req as any).globalMiddlewareCalled = true;
      next();
    };
    
    // Apply the middleware globally
    baseTest.app.use(globalMiddleware);
    
    // Set up a route
    baseTest.app.get('/test', (req, res) => {
      res.status(200).json({ 
        globalMiddlewareCalled: (req as any).globalMiddlewareCalled 
      });
    });
    
    // Make a request to the route
    const response = await request(baseTest.app).get('/test');
    
    // Verify the response
    expect(response.status).to.equal(200);
    expect(response.body).to.deep.equal({ globalMiddlewareCalled: true });
    
    // Wait for data to be persisted
    await baseTest.waitForDataPersistence();
    
    // Get the request data
    const results = await baseTest.getRequestResults();
    
    // Find the request we just made
    const testRequest = baseTest.findRequest(results, {
      method: 'get',
      route: '/test'
    });
    
    // Verify the request was tracked
    expect(testRequest, 'Request was not tracked').to.exist;
  });
  
  it('should correctly handle middleware that modifies the request', async function() {
    // Create middleware that modifies the request
    const modifyingMiddleware = (req: Request, res: Response, next: NextFunction) => {
      (req as any).customData = { modified: true };
      next();
    };
    
    // Apply the middleware
    baseTest.app.use(modifyingMiddleware);
    
    // Set up a route that uses the modified request
    baseTest.app.get('/modified', (req, res) => {
      res.status(200).json({ customData: (req as any).customData });
    });
    
    // Make a request to the route
    const response = await request(baseTest.app).get('/modified');
    
    // Verify the response
    expect(response.status).to.equal(200);
    expect(response.body).to.deep.equal({ customData: { modified: true } });
    
    // Wait for data to be persisted
    await baseTest.waitForDataPersistence();
    
    // Get the request data
    const results = await baseTest.getRequestResults();
    
    // Find the request we just made
    const testRequest = baseTest.findRequest(results, {
      method: 'get',
      route: '/modified'
    });
    
    // Verify the request was tracked
    expect(testRequest, 'Request was not tracked').to.exist;
  });
  
  it('should correctly handle middleware that modifies the response', async function() {
    // Create middleware that modifies the response
    const modifyingMiddleware = (req: Request, res: Response, next: NextFunction) => {
      res.setHeader('X-Custom-Header', 'Custom Value');
      next();
    };
    
    // Apply the middleware
    baseTest.app.use(modifyingMiddleware);
    
    // Set up a route
    baseTest.app.get('/header-test', (req, res) => {
      res.status(200).json({ message: 'Success' });
    });
    
    // Make a request to the route
    const response = await request(baseTest.app).get('/header-test');
    
    // Verify the response
    expect(response.status).to.equal(200);
    expect(response.body).to.deep.equal({ message: 'Success' });
    expect(response.headers['x-custom-header']).to.equal('Custom Value');
    
    // Wait for data to be persisted
    await baseTest.waitForDataPersistence();
    
    // Get the request data
    const results = await baseTest.getRequestResults();
    
    // Find the request we just made
    const testRequest = baseTest.findRequest(results, {
      method: 'get',
      route: '/header-test'
    });
    
    // Verify the request was tracked
    expect(testRequest, 'Request was not tracked').to.exist;
  });
  
  it('should correctly handle middleware chains with early responses', async function() {
    // Create middleware that sends an early response
    const earlyResponseMiddleware = (req: Request, res: Response, next: NextFunction) => {
      if (req.query.early === 'true') {
        return res.status(403).json({ message: 'Early response' });
      }
      next();
    };
    
    // Apply the middleware
    baseTest.app.use(earlyResponseMiddleware);
    
    // Set up a route that should not be reached with early=true
    baseTest.app.get('/early-response', (req, res) => {
      res.status(200).json({ message: 'Normal response' });
    });
    
    // Make a request that triggers the early response
    const earlyResponse = await request(baseTest.app).get('/early-response?early=true');
    
    // Verify the early response
    expect(earlyResponse.status).to.equal(403);
    expect(earlyResponse.body).to.deep.equal({ message: 'Early response' });
    
    // Make a normal request
    const normalResponse = await request(baseTest.app).get('/early-response');
    
    // Verify the normal response
    expect(normalResponse.status).to.equal(200);
    expect(normalResponse.body).to.deep.equal({ message: 'Normal response' });
    
    // Wait for data to be persisted
    await baseTest.waitForDataPersistence();
    
    // Get the request data
    const results = await baseTest.getRequestResults();
    
    // Find the early response request
    const earlyRequest = results.find((r) => {
      const content = r.content;
      return content.route.startsWith('/early-response') && 
             content.statusCode === 403;
    });
    
    // Find the normal response request
    const normalRequest = results.find((r) => {
      const content = r.content;
      return content.route === '/early-response' && 
             content.statusCode === 200;
    });
    
    // Verify both requests were tracked
    expect(earlyRequest, 'Early response request was not tracked').to.exist;
    expect(normalRequest, 'Normal response request was not tracked').to.exist;
  });
  
  it('should correctly handle async middleware', async function() {
    // Create an async middleware
    const asyncMiddleware = async (req: Request, res: Response, next: NextFunction) => {
      // Simulate an async operation
      await new Promise(resolve => setTimeout(resolve, 50));
      (req as any).asyncMiddlewareCalled = true;
      next();
    };
    
    // Apply the middleware
    baseTest.app.use(asyncMiddleware);
    
    // Set up a route
    baseTest.app.get('/async-middleware', (req, res) => {
      res.status(200).json({ 
        asyncMiddlewareCalled: (req as any).asyncMiddlewareCalled 
      });
    });
    
    // Make a request to the route
    const response = await request(baseTest.app).get('/async-middleware');
    
    // Verify the response
    expect(response.status).to.equal(200);
    expect(response.body).to.deep.equal({ asyncMiddlewareCalled: true });
    
    // Wait for data to be persisted
    await baseTest.waitForDataPersistence();
    
    // Get the request data
    const results = await baseTest.getRequestResults();
    
    // Find the request we just made
    const testRequest = baseTest.findRequest(results, {
      method: 'get',
      route: '/async-middleware'
    });
    
    // Verify the request was tracked
    expect(testRequest, 'Request was not tracked').to.exist;
    
    // Verify the duration is at least 50ms
    if (testRequest) {
      const content = testRequest.content;
      expect(parseFloat(content.duration)).to.be.at.least(50);
    }
  });
  
  it('should correctly handle middleware that accesses request local storage', async function() {
    // Create middleware that uses request local storage
    const storageMiddleware = (req: Request, res: Response, next: NextFunction) => {
      const store = requestLocalStorage.getStore();
      if (store) {
        store.set('testKey', 'testValue');
      }
      next();
    };
    
    // Apply the middleware
    baseTest.app.use(storageMiddleware);
    
    // Set up a route that accesses the storage
    baseTest.app.get('/storage-test', (req, res) => {
      const store = requestLocalStorage.getStore();
      const testValue = store ? store.get('testKey') : null;
      res.status(200).json({ testValue });
    });
    
    // Make a request to the route
    const response = await request(baseTest.app).get('/storage-test');
    
    // Verify the response
    expect(response.status).to.equal(200);
    expect(response.body).to.deep.equal({ testValue: 'testValue' });
    
    // Wait for data to be persisted
    await baseTest.waitForDataPersistence();
    
    // Get the request data
    const results = await baseTest.getRequestResults();
    
    // Find the request we just made
    const testRequest = baseTest.findRequest(results, {
      method: 'get',
      route: '/storage-test'
    });
    
    // Verify the request was tracked
    expect(testRequest, 'Request was not tracked').to.exist;
  });
  
  it('should correctly handle middleware that uses the request ID', async function() {
    // Create middleware that uses the request ID
    const requestIdMiddleware = (req: Request, res: Response, next: NextFunction) => {
      const store = requestLocalStorage.getStore();
      const requestId = store ? store.get('requestId') : null;
      (req as any).requestId = requestId;
      next();
    };
    
    // Apply the middleware
    baseTest.app.use(requestIdMiddleware);
    
    // Set up a route that returns the request ID
    baseTest.app.get('/request-id', (req, res) => {
      res.status(200).json({ requestId: (req as any).requestId });
    });
    
    // Make a request to the route
    const response = await request(baseTest.app).get('/request-id');
    
    // Verify the response
    expect(response.status).to.equal(200);
    expect(response.body).to.have.property('requestId').that.is.a('string');
    
    // Wait for data to be persisted
    await baseTest.waitForDataPersistence();
    
    // Get the request data
    const results = await baseTest.getRequestResults();
    
    // Find the request we just made
    const testRequest = baseTest.findRequest(results, {
      method: 'get',
      route: '/request-id'
    });
    
    // Verify the request was tracked
    expect(testRequest, 'Request was not tracked').to.exist;
  });
  
  it('should correctly handle path-specific middleware', async function() {
    // Create middleware for a specific path
    const pathMiddleware = (req: Request, res: Response, next: NextFunction) => {
      (req as any).pathMiddlewareCalled = true;
      next();
    };
    
    // Apply the middleware to a specific path
    baseTest.app.use('/specific-path', pathMiddleware);
    
    // Set up routes
    baseTest.app.get('/specific-path/test', (req, res) => {
      res.status(200).json({ 
        pathMiddlewareCalled: (req as any).pathMiddlewareCalled 
      });
    });
    
    baseTest.app.get('/other-path/test', (req, res) => {
      res.status(200).json({ 
        pathMiddlewareCalled: (req as any).pathMiddlewareCalled 
      });
    });
    
    // Make requests to both routes
    const specificResponse = await request(baseTest.app).get('/specific-path/test');
    const otherResponse = await request(baseTest.app).get('/other-path/test');
    
    // Verify the responses
    expect(specificResponse.status).to.equal(200);
    expect(specificResponse.body.pathMiddlewareCalled).to.equal(true);
    
    expect(otherResponse.status).to.equal(200);
    expect(otherResponse.body.pathMiddlewareCalled).to.equal(undefined);
    
    // Wait for data to be persisted
    await baseTest.waitForDataPersistence();
    
    // Get the request data
    const results = await baseTest.getRequestResults();
    
    // Find the specific path request
    const specificRequest = baseTest.findRequest(results, {
      method: 'get',
      route: '/specific-path/test'
    });
    
    // Find the other path request
    const otherRequest = baseTest.findRequest(results, {
      method: 'get',
      route: '/other-path/test'
    });
    
    // Verify both requests were tracked
    expect(specificRequest, 'Specific path request was not tracked').to.exist;
    expect(otherRequest, 'Other path request was not tracked').to.exist;
  });
  
  it('should correctly handle middleware that modifies the response body', async function() {
    // Create middleware that modifies the response body
    const bodyModifierMiddleware = (req: Request, res: Response, next: NextFunction) => {
      const originalSend = res.send;
      res.send = function(body) {
        let modifiedBody = body;
        
        // Modify JSON responses
        if (typeof body === 'object') {
          const bodyObj = body;
          bodyObj.modified = true;
          modifiedBody = bodyObj;
        } else if (typeof body === 'string') {
          const bodyObj = JSON.parse(body);
          bodyObj.modified = true;
          modifiedBody = JSON.stringify(bodyObj);
        }
        
        return originalSend.call(this, modifiedBody);
      };
      
      next();
    };
    
    // Apply the middleware
    baseTest.app.use(bodyModifierMiddleware);
    
    // Set up a route
    baseTest.app.get('/modify-body', (req, res) => {
      res.status(200).json({ original: true });
    });
    
    // Make a request to the route
    const response = await request(baseTest.app).get('/modify-body');
    
    // Verify the response
    expect(response.status).to.equal(200);
    expect(response.body.original).to.equal(true);
    expect(response.body.modified).to.equal(true);
    
    // Wait for data to be persisted
    await baseTest.waitForDataPersistence();
    
    // Get the request data
    const results = await baseTest.getRequestResults();
    
    // Find the request we just made
    const testRequest = baseTest.findRequest(results, {
      method: 'get',
      route: '/modify-body'
    });
    
    // Verify the request was tracked
    expect(testRequest, 'Request was not tracked').to.exist;
  });
  
  it('should correctly handle middleware order', async function() {
    // Create middleware that tracks execution order
    const middleware1 = (req: Request, res: Response, next: NextFunction) => {
      (req as any).executionOrder = ['middleware1'];
      next();
    };
    
    const middleware2 = (req: Request, res: Response, next: NextFunction) => {
      (req as any).executionOrder.push('middleware2');
      next();
    };
    
    const middleware3 = (req: Request, res: Response, next: NextFunction) => {
      (req as any).executionOrder.push('middleware3');
      next();
    };
    
    // Apply the middleware in order
    baseTest.app.use(middleware1);
    baseTest.app.use(middleware2);
    baseTest.app.use(middleware3);
    
    // Set up a route
    baseTest.app.get('/order-test', (req, res) => {
      res.status(200).json({ 
        executionOrder: (req as any).executionOrder 
      });
    });
    
    // Make a request to the route
    const response = await request(baseTest.app).get('/order-test');
    
    // Verify the response
    expect(response.status).to.equal(200);
    expect(response.body.executionOrder).to.deep.equal(['middleware1', 'middleware2', 'middleware3']);
    
    // Wait for data to be persisted
    await baseTest.waitForDataPersistence();
    
    // Get the request data
    const results = await baseTest.getRequestResults();
    
    // Find the request we just made
    const testRequest = baseTest.findRequest(results, {
      method: 'get',
      route: '/order-test'
    });
    
    // Verify the request was tracked
    expect(testRequest, 'Request was not tracked').to.exist;
  });

  // Middleware error tests moved from express-error.mocha.test.ts
  describe('Middleware Error Handling', function() {
    beforeEach(function() {
      // Set up error handlers for each test
      baseTest.app.use((err: any, req: Request, res: Response, next: NextFunction) => {
        if (err.name === 'CustomError') {
          res.status(err.statusCode || 400).json({ 
            error: err.message,
            type: err.name
          });
        } else {
          next(err);
        }
      });
      
      baseTest.app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
        res.status(500).json({ error: err.message });
      });
    });

    // it('should correctly handle errors in middleware', async function() {
    //   // Set up middleware error route
    //   // Errors inside middleware are not logging.
    //   const errorMiddleware = (req: Request, res: Response, next: NextFunction) => {
    //     throw new Error('Middleware error');
    //   };
    //   baseTest.app.use('/middleware-error', errorMiddleware);
    //   baseTest.app.get('/middleware-error', (req, res) => {
    //     res.status(200).json({ message: 'Success' });
    //   });
      
    //   // Make a request to the route
    //   const response = await request(baseTest.app).get('/middleware-error');
      
    //   // Verify the response
    //   expect(response.status).to.equal(500);
    //   // @ts-ignore
    //   expect(response.error.name).to.equal('Error');
      
    //   // Wait for data to be persisted
    //   await baseTest.waitForDataPersistence();
      
    //   // Get the request data
    //   const results = await baseTest.getRequestResults('5xx');
      
    //   // Find the request we just made
    //   const testRequest = baseTest.findRequest(results, {
    //     method: 'get',
    //     route: '/middleware-error',
    //     statusCode: 500
    //   });
      
    //   // Verify the request was tracked
    //   expect(testRequest, 'Request was not tracked').to.exist;
    // });

    // it('should correctly handle errors in async middleware', async function() {
    //   // Set up async middleware error route
    //   const asyncErrorMiddleware = async (req: Request, res: Response, next: NextFunction) => {
    //     // Simulate an async operation that fails
    //     await new Promise((_, reject) => setTimeout(() => reject(new Error('Async middleware error')), 50));
    //   };
    //   baseTest.app.use('/async-middleware-error', (req, res, next) => {
    //     asyncErrorMiddleware(req, res, next).catch(next);
    //   });
    //   baseTest.app.get('/async-middleware-error', (req, res) => {
    //     res.status(200).json({ message: 'Success' });
    //   });
      
    //   // Make a request to the route
    //   const response = await request(baseTest.app).get('/async-middleware-error');
      
    //   // Verify the response
    //   expect(response.status).to.equal(500);
    //   expect(response.body.error).to.equal('Async middleware error');
      
    //   // Wait for data to be persisted
    //   await baseTest.waitForDataPersistence();
      
    //   // Get the request data
    //   const results = await baseTest.getRequestResults('5xx');
      
    //   // Find the request we just made
    //   const testRequest = baseTest.findRequest(results, {
    //     method: 'get',
    //     route: '/async-middleware-error',
    //     statusCode: 500
    //   });
      
    //   // Verify the request was tracked
    //   expect(testRequest, 'Request was not tracked').to.exist;
      
    //   // Verify the duration is at least 50ms
    //   if (testRequest) {
    //     const content = testRequest.content;
    //     expect(parseFloat(content.duration)).to.be.at.least(50);
    //   }
    // });

    // it('should correctly handle errors in router-level middleware', async function() {
    //   // Set up router-level middleware error
    //   const router = express.Router();
    //   router.use((req, res, next) => {
    //     throw new Error('Router middleware error');
    //   });
    //   router.get('/test', (req, res) => {
    //     res.status(200).json({ message: 'Success' });
    //   });
    //   baseTest.app.use('/router', router);
      
    //   // Make a request to the route
    //   const response = await request(baseTest.app).get('/router/test');
      
    //   // Verify the response
    //   expect(response.status).to.equal(500);
    //   expect(response.body.error).to.equal('Router middleware error');
      
    //   // Wait for data to be persisted
    //   await baseTest.waitForDataPersistence();
      
    //   // Get the request data
    //   const results = await baseTest.getRequestResults('5xx');
      
    //   // Find the request we just made
    //   const testRequest = baseTest.findRequest(results, {
    //     method: 'get',
    //     route: '/router/test',
    //     statusCode: 500
    //   });
      
    //   // Verify the request was tracked
    //   expect(testRequest, 'Request was not tracked').to.exist;
    // });

    // it('should correctly handle errors in route-specific middleware', async function() {
    //   // Set up route-specific middleware error
    //   const routeMiddleware = (req: Request, res: Response, next: NextFunction) => {
    //     throw new Error('Route middleware error');
    //   };
    //   baseTest.app.get('/route-middleware-error', routeMiddleware, (req, res) => {
    //     res.status(200).json({ message: 'Success' });
    //   });
      
    //   // Make a request to the route
    //   const response = await request(baseTest.app).get('/route-middleware-error');
      
    //   // Verify the response
    //   expect(response.status).to.equal(500);
    //   expect(response.body.error).to.equal('Route middleware error');
      
    //   // Wait for data to be persisted
    //   await baseTest.waitForDataPersistence();
      
    //   // Get the request data
    //   const results = await baseTest.getRequestResults('5xx');
      
    //   // Find the request we just made
    //   const testRequest = baseTest.findRequest(results, {
    //     method: 'get',
    //     route: '/route-middleware-error',
    //     statusCode: 500
    //   });
      
    //   // Verify the request was tracked
    //   expect(testRequest, 'Request was not tracked').to.exist;
    // });
  });
}); 