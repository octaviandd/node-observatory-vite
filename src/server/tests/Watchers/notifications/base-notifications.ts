import mysql2 from "mysql2/promise";
import { createClient } from "redis";
import express from "express";

import dotenv from "dotenv";
dotenv.config();

// Import notification watcher
import NotificationWatcher from "../../../lib/watchers/NotificationWatcher";
import { setupLogger, watchers } from "../../../lib/logger";
import Queue from "bull";

// Base class for notification tests
export class BaseNotificationsTest {
  app: express.Application;
  mysqlConnection: mysql2.Connection;
  redisClient: any;
  notificationWatcher: NotificationWatcher;
  notificationQueue: Queue.Queue;
  
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

    this.notificationWatcher = watchers.notifications;
    this.notificationWatcher.setRefreshIntervalDuration(1000);

    // Create Express app
    this.app = express();
    
    // Create Bull queue for notification jobs
    this.notificationQueue = new Queue('notification-queue', {
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

  async getNotificationResults(type = 'all') {
    const { results } = await this.notificationWatcher['getIndexTableDataByInstanceSQL']({
      period: '24h',
      offset: 0,
      limit: 20,
      status: type,
      index: 'instance',
      isTable: true
    });
    
    return results;
  }

  async getNotificationDetails(notificationId: string) {
    return await this.notificationWatcher['handleViewSQL'](notificationId);
  }

  async getGraphData(period = '1h', type = 'all') {
    const filters = {
      period,
      notificationType: type,
      index: 'instance',
      isTable: false
    };
    
    return await this.notificationWatcher['getIndexGraphDataSQL'](filters as any);
  }
} 