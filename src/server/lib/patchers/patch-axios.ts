/** @format */

import { Hook } from "require-in-the-middle";
import shimmer from "shimmer";
import { watchers } from "../logger";
import { getCallerInfo } from "../utils";
import { URL } from "url";
import { fileURLToPath } from 'url';
// Create a global symbol to track if axios has been patched
const AXIOS_PATCHED_SYMBOL = Symbol.for('node-observer:axios-patched');

// Maximum size of request/response body to capture (1MB)
const MAX_BODY_SIZE = 1024 * 1024;

/**
 * Helper function to create a standardized logging object from axios request/response
 */
function createLoggingObject(config: any, response?: any, error?: any, startTime?: number) {
  // Capture stack trace for caller info
  const callerInfo = getCallerInfo(fileURLToPath(import.meta.url));
  
  // Parse URL
  let urlObj;
  try {
    urlObj = new URL(config.url, config.baseURL);
  } catch (e) {
    urlObj = {
      hostname: 'unknown',
      pathname: config.url || 'unknown',
      path: config.url || 'unknown',
      href: config.url || 'unknown',
      hash: '',
      host: 'unknown',
      origin: 'unknown',
      search: '',
      protocol: 'http:'
    };
  }
  
  // Create base logging object
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
    method: (config.method || 'get').toUpperCase(),
    headers: config.headers || {},
    library: 'axios',
    file: callerInfo.file,
    line: callerInfo.line
  };
  
  // Add request body if present
  if (config.data) {
    try {
      if (typeof config.data === 'string') {
        loggingObject.requestBody = config.data.substring(0, MAX_BODY_SIZE);
      } else if (Buffer.isBuffer(config.data)) {
        loggingObject.requestBody = config.data.toString('utf-8').substring(0, MAX_BODY_SIZE);
      } else {
        loggingObject.requestBody = JSON.stringify(config.data).substring(0, MAX_BODY_SIZE);
      }
      loggingObject.requestBodySize = loggingObject.requestBody.length;
    } catch (e) {
      loggingObject.requestBodyError = String(e);
    }
  }
  
  // Add response data if present
  if (response) {
    loggingObject.statusCode = response.status;
    loggingObject.statusMessage = response.statusText || "OK";
    loggingObject.headers = response.headers || {};
    
    // Calculate duration
    if (startTime) {
      loggingObject.duration = parseFloat((performance.now() - startTime).toFixed(2)) || 0;
    }
    
    // Add response body if present
    if (response.data) {
      try {
        if (typeof response.data === 'string') {
          loggingObject.responseBody = response.data.substring(0, MAX_BODY_SIZE);
        } else if (Buffer.isBuffer(response.data)) {
          loggingObject.responseBody = response.data.toString('utf-8').substring(0, MAX_BODY_SIZE);
        } else {
          loggingObject.responseBody = JSON.stringify(response.data).substring(0, MAX_BODY_SIZE);
        }
        loggingObject.responseBodySize = loggingObject.responseBody.length;
      } catch (e) {
        loggingObject.responseBodyError = String(e);
      }
    }
    
    // Check if response is media
    const contentType = response.headers && response.headers['content-type'];
    loggingObject.isMedia = contentType && 
      (contentType.includes('image') || contentType.includes('video') || contentType.includes('audio'));
    
    // Check if this is a redirect
    loggingObject.isRedirect = response.status >= 300 && response.status < 400;
    if (loggingObject.isRedirect && response.headers && response.headers.location) {
      loggingObject.redirectLocation = response.headers.location;
    }
  }
  
  // Add error details if present
  if (error) {
    loggingObject.error = {
      name: error.name,
      message: error.message,
      stack: error.stack,
      code: error.code
    };
    
    // If error has a response, add that data
    if (error.response) {
      loggingObject.statusCode = error.response.status;
      loggingObject.statusMessage = error.response.statusText || "Error";
      loggingObject.headers = error.response.headers || {};
      
      // Add response body from error if present
      if (error.response.data) {
        try {
          if (typeof error.response.data === 'string') {
            loggingObject.responseBody = error.response.data.substring(0, MAX_BODY_SIZE);
          } else if (Buffer.isBuffer(error.response.data)) {
            loggingObject.responseBody = error.response.data.toString('utf-8').substring(0, MAX_BODY_SIZE);
          } else {
            loggingObject.responseBody = JSON.stringify(error.response.data).substring(0, MAX_BODY_SIZE);
          }
          loggingObject.responseBodySize = loggingObject.responseBody.length;
        } catch (e) {
          loggingObject.responseBodyError = String(e);
        }
      }
    } else {
      // No response in error, use generic error status
      loggingObject.statusCode = error.status || 500;
      loggingObject.statusMessage = error.message || "Error";
    }
    
    // Check if request was aborted
    loggingObject.aborted = error.name === 'AbortError' || error.name === 'CanceledError';
  }
  
  // Calculate duration if not already set
  if (!loggingObject.duration && startTime) {
    loggingObject.duration = parseFloat((performance.now() - startTime).toFixed(2)) || 0;
  }
  
  return loggingObject;
}

/**
 * Helper function to patch a custom axios instance (returned by axios.create()).
 */
function patchAxiosInstance(instance: any) {
  // Patch instance.request
  if (typeof instance.request === "function") {
    shimmer.wrap(instance, "request", function (originalRequest: Function) {
      return function patchedRequest(
        this: any,
        configOrUrl: string | {},
        config?: {}
      ) {
        const startTime = performance.now();
        
        // Normalize config
        let requestConfig = typeof configOrUrl === 'string' 
          ? { url: configOrUrl, ...(config || {}) } 
          : configOrUrl;
        
        const result = originalRequest.apply(this, arguments);

        if (result && typeof result.then === "function") {
          result
            .then((response: any) => {
              const loggingObject = createLoggingObject(requestConfig, response, null, startTime);
              watchers.http.addContent(loggingObject);
              return response;
            })
            .catch((error: any) => {
              const loggingObject = createLoggingObject(requestConfig, null, error, startTime);
              watchers.http.addContent(loggingObject);
              throw error;
            });
        }

        return result;
      };
    });
    console.log("[Patch axios] instance.request method patched.");
  }

  // Patch instance.<method> (get, post, put, etc.)
  ["get", "post", "put", "patch", "delete", "head", "options"].forEach(
    (method) => {
      if (typeof instance[method] === "function") {
        shimmer.wrap(instance, method, function (originalMethod: Function) {
          return function patchedInstanceMethod(this: any, url: string, config?: any) {
            const startTime = performance.now();
            
            // Create config with method and url
            const requestConfig = {
              method,
              url,
              ...(config || {})
            };
            
            const result = originalMethod.apply(this, arguments);

            if (result && typeof result.then === "function") {
              result
                .then((response: any) => {
                  const loggingObject = createLoggingObject(requestConfig, response, null, startTime);
                  watchers.http.addContent(loggingObject);
                  return response;
                })
                .catch((error: any) => {
                  const loggingObject = createLoggingObject(requestConfig, null, error, startTime);
                  watchers.http.addContent(loggingObject);
                  throw error;
                });
            }

            return result;
          };
        });
        console.log(`[Patch axios] instance.${method} method patched.`);
      }
    }
  );
}

if (process.env.NODE_OBSERVATORY_HTTP && JSON.parse(process.env.NODE_OBSERVATORY_HTTP).includes("axios")) {
// Check if axios has already been patched
if (!(global as any)[AXIOS_PATCHED_SYMBOL]) {
  // Mark axios as patched
  (global as any)[AXIOS_PATCHED_SYMBOL] = true;

  // Intercepts any require("axios") call
  new Hook(["axios"], function (
    exports: any,
    name: string,
    basedir: string | undefined
  ) {
    //
    // Patch `axios.request`
    //
    if (typeof exports.request === "function") {
      shimmer.wrap(exports, "request", function (originalRequest: Function) {
        return function patchedRequest(
          this: any,
          configOrUrl: string | {},
          config?: {}
        ) {
          const startTime = performance.now();
          
          // Normalize config
          let requestConfig = typeof configOrUrl === 'string' 
            ? { url: configOrUrl, ...(config || {}) } 
            : configOrUrl;
          
          const result = originalRequest.apply(this, arguments);

          if (result && typeof result.then === "function") {
            result
              .then((response: any) => {
                const loggingObject = createLoggingObject(requestConfig, response, null, startTime);
                watchers.http.addContent(loggingObject);
                return response;
              })
              .catch((error: any) => {
                const loggingObject = createLoggingObject(requestConfig, null, error, startTime);
                watchers.http.addContent(loggingObject);
                throw error;
              });
          }

          return result;
        };
      });
      console.log("[Patch axios] axios.request method patched.");
    }

    //
    // Patch common convenience methods: get, post, put, patch, delete, head, options
    //
    ["get", "post", "put", "patch", "delete", "head", "options"].forEach(
      (method) => {
        if (typeof exports[method] === "function") {
          shimmer.wrap(exports, method, function (originalMethod: Function) {
            return function patchedMethod(this: any, url: string, config?: any) {
              const startTime = performance.now();
              
              // Create config with method and url
              const requestConfig = {
                method,
                url,
                ...(config || {})
              };
              
              const result = originalMethod.apply(this, arguments);

              if (result && typeof result.then === "function") {
                result
                  .then((response: any) => {
                    const loggingObject = createLoggingObject(requestConfig, response, null, startTime);
                    watchers.http.addContent(loggingObject);
                    return response;
                  })
                  .catch((error: any) => {
                    const loggingObject = createLoggingObject(requestConfig, null, error, startTime);
                    watchers.http.addContent(loggingObject);
                    throw error;
                  });
              }

              return result;
            };
          });
          console.log(`[Patch axios] axios.${method} method patched.`);
        }
      }
    );

    //
    // Patch axios.create if you use custom Axios instances
    //
    if (typeof exports.create === "function") {
      shimmer.wrap(exports, "create", function (originalCreate: Function) {
        return function patchedCreate(this: any, ...args: any[]) {
          const instance = originalCreate.apply(this, args);
          patchAxiosInstance(instance);
          console.log("[Patch axios] axios.create method patched.");
          return instance;
        };
      });
    }

    // Return the patched module so that subsequent require("axios") calls use it
    console.log("[node-observer] Axios successfully patched");
    return exports;
  });

  } else {
    console.log("[node-observer] Axios already patched, skipping");
  }
}
