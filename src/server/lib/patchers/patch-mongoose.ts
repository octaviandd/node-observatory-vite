/** @format */

import { Hook } from "require-in-the-middle";
import shimmer from "shimmer";
import { watchers } from "../logger";
import { getCallerInfo } from "../utils";
import { fileURLToPath } from 'url';
// Create a global symbol to track if mongoose has been patched
const MONGOOSE_PATCHED_SYMBOL = Symbol.for('node-observer:mongoose-patched');

if (process.env.NODE_OBSERVATORY_MODELS && JSON.parse(process.env.NODE_OBSERVATORY_MODELS).includes("mongoose")) {
  // Check if mongoose has already been patched
  if (!(global as any)[MONGOOSE_PATCHED_SYMBOL]) {
    // Mark mongoose as patched
    (global as any)[MONGOOSE_PATCHED_SYMBOL] = true;

    /**
     * Hook "mongoose" to patch its query and document methods.
     */
    new Hook(["mongoose"], function (exports: any, name, basedir) {
      // `exports` is the Mongoose module.
      if (!exports || typeof exports.Model !== "function") {
        console.warn("[Patch Mongoose] Could not locate Model class to patch.");
        return exports;
      }

      // Patch static methods at the Model constructor level
      const staticMethodsToPatch = [
        "create", "findOne", "find", "findById", "countDocuments",
        "updateOne", "updateMany", "deleteOne", "deleteMany", "aggregate", "findOneAndUpdate", "findOneAndDelete"
      ];

      shimmer.wrap(exports.Model.prototype, "save", function(originalSave) {
        return async function patchedSave(this: any, ...args: any[]) {
          const startTime = performance.now();

            try {
              const result = await originalSave.apply(this, args);

              const endTime = performance.now();
              logModelOperation(
                'create',
                result.__proto__.$collection.modelName,
                args,
                result.toObject(),
                parseFloat((endTime - startTime).toFixed(2)),
                undefined
              );
              return result;
            } catch (error: any) {
              // Do not log the error for the model, it should be logged as an exception since the model doesn't exist yet. 
              throw error;
            }
        };
      });

      staticMethodsToPatch.forEach(method => {
        if (typeof exports.Model[method] === "function" && !exports.Model[method].__patched) {
          shimmer.wrap(exports.Model, method, function(originalMethod) {
            async function patchedMethod(this: any, ...args: any[]) {
              const startTime = performance.now();
              
              try {
                const result = await originalMethod.apply(this, args);
                const endTime = performance.now();
                logModelOperation(
                  method,
                  this.modelName || 'Unknown',
                  args,
                  result.toJSON ? result.toJSON() : result,
                  parseFloat((endTime - startTime).toFixed(2)),
                  undefined
                );
                return result;
              } catch (error: any) {
                const endTime = performance.now();
                logModelOperation(
                  method,
                  this.modelName || 'Unknown',
                  args,
                  undefined,
                  parseFloat((endTime - startTime).toFixed(2)),
                  error
                );
                throw error;
              }
            };

            patchedMethod.__patched = true;
            return patchedMethod;
          });
        }
      });

      console.log("[Patch Mongoose] All model methods patched.");
      return exports;
    });
  } else {
    console.log("[node-observer] Mongoose already patched, skipping");
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
      package: "mongoose",
      file: callerInfo.file,
      line: callerInfo.line,
      error: error ? error.toString() : undefined,
      status: error ? "failed" : "completed"
    };
    watchers.model.addContent(modelLogEntry);
  }