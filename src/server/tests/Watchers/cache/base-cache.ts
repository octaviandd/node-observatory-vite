import mysql2 from "mysql2/promise";
import { createClient } from "redis";
import express from "express";

import dotenv from "dotenv";
dotenv.config();

import { setupLogger, watchers } from "../../../lib/logger";
import CacheWatcher from "../../../lib/watchers/CacheWatcher";
import Queue from "bull";
import nodeCron from "node-cron";

export class BaseCacheTest {
  app: express.Application;
  mysqlConnection: mysql2.Connection;
  redisClient: any;
  cacheWatcher: CacheWatcher;
  cacheQueue: Queue.Queue;
  schedule: any;
  
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

    this.cacheWatcher = watchers.cache;
    this.cacheWatcher.setRefreshIntervalDuration(500);

    // Create Express app
    this.app = express();
    
    // Create Bull queue for cache operations
    this.cacheQueue = new Queue('cache-queue', {
      redis: {
        host: 'localhost',
        port: 6379
      }
    });

    this.schedule = nodeCron.schedule('* * * * *', () => {
      console.log('Cache test schedule setup');
    });
  }

  async teardown() {
  }

  async waitForDataPersistence(ms = 2000) {
    await new Promise(resolve => setTimeout(resolve, ms));
  }

  async getCacheResults(cacheType = 'all') {
    const { results } = await this.cacheWatcher['getIndexTableDataByInstanceSQL']({
      period: '24h',
      offset: 0,
      limit: 20,
      cacheType: cacheType as any,
      index: 'instance',
      isTable: true
    });
    
    return results;
  }

  async getCacheDetails(cacheId: string) {
    return await this.cacheWatcher['handleViewSQL'](cacheId);
  }

  async getGraphData(period = '1h', cacheType = 'all') {
    const filters = {
      period,
      cacheType,
      index: 'instance',
      isTable: false
    };
    
    return await this.cacheWatcher['getIndexGraphDataSQL'](filters as any);
  }
  
  async getGroupData() {
    const filters = {
      period: '24h',
      offset: 0,
      limit: 20,
      cacheType: 'all',
      index: 'group',
      isTable: true
    };
    
    return await this.cacheWatcher['getIndexTableDataByGroupSQL'](filters as any);
  }
} 