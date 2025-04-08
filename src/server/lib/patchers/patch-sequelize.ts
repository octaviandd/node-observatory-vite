/** @format */

import { Hook } from "require-in-the-middle";
import shimmer from "shimmer";
import { watchers } from "../logger";
import { getCallerInfo } from "../utils";
import { fileURLToPath } from 'url';

const SEQUELIZE_PATCHED_SYMBOL = Symbol.for('node-observer:sequelize-patched');

if ((process.env.NODE_OBSERVATORY_MODELS && JSON.parse(process.env.NODE_OBSERVATORY_MODELS).includes("sequelize")) || (process.env.NODE_OBSERVATORY_QUERIES && JSON.parse(process.env.NODE_OBSERVATORY_QUERIES).includes("sequelize"))) {
  if (!(global as any)[SEQUELIZE_PATCHED_SYMBOL]) {
    (global as any)[SEQUELIZE_PATCHED_SYMBOL] = true;

    new Hook(["sequelize"], function (exports: any, name, basedir) {
      if (!exports || typeof exports !== "function") {
        console.warn("[Patch Sequelize] Could not locate Sequelize class to patch.");
        return exports;
      }

      const modelMethods = ['create', 'findAll', 'findOne', 'findByPk', 'update', 'destroy'];

      modelMethods.forEach(method => {
        shimmer.wrap(exports.Model, method, function(original: Function) {
          return async function patchedMethod(this: any, ...args: any[]) {
            const startTime = performance.now();

            try {
              const result = await original.apply(this, args);
              const endTime = performance.now();
              const duration = parseFloat((endTime - startTime).toFixed(2));

              // Log model operation
              logModelOperation(
                method,
                this.name,
                args,
                result,
                duration,
                undefined,
              );

              // The SQL query will be captured by the query patch
              return result;
            } catch (error: any) {
              const endTime = performance.now();
              const duration = parseFloat((endTime - startTime).toFixed(2));

              // Log model operation error
              logModelOperation(
                method,
                this.name,
                args,
                undefined,
                duration,
                error,
              );

              throw error;
            }
          };
        });
      });

      console.log("[Patch Sequelize] Query and Model methods patched.");
      return exports;
    });
  } else {
    console.log("[node-observer] Sequelize already patched, skipping");
  }
}

function logModelOperation(
  method: string,
  modelName: string,
  args: any[],
  result: any,
  duration: number,
  error?: Error,
) {
  const callerInfo = getCallerInfo(fileURLToPath(import.meta.url));

  const modelLogEntry = {
    method,
    modelName,
    arguments: args,
    result,
    duration,
    package: "sequelize",
    file: callerInfo.file,
    line: callerInfo.line,
    error: error ? error.toString() : undefined,
    status: error ? "failed" : "completed"
  };

  watchers.model.addContent(modelLogEntry);
}
