/** @format */

import { Hook } from "require-in-the-middle";
import shimmer from "shimmer";
import { watchers } from "../logger";
import { getCallerInfo } from "../utils";
import { fileURLToPath } from 'url';

const ROARR_PATCHED_SYMBOL = Symbol.for('node-observer:roarr-patched');

if (process.env.NODE_OBSERVATORY_LOGGING && JSON.parse(process.env.NODE_OBSERVATORY_LOGGING).includes("roarr")) {
  if (!(global as any)[ROARR_PATCHED_SYMBOL]) {
    (global as any)[ROARR_PATCHED_SYMBOL] = true;

   
    new Hook(["roarr"], function (exports: any, name, basedir) {
      if (!exports || typeof exports !== "object") {
        console.warn("[Patch roarr] Could not locate roarr to patch.");
        return exports;
      }

      const methods = ["child", "error", "warn", "info", "debug", "trace"];

      methods.forEach((method) => {
        shimmer.wrap(exports.Roarr, method, function (originalMethod) {
          return function patchedMethod(this: any, ...args: any[]) {
            const callerInfo = getCallerInfo(fileURLToPath(import.meta.url));

            if (typeof args[0] === 'string') {
              const logContent = {
                package: "roarr",
                level: method,
                message: args[0],
                file: callerInfo.file,
                line: callerInfo.line,
              };

              watchers.logging.addContent(logContent);
            }

            return originalMethod.apply(this, args);
          };
        });

        console.log(`[Patch roarr] ${method.toUpperCase()} method patched.`);
      });

      // The direct logging via roarr('hit') is not working
      shimmer.wrap(exports.Roarr, "child", function (originalChildFn) {
        return function patchedChild(this: any, ...args: any[]) {
          const childLogger = (originalChildFn as Function).apply(this, args);

          // Wrap the child logger methods
          shimmer.wrap(childLogger, "log", function (originalLogMethod) {
            return function patchedChildLogMethod(this: any, ...logArgs: any[]) {
              const callerInfo = getCallerInfo(fileURLToPath(import.meta.url));
              const logContent = {
                package: "roarr",
                level: "log",
                message: logArgs[0],
                file: callerInfo.file,
                line: callerInfo.line,
              };

              // Log the message content
              watchers.logger.addContent(logContent);

              // Call the original log method
              return originalLogMethod.apply(this, logArgs);
            };
          });

          return childLogger;
        };
      });

      console.log("[Patch roarr] Methods patched.");
      return exports;
    });

  } else {
    console.log("[node-observer] Roarr already patched, skipping");
  }
}
