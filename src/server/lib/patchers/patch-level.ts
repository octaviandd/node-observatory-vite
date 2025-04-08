/** @format */

import { Hook } from "require-in-the-middle";
import shimmer from "shimmer";
import { watchers } from "../logger";
import { getCallerInfo } from "../utils";
import { fileURLToPath } from 'url';

// Create a global symbol to track if level has been patched
const LEVEL_PATCHED_SYMBOL = Symbol.for('node-observer:level-patched');

if (process.env.NODE_OBSERVATORY_CACHE && JSON.parse(process.env.NODE_OBSERVATORY_CACHE).includes("level")) {
  // Check if level has already been patched
  if (!(global as any)[LEVEL_PATCHED_SYMBOL]) {
    // Mark level as patched
    (global as any)[LEVEL_PATCHED_SYMBOL] = true;

    /**
     * Hook "level" to patch its cache operations.
     */
    new Hook(["level"], function (exports: any, name, basedir) {
      // The level package exports a function that creates a database instance
      if (!exports.Level || typeof exports.Level !== "function") {
        console.warn("[Patch level] Could not locate Level function to patch.");
        return exports;
      }

      // Patch the main export function
      shimmer.wrap(exports, "Level", function (originalLevel) {
        return function patchedLevel(this: any, location: string, options?: any) {
          // Create the database instance
          const db = new originalLevel(location, options);

          // Patch the database methods
          const methodsToPath = ['put', 'del', 'get'];
        
          methodsToPath.forEach((method) => {
            if (db && typeof db[method] === "function") {
              shimmer.wrap(db, method, function (originalMethod) {
                return async function patchedMethod(this: any, ...args: any[]) {
                  const callerInfo = getCallerInfo(fileURLToPath(import.meta.url));

                  // Build a log object with basic information
                  const logContent: { [key: string]: any } = {
                    type: method,
                    package: "level",
                    file: callerInfo.file,
                    line: callerInfo.line
                  };

                  // Add key information to the log based on method
                  if (method === "get") {
                    logContent["key"] = args[0];
                  } else if (method === "put") {
                    logContent["key"] = args[0];
                    logContent["value"] = args[1];
                  } else if (method === "del") {
                    logContent["key"] = args[0];
                  } else if (method === "batch") {
                    // Batch operations - enhanced to handle sublevels
                    // if (Array.isArray(args[0])) {
                    //   // Record operation types and keys
                    //   const ops = args[0];
                    
                    //   // Process operations with and without sublevels
                    //   const putOps = ops.filter(op => op.type === 'put');
                    //   const delOps = ops.filter(op => op.type === 'del');

                    //   // Process keys for each type of operation
                    //   if (putOps.length > 0) {
                    //     logContent["putEntries"] = putOps.map(op => {
                    //       // Extract sublevel name if present
                    //       let sublevelName = null;
                    //       if (op.sublevel) {
                    //         // Try to extract name from sublevel object
                    //         if (op.sublevel.name) {
                    //           sublevelName = op.sublevel.name;
                    //         } else {
                    //           // Try to extract from Symbol properties
                    //           const symbols = Object.getOwnPropertySymbols(op.sublevel);
                    //           for (const sym of symbols) {
                    //             if (String(sym).includes('localPath')) {
                    //               const paths = op.sublevel[sym];
                    //               if (Array.isArray(paths) && paths.length > 0) {
                    //                 sublevelName = paths[0];
                    //                 break;
                    //               }
                    //             }
                    //           }
                    //         }
                    //       }

                    //       return {
                    //         key: op.key,
                    //         value: op.value,
                    //         sublevel: sublevelName
                    //       };
                    //     });
                    //   }
                    
                    //   if (delOps.length > 0) {
                    //     logContent["delEntries"] = delOps.map(op => {
                    //       // Extract sublevel name if present
                    //       let sublevelName = null;
                    //       if (op.sublevel) {
                    //         // Try to extract name from sublevel object
                    //         if (op.sublevel.name) {
                    //           sublevelName = op.sublevel.name;
                    //         } else {
                    //           // Try to extract from Symbol properties
                    //           const symbols = Object.getOwnPropertySymbols(op.sublevel);
                    //           for (const sym of symbols) {
                    //             if (String(sym).includes('localPath')) {
                    //               const paths = op.sublevel[sym];
                    //               if (Array.isArray(paths) && paths.length > 0) {
                    //                 sublevelName = paths[0];
                    //                 break;
                    //               }
                    //             }
                    //           }
                    //         }
                    //       }

                    //       return {
                    //         key: op.key,
                    //         sublevel: sublevelName
                    //       };
                    //     });
                      
                    //     // For backward compatibility, keep the delKeys array
                    //     logContent["delKeys"] = delOps.map(op => op.key);
                    //   }
                    // }
                  }

                  const startTime = performance.now();
                
                  try {
                    // READ operations (get)
                    if (method === "get") {
                      try {
                        const result = await originalMethod.apply(this, args);
                        const endTime = performance.now();

                        const isHit = result !== undefined && result !== null && result !== false;
                      
                        logContent["hits"] = isHit ? 1 : 0;
                        logContent["misses"] = !isHit ? 1 : 0;
                      
                        logContent["value"] = result;
                        logContent["duration"] = parseFloat((endTime - startTime).toFixed(2));
                      
                        watchers.cache.addContent(logContent);
                        return result;
                      } catch (error: any) {
                        // LevelDB throws NotFoundError when key doesn't exist
                        const endTime = performance.now();
                      
                        if (error.code === 'LEVEL_NOT_FOUND') {
                          logContent["hits"] = 0;
                          logContent["misses"] = 1;
                        } else {
                          // Other errors
                          logContent["error"] = error.message;
                        }
                      
                        logContent["duration"] = parseFloat((endTime - startTime).toFixed(2));
                        watchers.cache.addContent(logContent);
                        throw error;
                      }
                    }
                    // WRITE operations (put, del, batch)
                    else {
                      const result = await originalMethod.apply(this, args);
                      const endTime = performance.now();
                    
                      if (method === "put" || method === "del") {
                        logContent["writes"] = 1;
                      } else if (method === "batch" && Array.isArray(args[0])) {
                        // logContent["writes"] = args[0].length;
                      }
                    
                      logContent["duration"] = parseFloat((endTime - startTime).toFixed(2));
                      watchers.cache.addContent(logContent);
                      return result;
                    }
                  } catch (error: unknown) {
                    // This catches errors that aren't handled in the individual method blocks
                    if (!logContent.error) {
                      logContent["error"] = error instanceof Error ? error.message : String(error);
                      logContent["stack"] = error instanceof Error ? error.stack : String(error);
                      watchers.cache.addContent(logContent);
                    }
                    throw error;
                  }
                };
              });
              console.log(`[Patch level] ${method} method patched`);
            }
          });

          return db;
        };
      });

      console.log("[Patch level] Database methods patched.");

      // Return the patched level module
      return exports;
    });
  } else {
    console.log("[node-observer] Level already patched, skipping");
  }
}
