import mysql2 from "mysql2/promise";
import { createClient } from "redis";
import express from "express";

import dotenv from "dotenv";
dotenv.config();

// Import logger and watchers
import { setupLogger, watchers } from "../../../lib/logger";
import JobWatcher from "../../../lib/watchers/JobWatcher";

// Base class for job tests
export class BaseJobTest {
  app: express.Application;
  mysqlConnection: mysql2.Connection;
  redisClient: any;
  jobWatcher: JobWatcher;
  
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

    this.jobWatcher = watchers.jobs;
    this.jobWatcher.setRefreshIntervalDuration(1000);

    // Create Express app
    this.app = express();
  }

  async teardown() {

  }

  async waitForDataPersistence(ms = 2000) {
    await new Promise(resolve => setTimeout(resolve, ms));
  }

  async getAllJobResults() {
    return await this.jobWatcher['getAllEntries']();
  }

  async getJobResults(status = 'all') {
    const { results } = await this.jobWatcher['getIndexTableDataByInstanceSQL']({
      period: '24h',
      offset: 0,
      limit: 20,
      jobStatus: status as any,
      index: 'instance',
      isTable: true,
      queueFilter: 'all'
    });
    
    return results;
  }

  async getJobDetails(jobId: string) {
    return await this.jobWatcher['handleViewSQL'](jobId);
  }

  async getGraphData(period = '1h', status = 'all') {
    const filters = {
      period,
      jobStatus: status,
      index: 'instance',
      isTable: false,
      queueFilter: 'all'
    };
    
    return await this.jobWatcher['getIndexGraphDataSQL'](filters as any);
  }
  
  async getGroupData() {
    const filters = {
      period: '24h',
      offset: 0,
      limit: 20,
      jobStatus: 'all',
      index: 'group',
      isTable: true,
      queueFilter: 'all'
    };
    
    return await this.jobWatcher['getIndexTableDataByGroupSQL'](filters as any);
  }
} 