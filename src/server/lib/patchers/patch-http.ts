/** @format */

import shimmer from "shimmer";
import http from "http";
import https from "https";
import { watchers } from "../logger";
import { getCallerInfo, getRequestInfo, httpRequestToRequestData } from "../utils";
import zlib from 'zlib';
import { fileURLToPath } from 'url';
// Create a global symbol to track if http has been patched
const HTTP_PATCHED_SYMBOL = Symbol.for('node-observer:http-patched');

// Maximum size of request/response body to capture (1MB)
const MAX_BODY_SIZE = 1024 * 1024;

const skipDomains = [
  'amazonaws.com',          // AWS services
  'api.sendgrid.com',      // SendGrid
  'api.mailgun.net',       // Mailgun
  'api.postmarkapp.com',   // Postmark
  'api.pusher.com',        // Pusher
  'api-eu.pusher.com',     // Pusher
  'ethereal.email',        // Nodemailer test
  'smtp.',                 // SMTP servers
  'rest.ably.io',          // Ably REST
  'realtime.ably.io',      // Ably Realtime
];

/**
 * Detects which HTTP library is being used based on the stack trace
 */
const detectLibrary = (defaultLibrary: string, stackLines: string[]) => {

  const libraries = [
    { pattern: "node_modules/axios", name: "axios" },
    { pattern: "node_modules/got", name: "got" },
    { pattern: "node_modules/node-fetch", name: "node-fetch" },
    { pattern: "node_modules/superagent", name: "superagent" },
    { pattern: "node_modules/phin", name: "phin" },
    { pattern: "node_modules/ky", name: "ky" },
    { pattern: "node_modules/needle", name: "needle" },
    { pattern: "node_modules/undici", name: "undici" },
  ];

  for (const line of stackLines) {
    for (const lib of libraries) {
      if (line.includes(lib.pattern)) {
        return lib.name;
      }
    }
  }

  return defaultLibrary; // Default if no library detected
}

const isInternalFrameworkRequest = (stackLines: string[]) => {
  const internalPatterns = [
    'node_modules/express',
    'node_modules/connect',
    'node_modules/koa',
    'node_modules/fastify',
    'node_modules/hapi',
    'node_modules/@hapi',
    'node_modules/restify',
    'node_modules/next',
    'node_modules/nuxt',
    'node_modules/apollo-server',
    'node_modules/graphql-http',
    'node_modules/socket.io',
    'node_modules/ws',
  ];

  return stackLines.some(line => 
    internalPatterns.some(pattern => line.includes(pattern))
  );
}

/**
 * Checks if a request should be skipped based on domain
 */
const shouldSkip = (options: any, scheme: string) => {
  const url = options.url || `${scheme}://${options.hostname || options.host || ""}${options.path || ""}`; 

  let host = options.hostname || options.host || "";

  if (
    host === 'localhost' || 
    host === '127.0.0.1' || 
    host === '::1' ||
    // Also check for other local references
    host === 'host.docker.internal' ||
    host.startsWith('192.168.') ||
    host.startsWith('10.') ||
    host.startsWith('172.16.') ||
    host.startsWith('172.17.') ||
    host.startsWith('172.18.') ||
    host.startsWith('172.19.') ||
    host.startsWith('172.20.') ||
    host.startsWith('172.21.') ||
    host.startsWith('172.22.') ||
    host.startsWith('172.23.') ||
    host.startsWith('172.24.') ||
    host.startsWith('172.25.') ||
    host.startsWith('172.26.') ||
    host.startsWith('172.27.') ||
    host.startsWith('172.28.') ||
    host.startsWith('172.29.') ||
    host.startsWith('172.30.') ||
    host.startsWith('172.31.')
  ) {
    return true;
  }

  return skipDomains.some(domain => {
    return (host || '').includes(domain)
  });
}

/**
 * Patches HTTP/HTTPS methods to capture request and response data
 */
function patchHttpMethod(module: typeof http | typeof https, methodName: 'request' | 'get', scheme: 'http' | 'https') {
  shimmer.wrap(module, methodName, function (original) {
    return function patchedMethod(this: any, ...args: any[]) {
      const start = performance.now();
      const argsCopy = [...args];
      let loggingObject: { [key: string]: any } = {};

      const stack = new Error().stack;
      const stackLines = stack?.split("\n") || [];
      const callerInfo = getCallerInfo(fileURLToPath(import.meta.url));


      // Try-catch block to handle URL parsing errors
      try {
        const options = argsCopy.shift() as URL | http.RequestOptions | string;
        const extraOptions =
            typeof argsCopy[0] === 'object' && (typeof options === 'string' || options instanceof URL)
              ? (argsCopy.shift() as http.RequestOptions)
            : undefined;


        const { optionsParsed, method, origin, pathname } = getRequestInfo(options, extraOptions);

        if (optionsParsed.agent) {
          delete optionsParsed.agent;
        }

        // @ts-ignore
        // Need to clean reccursive objects. I.e., redirects.
        if (optionsParsed.nativeProtocols) {
          // @ts-ignore
          delete optionsParsed.nativeProtocols;
        }

        if (shouldSkip(optionsParsed, scheme)) {
          return original.apply(this, (args as any));
        }

        loggingObject = { ...optionsParsed, method, origin, pathname };

        loggingObject.file = callerInfo.file;
        loggingObject.line = callerInfo.line;

        // Create the request with proper error handling
        let request: http.ClientRequest;
        try {
          request = original.apply(this, (args as any));
        } catch (error: any) {
          // Handle synchronous errors (like invalid URL format)
          console.error('Error creating request:', error);
          loggingObject.error = {
            name: error.name,
            message: error.message,
            stack: error.stack,
            code: error.code
          };
          loggingObject.duration = 0;

          watchers.http.addContent(loggingObject);
          throw error; // Re-throw to maintain original behavior
        }

        let requestBodyChunks: Buffer[] = [];
        let hasLogged = false;


        // Handle request errors
        request.on('error', (error: any) => {
          if (hasLogged) return; // Prevent duplicate logging
          hasLogged = true;

          loggingObject.error = {
            name: error.name,
            message: error.message,
            stack: error.stack,
            code: error.code // Network errors often have a code property
          };

          loggingObject.aborted = error.name === 'AbortError' || 
                                request.aborted === true ||
                                error.code === 'ABORT_ERR';

          loggingObject.duration = parseFloat((performance.now() - start).toFixed(2)) || 0;
          loggingObject.library = detectLibrary(request.protocol.split(':')[0], stackLines);

          watchers.http.addContent(loggingObject);
        });

        // Patch write method to capture request body
        const originalWrite = request.write;
        request.write = function (chunk: string | Buffer | Uint8Array, ...writeArgs: any[]) {
          if(chunk === undefined) {
            return originalWrite.apply(this, arguments as any);
          }
          if (Buffer.isBuffer(chunk)) {
            requestBodyChunks.push(chunk);
          } else if (typeof chunk === 'string') {
            requestBodyChunks.push(Buffer.from(chunk));
          } else if (chunk instanceof Uint8Array) {
            requestBodyChunks.push(Buffer.from(chunk));
          }

          return originalWrite.apply(this, arguments as any);
        }

        // Patch end method to finalize request body capture
        const originalEnd = request.end;
        request.end = function(...endArgs: any[]) {
          // Handle potential chunk in end() call
          if (endArgs.length > 0 && endArgs[0] !== null && endArgs[0] !== undefined) {
            const chunk = endArgs[0];
            if (Buffer.isBuffer(chunk)) {
              requestBodyChunks.push(chunk);
            } else if (typeof chunk === 'string') {
              requestBodyChunks.push(Buffer.from(chunk));
            } else if (chunk instanceof Uint8Array) {
              requestBodyChunks.push(Buffer.from(chunk));
            }
          }

          // @ts-ignore
          loggingObject.isRedirect = request?._redirectable?._isRedirect;

          if (requestBodyChunks.length > 0) {
            loggingObject.requestBodySize = Buffer.concat(requestBodyChunks).length;
            loggingObject.requestBody = Buffer.concat(requestBodyChunks).toString('utf-8');
          }

          return originalEnd.apply(this, arguments as any);
        }

        // Handle response
        request.prependListener('response', (res: http.IncomingMessage) => {
          if (hasLogged) return; // Skip if we've already logged an error
          let hasLoggedResponse = false;

          const callbackMap = new WeakMap();
          const chunks: Buffer[] = [];


          try {
            const originalOn = res.on;
            res.on = new Proxy(originalOn, {
              apply: (target, thisArg, args: any[]) => {

                // needle package makes use on events multiple times
                const [event, listener, ...restArgs] = args;

                if (event === 'data') {
                  const wrappedListener = new Proxy(listener, {
                    apply: (target, thisArg, args: any[]) => {
                      if(hasLoggedResponse) {
                        return Reflect.apply(target, thisArg, args);
                      }

                      let chunk = args[0];
                      try {
                        if(Buffer.isBuffer(chunk)) {
                          if (Buffer.concat(chunks).length < MAX_BODY_SIZE) {
                            chunks.push(chunk);
                          }
                        } else if (typeof chunk === 'string') {
                          chunks.push(Buffer.from(chunk));
                        }
                      } catch (error) {
                        console.error('Error capturing response data:', error);
                      }
                      return Reflect.apply(target, thisArg, args);
                    }
                  });

                  callbackMap.set(listener, wrappedListener);
                  return Reflect.apply(target, thisArg, [event, wrappedListener, ...restArgs]);
                }

                if (event === 'end') {
                  const wrappedListener = new Proxy(listener, {
                    apply: (target, thisArg, args: any[]) => {
                      if(hasLoggedResponse) {
                        return Reflect.apply(target, thisArg, args);
                      }

                      const contentEncoding = res.headers['content-encoding'];
                      let responseText = '';
                      try {
                        const responseBody = Buffer.concat(chunks);

                        if (contentEncoding) {
                          if (contentEncoding === 'gzip') {
                            responseText = zlib.gunzipSync(responseBody).toString('utf-8');
                          }
                        } else {
                          responseText = responseBody.toString('utf-8');
                        }

                        loggingObject.responseBodySize = responseBody.length;
                        loggingObject.statusCode = res.statusCode;
                        loggingObject.statusMessage = res.statusMessage;
                        loggingObject.headers = res.headers;
                        loggingObject.library = detectLibrary(request.protocol.split(':')[0], stackLines);
                        loggingObject.duration = parseFloat((performance.now() - start).toFixed(2)) || 0;
                        loggingObject.responseBody = responseText;
                        loggingObject.aborted = false;
                        loggingObject.error = undefined;
                        loggingObject.isMedia = res.headers['content-type']?.includes('image') || res.headers['content-type']?.includes('video') || res.headers['content-type']?.includes('audio');
                        loggingObject.redirectFrom = res.headers['x-previous-redirect-url'];

                        watchers.http.addContent(loggingObject);
                        hasLoggedResponse = true;
                      } catch (error) {
                        console.error('Error processing response:', error);
                      }
                      return Reflect.apply(target, thisArg, args);
                    }
                  });

                  callbackMap.set(listener, wrappedListener);
                  return Reflect.apply(target, thisArg, [event, wrappedListener, ...restArgs]);
                }

                return Reflect.apply(target, thisArg, args);
              }
            });

            if (typeof res.removeListener === 'function') {
              const originalRemoveListener = res.removeListener;
              res.removeListener = new Proxy(originalRemoveListener, {
                apply: (target, thisArg, args: any[]) => {
                  const [event, listener] = args;
                  const wrappedListener = callbackMap.get(listener);
                  if (wrappedListener) {
                    callbackMap.delete(listener);
                    return Reflect.apply(target, thisArg, [event, wrappedListener]);
                  }
                  return Reflect.apply(target, thisArg, args);
                }
              });
            }

            if (typeof res.off === 'function' && res.off !== res.removeListener) {
              const originalOff = res.off;
              res.off = new Proxy(originalOff, {
                apply: (target, thisArg, args: any[]) => {
                  const [event, listener] = args;
                  const wrappedListener = callbackMap.get(listener);
                  if (wrappedListener) {
                    callbackMap.delete(listener);
                    return Reflect.apply(target, thisArg, [event, wrappedListener]);
                  }
                  return Reflect.apply(target, thisArg, args);
                }
              });
            }

            // Add our own end listener to ensure we capture the response
            // even if the user doesn't listen for the end event
            const originalAddListener = res.addListener || res.on;
            let hasEndListener = false;

            // Check if there's already an end listener
            if (typeof res.listenerCount === 'function') {
              hasEndListener = res.listenerCount('end') > 0;
            }

            // If no end listener, add our own
            if (!hasEndListener) {
              originalAddListener.call(res, 'end', function() {
                try {
                  const responseBody = Buffer.concat(chunks);
                  loggingObject.responseBodySize = responseBody.length;
                  loggingObject.statusCode = res.statusCode;
                  loggingObject.statusMessage = res.statusMessage;
                  loggingObject.headers = res.headers;
                  loggingObject.library = detectLibrary(request.protocol.split(':')[0], stackLines);
                  loggingObject.duration = parseFloat((performance.now() - start).toFixed(2)) || 0;

                  // Log the complete request/response
                  watchers.http.addContent(loggingObject);
                  hasLoggedResponse = true;
                } catch (error) {
                  console.error('Error in fallback end listener:', error);
                }
              });
            }
          } catch (error) {
            console.error('Error patching response:', error);
          }
        });

        return request;
      } catch (error: any) {
        // Catch any errors that might occur during setup
        loggingObject.error = {
          name: error.name,
          message: error.message,
          stack: error.stack,
          code: error.code
        };
        loggingObject.duration = 0;
        watchers.http.addContent(loggingObject);
        throw error; // Re-throw to maintain original behavior
      }
    };
  });
}

/**
 * Patch incoming HTTP/HTTPS server requests
 */
function patchServerEmit(module: typeof http | typeof https) {
  shimmer.wrap(module.Server.prototype, 'emit', function (original) {
    return function patchedEmit(this: unknown, event: string, ...args: unknown[]) {
      if (event === 'request') {
        const req = args[0] as http.IncomingMessage;
        const res = args[1] as http.ServerResponse;
        
        if (req && res) {
          const startTime = performance.now();
          const ipAddress = (req as { ip?: string }).ip || req.socket?.remoteAddress;
          const normalizedRequest = httpRequestToRequestData(req);

          // Patch response.end to capture timing and status
          const originalEnd = res.end;
          res.end = function(...endArgs: any[]) {
            try {
              const duration = performance.now() - startTime;
              const statusCode = res.statusCode;
              
              // Log the server request
              watchers.requests.addContent({
                ...normalizedRequest,
                type: 'server',
                statusCode,
                duration,
                ipAddress,
              });
            } catch (error) {
              console.error('Error logging server request:', error);
            }
            
            return originalEnd.apply(this, endArgs as any);
          };
        }
      }
      
      return original.apply(this, [event, ...args] as any);
    };
  });
}

if (process.env.NODE_OBSERVATORY_HTTP && JSON.parse(process.env.NODE_OBSERVATORY_HTTP).includes("http")) {
// Check if http has already been patched
if (!(global as any)[HTTP_PATCHED_SYMBOL]) {
  // Mark http as patched
  (global as any)[HTTP_PATCHED_SYMBOL] = true;

  // Apply patches to HTTP methods
  patchHttpMethod(http, 'request', 'http');
  patchHttpMethod(http, 'get', 'http');

  // Apply patches to HTTPS methods
  patchHttpMethod(https, 'request', 'https');
  patchHttpMethod(https, 'get', 'https');

  // Patch server request handling
  // patchServerEmit(http);
  // patchServerEmit(https);

  console.log("[node-observer] HTTP/HTTPS successfully patched");
  } else {
    console.log("[node-observer] HTTP/HTTPS already patched, skipping");
  }
}
