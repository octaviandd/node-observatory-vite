/** @format */

import { Hook } from "require-in-the-middle";
import shimmer from "shimmer";
import { watchers } from "../logger";
import { getCallerInfo } from "../utils";
import { fileURLToPath } from 'url';
const TYPEORM_PATCHED_SYMBOL = Symbol.for('node-observer:typeorm-patched');

if (process.env.NODE_OBSERVATORY_MODELS && JSON.parse(process.env.NODE_OBSERVATORY_MODELS).includes("typeorm")) {
  if (!(global as any)[TYPEORM_PATCHED_SYMBOL]) {
    // Mark typeorm as patched
    (global as any)[TYPEORM_PATCHED_SYMBOL] = true;

    new Hook(["typeorm"], function (exports: any, name, basedir) {
      // `exports` is the TypeORM module.
      if (!exports || typeof exports.Repository !== "function") {
        console.warn("[Patch typeorm] Could not locate Repository class to patch.");
        return exports;
      }

      const methodsToPatch = [
        "save",
        "find",
        "findOne",
        "findBy",
        "findAndCount",
        "findOneBy",
        "findOneOrFail",
        "count",
        "countBy",
        "remove",
        "update",
        "insert",
        "query",
      ];

      methodsToPatch.forEach((method) => {
        if (typeof exports.Repository.prototype[method] === "function") {
          shimmer.wrap(
            exports.Repository.prototype,
            method,
            function (originalMethod) {
              return async function patchedMethod(this: any, ...args: any[]) {
                const startTime = performance.now();

                try {
                  const result = await originalMethod.apply(this, args);
                  const endTime = performance.now();
                  logModelOperation(
                    method,
                    this.target?.name,
                    args,
                    result, 
                    parseFloat((endTime - startTime).toFixed(2)),
                    undefined,
                  );
                  return result;
                } catch (error: any) {
                  const endTime = performance.now();
                  logModelOperation(
                    method,
                    this.target?.name,
                    args,
                    undefined,
                    parseFloat((endTime - startTime).toFixed(2)),
                    error,
                  );
                  throw error;
                }
              };
            }
          );
        }
      });

      shimmer.wrap(exports.BaseEntity.prototype, "save", function (originalSave) {
        return async function patchedSave(this: any, ...args: any[]) {
          const startTime = performance.now();

          try {
            const result = await originalSave.apply(this, args);
            const endTime = performance.now();
            logModelOperation(
              "save",
              this.constructor.name,
              args,
              result,
              parseFloat((endTime - startTime).toFixed(2)),
              undefined,
            );
            return result;
          } catch (error: any) {
            const endTime = performance.now();
            logModelOperation(
              "save",
              this.constructor.name,
              args,
              undefined,
              parseFloat((endTime - startTime).toFixed(2)),
              error,
            );
            throw error;
          }
        };
      });

      console.log("[Patch typeorm] All repository and BaseEntity methods patched.");
      return exports;
    });
  } else {
    console.log("[node-observer] TypeORM already patched, skipping");
  }
}

/**
   * Logs model operation details with the originating file and line number.
   * @param method - The method being executed (e.g., "save", "find").
   * @param modelName - The model name of the entity or repository.
   * @param args - The arguments passed to the method.
   * @param result - The result of the method execution.
   * @param duration - The time taken to execute the operation in milliseconds.
   * @param error - Optional error object, if the operation fails.
   */
  function logModelOperation(
    method: string,
    modelName: string,
    args: any[],
    result: any,
    duration: number,
    error?: Error,
  ) {
    const callerInfo = getCallerInfo(fileURLToPath(import.meta.url));

    // Log to model watcher with consistent keys
    const modelLogEntry = {
      method,
      modelName,
      arguments: args,
      result,
      duration,
      package: "typeorm",
      file: callerInfo.file,
      line: callerInfo.line,
      error: error ? error.toString() : undefined,
      status: error ? "failed" : "completed"
    };
    watchers.model.addContent(modelLogEntry);
  }
