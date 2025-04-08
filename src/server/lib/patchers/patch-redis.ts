/** @format */

import { Hook } from "require-in-the-middle";
import shimmer from "shimmer";
import { watchers } from "../logger";
import { redisCommandArgs } from "../constants";
import { getCallerInfo } from "../utils";
import { fileURLToPath } from 'url';

const REDIS_PATCHED_SYMBOL = Symbol.for('node-observer:redis-patched');

if (process.env.NODE_OBSERVATORY_CACHE && JSON.parse(process.env.NODE_OBSERVATORY_CACHE).includes("redis")) {
  if (!(global as any)[REDIS_PATCHED_SYMBOL]) {
    (global as any)[REDIS_PATCHED_SYMBOL] = true;

    new Hook(["redis"], function (exports, name, basedir) {
      if (typeof (exports as any).createClient === "function") {
        shimmer.wrap(exports as any, "createClient", function (originalCreate) {
          return function patchedCreateClient(this: any, ...args: any[]) {
            const client = originalCreate.apply(this, args);
            patchRedisClient(client);
            return client;
          };
        });
        console.log("[Patch redis] createClient patched.");
      } else {
        console.warn("[Patch redis] Could not patch createClient (not found).");
      }

      console.log("[node-observer] Redis successfully patched");
      return exports;
    });
  } else {
    console.log("[node-observer] Redis already patched, skipping");
  }
}

/**
   * Patch the methods on a given Redis client instance to log commands.
   */
  function patchRedisClient(client: any) {
    // Only patch methods defined in our constants
    Object.keys(redisCommandArgs).forEach((command) => {
      if (typeof (client as any)[command] === "function") {
        shimmer.wrap(
          client,
          command as keyof any,
          function (originalFn: any) {
            return async function patchedCommand(this: any, ...args: any[]) {
              const callerInfo = getCallerInfo(fileURLToPath(import.meta.url));

              const argNames = redisCommandArgs[command];
              const logContent: { [key: string]: any } = {
                type: command,
                package: "redis",
                file: callerInfo.file,
                line: callerInfo.line,
              };

              // Skip observatory entries
              if (
                (Array.isArray(args[0]) &&
                  args[0].some((key: string) =>
                    key.includes("observatory_entries")
                  )) ||
                (typeof args[0] === 'string' && args[0].includes("observatory_entries"))
              ) {
                return originalFn.apply(this, args);
              }

              const startTime = performance.now();
            
              try {
                const result = await originalFn.apply(this, args);
                const endTime = performance.now();
                logContent["duration"] = parseFloat((endTime - startTime).toFixed(2));

                if (!shouldLogRedisCommand(command, args)) {
                  return result;
                }

                // Standard metrics for key operations only
                if (command === "get" || command === "GET") {
                  // Single key get operation
                  const isHit = result !== undefined && result !== null;
                  logContent["hits"] = isHit ? 1 : 0;
                  logContent["misses"] = isHit ? 0 : 1;
                  logContent["value"] = result;
                  logContent["key"] = args[0];
                  // } else if (command === "mGet" || command === "mget") {
                  //   // Multiple get operation
                  //   const keys = Array.isArray(args[0]) ? args[0] : args;
                  //   const hits = result.filter((value: any) => value !== null && value !== undefined).length;
                  //   const misses = keys.length - hits;
                
                  //   logContent["hits"] = hits;
                  //   logContent["misses"] = misses;
                  //   logContent["value"] = result;
                } else if (command === "exists" || command === "EXISTS") {
                  // Exists operation
                  const isHit = !!result;
                  logContent["hits"] = isHit ? 1 : 0;
                  logContent["misses"] = isHit ? 0 : 1;
                  logContent["key"] = args[0];
                } else if (command === "set" || command === "SET") {
                  // Standard set operation
                  logContent["writes"] = 1;
                  logContent["key"] = args[0];
                  logContent["value"] = args[1];
                } else if (command === "mSet" || command === "mset") {
                  // // Multiple set operation
                  // // Could be in the form of mset(key1, val1, key2, val2) or mset({key1: val1, key2: val2})
                  // let writeCount = 1;
                  // if (args.length === 1 && typeof args[0] === 'object') {
                  //   writeCount = Object.keys(args[0]).length;
                  // } else {
                  //   writeCount = Math.floor(args.length / 2);
                  // }
                  // logContent["writes"] = writeCount;
                } else if (command === "del" || command === "DEL") {
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
          }
        );
        console.log(`[Patch redis] Patched method: ${command}`);
      }
    });
  }

  function shouldLogRedisCommand(command: string, args: any[]) {
    if (command === 'get' || command === 'GET') {
      return !args[0].includes('observatory_entries')
    } else if (command === 'mGet' || command === 'mget') {
      return !args[0].some((key: string) => key.includes('observatory_entries'))
    } else if (command === 'exists' || command === 'EXISTS') {
      return !args[0].includes('observatory_entries')
    } else if (command === 'set' || command === 'SET' || command === 'mset' || command === 'MSET') {
      return !args[0].includes('observatory_entries')
    } else if (command === 'del' || command === 'DEL') {
      return !args[0].includes('observatory_entries')
    }

    return true;
  }