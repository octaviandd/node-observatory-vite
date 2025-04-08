/** @format */

import { Hook } from "require-in-the-middle";
import shimmer from "shimmer";
import { watchers } from "../logger";
import { getCallerInfo } from "../utils";
import { fileURLToPath } from 'url';

// Create a global symbol to track if pusher has been patched
const PUSHER_PATCHED_SYMBOL = Symbol.for('node-observer:pusher-patched');

if (process.env.NODE_OBSERVATORY_NOTIFICATIONS && JSON.parse(process.env.NODE_OBSERVATORY_NOTIFICATIONS).includes("pusher")) {
  // Check if pusher has already been patched
  if (!(global as any)[PUSHER_PATCHED_SYMBOL]) {
    // Mark pusher as patched
    (global as any)[PUSHER_PATCHED_SYMBOL] = true;

    /**
     * Hook the "pusher" module so we can patch the prototype methods (like trigger/triggerBatch).
     */
    new Hook(["pusher"], function (exports, name, basedir) {
      if (exports && (exports as any).prototype) {
        // Patch pusher.trigger
        if (typeof (exports as any).prototype.trigger === "function") {
          shimmer.wrap(
            (exports as any).prototype,
            "trigger",
            function (originalTrigger) {
              return function patchedTrigger(
                this: any,
                channel: string,
                event: string,
                data: any,
                options: any,
                callback?: Function // Make callback optional
              ) {
                const startTime = performance.now();
                const callerInfo = getCallerInfo(fileURLToPath(import.meta.url));
                let hasLogged = false; // Flag to prevent double logging
              
                // Create a logging object to track this notification
                const loggingObject = {
                  method: "trigger",
                  channel,
                  event,
                  data,
                  options,
                  package: "pusher",
                  file: callerInfo.file,
                  line: callerInfo.line,
                };

                // If no callback is provided, use a dummy callback to ensure logging
                const wrappedCallback = (error: any, response: any) => {
                  if (hasLogged) return; // Skip if already logged
                
                  const endTime = performance.now();
                  hasLogged = true;

                  // Log the result of the notification
                  watchers.notifications.addContent({
                    ...loggingObject,
                    status: error ? "failed" : "completed", // Indicate success or failure
                    error: error ? error.message : null, // Log the error message if any
                    response, // Log the response from Pusher
                    duration: parseFloat((endTime - startTime).toFixed(2)), // Log the duration of the notification
                    file: callerInfo.file,
                    line: callerInfo.line,
                  });

                  // Call the original callback if provided
                  if (typeof callback === "function") {
                    callback(error, response);
                  }
                };

                try {
                  // Validate inputs before calling the original method
                  if (!channel || channel.trim() === '') {
                    const error = new Error('Invalid channel name: Channel cannot be empty');
                  
                    // Log the error immediately
                    hasLogged = true;
                    watchers.notifications.addContent({
                      ...loggingObject,
                      status: "failed",
                      error: error.message,
                      duration: parseFloat((performance.now() - startTime).toFixed(2)),
                      file: callerInfo.file,
                      line: callerInfo.line,
                    });
                  
                    // If there's a callback, call it with the error
                    if (typeof callback === "function") {
                      callback(error, null);
                      return null; // Return null as the original method would
                    }
                  
                    // If no callback, throw the error
                    throw error;
                  }
                
                  // Call the original trigger method with the wrapped callback
                  const result = originalTrigger.call(
                    this,
                    channel,
                    event,
                    data,
                    options,
                    wrappedCallback
                  );

                  // If the result is a Promise, handle it
                  if (result && typeof result.then === "function") {
                    return result
                      .then((response: any) => {
                        if (!hasLogged) {
                          wrappedCallback(null, response); // Log success
                        }
                        return response;
                      })
                      .catch((error: any) => {
                        if (!hasLogged) {
                          wrappedCallback(error, null); // Log failure
                        }
                        throw error;
                      });
                  }

                  return result;
                } catch (error: unknown) {
                  // Catch any synchronous errors from the original method
                  if (hasLogged) throw error; // Re-throw without logging again
                
                  const endTime = performance.now();
                  hasLogged = true;
                
                  // Log the error
                  watchers.notifications.addContent({
                    ...loggingObject,
                    status: "failed",
                    error: error instanceof Error ? error.message : String(error),
                    duration: parseFloat((endTime - startTime).toFixed(2))
                  });
                
                  // Re-throw the error
                  throw error;
                }
              };
            }
          );
          console.log("[Patch pusher] pusher.prototype.trigger patched");
        }

        // Patch pusher.triggerBatch with similar error handling
        if (typeof (exports as any).prototype.triggerBatch === "function") {
          shimmer.wrap(
            (exports as any).prototype,
            "triggerBatch",
            function (originalTriggerBatch) {
              return function patchedTriggerBatch(
                this: any,
                batch: { channel: string; event: string; data: any }[],
                callback?: Function // Make callback optional
              ) {
                const startTime = performance.now();
                const callerInfo = getCallerInfo(fileURLToPath(import.meta.url));
                let hasLogged = false; // Flag to prevent double logging
              
                // Create a logging object to track this batch notification
                const loggingObject = {
                  method: "triggerBatch",
                  batch,
                  package: "pusher",
                  file: callerInfo.file,
                  line: callerInfo.line,
                };

                // If no callback is provided, use a dummy callback to ensure logging
                const wrappedCallback = (error: any, response: any) => {
                  if (hasLogged) return; // Skip if already logged
                
                  const endTime = performance.now();
                  hasLogged = true;

                  // Log the result of the batch notification
                  watchers.notifications.addContent({
                    ...loggingObject,
                    status: error ? "failed" : "completed", // Indicate success or failure
                    error: error ? error.message : null, // Log the error message if any
                    response, // Log the response from Pusher
                    duration: parseFloat((endTime - startTime).toFixed(2)), // Log the duration of the notification
                    file: callerInfo.file,
                    line: callerInfo.line,
                  });

                  // Call the original callback if provided
                  if (typeof callback === "function") {
                    callback(error, response);
                  }
                };

                try {
                  // Validate batch before calling the original method
                  if (!batch || !Array.isArray(batch) || batch.length === 0) {
                    const error = new Error('Invalid batch: Batch cannot be empty');
                  
                    // Log the error immediately
                    hasLogged = true;
                    watchers.notifications.addContent({
                      ...loggingObject,
                      status: "failed",
                      error: error.message,
                      duration: parseFloat((performance.now() - startTime).toFixed(2)),
                      file: callerInfo.file,
                      line: callerInfo.line,
                    });
                  
                    // If there's a callback, call it with the error
                    if (typeof callback === "function") {
                      callback(error, null);
                      return null;
                    }
                  
                    // If no callback, throw the error
                    throw error;
                  }
                
                  // Check for invalid channels in the batch
                  for (const item of batch) {
                    if (!item.channel || item.channel.trim() === '') {
                      const error = new Error('Invalid channel name in batch: Channel cannot be empty');
                    
                      // Log the error immediately
                      hasLogged = true;
                      watchers.notifications.addContent({
                        ...loggingObject,
                        status: "failed",
                        error: error.message,
                        duration: parseFloat((performance.now() - startTime).toFixed(2)),
                        file: callerInfo.file,
                        line: callerInfo.line,
                      });
                    
                      // If there's a callback, call it with the error
                      if (typeof callback === "function") {
                        callback(error, null);
                        return null;
                      }
                    
                      // If no callback, throw the error
                      throw error;
                    }
                  }

                  // Call the original triggerBatch method with the wrapped callback
                  const result = originalTriggerBatch.call(
                    this,
                    batch,
                    wrappedCallback
                  );

                  // If the result is a Promise, handle it
                  if (result && typeof result.then === "function") {
                    return result
                      .then((response: any) => {
                        if (!hasLogged) {
                          wrappedCallback(null, response); // Log success
                        }
                        return response;
                      })
                      .catch((error: any) => {
                        if (!hasLogged) {
                          wrappedCallback(error, null); // Log failure
                        }
                        throw error;
                      });
                  }

                  return result;
                } catch (error: unknown) {
                  // Catch any synchronous errors from the original method
                  if (hasLogged) throw error; // Re-throw without logging again
                
                  const endTime = performance.now();
                  hasLogged = true;
                
                  // Log the error
                  watchers.notifications.addContent({
                    ...loggingObject,
                    status: "failed",
                    error: error instanceof Error ? error.message : String(error),
                    duration: parseFloat((endTime - startTime).toFixed(2)),
                    file: callerInfo.file,
                    line: callerInfo.line,
                  });
                
                  // Re-throw the error
                  throw error;
                }
              };
            }
          );
          console.log("[Patch pusher] pusher.prototype.triggerBatch patched");
        }
      } else {
        console.warn("[Patch pusher] Could not locate pusher.prototype to patch.");
      }
      console.log("[node-observer] Pusher successfully patched");
      return exports;
    });
  } else {
    console.log("[node-observer] Pusher already patched, skipping");
  }
}
