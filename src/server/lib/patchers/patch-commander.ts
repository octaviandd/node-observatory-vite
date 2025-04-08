/** @format */

import { Hook } from "require-in-the-middle";
import shimmer from "shimmer";
import { watchers } from "../logger";
import { getCallerInfo } from "../utils";
import { fileURLToPath } from 'url';
// Create a global symbol to track if commander has been patched
const COMMANDER_PATCHED_SYMBOL = Symbol.for('node-observer:commander-patched');

if (process.env.NODE_OBSERVATORY_COMMANDS && JSON.parse(process.env.NODE_OBSERVATORY_COMMANDS).includes("commander")) {
  // Check if commander has already been patched
  if (!(global as any)[COMMANDER_PATCHED_SYMBOL]) {
    // Mark commander as patched
    (global as any)[COMMANDER_PATCHED_SYMBOL] = true;

    // hook not working with import/require;

    /**
     * Hook "commander" to patch its command registration and execution methods.
     */
    new Hook(["commander"], function (exports: any, name, basedir) {
      // `exports` is the object returned by require("commander").
      if (!exports || typeof exports.Command !== "function") {
        console.warn("[Patch commander] Could not locate Command class to patch.");
        return exports;
      }

      const CommandClass = exports.Command;

      // Wrap the `command` method to log command registrations
      shimmer.wrap(CommandClass.prototype, "command", function (originalCommandFn) {
        return function patchedCommand(this: any, ...args: any[]) {
          const callerInfo = getCallerInfo(fileURLToPath(import.meta.url));

          const commandName = args[0] || "unknown";

          const logContent = {
            package: "commander",
            method: "command",
            commandName,
            arguments: args,
            file: callerInfo.file,
            line: callerInfo.line
          };

          // Log the command registration
          watchers.cli.addContent(logContent);

          // Call the original command method
          return originalCommandFn.apply(this, args);
        };
      });

      // Wrap the `action` method to log command execution
      shimmer.wrap(CommandClass.prototype, "action", function (originalActionFn) {
        return function patchedAction(this: any, handler: Function) {
          const patchedHandler = function (this: any, ...handlerArgs: any[]) {
            const callerInfo = getCallerInfo(fileURLToPath(import.meta.url));

            const logContent = {
              package: "commander",
              method: "action",
              arguments: handlerArgs,
              file: callerInfo.file,
              line: callerInfo.line
            };

            // Log the command execution
            watchers.cli.addContent(logContent);

            // Call the original handler
            return handler.apply(this, handlerArgs);
          };

          // Call the original action method with the patched handler
          return originalActionFn.call(this, patchedHandler);
        };
      });

      console.log("[Patch commander] Methods patched.");

      // Return the patched commander module
      return exports;
    });
  } else {
    console.log("[node-observer] Commander already patched, skipping");
  }
}
