/** @format */

import { watchers } from "../logger";
import { getCallerInfo } from "../utils";
import { fileURLToPath } from 'url';

// Create a global symbol to track if fetch has been patched
const FETCH_PATCHED_SYMBOL = Symbol.for('node-observer:fetch-patched');

if (process.env.NODE_OBSERVATORY_HTTP && JSON.parse(process.env.NODE_OBSERVATORY_HTTP).includes("fetch")) {
// Check if fetch has already been patched
if (!(global as any)[FETCH_PATCHED_SYMBOL]) {
  // Mark fetch as patched
  (global as any)[FETCH_PATCHED_SYMBOL] = true;

  // Only patch if fetch exists
  // @ts-ignore
  if (typeof globalThis.fetch === 'function') {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async function patchedFetch(url, options = {}) {
      const startTime = performance.now();

      const req = new Request(url, options);
      const callerInfo = getCallerInfo(fileURLToPath(import.meta.url));

      // Parse URL
      const urlObj = new URL(req.url);
      
      // Create logging object with same structure as HTTP patcher
      const loggingObject: any = {
        hostname: urlObj.hostname,
        pathname: urlObj.pathname,
        path: urlObj.pathname + urlObj.search,
        href: urlObj.href,
        hash: urlObj.hash,
        host: urlObj.host,
        origin: urlObj.origin,
        search: urlObj.search,
        protocol: urlObj.protocol,
        method: req.method,
        // @ts-ignore
        headers: Object.fromEntries(req.headers.entries()) || {},
        library: 'fetch',
        file: callerInfo.file,
        line: callerInfo.line
      };

      try {
        const response = await originalFetch(url, options);
        
        // Create a proxy for the response methods that might consume the body
        const responseProxy = new Proxy(response, {
          get: function (target, prop) {
            // Handle special methods that consume the body
            if (prop === 'json' || prop === 'text' || prop === 'arrayBuffer' || prop === 'blob' || prop === 'formData') {
              const originalMethod = target[prop];
              
              return async function() {
                try {
                  // Clone the response to get the body without consuming the original
                  const clonedResponse = target.clone();
                  
                  // Get the body content for logging
                  const bodyText = await clonedResponse.text();
                  const responseBodySize = bodyText.length;
                  
                  // Update logging object
                  loggingObject.responseBodySize = responseBodySize;
                  
                  // Add response details to logging object
                  loggingObject.statusCode = target.status;
                  loggingObject.statusMessage = target.statusText || "OK";
                  // @ts-ignore
                  loggingObject.headers = Object.fromEntries(target.headers.entries()) || {};
                  loggingObject.duration = parseFloat((performance.now() - startTime).toFixed(2));
                  
                  // Check if response is media
                  const contentType = target.headers.get('content-type');
                  loggingObject.isMedia = contentType && 
                    (contentType.includes('image') || 
                     contentType.includes('video') || 
                     contentType.includes('audio'));
                  
                  watchers.http.addContent(loggingObject);
                  
                  // Call the original method
                  return originalMethod.apply(target);
                } catch (error) {
                  console.error('[Patch fetch] Error in fetch body method:', error);
                  return originalMethod.apply(target);
                }
              };
            }
            
            return target[prop as keyof Response];
          }
        });
        
        return responseProxy;
      } catch (error: any) {
        const duration = parseFloat((performance.now() - startTime).toFixed(2));

        // Add error details to logging object
        loggingObject.error = {
          name: error.name,
          message: error.message,
          stack: error.stack
        };
        loggingObject.statusCode = 500;
        loggingObject.statusMessage = error.message || "Error";
        loggingObject.duration = duration;
        loggingObject.aborted = error.name === 'AbortError';
        
        watchers.http.addContent(loggingObject);
        throw error;
      }
    };
  }
} else {
    console.log("[node-observer] Fetch API already patched, skipping");
  }
}
