/** @format */

import { Hook } from "require-in-the-middle";
import shimmer from "shimmer";
import { watchers } from "../logger";
import { getCallerInfo } from "../utils";
import { LRUCacheCommandArgsMapping } from "../constants";
import { fileURLToPath } from 'url';

// Create a global symbol to track if lrucache has been patched
const LRUCACHE_PATCHED_SYMBOL = Symbol.for('node-observer:lrucache-patched');

if (process.env.NODE_OBSERVATORY_CACHE && JSON.parse(process.env.NODE_OBSERVATORY_CACHE).includes("lru-cache")) {
  // Check if lrucache has already been patched
  if (!(global as any)[LRUCACHE_PATCHED_SYMBOL]) {
    // Mark lrucache as patched
    (global as any)[LRUCACHE_PATCHED_SYMBOL] = true;

    /**
     * Hook 'lru-cache' so that the first time it's required, we can patch the LRUCache class.
     */
    new Hook(["lru-cache"], function (exports, name, basedir) {
      // Check if the exported object contains the LRUCache class
      const LRUCacheClass = (exports as any).LRUCache || exports;

      if (!LRUCacheClass || !LRUCacheClass.prototype) {
        console.warn(
          "[Patch lru-cache] Could not locate LRUCache.prototype to patch."
        );
        return exports;
      }

      console.log("[Patch lru-cache] Patching LRUCache methods...");

      // Iterate over the methods defined in constants
      Object.keys(LRUCacheCommandArgsMapping).forEach((method) => {
        if (typeof LRUCacheClass.prototype[method] === "function") {
          shimmer.wrap(LRUCacheClass.prototype, method, function (originalFn) {
            return function patchedMethod(this: any, ...args: any[]) {
              const callerInfo = getCallerInfo(fileURLToPath(import.meta.url));

              const argNames =
                LRUCacheCommandArgsMapping[method as keyof typeof LRUCacheCommandArgsMapping] || [];
              const logContent: { [key: string]: any } = {
                type: method,
                package: "lru-cache",
                file: callerInfo.file,
                line: callerInfo.line,
                // Map standard arguments like 'key' if applicable
                key: argNames.includes("key") ? args[argNames.indexOf("key")] : undefined,
              };

              const startTime = performance.now();

              try {
                const result = originalFn.apply(this, args);
                const endTime = performance.now();
                logContent["duration"] = parseFloat((endTime - startTime).toFixed(2));

                // --- Standardized Logging Logic ---
                if (method === "get") {
                  const isHit = result !== undefined && result !== null; // LRU-cache returns undefined on miss
                  logContent["hits"] = isHit ? 1 : 0;
                  logContent["misses"] = isHit ? 0 : 1;
                  logContent["value"] = result; // Log the retrieved value
                } else if (method === "has") {
                  const isHit = !!result; // 'has' returns boolean
                  logContent["hits"] = isHit ? 1 : 0;
                  logContent["misses"] = isHit ? 0 : 1;
                } else if (method === "set") {
                  logContent["writes"] = 1;
                  logContent["value"] = argNames.includes("value") ? args[argNames.indexOf("value")] : undefined; // Log the set value
                } else if (method === "del") {
                  // 'del' doesn't clearly indicate a write vs. no-op if key didn't exist,
                  // but we log it as an attempted write/delete operation.
                  logContent["writes"] = 1;
                }
                // Add other methods like 'peek' similarly if needed, usually as 'hits'/'misses'

                if (watchers?.cache) {
                  watchers.cache.addContent(logContent);
                }
                return result;
              } catch (error: unknown) { // Use unknown for better type safety
                const endTime = performance.now(); // Capture end time even on error
                logContent["duration"] = parseFloat((endTime - startTime).toFixed(2));
                logContent["error"] = error instanceof Error ? error.message : String(error);
                logContent["stack"] = error instanceof Error ? error.stack : undefined; // Include stack only if Error object
                if (watchers?.cache) {
                  watchers.cache.addContent(logContent);
                }
                throw error; // Rethrow original error
              }
            };
          });
          console.log(`[Patch lru-cache] Patched method: ${method}`);
        }
      });

      console.log("[node-observer] LRUCache successfully patched");
      return exports;
    });
  } else {
    console.log("[node-observer] LRUCache already patched, skipping");
  }
}
