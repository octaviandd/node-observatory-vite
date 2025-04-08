// import { describe, it, before, after } from "mocha";
// import { expect } from "chai";
// import request from "supertest";

// // Import patching code explicitly to ensure it runs before tests
// import { HttpRequestData } from "../../../../../types";;
// import { BaseHTTPTest } from "./base-http";
// import undici from 'undici';

// describe('Undici Outgoing Requests Tests', function(this: any) {
//   this.timeout(10000); // Increased timeout for external API calls
  
//   const baseTest = new BaseHTTPTest();
  
//   before(async function() {
//     await baseTest.setup();
    
//     // Basic undici.request test
//     baseTest.app.get('/test-undici-request', async (req, res) => {
//       try {
//         const { statusCode, body } = await undici.request('https://jsonplaceholder.typicode.com/todos/1');
//         const data = await body.json();
//         res.json(data);
//       } catch (error) {
//         console.error(error);
//         res.status(500).json({ error: String(error) });
//       }
//     });
    
//     // Basic fetch test
//     baseTest.app.get('/test-undici-fetch', async (req, res) => {
//       try {
//         const response = await undici.request('https://jsonplaceholder.typicode.com/posts/1');
//         const data = await response.body.json();
//         res.json(data);
//       } catch (error) {
//         res.status(500).json({ error: String(error) });
//       }
//     });
    
//     // Test with POST request and request body
//     baseTest.app.get('/test-undici-post', async (req, res) => {
//       try {
//         const postData = JSON.stringify({
//           title: 'foo',
//           body: 'bar',
//           userId: 1
//         });
        
//         const response = await undici.request('https://jsonplaceholder.typicode.com/posts', {
//           method: 'POST',
//           headers: {
//             'Content-Type': 'application/json'
//           },
//           body: postData
//         });
        
//         const data = await response.body.json();
//         res.json(data);
//       } catch (error) {
//         res.status(500).json({ error: String(error) });
//       }
//     });
    
//     // Test with custom agent
//     baseTest.app.get('/test-undici-agent', async (req, res) => {
//       try {
//         const agent = new undici.Agent({
//           keepAliveTimeout: 10000,
//           keepAliveMaxTimeout: 10000
//         });
        
//         const response = await undici.request('https://jsonplaceholder.typicode.com/users/1', {
//           dispatcher: agent
//         });
        
//         const data = await response.body.json();
//         res.json(data);
        
//         // Close the agent to clean up resources
//         await agent.close();
//       } catch (error) {
//         res.status(500).json({ error: String(error) });
//       }
//     });
    
//     // Test with connection pool
//     baseTest.app.get('/test-undici-pool', async (req, res) => {
//       try {
//         const pool = new undici.Pool('https://jsonplaceholder.typicode.com', {
//           connections: 5
//         });
        
//         const { body } = await undici.request('/comments/1', {
//           dispatcher: pool
//         });
        
//         const data = await body.json();
//         res.json(data);
        
//         // Close the pool to clean up resources
//         await pool.close();
//       } catch (error) {
//         console.error(error);
//         res.status(500).json({ error: String(error) });
//       }
//     });
    
//     // Test with error handling
//     baseTest.app.get('/test-undici-error', async (req, res) => {
//       try {
//         await undici.request('https://non-existent-domain-12345.com');
//         res.json({ success: true }); // This should not execute
//       } catch (error) {
//         res.status(500).json({ error: String(error) });
//       }
//     });
    
//     // Test with abort controller
//     baseTest.app.get('/test-undici-abort', async (req, res) => {
//       try {
//         const controller = new AbortController();
//         const { signal } = controller;
        
//         // Abort the request after 50ms
//         setTimeout(() => controller.abort(), 50);
        
//         await undici.request('https://httpbin.org/delay/3', { signal });
//         res.json({ success: true }); // This should not execute
//       } catch (error) {
//         res.status(499).json({ error: String(error) });
//       }
//     });
    
//     // Test with binary data (image download)
//     baseTest.app.get('/test-undici-binary', async (req, res) => {
//       try {
//         const response = await undici.fetch('https://httpbin.org/image/png');
        
//         if (!response.ok) {
//           throw new Error(`HTTP error! status: ${response.status}`);
//         }
        
//         const buffer = Buffer.from(await response.arrayBuffer());
        
//         // Send the image back to the client
//         res.set('Content-Type', 'image/png');
//         res.send(buffer);
//       } catch (error) {
//         console.error(error);
//         res.status(500).json({ error: String(error) });
//       }
//     });
    
//     // Test with redirects
//     baseTest.app.get('/test-undici-redirects', async (req, res) => {
//       try {
//         const response = await undici.fetch('https://httpbin.org/redirect/2', {
//           redirect: 'follow'
//         });
        
//         const data = await response.json();
//         res.json(data);
//       } catch (error) {
//         res.status(500).json({ error: String(error) });
//       }
//     });
//   });
  
//   after(async function() {
//     await baseTest.teardown();
//   });
  
//   it('should track undici.request calls', async function() {
//     await request(baseTest.app).get('/test-undici-request').expect(200);
    
//     await baseTest.waitForDataPersistence();
    
//     const results = await baseTest.getHTTPResults();
    
//     const undiciRequest = results.find((r: HttpRequestData) => 
//       r.library === 'undici' && 
//       (r.pathname.includes('todos/1') || r.path?.includes('todos/1'))
//     );
    
//     // Test should fail if request is not found
//     expect(undiciRequest, 'Undici request not found').to.exist;
    
//     // Validate that the request conforms to our HttpRequestData interface
//     if (undiciRequest) {
//       baseTest.validateHttpRequestData(undiciRequest, {
//         expectedStatusCode: 200
//       });
//     }
//   });
  
//   it('should track fetch API calls', async function() {
//     await request(baseTest.app).get('/test-undici-fetch').expect(200);
    
//     await baseTest.waitForDataPersistence();
    
//     const results = await baseTest.getHTTPResults();
    
//     const fetchRequest = results.find((r: HttpRequestData) => 
//       r.library === 'undici-fetch' && 
//       (r.pathname.includes('posts/1') || r.path?.includes('posts/1'))
//     );
    
//     // Test should fail if request is not found
//     expect(fetchRequest, 'Undici fetch request not found').to.exist;
    
//     // Validate that the request conforms to our HttpRequestData interface
//     if (fetchRequest) {
//       baseTest.validateHttpRequestData(fetchRequest, {
//         expectedStatusCode: 200
//       });
//     }
//   });
  
//   it('should track POST requests with bodies', async function() {
//     await request(baseTest.app).get('/test-undici-post').expect(200);
    
//     await baseTest.waitForDataPersistence();
    
//     const results = await baseTest.getHTTPResults();
    
//     const postRequest = results.find((r: HttpRequestData) => 
//       (r.library === 'undici' || r.library === 'undici-fetch') && 
//       r.method === 'POST' && 
//       (r.pathname.includes('posts') || r.path?.includes('posts'))
//     );
    
//     // Test should fail if request is not found
//     expect(postRequest, 'Undici POST request not found').to.exist;
    
//     // Validate that the request conforms to our HttpRequestData interface
//     if (postRequest) {
//       baseTest.validateHttpRequestData(postRequest, {
//         expectedMethod: 'POST',
//         expectedStatusCode: 201 // JSONPlaceholder returns 201 for POST
//       });
//     }
//   });
  
//   it('should handle custom agents properly', async function() {
//     await request(baseTest.app).get('/test-undici-agent').expect(200);
    
//     await baseTest.waitForDataPersistence();
    
//     const results = await baseTest.getHTTPResults();
    
//     const agentRequest = results.find((r: HttpRequestData) => 
//       (r.library === 'undici' || r.library === 'undici-fetch') && 
//       (r.pathname.includes('users/1') || r.path?.includes('users/1'))
//     );
    
//     // Test should fail if request is not found
//     expect(agentRequest, 'Undici agent request not found').to.exist;
    
//     // Validate that the request conforms to our HttpRequestData interface
//     if (agentRequest) {
//       baseTest.validateHttpRequestData(agentRequest, {
//         expectedStatusCode: 200
//       });
//     }
//   });
  
//   it('should handle connection pools properly', async function() {
//     await request(baseTest.app).get('/test-undici-pool').expect(200);
    
//     await baseTest.waitForDataPersistence();
    
//     const results = await baseTest.getHTTPResults();
    
//     const poolRequest = results.find((r: HttpRequestData) => 
//       r.library === 'undici' && 
//       (r.pathname.includes('comments/1') || r.path?.includes('comments/1'))
//     );
    
//     // Test should fail if request is not found
//     expect(poolRequest, 'Undici pool request not found').to.exist;
    
//     // Validate that the request conforms to our HttpRequestData interface
//     if (poolRequest) {
//       baseTest.validateHttpRequestData(poolRequest, {
//         expectedStatusCode: 200
//       });
//     }
//   });
  
//   it('should handle request errors gracefully', async function() {
//     await request(baseTest.app).get('/test-undici-error').expect(500);
    
//     await baseTest.waitForDataPersistence();
    
//     const results = await baseTest.getHTTPResults();
    
//     const errorRequest = results.find((r: HttpRequestData) => 
//       (r.library === 'undici' || r.library === 'undici-fetch') && 
//       ((r.hostname === 'non-existent-domain-12345.com' || 
//         r.host === 'non-existent-domain-12345.com') ||
//        (r.error && r.error.message && 
//         r.error.message.includes('non-existent-domain-12345.com')))
//     );
    
//     // Test should fail if request is not found
//     expect(errorRequest, 'Undici error request not found').to.exist;
    
//     // Validate that the request conforms to our HttpRequestData interface
//     if (errorRequest) {
//       baseTest.validateHttpRequestData(errorRequest, {
//         expectError: true
//       });
//     }
//   });
  
//   it('should track aborted requests', async function() {
//     await request(baseTest.app).get('/test-undici-abort').expect(499);
    
//     await baseTest.waitForDataPersistence();
    
//     const results = await baseTest.getHTTPResults();
    
//     const abortedRequest = results.find((r: HttpRequestData) => 
//       (r.library === 'undici' || r.library === 'undici-fetch') && 
//       (r.pathname.includes('delay') || r.path?.includes('delay')) && 
//       r.error !== undefined && 
//       r.error.name === 'AbortError'
//     );  
    
//     // Test should fail if request is not found
//     expect(abortedRequest, 'Undici aborted request not found').to.exist;
    
//     // Validate that the request conforms to our HttpRequestData interface
//     if (abortedRequest) {
//       baseTest.validateHttpRequestData(abortedRequest, {
//         expectError: true,
//         expectedErrorType: 'AbortError',
//         aborted: true
//       });
//     }
//   });
  
//   it('should handle binary responses', async function() {
//     await request(baseTest.app).get('/test-undici-binary').expect(200);
    
//     await baseTest.waitForDataPersistence();
    
//     const results = await baseTest.getHTTPResults();
    
//     const binaryRequest = results.find((r: HttpRequestData) => 
//       (r.library === 'undici' || r.library === 'undici-fetch') && 
//       (r.pathname.includes('image/png') || r.path?.includes('image/png')) &&
//       r.isMedia === true
//     );
    
//     // Test should fail if request is not found
//     expect(binaryRequest, 'Undici binary request not found').to.exist;
    
//     // Validate that the request conforms to our HttpRequestData interface
//     if (binaryRequest) {
//       baseTest.validateHttpRequestData(binaryRequest, {
//         expectedStatusCode: 200,
//         expectMedia: true
//       });
//     }
//   });
  
//   it('should track redirected requests', async function() {
//     await request(baseTest.app).get('/test-undici-redirects').expect(200);
    
//     await baseTest.waitForDataPersistence();
    
//     const results = await baseTest.getHTTPResults();
    
//     const redirectRequest = results.find((r: HttpRequestData) => 
//       (r.library === 'undici' || r.library === 'undici-fetch') && 
//       (r.pathname.includes('redirect') || r.path?.includes('redirect'))
//     );
    
//     // Test should fail if request is not found
//     expect(redirectRequest, 'Undici redirect request not found').to.exist;
    
//     // Validate that the request conforms to our HttpRequestData interface
//     if (redirectRequest) {
//       baseTest.validateHttpRequestData(redirectRequest);
//     }
//   });
  
//   /**
//    * Add a new test specifically for validating the HttpRequestData interface
//    */
//   it('should return HTTP request data that conforms to the HttpRequestData interface', async function() {
//     await request(baseTest.app).get('/test-undici-request').expect(200);
    
//     await baseTest.waitForDataPersistence();
    
//     // Get the display data which uses our interface
//     const displayData = await baseTest.getHTTPDisplayData();
//     expect(displayData).to.be.an('array');
//     expect(displayData.length).to.be.greaterThan(0);
    
//     // Check that display data has the expected properties
//     const firstItem = displayData[0];
//     expect(firstItem).to.have.property('id');
//     expect(firstItem).to.have.property('method');
//     expect(firstItem).to.have.property('url');
//     expect(firstItem).to.have.property('statusCode');
//     expect(firstItem).to.have.property('duration');
//     expect(firstItem).to.have.property('size');
//     expect(firstItem).to.have.property('library');
    
//     // Get the detailed data for a specific request
//     if (firstItem && firstItem.id) {
//       const httpId = firstItem.id;
//       const detailedData = await baseTest.getHTTPDetails(httpId);
      
//       // Validate the detailed data against our interface
//       baseTest.validateHttpRequestData(detailedData);
//     }
//   });
// }); 