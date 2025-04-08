import mysql2 from "mysql2/promise";
import { createClient } from "redis";
import express from "express";

import dotenv from "dotenv";
dotenv.config();

// Import logger and watchers
import { setupLogger, watchers } from "../../../lib/logger";
import MailWatcher from "../../../lib/watchers/MailWatcher";
import Queue from "bull";

// Base class for mail tests
export class BaseMailTest {
  app: express.Application;
  mysqlConnection: mysql2.Connection;
  redisClient: any;
  mailWatcher: MailWatcher;
  mailQueue: Queue.Queue;
  
  async setup() {
    this.mysqlConnection = await mysql2.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });

    this.redisClient = createClient({
      url: `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`,
    });
    await this.redisClient.connect();

    await setupLogger("mysql2", this.mysqlConnection, this.redisClient);

    this.mailWatcher = watchers.mailer;
    this.mailWatcher.setRefreshIntervalDuration(1000);

    // Create Express app
    this.app = express();
    
    // Create Bull queue for mail jobs
    this.mailQueue = new Queue('mail-queue', {
      redis: {
        host: 'localhost',
        port: 6379
      }
    });
  }

  async teardown() {
    // if (this.mailQueue) {
    //   await this.mailQueue.close();
    // }
    
    // if (this.redisClient) {
    //   await this.redisClient.disconnect();
    // }
    
    // if (this.mysqlConnection) {
    //   await this.mysqlConnection.end();
    // }
  }

  async waitForDataPersistence(ms = 2000) {
    await new Promise(resolve => setTimeout(resolve, ms));
  }

  async getMailResults(status = 'all') {
    const { results } = await this.mailWatcher['getIndexTableDataByInstanceSQL']({
      period: '24h',
      offset: 0,
      limit: 20,
      status: status as "all" | "failed" | "completed",
      index: 'instance',
      isTable: true
    });
    
    return results;
  }

  async getMailDetails(mailId: string) {
    return await this.mailWatcher['handleViewSQL'](mailId);
  }

  async getGraphData(period = '1h', status = 'all') {
    const filters = {
      period,
      status,
      index: 'instance',
      isTable: false
    };
    
    return await this.mailWatcher['getIndexGraphDataSQL'](filters as any);
  }
} 