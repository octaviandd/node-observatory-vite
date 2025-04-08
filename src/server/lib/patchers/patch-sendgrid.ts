/** @format */

import { Hook } from "require-in-the-middle";
import shimmer from "shimmer";
import { watchers } from "../logger";
import { getCallerInfo } from "../utils";
import { fileURLToPath } from 'url';

const SENDGRID_PATCHED_SYMBOL = Symbol.for('node-observer:sendgrid-patched');

if (process.env.NODE_OBSERVATORY_MAILER && JSON.parse(process.env.NODE_OBSERVATORY_MAILER).includes("@sendgrid/mail")) {
  if (!(global as any)[SENDGRID_PATCHED_SYMBOL]) {
    (global as any)[SENDGRID_PATCHED_SYMBOL] = true;

    new Hook(["@sendgrid/mail"], function (exports, name, basedir) {
      if (typeof (exports as any).send === "function") {
        shimmer.wrap(exports as any, "send", function (originalSend) {
          return async function patchedSend(this: any, mailData: any) {
            const startTime = performance.now();
            const callerInfo = getCallerInfo(fileURLToPath(import.meta.url));

            const content = {
              command: "SendMail",
              to: Array.isArray(mailData.to) ? mailData.to : [mailData.to],
              cc: Array.isArray(mailData.cc) ? mailData.cc : mailData.cc ? [mailData.cc] : [],
              bcc: Array.isArray(mailData.bcc) ? mailData.bcc : mailData.bcc ? [mailData.bcc] : [],
              from: mailData.from,
              subject: mailData.subject,
              body: mailData.html || mailData.text,
              file: callerInfo.file,
              line: callerInfo.line,
              package: "@sendgrid/mail",
            };

            try {
              const result = await originalSend.call(this, mailData);
              const endTime = performance.now();
              const duration = parseFloat((endTime - startTime).toFixed(2));

              watchers.mailer.addContent({
                status: "completed",
                info: {
                  messageId: Array.isArray(result) ? result[0].headers['x-message-id'] : result.headers['x-message-id'],
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
        console.log("[Patch @sendgrid/mail] 'send' method patched.");
      }

      // 2. Patch the `sendMultiple` function (shortcut for multiple emails)
      if (typeof (exports as any).sendMultiple === "function") {
        shimmer.wrap(exports as any, "sendMultiple", function (originalSendMultiple) {
          return async function patchedSendMultiple(this: any, mailData: any) {
            const startTime = performance.now();
            const callerInfo = getCallerInfo(fileURLToPath(import.meta.url));

            const content = {
              command: "SendMultiple",
              to: Array.isArray(mailData.to) ? mailData.to : [mailData.to],
              cc: Array.isArray(mailData.cc) ? mailData.cc : mailData.cc ? [mailData.cc] : [],
              bcc: Array.isArray(mailData.bcc) ? mailData.bcc : mailData.bcc ? [mailData.bcc] : [],
              from: mailData.from,
              subject: mailData.subject,
              body: mailData.html || mailData.text,
              file: callerInfo.file,
              line: callerInfo.line,
              package: "@sendgrid/mail",
            };

            try {
              const result = await originalSendMultiple.call(this, mailData);
              const endTime = performance.now();
              const duration = parseFloat((endTime - startTime).toFixed(2));

              watchers.mailer.addContent({
                status: "completed",
                info: {
                  messageId: result[0].headers['x-message-id'],
                  response: result,
                },
                duration,
                ...content,
                file: callerInfo.file,
                line: callerInfo.line,
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
                file: callerInfo.file,
                line: callerInfo.line,
              });
              throw err;
            }
          };
        });
        console.log("[Patch @sendgrid/mail] 'sendMultiple' method patched.");
      }

      console.log("[node-observer] SendGrid successfully patched");
      return exports;
    });
  } else {
    console.log("[node-observer] SendGrid already patched, skipping");
  }
}
