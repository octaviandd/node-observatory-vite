/** @format */

import { Hook } from "require-in-the-middle";
import shimmer from "shimmer";
import { watchers } from "../logger";
import { getCallerInfo } from "../utils";
import { fileURLToPath } from 'url';
// Create a global symbol to track if argparse has been patched
const ARGPARSE_PATCHED_SYMBOL = Symbol.for('node-observer:argparse-patched');

if (process.env.NODE_OBSERVATORY_COMMANDS && JSON.parse(process.env.NODE_OBSERVATORY_COMMANDS).includes("argparse")) {
  // Check if argparse has already been patched
  if (!(global as any)[ARGPARSE_PATCHED_SYMBOL]) {
    // Mark argparse as patched
    (global as any)[ARGPARSE_PATCHED_SYMBOL] = true;

  /**
   * Hook "argparse" to patch its argument parsing functionality.
   */
  new Hook(["argparse"], function (exports:any, name, basedir) {
    // `exports` is the object or class returned by require("argparse").
    if (!exports || typeof exports.ArgumentParser !== "function") {
      console.warn("[Patch argparse] Could not locate ArgumentParser class to patch.");
      return exports;
    }

    shimmer.wrap(exports.ArgumentParser.prototype, "parseArgs", function (originalParseArgsFn) {
      return function patchedParseArgs(this: any, ...args: any[]) {
        const callerInfo = getCallerInfo(fileURLToPath(import.meta.url));

        const logContent = {
          package: "argparse",
          method: "parseArgs",
          arguments: args,
          file: callerInfo.file,
          line: callerInfo.line
        };

        // Log the parsing operation
        watchers.cli.addContent(logContent);

        // Call the original parseArgs method
        return originalParseArgsFn.apply(this, args);
      };
    });

    shimmer.wrap(exports.ArgumentParser.prototype, "addArgument", function (originalAddArgumentFn) {
      return function patchedAddArgument(this: any, ...args: any[]) {
        const callerInfo = getCallerInfo(fileURLToPath(import.meta.url));

        const logContent = {
          package: "argparse",
          method: "addArgument",
          arguments: args,
          file: callerInfo.file,
          line: callerInfo.line
        };

        // Log the argument addition
        watchers.cli.addContent(logContent);

        // Call the original addArgument method
        return originalAddArgumentFn.apply(this, args);
      };
    });

    console.log("[Patch argparse] Methods patched.");

    // Return the patched argparse module
    return exports;
  });

  } else {
    console.log("[node-observer] Argparse already patched, skipping");
  }
}
