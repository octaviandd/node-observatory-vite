/** @format */

import { Hook } from "require-in-the-middle";
import shimmer from "shimmer";
import { watchers } from "../logger";
import { getCallerInfo } from "../utils";
import { fileURLToPath } from 'url';

const SOCKETIO_PATCHED_SYMBOL = Symbol.for('node-observer:socketio-patched');

if (process.env.NODE_OBSERVATORY_NOTIFICATIONS && JSON.parse(process.env.NODE_OBSERVATORY_NOTIFICATIONS).includes("socket.io")) {
  if (!(global as any)[SOCKETIO_PATCHED_SYMBOL]) {
    (global as any)[SOCKETIO_PATCHED_SYMBOL] = true;

    new Hook(["socket.io"], function (exports: any, name, basedir) {
      if (!exports || typeof exports.Server !== "function") {
        console.warn("[Patch socket.io] Could not locate Server class to patch.");
        return exports;
      }

      // Patch emit method for notifications
      shimmer.wrap(exports.Server.prototype, "emit", function (originalEmit) {
        return function patchedEmit(this: any, event: string, data: any, ...args: any[]) {
          const startTime = performance.now();
          const callerInfo = getCallerInfo(fileURLToPath(import.meta.url));

          // Log the notification attempt
          watchers.notifications.addContent({
            package: "socket.io",
            method: "emit",
            event,
            data,
            status: "pending",
            file: callerInfo.file,
            line: callerInfo.line,
            startTime,
          });

          try {
            const result = originalEmit.apply(this, [event, data, ...args]);
            const endTime = performance.now();

            // Log successful notification
            watchers.notifications.addContent({
              package: "socket.io",
              method: "emit",
              event,
              data,
              status: "completed",
              duration: parseFloat((endTime - startTime).toFixed(2)),
              file: callerInfo.file,
              line: callerInfo.line,
            });

            return result;
          } catch (error: any) {
            const endTime = performance.now();

            // Log failed notification
            watchers.notifications.addContent({
              package: "socket.io",
              method: "emit",
              event,
              data,
              status: "failed",
              error: error.message,
              duration: parseFloat((endTime - startTime).toFixed(2)),
              file: callerInfo.file,
              line: callerInfo.line,
            });

            throw error;
          }
        };
      });

      // Patch connection events
      shimmer.wrap(exports.Server.prototype, "on", function (originalOn) {
        return function patchedOn(this: any, event: string, listener: Function) {
          if (event === "connection" && typeof listener === "function") {
            const patchedListener = function (this: any, socket: any, ...args: any[]) {
              const startTime = performance.now();
              const callerInfo = getCallerInfo(fileURLToPath(import.meta.url));

              // Log connection
              watchers.socket.addContent({
                package: "socket.io",
                method: "connection",
                socketId: socket.id,
                status: "pending",
                file: callerInfo.file,
                line: callerInfo.line,
                startTime,
              });

              // Patch socket emit for per-socket notifications
              shimmer.wrap(socket, "emit", function (originalSocketEmit) {
                return function patchedSocketEmit(this: any, socketEvent: string, data: any) {
                  const emitStartTime = performance.now();

                  // Log notification attempt
                  watchers.notifications.addContent({
                    package: "socket.io",
                    method: "socket.emit",
                    socketId: socket.id,
                    event: socketEvent,
                    data,
                    status: "pending",
                    file: callerInfo.file,
                    line: callerInfo.line,
                    startTime: emitStartTime,
                  });

                  try {
                    const result = originalSocketEmit.apply(this, [socketEvent, data]);
                    const emitEndTime = performance.now();

                    // Log successful notification
                    watchers.notifications.addContent({
                      package: "socket.io",
                      method: "socket.emit",
                      socketId: socket.id,
                      event: socketEvent,
                      data,
                      status: "completed",
                      duration: parseFloat((emitEndTime - emitStartTime).toFixed(2)),
                      file: callerInfo.file,
                      line: callerInfo.line,
                    });

                    return result;
                  } catch (error: any) {
                    const emitEndTime = performance.now();

                    // Log failed notification
                    watchers.notifications.addContent({
                      package: "socket.io",
                      method: "socket.emit",
                      socketId: socket.id,
                      event: socketEvent,
                      data,
                      status: "failed",
                      error: error.message,
                      duration: parseFloat((emitEndTime - emitStartTime).toFixed(2)),
                      file: callerInfo.file,
                      line: callerInfo.line,
                    });

                    throw error;
                  }
                };
              });

              return listener.call(this, socket, ...args);
            };

            return originalOn.call(this, event, patchedListener);
          }

          return originalOn.call(this, event, listener);
        };
      });

      console.log("[Patch socket.io] Server and socket notification methods patched.");
      return exports;
    });
  } else {
    console.log("[node-observer] Socket.IO already patched, skipping");
  }
}
