/** @format */

import { Hook } from "require-in-the-middle";
import shimmer from "shimmer";
import { watchers } from "../logger";
import { getCallerInfo } from "../utils";
import { fileURLToPath } from 'url';
// Create a global symbol to track if mailgun has been patched
const MAILGUN_PATCHED_SYMBOL = Symbol.for('node-observer:mailgun-patched');

if (process.env.NODE_OBSERVATORY_MAILER && JSON.parse(process.env.NODE_OBSERVATORY_MAILER).includes("mailgun.js")) {
  // Check if mailgun has already been patched
  if (!(global as any)[MAILGUN_PATCHED_SYMBOL]) {
    // Mark mailgun as patched
    (global as any)[MAILGUN_PATCHED_SYMBOL] = true;

    new Hook(["mailgun.js"], function (exports: any, name, basedir) {
      if (!exports || typeof exports.default !== "function") {
        console.warn("[Patch mailgun] Could not locate Mailgun class to patch.");
        return exports;
      }

      shimmer.wrap(exports, "default", function (OriginalMailgun) {
        return function PatchedMailgun(this: any, ...args: any[]) {
          const mailgun = new OriginalMailgun(...args);

          if (mailgun && mailgun.messages && typeof mailgun.messages().create === "function") {
            const messages = mailgun.messages();
            shimmer.wrap(messages, "create", function (originalCreate) {
              return async function patchedCreate(this: any, domain: string, data: any) {
                const startTime = performance.now();
                
                const callerInfo = getCallerInfo(fileURLToPath(import.meta.url));

                const content = {
                  command: "SendMail",
                  to: Array.isArray(data.to) ? data.to : [data.to],
                  cc: Array.isArray(data.cc) ? data.cc : data.cc ? [data.cc] : [],
                  bcc: Array.isArray(data.bcc) ? data.bcc : data.bcc ? [data.bcc] : [],
                  from: data.from,
                  subject: data.subject,
                  body: data.html || data.text,
                  file: callerInfo.file,
                  line: callerInfo.line,
                  package: "mailgun.js",
                };

                try {
                  const result = await originalCreate.call(this, domain, data);
                  const endTime = performance.now();
                  const duration = parseFloat((endTime - startTime).toFixed(2));

                  watchers.mailer.addContent({
                    status: "completed",
                    info: {
                      messageId: result.id,
                      response: result,
                    },
                    duration,
                    ...content,
                  });

                  return result;
                } catch (err: any) {
                  const endTime = performance.now();
                  const duration = parseFloat((endTime - startTime).toFixed(2));

                  watchers.mailer.addContent({
                    status: "failed",
                    error: {
                      name: err.name,
                      message: err.message,
                      stack: err.stack,
                    },
                    duration,
                    ...content,
                  });
                  throw err;
                }
              };
            });
          }

          return mailgun;
        };
      });

      console.log("[Patch mailgun] Client and messages methods patched.");
      return exports;
    });
  } else {
    console.log("[node-observer] Mailgun already patched, skipping");
  }
}
