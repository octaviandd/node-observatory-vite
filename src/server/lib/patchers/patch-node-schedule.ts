/** @format */

import { Hook } from "require-in-the-middle";
import shimmer from "shimmer";
import { watchers } from "../logger";
import { v4 as uuidv4 } from "uuid";
import { getCallerInfo } from "../utils";
import { fileURLToPath } from 'url';

const NODESCHEDULE_PATCHED_SYMBOL = Symbol.for('node-observer:nodeschedule-patched');

const METHODS = ["scheduleJob", "rescheduleJob", "cancelJob", "cancelNext"];

if (process.env.NODE_OBSERVATORY_SCHEDULER && JSON.parse(process.env.NODE_OBSERVATORY_SCHEDULER).includes("node-schedule")) {
  if (!(global as any)[NODESCHEDULE_PATCHED_SYMBOL]) {
    (global as any)[NODESCHEDULE_PATCHED_SYMBOL] = true;

    new Hook(["node-schedule"], function (exports, name, basedir) {
      shimmer.wrap(
        exports as any,
        "scheduleJob",
        function (originalScheduleJob: Function) {
          return function patchedScheduleJob(
            this: any,
            name: string | null,
            rule: any,
            task: Function
          ) {
            const scheduleId = uuidv4();
            const callerInfo = getCallerInfo(fileURLToPath(import.meta.url));
            watchers.scheduler.addContent({
              type: "set",
              package: "node-schedule",
              name,
              rule,
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
                package: "node-schedule",
                name,
                args,
                scheduleId,
                jobId,
              });

              try {
                const result = task.apply(this, args);

                const endTime = performance.now();
                const duration = parseFloat((endTime - startTime).toFixed(2));
                watchers.scheduler.addContent({
                  type: "processJob",
                  status: "completed",
                  package: "node-schedule",
                  name,
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
                  package: "node-schedule",
                  name,
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

            const job = originalScheduleJob.call(this, name, rule, wrappedTask);
          
            if (job) {
              if (typeof job.cancel === 'function') {
                shimmer.wrap(
                  job,
                  'cancel',
                  function (originalCancel: Function) {
                    return function patchedCancel(this: any, ...args: any[]) {
                      const callerInfo = getCallerInfo(fileURLToPath(import.meta.url));
                      watchers.scheduler.addContent({
                        type: "cancel",
                        package: "node-schedule",
                        name: job.name,
                        scheduleId,
                        file: callerInfo.file,
                        line: callerInfo.line,
                      });
                    
                      return originalCancel.apply(this, args);
                    };
                  }
                );
              }
            
              // Patch reschedule method
              if (typeof job.reschedule === 'function') {
                shimmer.wrap(
                  job,
                  'reschedule',
                  function (originalReschedule: Function) {
                    return function patchedReschedule(this: any, spec: any, ...args: any[]) {
                      const callerInfo = getCallerInfo(fileURLToPath(import.meta.url));
                      watchers.scheduler.addContent({
                        type: "reschedule",
                        package: "node-schedule",
                        name: job.name,
                        newRule: spec,
                        scheduleId,
                        file: callerInfo.file,
                        line: callerInfo.line,
                      });
                    
                      return originalReschedule.apply(this, [spec, ...args]);
                    };
                  }
                );
              }
            
              // Patch nextInvocation method
              if (typeof job.nextInvocation === 'function') {
                shimmer.wrap(
                  job,
                  'nextInvocation',
                  function (originalNextInvocation: Function) {
                    return function patchedNextInvocation(this: any, ...args: any[]) {
                      const result = originalNextInvocation.apply(this, args);
                    
                      const callerInfo = getCallerInfo(fileURLToPath(import.meta.url));
                      watchers.scheduler.addContent({
                        type: "nextInvocation",
                        package: "node-schedule",
                        name: job.name,
                        nextInvocation: result ? result.toISOString() : null,
                        scheduleId,
                        file: callerInfo.file,
                        line: callerInfo.line,
                      });
                    
                      return result;
                    };
                  }
                );
              }
            }

            console.log("[Patch node-schedule] scheduleJob method patched.");
            return job;
          };
        }
      );

      // Patch other methods for logging
      METHODS.forEach((method) => {
        if (
          method !== "scheduleJob" &&
          typeof (exports as any)[method] === "function"
        ) {
          shimmer.wrap(exports as any, method, function (originalFn: Function) {
            return function patchedMethod(this: any, ...args: any[]) {
              const callerInfo = getCallerInfo(fileURLToPath(import.meta.url));
              watchers.scheduler.addContent({
                type: method,
                package: "node-schedule",
                data: args,
                file: callerInfo.file,
                line: callerInfo.line,
              });

              return originalFn.apply(this, args);
            };
          });
          console.log(`[Patch node-schedule] '${method}' method patched.`);
        }
      });

      console.log("[node-observer] Node-schedule successfully patched");
      return exports;
    });
  } else {
    console.log("[node-observer] Node-schedule already patched, skipping");
  }
}