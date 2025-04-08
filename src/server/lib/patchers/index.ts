/** @format */

// LOGS
import "./patch-winston";
import "./patch-bunyan";
import "./patch-pino";
import "./patch-log4js";
import "./patch-loglevel";
import "./patch-roarr";
import "./patch-signale";

// JOBS
import "./patch-bull";
import "./patch-agenda";

// SCHEDULE
import "./patch-node-cron";
import "./patch-node-schedule";
import "./patch-bree";

// MAIL
import "./patch-nodemailer";
import "./patch-sendgrid";
import "./patch-mailgun";
import "./patch-aws_ses";
// import "./patch-postmark";

// CACHE
import "./patch-node-cache";
import "./patch-redis";
import "./patch-ioredis";
// import "./patch-memjs";
import "./patch-lru-cache";
import "./patch-keyv";
import "./patch-level";

// QUERIES + MODELS
import "./patch-mongoose";
import "./patch-sequelize";
import "./patch-typeorm";
import "./patch-prisma";
import "./patch-mysql2";
import "./patch-pg";
import "./patch-knex";


// NOTIFICATIONS
import "./patch-pusher";
import "./patch-ably";

// EXCEPTIONS
import "./patch-exceptions";

// FRAMEWORKS
// import "./patch-koa";
// import "./patch-fastify";
// import "./patch-hapi";
// import "./patch-apollo";
import "./patch-express";

// OUTGOING REQUESTS
import "./patch-http";
import "./patch-undici";


// import "./patch-argparse";
// import "./patch-commander";
// import "./patch-firebase_admin";
// import "./patch-kafkajs";
// import "./patch-meow";
// import "./patch-minimist";
// import "./patch-oclif";
// import "./patch-yargs";
