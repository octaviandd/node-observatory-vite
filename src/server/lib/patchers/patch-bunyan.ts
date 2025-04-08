/** @format */

import { Hook } from "require-in-the-middle";
import shimmer from "shimmer";
import { watchers } from "../logger";
import { getCallerInfo } from "../utils";
import { fileURLToPath } from 'url';
// Create a global symbol to track if bunyan has been patched
const BUNYAN_PATCHED_SYMBOL = Symbol.for('node-observer:bunyan-patched');

if (process.env.NODE_OBSERVATORY_LOGGING && JSON.parse(process.env.NODE_OBSERVATORY_LOGGING).includes("bunyan")) {
// Check if bunyan has already been patched
if (!(global as any)[BUNYAN_PATCHED_SYMBOL]) {
  // Mark bunyan as patched
  (global as any)[BUNYAN_PATCHED_SYMBOL] = true;

  // Intercepts loading of "bunyan"
  new Hook(["bunyan"], function (exports, name, basedir) {
    // The `exports` object is the "bunyan" module.
    // We'll wrap "createLogger" to patch its returned loggers.

    function patchLoggerMethods(loggerInstance: any, contextMetadata = {}) {
      ["info", "warn", "error", "debug", "trace", "fatal"].forEach((method) => {
        if (typeof loggerInstance[method] === "function") {
          shimmer.wrap(loggerInstance, method, function (originalMethod) {
            return function patchedMethod(this: any, ...args: any[]) {
              const callerInfo = getCallerInfo(fileURLToPath(import.meta.url));

              watchers.logging.addContent({
                level: method,
                package: "bunyan",
                message: args[0],
                metadata: typeof args[0] === 'object' ? args[0] : args[1] || {},
                context: contextMetadata,
                file: callerInfo.file,
                line: callerInfo.line,
              });

              return originalMethod.apply(this, args);
            };
          });
        }
        console.log(`[bunyan] patched method: ${method}`);
      });

      // Patch child method for nested loggers
      if (typeof loggerInstance.child === "function") {
        shimmer.wrap(loggerInstance, "child", function (originalChild) {
          return function patchedChild(this: any, childBindings: any) {
            const childLogger = originalChild.call(this, childBindings);
            const mergedContext = {
              ...contextMetadata,
              ...childBindings
            };
            patchLoggerMethods(childLogger, mergedContext);
            return childLogger;
          };
        });
      }
    }

    // 2. Patch createLogger
    shimmer.wrap(exports as any, "createLogger", function (originalFn: Function) {
      return function patchedCreateLogger(this: any, ...loggerArgs: any[]) {
        // Call the original createLogger
        const loggerInstance = originalFn.apply(this, loggerArgs);
        patchLoggerMethods(loggerInstance, loggerArgs[0] || {});
        return loggerInstance;
      };
    });

    console.log("[node-observer] Bunyan successfully patched");
    return exports;
  });
  } else {
    console.log("[node-observer] Bunyan already patched, skipping");
  }
}

