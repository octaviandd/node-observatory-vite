/** @format */

import { Hook } from "require-in-the-middle";
import shimmer from "shimmer";
import { watchers } from "../logger";
import { getCallerInfo } from "../utils";
import { PassThrough } from "stream";
import { fileURLToPath } from 'url';

const UNDICI_PATCHED_SYMBOL = Symbol.for('node-observer:undici-patched');

const MAX_BODY_SIZE = 1024 * 1024;

if (process.env.NODE_OBSERVATORY_HTTP && JSON.parse(process.env.NODE_OBSERVATORY_HTTP).includes("undici")) {
  if (!(global as any)[UNDICI_PATCHED_SYMBOL]) {
    (global as any)[UNDICI_PATCHED_SYMBOL] = true;

    new Hook(["undici"], function (exports: any, name, basedir) {
      if (!exports || typeof exports.request !== "function") {
        console.warn("[Patch undici] Could not locate request function to patch.");
        return exports;
      }

      shimmer.wrap(exports, "request", function (originalRequest) {
        return async function patchedRequest(
          this: any,
          url: string,
          options: any,
          ...args: any[]
        ) {
          const callerInfo = getCallerInfo(fileURLToPath(import.meta.url));

          const startTime = performance.now();
          let requestBodySize = 0;
          let responseBodySize = 0;

          let fullUrl = url;
          if (url.startsWith('/') && options?.dispatcher) {
            // Try to get the URL symbol
            const symbols = Object.getOwnPropertySymbols(options.dispatcher);
          
            // Look for any symbol that might contain a URL object with origin
            for (const sym of symbols) {
              const value = options.dispatcher[sym];
            
              // Check if the property value has an origin property (indicating it's likely a URL)
              if (value && typeof value === 'object' && 'origin' in value) {
                fullUrl = value.origin + url;
                break;
              }
            }
          }

          const urlObj = new URL(fullUrl);
        
          // Calculate request body size
          if (options?.body) {
            if (Buffer.isBuffer(options.body)) {
              requestBodySize = options.body.length;
            } else if (typeof options.body === 'string') {
              requestBodySize = Buffer.byteLength(options.body);
            } else if (options.body instanceof URLSearchParams) {
              requestBodySize = Buffer.byteLength(options.body.toString());
            } else if (options.body instanceof ArrayBuffer || ArrayBuffer.isView(options.body)) {
              requestBodySize = options.body.byteLength;
            }
          }


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
            method: options?.method || 'GET',
            headers: options?.headers || {},
            library: 'undici',
            file: callerInfo.file,
            line: callerInfo.line
          };

          // Add request body if available and not too large
          if (options?.body) {
            if (typeof options.body === 'string' && options.body.length <= MAX_BODY_SIZE) {
              loggingObject.requestBody = options.body;
            } else if (Buffer.isBuffer(options.body) && options.body.length <= MAX_BODY_SIZE) {
              loggingObject.requestBody = options.body.toString('utf-8');
            }
          }

          try {
            const originalResponse = await originalRequest.call(this, fullUrl, options, ...args);

            // Create a proxy for the response to track body consumption without consuming it ourselves
            const responseProxy = new Proxy(originalResponse, {
              get: function (target, prop) {
                // Special handling for body property
                if (prop === 'body') {
                  // If body is a readable stream, we need to track it
                  const originalBody = target.body;
                
                  if (originalBody && typeof originalBody.on === 'function') {
                    // Create a tracking mechanism for the body
                    const chunks: Buffer[] = [];
                    let totalSize = 0;
                  
                    // We'll use a PassThrough stream to track data without consuming it
                    const passthrough = new PassThrough();
                  
                    // Pipe the original body to our passthrough
                    originalBody.pipe(passthrough);
                  
                    // Track data chunks
                    passthrough.on('data', (chunk: Buffer) => {
                      totalSize += chunk.length;
                      if (Buffer.concat(chunks).length < MAX_BODY_SIZE) {
                        chunks.push(chunk);
                      }
                    });
                  
                    // When the stream ends, update our logging object
                    passthrough.on('end', () => {
                      responseBodySize = totalSize;
                      loggingObject.responseBodySize = totalSize;
                    
                      if (chunks.length > 0) {
                        try {
                          const responseBody = Buffer.concat(chunks);
                          if (responseBody.length <= MAX_BODY_SIZE) {
                            loggingObject.responseBody = responseBody.toString('utf-8');
                          }
                        } catch (error) {
                          console.error('[Patch undici] Error processing response body:', error);
                        }
                      }
                    
                      // Add response details to logging object
                      loggingObject.statusCode = target.statusCode;
                      loggingObject.statusMessage = target.statusText || "OK";
                      loggingObject.headers = target.headers;
                      loggingObject.duration = parseFloat((performance.now() - startTime).toFixed(2));
                    
                      // Check if response is media
                      const contentType = target.headers['content-type'];
                      loggingObject.isMedia = contentType &&
                        (contentType.includes('image') ||
                          contentType.includes('video') ||
                          contentType.includes('audio'));
                    
                      watchers.http.addContent(loggingObject);
                    });
                  
                    // Return the original body to not interfere with user code
                    return originalBody;
                  }
                
                  return originalBody;
                }
              
                return target[prop];
              }
            });
          
            // If there's no body to track, log immediately
            if (!responseProxy.body) {
              loggingObject.statusCode = responseProxy.statusCode;
              loggingObject.statusMessage = responseProxy.statusText || "OK";
              loggingObject.headers = responseProxy.headers;
              loggingObject.duration = parseFloat((performance.now() - startTime).toFixed(2));
              watchers.http.addContent(loggingObject);
            }
          
            return responseProxy;
          } catch (error: any) {
            const duration = parseFloat((performance.now() - startTime).toFixed(2));
            // Add error details to logging object
            loggingObject.error = {
              name: error.name,
              message: error.message,
              stack: error.stack,
              code: error.code
            };
            loggingObject.statusCode = error.statusCode || 500;
            loggingObject.statusMessage = error.message || "Error";
            loggingObject.duration = duration;
            loggingObject.aborted = error.name === 'AbortError';
          
            watchers.http.addContent(loggingObject);
            throw error;
          }
        };
      });

      // Patch the fetch function if it exists
      if (typeof exports.fetch === "function") {
        shimmer.wrap(exports, "fetch", function (originalFetch) {
          return async function patchedFetch(
            this: any,
            input: RequestInfo | URL,
            init?: RequestInit,
            ...args: any[]
          ) {
            const callerInfo = getCallerInfo(fileURLToPath(import.meta.url));

            const startTime = performance.now();
            let requestBodySize = 0;

            // Determine URL and create URL object
            let url: string;
            if (typeof input === 'string') {
              url = input;
            } else if (input instanceof URL) {
              url = input.toString();
            } else if ('url' in input) {
              // Request object
              url = input.url;
            } else {
              url = String(input);
            }
          
            const urlObj = new URL(url);

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
              method: init?.method || 'GET',
              headers: init?.headers || {},
              library: 'undici',
              file: callerInfo.file,
              line: callerInfo.line
            };

            // Calculate request body size if present
            if (init?.body) {
              if (Buffer.isBuffer(init.body)) {
                requestBodySize = init.body.length;
                if (init.body.length <= MAX_BODY_SIZE) {
                  loggingObject.requestBody = init.body.toString('utf-8');
                }
              } else if (typeof init.body === 'string') {
                requestBodySize = Buffer.byteLength(init.body);
                if (init.body.length <= MAX_BODY_SIZE) {
                  loggingObject.requestBody = init.body;
                }
              } else if (init.body instanceof URLSearchParams) {
                const bodyStr = init.body.toString();
                requestBodySize = Buffer.byteLength(bodyStr);
                if (requestBodySize <= MAX_BODY_SIZE) {
                  loggingObject.requestBody = bodyStr;
                }
              } else if (init.body instanceof ArrayBuffer || ArrayBuffer.isView(init.body)) {
                requestBodySize = init.body.byteLength;
              }
            }


            try {
              const originalResponse = await originalFetch.call(this, input, init, ...args);
            
              // Create a proxy for the response methods that might consume the body
              const responseProxy = new Proxy(originalResponse, {
                get: function (target, prop) {
                  // Handle special methods that consume the body
                  if (prop === 'json' || prop === 'text' || prop === 'arrayBuffer' || prop === 'blob' || prop === 'formData') {
                    const originalMethod = target[prop];
                  
                    return async function () {
                      try {
                        // Clone the response to get the body without consuming the original
                        const clonedResponse = target.clone();

                      
                        // Get the body content for logging
                        const bodyText = await clonedResponse.text();
                        const responseBodySize = bodyText.length;
                      
                        // Update logging object
                        loggingObject.responseBodySize = responseBodySize;
                        if (responseBodySize <= MAX_BODY_SIZE) {
                          loggingObject.responseBody = bodyText;
                        }
                      
                        // Add response details to logging object
                        loggingObject.statusCode = target.status;
                        loggingObject.statusMessage = target.statusText || "OK";
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
                        console.error('[Patch undici] Error in fetch body method:', error);
                        return originalMethod.apply(target);
                      }
                    };
                  }
                
                  return target[prop];
                }
              });
            
              return responseProxy;
            } catch (error: any) {
              const duration = parseFloat((performance.now() - startTime).toFixed(2));

              // Add error details to logging object
              loggingObject.error = {
                name: error.name,
                message: error.message,
                stack: error.stack,
                code: error.code
              };
              loggingObject.statusCode = error.status || 500;
              loggingObject.statusMessage = error.message || "Error";
              loggingObject.duration = duration;
              loggingObject.aborted = error.name === 'AbortError';
            
              watchers.http.addContent(loggingObject);
              throw error;
            }
          };
        });

        console.log("[Patch undici] Fetch API patched.");
      } else {
        console.log("[Patch undici] Fetch API not found, skipping patch.");
      }

      console.log("[Patch undici] Request handling patched.");
      return exports;
    });
  } else {
    console.log("[node-observer] Undici already patched, skipping");
  }
}