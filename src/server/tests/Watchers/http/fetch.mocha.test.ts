// import { describe, it, before, after } from "mocha";
// import { expect } from "chai";
// import request from "supertest";
// import undici from 'undici';

// // Add polyfill for fetch if it's not available globally
// if (!global.fetch) {
//   console.log('Global fetch not available, using undici as polyfill');
//   // Try to use undici's fetch or undici as a fallback
//   // @ts-ignore
//   global.fetch = undici.fetch;
//   console.log('Using undici fetch');
// } else {
//   console.log('Using native global fetch');
// }

// import { HttpRequestData } from "../../../../../types";;
// import { BaseHTTPTest } from "./base-http";

// describe('Global Fetch API Tests', function (this: any) {
//   this.timeout(5000);
  
//   const baseTest = new BaseHTTPTest();

//   before(async function() {
//     await baseTest.setup();
    
//     // Basic fetch test
//     baseTest.app.get('/test-global-fetch', async (req, res) => {
//       try {
//         const response = await fetch('https://jsonplaceholder.typicode.com/todos/1');
//         const data = await response.json();
//         res.json(data);
//       } catch (error) {
//         console.error(error);
//         res.status(500).json({ error: String(error) });
//       }
//     });
    
//     // Test with POST request and request body
//     baseTest.app.get('/test-global-fetch-post', async (req, res) => {
//       try {
//         const postData = JSON.stringify({
//           title: 'foo',
//           body: 'bar',
//           userId: 1
//         });
        
//         const response = await fetch('https://jsonplaceholder.typicode.com/posts', {
//           method: 'POST',
//           headers: {
//             'Content-Type': 'application/json'
//           },
//           body: postData
//         });
        
//         const data = await response.json();
//         res.json(data);
//       } catch (error) {
//         console.error(error);
//         res.status(500).json({ error: String(error) });
//       }
//     });
    
//     // Test with error handling
//     baseTest.app.get('/test-global-fetch-error', async (req, res) => {
//       try {
//         await fetch('https://non-existent-domain-12345.com');
//         res.json({ success: true }); // This should not execute
//       } catch (error) {
//         console.error(error);
//         res.status(500).json({ error: String(error) });
//       }
//     });
    
//     // Test with abort controller
//     baseTest.app.get('/test-global-fetch-abort', async (req, res) => {
//       try {
//         const controller = new AbortController();
//         const { signal } = controller;
        
//         // Abort the request after 50ms
//         setTimeout(() => controller.abort(), 50);
        
//         await fetch('https://httpbin.org/delay/3', { signal });
//         res.json({ success: true }); // This should not execute
//       } catch (error) {
//         console.error(error);
//         res.status(499).json({ error: String(error) });
//       }
//     });
    
//     // Test with binary data (image download)
//     baseTest.app.get('/test-global-fetch-binary', async (req, res) => {
//       try {
//         const response = await fetch('https://httpbin.org/image/png');
        
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
//     baseTest.app.get('/test-global-fetch-redirects', async (req, res) => {
//       try {
//         const response = await fetch('https://httpbin.org/redirect/2');
//         const data = await response.json();
//         res.json(data);
//       } catch (error) {
//         console.error(error);
//         res.status(500).json({ error: String(error) });
//       }
//     });
//   });
  
//   after(async function() {
//     await baseTest.teardown();
//   });
  
//   it('should track global fetch API calls', async function() {
//     await request(baseTest.app).get('/test-global-fetch').expect(200);
    
//     await baseTest.waitForDataPersistence();
    
//     const results = await baseTest.getHTTPResults();
    
//     const fetchRequest = results.find((r: HttpRequestData) => 
//       (r.library === 'undici' || r.library === 'node-fetch') && r.pathname.includes('todos/1')
//     );
    
//     // Test should fail if request is not found
//     expect(fetchRequest, 'Fetch GET request not found').to.exist;
    
//     // Validate that the request conforms to our HttpRequestData interface
//     if (fetchRequest) {
//       baseTest.validateHttpRequestData(fetchRequest, {
//         expectedStatusCode: 200
//       });
//     }
//   });
  
//   it('should track POST requests with bodies', async function() {
//     await request(baseTest.app).get('/test-global-fetch-post').expect(200);
    
//     await baseTest.waitForDataPersistence();
    
//     const results = await baseTest.getHTTPResults();
    
//     const postRequest = results.find((r: HttpRequestData) => 
//       (r.library === 'undici' || r.library === 'node-fetch') && 
//       r.method === 'POST' && 
//       r.pathname.includes('posts')
//     );
    
//     // Test should fail if request is not found
//     expect(postRequest, 'Fetch POST request not found').to.exist;
    
//     // Validate that the request conforms to our HttpRequestData interface
//     if (postRequest) {
//       baseTest.validateHttpRequestData(postRequest, {
//         expectedMethod: 'POST',
//         expectedStatusCode: 201 // JSONPlaceholder returns 201 for POST
//       });
//     }
//   });
  
//   it('should handle request errors gracefully', async function() {
//     await request(baseTest.app).get('/test-global-fetch-error').expect(500);
    
//     await baseTest.waitForDataPersistence();
    
//     const results = await baseTest.getHTTPResults();
    
//     const errorRequest = results.find((r: HttpRequestData) => 
//       (r.hostname === 'non-existent-domain-12345.com' || 
//        r.host === 'non-existent-domain-12345.com') || 
//       (r.error && r.error.message && 
//        r.error.message.includes('non-existent-domain-12345.com'))
//     );
    
//     // Test should fail if request is not found
//     expect(errorRequest, 'Fetch error request not found').to.exist;
    
//     // Validate that the request conforms to our HttpRequestData interface
//     if (errorRequest) {
//       baseTest.validateHttpRequestData(errorRequest, {
//         expectError: true
//       });
//     }
//   });
  
//   it('should track aborted requests', async function() {
//     await request(baseTest.app).get('/test-global-fetch-abort').expect(499);
    
//     await baseTest.waitForDataPersistence();
    
//     const results = await baseTest.getHTTPResults();
    
//     const abortedRequest = results.find((r: HttpRequestData) => 
//       r.pathname.includes('delay') && 
//       r.error &&
//       r.error.name === 'AbortError' &&
//       (r.library === 'undici' || r.library === 'node-fetch')
//     );
    
//     // Test should fail if request is not found
//     expect(abortedRequest, 'Fetch aborted request not found').to.exist;
    
//     // Validate that the request conforms to our HttpRequestData interface
//     if (abortedRequest) {
//       baseTest.validateHttpRequestData(abortedRequest, {
//         expectError: true,
//         expectedErrorType: 'AbortError'
//       });
//     }
//   });
  
//   it('should handle binary responses', async function() {
//     await request(baseTest.app).get('/test-global-fetch-binary').expect(200);
    
//     await baseTest.waitForDataPersistence();
    
//     const results = await baseTest.getHTTPResults();
    
//     const binaryRequest = results.find((r: HttpRequestData) => 
//       r.pathname.includes('image/png') && 
//       (r.library === 'undici' || r.library === 'node-fetch')
//     );
    
//     // Test should fail if request is not found
//     expect(binaryRequest, 'Fetch binary request not found').to.exist;
    
//     // Validate that the request conforms to our HttpRequestData interface
//     if (binaryRequest) {
//       baseTest.validateHttpRequestData(binaryRequest, {
//         expectedStatusCode: 200,
//         expectMedia: true
//       });
//     }
//   });
  
//   it('should track redirected requests', async function() {
//     await request(baseTest.app).get('/test-global-fetch-redirects').expect(200);
    
//     await baseTest.waitForDataPersistence();
    
//     const results = await baseTest.getHTTPResults();
    
//     const redirectRequest = results.find((r: HttpRequestData) => 
//       r.pathname.includes('redirect') && 
//       (r.library === 'undici' || r.library === 'node-fetch')  
//     );
    
//     // Test should fail if request is not found
//     expect(redirectRequest, 'Fetch redirected request not found').to.exist;
    
//     // Validate that the request conforms to our HttpRequestData interface
//     if (redirectRequest) {
//       baseTest.validateHttpRequestData(redirectRequest);
//     }
//   });
  
//   /**
//    * Add a new test specifically for validating the HttpRequestData interface
//    */
//   it('should return HTTP request data that conforms to the HttpRequestData interface', async function() {
//     await request(baseTest.app).get('/test-global-fetch').expect(200);
    
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
