/** @format */

import { Hook } from "require-in-the-middle";
import shimmer from "shimmer";
import { watchers } from "../logger";
import { getCallerInfo } from "../utils";
import { fileURLToPath } from 'url';

// Create a global symbol to track if knex has been patched
const KNEX_PATCHED_SYMBOL = Symbol.for('node-observer:knex-patched');

if ((process.env.NODE_OBSERVATORY_QUERIES && JSON.parse(process.env.NODE_OBSERVATORY_QUERIES).includes("knex")) || (process.env.NODE_OBSERVATORY_MODELS && JSON.parse(process.env.NODE_OBSERVATORY_MODELS).includes("knex"))) {
  // Check if knex has already been patched
  if (!(global as any)[KNEX_PATCHED_SYMBOL]) {
    // Mark knex as patched
    (global as any)[KNEX_PATCHED_SYMBOL] = true;

    /**
     * We'll try to patch a commonly used internal method on Knex's Client prototype:
     * - For many dialects, the final query is handled by `Client.prototype._query()` or `.query()`.
     * - This can vary by Knex version and dialect. For example, MySQL vs. Postgres clients might differ.
     * - You may need to adjust for your specific version or dialect if `_query` isn't present.
     */
    new Hook(["knex"], function (exports, name, basedir) {
      // Check if we have a Knex Client base class to patch
      if (
        !exports ||
        !(exports as any).Client ||
        !(exports as any).Client.prototype
      ) {
        console.warn(
          "[Patch knex] Could not find Client prototype. Patch may not work."
        );
        return exports;
      }

      function logQuery(context: string, sql: string, bindings: any, duration: number, error?: Error) {
        const callerInfo = getCallerInfo(fileURLToPath(import.meta.url));

        const logEntry = {
          context,
          sql,
          bindings,
          timestamp: new Date(),
          duration,
          connection: "knex",
          package: "knex",
          file: callerInfo.file,
          line: callerInfo.line,
          error: error ? error.toString() : undefined,
          sqlType: getSqlType(sql),
          params: bindings
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

      // Attempt to patch `_query` if it exists (common internal method)
      if (typeof (exports as any).Client.prototype._query === "function") {
        shimmer.wrap(
          (exports as any).Client.prototype,
          "_query",
          function (originalQuery) {
            return async function patchedQuery(this: any, obj: any) {
              const startTime = performance.now();
              try {
                // @ts-ignore
                const result = await originalQuery.apply(this, arguments);
                const endTime = performance.now();
                logQuery("Client.prototype._query", obj.sql, obj.bindings, endTime - startTime, undefined);
                return result;
              } catch (error: any) {
                const endTime = performance.now();
                logQuery("Client.prototype._query", obj.sql, obj.bindings, endTime - startTime, error);
                throw error;
              }
            };
          }
        );
        console.log("[Patch knex] Client.prototype._query patched successfully.");
      } else if (typeof (exports as any).Client.prototype.query === "function") {
        // If `_query` doesn't exist, try patching `.query()` instead
        shimmer.wrap(
          (exports as any).Client.prototype,
          "query",
          function (originalQuery) {
            return async function patchedQuery(
              this: any,
              connection: any,
              obj: any,
            ) {
              const startTime = performance.now();
              try {
                // @ts-ignore
                const result = await originalQuery.apply(this, arguments);
                const endTime = performance.now();
                logQuery("Client.prototype.query", obj && obj.sql ? obj.sql : obj, obj && obj.bindings, endTime - startTime, undefined);
                return result;
              } catch (error: any) {
                const endTime = performance.now();
                logQuery("Client.prototype.query", obj && obj.sql ? obj.sql : obj, obj && obj.bindings, endTime - startTime, error);
                throw error;
              }
            };
          }
        );
        console.log("[Patch knex] Client.prototype.query patched successfully.");
      } else {
        console.warn("[Patch knex] No suitable query method found to patch.");
      }

      // Return the patched Knex module
      return exports;
    });
  } else {
    console.log("[node-observer] Knex already patched, skipping");
  }
}
