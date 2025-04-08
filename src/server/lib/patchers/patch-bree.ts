/** @format */

import { Hook } from "require-in-the-middle";
import shimmer from "shimmer";
import { watchers } from "../logger";
import { v4 as uuidv4 } from "uuid";
import { getCallerInfo } from "../utils";
import { fileURLToPath } from 'url';
const BREE_PATCHED_SYMBOL = Symbol.for('node-observer:bree-patched');

// Methods to patch on the Bree prototype
const instanceMethods = ["add", "start", "stop", "remove"];

// Methods to patch on individual job objects
const jobMethods = ["run", "stop", "remove"];

if (process.env.NODE_OBSERVATORY_SCHEDULER && JSON.parse(process.env.NODE_OBSERVATORY_SCHEDULER).includes("bree")) {
if (!(global as any)[BREE_PATCHED_SYMBOL]) {
  (global as any)[BREE_PATCHED_SYMBOL] = true;

  new Hook(["bree"], (exports: any) => {
    // Check if Bree has already been patched

  // Patch Bree constructor to intercept job creation
  shimmer.wrap(exports, "default", function(originalConstructor: any) {
    return function patchedConstructor(this: any, ...args: any[]) {
      const callerInfo = getCallerInfo(fileURLToPath(import.meta.url));
      // Call the original constructor
      const breeInstance = new originalConstructor(...args);
      
      // Generate a unique ID for this Bree instance
      const breeId = uuidv4();
      
      // Store the ID on the instance for reference
      breeInstance._observerId = breeId;
      
      // Log the creation of the Bree instance
      watchers.scheduler.addContent({
        type: "create",
        package: "bree",
        breeId,
        config: args[0] || {},
        file: callerInfo.file,
        line: callerInfo.line,
      });
      
      return breeInstance;
    };
  });
  
  // Patch instance methods
  instanceMethods.forEach((method) => {
    shimmer.wrap(exports.prototype, method, function (originalFn) {
      return function patchedMethod(this: any, ...args: any[]) {
        const callerInfo = getCallerInfo(fileURLToPath(import.meta.url));
        const breeId = this._observerId || uuidv4();
        const scheduleId = uuidv4(); // Generate a unique ID for this operation
        
        // Handle different method signatures
        let jobName = "";
        let jobConfig = {};
        
        if (method === "add" && args.length > 0) {
          // The add method can take a job name or a job config object
          if (typeof args[0] === "string") {
            jobName = args[0];
          } else if (typeof args[0] === "object") {
            jobConfig = args[0];
            jobName = args[0].name || "unnamed";
          }
        } else if (method === "start" || method === "stop" || method === "remove") {
          // These methods can take a job name as the first argument
          if (typeof args[0] === "string") {
            jobName = args[0];
          } else if (Array.isArray(args[0])) {
            jobName = args[0].join(",");
          } else if (args[0] === undefined) {
            jobName = "all";
          }
        }

        // Log the method call
        watchers.scheduler.addContent({
          type: method,
          package: "bree",
          breeId,
          scheduleId,
          jobName,
          arguments: args,
          file: callerInfo.file,
          line: callerInfo.line,
        });

        try {
          // Call the original method
          const result = originalFn.apply(this, args);
          
          // For methods that return a promise
          if (result && typeof result.then === "function") {
            return result.then((value: any) => {
              // Log successful completion
              watchers.scheduler.addContent({
                type: `${method}:completed`,
                package: "bree",
                breeId,
                scheduleId,
                jobName,
                success: true,
                file: callerInfo.file,
                line: callerInfo.line,
              });
              return value;
            }).catch((error: any) => {
              // Log failure
              watchers.scheduler.addContent({
                type: `${method}:failed`,
                package: "bree",
                breeId,
                scheduleId,
                jobName,
                success: false,
                error: error instanceof Error ? error.message : String(error),
                file: callerInfo.file,
                line: callerInfo.line,
              });
              throw error;
            });
          }
          
          // For methods that return a job or jobs
          if (method === "add" && result) {
            // The add method returns the job that was added
            // Patch methods on the job object if it exists
            if (this.config && this.config.jobs) {
              const addedJob = this.config.jobs.find((job: any) => job.name === jobName);
              if (addedJob) {
                patchJobMethods(addedJob, jobName, breeId, scheduleId);
              }
            }
          }
          
          // Log successful completion for synchronous methods
          watchers.scheduler.addContent({
            type: `${method}:completed`,
            package: "bree",
            breeId,
            scheduleId,
            jobName,
            success: true,
            file: callerInfo.file,
            line: callerInfo.line,
          });
          
          return result;
        } catch (error: any) {
          // Log failure for synchronous methods
          watchers.scheduler.addContent({
            type: `${method}:failed`,
            package: "bree",
            breeId,
            scheduleId,
            jobName,
            success: false,
            error: error instanceof Error ? error.message : String(error),
            file: callerInfo.file,
            line: callerInfo.line,
          });
          throw error;
        }
      };
    });
    console.log(`[Patch bree] Patched method: ${method}`);
  });
  
  // Helper function to patch methods on individual job objects
  function patchJobMethods(job: any, jobName: string, breeId: string, scheduleId: string) {
    jobMethods.forEach(method => {
      if (job[method] && typeof job[method] === 'function') {
        shimmer.wrap(job, method, function(originalMethod: Function) {
          return function patchedJobMethod(this: any, ...args: any[]) {
            const callerInfo = getCallerInfo(fileURLToPath(import.meta.url));
            const jobId = uuidv4();
            const startTime = performance.now();
            
            // Log the job method call
            watchers.scheduler.addContent({
              type: `job:${method}`,
              package: "bree",
              breeId,
              scheduleId,
              jobId,
              jobName,
              file: callerInfo.file,
              line: callerInfo.line,
            });
            
            try {
              const startTime = performance.now();
              const result = originalMethod.apply(this, args);
              
              // For methods that return a promise
              if (result && typeof result.then === 'function') {
                return result.then((value: any) => {
                  const endTime = performance.now();
                  const duration = parseFloat((endTime - startTime).toFixed(2));
                  
                  // Log successful completion
                  watchers.scheduler.addContent({
                    type: `job:${method}:completed`,
                    package: "bree",
                    breeId,
                    scheduleId,
                    jobId,
                    jobName,
                    duration,
                    success: true,
                    file: callerInfo.file,
                    line: callerInfo.line,
                  });
                  return value;
                }).catch((error: any) => {
                  const endTime = performance.now();
                  const duration = parseFloat((endTime - startTime).toFixed(2));
                  
                  // Log failure
                  watchers.scheduler.addContent({
                    type: `job:${method}:failed`,
                    package: "bree",
                    breeId,
                    scheduleId,
                    jobId,
                    jobName,
                    duration,
                    success: false,
                    error: error instanceof Error ? error.message : String(error),
                    file: callerInfo.file,
                    line: callerInfo.line,
                  });
                  throw error;
                });
              }
              
              const endTime = performance.now();
              const duration = parseFloat((endTime - startTime).toFixed(2));
              
              // Log successful completion for synchronous methods
              watchers.scheduler.addContent({
                type: `job:${method}:completed`,
                package: "bree",
                breeId,
                scheduleId,
                jobId,
                jobName,
                duration,
                success: true,
                file: callerInfo.file,
                line: callerInfo.line,
              });
              
              return result;
            } catch (error: any) {
              const endTime = performance.now();
              const duration = parseFloat((endTime - startTime).toFixed(2));
              
              // Log failure for synchronous methods
              watchers.scheduler.addContent({
                type: `job:${method}:failed`,
                package: "bree",
                breeId,
                scheduleId,
                jobId,
                jobName,
                duration,
                success: false,
                error: error instanceof Error ? error.message : String(error),
                file: callerInfo.file,
                line: callerInfo.line,
              });
              throw error;
            }
          };
        });
      }
    });
  }
  
  // Also patch the worker event handlers to track job execution
  if (exports.prototype.init) {
    const originalInit = exports.prototype.init;
    exports.prototype.init = function patchedInit(this: any, ...args: any[]) {
      const callerInfo = getCallerInfo(fileURLToPath(import.meta.url));
      const result = originalInit.apply(this, args);
      
      // After initialization, patch the event handlers for workers
      if (this.workers && typeof this.on === 'function') {
        const breeId = this._observerId || uuidv4();
        
        // Track worker creation
        this.on('worker created', (name: string) => {
          const jobId = uuidv4();
          watchers.scheduler.addContent({
            type: "worker:created",
            package: "bree",
            breeId,
            jobId,
            jobName: name,
            file: callerInfo.file,
            line: callerInfo.line,  
          });
        });
        
        // Track worker start
        this.on('worker started', (name: string) => {
          const jobId = uuidv4();
          const startTime = performance.now();
          
          // Store the start time for this job
          if (!this._observerJobTimes) this._observerJobTimes = {};
          this._observerJobTimes[name] = { jobId, startTime };
          
          watchers.scheduler.addContent({
            type: "worker:started",
            package: "bree",
            breeId,
            jobId,
            jobName: name,
            file: callerInfo.file,
            line: callerInfo.line,
          });
        });
        
        // Track worker completion
        this.on('worker completed', (name: string) => {
          // Get the stored job info
          if (!this._observerJobTimes) this._observerJobTimes = {};
          const jobInfo = this._observerJobTimes[name] || { jobId: uuidv4(), startTime: performance.now() };
          
          const endTime = performance.now();
          const duration = parseFloat((endTime - jobInfo.startTime).toFixed(2));
          
          watchers.scheduler.addContent({
            type: "worker:completed",
            package: "bree",
            breeId,
            jobId: jobInfo.jobId,
            jobName: name,
            duration,
            success: true,
            file: callerInfo.file,
            line: callerInfo.line,
          });
          
          // Clean up
          delete this._observerJobTimes[name];
        });
        
        // Track worker errors
        this.on('worker errored', (error: any, name: string) => {
          // Get the stored job info
          if (!this._observerJobTimes) this._observerJobTimes = {};
          const jobInfo = this._observerJobTimes[name] || { jobId: uuidv4(), startTime: performance.now() };
          
          const endTime = performance.now();
          const duration = parseFloat((endTime - jobInfo.startTime).toFixed(2));
          
          watchers.scheduler.addContent({
            type: "worker:errored",
            package: "bree",
            breeId,
            jobId: jobInfo.jobId,
            jobName: name,
            duration,
            success: false,
            error: error instanceof Error ? error.message : String(error),
            file: callerInfo.file,
            line: callerInfo.line,
          });
          
          // Clean up
          delete this._observerJobTimes[name];
        });
      }
      
      return result;
    };
    console.log(`[Patch bree] Patched init method`);
  }
  console.log("[node-observer] bree successfully patched");
  return exports;
  });
  } else {
    console.log("[node-observer] bree already patched, skipping");
  }
}
