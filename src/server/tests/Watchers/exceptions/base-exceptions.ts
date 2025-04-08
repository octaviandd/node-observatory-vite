/** @format */
import mysql2 from "mysql2/promise";
import { createClient } from "redis";
import express from "express";
import Queue from "bull";

import dotenv from "dotenv";
dotenv.config();

// Import logger and watchers
import { setupLogger, watchers } from "../../../lib/logger";
import ExceptionWatcher from "../../../lib/watchers/ExceptionWatcher";

// Helper to reset watchers before/after tests
export class BaseExceptionTest {
  app: express.Application;
  mysqlConnection: mysql2.Connection;
  redisClient: any;
  exceptionWatcher: ExceptionWatcher;
  exceptionQueue: Queue.Queue;
  
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

    this.exceptionWatcher = watchers.errors;
    this.exceptionWatcher.setRefreshIntervalDuration(1000);

    // Create Express app
    this.app = express();
    // Create Bull queue for model operations
    this.exceptionQueue = new Queue('exception-queue', {
      redis: {
        host: 'localhost',
        port: 6379
    }
  });
  }
  
   async waitForDataPersistence(ms = 2000) {
    await new Promise(resolve => setTimeout(resolve, ms));
  }

  async getExceptionResults() {
    const { results } = await this.exceptionWatcher['getIndexTableDataByInstanceSQL']({
      period: '24h',
      offset: 0,
      limit: 20,
      index: 'instance',
      isTable: true,
      type: 'all'
    });
    
    return results;
  }

  async getExceptionDetails(exceptionId: string) {
    return await this.exceptionWatcher['handleViewSQL'](exceptionId);
  }

  async getGraphData(period = '1h') {
    const filters = {
      period,
      index: 'instance',
      isTable: false,
      type: 'all'
    };
    
    return await this.exceptionWatcher['getIndexGraphDataSQL'](filters as any);
  }
  
  async getGroupData() {
    const filters = {
      period: '24h',
      offset: 0,
      limit: 20,
      index: 'group',
      isTable: true,
      type: 'all'
    };
    
    return await this.exceptionWatcher['getIndexTableDataByGroupSQL'](filters as any);
  }
}
