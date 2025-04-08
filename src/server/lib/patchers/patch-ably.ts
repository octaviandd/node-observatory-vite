/** @format */

import { Hook } from "require-in-the-middle";
import shimmer from "shimmer";
import { watchers } from "../logger";
import { getCallerInfo } from "../utils";
import { fileURLToPath } from 'url';

// Create a global symbol to track if ably has been patched
const ABLY_PATCHED_SYMBOL = Symbol.for('node-observer:ably-patched');

const channelMethodsToPatch = [
  'publish',
  // 'subscribe',
  // 'unsubscribe',
  // 'presence',
] as const;

const presenceMethodsToPatch = [
  'enter',
  'update',
  'leave',
  'get',
  'subscribe'
] as const;

const historyMethodsToPatch = [
  'history',
  'presenceHistory'
] as const;

if (process.env.NODE_OBSERVATORY_NOTIFICATIONS && JSON.parse(process.env.NODE_OBSERVATORY_NOTIFICATIONS).includes("ably")) {
  // Check if ably has already been patched
  if (!(global as any)[ABLY_PATCHED_SYMBOL]) {
    // Mark ably as patched
    (global as any)[ABLY_PATCHED_SYMBOL] = true;

    /**
     * Hook "ably" to patch its connection and event handling.
     */
    new Hook(["ably"], function (exports: any, name, basedir) {
      if (!exports || (typeof exports.Realtime !== "function" && typeof exports.Rest !== "function")) {
        console.warn("[Patch ably] Could not locate Realtime or Rest class to patch.");
        return exports;
      }

      // Patch the Realtime constructor
      if (typeof exports.Realtime === "function") {
        shimmer.wrap(exports, "Realtime", function (OriginalRealtime) {
          return function PatchedRealtime(this: any, options: any) {
            const realtime = new OriginalRealtime(options);

            if (realtime.channels && typeof realtime.channels.get === "function") {
              shimmer.wrap(realtime.channels, "get", function(originalGet) {
                return function patchedGet(this: any, channelName: string, channelOptions?: any) {
                  const channel = arguments.length > 1 ? originalGet.call(this, channelName, channelOptions) : originalGet.call(this, channelName);

                  patchObject(channel, channelMethodsToPatch, {
                    mode: "realtime",
                    channel: channelName
                  });

                  return channel;
                };
              });
            }

            return realtime;
          };
        });
      }

      // Patch the Rest constructor
      if (typeof exports.Rest === "function") {
        shimmer.wrap(exports, "Rest", function (OriginalRest) {
          return function PatchedRest(this: any, options: any) {
            const rest = new OriginalRest(options);

            if (rest.channels && typeof rest.channels.get === "function") {
              shimmer.wrap(rest.channels, "get", function(originalGet) {
                return function patchedGet(this: any, channelName: string, channelOptions?: any) {
                  const channel = arguments.length > 1 ? originalGet.call(this, channelName, channelOptions) : originalGet.call(this, channelName);

                  patchObject(channel, channelMethodsToPatch, {
                    mode: "rest",
                    channel: channelName
                  });

                  return channel;
                };
              });
            }

            return rest;
          };
        });
      }

      console.log("[Patch ably] Realtime and Rest clients patched.");
      return exports;
    });
  } else {
    console.log("[node-observer] Ably already patched, skipping");
  }
}


function wrapMethod(original: Function, methodName: string, context: any = {}) {
  return async function wrapped(this: any, ...args: any[]) {
    const startTime = performance.now();
    const callerInfo = getCallerInfo(fileURLToPath(import.meta.url));

    const logData: { [key: string]: any } = {
      package: "ably",
      method: methodName,
      mode: context.mode || "realtime",
      channel: context.channel,
      event: (methodName === 'publish' && args.length > 0) ? args[0] : undefined,
      data: (methodName === 'publish' && args.length > 1) ? args[1] : args[0],
      options: (methodName === 'publish' && args.length > 2) ? args[2] : null,
      file: callerInfo.file,
      line: callerInfo.line,
    };

    try {
      const result = await original.apply(this, args);
      const endTime = performance.now();

      watchers.notifications.addContent({
        ...logData,
        status: "completed",
        response: result,
        duration: parseFloat((endTime - startTime).toFixed(2)),
        error: null
      });

      return result;
    } catch (error: any) {
      const endTime = performance.now();

      watchers.notifications.addContent({
        ...logData,
        status: "failed",
        error: error instanceof Error ? error.message : String(error),
        response: null,
        duration: parseFloat((endTime - startTime).toFixed(2)),
      });

      throw error;
    }
  };
}

function patchObject(obj: any, methods: readonly string[], context: any = {}) {
  for (const method of methods) {
    if (typeof obj[method] === 'function' && !obj[`_${method}Patched`]) {
      shimmer.wrap(obj, method, function(original) {
        if (typeof original !== 'function') return original;
        return wrapMethod(original, method, context);
      });
      obj[`_${method}Patched`] = true;
      console.log(`[Patch ably] Patched ${context.mode} channel '${context.channel}' method: ${method}`);
    }
  }
}