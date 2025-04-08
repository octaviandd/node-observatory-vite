/** @format */

import { Hook } from "require-in-the-middle";
import shimmer from "shimmer";
import { watchers } from "../logger";
import { nodeCacheCommandsArgs } from "../constants";
import { getCallerInfo } from "../utils";
import { fileURLToPath } from 'url';

// Create a global symbol to track if node-cache has been patched
const NODECACHE_PATCHED_SYMBOL = Symbol.for('node-observer:nodecache-patched');

if (process.env.NODE_OBSERVATORY_CACHE && JSON.parse(process.env.NODE_OBSERVATORY_CACHE).includes("node-cache")) {
  // Check if node-cache has already been patched
  if (!(global as any)[NODECACHE_PATCHED_SYMBOL]) {
    // Mark node-cache as patched
    (global as any)[NODECACHE_PATCHED_SYMBOL] = true;

    new Hook(["node-cache"], function (exports, name, basedir) {
      // `exports` is the NodeCache constructor (class).
      // e.g., const NodeCache = require("node-cache");
      // We will patch the prototype methods so that new NodeCache() instances are patched.

      Object.keys(nodeCacheCommandsArgs).forEach((method) => {
        if (typeof (exports as any).prototype[method] === "function") {
          shimmer.wrap((exports as any).prototype, method, function (originalFn) {
            return function patchedMethod(this: any, ...args: any[]) {
              const callerInfo = getCallerInfo(fileURLToPath(import.meta.url));

              const logContent: { [key: string]: any } = {
                type: method,
                package: "node-cache",
                file: callerInfo.file,
                line: callerInfo.line
              };

              const startTime = performance.now();

              try {
                // Group 1: READ operations that can result in hits/misses
                if (["get", "has", "take"].includes(method)) {
                  const result = originalFn.apply(this, args);
                  const endTime = performance.now();

                  // Track hit or miss
                  const isHit = result !== undefined && result !== null && result !== false;
                  logContent["hits"] = isHit ? 1 : 0;
                  logContent["misses"] = !isHit ? 1 : 0;
                  logContent["key"] = args[0];

                  if (method === "get" || method === "take") {
                    logContent["value"] = result;
                  }

                  logContent["duration"] = parseFloat((endTime - startTime).toFixed(2));
                  watchers.cache.addContent(logContent);
                  return result;
                }
                // Group 2: Multi-read operations
                // else if (method === "mget") {
                //   const result = originalFn.apply(this, args);
                //   const endTime = performance.now();
                
                //   const keys = Array.isArray(args[0]) ? args[0] : [args[0]];
                //   const hitKeys = Object.keys(result);
                //   const hitCount = hitKeys.length;
                //   const missCount = keys.length - hitCount;
                
                //   logContent["hits"] = hitCount;
                //   logContent["misses"] = missCount;
                //   logContent["duration"] = parseFloat((endTime - startTime).toFixed(2));
                
                //   watchers.cache.addContent(logContent);
                //   return result;
                // }
                // Group 3: WRITE operations
                else if (["set", "mset"].includes(method)) {
                  const result = originalFn.apply(this, args);
                  const endTime = performance.now();
                
                  if (method === "set") {
                    logContent["writes"] = 1;
                    logContent["key"] = args[0];
                    logContent["value"] = args[1];
                  } else {
                    // // For mset, count the number of keys in the object
                    // logContent["writes"] = args[0].length;
                    // logContent["keys"] = args[0].map((item: any) => item.key);
                  }
                
                  logContent["duration"] = parseFloat((endTime - startTime).toFixed(2));
                  watchers.cache.addContent(logContent);
                  return result;
                }
                // Group 4: DELETE operations
                else if (["del", "flushAll"].includes(method)) {
                  const result = originalFn.apply(this, args);
                  const endTime = performance.now();

                  if (method === "del") {
                    // del can take a single key or an array of keys
                    if (Array.isArray(args[0])) {
                      // logContent["writes"] = args[0].length;
                    } else {
                      logContent["writes"] = 1;
                      logContent["key"] = args[0];
                    }
                  } else if (method === "flushAll") {
                    // flushAll clears the entire cache
                    // logContent["writes"] = 1; // We don't know how many keys were deleted
                  }
                
                  logContent["duration"] = parseFloat((endTime - startTime).toFixed(2));
                  watchers.cache.addContent(logContent);
                  return result;
                }
                // Fallback for any other methods
                else {
                  const result = originalFn.apply(this, args);
                  const endTime = performance.now();
                
                  logContent["duration"] = parseFloat((endTime - startTime).toFixed(2));
                  watchers.cache.addContent(logContent);
                  return result;
                }
              } catch (error: unknown) {
                // Log errors
                logContent["error"] = error instanceof Error ? error.message : String(error);
                logContent["stack"] = error instanceof Error ? error.stack : String(error);
                watchers.cache.addContent(logContent);
                throw error;
              }
            };
          });
        }
      });
      console.log("[node-observer] node-cache successfully patched");
      return exports;
    });
  } else {
    console.log("[node-observer] node-cache already patched, skipping");
  }
}