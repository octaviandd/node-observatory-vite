import mysql2 from "mysql2/promise";
import { createClient } from "redis";
import express from "express";

import dotenv from "dotenv";
dotenv.config();

// Import logger and watchers
import { setupLogger, watchers } from "../../../lib/logger";
import ModelWatcher from "../../../lib/watchers/ModelWatcher";
import Queue from "bull";

// Base class for model tests
export class BaseModelTest {
  app: express.Application;
  mysqlConnection: mysql2.Connection;
  redisClient: any;
  modelWatcher: ModelWatcher;
  modelQueue: Queue.Queue;
  
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

    this.modelWatcher = watchers.model;
    this.modelWatcher.setRefreshIntervalDuration(1000);

    // Create Express app
    this.app = express();
    
    // Create Bull queue for model operations
    this.modelQueue = new Queue('model-queue', {
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

  async getModelResults() {
    const { results } = await this.modelWatcher['getIndexTableDataByInstanceSQL']({
      period: '24h',
      offset: 0,
      limit: 20,
      index: 'instance',
      isTable: true
    });
    
    return results;
  }

  async getModelDetails(modelId: string) {
    return await this.modelWatcher['handleViewSQL'](modelId);
  }

  async getGraphData(period = '1h') {
    const filters = {
      period,
      index: 'instance',
      isTable: false
    };
    
    return await this.modelWatcher['getIndexGraphDataSQL'](filters as any);
  }
  
  async getGroupData() {
    const filters = {
      period: '24h',
      offset: 0,
      limit: 20,
      index: 'group',
      isTable: true
    };
    
    return await this.modelWatcher['getIndexTableDataByGroupSQL'](filters as any);
  }
} 