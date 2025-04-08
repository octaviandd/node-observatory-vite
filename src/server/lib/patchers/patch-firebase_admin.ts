/** @format */

import { Hook } from "require-in-the-middle";
import shimmer from "shimmer";
import { watchers } from "../logger";
import { getCallerInfo } from "../utils";
import { fileURLToPath } from 'url';

// Create a global symbol to track if firebase-admin has been patched
const FIREBASE_ADMIN_PATCHED_SYMBOL = Symbol.for('node-observer:firebase-admin-patched');

if (process.env.NODE_OBSERVATORY_DATABASES && JSON.parse(process.env.NODE_OBSERVATORY_DATABASES).includes("firebase-admin")) {
// Check if firebase-admin has already been patched
if (!(global as any)[FIREBASE_ADMIN_PATCHED_SYMBOL]) {
  // Mark firebase-admin as patched
  (global as any)[FIREBASE_ADMIN_PATCHED_SYMBOL] = true;

  /**
   * Hook "firebase-admin" to patch its operations.
   */
  new Hook(["firebase-admin"], function (exports: any, name, basedir) {
    // `exports` is the Firebase Admin module.
    if (!exports || typeof exports.initializeApp !== "function") {
      console.warn(
        "[Patch firebase-admin] Could not locate initializeApp to patch."
      );
      return exports;
    }

    shimmer.wrap(exports, "initializeApp", function (originalInitializeApp) {
      return function patchedInitializeApp(this: any, ...args: any[]) {
        const app = originalInitializeApp.apply(this, args);

        if (app && typeof app.firestore === "function") {
          const firestore = app.firestore();

          shimmer.wrap(firestore, "collection", function (originalCollection) {
            return function patchedCollection(
              this: any,
              collectionName: string,
              ...collectionArgs: any[]
            ) {
              const collection = originalCollection.call(
                this,
                collectionName,
                ...collectionArgs
              );

              shimmer.wrap(collection, "doc", function (originalDoc) {
                return function patchedDoc(
                  this: any,
                  docName: string,
                  ...docArgs: any[]
                ) {
                  const doc = originalDoc.call(this, docName, ...docArgs);

                  shimmer.wrap(doc, "set", function (originalSet) {
                    return async function patchedSet(
                      this: any,
                      data: any,
                      ...setArgs: any[]
                    ) {
                      const logContent: { [key: string]: any } = {
                        time: new Date(),
                        package: "firebase-admin",
                        method: "doc.set",
                        collection: collectionName,
                        document: docName,
                        data,
                      };

                      try {
                        const result = await originalSet.call(
                          this,
                          data,
                          ...setArgs
                        );
                        logContent.result = "success";
                        watchers.database.addContent(logContent);
                        return result;
                      } catch (error) {
                        logContent.error = error;
                        watchers.database.addContent(logContent);
                        throw error;
                      }
                    };
                  });

                  shimmer.wrap(doc, "get", function (originalGet) {
                    return async function patchedGet(
                      this: any,
                      ...getArgs: any[]
                    ) {
                      const logContent: { [key: string]: any } = {
                        time: new Date(),
                        package: "firebase-admin",
                        method: "doc.get",
                        collection: collectionName,
                        document: docName,
                      };

                      try {
                        const result = await originalGet.call(this, ...getArgs);
                        logContent.result = result;
                        watchers.database.addContent(logContent);
                        return result;
                      } catch (error) {
                        logContent.error = error;
                        watchers.database.addContent(logContent);
                        throw error;
                      }
                    };
                  });

                  return doc;
                };
              });

              return collection;
            };
          });
        }

        return app;
      };
    });

    console.log("[Patch firebase-admin] Firestore methods patched.");

    // Return the patched firebase-admin module
    return exports;
  });
  } else {
    console.log("[node-observer] Firebase Admin already patched, skipping");
  }
}
