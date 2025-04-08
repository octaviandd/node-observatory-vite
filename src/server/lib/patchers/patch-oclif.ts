/** @format */

import { Hook } from "require-in-the-middle";
import shimmer from "shimmer";
import { watchers } from "../logger";
import { getCallerInfo } from "../utils";
import { fileURLToPath } from 'url';

const OCLIF_PATCHED_SYMBOL = Symbol.for('node-observer:oclif-patched');

if (process.env.NODE_OBSERVATORY_COMMANDS && JSON.parse(process.env.NODE_OBSERVATORY_COMMANDS).includes("oclif")) {
  if (!(global as any)[OCLIF_PATCHED_SYMBOL]) {
    (global as any)[OCLIF_PATCHED_SYMBOL] = true;

    /**
     * Hook "oclif" to patch its command registration and execution functionality.
     */
    new Hook(["@oclif/core"], function (exports: any, name, basedir) {
      // `exports` is the object returned by require("@oclif/core").
      if (!exports || typeof exports.Command !== "function") {
        console.warn("[Patch oclif] Could not locate Command class to patch.");
        return exports;
      }

      const CommandClass = exports.Command;

      // Wrap the `run` method to log command execution
      shimmer.wrap(CommandClass.prototype, "run", function (originalRunFn) {
        return async function patchedRun(this: any, ...args: any[]) {
          const callerInfo = getCallerInfo(fileURLToPath(import.meta.url));
          const logContent = {
            package: "oclif",
            method: "run",
            command: this.id || "unknown",
            arguments: args,
            file: callerInfo.file,
            line: callerInfo.line,
          };

          // Log the command execution
          watchers.command.addContent(logContent);

          try {
            // Call the original run method
            return await originalRunFn.apply(this, args);
          } catch (error: any) {
            // Log any errors
            watchers.command.addContent(logContent);
            throw error;
          }
        };
      });

      // Wrap the `init` method to log initialization
      shimmer.wrap(CommandClass.prototype, "init", function (originalInitFn) {
        return async function patchedInit(this: any, ...args: any) {
          const callerInfo = getCallerInfo(fileURLToPath(import.meta.url));
          const logContent = {
            package: "oclif",
            method: "init",
            command: this.id || "unknown",
            arguments: args,
            file: callerInfo.file,
            line: callerInfo.line,
          };

          // Log the initialization
          watchers.command.addContent(logContent);

          // Call the original init method
          return originalInitFn.apply(this, args);
        };
      });

      console.log("[Patch oclif] Command methods patched.");
      return exports;
    });
  } else {
    console.log("[node-observer] Oclif already patched, skipping");
  }
}