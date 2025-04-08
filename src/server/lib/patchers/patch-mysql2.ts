/** @format */

import { Hook } from "require-in-the-middle";
import shimmer from "shimmer";
import { watchers } from "../logger";
import { getCallerInfo } from "../utils";
import { fileURLToPath } from 'url';

if (process.env.NODE_OBSERVATORY_QUERIES && JSON.parse(process.env.NODE_OBSERVATORY_QUERIES).includes("mysql2")) {
  const MYSQL2_PATCHED_SYMBOL = Symbol.for('node-observer:mysql2-patched');

  // Check if mysql2 has already been patched
  if (!(global as any)[MYSQL2_PATCHED_SYMBOL]) {
    // Mark mysql2 as patched
    (global as any)[MYSQL2_PATCHED_SYMBOL] = true;

    /**
     * Hook into the "mysql2/promise" module to patch its connection and pool prototypes.
     */
    new Hook(["mysql2/promise"], (exports: any) => {
      // Patch createConnection
      shimmer.wrap(
        exports,
        "createConnection",
        (originalCreateConnection: Function) => {
          return async function patchedCreateConnection(this: any, ...args: any[]) {
            const connectionPromise: Promise<any> =
              originalCreateConnection.apply(this, args);
            const connection = await connectionPromise;
            patchQuery(connection, "Connection");
            patchExecute(connection, "Connection");
            return connectionPromise;
          };
        }
      );
      console.log("[Patch mysql2/promise] createConnection patched.");

      // Patch createPool
      shimmer.wrap(exports, "createPool", (originalCreatePool: Function) => {
        return function patchedCreatePool(this: any, ...args: any[]) {
          const pool = originalCreatePool.apply(this, args);
          patchQuery(pool, "Pool");
          patchExecute(pool, "Pool");
          return pool;
        };
      });
      console.log("[Patch mysql2/promise] createPool patched.");
      return exports;
    });
  } else {
    console.log("[node-observer] MySQL2 already patched, skipping");
  }
}


/**
   * Determines if a query or execute command should be logged.
   * @param sql - The SQL query or QueryOptions object.
   */
  function shouldLogQuery(sql: any): boolean {
    const stack = new Error().stack as string;
    const query = typeof sql === "string" ? sql : sql.sql;
    return !!query && !query.toLowerCase().includes("observatory_entries") && !stack.toLowerCase().includes("basewatcher");
  }

  /**
   * Patches the query method for a Connection or Pool object.
   */
  function patchQuery(target: any, contextName: string) {
    if (!target || typeof target.query !== "function") return;

    shimmer.wrap(target, "query", (originalQuery: Function) => {
      return async function patchedQuery(
        this: any,
        sqlOrOptions: any,
        values?: any
      ) {
        const sql =
          typeof sqlOrOptions === "string" ? sqlOrOptions : sqlOrOptions.sql;

        if (shouldLogQuery(sql)) {
          const startTime = performance.now();
          try {
            const result = await originalQuery.call(this, sqlOrOptions, values);
            const endTime = performance.now();
            const duration = parseFloat((endTime - startTime).toFixed(2));
            logQuery(
              contextName,
              sql,
              this,
              duration,
              undefined,
              values
            );
            return result;
          } catch (error: any) {
            const endTime = performance.now();
            const duration = parseFloat((endTime - startTime).toFixed(2));
            logQuery(contextName, sql, this, duration, error, values);
            throw error;
          }
        }

        return originalQuery.call(this, sqlOrOptions, values);
      };
    });

    console.log(`[Patch mysql2/promise] ${contextName}.query patched.`);
  }

  /**
   * Patches the execute method for a Connection or Pool object.
   */
  function patchExecute(target: any, contextName: string) {
    if (!target || typeof target.execute !== "function") return;

    shimmer.wrap(target, "execute", (originalExecute: Function) => {
      return async function patchedExecute(
        this: any,
        sqlOrOptions: any,
        values?: any
      ) {
        const sql =
          typeof sqlOrOptions === "string" ? sqlOrOptions : sqlOrOptions.sql;

        if (shouldLogQuery(sql)) {
          const startTime = performance.now();
          try {
            const result = await originalExecute.call(this, sqlOrOptions, values);
            const endTime = performance.now();
            const duration = parseFloat((endTime - startTime).toFixed(2));
            logQuery(contextName, sql, this, duration, undefined, values);
            return result;
          } catch (error: any) {
            const endTime = performance.now();
            const duration = parseFloat((endTime - startTime).toFixed(2));
            logQuery(contextName, sql, this, duration, error, values);
            throw error;
          }
        }

        return originalExecute.call(this, sqlOrOptions, values);
      };
    });

    console.log(`[Patch mysql2/promise] ${contextName}.execute patched.`);
  }

  /**
   * Logs query execution details with the originating file and line number.
   * @param context - The context of the operation (e.g., "Connection" or "Pool").
   * @param sql - The executed SQL query or command.
   * @param connection - The Connection or Pool object.
   * @param duration - The time taken to execute the operation in milliseconds.
   * @param error - Optional error object, if the operation fails.
   * @param stack - Captured stack trace at query initiation.
   */
  function logQuery(
    context: string,
    sql: string,
    connection: any,
    duration: number,
    error?: Error,
    values?: any
  ) {
    const callerInfo = getCallerInfo(fileURLToPath(import.meta.url));

    const logEntry = {
      context,
      sql,
      duration,
      hostname: connection.config?.host || connection.pool.config?.connectionConfig?.host || "unknown",
      port: connection.config?.port || connection.pool.config?.connectionConfig?.port || "unknown",
      database: connection.config?.database || connection.pool.config?.connectionConfig?.database || "unknown",
      user: connection.config?.user || connection.pool.config?.connectionConfig?.user || "unknown",
      package: "mysql2",
      file: callerInfo.file,
      line: callerInfo.line,
      error: error ? error.toString() : undefined,
      status: error ? "failed" : "completed",
      sqlType: getSqlType(sql),
      params: values
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
