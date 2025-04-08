import mysql2 from "mysql2/promise";
import { createClient } from "redis";
import express from "express";

import dotenv from "dotenv";
dotenv.config();

// Import logger and watchers
import { setupLogger, watchers } from "../../../lib/logger";
import ScheduleWatcher from "../../../lib/watchers/ScheduleWatcher";
import Queue from "bull";

// Base class for schedule tests
export class BaseScheduleTest {
  app: express.Application;
  mysqlConnection: mysql2.Connection;
  redisClient: any;
  scheduleWatcher: ScheduleWatcher;
  scheduleQueue: Queue.Queue;
  jobsDir: string;
  
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

    this.scheduleWatcher = watchers.scheduler;
    this.scheduleWatcher.setRefreshIntervalDuration(1000);

    // Create Express app
    this.app = express();
    
    // Create Bull queue for schedule jobs
    this.scheduleQueue = new Queue('schedule-queue', {
      redis: {
        host: 'localhost',
        port: 6379
      }
    });
  }

  async teardown() {
  }

  async waitForDataPersistence(ms = 2000) {
    await new Promise(resolve => setTimeout(resolve, ms));
  }

  async getScheduleResults(status = 'all') {
    const { results } = await this.scheduleWatcher['getIndexTableDataByInstanceSQL']({
      period: '24h',
      offset: 0,
      limit: 20,
      status: status as any,
      index: 'instance',
      groupFilter: 'all',
      isTable: true
    });
    
    return results;
  }

  async getAllEntries() {
    try {
      return await this.scheduleWatcher['getAllEntries']();
    } catch (error) {
      console.error(error);
      return [];
    }
  }

  async getScheduleDetails(scheduleId: string) {
    return await this.scheduleWatcher['handleViewSQL'](scheduleId);
  }

  async getGraphData(period = '1h', status = 'all') {
    const filters = {
      period,
      status,
      index: 'instance',
      isTable: false
    };
    
    return await this.scheduleWatcher['getIndexGraphDataSQL'](filters as any);
  }
  
  async getGroupData() {
    const filters = {
      period: '24h',
      offset: 0,
      limit: 20,
      status: 'all',
      index: 'group',
      isTable: true
    };
    
    return await this.scheduleWatcher['getIndexTableDataByGroupSQL'](filters as any);
  }
} 