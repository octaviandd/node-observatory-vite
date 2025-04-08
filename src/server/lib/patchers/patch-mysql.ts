/** @format */

import { Hook } from "require-in-the-middle";
import shimmer from "shimmer";
import { watchers } from "../logger";
import type { Connection, Pool } from "mysql";
import type { QueryOptions } from "mysql";
import { getCallerInfo } from "../utils";
import { fileURLToPath } from 'url';

// Create a global symbol to track if mysql has been patched
const MYSQL_PATCHED_SYMBOL = Symbol.for('node-observer:mysql-patched');

if (process.env.NODE_OBSERVATORY_DATABASES && JSON.parse(process.env.NODE_OBSERVATORY_DATABASES).includes("mysql")) {
  // Check if mysql has already been patched
  if (!(global as any)[MYSQL_PATCHED_SYMBOL]) {
    // Mark mysql as patched
    (global as any)[MYSQL_PATCHED_SYMBOL] = true;

    /**
     * Hook the "mysql" module so that when it's first required,
     * we can patch its connection and pool prototypes.
     */
    new Hook(["mysql"], function (exports, name, basedir) {
      // 1) Patch createConnection
      shimmer.wrap(
        exports as any,
        "createConnection",
        function (originalCreateConnection) {
          return function patchedCreateConnection(this: any, ...args: any[]) {
            const connection = originalCreateConnection.apply(this, args);
            patchConnectionQuery(connection, "Connection");
            return connection;
          };
        }
      );
      console.log("[Patch mysql] createConnection patched.");

      // 2) Patch createPool
      shimmer.wrap(exports as any, "createPool", function (originalCreatePool) {
        return function patchedCreatePool(this: any, ...args: any[]) {
          const pool = originalCreatePool.apply(this, args);
          patchPoolQuery(pool, "Pool");
          return pool;
        };
      });
      console.log("[Patch mysql] createPool patched.");
      return exports;
    });
  } else {
    console.log("[node-observer] MySQL already patched, skipping");
  }
}

/**
   * Determine whether the query should be logged.
   */
  function shouldLogQuery(sql: string): boolean {
    return !sql.toLowerCase().includes("insert into observatory_entries");
  }

  /**
   * Patch the query method on a Connection object.
   */
  function patchConnectionQuery(connection: Connection, contextName: string) {
    if (!connection || typeof connection.query !== "function") return;

    shimmer.wrap(connection, "query", function (originalQuery: Function) {
      return function patchedQuery(
        this: Connection,
        sqlOrOptions: string | QueryOptions,
        values?: any,
        callback?: Function
      ) {
        if ((this as any)._isLoggerQuery) {
          return originalQuery.call(this, sqlOrOptions, values, callback);
        }
        const stack = new Error().stack;

        const sql =
          typeof sqlOrOptions === "string" ? sqlOrOptions : sqlOrOptions.sql;

        if (shouldLogQuery(sql)) {
          const startTime = performance.now();
          const queryPromise = new Promise((resolve, reject) => {
            originalQuery.call(this, sqlOrOptions, values, (error: any, result: any) => {
              const endTime = performance.now();
              if (error) {
                logQuery(contextName, sql, this, endTime - startTime, error);
                reject(error);
              } else {
                logQuery(contextName, sql, this, endTime - startTime, undefined);
                resolve(result);
              }
            });
          });
          return queryPromise;
        }

        return originalQuery.call(this, sqlOrOptions, values, callback);
      };
    });
    console.log(`[Patch mysql] ${contextName}.query patched.`);
  }

/**
   * Patch the query method on a Pool object.
   */
  function patchPoolQuery(pool: Pool, contextName: string) {
    if (!pool || typeof pool.query !== "function") return;

    shimmer.wrap(pool, "query", function (originalQuery: Function) {
      return function patchedQuery(
        this: Pool,
        sqlOrOptions: string | QueryOptions,
        values?: any,
        callback?: Function
      ) {
        if ((this as any)._isLoggerQuery) {
          return originalQuery.call(this, sqlOrOptions, values, callback);
        }
        const sql =
          typeof sqlOrOptions === "string" ? sqlOrOptions : sqlOrOptions.sql;

        if (shouldLogQuery(sql)) {
          const startTime = performance.now();
          const queryPromise = new Promise((resolve, reject) => {
            originalQuery.call(this, sqlOrOptions, values, (error: any, result: any) => {
              const endTime = performance.now();
              if (error) {
                logQuery(contextName, sql, this, endTime - startTime, error);
                reject(error);
              } else {
                logQuery(contextName, sql, this, endTime - startTime, undefined);
                resolve(result);
              }
            });
          });
          return queryPromise;
        }

        return originalQuery.call(this, sqlOrOptions, values, callback);
      };
    });
    console.log(`[Patch mysql] ${contextName}.query patched.`);
  }


/**
   * Logs query execution details with the originating file and line number.
   * @param context - The context of the operation (e.g., "Connection" or "Pool").
   * @param sql - The executed SQL query or command.
   * @param connection - The Connection or Pool object.
   * @param duration - The time taken to execute the operation in milliseconds.
   * @param error - Optional error object, if the operation fails.
   */
  function logQuery(
    context: string,
    sql: string,
    connection: Connection | Pool,
    duration: number,
    error?: Error,
  ) {
    const callerInfo = getCallerInfo(fileURLToPath(import.meta.url));

    const logEntry = {
      context,
      sql,
      duration,
      hostname: (connection as Connection).config?.host || "unknown",
      port: (connection as Connection).config?.port || "unknown",
      database: (connection as Connection).config?.database || "unknown",
      user: (connection as Connection).config?.user || "unknown",
      connection: "mysql",
      package: "mysql",
      file: callerInfo.file,
      line: callerInfo.line,
      error: error ? error.toString() : undefined,
      sqlType: getSqlType(sql),
    };

    watchers.query.addContent(logEntry);
  }

  function getSqlType(sql: string): string {
    if (!sql) return "UNKNOWN";
    const firstWord = sql.trim().split(/\s+/, 1)[0].toUpperCase();
    switch (firstWord) {
      case "SELECT":
      case "INSERT":
      case "UPDATE":
      case "DELETE":
      case "CREATE":
      case "DROP":
      case "ALTER":
        return firstWord;
      default:
        return "OTHER";
    }
  }