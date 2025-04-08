import { describe, it, before, after } from "mocha";
import { expect } from "chai";
import request from "supertest";

import { HttpRequestData } from "../../../../../types";;
import { BaseHTTPTest } from "./base-http";
import superagent from "superagent";

describe('Superagent HTTP Client Tests', function(this: any) {
  this.timeout(10000);
  
  const baseTest = new BaseHTTPTest();
  
  before(async function() {
    await baseTest.setup();
    
    // Basic superagent request test
    baseTest.app.get('/test-superagent', async (req, res) => {
      try {
        const response = await superagent.get('https://jsonplaceholder.typicode.com/todos/1');
        res.json(response.body);
      } catch (error) {
        console.error(error)    
        res.status(500).json({ error: String(error) });
      }
    });
    
    // Test with POST request and request body
    baseTest.app.get('/test-superagent-post', async (req, res) => {
      try {
        const postData = {
          title: 'foo',
          body: 'bar',
          userId: 1
        };
        
        const response = await superagent
          .post('https://jsonplaceholder.typicode.com/posts')
          .set('Content-Type', 'application/json')
          .send(postData);
        
        res.json(response.body);
      } catch (error) {
        console.error(error)
        res.status(500).json({ error: String(error) });
      }
    });
    
    // Test with error handling
    baseTest.app.get('/test-superagent-error', async (req, res) => {
      try {
        await superagent.get('https://non-existent-domain-12345.com');
        res.json({ success: true }); // This should not execute
      } catch (error) {
        console.error(error)
        res.status(500).json({ error: String(error) });
      }
    });
    
    // Test with timeout
    baseTest.app.get('/test-superagent-timeout', async (req, res) => {
      try {
        await superagent
          .get('https://httpbin.org/delay/3')
          .timeout(100); // Short timeout to trigger error
        
        res.json({ success: true }); // This should not execute
      } catch (error) {
        console.error(error)
        res.status(408).json({ error: String(error) });
      }
    });
    
    // Test with binary data (image download)
    baseTest.app.get('/test-superagent-binary', async (req, res) => {
      try {
        const response = await superagent
          .get('https://httpbin.org/image/png')
          .responseType('arraybuffer');
        
        // Send the image back to the client
        res.set('Content-Type', 'image/png');
        res.send(Buffer.from(response.body));
      } catch (error) {
        console.error(error)
        res.status(500).json({ error: String(error) });
      }
    });
    
    // Test with redirects
    baseTest.app.get('/test-superagent-redirects', async (req, res) => {
      try {
        const response = await superagent
          .get('https://httpbin.org/redirect/2')
          .redirects(3);
        
        res.json(response.body);
      } catch (error) {
        console.error(error)
        res.status(500).json({ error: String(error) });
      }
    });
    
    // Test with query parameters
    baseTest.app.get('/test-superagent-query', async (req, res) => {
      try {
        const response = await superagent
          .get('https://httpbin.org/get')
          .query({ param1: 'value1', param2: 'value2' });
        
        res.json(response.body);
      } catch (error) {
        console.error(error)
        res.status(500).json({ error: String(error) });
      }
    });
  });
  
  after(async function() {
    await baseTest.teardown();
  });
  
  it('should track superagent GET requests', async function() {
    await request(baseTest.app).get('/test-superagent').expect(200);
    
    await baseTest.waitForDataPersistence();
    
    const results = await baseTest.getHTTPResults();
    
    const superagentRequest = results.find((r: HttpRequestData) => 
      r.library === 'superagent' && 
      (r.pathname.includes('todos/1') || r.path?.includes('todos/1'))
    );
    
    // Test should fail if request is not found
    expect(superagentRequest, 'Superagent GET request not found').to.exist;
    
    // Validate that the request conforms to our HttpRequestData interface
    if (superagentRequest) {
      baseTest.validateHttpRequestData(superagentRequest, {
        expectedStatusCode: 200
      });
    }
  });
  
  it('should track superagent POST requests with bodies', async function() {
    await request(baseTest.app).get('/test-superagent-post').expect(200);
    
    await baseTest.waitForDataPersistence();
    
    const results = await baseTest.getHTTPResults();
    
    const postRequest = results.find((r: HttpRequestData) => 
      r.library === 'superagent' && 
      r.method === 'POST' && 
      (r.pathname.includes('posts') || r.path?.includes('posts'))
    );
    
    // Test should fail if request is not found
    expect(postRequest, 'Superagent POST request not found').to.exist;
    
    // Validate that the request conforms to our HttpRequestData interface
    if (postRequest) {
      baseTest.validateHttpRequestData(postRequest, {
        expectedMethod: 'POST',
        expectedStatusCode: 201 // JSONPlaceholder returns 201 for POST
      });
    }
  });
  
  it('should handle superagent request errors gracefully', async function() {
    await request(baseTest.app).get('/test-superagent-error').expect(500);
    
    await baseTest.waitForDataPersistence();
    
    const results = await baseTest.getHTTPResults();
    
    const errorRequest = results.find((r: HttpRequestData) => 
      r.library === 'superagent' && 
      ((r.hostname === 'non-existent-domain-12345.com' || 
        r.host === 'non-existent-domain-12345.com') ||
       (r.error && r.error.message && 
        r.error.message.includes('non-existent-domain-12345.com')))
    );
    
    // Test should fail if request is not found
    expect(errorRequest, 'Superagent error request not found').to.exist;
    
    // Validate that the request conforms to our HttpRequestData interface
    if (errorRequest) {
      baseTest.validateHttpRequestData(errorRequest, {
        expectError: true
      });
    }
  });
  
  it('should track superagent timeout errors', async function() {
    await request(baseTest.app).get('/test-superagent-timeout').expect(408);
    
    await baseTest.waitForDataPersistence();
    
    const results = await baseTest.getHTTPResults();
    
    const timeoutRequest = results.find((r: HttpRequestData) => 
      r.library === 'superagent' && 
      (r.pathname.includes('delay') || r.path?.includes('delay')) && 
      r.error !== undefined
    );
    
    // Test should fail if request is not found
    expect(timeoutRequest, 'Superagent timeout request not found').to.exist;
    
    // Validate that the request conforms to our HttpRequestData interface
    if (timeoutRequest) {
      baseTest.validateHttpRequestData(timeoutRequest, {
        expectError: true,
        expectedErrorType: ['TimeoutError', 'Error']
      });
    }
  });
  
  it('should handle superagent binary responses', async function() {
    await request(baseTest.app).get('/test-superagent-binary').expect(200);
    
    await baseTest.waitForDataPersistence();
    
    const results = await baseTest.getHTTPResults();
    
    const binaryRequest = results.find((r: HttpRequestData) => 
      r.library === 'superagent' && 
      r.isMedia === true
    );
    
    // Test should fail if request is not found
    expect(binaryRequest, 'Superagent binary request not found').to.exist;
    
    // Validate that the request conforms to our HttpRequestData interface
    if (binaryRequest) {
      baseTest.validateHttpRequestData(binaryRequest, {
        expectedStatusCode: 200,
        expectMedia: true
      });
    }
  });
  
  it('should track superagent redirected requests', async function() {
    await request(baseTest.app).get('/test-superagent-redirects').expect(200);
    
    await baseTest.waitForDataPersistence();
    
    const results = await baseTest.getHTTPResults();
    
    const redirectRequest = results.find((r: HttpRequestData) => 
      r.library === 'superagent' && 
      (r.pathname.includes('redirect') || r.path?.includes('redirect'))
    );
    
    // Test should fail if request is not found
    expect(redirectRequest, 'Superagent redirect request not found').to.exist;
    
    // Validate that the request conforms to our HttpRequestData interface
    if (redirectRequest) {
      baseTest.validateHttpRequestData(redirectRequest);
    }
  });
  
  it('should track superagent requests with query parameters', async function() {
    await request(baseTest.app).get('/test-superagent-query').expect(200);
    
    await baseTest.waitForDataPersistence();
    
    const results = await baseTest.getHTTPResults();
    
    const queryRequest = results.find((r: HttpRequestData) => 
      r.library === 'superagent' && 
      (r.path?.includes('param1=value1') || r.query?.includes('param1=value1'))
    );
    
    // Test should fail if request is not found
    expect(queryRequest, 'Superagent query request not found').to.exist;
    
    // Validate that the request conforms to our HttpRequestData interface
    if (queryRequest) {
      baseTest.validateHttpRequestData(queryRequest);
    }
  });
  
  /**
   * Add a new test specifically for validating the HttpRequestData interface
   */
  it('should return HTTP request data that conforms to the HttpRequestData interface', async function() {
    await request(baseTest.app).get('/test-superagent').expect(200);
    
    await baseTest.waitForDataPersistence();
    
    // Get the display data which uses our interface
    const displayData = await baseTest.getHTTPDisplayData();
    expect(displayData).to.be.an('array');
    expect(displayData.length).to.be.greaterThan(0);
    
    // Check that display data has the expected properties
    const firstItem = displayData[0];
    expect(firstItem).to.have.property('id');
    expect(firstItem).to.have.property('method');
    expect(firstItem).to.have.property('url');
    expect(firstItem).to.have.property('statusCode');
    expect(firstItem).to.have.property('duration');
    expect(firstItem).to.have.property('size');
    expect(firstItem).to.have.property('library');
    
    // Get the detailed data for a specific request
    if (firstItem && firstItem.id) {
      const httpId = firstItem.id;
      const detailedData = await baseTest.getHTTPDetails(httpId);
      
      // Validate the detailed data against our interface
      baseTest.validateHttpRequestData(detailedData);
    }
  });
});
