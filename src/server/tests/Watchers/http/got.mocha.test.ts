import { describe, it, before, after } from "mocha";
import { expect } from "chai";
import request from "supertest";

// Force reload of got to ensure patching is applied
delete require.cache[require.resolve('got')];

import { HttpRequestData } from "../../../../../types";
import { BaseHTTPTest } from "./base-http";
import got from "got";

describe('Got HTTP Client Tests', function(this: any) {
  this.timeout(10000); // Increased timeout for external API calls
  
  const baseTest = new BaseHTTPTest();

  before(async function() {
    await baseTest.setup();
    
    // Basic got request test
    baseTest.app.get('/test-got', async (req, res) => {
      try {
        const response = await got('https://jsonplaceholder.typicode.com/todos/1');
        res.json(JSON.parse(response.body));
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: String(error) });
      }
    });
    
    // Test with POST request and request body
    baseTest.app.get('/test-got-post', async (req, res) => {
      try {
        const postData = {
          title: 'foo',
          body: 'bar',
          userId: 1
        };
        
        const response = await got.post('https://jsonplaceholder.typicode.com/posts', {
          json: postData,
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        res.json(JSON.parse(response.body));
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: String(error) });
      }
    });
    
    // Test with error handling
    baseTest.app.get('/test-got-error', async (req, res) => {
      try {
        await got('https://non-existent-domain-12345.com');
        res.json({ success: true }); // This should not execute
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: String(error) });
      }
    });
    
    // Test with abort controller
    baseTest.app.get('/test-got-abort', async (req, res) => {
      try {
        // Use the Got-specific cancellation approach
        const cancelable = got('https://httpbin.org/delay/3', {
          timeout: { request: 5000 }
        });
        
        // Cancel after 50ms
        setTimeout(() => cancelable.cancel(), 50);
        
        await cancelable;
        res.json({ success: true }); // This should not execute
      } catch (error) {
        console.error(error);
        res.status(499).json({ error: String(error) });
      }
    });
    
    // Test with binary data (image download)
    baseTest.app.get('/test-got-binary', async (req, res) => {
      try {
        const response = await got('https://httpbin.org/image/png', {
          responseType: 'buffer'
        });
        
        // Send the image back to the client
        res.set('Content-Type', 'image/png');
        res.send(response.body);
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: String(error) });
      }
    });
    
    // Test with redirects
    baseTest.app.get('/test-got-redirects', async (req, res) => {
      try {
        const response = await got('https://httpbin.org/redirect/2');
        res.json(JSON.parse(response.body));
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: String(error) });
      }
    });
    
    // Test with custom instance
    baseTest.app.get('/test-got-instance', async (req, res) => {
      try {
        const instance = got.extend({
          prefixUrl: 'https://jsonplaceholder.typicode.com',
          timeout: 5000,
          headers: {'X-Custom-Header': 'custom-value'}
        });
        
        const response = await instance('users/1');
        res.json(JSON.parse(response.body));
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: String(error) });
      }
    });
    
    // Test with query parameters
    baseTest.app.get('/test-got-query', async (req, res) => {
      try {
        const response = await got('https://httpbin.org/get', {
          searchParams: {
            param1: 'value1',
            param2: 'value2'
          }
        });
        
        res.json(JSON.parse(response.body));
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: String(error) });
      }
    });
    
    // Test with timeout
    baseTest.app.get('/test-got-timeout', async (req, res) => {
      try {
        await got('https://httpbin.org/delay/3', {
          timeout: {
            request: 100
          }
        });
        
        res.json({ success: true }); // This should not execute
      } catch (error) {
        console.error(error);
        res.status(408).json({ error: String(error) });
      }
    });
  });
  
  after(async function () {
    await baseTest.teardown();
  });
  
  it('should track got GET requests', async function() {
    await request(baseTest.app).get('/test-got').expect(200);
    
    await baseTest.waitForDataPersistence();
    
    const results = await baseTest.getHTTPResults();
    
    const gotRequest = results.find((r: HttpRequestData) => 
      r.pathname.includes('todos/1') && 
      r.library === 'got'
    );
    
    // Test should fail if request is not found
    expect(gotRequest, 'Got GET request not found').to.exist;
    
    // Validate that the request conforms to our HttpRequestData interface
    if (gotRequest) {
      baseTest.validateHttpRequestData(gotRequest, {
        expectedStatusCode: 200
      });
    }
  });
  
  it('should track got POST requests with bodies', async function() {
    await request(baseTest.app).get('/test-got-post').expect(200);
    
    await baseTest.waitForDataPersistence();
    
    const results = await baseTest.getHTTPResults();
    
    const postRequest = results.find((r: HttpRequestData) => 
      r.method === 'POST' && 
      r.pathname.includes('posts') && 
      r.library === 'got'
    );
    
    // Test should fail if request is not found
    expect(postRequest, 'Got POST request not found').to.exist;
    
    // Validate that the request conforms to our HttpRequestData interface
    if (postRequest) {
      baseTest.validateHttpRequestData(postRequest, {
        expectedMethod: 'POST',
        expectedStatusCode: 201 // JSONPlaceholder returns 201 for POST
      });
    }
  });
  
  it('should handle got request errors gracefully', async function() {
    await request(baseTest.app).get('/test-got-error').expect(500);
    
    await baseTest.waitForDataPersistence();
    
    const results = await baseTest.getHTTPResults();
    
    const errorRequest = results.find((r: HttpRequestData) => 
      (r.hostname === 'non-existent-domain-12345.com' || 
       r.host === 'non-existent-domain-12345.com') || 
      (r.error && r.error.message && 
       r.error.message.includes('non-existent-domain-12345.com'))
    );
    
    // Test should fail if request is not found
    expect(errorRequest, 'Got error request not found').to.exist;
    
    // Validate that the request conforms to our HttpRequestData interface
    if (errorRequest) {
      baseTest.validateHttpRequestData(errorRequest, {
        expectError: true
      });
    }
  });
  
  it('should track got aborted requests', async function() {
    await request(baseTest.app).get('/test-got-abort').expect(499);
    
    await baseTest.waitForDataPersistence();
    
    const results = await baseTest.getHTTPResults();
    
    const abortedRequest = results.find((r: HttpRequestData) => 
      r.pathname.includes('delay') && 
      r.error && 
      r.library === 'got'
    );
    
    // Test should fail if request is not found
    expect(abortedRequest, 'Got aborted request not found').to.exist;
    
    // Validate that the request conforms to our HttpRequestData interface
    if (abortedRequest) {
      baseTest.validateHttpRequestData(abortedRequest, {
        expectError: true
      });
    }
  });
  
  it('should handle got binary responses', async function() {
    await request(baseTest.app).get('/test-got-binary').expect(200);
    
    await baseTest.waitForDataPersistence();
    
    const results = await baseTest.getHTTPResults();
    
    const binaryRequest = results.find((r: HttpRequestData) => 
      r.pathname.includes('image/png') && 
      r.library === 'got'
    );
    
    // Test should fail if request is not found
    expect(binaryRequest, 'Got binary request not found').to.exist;
    
    // Validate that the request conforms to our HttpRequestData interface
    if (binaryRequest) {
      baseTest.validateHttpRequestData(binaryRequest, {
        expectedStatusCode: 200,
        expectMedia: true
      });
    }
  });
  
  it('should track got redirected requests', async function() {
    await request(baseTest.app).get('/test-got-redirects').expect(200);
    
    await baseTest.waitForDataPersistence();
    
    const results = await baseTest.getHTTPResults();
    
    const redirectRequest = results.find((r: HttpRequestData) => 
      r.pathname.includes('redirect') && 
      r.library === 'got'
    );
    
    // Test should fail if request is not found
    expect(redirectRequest, 'Got redirected request not found').to.exist;
    
    // Validate that the request conforms to our HttpRequestData interface
    if (redirectRequest) {
      baseTest.validateHttpRequestData(redirectRequest);
    }
  });
  
  it('should track got requests with query parameters', async function() {
    await request(baseTest.app).get('/test-got-query').expect(200);
    
    await baseTest.waitForDataPersistence();
    
    const results = await baseTest.getHTTPResults();
    
    const queryRequest = results.find((r: HttpRequestData) => 
      (r.pathname.includes('get') && r.path && r.path.includes('param1=value1')) && 
      r.library === 'got'
    );
    
    // Test should fail if request is not found
    expect(queryRequest, 'Got query request not found').to.exist;
    
    // Validate that the request conforms to our HttpRequestData interface
    if (queryRequest) {
      baseTest.validateHttpRequestData(queryRequest);
    }
  });
  
  it('should track got timeout errors', async function() {
    await request(baseTest.app).get('/test-got-timeout').expect(408);
    
    await baseTest.waitForDataPersistence();
    
    const results = await baseTest.getHTTPResults();
    
    const timeoutRequest = results.find((r: HttpRequestData) => 
      r.pathname.includes('delay') && 
      r.error && 
      r.library === 'got'
    );
    
    // Test should fail if request is not found
    expect(timeoutRequest, 'Got timeout request not found').to.exist;
    
    // Validate that the request conforms to our HttpRequestData interface
    if (timeoutRequest) {
      baseTest.validateHttpRequestData(timeoutRequest, {
        expectError: true
      });
    }
  });
  
  /**
   * Add a new test specifically for validating the HttpRequestData interface
   */
  it('should return HTTP request data that conforms to the HttpRequestData interface', async function() {
    await request(baseTest.app).get('/test-got').expect(200);
    
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
