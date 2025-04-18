/** @format */
import "dotenv/config";
import "./patchers/index";
import {  mysql2Up,  mysqlUp, postgresUp, mongodbUp, prismaUp, sqliteUp, typeormUp, knexUp, sequelizeUp } from "./database/migrations/index";
import { LogWatcher, MailWatcher, JobWatcher, ScheduleWatcher, CacheWatcher, NotificationWatcher, RequestWatcher, HTTPClientWatcher, QueryWatcher, ExceptionWatcher, RedisWatcher, ViewWatcher, ModelWatcher } from "./watchers/index";
import { StoreDriver } from "../../../types";
import routes from "./routes/routes";
import { Router } from "express";

export const instanceCreator = (
  driver: StoreDriver,
  connection: any,
  redisClient: any
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
  connection: any,
  redisClient: any
): Promise<Router> {
  // await setupMigrations(driver, connection);
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

  return routes;
}

/**
 * Setup the migrations depending on the database/storage driver.
 * @param driver - The database/storage driver to use.
 * @param connection - The connection details for the database/storage driver.
 */
async function setupMigrations(driver: string, connection: any) {
  if (driver === "mongodb") {
    await mongodbUp(connection);
  } else if (driver === "postgres") {
    await postgresUp(connection);
  } else if (driver === "mysql") {
    await mysqlUp(connection);
  } else if (driver === "mysql2") {
    await mysql2Up(connection);
  } else if (driver === "prisma") {
    await prismaUp();
  } else if (driver === "sqlite3") {
    await sqliteUp(connection);
  } else if (driver === "typeorm") {
    await typeormUp();
  } else if (driver === "knex") {
    await knexUp(connection);
  } else if (driver === "sequelize") {
    await sequelizeUp();
  } else {
    throw new Error("Unsupported database driver");
  }
}

export default setupLogger;
