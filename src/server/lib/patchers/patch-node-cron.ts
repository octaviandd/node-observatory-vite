/** @format */

import { Hook } from "require-in-the-middle";
import shimmer from "shimmer";
import { watchers } from "../logger";
import { v4 as uuidv4 } from "uuid";
import { getCallerInfo } from "../utils";
import { fileURLToPath } from 'url';

const NODECRON_PATCHED_SYMBOL = Symbol.for('node-observer:nodecron-patched');

const METHODS = ["schedule", "validate", "getTasks"];

if (process.env.NODE_OBSERVATORY_SCHEDULER && JSON.parse(process.env.NODE_OBSERVATORY_SCHEDULER).includes("node-cron")) {
  if (!(global as any)[NODECRON_PATCHED_SYMBOL]) {
    (global as any)[NODECRON_PATCHED_SYMBOL] = true;

    new Hook(["node-cron"], function (exports, name, basedir) {
      shimmer.wrap(
        exports as any,
        "schedule",
        function (originalSchedule: Function) {
          return function patchedSchedule(
            this: any,
            cronExpression: string,
            task: Function,
            options?: any
          ) {
            const scheduleId = uuidv4();
            const callerInfo = getCallerInfo(fileURLToPath(import.meta.url));
            watchers.scheduler.addContent({
              type: "set",
              package: "node-cron",
              cronExpression,
              options,
              scheduleId,
              file: callerInfo.file,
              line: callerInfo.line,
            });

            // Wrap the task to log execution time and handle errors
            const wrappedTask = function (this: any, ...args: any[]) {
              const jobId = uuidv4();
              const startTime = performance.now();
              watchers.scheduler.addContent({
                type: "run",
                package: "node-cron",
                cronExpression,
                args,
                scheduleId,
                jobId,
                file: callerInfo.file,
                line: callerInfo.line,
              });

              try {
                const result = task.apply(this, args);

                const endTime = performance.now();
                const duration = parseFloat((endTime - startTime).toFixed(2));
                watchers.scheduler.addContent({
                  type: "processJob",
                  status: "completed",
                  package: "node-cron",
                  cronExpression,
                  duration,
                  scheduleId,
                  jobId,
                  file: callerInfo.file,
                  line: callerInfo.line,
                });

                return result;
              } catch (error: any) {
                const endTime = performance.now();
                const duration = parseFloat((endTime - startTime).toFixed(2));
                watchers.scheduler.addContent({
                  type: "processJob",
                  status: "failed",
                  package: "node-cron",
                  cronExpression,
                  duration,
                  scheduleId,
                  jobId,
                  error: error instanceof Error ? error.message : String(error),
                  file: callerInfo.file,
                  line: callerInfo.line,
                });

                throw error;
              }
            };

            // Call the original `schedule` method with the wrapped task
            const scheduledTask = originalSchedule.call(
              this,
              cronExpression,
              wrappedTask,
              options
            );
          
            // Patch the stop method on the returned scheduled task
            if (scheduledTask && typeof scheduledTask.stop === 'function') {
              shimmer.wrap(
                scheduledTask,
                'stop',
                function (originalStop: Function) {
                  return function patchedStop(this: any, ...args: any[]) {
                    const callerInfo = getCallerInfo(fileURLToPath(import.meta.url));
                    // Log the stop action
                    watchers.scheduler.addContent({
                      type: "stop",
                      package: "node-cron",
                      cronExpression,
                      scheduleId,
                      timestamp: new Date().toISOString(),
                      file: callerInfo.file,
                      line: callerInfo.line,
                    });
                  
                    // Call the original stop method
                    return originalStop.apply(this, args);
                  };
                }
              );
            }
          
            console.log("[Patch node-cron] schedule method patched.");
            return scheduledTask;
          };
        }
      );

      // Patch the `validate` and `getTasks` methods for logging
      METHODS.forEach((method) => {
        if (
          method !== "schedule" &&
          typeof (exports as any)[method] === "function"
        ) {
          shimmer.wrap(exports as any, method, function (originalFn: Function) {
            return function patchedMethod(this: any, ...args: any[]) {
              const callerInfo = getCallerInfo(fileURLToPath(import.meta.url));
              watchers.scheduler.addContent({
                type: method,
                package: "node-cron",
                data: args,
                timestamp: new Date().toISOString(),
                file: callerInfo.file,
                line: callerInfo.line,
              });

              return originalFn.apply(this, args);
            };
          });
          console.log(`[Patch node-cron] '${method}' method patched.`);
        }
      });

      console.log("[node-observer] Node-cron successfully patched");
      return exports;
    });
  } else {
    console.log("[node-observer] Node-cron already patched, skipping");
  }
}
