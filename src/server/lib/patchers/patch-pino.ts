/** @format */

import { Hook } from "require-in-the-middle";
import shimmer from "shimmer";
import { watchers } from "../logger";
import { getCallerInfo } from "../utils";
import { fileURLToPath } from 'url';
const PINO_PATCHED_SYMBOL = Symbol.for('node-observer:pino-patched');

if (process.env.NODE_OBSERVATORY_LOGGING && JSON.parse(process.env.NODE_OBSERVATORY_LOGGING).includes("pino")) {
  if (!(global as any)[PINO_PATCHED_SYMBOL]) {
    (global as any)[PINO_PATCHED_SYMBOL] = true;

    new Hook(["pino"], function (
      exports: any,
      name: string,
      basedir: string | undefined
    ): any {
      // The `exports` here is the top-level function from "pino".
      // We can wrap that function to intercept any Pino logger creation.

      const originalPino = exports;

      function patchLoggerMethods(loggerInstance: any, contextMetadata = {}) {
        ["info", "warn", "error", "debug", "trace", "fatal"].forEach((method) => {
          if (typeof loggerInstance[method] === "function") {
            shimmer.wrap(loggerInstance, method, function (originalMethod) {
              return function patchedMethod(this: any, ...logArgs: any) {
                const callerInfo = getCallerInfo(fileURLToPath(import.meta.url));

                // Include the context metadata in the log content
                watchers.logging.addContent({
                  package: "pino",
                  level: method,
                  message: logArgs[0],
                  metadata: logArgs[1] || {},
                  context: contextMetadata, // Include the child logger's context
                  file: callerInfo.file,
                  line: callerInfo.line,
                });

                return originalMethod.apply(this, logArgs);
              };
            });
          }
        });

        // Patch the child method to handle nested child loggers
        if (typeof loggerInstance.child === "function") {
          shimmer.wrap(loggerInstance, "child", function (originalChild) {
            return function patchedChild(this: any, childBindings: any, ...rest: any[]) {
              const childLogger = originalChild.call(this, childBindings, ...rest);
              // Merge parent and child context
              const mergedContext = {
                ...contextMetadata,
                ...childBindings
              };
              // Patch the child logger's methods with the merged context
              patchLoggerMethods(childLogger, mergedContext);
              return childLogger;
            };
          });
        }
      }

      function patchedPino(...args: any[]) {
        const loggerInstance = originalPino(...args);
        patchLoggerMethods(loggerInstance);
        return loggerInstance;
      }

      // Copy over any properties from the original pino
      Object.assign(patchedPino, originalPino);

      console.log("[node-observer] Pino successfully patched");
      return patchedPino;
    });
  } else {
    console.log("[node-observer] Pino already patched, skipping");
  }
}
