/** @format */

import { Hook } from "require-in-the-middle";
import shimmer from "shimmer";
import { watchers } from "../logger";
import { getCallerInfo } from "../utils";
import { fileURLToPath } from 'url';

// Create a global symbol to track if memjs has been patched
const MEMJS_PATCHED_SYMBOL = Symbol.for('node-observer:memjs-patched');

if (process.env.NODE_OBSERVATORY_CACHE && JSON.parse(process.env.NODE_OBSERVATORY_CACHE).includes("memjs")) {
  // Check if memjs has already been patched
  if (!(global as any)[MEMJS_PATCHED_SYMBOL]) {
    // Mark memjs as patched
    (global as any)[MEMJS_PATCHED_SYMBOL] = true;

    const MEMJS_METHODS = {
      get: "get",
      set: "set",
      delete: "delete",
      replace: "replace",
      increment: "increment",
      decrement: "decrement"
    };

    /**
     * Hook "memjs" to patch its cache operations.
     */
    new Hook(["memjs"], function (exports: any, name, basedir) {
      // `exports` is the MemJS client module.
      if (!exports || typeof exports.Client !== "function") {
        console.warn("[Patch memjs] Could not locate Client class to patch.");
        return exports;
      }

      // Patch the prototype methods instead of individual instances
      Object.entries(MEMJS_METHODS).forEach(([method, displayName]) => {
        if (typeof exports.Client.prototype[method] === "function") {
          shimmer.wrap(exports.Client.prototype, method, function (original) {
            return async function patched(this: any, key: string, ...args: any[]) {
              const callerInfo = getCallerInfo(fileURLToPath(import.meta.url));

              const logContent: { [key: string]: any } = {
                type: method,
                package: "memjs",
                file: callerInfo.file,
                line: callerInfo.line,
                key,
              };

              const startTime = performance.now();

              try {
                // Group 1: READ operations that can result in hits/misses
                if (method === "get") {
                  const result = await original.call(this, key, ...args);
                  const endTime = performance.now();
                
                  if (result === undefined) {
                    return result;
                  }

                  // Track hit or miss
                  const isHit = result && result.value !== undefined && result.value !== null;

                  logContent["hits"] = isHit ? 1 : 0;
                  logContent["misses"] = !isHit ? 1 : 0;
                  logContent["key"] = key;
                  if (isHit) {
                    logContent["value"] = result.value.toString('utf-8');
                  }
                
                  logContent["duration"] = parseFloat((endTime - startTime).toFixed(2));
                  watchers.cache.addContent(logContent);
                  return result;
                }
                // Group 2: WRITE operations
                else if (["set", "replace"].includes(method)) {
                  logContent["value"] = args[0];
                  if (args[1]) {
                    logContent["options"] = args[1];
                  }
                
                  const result = await original.call(this, key, ...args);
                  const endTime = performance.now();
                
                  logContent["writes"] = 1;
                  logContent["key"] = key;
                  logContent["duration"] = parseFloat((endTime - startTime).toFixed(2));
                  watchers.cache.addContent(logContent);
                  return result;
                }
                // Group 3: DELETE operations
                else if (method === "delete") {
                  const result = await original.call(this, key, ...args);
                  const endTime = performance.now();

                  if (result === undefined) {
                    return result;
                  }
                
                  logContent["writes"] = 1;
                  logContent["key"] = key;
                  logContent["duration"] = parseFloat((endTime - startTime).toFixed(2));
                  watchers.cache.addContent(logContent);
                  return result;
                }
                // Group 4: INCREMENT/DECREMENT operations
                else if (["increment", "decrement"].includes(method)) {
                  const result = await original.call(this, key, ...args);
                  const endTime = performance.now();

                  if (result === undefined) {
                    return result;
                  }

                  logContent["writes"] = 1;
                  logContent["key"] = key;
                  logContent["value"] = result.value;
                  logContent["duration"] = parseFloat((endTime - startTime).toFixed(2));
                  watchers.cache.addContent(logContent);
                  return result;
                }
                // Fallback for any other methods
                else {
                  const result = await original.call(this, key, ...args);
                  const endTime = performance.now();
                
                  logContent["duration"] = parseFloat((endTime - startTime).toFixed(2));
                  watchers.cache.addContent(logContent);
                  return result;
                }
              } catch (error: unknown) {
                const endTime = performance.now();
                logContent["duration"] = parseFloat((endTime - startTime).toFixed(2));
                logContent["error"] = error instanceof Error ? error.message : String(error);
                logContent["stack"] = error instanceof Error ? error.stack : String(error);
                watchers.cache.addContent(logContent);
                throw error;
              }
            };
          });
        }
      });

      console.log("[node-observer] Memjs successfully patched");
      return exports;
    });
  } else {
    console.log("[node-observer] Memjs already patched, skipping");
  }
}