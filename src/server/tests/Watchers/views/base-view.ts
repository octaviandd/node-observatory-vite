import path from "path";
import fs from "fs";
import mysql2 from "mysql2/promise";
import { createClient } from "redis";

import dotenv from "dotenv";
dotenv.config();

// Import logger and watchers
import { setupLogger, watchers } from "../../../lib/logger";
import ViewWatcher from "../../../lib/watchers/ViewsWatcher";
import express from "express";

// Base class for view tests
export class BaseViewTest {
  app: express.Application;
  mysqlConnection: mysql2.Connection;
  redisClient: any;
  viewWatcher: ViewWatcher;
  viewsDir: string;
  
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

    this.viewWatcher = watchers.view;
    this.viewWatcher.setRefreshIntervalDuration(1000);

    // Create Express app
    this.app = express();
    
    // Create views directory
    this.viewsDir = path.join(__dirname, '../../../views');
    if (!fs.existsSync(this.viewsDir)) {
      fs.mkdirSync(this.viewsDir, { recursive: true });
    }
  }

  async teardown() {
    // fs.rmSync(this.viewsDir, { recursive: true, force: true });
  }

  async waitForDataPersistence(ms = 2000) {
    await new Promise(resolve => setTimeout(resolve, ms));
  }

  async getViewResults(status = 'all') {
    const { results } = await this.viewWatcher['getIndexTableDataByInstanceSQL']({
      period: '24h',
      offset: 0,
      limit: 20,
      status: status as any,
      index: 'instance',
      isTable: true
    });
    
    return results;
  }

  async getViewDetails(viewId: string) {
    return await this.viewWatcher['handleViewSQL'](viewId);
  }

  async getGraphData(period = '1h', status = 'all') {
    const filters = {
      period,
      status,
      index: 'instance',
      isTable: false
    };
    
    return await this.viewWatcher['getIndexGraphDataSQL'](filters as any);
  }
}
