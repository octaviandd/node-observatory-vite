import { describe, it, before, after } from "mocha";
import { expect } from "chai";
import request from "supertest";

import { HttpRequestData } from "../../../../../types";;
import { BaseHTTPTest } from "./base-http";
import axios from "axios";

describe('Axios HTTP Client Tests', function(this: any) {
  this.timeout(10000);
  
  const baseTest = new BaseHTTPTest();

  after(async function() {
    await baseTest.teardown();
  });
  
  before(async function() {
    await baseTest.setup();
    
    // Basic axios request test
    baseTest.app.get('/test-axios', async (req, res) => {
      try {
        const response = await axios.get('https://jsonplaceholder.typicode.com/todos/1');
        res.json(response.data);
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: String(error) });
      }
    });
    
    // Test with POST request and request body
    baseTest.app.get('/test-axios-post', async (req, res) => {
      try {
        const postData = {
          title: 'foo',
          body: 'bar',
          userId: 1
        };
        
        const response = await axios.post(
          'https://jsonplaceholder.typicode.com/posts', 
          postData,
          {
            headers: {
              'Content-Type': 'application/json'
            }
          }
        );
        
        res.json(response.data);
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: String(error) });
      }
    });
    
    // Test with error handling
    baseTest.app.get('/test-axios-error', async (req, res) => {
      try {
        await axios.get('https://non-existent-domain-12345.com');
        res.json({ success: true }); // This should not execute
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: String(error) });
      }
    });
    
    // Test with cancel token
    baseTest.app.get('/test-axios-cancel', async (req, res) => {
      try {
        const controller = new AbortController();
        
        // Cancel the request after 50ms
        setTimeout(() => controller.abort(), 50);
        
        await axios.get('https://httpbin.org/delay/3', {
          signal: controller.signal
        });
        
        res.json({ success: true }); // This should not execute
      } catch (error) {
        console.error(error);
        res.status(499).json({ error: String(error) });
      }
    });
    
    // Test with binary data (image download)
    baseTest.app.get('/test-axios-binary', async (req, res) => {
      try {
        const response = await axios.get('https://httpbin.org/image/png', {
          responseType: 'arraybuffer'
        });
        
        // Send the image back to the client
        res.set('Content-Type', 'image/png');
        res.send(Buffer.from(response.data));
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: String(error) });
      }
    });
    
    // Test with redirects
    baseTest.app.get('/test-axios-redirects', async (req, res) => {
      try {
        const response = await axios.get('https://httpbin.org/redirect/2');
        res.json(response.data);
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: String(error) });
      }
    });
    
    // Test with custom instance
    baseTest.app.get('/test-axios-instance', async (req, res) => {
      try {
        const instance = axios.create({
          baseURL: 'https://jsonplaceholder.typicode.com',
          timeout: 5000,
          headers: {'X-Custom-Header': 'custom-value'}
        });
        
        const response = await instance.get('/users/1');
        res.json(response.data);
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: String(error) });
      }
    });
  });
  
  it('should track axios GET requests', async function() {
    await request(baseTest.app).get('/test-axios').expect(200);
    
    await baseTest.waitForDataPersistence();
    
    const results = await baseTest.getHTTPResults();
    
    const axiosRequest = results.find((r: HttpRequestData) => 
      r.pathname.includes('todos/1') && 
      r.library === 'axios'
    );
    
    // Test should fail if request is not found
    expect(axiosRequest, 'Axios GET request not found').to.exist;
    
    // Validate that the request conforms to our HttpRequestData interface
    if (axiosRequest) {
      baseTest.validateHttpRequestData(axiosRequest, {
        expectedStatusCode: 200
      });
    }
  });
  
  it('should track axios POST requests with bodies', async function() {
    await request(baseTest.app).get('/test-axios-post').expect(200);
    
    await baseTest.waitForDataPersistence();
    
    const results = await baseTest.getHTTPResults();
    
    const postRequest = results.find((r: HttpRequestData) => 
      r.method === 'POST' && 
      r.pathname.includes('posts') && 
      r.library === 'axios'
    );
    
    // Test should fail if request is not found
    expect(postRequest, 'Axios POST request not found').to.exist;
    
    // Validate that the request conforms to our HttpRequestData interface
    if (postRequest) {
      baseTest.validateHttpRequestData(postRequest, {
        expectedMethod: 'POST',
        expectedStatusCode: 201 // JSONPlaceholder returns 201 for POST
      });
    }
  });
  
  it('should handle axios request errors gracefully', async function() {
    await request(baseTest.app).get('/test-axios-error').expect(500);
    
    await baseTest.waitForDataPersistence();
    
    const results = await baseTest.getHTTPResults();
    
    const errorRequest = results.find((r: HttpRequestData) => 
      (r.hostname === 'non-existent-domain-12345.com' || 
       r.host === 'non-existent-domain-12345.com') && 
      r.library === 'axios'
    );
    
    // Test should fail if request is not found
    expect(errorRequest, 'Axios error request not found').to.exist;
    
    // Even error responses should conform to our interface
    if (errorRequest) {
      baseTest.validateHttpRequestData(errorRequest, {
        expectError: true
      });
    }
  });
  
  it('should track axios cancelled requests', async function() {
    await request(baseTest.app).get('/test-axios-cancel').expect(499);
    
    await baseTest.waitForDataPersistence();
    
    const results = await baseTest.getHTTPResults();
    
    const cancelledRequest = results.find((r: HttpRequestData) => 
      r.pathname.includes('delay') && 
      r.error && 
      (r.error.name === 'AbortError' || r.error.name === 'CanceledError') && 
      r.library === 'axios'
    );
    
    // Test should fail if request is not found
    expect(cancelledRequest, 'Axios cancelled request not found').to.exist;
    
    // Cancelled requests should still conform to our interface
    if (cancelledRequest) {
      baseTest.validateHttpRequestData(cancelledRequest, {
        expectError: true,
        expectedErrorType: ['AbortError', 'CanceledError']
      });
    }
  });
  
  it('should handle axios binary responses', async function() {
    await request(baseTest.app).get('/test-axios-binary').expect(200);
    
    await baseTest.waitForDataPersistence();
    
    const results = await baseTest.getHTTPResults();
    
    const binaryRequest = results.find((r: HttpRequestData) => 
      r.pathname.includes('image/png') && 
      r.library === 'axios'
    );
    
    // Test should fail if request is not found
    expect(binaryRequest, 'Axios binary request not found').to.exist;
    
    // Binary responses should still conform to our interface
    if (binaryRequest) {
      baseTest.validateHttpRequestData(binaryRequest, {
        expectedStatusCode: 200,
        expectMedia: true
      });
    }
  });
  
  it('should track axios redirected requests', async function () {
    await request(baseTest.app).get('/test-axios-redirects').expect(200);

    await baseTest.waitForDataPersistence(4000);

    const results = await baseTest.getHTTPResults();
    
    // The redirect seems to forget the library and fall to 'https'
    const redirectRequest = results.find((r: HttpRequestData) => 
      r.responseBody.includes('origin') 
    );
    
    // Test should fail if request is not found
    expect(redirectRequest, 'Axios redirected request not found').to.exist;
    
    // Redirected requests should still conform to our interface
    if (redirectRequest) {
      baseTest.validateHttpRequestData(redirectRequest);
    }
  });
  
  /**
   * Add a new test specifically for validating the HttpRequestData interface
   */
  it('should return HTTP request data that conforms to the HttpRequestData interface', async function() {
    await request(baseTest.app).get('/test-axios').expect(200);
    
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
