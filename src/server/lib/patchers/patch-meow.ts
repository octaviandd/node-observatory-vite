/** @format */

import { Hook } from "require-in-the-middle";
import shimmer from "shimmer";
import { watchers } from "../logger";

// Create a global symbol to track if meow has been patched
const MEOW_PATCHED_SYMBOL = Symbol.for('node-observer:meow-patched');

if (process.env.NODE_OBSERVATORY_COMMANDS && JSON.parse(process.env.NODE_OBSERVATORY_COMMANDS).includes("meow")) {
  // Check if meow has already been patched
  if (!(global as any)[MEOW_PATCHED_SYMBOL]) {
    // Mark meow as patched
    (global as any)[MEOW_PATCHED_SYMBOL] = true;

    /**
     * Hook "meow" to patch its argument parsing functionality.
     */
    new Hook(["meow"], function (exports: any, name, basedir) {
      // `exports` is the function or object returned by require("meow").
      if (typeof exports !== "function") {
        console.warn("[Patch meow] Could not locate meow function to patch.");
        return exports;
      }

      shimmer.wrap(exports, "default", function (originalMeowFn) {
        return function patchedMeow(this: any, ...args: any[]) {
          const cli = originalMeowFn.apply(this, args);

          const logContent = {
            package: "meow",
            method: "parse",
            arguments: args,
            flags: cli.flags,
            input: cli.input,
          };

          // Log the CLI parsing operation
          watchers.cli.addContent(logContent);

          return cli;
        };
      });

      console.log("[Patch meow] Parsing function patched.");
      return exports;
    });
  } else {
    console.log("[node-observer] Meow already patched, skipping");
  }
}
