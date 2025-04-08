/** @format */

import { Hook } from "require-in-the-middle";
import shimmer from "shimmer";
import { watchers } from "../logger";
import { getCallerInfo } from "../utils";
import { fileURLToPath } from 'url';

// Create a global symbol to track if yargs has been patched
const YARGS_PATCHED_SYMBOL = Symbol.for('node-observer:yargs-patched');

/**
 * Hook "yargs" to patch its command registration and execution methods.
 */
// Check if yargs has already been patched
if (process.env.NODE_OBSERVATORY_CLI && JSON.parse(process.env.NODE_OBSERVATORY_CLI).includes("yargs")) {
  if (!(global as any)[YARGS_PATCHED_SYMBOL]) {
    // Mark yargs as patched
    (global as any)[YARGS_PATCHED_SYMBOL] = true;

    new Hook(["yargs"], function (exports: any, name, basedir) {
      // `exports` is the function or object returned by require("yargs").
      if (!exports || typeof exports.command !== "function") {
        console.warn("[Patch yargs] Could not locate command method to patch.");
        return exports;
      }

      // Wrap the `command` method to log command registrations
      shimmer.wrap(exports, "command", function (originalCommandFn) {
        return function patchedCommand(this: any, ...args: any[]) {
          const commandName = args[0] || "unknown";
          const callerInfo = getCallerInfo(fileURLToPath(import.meta.url));
          const logContent = {
            package: "yargs",
            method: "command",
            commandName,
            arguments: args,
            file: callerInfo.file,
            line: callerInfo.line,
          };

          // Log the command registration
          watchers.command.addContent(logContent);

          // Call the original command method
          return originalCommandFn.apply(this, args);
        };
      });

      // Wrap the `middleware` method to log middleware execution
      shimmer.wrap(
        exports,
        "middleware",
        function (originalMiddlewareFn: Function) {
          return function patchedMiddleware(
            this: any,
            middleware: any,
            applyBeforeValidation: any
          ) {
            const callerInfo = getCallerInfo(fileURLToPath(import.meta.url));
            const patchedMiddleware = function (this: any, ...middlewareArgs: any) {
              const logContent = {
                time: new Date(),
                package: "yargs",
                method: "middleware",
                arguments: middlewareArgs,
                file: callerInfo.file,
                line: callerInfo.line,
              };

              // Log the middleware execution
              watchers.command.addContent(logContent);

              // Call the original middleware
              return middleware(...middlewareArgs);
            };

            // Call the original middleware method with the patched middleware
            return originalMiddlewareFn.call(
              this,
              patchedMiddleware,
              applyBeforeValidation
            );
          };
        }
      );

      // Wrap the `parse` method to log command execution
      shimmer.wrap(exports, "parse", function (originalParseFn) {
        return function patchedParse(this: any, ...args: any[]) {
          const logContent = {
            package: "yargs",
            method: "parse",
            arguments: args,
          };

          // Log the parse operation
          watchers.command.addContent(logContent);

          // Call the original parse method
          return originalParseFn.apply(this, args);
        };
      });

      console.log("[Patch yargs] Methods patched.");
      return exports;
    });
  } else {
    console.log("[node-observer] Yargs already patched, skipping");
  }
}