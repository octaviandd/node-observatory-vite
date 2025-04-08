// import { describe, it, before, after } from "mocha";
// import { expect } from "chai";
// import request from "supertest";

// import { BaseHTTPTest } from "./base-http";
// import ky from "ky";

// describe('Ky HTTP Client Tests', function(this: any) {
//   this.timeout(10000);
  
//   const baseTest = new BaseHTTPTest();
  
//   before(async function() {
//     await baseTest.setup();
    
//     // Basic ky request test
//     baseTest.app.get('/test-ky', async (req, res) => {
//       try {
//         const response = await ky.get('https://jsonplaceholder.typicode.com/todos/1').json();
//         res.json(response);
//       } catch (error) {
//         res.status(500).json({ error: String(error) });
//       }
//     });
    
//     // Test with POST request and request body
//     baseTest.app.get('/test-ky-post', async (req, res) => {
//       try {
//         const postData = {
//           title: 'foo',
//           body: 'bar',
//           userId: 1
//         };
        
//         const response = await ky.post(
//           'https://jsonplaceholder.typicode.com/posts', 
//           {
//             json: postData,
//             headers: {
//               'Content-Type': 'application/json'
//             }
//           }
//         ).json();
        
//         res.json(response);
//       } catch (error) {
//         res.status(500).json({ error: String(error) });
//       }
//     });
    
//     // Test with error handling
//     baseTest.app.get('/test-ky-error', async (req, res) => {
//       try {
//         await ky.get('https://non-existent-domain-12345.com').json();
//         res.json({ success: true }); // This should not execute
//       } catch (error) {
//         res.status(500).json({ error: String(error) });
//       }
//     });
    
//     // Test with abort controller
//     baseTest.app.get('/test-ky-abort', async (req, res) => {
//       try {
//         const controller = new AbortController();
        
//         // Abort the request after 50ms
//         setTimeout(() => controller.abort(), 50);
        
//         await ky.get('https://httpbin.org/delay/3', {
//           signal: controller.signal
//         }).json();
        
//         res.json({ success: true }); // This should not execute
//       } catch (error) {
//         res.status(499).json({ error: String(error) });
//       }
//     });
    
//     // Test with binary data (image download)
//     baseTest.app.get('/test-ky-binary', async (req, res) => {
//       try {
//         const response = await ky.get('https://httpbin.org/image/png').arrayBuffer();
        
//         // Send the image back to the client
//         res.set('Content-Type', 'image/png');
//         res.send(Buffer.from(response));
//       } catch (error) {
//         res.status(500).json({ error: String(error) });
//       }
//     });
    
//     // Test with redirects
//     baseTest.app.get('/test-ky-redirects', async (req, res) => {
//       try {
//         const response = await ky.get('https://httpbin.org/redirect/2').json();
//         res.json(response);
//       } catch (error) {
//         res.status(500).json({ error: String(error) });
//       }
//     });
    
//     // Test with custom instance
//     baseTest.app.get('/test-ky-instance', async (req, res) => {
//       try {
//         const instance = ky.create({
//           prefixUrl: 'https://jsonplaceholder.typicode.com',
//           timeout: 5000,
//           headers: {'X-Custom-Header': 'custom-value'}
//         });
        
//         const response = await instance.get('users/1').json();
//         res.json(response);
//       } catch (error) {
//         res.status(500).json({ error: String(error) });
//       }
//     });
//   });
  
//   after(async function() {
//     await baseTest.teardown();
//   });
  
//   it('should track ky GET requests', async function() {
//     await request(baseTest.app).get('/test-ky').expect(200);
    
//     await baseTest.waitForDataPersistence();
    
//     const results = await baseTest.getHTTPResults();

//     const kyRequest = results.find((r: any) => 
//       (r.content?.href?.includes('todos/1') || 
//       r.content?.path?.includes('todos/1') || 
//       r.content?.pathname?.includes('todos/1')) && 
//       r.content.library === 'ky'
//     );
    
//     expect(kyRequest).to.exist;
//     expect(kyRequest.content.statusCode).to.equal(200);
//   });
  
//   it('should track ky POST requests with bodies', async function() {
//     await request(baseTest.app).get('/test-ky-post').expect(200);
    
//     await baseTest.waitForDataPersistence();
    
//     const results = await baseTest.getHTTPResults();
    
//     const postRequest = results.find((r: any) => 
//       r.content.method === 'POST' && 
//       (r.content?.href?.includes('posts') ||
//       r.content?.path?.includes('posts') ||
//       r.content?.pathname?.includes('posts')) &&
//       r.content.library === 'ky'
//     );
    
//     expect(postRequest).to.exist;
//     expect(postRequest.content.method).to.equal('POST');
//     expect(postRequest.content.statusCode).to.equal(201); // JSONPlaceholder returns 201 for POST
//   });
  
//   it('should handle ky request errors gracefully', async function() {
//     await request(baseTest.app).get('/test-ky-error').expect(500);
    
//     await baseTest.waitForDataPersistence();
    
//     const results = await baseTest.getHTTPResults();
    
//     const errorRequest = results.find((r: any) => 
//       (r.content.hostname === 'non-existent-domain-12345.com' || 
//        r.content.host === 'non-existent-domain-12345.com') ||
//       (r.content.error && r.content.error.message && 
//        r.content.error.message.includes('non-existent-domain-12345.com')) &&
//       r.content.library === 'ky'
//     );
    
//     expect(errorRequest).to.exist;
//     expect(errorRequest.content.error).to.exist;
//   });
  
//   it('should track ky aborted requests', async function() {
//     await request(baseTest.app).get('/test-ky-abort').expect(499);
    
//     await baseTest.waitForDataPersistence();
    
//     const results = await baseTest.getHTTPResults();
    
//     const abortedRequest = results.find((r: any) => 
//       (r.content?.href?.includes('delay') || 
//       r.content?.path?.includes('delay') || 
//       r.content?.pathname?.includes('delay')) && 
//       r.content.error && 
//       r.content.error.name === 'AbortError' &&
//       r.content.library === 'ky'
//     );
    
//     expect(abortedRequest).to.exist;
//   });
  
//   it('should handle ky binary responses', async function() {
//     await request(baseTest.app).get('/test-ky-binary').expect(200);
    
//     await baseTest.waitForDataPersistence();
    
//     const results = await baseTest.getHTTPResults();
    
//     const binaryRequest = results.find((r: any) => 
//       (r.content?.href?.includes('image/png') || 
//       r.content?.path?.includes('image/png') || 
//       r.content?.pathname?.includes('image/png')) && 
//       r.content.library === 'ky'
//     );
    
//     expect(binaryRequest).to.exist;
//     expect(binaryRequest.content.statusCode).to.equal(200);
//   });
  
//   it('should track ky redirected requests', async function() {
//     await request(baseTest.app).get('/test-ky-redirects').expect(200);
    
//     await baseTest.waitForDataPersistence();
    
//     const results = await baseTest.getHTTPResults();
    
//     const redirectRequest = results.find((r: any) => 
//       (r.content?.href?.includes('redirect') || 
//       r.content?.path?.includes('redirect') || 
//       r.content?.pathname?.includes('redirect')) && 
//       r.content.library === 'ky'
//     );
    
//     expect(redirectRequest).to.exist;
//   });
  
//   it('should track requests from custom ky instances', async function() {
//     await request(baseTest.app).get('/test-ky-instance').expect(200);
    
//     await baseTest.waitForDataPersistence();
    
//     const results = await baseTest.getHTTPResults();
    
//     const instanceRequest = results.find((r: any) => 
//       r.content.href.includes('users/1') && 
//       r.content.headers && 
//       r.content.headers['x-custom-header'] === 'custom-value' &&
//       r.content.library === 'ky'
//     );
    
//     expect(instanceRequest).to.exist;
//     expect(instanceRequest.content.statusCode).to.equal(200);
//   });
// });
