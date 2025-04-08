/** @format */

import { Hook } from "require-in-the-middle";
import shimmer from "shimmer";
import { watchers } from "../logger";
import { getCallerInfo } from "../utils";
import { fileURLToPath } from 'url';
// Create a global symbol to track if keyv has been patched
const KEYV_PATCHED_SYMBOL = Symbol.for('node-observer:keyv-patched');

const patchMethod = (prototype: any, method: string) => {
  shimmer.wrap(prototype, method, function (original) {
    return async function (this: any, key: any, ...args: any[]) {
      const callerInfo = getCallerInfo(fileURLToPath(import.meta.url));

      const logContent: { [key: string]: any } = {
        type: method,
        package: "keyv",
        file: callerInfo.file,
        line: callerInfo.line,
        key,
      };

      const startTime = performance.now();

      try {
        const result = await original.call(this, key, ...args);
        const endTime = performance.now();
        logContent["duration"] = parseFloat((endTime - startTime).toFixed(2));

        // Track operation type using consistent format with node-cache
        if (method === "get") {
          const isHit = result !== undefined && result !== null;
          logContent["hits"] = isHit ? 1 : 0;
          logContent["misses"] = isHit ? 0 : 1;
          logContent["value"] = result;
          logContent["key"] = key;
        } else if (method === "set") {
          logContent["writes"] = 1;
          logContent["key"] = key;
          logContent["value"] = args[0];
        } else if (method === "delete") {
          logContent["writes"] = 1;
          logContent["key"] = key;
        } else if (method === "has") {
          const isHit = !!result;
          logContent["hits"] = isHit ? 1 : 0;
          logContent["misses"] = isHit ? 0 : 1;
          logContent["key"] = key;
        }

        watchers.cache.addContent(logContent);
        return result;
      } catch (error) {
        const endTime = performance.now();
        logContent["duration"] = parseFloat((endTime - startTime).toFixed(2));
        logContent["error"] = error instanceof Error ? error.message : String(error);
        logContent["stack"] = error instanceof Error ? error.stack : String(error);
        watchers.cache.addContent(logContent);
        throw error;
      }
    };
  });
  console.log(`[Patch keyv] Patched method: ${method}`);
};

if (process.env.NODE_OBSERVATORY_CACHE && JSON.parse(process.env.NODE_OBSERVATORY_CACHE).includes("keyv")) {
  // Check if keyv has already been patched
  if (!(global as any)[KEYV_PATCHED_SYMBOL]) {
    // Mark keyv as patched
    (global as any)[KEYV_PATCHED_SYMBOL] = true;

    new Hook(["keyv"], (exports: any) => {
      if (!exports.Keyv || typeof exports.Keyv !== "function") {
        console.warn("[Patch keyv] Could not locate Keyv class to patch.");
        return exports;
      }

      ["set", "get", "delete", "has"].forEach((method) =>
        patchMethod(exports.Keyv.prototype, method)
      );
      console.log("[Patch keyv] Database methods patched.");
      return exports;
    });
  } else {
    console.log("[node-observer] Keyv already patched, skipping");
  }
}
