/** @format */

import { Hook } from "require-in-the-middle";
import shimmer from "shimmer";
import { watchers } from "../logger";
import { getCallerInfo } from "../utils";
import { v4 as uuidv4 } from "uuid";
import { fileURLToPath } from 'url';
// Create a global symbol to track if agenda has been patched
const AGENDA_PATCHED_SYMBOL = Symbol.for('node-observer:agenda-patched');

if (process.env.NODE_OBSERVATORY_JOBS && JSON.parse(process.env.NODE_OBSERVATORY_JOBS).includes("agenda")) {
  // Check if agenda has already been patched
  if (!(global as any)[AGENDA_PATCHED_SYMBOL]) {
    // Mark agenda as patched
    (global as any)[AGENDA_PATCHED_SYMBOL] = true;

    // The Agenda methods we want to intercept
    const METHODS_TO_PATCH = {
      schedule: "schedule",
      cancel: "cancel",
      create: "create",
      purge: "purge",
      scheduleJob: "scheduleJob",
      now: "now",
      saveJob: "saveJob",
      define: "define",
    };

    /**
     * Hook into "agenda" so that when `require("agenda")` is called,
     * we can patch its prototype methods.
     */
    new Hook(["agenda"], function (
      exports: any,
      name: string,
      basedir: string | undefined
    ) {
      // Agenda typically exports a class, so let's access its prototype
      if (exports && exports.prototype) {
        const AgendaProto = exports.prototype;

        Object.entries(METHODS_TO_PATCH).forEach(([methodName, displayName]) => {
          if (typeof AgendaProto[methodName] === "function") {
            shimmer.wrap(AgendaProto, methodName, function (originalFn) {
              return async function patchedAgendaMethod(this: any, ...args: any[]) {
                const callerInfo = getCallerInfo(fileURLToPath(import.meta.url));

                let result;
                let didFail = false;
                let failReason;

                // ───── Log when a job is scheduled ─────
                if (methodName === "schedule" || methodName === "scheduleJob") {
                  const jobData = args[1];
                  watchers.jobs.addContent({
                    status: "scheduled",
                    method: displayName,
                    queue: this.name,
                    jobData,
                    token: this.token,
                    file: callerInfo.file,
                    line: callerInfo.line,
                    package: "agenda",
                  });
                }

                // ───── Log when a job is created ─────
                if (methodName === "create" && args[0]) {
                  const jobName = args[0];
                  const jobData = args[1] || {};
                  watchers.jobs.addContent({
                    status: "started",
                    method: displayName,
                    queue: this.name,
                    connectionName: this._collection?.dbName || "default",
                    jobData,
                    jobId: args[0]?.attrs?._id || uuidv4(),
                    token: this.token,
                    file: callerInfo.file,
                    line: callerInfo.line,
                    package: "agenda",
                  });
                }

                // ───── Log when a job is started immediately ─────
                if (methodName === "now" && args[0]) {
                  const jobName = args[0];
                  const jobData = args[1] || {};
                  watchers.jobs.addContent({
                    status: "started",
                    method: displayName,
                    queue: this.name,
                    connectionName: this._collection?.dbName || "default",
                    jobData,
                    jobId: args[0]?.attrs?._id || uuidv4(),
                    token: this.token,
                    file: callerInfo.file,
                    line: callerInfo.line,
                    package: "agenda",
                  });
                }

                try {
                  // Call the original function
                  result = await originalFn.apply(this, args);
                  return result;
                } catch (err: any) {
                  didFail = true;
                  failReason = err?.message || err;
                  throw err;
                }
              };
            });
          }
        });

        // Patch the job execution logic to track attempt duration and retries
        if (typeof AgendaProto.processJobs === "function") {
          shimmer.wrap(AgendaProto, "processJobs", function (originalFn) {
            return async function patchedProcessJobs(this: any, ...args: any[]) {
              const job = args[0];
              const attemptStartTime = performance.now();

              // Log processing start
              watchers.jobs.addContent({
                status: "processing",
                method: "processJobs",
                queue: this.name,
                connectionName: this._collection?.dbName || "default",
                jobId: job.attrs._id,
                token: this.token,
                file: job.attrs.file || job.attrs.lastRunAt?.file,
                line: job.attrs.line || job.attrs.lastRunAt?.line,
                attemptsMade: job.attrs.failCount,
                package: "agenda",
              });

              try {
                // Call the original function
                const result = await originalFn.apply(this, args);
                const attemptEndTime = performance.now();
                const duration = parseFloat((attemptEndTime - attemptStartTime).toFixed(2));

                // Log successful completion
                watchers.jobs.addContent({
                  status: "completed",
                  method: "processJobs",
                  queue: this.name,
                  connectionName: this._collection?.dbName || "default",
                  jobId: job.attrs._id,
                  token: this.token,
                  file: job.attrs.file || job.attrs.lastRunAt?.file,
                  line: job.attrs.line || job.attrs.lastRunAt?.line,
                  duration,
                  attemptsMade: job.attrs.failCount,
                  returnValue: result,
                  package: "agenda",
                });

                return result;
              } catch (err: any) {
                const attemptEndTime = performance.now();
                const duration = parseFloat((attemptEndTime - attemptStartTime).toFixed(2));
                const failReason = err?.message || err;

                // Check if the job will be retried
                const maxAttempts = job.attrs.data?.maxAttempts || 0;
                const willRetry = job.attrs.failCount < maxAttempts;

                if (willRetry) {
                  // Log retry attempt
                  watchers.jobs.addContent({
                    status: "released",
                    method: "processJobs",
                    queue: this.name,
                    connectionName: this._collection?.dbName || "default",
                    jobId: job.attrs._id,
                    duration,
                    token: this.token,
                    file: job.attrs.file || job.attrs.lastRunAt?.file,
                    line: job.attrs.line || job.attrs.lastRunAt?.line,
                    attemptsMade: job.attrs.failCount,
                    package: "agenda",
                  });
                } else {
                  // Log final failure
                  watchers.jobs.addContent({
                    status: "failed",
                    method: "processJobs",
                    queue: this.name,
                    connectionName: this._collection?.dbName || "default",
                    jobId: job.attrs._id,
                    token: this.token,
                    file: job.attrs.file || job.attrs.lastRunAt?.file,
                    line: job.attrs.line || job.attrs.lastRunAt?.line,
                    duration,
                    attemptsMade: job.attrs.failCount,
                    failedReason: failReason,
                    package: "agenda",
                  });
                }

                throw err;
              }
            };
          });
        }
      } else {
        console.warn("[Patch Agenda] exports.prototype not found.");
      }

      // Return the patched module
      console.log("[node-observer] Agenda successfully patched");
      return exports;
    });
  } else {
    console.log("[node-observer] Agenda already patched, skipping");
  }
}
