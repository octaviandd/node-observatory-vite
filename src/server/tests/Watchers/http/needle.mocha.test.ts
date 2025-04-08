import { describe, it, before, after } from "mocha";
import { expect } from "chai";
import request from "supertest";

import { HttpRequestData } from "../../../../../types";;
import { BaseHTTPTest } from "./base-http";
const needle = require('needle');

describe('Needle HTTP Client Tests', function(this: any) {
  this.timeout(10000);
  
  const baseTest = new BaseHTTPTest();
  
  before(async function() {
    await baseTest.setup();
    
    // Basic needle request test
    baseTest.app.get('/test-needle', async (req, res) => {
      try {
        const response = await needle('get', 'https://jsonplaceholder.typicode.com/todos/1', {
          json: true
        });
        
        res.json(response.body);
      } catch (error) {
        console.error(error)
        res.status(500).json({ error: String(error) });
      }
    });
    
    // Test with POST request and request body
    baseTest.app.get('/test-needle-post', async (req, res) => {
      try {
        const postData = {
          title: 'foo',
          body: 'bar',
          userId: 1
        };
        
        const response = await needle('post', 'https://jsonplaceholder.typicode.com/posts', postData, {
          json: true,
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        res.json(response.body);
        } catch (error) {
        console.error(error)
        res.status(500).json({ error: String(error) });
      }
    });
    
    // Test with error handling
    baseTest.app.get('/test-needle-error', async (req, res) => {
      try {
        await needle('get', 'https://non-existent-domain-12345.com');
        res.json({ success: true }); // This should not execute
      } catch (error) {
        console.error(error)
        res.status(500).json({ error: String(error) });
      }
    });
    
    // Test with binary data (image download)
    baseTest.app.get('/test-needle-binary', async (req, res) => {
      try {
        const response = await needle('get', 'https://httpbin.org/image/png', {
          output: null // Stream to buffer
        });
        
        // Send the image back to the client
        res.set('Content-Type', 'image/png');
        res.send(response.body);
      } catch (error) {
        console.error(error)
        res.status(500).json({ error: String(error) });
      }
    });
    
    // Test with redirects
    baseTest.app.get('/test-needle-redirects', async (req, res) => {
      try {
        const response = await needle('get', 'https://httpbin.org/redirect/2', {
          follow_max: 5,
          json: true
        });
        
        res.json(response.body);
      } catch (error) {
        console.error(error)
        res.status(500).json({ error: String(error) });
      }
    });
    
    // Test with custom options
    baseTest.app.get('/test-needle-options', async (req, res) => {
      try {
        const response = await needle('get', 'https://jsonplaceholder.typicode.com/users/1', {
          json: true,
          headers: {
            'X-Custom-Header': 'custom-value',
            'test': 'test'
          },
          timeout: 5000
        });
        
        res.json(response.body);
      } catch (error) {
        console.error(error)
        res.status(500).json({ error: String(error) });
      }
    });
  });
  
  after(async function () {
    await baseTest.teardown();
  });
  
  it('should track needle GET requests', async function() {
    await request(baseTest.app).get('/test-needle').expect(200);
    
    await baseTest.waitForDataPersistence();
    
    const results = await baseTest.getHTTPResults();
    
    const needleRequest = results.find((r: HttpRequestData) => 
      r.pathname.includes('todos/1') && 
      r.library === 'needle'
    );
    
    // Test should fail if request is not found
    expect(needleRequest, 'Needle GET request not found').to.exist;
    
    // Validate that the request conforms to our HttpRequestData interface
    if (needleRequest) {
      baseTest.validateHttpRequestData(needleRequest, {
        expectedStatusCode: 200
      });
    }
  });
  
  it('should track needle POST requests with bodies', async function() {
    await request(baseTest.app).get('/test-needle-post').expect(200);
    
    await baseTest.waitForDataPersistence();
    
    const results = await baseTest.getHTTPResults();
    
    const postRequest = results.find((r: HttpRequestData) => 
      r.method === 'POST' && 
      r.pathname.includes('posts') && 
      r.library === 'needle'
    );
    
    // Test should fail if request is not found
    expect(postRequest, 'Needle POST request not found').to.exist;
    
    // Validate that the request conforms to our HttpRequestData interface
    if (postRequest) {
      baseTest.validateHttpRequestData(postRequest, {
        expectedMethod: 'POST',
        expectedStatusCode: 201 // JSONPlaceholder returns 201 for POST
      });
    }
  });
  
  it('should handle needle request errors gracefully', async function() {
    await request(baseTest.app).get('/test-needle-error').expect(500);
    
    await baseTest.waitForDataPersistence();
    
    const results = await baseTest.getHTTPResults();
    
    const errorRequest = results.find((r: HttpRequestData) => 
      (r.hostname === 'non-existent-domain-12345.com' || 
       r.host === 'non-existent-domain-12345.com') || 
      (r.error && r.error.message && 
       r.error.message.includes('non-existent-domain-12345.com'))
    );
    
    // Test should fail if request is not found
    expect(errorRequest, 'Needle error request not found').to.exist;
    
    // Validate that the request conforms to our HttpRequestData interface
    if (errorRequest) {
      baseTest.validateHttpRequestData(errorRequest, {
        expectError: true
      });
    }
  });
  
  it('should handle needle binary responses', async function() {
    await request(baseTest.app).get('/test-needle-binary').expect(200);
    
    await baseTest.waitForDataPersistence();
    
    const results = await baseTest.getHTTPResults();
    
    const binaryRequest = results.find((r: HttpRequestData) => 
      r.pathname.includes('image/png') && 
      r.library === 'needle'
    );
    
    // Test should fail if request is not found
    expect(binaryRequest, 'Needle binary request not found').to.exist;
    
    // Validate that the request conforms to our HttpRequestData interface
    if (binaryRequest) {
      baseTest.validateHttpRequestData(binaryRequest, {
        expectedStatusCode: 200,
        expectMedia: true
      });
    }
  });
  
  it('should track needle redirected requests', async function() {
    await request(baseTest.app).get('/test-needle-redirects').expect(200);
    
    await baseTest.waitForDataPersistence();
    
    const results = await baseTest.getHTTPResults();
    
    const redirectRequest = results.find((r: HttpRequestData) => 
      r.pathname.includes('redirect')
    );
    
    // Test should fail if request is not found
    expect(redirectRequest, 'Needle redirected request not found').to.exist;
    
    // Validate that the request conforms to our HttpRequestData interface
    if (redirectRequest) {
      baseTest.validateHttpRequestData(redirectRequest);
    }
  });
  
  it('should track needle requests with custom options', async function() {
    await request(baseTest.app).get('/test-needle-options').expect(200);
    
    await baseTest.waitForDataPersistence();
    
    const results = await baseTest.getHTTPResults();
    
    const optionsRequest = results.find((r: HttpRequestData) => 
      r.pathname.includes('users/1') && 
      r.library === 'needle'
    );
    
    // Test should fail if request is not found
    expect(optionsRequest, 'Needle options request not found').to.exist;
    
    // Validate that the request conforms to our HttpRequestData interface
    if (optionsRequest) {
      baseTest.validateHttpRequestData(optionsRequest, {
        expectedStatusCode: 200
      });
    }
  });
  
  /**
   * Add a new test specifically for validating the HttpRequestData interface
   */
  it('should return HTTP request data that conforms to the HttpRequestData interface', async function() {
    await request(baseTest.app).get('/test-needle').expect(200);
    
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
