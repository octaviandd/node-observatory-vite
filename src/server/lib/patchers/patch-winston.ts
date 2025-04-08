/** @format */

import { Hook } from "require-in-the-middle";
import shimmer from "shimmer";
import { watchers } from "../logger";
import { getCallerInfo } from "../utils";
import { fileURLToPath } from 'url';

// Create a global symbol to track if winston has been patched
const WINSTON_PATCHED_SYMBOL = Symbol.for('node-observer:winston-patched');

if (process.env.NODE_OBSERVATORY_LOGGING && JSON.parse(process.env.NODE_OBSERVATORY_LOGGING).includes("winston")) {
  // Check if winston has already been patched
  if (!(global as any)[WINSTON_PATCHED_SYMBOL]) {
    // Mark winston as patched
    (global as any)[WINSTON_PATCHED_SYMBOL] = true;

    new Hook(["winston"], function (
      exports: any,
      name: string,
      basedir: string | undefined
    ) {
      // `exports` is the Winston module
      // We can patch Winston's logger creation functions or the default logger.

      //
      // 2. Patch `createLogger`, so every logger instance gets patched
      //
      shimmer.wrap(exports, "createLogger", function (originalCreateLogger) {
        return function patchedCreateLogger(this: any, ...loggerArgs: any[]) {
          const loggerInstance = originalCreateLogger.apply(this, loggerArgs);

          // 3. Patch logger methods like `info`, `warn`, `error`
          ["info", "warn", "error", "debug", "verbose", "silly", "log"].forEach(
            (method) => {
              if (typeof loggerInstance[method] === "function") {
                shimmer.wrap(loggerInstance, method, function (originalMethod) {
                  return function patchedMethod(this: any, ...args: any) {
                    const callerInfo = getCallerInfo(fileURLToPath(import.meta.url));

                    watchers.logging.addContent({
                      level: method,
                      package: "winston",
                      message: args[0],
                      meta: args[1] || {},
                      file: callerInfo.file,
                      line: callerInfo.line,
                    });

                    // Continue calling the original Winston method
                    return originalMethod.apply(this, args);
                  };
                });
              }
            }
          );

          return loggerInstance;
        };
      });

      //
      // 4. Patch the default logger (e.g., `winston.info(...)`) if needed
      //
      if (exports.default && typeof exports.default === "object") {
        // Winston exports a default logger with methods like info, warn, error, etc.
        ["info", "warn", "error", "debug", "verbose", "silly", "log"].forEach(
          (method) => {
            if (typeof exports.default[method] === "function") {
              shimmer.wrap(exports.default, method, function (originalMethod) {
                return function patchedMethod(this: any, ...args: any) {
                  const callerInfo = getCallerInfo(fileURLToPath(import.meta.url));

                  watchers.logging.addContent({
                    level: method,
                    package: "winston",
                    message: args[0],
                    meta: args[1] || {},
                    file: callerInfo.file,
                    line: callerInfo.line,
                  });

                  return originalMethod.apply(this, args);
                };
              });
            }
          }
        );
      }

      console.log("[node-observer] Winston successfully patched");
      return exports;
    });
  } else {
    console.log("[node-observer] Winston already patched, skipping");
  }
}
