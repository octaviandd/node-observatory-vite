/** @format */

// Essential imports for patching and types
import { Hook } from "require-in-the-middle";
import shimmer from "shimmer";
import type {
    Request as ExpressRequest,
    Response as ExpressResponse,
    NextFunction,
} from "express";
import { v4 as uuidv4 } from "uuid";
import path from "path";

// Imports for application-specific logic (Assume these exist)
import { watchers } from "../logger"; // Your logging mechanism
import { requestLocalStorage } from "./store"; // Your AsyncLocalStorage instance

// Symbol to prevent double patching
const EXPRESS_PATCHED_SYMBOL = Symbol.for('node-observer:express-patched');
const MAX_PAYLOAD_SIZE = 1024 * 50; // 50KB


// --- Main Patching Logic ---

if (!(global as any)[EXPRESS_PATCHED_SYMBOL]) {
    (global as any)[EXPRESS_PATCHED_SYMBOL] = true;

    console.log("[node-observer] Attempting to patch Express...");

    new Hook(["express"], function (exports: any, name, basedir) {
        // Pre-checks for essential Express exports
        if (!exports?.application?.handle) {
            console.error("[node-observer] Express 'application.handle' not found. Patching failed.");
            return exports;
        }
        if (!exports?.response) {
            console.error("[node-observer] Express 'response' (prototype) not found. Cannot patch response methods.");
            return exports;
        }

        // --- Patch 1: Central Request Handling Entry Point ---
        // Wraps the main request handler to set up context, start timers, and patch instance-specific methods.
        shimmer.wrap(exports.application, "handle", function (originalAppHandle) {
            return function wrappedAppHandle(this: any, req: ExpressRequest, res: ExpressResponse, next: NextFunction) {
                // Skip internal/observatory requests and other specific cases like SSE if needed

                if (req.url && (req.url.includes("observatory-api"))) {
                    return originalAppHandle.call(this, req, res, next);
                }
                const isSSEConnection = 
                    res.getHeader('Content-Type') === 'text/event-stream' ||
                    (req.headers.accept && req.headers.accept.includes('text/event-stream')) ||
                    res.getHeader('Cache-Control') === 'no-transform';
                
                 if (isSSEConnection) {
                    return originalAppHandle.call(this, req, res, next);
                }
                // Avoid re-entering ALS if somehow already inside (defensive check)
                if (requestLocalStorage.getStore()) {
                     return originalAppHandle.call(this, req, res, next);
                }


                // --- Start of Request Context ---
                return requestLocalStorage.run(new Map(), () => {
                    const store = requestLocalStorage.getStore()!; // Store is guaranteed inside .run
                    const requestId = uuidv4();
                    const startTime = performance.now();

                    // Initialize request-specific data in the store
                    store.set("requestId", requestId);
                    store.set("startTime", startTime);
                    store.set("payload", ''); // Captured request body
                    store.set("totalWrittenBytes", 0); // Accumulated response size via write/send
                    store.set("responseSizeMeasuredBySend", false); // Flag if send() determined initial size
                    store.set("logged", false); // Flag to prevent double logging



                    // --- Request Payload Capture ---
                    const originalReqOn = req.on;
                    req.on = function (event, listener) {
                        if (event === 'data' && (store.get("payload").length || 0) < MAX_PAYLOAD_SIZE) {
                            // Wrap the data listener to capture payload
                            return originalReqOn.call(this, event, (chunk: any) => {
                                const currentStore = requestLocalStorage.getStore();
                                if (currentStore) {
                                    let currentPayload = currentStore.get("payload") || '';
                                    if (chunk) {
                                        try {
                                            if (Buffer.isBuffer(chunk)) {
                                                currentPayload += chunk.toString('utf8');
                                            } else if (typeof chunk === 'string') {
                                                currentPayload += chunk;
                                            } else {
                                                currentPayload += JSON.stringify(chunk); // Best effort for objects
                                            }
                                            // Optional: Add payload size limit here
                                            currentStore.set("payload", currentPayload);
                                        } catch (e) {
                                            currentPayload += '[Error converting chunk]';
                                            currentStore.set("payload", currentPayload); // Store error indicator
                                        }
                                    }
                                }
                                listener(chunk); // Call original listener
                            });
                        } else {
                            // For other events, call original 'on' directly
                            return originalReqOn.call(this, event, listener);
                        }
                    };


                    // --- Response Size Capture & Final Logging (Instance Methods) ---
                    const originalResWrite = res.write;
                    const originalResEnd = res.end;

                    // Wrap res.write to accumulate size
                    res.write = function(this: ExpressResponse, chunk: any, encoding?: BufferEncoding | ((error: Error | null | undefined) => void), callback?: ((error: Error | null | undefined) => void)): boolean {
                        const currentStore = requestLocalStorage.getStore();
                        if (currentStore) {
                             let currentTotalBytes = currentStore.get("totalWrittenBytes") || 0;
                             try {
                                 const size = Buffer.byteLength(
                                     typeof chunk === "string" ? chunk :
                                     Buffer.isBuffer(chunk) ? chunk :
                                     JSON.stringify(chunk || {}), // Best effort
                                     typeof encoding === 'string' ? encoding : 'utf8'
                                 );
                                 currentTotalBytes += size;
                                 currentStore.set("totalWrittenBytes", currentTotalBytes);
                             } catch (e) { /* Ignore size calculation errors */ }
                        }
                         // Call original write
                        return originalResWrite.call(this, chunk, encoding as BufferEncoding, callback as () => void);
                    };

                    // Wrap res.end to perform final logging
                    res.end = function(this: ExpressResponse, chunk?: any, encoding?: BufferEncoding | ((error: Error | null | undefined) => void), callback?: ((error: Error | null | undefined) => void)): ExpressResponse {
                        const finalStore = requestLocalStorage.getStore();

                        // Ensure logging happens only once per request
                        if (finalStore && !finalStore.get("logged")) {
                            finalStore.set("logged", true); // Mark as logged

                            const endTime = performance.now();
                            const storedStartTime = finalStore.get("startTime") || endTime; // Fallback
                            const finalPayload = finalStore.get("payload") || '';
                            let finalResponseSize = finalStore.get("totalWrittenBytes") || 0;
                            const wasSendUsed = finalStore.get("responseSizeMeasuredBySend") || false;
                            const storedRequestId = finalStore.get("requestId") || 'unknown';

                             // Final size calculation based on end chunk and previous writes/sends
                            let endChunkSize = 0;
                            if (chunk) {
                                try {
                                     endChunkSize = Buffer.byteLength(
                                         typeof chunk === "string" ? chunk :
                                         Buffer.isBuffer(chunk) ? chunk :
                                         JSON.stringify(chunk || {}),
                                         typeof encoding === 'string' ? encoding : 'utf8'
                                     );
                                } catch (e) { /* Ignore errors */ }
                            }

                             // If nothing was written/sent before, use end chunk size
                             if (finalResponseSize === 0 && !wasSendUsed) {
                                 finalResponseSize = endChunkSize;
                             }
                             // If writes/sends happened before, ADD end chunk size
                             else if (endChunkSize > 0) {
                                 finalResponseSize += endChunkSize;
                             }

                            // --- Construct the Final Log Entry ---
                            const logContent: { [key: string]: any } = {
                                method: req.method?.toLowerCase(),
                                route: req.originalUrl || req.url,
                                statusCode: res.statusCode,
                                duration: (endTime - storedStartTime).toFixed(2),
                                requestSize: parseFloat(req.headers['content-length'] || '0'),
                                responseSize: finalResponseSize,
                                payload: finalPayload, // Include captured request body
                                headers: req.headers, // Request headers
                                query: req.query,
                                params: req.params, // Populated by Express routing
                                ip: req.ip,
                                memoryUsage: process.memoryUsage(), // Snapshot at end
                                //@ts-ignore Add session if available
                                session: req.session || {},
                                package: "express",
                            };

                            // Add error details if an error handler put them in res.locals
                            if (res.locals?.error instanceof Error) {
                                logContent.error = {
                                    message: res.locals.error.message,
                                    name: res.locals.error.name,
                                    stack: res.locals.error.stack
                                }
                                // Ensure status code reflects error if not already set
                                if (logContent.statusCode < 400) {
                                     logContent.statusCode = 500; // Default server error
                                }
                            }

                            // Send to your logging system
                            if (watchers?.requests) {
                                watchers.requests.addContent(logContent);
                            } else {
                                console.warn("[node-observer] 'watchers.requests' not available for logging.");
                            }
                        }

                        // Call the original res.end
                        return originalResEnd.call(this, chunk, encoding as BufferEncoding, callback as () => void);
                    };


                    // --- Execute Original Request Handler Chain ---
                    try {
                        // This call allows Express to set up the response prototype, run middleware, etc.
                        return originalAppHandle.call(this, req, res, next);
                    } catch (error: any) {
                        // --- Synchronous Error Handling ---
                        // Catch errors thrown directly during middleware/route execution BEFORE res.end
                        const errorStore = requestLocalStorage.getStore();
                        if (errorStore && !errorStore.get("logged")) { // Check if not already logged
                            errorStore.set("logged", true);
                            const errorEndTime = performance.now();
                            const storedStartTime = errorStore.get("startTime") || errorEndTime;

                            const errorLogContent: { [key: string]: any } = {
                                method: req.method?.toLowerCase(),
                                route: req.originalUrl || req.url,
                                statusCode: res.statusCode >= 400 ? res.statusCode : 500, // Use 500 default
                                duration: (errorEndTime - storedStartTime).toFixed(2),
                                headers: req.headers,
                                query: req.query,
                                params: req.params,
                                ip: req.ip,
                                payload: errorStore.get("payload") || '', // Log captured payload on error too
                                error: {
                                    message: error.message,
                                    name: error.name,
                                    stack: error.stack
                                },
                                memoryUsage: process.memoryUsage(),
                                package: "express",
                             };

                             if (watchers?.requests) {
                                watchers.requests.addContent(errorLogContent);
                             } else {
                                 console.warn("[node-observer] 'watchers.requests' not available for error logging.");
                             }
                        }
                        // Crucially, let Express handle the error flow
                        next(error);
                    }
                }); // End of requestLocalStorage.run
            }; // End of wrappedAppHandle
        }); // End of shimmer.wrap for app.handle


        // --- Patch 2: View Rendering (On Prototype) ---
        if (exports.response && typeof exports.response.render === "function") {
            shimmer.wrap(exports.response, "render", function (originalRender: Function) {
                return function patchedRender(this: ExpressResponse, view: string, options?: object | ((err: Error, html: string) => void), callback?: (err: Error, html: string) => void) {
                    const renderStartTime = performance.now();
                    const renderStore = requestLocalStorage.getStore(); // Get context for requestId

                    // Handle arguments flexibility (options is optional)
                    let actualOptions: object | undefined = typeof options === 'object' ? options : undefined;
                    let actualCallback: ((err: Error, html: string) => void) | undefined = 
                        typeof options === 'function' ? (options as (err: Error, html: string) => void) : 
                        callback as ((err: Error, html: string) => void) | undefined;

                    const wrappedCallback = (err: any, html: string) => {
                        const duration = (performance.now() - renderStartTime).toFixed(2);
                        const size = html ? Buffer.byteLength(html, "utf8") : 0;

                        // Resolve view details
                        let extension = path.extname(view);
                        const viewEngine = this.req?.app?.get("view engine");
                        if (!extension && viewEngine) {
                            extension = "." + viewEngine;
                        }
                        const viewName = !view.endsWith(extension) && extension ? view + extension : view;
                        const packageType = viewEngine || 'unknown'; // e.g., 'pug', 'ejs'
                        const viewCacheEnabled = this.req?.app?.enabled('view cache') || false;

                        // Check if logging for this view type is enabled (example condition)
                        const logViewEnabled = process.env.NODE_OBSERVATORY_VIEWS?.includes(packageType);

                        if (logViewEnabled && watchers?.view) {
                             watchers.view.addContent({
                                view: viewName,
                                options: actualOptions, // Log options passed to render
                                duration,
                                size,
                                status: !err ? "completed" : "failed",
                                error: err ? { message: err.message, name: err.name } : null,
                                package: packageType,
                                cacheInfo: {
                                    cacheEnabled: viewCacheEnabled,
                                    // Note: Cache hit/miss status usually requires patching the view engine itself
                                }
                             });
                        } else if (logViewEnabled) {
                             console.warn("[node-observer] 'watchers.view' not available for logging view:", viewName);
                        }

                        // Execute original callback or proceed with response flow
                        if (typeof actualCallback === "function") {
                            return actualCallback(err, html);
                        } else {
                            if (err) {
                                return this.req?.next?.(err); // Pass error to Express error handlers
                            } else {
                                // If no callback, 'render' normally sends the response itself
                                return this.send(html);
                            }
                        }
                    };

                    // Call the original render with the wrapped callback
                    return originalRender.call(this, view, actualOptions, wrappedCallback);
                };
            });
        } else {
            console.warn("[node-observer] Express 'response.render' not found. Skipping view patch.");
        }
        // --- Patch 3: Response Sending (On Prototype) ---
        // Patches response.send to capture size if res.write wasn't used first
        if (exports.response && typeof exports.response.send === "function") {
            shimmer.wrap(exports.response, "send", function(originalSend) {
                return function wrappedSend(this: ExpressResponse, body: any) {
                    const store = requestLocalStorage.getStore();
                    if (store) {
                        let currentTotalBytes = store.get("totalWrittenBytes") || 0;
                        // Only measure 'send' body size if 'write' hasn't already started accumulating
                        if (currentTotalBytes === 0) {
                            store.set("responseSizeMeasuredBySend", true); // Mark that send initiated size measurement
                            try {
                                currentTotalBytes = Buffer.byteLength(
                                    typeof body === "string" ? body : JSON.stringify(body || {}),
                                    "utf8"
                                );
                                store.set("totalWrittenBytes", currentTotalBytes);
                            } catch (e) {
                                store.set("totalWrittenBytes", 0); // Reset on error
                            }
                        }
                        // If write WAS used, size is already being tracked; 'send' often just calls 'end'
                    }

                    // Call the original send function
                    return originalSend.call(this, body);
                };
            });
        } else {
            console.warn("[node-observer] Express 'response.send' not found. Skipping patch.");
        }


        console.log("[node-observer] Express instrumentation applied successfully.");
        return exports; // IMPORTANT: Return exports to allow Express to load normally
    });

} else {
    console.log("[node-observer] Express already patched, skipping.");
}