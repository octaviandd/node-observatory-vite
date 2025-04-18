/** @format */
import "dotenv/config";
import "./patchers/index";
import {  mysql2Up } from "./database/migrations/index";
import { LogWatcher, MailWatcher, JobWatcher, ScheduleWatcher, CacheWatcher, NotificationWatcher, RequestWatcher, HTTPClientWatcher, QueryWatcher, ExceptionWatcher, RedisWatcher, ViewWatcher, ModelWatcher } from "./watchers/index";
import { StoreDriver } from "../../../types";
import router from "./routes/routes";
import { Router } from "express";
import { createClient } from "redis";
import { Connection } from "mysql2";
import { Connection as PromiseConnection } from "mysql2/promise";

export const instanceCreator = (
  driver: StoreDriver,
  connection: Connection | PromiseConnection,
  redisClient: ReturnType<typeof createClient>
) => ({
  logWatcherInstance: new LogWatcher(driver, connection, redisClient),
  mailWatcherInstance: new MailWatcher(driver, connection, redisClient),
  jobWatcherInstance: new JobWatcher(driver, connection, redisClient),
  scheduleWatcherInstance: new ScheduleWatcher(driver, connection, redisClient),
  cacheWatcherInstance: new CacheWatcher(driver, connection, redisClient),
  notificationWatcherInstance: new NotificationWatcher(driver, connection, redisClient),
  requestWatcherInstance: new RequestWatcher(driver, connection, redisClient),
  httpClientWatcherInstance: new HTTPClientWatcher(driver, connection, redisClient),
  queryWatcherInstance: new QueryWatcher(driver, connection, redisClient),
  exceptionWatcherInstance: new ExceptionWatcher(driver, connection, redisClient),
  redisWatcherInstance: new RedisWatcher(driver, connection, redisClient),
  viewWatcherInstance: new ViewWatcher(driver, connection, redisClient),
  modelWatcherInstance: new ModelWatcher(driver, connection, redisClient)
});

export const watchers: any = {
  errors: null,
  requests: null,
  http: null,
  jobs: null,
  logging: null,
  scheduler: null,
  mailer: null,
  cache: null,
  notifications: null,
  query: null,
  command: null,
  view: null,
  model: null
};

/**
 * Initial entry point for setting up the logger
 * @param config - Configuration object for the logger
 * @param driver - The logging driver to use.
 * @param connection - Connection details for the logging service
 * @param redisClient - Redis client instance for caching and pub/sub functionality
 * @returns The configured logger instance with a success message
 */
export async function setupLogger(
  driver: StoreDriver,
  connection: Connection | PromiseConnection,
  redisClient: ReturnType<typeof createClient>
): Promise<Router> {
  // @ts-expect-error
  connection = connection.hasOwnProperty('Promise') ? connection : connection.promise();
  await setupMigrations(driver, connection as PromiseConnection);
  const {
    queryWatcherInstance,
    logWatcherInstance,
    mailWatcherInstance,
    jobWatcherInstance,
    notificationWatcherInstance,
    scheduleWatcherInstance,
    cacheWatcherInstance,
    requestWatcherInstance,
    httpClientWatcherInstance,
    exceptionWatcherInstance,
    redisWatcherInstance,
    viewWatcherInstance,
    modelWatcherInstance
  } = instanceCreator(driver, connection, redisClient);

  watchers.requests = requestWatcherInstance;
  process.env.NODE_OBSERVATORY_ERRORS && (watchers.errors = exceptionWatcherInstance);
  process.env.NODE_OBSERVATORY_HTTP && (watchers.http = httpClientWatcherInstance);
  process.env.NODE_OBSERVATORY_JOBS && (watchers.jobs = jobWatcherInstance);
  process.env.NODE_OBSERVATORY_LOGGING && (watchers.logging = logWatcherInstance);
  process.env.NODE_OBSERVATORY_SCHEDULER && (watchers.scheduler = scheduleWatcherInstance);
  process.env.NODE_OBSERVATORY_MAILER && (watchers.mailer = mailWatcherInstance);
  process.env.NODE_OBSERVATORY_CACHE && (watchers.cache = cacheWatcherInstance);
  process.env.NODE_OBSERVATORY_NOTIFICATIONS && (watchers.notifications = notificationWatcherInstance);
  process.env.NODE_OBSERVATORY_QUERIES && (watchers.query = queryWatcherInstance);
  process.env.NODE_OBSERVATORY_CACHE && (watchers.redis = redisWatcherInstance);
  process.env.NODE_OBSERVATORY_VIEWS && (watchers.view = viewWatcherInstance);
  process.env.NODE_OBSERVATORY_MODELS && (watchers.model = modelWatcherInstance);

  return router;
}

/**
 * Setup the migrations depending on the database/storage driver.
 * @param driver - The database/storage driver to use.
 * @param connection - The connection details for the database/storage driver.
 */
async function setupMigrations(driver: StoreDriver, connection: PromiseConnection): Promise<void | never> {
  if (driver === "mysql2") {
    await mysql2Up(connection);
  } else {
    throw new Error("Unsupported database driver");
  }
}

export default setupLogger;
