import { describe, it, before, after, beforeEach, afterEach } from "mocha";
import { expect } from "chai";
import express, { Request, Response, NextFunction } from "express";
import request from "supertest";
import cookieParser from "cookie-parser";

// Create a minimal test base class without observer functionality
class BasicExpressTest {
  app: any;
  
  constructor() {
    this.app = express();
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
    this.app.use(cookieParser());
  }
}

describe('Express Without Patching Tests', function() {
  this.timeout(10000);
  
  const baseTest = new BasicExpressTest();
  
  beforeEach(function() {
    // Reset the app routes for each test
    baseTest.app._router.stack = baseTest.app._router.stack.filter(
      (layer: any) => !layer.route || layer.route.path === '*'
    );
  });
  
  it('should correctly handle basic GET routes', async function() {
    // Set up a basic GET route
    baseTest.app.get('/test', (req: Request, res: Response) => {
      res.status(200).json({ message: 'Success' });
    });
    
    // Make a request to the route
    const response = await request(baseTest.app).get('/test');
    
    // Verify the response
    expect(response.status).to.equal(200);
    expect(response.body).to.deep.equal({ message: 'Success' });
  });
  
  it('should correctly handle POST routes with JSON body', async function() {
    // Set up a POST route that accepts JSON
    baseTest.app.post('/api/data', (req: Request, res: Response) => {
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
  });
  
  it('should correctly handle route parameters', async function() {
    // Set up a route with parameters
    baseTest.app.get('/users/:id', (req: Request, res: Response) => {
      res.status(200).json({ userId: req.params.id });
    });
    
    // Make a request with a parameter
    const response = await request(baseTest.app).get('/users/123');
    
    // Verify the response
    expect(response.status).to.equal(200);
    expect(response.body).to.deep.equal({ userId: '123' });
  });
  
  it('should correctly handle query parameters', async function() {
    // Set up a route that uses query parameters
    baseTest.app.get('/search', (req: Request, res: Response) => {
      res.status(200).json({ query: req.query });
    });
    
    // Make a request with query parameters
    const response = await request(baseTest.app).get('/search?q=test&page=1');
    
    // Verify the response
    expect(response.status).to.equal(200);
    expect(response.body.query).to.deep.include({ q: 'test', page: '1' });
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
      (req: Request, res: Response) => {
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
  });
  
  it('should correctly handle error middleware', async function() {
    // Create an error middleware
    const errorMiddleware = (err: Error, req: Request, res: Response, next: NextFunction) => {
      res.status(500).json({ error: err.message });
    };
    
    // Set up a route that throws an error
    baseTest.app.get('/error', (req: Request, res: Response, next: NextFunction) => {
      next(new Error('Test error'));
    });
    
    // Add the error middleware
    baseTest.app.use(errorMiddleware);
    
    // Make a request to the route
    const response = await request(baseTest.app).get('/error');
    
    // Verify the response
    expect(response.status).to.equal(500);
    expect(response.body).to.deep.equal({ error: 'Test error' });
  });
  
  it('should correctly handle async route handlers', async function() {
    // Set up an async route handler
    baseTest.app.get('/async', async (req: Request, res: Response) => {
      // Simulate an async operation
      await new Promise(resolve => setTimeout(resolve, 50));
      res.status(200).json({ message: 'Async success' });
    });
    
    // Make a request to the route
    const response = await request(baseTest.app).get('/async');
    
    // Verify the response
    expect(response.status).to.equal(200);
    expect(response.body).to.deep.equal({ message: 'Async success' });
  });
  
  it('should correctly handle multiple HTTP methods on the same route', async function() {
    // Set up routes with different methods on the same path
    baseTest.app.get('/multi-method', (req: Request, res: Response) => {
      res.status(200).json({ method: 'GET' });
    });
    
    baseTest.app.post('/multi-method', (req: Request, res: Response) => {
      res.status(201).json({ method: 'POST' });
    });
    
    baseTest.app.put('/multi-method', (req: Request, res: Response) => {
      res.status(200).json({ method: 'PUT' });
    });

    baseTest.app.delete('/multi-method', (req: Request, res: Response) => {
      res.status(204).end();
    });

    baseTest.app.patch('/multi-method', (req: Request, res: Response) => {
      res.status(200).json({ method: 'PATCH' });
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
    
    const deleteResponse = await request(baseTest.app).delete('/multi-method');
    expect(deleteResponse.status).to.equal(204);

    const patchResponse = await request(baseTest.app).patch('/multi-method');
    expect(patchResponse.status).to.equal(200);
    expect(patchResponse.body).to.deep.equal({ method: 'PATCH' });
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

    // Router with middleware
    router.use('/protected', (req, res, next) => {
      const authHeader = req.get('Authorization');
      if (authHeader === 'Bearer valid-token') {
        next();
      } else {
        res.status(401).json({ error: 'Unauthorized' });
      }
    });

    router.get('/protected/resource', (req, res) => {
      res.status(200).json({ secure: 'data' });
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
    
    // Test router middleware
    const unauthorizedResponse = await request(baseTest.app).get('/api/protected/resource');
    expect(unauthorizedResponse.status).to.equal(401);

    const authorizedResponse = await request(baseTest.app)
      .get('/api/protected/resource')
      .set('Authorization', 'Bearer valid-token');
    expect(authorizedResponse.status).to.equal(200);
    expect(authorizedResponse.body).to.deep.equal({ secure: 'data' });
  });
  
  it('should handle streaming responses using res.write() and res.end()', async function() {
    // Set up a streaming route
    baseTest.app.get('/streaming', (req: Request, res: Response) => {
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
  });
  
  it('should correctly handle JSON payload data', async function() {
    // Setup a route that processes JSON payload
    baseTest.app.post('/process-json', (req: Request, res: Response) => {
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
  });

  it('should correctly handle form URL-encoded data', async function() {
    // Setup a route that processes form data
    baseTest.app.post('/process-form', (req: Request, res: Response) => {
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
  });

  it('should handle redirect responses', async function() {
    // Setup routes for testing redirects
    baseTest.app.get('/redirect', (req: Request, res: Response) => {
      res.redirect('/destination');
    });

    baseTest.app.get('/redirect-with-code', (req: Request, res: Response) => {
      res.redirect(301, '/permanent-destination');
    });

    baseTest.app.get('/destination', (req: Request, res: Response) => {
      res.status(200).send('Reached destination');
    });

    baseTest.app.get('/permanent-destination', (req: Request, res: Response) => {
      res.status(200).send('Reached permanent destination');
    });

    // Test default redirect (302)
    const response1 = await request(baseTest.app).get('/redirect').redirects(0);
    expect(response1.status).to.equal(302);
    expect(response1.headers.location).to.equal('/destination');

    // Test explicit redirect code
    const response2 = await request(baseTest.app).get('/redirect-with-code').redirects(0);
    expect(response2.status).to.equal(301);
    expect(response2.headers.location).to.equal('/permanent-destination');

    // Test following redirects
    const response3 = await request(baseTest.app).get('/redirect');
    expect(response3.status).to.equal(200);
    expect(response3.text).to.equal('Reached destination');
  });

  it('should handle cookie setting and reading', async function() {
    // Setup routes that use cookies
    baseTest.app.get('/set-cookie', (req: Request, res: Response) => {
      res.cookie('testCookie', 'cookieValue', { maxAge: 900000, httpOnly: true });
      res.cookie('secondCookie', 'anotherValue');
      res.status(200).send('Cookies set');
    });

    baseTest.app.get('/read-cookies', (req: Request, res: Response) => {
      res.status(200).json(req.cookies);
    });

    // Test setting cookies
    const response1 = await request(baseTest.app).get('/set-cookie');
    expect(response1.status).to.equal(200);
    expect(response1.headers['set-cookie']).to.be.an('array').with.length(2);
    expect(response1.headers['set-cookie'][0]).to.include('testCookie=cookieValue');
    expect(response1.headers['set-cookie'][0]).to.include('HttpOnly');

    // Test reading cookies
    const agent = request.agent(baseTest.app);
    await agent.get('/set-cookie');
    const response2 = await agent.get('/read-cookies');
    expect(response2.status).to.equal(200);
    expect(response2.body).to.have.property('testCookie', 'cookieValue');
    expect(response2.body).to.have.property('secondCookie', 'anotherValue');
  });

  it('should handle different content types', async function() {
    // Setup routes for different content types
    baseTest.app.get('/text', (req: Request, res: Response) => {
      res.type('text/plain').send('Plain text response');
    });

    baseTest.app.get('/html', (req: Request, res: Response) => {
      res.type('html').send('<p>HTML response</p>');
    });

    baseTest.app.get('/json', (req: Request, res: Response) => {
      res.type('application/json').send({ data: 'JSON response' });
    });

    baseTest.app.get('/xml', (req: Request, res: Response) => {
      res.type('application/xml').send('<data>XML response</data>');
    });

    // Test different content types
    const textResponse = await request(baseTest.app).get('/text');
    expect(textResponse.status).to.equal(200);
    expect(textResponse.headers['content-type']).to.include('text/plain');
    expect(textResponse.text).to.equal('Plain text response');

    const htmlResponse = await request(baseTest.app).get('/html');
    expect(htmlResponse.status).to.equal(200);
    expect(htmlResponse.headers['content-type']).to.include('text/html');
    expect(htmlResponse.text).to.equal('<p>HTML response</p>');

    const jsonResponse = await request(baseTest.app).get('/json');
    expect(jsonResponse.status).to.equal(200);
    expect(jsonResponse.headers['content-type']).to.include('application/json');
    expect(jsonResponse.body).to.deep.equal({ data: 'JSON response' });

    const xmlResponse = await request(baseTest.app).get('/xml');
    expect(xmlResponse.status).to.equal(200);
    expect(xmlResponse.headers['content-type']).to.include('application/xml');
    expect(xmlResponse.text).to.equal('<data>XML response</data>');
  });

  it('should handle custom headers', async function() {
    // Setup route that sets custom headers
    baseTest.app.get('/custom-headers', (req: Request, res: Response) => {
      res.set('X-Custom-Header', 'Custom Value');
      res.set({
        'X-Another-Header': 'Another Value',
        'X-API-Version': '1.0'
      });
      res.status(200).send('Headers set');
    });

    // Test custom headers
    const response = await request(baseTest.app).get('/custom-headers');
    expect(response.status).to.equal(200);
    expect(response.headers['x-custom-header']).to.equal('Custom Value');
    expect(response.headers['x-another-header']).to.equal('Another Value');
    expect(response.headers['x-api-version']).to.equal('1.0');
  });

  it('should handle status-only responses', async function() {
    // Setup route that only sends status
    baseTest.app.get('/status-only', (req: Request, res: Response) => {
      res.sendStatus(204);
    });

    const response = await request(baseTest.app).get('/status-only');
    expect(response.status).to.equal(204);
  });

  it('should handle error chains properly', async function() {
    // Multiple error handlers with different specificity
    const genericErrorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
      if (!err.status) {
        err.status = 500;
        err.message = err.message || 'Internal Server Error';
      }
      next(err);
    };

    const finalErrorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
      res.status(err.status).json({
        error: {
          message: err.message,
          status: err.status
        }
      });
    };

    // Route that generates different types of errors
    baseTest.app.get('/error/:type', (req: Request, res: Response, next: NextFunction) => {
      const errorType = req.params.type;
      
      if (errorType === 'normal') {
        next(new Error('Regular error'));
      } else if (errorType === 'custom') {
        const customError: any = new Error('Custom error');
        customError.status = 400;
        next(customError);
      } else if (errorType === 'async') {
        // Async error handling
        Promise.reject(new Error('Async error'))
          .catch(next);
      } else {
        res.status(200).send('No error');
      }
    });

    // Add the error handlers
    baseTest.app.use(genericErrorHandler);
    baseTest.app.use(finalErrorHandler);

    // Test regular error
    const response1 = await request(baseTest.app).get('/error/normal');
    expect(response1.status).to.equal(500);
    expect(response1.body.error.message).to.equal('Regular error');

    // Test custom error
    const response2 = await request(baseTest.app).get('/error/custom');
    expect(response2.status).to.equal(400);
    expect(response2.body.error.message).to.equal('Custom error');

    // Test async error
    const response3 = await request(baseTest.app).get('/error/async');
    expect(response3.status).to.equal(500);
    expect(response3.body.error.message).to.equal('Async error');

    // Test no error
    const response4 = await request(baseTest.app).get('/error/none');
    expect(response4.status).to.equal(200);
    expect(response4.text).to.equal('No error');
  });

  it('should handle OPTIONS requests and CORS headers', async function() {
    // Setup CORS middleware
    const corsMiddleware = (req: Request, res: Response, next: NextFunction) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
      
      if (req.method === 'OPTIONS') {
        return res.sendStatus(204);
      }
      next();
    };

    // Add the CORS middleware and a regular route
    baseTest.app.use(corsMiddleware);
    baseTest.app.get('/cors-enabled', (req: Request, res: Response) => {
      res.status(200).send('CORS enabled endpoint');
    });

    // Test OPTIONS request
    const optionsResponse = await request(baseTest.app).options('/cors-enabled');
    expect(optionsResponse.status).to.equal(204);
    expect(optionsResponse.headers['access-control-allow-origin']).to.equal('*');
    expect(optionsResponse.headers['access-control-allow-methods']).to.include('GET');

    // Test regular request with CORS headers
    const getResponse = await request(baseTest.app).get('/cors-enabled');
    expect(getResponse.status).to.equal(200);
    expect(getResponse.headers['access-control-allow-origin']).to.equal('*');
  });

  it('should handle multi-router setups with different middlewares', async function() {
    // Create multiple routers with different middleware stacks
    const publicRouter = express.Router();
    const adminRouter = express.Router();
    const apiRouter = express.Router();

    // Public router routes
    publicRouter.get('/info', (req: Request, res: Response) => {
      res.status(200).json({ section: 'public' });
    });

    // Admin router with auth middleware
    const adminAuthMiddleware = (req: Request, res: Response, next: NextFunction) => {
      const authHeader = req.get('Authorization');
      if (authHeader === 'Bearer admin-token') {
        next();
      } else {
        res.status(401).json({ error: 'Admin access required' });
      }
    };

    adminRouter.use(adminAuthMiddleware);
    adminRouter.get('/dashboard', (req: Request, res: Response) => {
      res.status(200).json({ section: 'admin', dashboard: 'data' });
    });

    // API router with rate limiting middleware (simulated)
    const apiRateLimitMiddleware = (req: Request, res: Response, next: NextFunction) => {
      // Simple simulation of rate limiting based on IP
      const clientIp = req.ip || '127.0.0.1';
      const requestLimit = 5;
      
      // For testing, we'll just allow all requests
      next();
    };

    apiRouter.use(apiRateLimitMiddleware);
    apiRouter.get('/data', (req: Request, res: Response) => {
      res.status(200).json({ section: 'api', data: ['item1', 'item2'] });
    });

    // Mount the routers
    baseTest.app.use('/public', publicRouter);
    baseTest.app.use('/admin', adminRouter);
    baseTest.app.use('/api/v1', apiRouter);

    // Test public route (no auth)
    const publicResponse = await request(baseTest.app).get('/public/info');
    expect(publicResponse.status).to.equal(200);
    expect(publicResponse.body).to.deep.equal({ section: 'public' });

    // Test admin route without auth
    const adminUnauthResponse = await request(baseTest.app).get('/admin/dashboard');
    expect(adminUnauthResponse.status).to.equal(401);

    // Test admin route with auth
    const adminAuthResponse = await request(baseTest.app)
      .get('/admin/dashboard')
      .set('Authorization', 'Bearer admin-token');
    expect(adminAuthResponse.status).to.equal(200);
    expect(adminAuthResponse.body).to.deep.equal({ section: 'admin', dashboard: 'data' });

    // Test API route
    const apiResponse = await request(baseTest.app).get('/api/v1/data');
    expect(apiResponse.status).to.equal(200);
    expect(apiResponse.body).to.deep.equal({ section: 'api', data: ['item1', 'item2'] });
  });

  it('should handle chain-style response methods', async function() {
    // Setup route that chains response methods
    baseTest.app.get('/chained', (req: Request, res: Response) => {
      res.status(200)
         .set('X-Generated-By', 'Test Suite')
         .type('application/json')
         .json({ chained: true, steps: 4 });
    });

    // Test chained methods
    const response = await request(baseTest.app).get('/chained');
    expect(response.status).to.equal(200);
    expect(response.headers['content-type']).to.include('application/json');
    expect(response.headers['x-generated-by']).to.equal('Test Suite');
    expect(response.body).to.deep.equal({ chained: true, steps: 4 });
  });

  it('should handle conditional responses based on headers', async function() {
    // Setup route that handles content negotiation
    baseTest.app.get('/negotiation', (req: Request, res: Response) => {
      res.format({
        'text/plain': () => {
          res.send('Plain text response');
        },
        'text/html': () => {
          res.send('<p>HTML response</p>');
        },
        'application/json': () => {
          res.json({ format: 'JSON response' });
        },
        default: () => {
          res.status(406).send('Not Acceptable');
        }
      });
    });

    // Test different Accept headers
    const textResponse = await request(baseTest.app)
      .get('/negotiation')
      .set('Accept', 'text/plain');
    expect(textResponse.status).to.equal(200);
    expect(textResponse.text).to.equal('Plain text response');

    const htmlResponse = await request(baseTest.app)
      .get('/negotiation')
      .set('Accept', 'text/html');
    expect(htmlResponse.status).to.equal(200);
    expect(htmlResponse.text).to.equal('<p>HTML response</p>');

    const jsonResponse = await request(baseTest.app)
      .get('/negotiation')
      .set('Accept', 'application/json');
    expect(jsonResponse.status).to.equal(200);
    expect(jsonResponse.body).to.deep.equal({ format: 'JSON response' });

    const unsupportedResponse = await request(baseTest.app)
      .get('/negotiation')
      .set('Accept', 'application/xml');
    expect(unsupportedResponse.status).to.equal(406);
  });
}); 