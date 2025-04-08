/** @format */
// use enums instead of strings

/**
 * Supported logging libraries
 * @typedef {string} Logger
 */
export type Logger =
  | "winston"
  | "pino"
  | "bunyan"
  | "log4js" // not otel
  | "signale" // not otel
  | "loglevel" // not otel

/**
 * Supported scheduler libraries
 * @typedef {string} Scheduler
 */
export type Scheduler = "node-schedule" | "node-cron" | "bree"; // not otel

/**
 * Supported command-line parsing libraries
 * @typedef {string} Command
 */
export type Command =
  | "commander" // not otel
  | "yargs" // not otel
  | "minimist" // not otel
  | "argparse" // not otel
  | "meow" // not otel
  | "oclif"; // not otel

/**
 * Supported email sending libraries
 * @typedef {string} Mailer
 */
export type Mailer =
  | "nodemailer" // not otel
  | "@sendgrid/mail" // not otel
  | "mailgun.js" // not otel
  | "postmark" // not otel
  | "@aws-sdk/client-ses"; // not otel

/**
 * Supported caching libraries
 * @typedef {string} Cache
 */
export type Cache =
  | "redis"
  | "ioredis"
  | "node-cache"
  | "lru-cache" // not otel
  | "memjs" // not otel
  | "level" // not otel
  | "keyv"; // not otel

/**
 * Supported notification libraries
 * @typedef {string} Notifications
 */
export type Notifications =
  | "pusher" // not otel
  // | "firebase-admin"
  // | "socket.io"
  | "ably" // not otel
  // | "kafkajs";

/**
 * Supported HTTP client libraries
 * @typedef {string} Http
 */
export type Http =
  | "axios"
  | "http"
  | "https"
  | "fetch"
  | "got"
  | "superagent"
  | "undici"
  | "ky"
  | "needle"
  | "phin"
  | "node-fetch";

/**
 * Supported job processing libraries
 * @typedef {string} Jobs
 */
export type Jobs = "bull" | "agenda";

/**
 * Types of error handling to observe
 * @typedef {string} Errors
 */
export type Errors = "uncaught" | "unhandled";

/**
 * Supported database query libraries
 * @typedef {string} Queries
 */
export type Queries =
  | "knex"
  | "sequelize"
  | "sqlite3"
  | "typeorm"
  | "prisma"
  | "mysql2"
  | "mysql"
  | "mongodb"
  | "pg";

/**
 * Supported ORM/model libraries
 * @typedef {string} Model
 */
export type Model = "typeorm" | "sequelize" | "prisma" | "knex" | "sqlite3";

/**
 * Supported view libraries
 * @typedef {string} Views
 */
export type Views = "ejs" | "pug" | "handlebars";

/**
 * Configuration options for the logger
 * @interface Config
 * @property {boolean} errors - Whether to track uncaught errors
 * @property {object} [packages] - Optional packages configuration
 * @property {Http[]} [packages.http] - HTTP client libraries to observe
 * @property {Logger[]} [packages.logging] - Logging libraries to observe
 * @property {Queries[]} [packages.queries] - Query libraries to observe
 * @property {Jobs[]} [packages.jobs] - Job processing libraries to observe
 * @property {Scheduler[]} [packages.scheduler] - Scheduler libraries to observe
 * @property {Mailer[]} [packages.mailer] - Email libraries to observe
 * @property {Cache[]} [packages.cache] - Caching libraries to observe
 * @property {Notifications[]} [packages.notifications] - Notification libraries to observe
 * @property {Model[]} [packages.models] - Model libraries to observe
 * @property {Views[]} [packages.views] - View libraries to observe
 */
export interface Config {
  errors: boolean;
  packages?: {
    http?: Http[];
    logging?: Logger[];
    queries?: Queries[];
    jobs?: Jobs[];
    scheduler?: Scheduler[];
    mailer?: Mailer[];
    cache?: Cache[];
    notifications?: Notifications[];
    models?: Model[];
    views?: Views[];
  };
}

/**
 * Supported database drivers for storing logs and metrics
 * @typedef {string} StoreDriver
 */
export type StoreDriver =
  | "mysql"
  | "mysql2"
  | "mongodb"
  | "postgres"
  | "knex"
  | "prisma"
  | "sqlite3"
  | "typeorm"
  | "sequelize";

/**
 * Interface representing standardized HTTP request data across different libraries
 * Common fields are required, library-specific fields are optional
 */
export interface HttpRequestData {
  // Common required fields
  method: string;
  origin: string;
  pathname: string;
  protocol: string;
  statusCode: number;
  statusMessage: string;
  duration: number;
  aborted: boolean;
  headers: Record<string, string | string[] | undefined>;
  responseBody: string | Buffer;
  responseBodySize: number;
  isMedia: boolean;
  library: string; // Which HTTP client library was used
  
  // Source information
  file: string;
  line: string;
  
  // Common optional fields with different representations
  host?: string;
  hostname?: string;
  path?: string;
  port?: string | number | null;
  
  // Library-specific optional fields
  // Axios specific
  maxRedirects?: number;
  maxBodyLength?: number | null;
  beforeRedirects?: Record<string, any>;
  
  // Got specific
  hooks?: {
    init?: any[];
    beforeError?: any[];
    beforeRetry?: any[];
    afterResponse?: any[];
    beforeRequest?: any[];
    beforeRedirect?: any[];
  };
  retry?: {
    limit?: number;
    methods?: string[];
    errorCodes?: string[];
    statusCodes?: number[];
    maxRetryAfter?: number | null;
  };
  pagination?: {
    backoff?: number;
    countLimit?: number | null;
    requestLimit?: number;
    stackAllItems?: boolean;
  };
  throwHttpErrors?: boolean;
  followRedirect?: boolean;
  methodRewriting?: boolean;
  resolveBodyOnly?: boolean;
  ignoreInvalidCookies?: boolean;
  
  // Node-fetch specific
  href?: string;
  slashes?: boolean;
  auth?: string | null;
  hash?: string | null;
  search?: string | null;
  query?: string | null;
  
  // Superagent specific
  agent?: boolean | any;
  rejectUnauthorized?: boolean;
  
  // Needle specific
  signal?: any;
  
  // URL components that might be represented differently
  url?: string | Record<string, any>;
  
  // Any other properties not explicitly defined
  [key: string]: any;
}

declare global {
  namespace Express {
    interface Request {
      session?: {
        id: string;
        [key: string]: any;
      };
    }
  }
  namespace NodeJS {
    interface Global {
      config: {
        observatoryEnabled: boolean;
        observatoryPaused: boolean;
      };
    }
  }
}
export interface ExceptionContent {
  type: "exception";
  message: string;
  stack: string;
  file: string;
  line: string;
  title: string;
  codeContext: {
    lineNumber: number;
    content: string;
    isErrorLine: boolean;
  }[];
  fullError: string;
}

export interface ViewContent {
  type: "view";
  view: string;
  cacheInfo: {
    cacheEnabled: boolean;
  };
  duration: number;
  size: number;
  status: "completed" | "failed";
  error: {
    message: string;
    name: string;
  } | null;
  package: "ejs" | "pug" | "handlebars";
  options: Record<string, any>;
}

export interface ScheduleContent {
  type: "schedule";
  package: "node-schedule" | "node-cron" | "bree";
  scheduleId: string;
  cronExpression: string;
  file: string;
  line: string;
  status: "completed" | "failed";
  jobId: string;
  nextInvocation?: string;
  newRule?: string;
  rule?: string;
  method?: string;
  name?: string;
  data?: Record<string, any>;
  error?: {
    message: string;
    name: string;
  } | null;
  duration?: number;
}

export interface JobContent {
  type: "job";
  method: "process" | "add" | "retryJob" | "start" | "pause" | "resume" | "processJob";
  status: "started" | "processing" | "completed" | "failed" | "released";
  package: "bull" | "agenda";
  queue: string;
  connectionName: string;
  jobData?: Record<string, any>;
  attemptsMade?: number;
  failedReason?: string;
  returnValue?: any;
  jobId?: string;
  token?: string;
  file: string;
  line: string;
  duration?: number;
  error?: {
    message: string;
    name: string;
  } | null;
}

export interface LogContent {
  package: "bunyan" | "log4js" | "signale" | "loglevel";
  type: "log";
  level: "info" | "warn" | "error" | "debug" | "verbose" | "silly" | "log";
  message: string;
  file: string;
  line: string;
  duration?: number;
}

export interface NotificationContent {
  type: "notification";
  method: "trigger" | "triggerBatch";
  status: "completed" | "failed";
  channel?: string;
  event?: string;
  data?: Record<string, any>;
  options?: Record<string, any>;
  package: "pusher" | "ably";
  file: string;
  line: string;
  duration?: number;
  error?: {
    message: string;
    name: string;
  } | null;
  response?: Record<string, any>;
}

export interface MailContent {
  type: "mail";
  status: "completed" | "failed";
  file: string;
  line: string;
  info?: {
    messageId: string;
    response: string;
  } | null;
  package: "nodemailer" | "postmark" | "@sendgrid/mail" | "mailgun.js" | "@aws-sdk/client-ses";
  duration?: number;
  command?: string;
  error?: {
    message: string;
    name: string;
  } | null;
  to?: string[];
  cc?: string[];
  bcc?: string[];
  from?: string;
  subject?: string;
  text?: string;
  body?: string;
}

export interface CacheContent {
  type: "cache";
  package: "redis" | "ioredis" | "node-cache" | "lru-cache" | "memjs" | "level" | "keyv";
  duration?: string;
  error?: {
    message: string;
    name: string;
  } | null;
  file: string;
  line: string;
  result?: any;
  hits: number;
  misses: number;
  writes: number;
  key?: string;
  value?: any;
  checkPeriod?: number;
  stdTTL?: number;
}
export interface QueryContent {
  type: "query";
  context: string;
  sql: string;
  duration: number;
  hostname: string;
  port: string;
  database: string;
  package: "mysql2" | "pg" | "sequelize" | "knex" | "prisma" | "sqlite3" | "typeorm";
  error?: {
    message: string;
    name: string;
  } | null;
  file: string;
  line: string;
  status: "completed" | "failed";
  sqlType: string;
  params?: any;
}
export interface ModelContent {
  type: "model";
  method: "create" | "find" | "findById" | "findByPk" | "findAll" | "update" | "destroy" | "count" | "sum" | "min" | "max" | "avg" | "median" | "mode" | "group" | "groupBy" | "groupByCount" | "groupBySum" | "groupByMin" | "groupByMax" | "groupByAvg" | "groupByMedian" | "groupByMode";
  status: "completed" | "failed";
  package: "sequelize" | "knex" | "prisma" | "sqlite3" | "typeorm";
  modelName: string;
  arguments: any[];
  result: any;
  file: string;
  line: string;
  duration?: number;
  error?: {
    message: string;
    name: string;
  } | null;
}
export interface RequestContent {
  type: "request";
  method: string;
  route: string;
  statusCode: number;
  duration: number;
  headers: Record<string, string>;
  query: Record<string, string>;
  params: Record<string, string>;
  ip: string;
  memoryUsage: {
    rss: number;
    heapTotal: number;
    heapUsed: number;
    external: number;
  };
  payload: any;
  responseSize: number;
  requestSize: number;
  session: Record<string, any>;
  package: "express";
}

export interface HttpClientContent {
  type: "http";
  method: string;
  route: string;
  statusCode: number;
  duration: number;
  headers: Record<string, string>;
  query: Record<string, string>;
  params: Record<string, string>;
  responseBody: string;
  responseBodySize: number;
  requestBody: string;
  requestBodySize: number;
  responseHeaders: Record<string, string>;
  href?: string;
  slashes?: boolean;
  auth?: string | null;
  hash?: string | null;
  search?: string | null;
  origin?: string;
  pathname?: string;
  path?: string;
  protocol?: string;
  statusMessage?: string;
  aborted?: boolean;
  fullUrl?: string;
}

export interface ClientResponse {
  uuid: string;
  request_id?: string;
  job_id?: string;
  schedule_id?: string;
  created_at: string;
  updated_at: string;
  type: "view" | "exception" | "request" | "model" | "cache" | "job" | "query" | "log" | "notification" | "mail" | "schedule" | "http";
  content: ViewContent | ExceptionContent | RequestContent | ModelContent | CacheContent | JobContent | QueryContent | LogContent | NotificationContent | MailContent | ScheduleContent | HttpClientContent;
}

export interface BaseGroupResponse {
  count: number;
  shortest?: number;
  longest?: number;
  average?: number;
  p95?: number;
}

export interface CacheGroupResponse extends BaseGroupResponse {
  misses: number;
  hits: number;
  writes: number;
  cache_key: string;
}

export interface ExceptionGroupResponse extends BaseGroupResponse {
  header: string;
  total: number;
}

export interface CacheInstanceResponse extends ClientResponse {
  content: CacheContent;
}

export interface RequestInstanceResponse extends ClientResponse {
  content: RequestContent;
}

export interface JobInstanceResponse extends ClientResponse {
  content: JobContent;
}

export interface ScheduleInstanceResponse extends ClientResponse {
  content: ScheduleContent;
}

export interface ViewInstanceResponse extends ClientResponse {
  content: ViewContent;
}

export interface ExceptionInstanceResponse extends ClientResponse {
  content: ExceptionContent;
}

export interface HttpClientInstanceResponse extends ClientResponse {
  content: HttpClientContent;
}

export interface MailInstanceResponse extends ClientResponse {
  content: MailContent;
}

export interface LogInstanceResponse extends ClientResponse {
  content: LogContent;
}

export interface NotificationInstanceResponse extends ClientResponse {
  content: NotificationContent;
}

export interface QueryInstanceResponse extends ClientResponse {
  content: QueryContent;
}

export interface ModelInstanceResponse extends ClientResponse {
  content: ModelContent;
}

export interface HttpClientGroupResponse extends BaseGroupResponse {
  route: string;
  count_200: number;
  count_400: number;
  count_500: number;
}

export interface JobGroupResponse extends BaseGroupResponse {
  queue: string;
  completed: number;
  released: number;
  failed: number;
}

export interface RequestGroupResponse extends BaseGroupResponse {
  route: string;
  count_200: number;
  count_400: number;
  count_500: number;
}

export interface LogGroupResponse extends BaseGroupResponse {
  level: string;
  message: string;
  info: number;
  warn: number;
  error: number;
  debug: number;
  trace: number;
  fatal: number;
  log: number;
}
export interface MailGroupResponse extends BaseGroupResponse {
  mail_to: string;
  success_count: number;
  failed_count: number;
}

export interface ModelGroupResponse extends BaseGroupResponse {
  modelName: string;
}

export interface NotificationGroupResponse extends BaseGroupResponse {
  channel: string;
  completed: number;
  failed: number;
}

export interface QueryGroupResponse extends BaseGroupResponse {
  endpoint: string;
  completed: number;
  failed: number;
}

export interface ViewGroupResponse extends BaseGroupResponse {
  size: string;
  view: string;
  completed: number;
  failed: number;
}

export interface ScheduleGroupResponse extends BaseGroupResponse {
  scheduleId: string;
  cronExpression: string;
  completed: number;
  failed: number;
}
