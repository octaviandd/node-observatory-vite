/** @format */

import { Hook } from "require-in-the-middle";
import shimmer from "shimmer";
import { watchers } from "../logger";
import { getCallerInfo } from "../utils";
import { fileURLToPath } from 'url';

const SIGNALE_PATCHED_SYMBOL = Symbol.for('node-observer:signale-patched');

if (process.env.NODE_OBSERVATORY_LOGGING && JSON.parse(process.env.NODE_OBSERVATORY_LOGGING).includes("signale")) {
  if (!(global as any)[SIGNALE_PATCHED_SYMBOL]) {
    (global as any)[SIGNALE_PATCHED_SYMBOL] = true;

    new Hook(["signale"], function (exports: any, name, basedir) {

      if (!exports || typeof exports !== "object") {
        console.warn("[Patch signale] Could not locate Signale class to patch.");
        return exports;
      }

      const OriginalSignale = exports.Signale;

      shimmer.wrap(OriginalSignale.prototype, '_logger', function wrapLogger(originalLogger) {
        return function patchedLogger(this: any, type: any, ...args: any[]) {
          const callerInfo = getCallerInfo(fileURLToPath(import.meta.url));

          const logContent = {
            package: "signale",
            level: type,
            message: args[0],
            file: callerInfo.file,
            line: callerInfo.line,
          };

          watchers.logging.addContent(logContent);
          return originalLogger.call(this, type, ...args);
        };
      });

      console.log("[Patch signale] Methods patched.");
      return exports;
    });
  } else {
    console.log("[node-observer] Signale already patched, skipping");
  }
}