/** @format */
import { Hook } from "require-in-the-middle";
import shimmer from "shimmer";
import { watchers } from "../logger";
import { performance } from "perf_hooks";
import { getCallerInfo } from "../utils";
import { fileURLToPath } from 'url';

const WORKERS_PATCHED_SYMBOL = Symbol.for('node-observer:workers-patched');

if (process.env.NODE_OBSERVATORY_WORKERS && JSON.parse(process.env.NODE_OBSERVATORY_WORKERS).includes("worker_threads")) {
  if (!(global as any)[WORKERS_PATCHED_SYMBOL]) {
    (global as any)[WORKERS_PATCHED_SYMBOL] = true;

    new Hook(["worker_threads"], function (exports: any) {
      if (exports.Worker) {
        shimmer.wrap(exports.Worker.prototype, "postMessage", function (original) {
          return function wrappedPostMessage(this: any, value: any) {
            const startTime = performance.now();
            const callerInfo = getCallerInfo(fileURLToPath(import.meta.url));
            try {
              const result = original.apply(this, arguments);
            
              watchers.view.addContent({
                type: "worker",
                method: "postMessage",
                status: "completed",
                duration: performance.now() - startTime,
                threadId: this.threadId,
                data: value,
                file: callerInfo.file,
                line: callerInfo.line
              });

              return result;
            } catch (error: any) {
              watchers.view.addContent({
                type: "worker",
                method: "postMessage",
                status: "failed",
                duration: performance.now() - startTime,
                threadId: this.threadId,
                error: error.message,
                data: value,
                file: callerInfo.file,
                line: callerInfo.line
              });
              throw error;
            }
          };
        });

        shimmer.wrap(exports.Worker.prototype, "terminate", function (original) {
          return function wrappedTerminate(this: any) {
            const startTime = performance.now();
            const callerInfo = getCallerInfo(fileURLToPath(import.meta.url));
            try {
              const result = original.apply(this, arguments);
            
              watchers.view.addContent({
                type: "worker",
                method: "terminate",
                status: "completed",
                duration: performance.now() - startTime,
                threadId: this.threadId,
                file: callerInfo.file,
                line: callerInfo.line
              });

              return result;
            } catch (error: any) {
              watchers.view.addContent({
                type: "worker",
                method: "terminate",
                status: "failed",
                duration: performance.now() - startTime,
                threadId: this.threadId,
                error: error.message,
                file: callerInfo.file,
                line: callerInfo.line
              });
              throw error;
            }
          };
        });
      }

      console.log("[node-observer] Workers successfully patched");
      return exports;
    });
  } else {
    console.log("[node-observer] Workers already patched, skipping");
  }
}
