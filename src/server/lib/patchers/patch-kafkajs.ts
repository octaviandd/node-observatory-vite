/** @format */

import { Hook } from "require-in-the-middle";
import shimmer from "shimmer";
import { watchers } from "../logger";
import { fileURLToPath } from 'url';
// Create a global symbol to track if kafkajs has been patched
const KAFKAJS_PATCHED_SYMBOL = Symbol.for('node-observer:kafkajs-patched');

if (process.env.NODE_OBSERVATORY_NOTIFICATIONS && JSON.parse(process.env.NODE_OBSERVATORY_NOTIFICATIONS).includes("kafkajs")) {
  // Check if kafkajs has already been patched
  if (!(global as any)[KAFKAJS_PATCHED_SYMBOL]) {
    // Mark kafkajs as patched
    (global as any)[KAFKAJS_PATCHED_SYMBOL] = true;

    /**
     * Hook "kafkajs" to patch its producer and consumer methods.
     */
    new Hook(["kafkajs"], function (exports: any, name, basedir) {
      // `exports` is the KafkaJS module.
      if (!exports || typeof exports.Kafka !== "function") {
        console.warn("[Patch kafkajs] Could not locate Kafka class to patch.");
        return exports;
      }

      shimmer.wrap(exports.Kafka.prototype, "producer", function (originalProducer) {
        return function patchedProducer(this: any, ...args: any[]) {
          const producer = originalProducer.apply(this, args);

          if (producer && typeof producer.send === "function") {
            shimmer.wrap(producer, "send", function (originalSend) {
              return async function patchedSend(this: any, payload: any, ...sendArgs: any[]) {
                const logContent: { [key: string]: any } = {
                  time: performance.now(),
                  package: "kafkajs",
                  method: "producer.send",
                  topic: payload?.topic,
                  messages: payload?.messages,
                };

                try {
                  const result = await originalSend.call(this, payload, ...sendArgs);
                  logContent.result = "success";
                  watchers.kafka.addContent(logContent);
                  return result;
                } catch (error) {
                  logContent.error = error;
                  watchers.kafka.addContent(logContent);
                  throw error;
                }
              };
            });
          }

          return producer;
        };
      });

      shimmer.wrap(exports.Kafka.prototype, "consumer", function (originalConsumer) {
        return function patchedConsumer(this: any, ...args: any[]) {
          const consumer = originalConsumer.apply(this, args);

          if (consumer && typeof consumer.run === "function") {
            shimmer.wrap(consumer, "run", function (originalRun) {
              return async function patchedRun(this: any, config: any, ...runArgs: any[]) {
                const wrappedEachMessage = config?.eachMessage;

                if (typeof wrappedEachMessage === "function") {
                  config.eachMessage = async function patchedEachMessage(payload: any) {
                    const logContent: { [key: string]: any } = {
                      time: performance.now(),
                      package: "kafkajs",
                      method: "consumer.eachMessage",
                      topic: payload?.topic,
                      partition: payload?.partition,
                      offset: payload?.message?.offset,
                      key: payload?.message?.key?.toString(),
                      value: payload?.message?.value?.toString(),
                    };

                    try {
                      const result = await wrappedEachMessage(payload);
                      logContent.result = "success";
                      watchers.kafka.addContent(logContent);
                      return result;
                    } catch (error) {
                      logContent.error = error;
                      watchers.kafka.addContent(logContent);
                      throw error;
                    }
                  };
                }

                return originalRun.call(this, config, ...runArgs);
              };
            });
          }

          return consumer;
        };
      });

      console.log("[Patch kafkajs] Producer and consumer methods patched.");

      // Return the patched kafkajs module
      return exports;
    });
  } else {
    console.log("[node-observer] KafkaJS already patched, skipping");
  }
}
