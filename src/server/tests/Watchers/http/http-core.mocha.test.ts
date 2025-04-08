import { describe, it, before, after } from "mocha";
import { expect } from "chai";
import request from "supertest";

import { HttpRequestData } from "../../../../../types";;
import { BaseHTTPTest } from "./base-http";
import http from "http";
import https from "https";

describe('HTTP/HTTPS Core Modules Outgoing Requests Tests', function(this: any) {
  this.timeout(10000); // Increased timeout for external API calls
  
  const baseTest = new BaseHTTPTest();

  before(async function() {
    await baseTest.setup();
    
    // Basic HTTP request test
    baseTest.app.get('/test-http-core', (req, res) => {
      const httpReq = http.request('http://httpbin.org/get', (httpRes) => {
        let data = '';
        
        httpRes.on('data', (chunk) => {
          data += chunk;
        });
        
        httpRes.on('end', () => {
          try {
            res.json(JSON.parse(data));
          } catch (error) {
            res.status(500).json({ error: 'Failed to parse response' });
          }
        });
      });
      
      httpReq.on('error', (error) => {
        res.status(500).json({ error: String(error) });
      });
      
      httpReq.end();
    });
    
    // Basic HTTP get test
    baseTest.app.get('/test-http-get', (req, res) => {
      http.get('http://httpbin.org/get', (httpRes) => {
        let data = '';
        
        httpRes.on('data', (chunk) => {
          data += chunk;
        });
        
        httpRes.on('end', () => {
          try {
            res.json(JSON.parse(data));
          } catch (error) {
            res.status(500).json({ error: 'Failed to parse response' });
          }
        });
      }).on('error', (error) => {
        res.status(500).json({ error: String(error) });
      });
    });
    
    // Basic HTTPS request test
    baseTest.app.get('/test-https-core', (req, res) => {
      const httpsReq = https.request('https://jsonplaceholder.typicode.com/todos/1', {
        timeout: 5000
      }, (httpsRes) => {
        let data = '';
        
        httpsRes.on('data', (chunk) => {
          data += chunk;
        });
        
        httpsRes.on('end', () => {
          try {
            res.json(JSON.parse(data));
          } catch (error) {
            res.status(500).json({ error: 'Failed to parse response' });
          }
        });
      });
      
      httpsReq.on('error', (error) => {
        res.status(500).json({ error: String(error) });
      });
      
      httpsReq.on('timeout', () => {
        httpsReq.destroy();
        res.status(504).json({ error: 'Request timeout' });
      });
      
      httpsReq.end();
    });
    
    // Basic HTTPS get test
    baseTest.app.get('/test-https-get', (req, res) => {
      https.get('https://jsonplaceholder.typicode.com/todos/1', (httpsRes) => {
        let data = '';
        
        httpsRes.on('data', (chunk) => {
          data += chunk;
        });
        
        httpsRes.on('end', () => {
          try {
            res.json(JSON.parse(data));
          } catch (error) {
            res.status(500).json({ error: 'Failed to parse response' });
          }
        });
      }).on('error', (error) => {
        res.status(500).json({ error: String(error) });
      });
    });
    
    // Test with explicit encoding set
    baseTest.app.get('/test-with-encoding', (req, res) => {
      https.get('https://jsonplaceholder.typicode.com/posts/1', (httpsRes) => {
        let data = '';
        
        // Set explicit encoding - this should convert chunks to strings
        httpsRes.setEncoding('utf8');
        
        httpsRes.on('data', (chunk) => {
          // chunk should be a string here, not a Buffer
          data += chunk;
        });
        
        httpsRes.on('end', () => {
          res.json(JSON.parse(data));
        });
      }).on('error', (error) => {
        res.status(500).json({ error: String(error) });
      });
    });
    
    // Test with POST request and request body
    baseTest.app.get('/test-post-with-body', (req, res) => {
      const postData = JSON.stringify({
        title: 'foo',
        body: 'bar',
        userId: 1
      });
      
      const options = {
        hostname: 'jsonplaceholder.typicode.com',
        path: '/posts',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        }
      };
      
      const httpReq = https.request(options, (httpRes) => {
        let data = '';
        
        httpRes.on('data', (chunk) => {
          data += chunk;
        });
        
        httpRes.on('end', () => {
          res.json(JSON.parse(data));
        });
      });
      
      httpReq.on('error', (error) => {
        res.status(500).json({ error: String(error) });
      });
      
      // Write data to request body
      httpReq.write(postData);
      httpReq.end();
    });
    
    // Test with binary data (image download)
    baseTest.app.get('/test-binary-data', (req, res) => {
      https.get('https://httpbin.org/image/png', (httpRes) => {
        const chunks: Buffer[] = [];
        
        httpRes.on('data', (chunk) => {
          chunks.push(Buffer.from(chunk));
        });
        
        httpRes.on('end', () => {
          const imageBuffer = Buffer.concat(chunks);
          res.set('Content-Type', 'image/png');
          res.send(imageBuffer);
        });
      }).on('error', (error) => {
        res.status(500).json({ error: String(error) });
      });
    });
    
    // Test with redirects
    baseTest.app.get('/test-redirects', (req, res) => {
      https.get('https://httpbin.org/redirect/2', (httpRes) => {
        let data = '';
        
        httpRes.on('data', (chunk) => {
          data += chunk;
        });
        
        httpRes.on('end', () => {
          try {
            res.json({
              statusCode: httpRes.statusCode,
              headers: httpRes.headers,
              data: data
            });
          } catch (error) {
            res.status(500).json({ error: 'Failed to process response' });
          }
        });
      }).on('error', (error) => {
        res.status(500).json({ error: String(error) });
      });
    });
    
    // Test with error (non-existent domain)
    baseTest.app.get('/test-error', (req, res) => {
      console.log('test-error route handler called');
      
      const errorReq = https.get('https://non-existent-domain-12345.com', (httpRes) => {
        console.log('Response received (should not happen)');
        let data = '';
        
        httpRes.on('data', (chunk) => {
          data += chunk;
          console.log('data chunk received');
        });
        
        httpRes.on('end', () => {
          console.log('end event received');
          res.json(JSON.parse(data));
        });
      });
      
      errorReq.on('error', (error) => {
        console.log('Error caught:', error.message);
        res.status(500).json({ error: String(error) });
      });
      
      // Make sure to end the request
      errorReq.end();
      console.log('Request ended');
    });
    
    // Test with abort
    baseTest.app.get('/test-abort', (req, res) => {
      const controller = new AbortController();
      const { signal } = controller;
      
      const options = {
        hostname: 'httpbin.org',
        path: '/delay/5', // This will take 5 seconds
        method: 'GET',
        signal // Pass the abort signal
      };
      
      const httpReq = https.request(options, (httpRes) => {
        let data = '';
        
        httpRes.on('data', (chunk) => {
          data += chunk;
        });
        
        httpRes.on('end', () => {
          try {
            res.json(JSON.parse(data));
          } catch (error) {
            res.status(500).json({ error: 'Failed to parse response data' });
          }
        });
      });
      
      httpReq.on('error', (error) => {
        console.log(error)
        if (error.name === 'AbortError') {
          res.status(499).json({ error: 'Request aborted' });
        } else {
          res.status(500).json({ error: String(error) });
        }
      });
      
      // Set a timeout to abort the request after 1 second
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, 1000);
      
      // Clean up timeout if request completes or errors
      httpReq.on('close', () => {
        clearTimeout(timeoutId);
      });
      
      httpReq.end();
    });
    
    // Test with custom agent (keep-alive)
    baseTest.app.get('/test-custom-agent', (req, res) => {
      const agent = new https.Agent({
        keepAlive: true,
        keepAliveMsecs: 1000,
        maxSockets: 5
      });
      
      const options = {
        hostname: 'jsonplaceholder.typicode.com',
        path: '/users/1',
        method: 'GET',
        agent: agent
      };
      
      https.get(options, (httpRes) => {
        let data = '';
        
        httpRes.on('data', (chunk) => {
          data += chunk;
        });
        
        httpRes.on('end', () => {
          res.json(JSON.parse(data));
        });
      }).on('error', (error) => {
        res.status(500).json({ error: String(error) });
      });
    });
    
    // Test with URL object instead of string
    baseTest.app.get('/test-url-object', (req, res) => {
      const url = new URL('https://jsonplaceholder.typicode.com/comments/1');
      
      https.get(url, (httpRes) => {
        let data = '';
        
        httpRes.on('data', (chunk) => {
          data += chunk;
        });
        
        httpRes.on('end', () => {
          res.json(JSON.parse(data));
        });
      }).on('error', (error) => {
        res.status(500).json({ error: String(error) });
      });
    });
  });
  
  after(async function() {
    await baseTest.teardown();
  });
  
  // Basic tests
  it('should track HTTP client requests made with http.request', async function() {
    await request(baseTest.app).get('/test-http-core');
    
    await baseTest.waitForDataPersistence();
    
    const results = await baseTest.getHTTPResults();
    
    const httpRequest = results.find((r: HttpRequestData) => 
      (r.library === 'http' || r.library === 'https') && r.method === 'GET' && r.origin.includes('httpbin.org')
    );
    
    // Test should fail if request is not found
    expect(httpRequest, 'HTTP request not found').to.exist;
    
    // Validate that the request conforms to our HttpRequestData interface
    if (httpRequest) {
      baseTest.validateHttpRequestData(httpRequest, {
        expectedStatusCode: 200
      });
    }
  });
  
  it('should track HTTP client requests made with http.get', async function() {
    await request(baseTest.app).get('/test-http-get');
    
    await baseTest.waitForDataPersistence();
    
    const results = await baseTest.getHTTPResults();
    
    const httpGetRequest = results.find((r: HttpRequestData) => 
      (r.library === 'http' || r.library === 'https') && r.method === 'GET' && r.origin.includes('httpbin.org')
    );
    
    // Test should fail if request is not found
    expect(httpGetRequest, 'HTTP GET request not found').to.exist;
    
    // Validate that the request conforms to our HttpRequestData interface
    if (httpGetRequest) {
      baseTest.validateHttpRequestData(httpGetRequest, {
        expectedStatusCode: 200
      });
    }
  });
  
  it('should track HTTPS client requests made with https.request', async function() {
    await request(baseTest.app).get('/test-https-core');
    
    await baseTest.waitForDataPersistence();
    
    const results = await baseTest.getHTTPResults();
    
    const httpsRequest = results.find((r: HttpRequestData) => 
      (r.library === 'http' || r.library === 'https') && r.method === 'GET' && r.origin.includes('jsonplaceholder')
    );
    
    // Test should fail if request is not found
    expect(httpsRequest, 'HTTPS request not found').to.exist;
    
    // Validate that the request conforms to our HttpRequestData interface
    if (httpsRequest) {
      baseTest.validateHttpRequestData(httpsRequest, {
        expectedStatusCode: 200
      });
    }
  });
  
  it('should track HTTPS client requests made with https.get', async function() {
    await request(baseTest.app).get('/test-https-get');
    
    await baseTest.waitForDataPersistence();
    
    const results = await baseTest.getHTTPResults();
    
    const httpsGetRequest = results.find((r: HttpRequestData) => 
      (r.library === 'http' || r.library === 'https') && r.method === 'GET' && r.origin.includes('jsonplaceholder')
    );
    
    // Test should fail if request is not found
    expect(httpsGetRequest, 'HTTPS GET request not found').to.exist;
    
    // Validate that the request conforms to our HttpRequestData interface
    if (httpsGetRequest) {
      baseTest.validateHttpRequestData(httpsGetRequest, {
        expectedStatusCode: 200
      });
    }
  });
  
  // Advanced tests
  it('should handle requests with explicit encoding set', async function() {
    await request(baseTest.app).get('/test-with-encoding');
    
    await baseTest.waitForDataPersistence();
    
    const results = await baseTest.getHTTPResults();
    
    const encodingRequest = results.find((r: HttpRequestData) => 
      (r.library === 'http' || r.library === 'https') && r.method === 'GET' && r.pathname.includes('posts/1')
    );
    
    // Test should fail if request is not found
    expect(encodingRequest, 'Encoding request not found').to.exist;
    
    // Validate that the request conforms to our HttpRequestData interface
    if (encodingRequest) {
      baseTest.validateHttpRequestData(encodingRequest, {
        expectedStatusCode: 200
      });
    }
  });
  
  it('should track POST requests with request bodies', async function() {
    await request(baseTest.app).get('/test-post-with-body');
    
    await baseTest.waitForDataPersistence();
    
    const results = await baseTest.getHTTPResults();
    
    const postRequest = results.find((r: HttpRequestData) => 
      (r.library === 'http' || r.library === 'https') && r.method === 'POST' && r.pathname.includes('posts')
    );
    
    // Test should fail if request is not found
    expect(postRequest, 'POST request not found').to.exist;
    
    // Validate that the request conforms to our HttpRequestData interface
    if (postRequest) {
      baseTest.validateHttpRequestData(postRequest, {
        expectedMethod: 'POST',
        expectedStatusCode: 201 // JSONPlaceholder returns 201 for POST
      });
    }
  });
  
  it('should handle binary data responses', async function() {
    await request(baseTest.app).get('/test-binary-data');
    
    await baseTest.waitForDataPersistence();
    
    const results = await baseTest.getHTTPResults();
    
    const binaryRequest = results.find((r: HttpRequestData) => 
      (r.library === 'http' || r.library === 'https') && r.method === 'GET' && r.pathname.includes('image/png')
    );
    
    // Test should fail if request is not found
    expect(binaryRequest, 'Binary request not found').to.exist;
    
    // Validate that the request conforms to our HttpRequestData interface
    if (binaryRequest) {
      baseTest.validateHttpRequestData(binaryRequest, {
        expectedStatusCode: 200,
        expectMedia: true
      });
    }
  });
  
  it('should track requests with redirects', async function() {
    await request(baseTest.app).get('/test-redirects');
    
    await baseTest.waitForDataPersistence();
    
    const results = await baseTest.getHTTPResults();
    
    const redirectRequest = results.find((r: HttpRequestData) => 
      (r.library === 'http' || r.library === 'https') && r.method === 'GET' && r.pathname.includes('redirect')
    );
    
    // Test should fail if request is not found
    expect(redirectRequest, 'Redirect request not found').to.exist;
    
    // Validate that the request conforms to our HttpRequestData interface
    if (redirectRequest) {
      baseTest.validateHttpRequestData(redirectRequest);
    }
  });
  
  it('should handle request errors gracefully', async function() {
    console.log('Running error test');
    
    try {
      const response = await request(baseTest.app).get('/test-error');
    } catch (error) {
      console.error('Error making request to test-error route:', error);
    }
    
    await baseTest.waitForDataPersistence();
    
    const results = await baseTest.getHTTPResults();
    
    const errorRequest = results.find((r: HttpRequestData) => 
      (r.hostname === 'non-existent-domain-12345.com' || 
       r.host === 'non-existent-domain-12345.com') || 
      (r.error && r.error.message && 
       r.error.message.includes('non-existent-domain-12345.com'))
    );
    
    console.log('Error request found:', !!errorRequest);
    if (errorRequest) {
      console.log('Error details:', errorRequest.error);
    }
    
    // Test should fail if request is not found
    expect(errorRequest, 'Error request not found').to.exist;
    
    // Validate that the request conforms to our HttpRequestData interface
    if (errorRequest) {
      baseTest.validateHttpRequestData(errorRequest, {
        expectError: true
      });
    }
  });
  
  it('should handle aborted requests', async function() {
    await request(baseTest.app).get('/test-abort').expect(499);
    
    await baseTest.waitForDataPersistence();
    
    const results = await baseTest.getHTTPResults();
    
    const abortedRequest = results.find((r: HttpRequestData) => 
      r.method === 'GET' && r.pathname.includes('delay') && 
      r.error && r.error.name === 'AbortError'
    );
    
    // Test should fail if request is not found
    expect(abortedRequest, 'Aborted request not found').to.exist;
    
    // Validate that the request conforms to our HttpRequestData interface
    if (abortedRequest) {
      baseTest.validateHttpRequestData(abortedRequest, {
        expectError: true,
        expectedErrorType: 'AbortError'
      });
    }
  });
  
  it('should track requests with custom agents', async function() {
    await request(baseTest.app).get('/test-custom-agent');
    
    await baseTest.waitForDataPersistence();
    
    const results = await baseTest.getHTTPResults();
    
    const agentRequest = results.find((r: HttpRequestData) => 
      (r.library === 'http' || r.library === 'https') && r.method === 'GET' && r.pathname.includes('users/1')
    );
    
    // Test should fail if request is not found
    expect(agentRequest, 'Agent request not found').to.exist;
    
    // Validate that the request conforms to our HttpRequestData interface
    if (agentRequest) {
      baseTest.validateHttpRequestData(agentRequest, {
        expectedStatusCode: 200
      });
    }
  });
  
  it('should handle URL objects as request targets', async function() {
    await request(baseTest.app).get('/test-url-object');
    
    await baseTest.waitForDataPersistence();
    
    const results = await baseTest.getHTTPResults();
    
    const urlObjectRequest = results.find((r: HttpRequestData) => 
      (r.library === 'http' || r.library === 'https') && r.method === 'GET' && r.pathname.includes('comments/1')
    );
    
    // Test should fail if request is not found
    expect(urlObjectRequest, 'URL object request not found').to.exist;
    
    // Validate that the request conforms to our HttpRequestData interface
    if (urlObjectRequest) {
      baseTest.validateHttpRequestData(urlObjectRequest, {
        expectedStatusCode: 200
      });
    }
  });
  
  /**
   * Add a new test specifically for validating the HttpRequestData interface
   */
  it('should return HTTP request data that conforms to the HttpRequestData interface', async function() {
    await request(baseTest.app).get('/test-http-core');
    
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