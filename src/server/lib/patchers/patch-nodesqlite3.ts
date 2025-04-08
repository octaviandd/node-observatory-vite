/** @format */

import { Hook } from "require-in-the-middle";
import shimmer from "shimmer";
import { watchers } from "../logger";
import { getCallerInfo } from "../utils";
import { fileURLToPath } from 'url';

const SQLITE3_PATCHED_SYMBOL = Symbol.for('node-observer:sqlite3-patched');

if (process.env.NODE_OBSERVATORY_DATABASES && JSON.parse(process.env.NODE_OBSERVATORY_DATABASES).includes("sqlite3")) {
  if (!(global as any)[SQLITE3_PATCHED_SYMBOL]) {
    (global as any)[SQLITE3_PATCHED_SYMBOL] = true;

    /**
     * Hook "sqlite3" to patch its query execution methods.
     */
    new Hook(["sqlite3"], function (exports: any, name, basedir) {
      // `exports` is the sqlite3 module.
      if (!exports || typeof exports.Database !== "function") {
        console.warn("[Patch sqlite3] Could not locate Database class to patch.");
        return exports;
      }

      // Patch the `run` method
      shimmer.wrap(exports.Database.prototype, "run", function (originalRun) {
        return function patchedRun(this: any, sql: string, params: any, callback: any) {
          const startTime = performance.now();

          // Handle both run(sql, callback) and run(sql, params, callback) signatures
          if (typeof params === "function") {
            callback = params;
            params = [];
          }

          const wrappedCallback = function (this: any, err: Error | null) {
            const endTime = performance.now();
            logQuery(
              "run",
              sql,
              params,
              undefined,
              endTime - startTime,
              err,
            );
            if (callback) {
              callback.call(this, err);
            }
          };

          return originalRun.call(this, sql, params, wrappedCallback);
        };
      });

      // Patch the `get` method
      shimmer.wrap(exports.Database.prototype, "get", function (originalGet) {
        return function patchedGet(this: any, sql: string, params: any, callback: any) {
          const callerInfo = getCallerInfo(fileURLToPath(import.meta.url));
          const startTime = performance.now();

          // Handle both get(sql, callback) and get(sql, params, callback) signatures
          if (typeof params === "function") {
            callback = params;
            params = [];
          }

          const wrappedCallback = function (this: any, err: Error | null, row: any) {
            const endTime = performance.now();
            logQuery(
              "get",
              sql,
              params,
              row,
              endTime - startTime,
              err,
            );
            if (callback) {
              callback.call(this, err, row);
            }
          };

          return originalGet.call(this, sql, params, wrappedCallback);
        };
      });

      // Patch the `all` method
      shimmer.wrap(exports.Database.prototype, "all", function (originalAll) {
        return function patchedAll(this: any, sql: string, params: any, callback: any) {
          const startTime = performance.now();

          // Handle both all(sql, callback) and all(sql, params, callback) signatures
          if (typeof params === "function") {
            callback = params;
            params = [];
          }

          const wrappedCallback = function (this: any, err: Error | null, rows: any[]) {
            const endTime = performance.now();
            logQuery(
              "all",
              sql,
              params,
              rows,
              endTime - startTime,
              err,
            );
            if (callback) {
              callback.call(this, err, rows);
            }
          };

          return originalAll.call(this, sql, params, wrappedCallback);
        };
      });

      // Patch the `exec` method
      shimmer.wrap(exports.Database.prototype, "exec", function (originalExec) {
        return function patchedExec(this: any, sql: string, callback: any) {
          const startTime = performance.now();

          const wrappedCallback = function (this: any, err: Error | null) {
            const endTime = performance.now();
            logQuery(
              "exec",
              sql,
              [],
              undefined,
              endTime - startTime,
              err,
            );
            if (callback) {
              callback.call(this, err);
            }
          };

          return originalExec.call(this, sql, wrappedCallback);
        };
      });

      console.log("[Patch sqlite3] All query methods patched.");
      return exports;
    });
  } else {
    console.log("[node-observer] SQLite3 already patched, skipping");
  }
}

/**
   * Logs query execution details with the originating file and line number.
   * @param method - The method being executed (e.g., "run", "get").
   * @param sql - The SQL query text.
   * @param params - The query parameters/values.
   * @param result - The result of the query execution.
   * @param duration - The time taken to execute the query in milliseconds.
   * @param error - Optional error object, if the query fails.
   * @param stack - Captured stack trace at query initiation.
   */
  function logQuery(
    method: string,
    sql: string,
    params: any[],
    result: any,
    duration: number,
    error?: Error | null,
  ) {
    const callerInfo = getCallerInfo(fileURLToPath(import.meta.url));

    const logEntry = {
      method,
      sql,
      params,
      result,
      duration,
      package: "sqlite3",
      file: callerInfo.file,
      line: callerInfo.line,
      error: error ? error.toString() : undefined,
    };

    watchers.database.addContent(logEntry);
  }