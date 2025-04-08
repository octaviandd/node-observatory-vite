import mysql2 from "mysql2/promise";
import { createClient } from "redis";
import express from "express";

import dotenv from "dotenv";
dotenv.config();

// Import logger and watchers
import { setupLogger, watchers } from "../../../lib/logger";
import QueryWatcher from "../../../lib/watchers/QueryWatcher";

// Base class for query tests
export class BaseQueryTest {
  app: express.Application;
  mysqlConnection: mysql2.Connection;
  redisClient: any;
  queryWatcher: QueryWatcher;

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

    this.queryWatcher = watchers.query;
    this.queryWatcher.setRefreshIntervalDuration(500);

    // Create Express app
    this.app = express();
  }

  async teardown() {
  }

  async waitForDataPersistence(ms = 2000) {
    await new Promise(resolve => setTimeout(resolve, ms));
  }

  async getQueryResults(status = 'all') {
    const { results } = await this.queryWatcher['getIndexTableDataByInstanceSQL']({
      period: '24h',
      offset: 0,
      limit: 20,
      status: status as any,
      index: 'instance',
      isTable: true,
      key: 'query'
    });
    
    return results;
  }

  async getQueryDetails(queryId: string) {
    return await this.queryWatcher['handleViewSQL'](queryId);
  }

  async getGraphData(period = '1h', status = 'all') {
    const filters = {
      period,
      status,
      index: 'instance',
      isTable: false
    };
    
    return await this.queryWatcher['getIndexGraphDataSQL'](filters as any);
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
    
    return await this.queryWatcher['getIndexTableDataByGroupSQL'](filters as any);
  }
} 