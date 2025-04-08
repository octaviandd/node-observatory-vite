/** @format */

import { Hook } from "require-in-the-middle";
import shimmer from "shimmer";
import { watchers } from "../logger";
import { getCallerInfo } from "../utils";
import { fileURLToPath } from 'url';

const POSTMARK_PATCHED_SYMBOL = Symbol.for('node-observer:postmark-patched');

if (process.env.NODE_OBSERVATORY_MAILER && JSON.parse(process.env.NODE_OBSERVATORY_MAILER).includes("postmark")) {
  if (!(global as any)[POSTMARK_PATCHED_SYMBOL]) {
    (global as any)[POSTMARK_PATCHED_SYMBOL] = true;

    /**
     * Hook "postmark" to patch its mail sending functionality.
     */
    new Hook(["postmark"], function (exports: any, name, basedir) {
      // `exports` is the object returned by require("postmark").
      if (!exports || typeof exports.ServerClient !== "function") {
        console.warn(
          "[Patch postmark] Could not locate ServerClient class to patch."
        );
        return exports;
      }

      shimmer.wrap(exports, "ServerClient", function (OriginalServerClient) {
        return function PatchedServerClient(this: any, ...args: any[]) {
          const client = new OriginalServerClient(...args);

          // Wrap the `sendEmail` method
          if (client && typeof client.sendEmail === "function") {
            shimmer.wrap(client, "sendEmail", function (originalSendEmail) {
              return async function patchedSendEmail(this: any, emailData: any) {
                const startTime = performance.now();
                const callerInfo = getCallerInfo(fileURLToPath(import.meta.url));

                const content = {
                  command: "SendMail",
                  to: Array.isArray(emailData.To) ? emailData.To : [emailData.To],
                  cc: Array.isArray(emailData.Cc) ? emailData.Cc : emailData.Cc ? [emailData.Cc] : [],
                  bcc: Array.isArray(emailData.Bcc) ? emailData.Bcc : emailData.Bcc ? [emailData.Bcc] : [],
                  from: emailData.From,
                  subject: emailData.Subject,
                  body: emailData.HtmlBody || emailData.TextBody,
                  file: callerInfo.file,
                  line: callerInfo.line,
                  package: "postmark",
                };

                try {
                  const result = await originalSendEmail.call(this, emailData);
                  const endTime = performance.now();
                  const duration = parseFloat((endTime - startTime).toFixed(2));

                  watchers.mailer.addContent({
                    status: "completed",
                    info: {
                      messageId: result.MessageID,
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

          // Wrap the `sendEmailWithTemplate` method
          if (client && typeof client.sendEmailWithTemplate === "function") {
            shimmer.wrap(client, "sendEmailWithTemplate", function (originalSendWithTemplate) {
              return async function patchedSendEmailWithTemplate(this: any, templateData: any) {
                const startTime = performance.now();
                const callerInfo = getCallerInfo(fileURLToPath(import.meta.url));

                const content = {
                  command: "SendTemplateEmail",
                  to: Array.isArray(templateData.To) ? templateData.To : [templateData.To],
                  cc: Array.isArray(templateData.Cc) ? templateData.Cc : templateData.Cc ? [templateData.Cc] : [],
                  bcc: Array.isArray(templateData.Bcc) ? templateData.Bcc : templateData.Bcc ? [templateData.Bcc] : [],
                  from: templateData.From,
                  templateId: templateData.TemplateId,
                  templateModel: templateData.TemplateModel,
                  file: callerInfo.file,
                  line: callerInfo.line,
                  package: "postmark",
                };

                try {
                  const result = await originalSendWithTemplate.call(this, templateData);
                  const endTime = performance.now();
                  const duration = parseFloat((endTime - startTime).toFixed(2));

                  watchers.mailer.addContent({
                    status: "completed",
                    info: {
                      messageId: result.MessageID,
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

          return client;
        };
      });

      console.log("[Patch postmark] Client and send methods patched.");
      return exports;
    });
  } else {
    console.log("[node-observer] Postmark already patched, skipping");
  }
}