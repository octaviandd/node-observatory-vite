import { describe, it, before, after } from "mocha";
import { expect } from "chai";
import request from "supertest";

import { HttpRequestData } from "../../../../../types";;
import { BaseHTTPTest } from "./base-http";
import phin from "phin";

describe('Phin HTTP Client Tests', function(this: any) {
  this.timeout(10000);
  
  const baseTest = new BaseHTTPTest();
  
  before(async function() {
    await baseTest.setup();
    
    // Basic phin request test
    baseTest.app.get('/test-phin', async (req, res) => {
      try {
        const response = await phin({
          url: 'https://jsonplaceholder.typicode.com/todos/1',
          parse: 'json'
        });
        
        res.json(response.body);
      } catch (error) {
        console.error(error)
        res.status(500).json({ error: String(error) });
      }
    });
    
    // Test with POST request and request body
    baseTest.app.get('/test-phin-post', async (req, res) => {
      try {
        const postData = {
          title: 'foo',
          body: 'bar',
          userId: 1
        };
        
        const response = await phin({
          url: 'https://jsonplaceholder.typicode.com/posts',
          method: 'POST',
          data: JSON.stringify(postData),
          headers: {
            'Content-Type': 'application/json'
          },
          parse: 'json'
        });
        
        res.json(response.body);
      } catch (error) {
        console.error(error)
        res.status(500).json({ error: String(error) });
      }
    });
    
    // Test with error handling
    baseTest.app.get('/test-phin-error', async (req, res) => {
      try {
        await phin({
          url: 'https://non-existent-domain-12345.com',
          timeout: 3000
        });
        
        res.json({ success: true }); // This should not execute
        } catch (error) {
        console.error(error)
        res.status(500).json({ error: String(error) });
      }
    });
    
    // Test with binary data (image download)
    baseTest.app.get('/test-phin-binary', async (req, res) => {
      try {
        const response = await phin({
          url: 'https://httpbin.org/image/png'
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
    baseTest.app.get('/test-phin-redirects', async (req, res) => {
      try {
        const response = await phin({
          url: 'https://httpbin.org/redirect/2',
          followRedirects: true,
          parse: 'json'
        });
        
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
  
  it('should track phin GET requests', async function() {
    await request(baseTest.app).get('/test-phin').expect(200);
    
    await baseTest.waitForDataPersistence();
    
    const results = await baseTest.getHTTPResults();
    
    const phinRequest = results.find((r: HttpRequestData) => 
      r.library === 'phin' && 
      (r.pathname.includes('todos/1') || r.path?.includes('todos/1'))
    );
    
    // Test should fail if request is not found
    expect(phinRequest, 'Phin GET request not found').to.exist;
    
    // Validate that the request conforms to our HttpRequestData interface
    if (phinRequest) {
      baseTest.validateHttpRequestData(phinRequest, {
        expectedStatusCode: 200
      });
    }
  });
  
  it('should track phin POST requests with bodies', async function() {
    await request(baseTest.app).get('/test-phin-post').expect(200);
    
    await baseTest.waitForDataPersistence();
    
    const results = await baseTest.getHTTPResults();
    
    const postRequest = results.find((r: HttpRequestData) => 
      r.library === 'phin' && 
      r.method === 'POST' && 
      (r.pathname.includes('posts') || r.path?.includes('posts'))
    );
    
    // Test should fail if request is not found
    expect(postRequest, 'Phin POST request not found').to.exist;
    
    // Validate that the request conforms to our HttpRequestData interface
    if (postRequest) {
      baseTest.validateHttpRequestData(postRequest, {
        expectedMethod: 'POST',
        expectedStatusCode: 201 // JSONPlaceholder returns 201 for POST
      });
    }
  });
  
  it('should handle phin request errors gracefully', async function() {
    await request(baseTest.app).get('/test-phin-error').expect(500);
    
    await baseTest.waitForDataPersistence();
    
    const results = await baseTest.getHTTPResults();
    
    const errorRequest = results.find((r: HttpRequestData) => 
      r.library === 'phin' && 
      ((r.hostname === 'non-existent-domain-12345.com' || 
        r.host === 'non-existent-domain-12345.com') ||
       (r.error && r.error.message && 
        r.error.message.includes('non-existent-domain-12345.com')))
    );
    
    // Test should fail if request is not found
    expect(errorRequest, 'Phin error request not found').to.exist;
    
    // Validate that the request conforms to our HttpRequestData interface
    if (errorRequest) {
      baseTest.validateHttpRequestData(errorRequest, {
        expectError: true
      });
    }
  });
  
  it('should handle phin binary responses', async function() {
    await request(baseTest.app).get('/test-phin-binary').expect(200);
    
    await baseTest.waitForDataPersistence();
    
    const results = await baseTest.getHTTPResults();
    
    const binaryRequest = results.find((r: HttpRequestData) => 
      r.library === 'phin' && 
      (r.pathname.includes('image/png') || r.path?.includes('image/png'))
    );
    
    // Test should fail if request is not found
    expect(binaryRequest, 'Phin binary request not found').to.exist;
    
    // Validate that the request conforms to our HttpRequestData interface
    if (binaryRequest) {
      baseTest.validateHttpRequestData(binaryRequest, {
        expectedStatusCode: 200,
        expectMedia: true
      });
    }
  });
  
  it('should track phin redirected requests', async function() {
    await request(baseTest.app).get('/test-phin-redirects').expect(200);
    
    await baseTest.waitForDataPersistence();
    
    const results = await baseTest.getHTTPResults();
    
    const redirectRequest = results.find((r: HttpRequestData) => 
      (r.isRedirect === true || r.content?.isRedirect === true)
    );
    
    // Test should fail if request is not found
    expect(redirectRequest, 'Phin redirect request not found').to.exist;
    
    // Validate that the request conforms to our HttpRequestData interface
    if (redirectRequest) {
      baseTest.validateHttpRequestData(redirectRequest);
    }
  });
  
  /**
   * Add a new test specifically for validating the HttpRequestData interface
   */
  it('should return HTTP request data that conforms to the HttpRequestData interface', async function() {
    await request(baseTest.app).get('/test-phin').expect(200);
    
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
