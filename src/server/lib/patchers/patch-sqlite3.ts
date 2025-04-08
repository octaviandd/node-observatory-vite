import { Hook } from "require-in-the-middle";
import shimmer from "shimmer";
import { watchers } from "../logger";
import { getCallerInfo } from "../utils";
import { fileURLToPath } from 'url';

const SQLITE3_PATCHED_SYMBOL = Symbol.for('node-observer:sqlite3-patched');

if (process.env.NODE_OBSERVATORY_DATABASES && JSON.parse(process.env.NODE_OBSERVATORY_DATABASES).includes("sqlite3")) {
  if (!(global as any)[SQLITE3_PATCHED_SYMBOL]) {
    (global as any)[SQLITE3_PATCHED_SYMBOL] = true;

    new Hook(["sqlite3"], function (exports: any) {
      if (!exports || !exports.Database) {
        console.warn("[Patch sqlite3] Could not locate Database class to patch.");
        return exports;
      }

      const methodsToPatch = [
        "all",
        "get",
        "run",
        "each",
        "exec",
        "prepare"
      ];

      methodsToPatch.forEach((method) => {
        if (typeof exports.Database.prototype[method] === "function") {
          shimmer.wrap(
            exports.Database.prototype,
            method,
            function (originalMethod) {
              return function patchedMethod(this: any, sql: string, ...args: any[]) {
                const startTime = performance.now();

                // Handle different callback patterns
                const lastArg = args[args.length - 1];
                const hasCallback = typeof lastArg === 'function';
                const params = hasCallback ? args.slice(0, -1) : args;
                const callback = hasCallback ? lastArg : undefined;

                if (!callback) {
                  // Handle promise-based calls
                  return new Promise((resolve, reject) => {
                    originalMethod.call(this, sql, ...params, function (err: Error, result: any) {
                      const endTime = performance.now();
                      logQuery(
                        method,
                        sql,
                        params,
                        err ? undefined : result,
                        endTime - startTime,
                        err,
                      );
                      if (err) reject(err);
                      else resolve(result);
                    });
                  });
                }

                // Handle callback-based calls
                return originalMethod.call(this, sql, ...params, function (err: Error, result: any) {
                  const endTime = performance.now();
                  logQuery(
                    method,
                    sql,
                    params,
                    err ? undefined : result,
                    endTime - startTime,
                    err,
                  );
                  callback(err, result);
                });
              };
            }
          );
        }
      });

      console.log("[Patch sqlite3] All Database methods patched.");
      return exports;
    });
  } else {
    console.log("[node-observer] SQLite3 already patched, skipping");
  }
}


function logQuery(
    method: string,
    sql: string,
    params: any[],
    result: any,
    duration: number,
    error?: Error,
  ) {
    const callerInfo = getCallerInfo(fileURLToPath(import.meta.url));

    const logEntry = {
      method,
      sql,
      parameters: params,
      result,
      duration,
      package: "sqlite3",
      file: callerInfo.file,
      line: callerInfo.line,
      error: error ? error.toString() : undefined,
    };

    watchers.database.addContent(logEntry);
  }