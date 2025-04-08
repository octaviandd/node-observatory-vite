/** @format */

import { Hook } from "require-in-the-middle";
import shimmer from "shimmer";
import { watchers } from "../logger";
import { getCallerInfo } from "../utils";
import { fileURLToPath } from 'url';
// Create a global symbol to track if minimist has been patched
const MINIMIST_PATCHED_SYMBOL = Symbol.for('node-observer:minimist-patched');

if (process.env.NODE_OBSERVATORY_COMMANDS && JSON.parse(process.env.NODE_OBSERVATORY_COMMANDS).includes("minimist")) {
  // Check if minimist has already been patched
  if (!(global as any)[MINIMIST_PATCHED_SYMBOL]) {
    // Mark minimist as patched
    (global as any)[MINIMIST_PATCHED_SYMBOL] = true;

    /**
     * Hook "minimist" to patch its argument parsing functionality.
     */
    new Hook(["minimist"], function (exports: any, name, basedir) {
      // `exports` is the function returned by require("minimist").
      if (typeof exports !== "function") {
        console.warn("[Patch minimist] Could not locate minimist function to patch.");
        return exports;
      }

      shimmer.wrap(exports, "default", function (originalMinimistFn) {
        return function patchedMinimist(this: any, ...args: any[]) {
          const callerInfo = getCallerInfo(fileURLToPath(import.meta.url));

          const logContent = {
            package: "minimist",
            method: "parse",
            arguments: args,
          };

          // Log the parsing operation
          watchers.cli.addContent(logContent);

          // Call the original minimist function
          return originalMinimistFn.apply(this, args);
        };
      });

      console.log("[Patch minimist] Parsing function patched.");
      return exports;
    });
  } else {
    console.log("[node-observer] Minimist already patched, skipping");
  }
}
