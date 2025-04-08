/** @format */

import { Hook } from "require-in-the-middle";
import shimmer from "shimmer";
import { watchers } from "../logger";
import { ioRedisCommandsArgs } from "../constants";
import { getCallerInfo } from "../utils";
import { fileURLToPath } from 'url';

// Create a global symbol to track if ioredis has been patched
const IOREDIS_PATCHED_SYMBOL = Symbol.for('node-observer:ioredis-patched');

if (process.env.NODE_OBSERVATORY_CACHE && JSON.parse(process.env.NODE_OBSERVATORY_CACHE).includes("ioredis")) {
// Check if ioredis has already been patched
if (!(global as any)[IOREDIS_PATCHED_SYMBOL]) {
  // Mark ioredis as patched
  (global as any)[IOREDIS_PATCHED_SYMBOL] = true;

  /**
   * Hook "ioredis" so we can patch its prototype methods.
   */
  new Hook(["ioredis"], function (exports, name, basedir) {
    // `exports` is the default class returned by require("ioredis").
    // Typically: class IORedis extends EventEmitter { ... }
    // We want to patch the prototype of that class to intercept commands (e.g., get, set, etc.).

    if (!exports || !(exports as any).prototype) {
      console.warn(
        "[Patch ioredis] Could not locate exports.prototype to patch."
      );
      return exports;
    }

    // Only patch methods defined in our constants
    Object.keys(ioRedisCommandsArgs).forEach((command) => {
      if (typeof (exports as any).prototype[command] === "function") {
        shimmer.wrap((exports as any).prototype, command, function (originalFn) {
          return async function patchedCommand(this: any, ...args: any[]) {
            const callerInfo = getCallerInfo(fileURLToPath(import.meta.url));

            const logContent: { [key: string]: any } = {
              type: command,
              package: "ioredis",
              host: this.options?.host,
              port: this.options?.port,
              file: callerInfo.file,
              line: callerInfo.line,
            };

            const startTime = performance.now();
            
            try {
              const result = await originalFn.apply(this, args);
              const endTime = performance.now();
              logContent["duration"] = parseFloat((endTime - startTime).toFixed(2));

              // Standard metrics for all cache operations
              if (command === "get") {
                // Regular get operation
                const isHit = result !== undefined && result !== null;
                logContent["hits"] = isHit ? 1 : 0;
                logContent["misses"] = isHit ? 0 : 1;
                logContent["value"] = result;
                logContent["key"] = args[0];
              // } else if (command === "mget") {
              //   // Multiple get operation
              //   const keys = Array.isArray(args[0]) ? args[0] : args;
              //   const hits = result.filter((value: any) => value !== null && value !== undefined).length;
              //   const misses = keys.length - hits;
                
              //   logContent["hits"] = hits;
              //   logContent["misses"] = misses;
              //   logContent["value"] = result;
              } else if (command === "exists") {
                // Exists operation
                const isHit = !!result;
                logContent["hits"] = isHit ? 1 : 0;
                logContent["misses"] = isHit ? 0 : 1;
                logContent["key"] = args[0];
              } else if (command === "set") {
                // Standard set operation
                logContent["writes"] = 1;
                logContent["key"] = args[0];
                logContent["value"] = args[1];
              // } else if (command === "mset") {
              //   // Multiple set operation
              //   // Could be in the form of mset(key1, val1, key2, val2) or mset({key1: val1, key2: val2})
              //   let writeCount = 1;
              //   if (args.length === 1 && typeof args[0] === 'object') {
              //     writeCount = Object.keys(args[0]).length;
              //   } else {
              //     writeCount = Math.floor(args.length / 2);
              //   }
              //   logContent["writes"] = writeCount;
              } else if (command === "del") {
                // Delete operation
                logContent["writes"] = 1;
                logContent["key"] = args[0];
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
        console.log(`[Patch ioredis] Patched method: ${command}`);
      }
    });

     console.log("[node-observer] ioredis successfully patched");
    return exports;
  });

  } else {
    console.log("[node-observer] ioredis already patched, skipping");
  }
}
