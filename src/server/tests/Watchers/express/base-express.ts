import mysql2 from "mysql2/promise";
import { createClient } from "redis";
import express from "express";
import http from "http";
import path from "path";

// Import logger and watchers
import { setupLogger, watchers } from "../../../lib/logger";
import RequestWatcher from "../../../lib/watchers/RequestWatcher";

// Base class for Express tests
export class BaseExpressTest {
  app: express.Application;
  server: http.Server;
  mysqlConnection: mysql2.Connection;
  redisClient: any;
  requestWatcher: RequestWatcher;
  viewWatcher: any;
  
  async setup() {
    // Create Express app first
    this.app = express();
    
    // Configure the app with common middleware
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
    
    // Set up view engine for testing render functionality
    this.app.set('view engine', 'ejs');
    this.app.set('views', path.join(__dirname, 'views'));
    
    // Start the server before other setup
    this.server = this.app.listen(3002);
    
    // Now set up database connections
    this.mysqlConnection = await mysql2.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      timezone: 'UTC'
    });

    this.redisClient = createClient({
      url: `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`,
    });
    await this.redisClient.connect();

    await setupLogger("mysql2", this.mysqlConnection, this.redisClient);

    this.requestWatcher = watchers.requests;
    this.viewWatcher = watchers.views;
    this.requestWatcher.setRefreshIntervalDuration(1000);
  }

  async teardown() {
    if (this.server) {
      this.server.close();
    }
  }

  async waitForDataPersistence(ms = 2000) {
    await new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get request results using the standardized interface
   */
  async getRequestResults(status: 'all' | '2xx' | '4xx' | '5xx' = 'all', limit = 20, offset = 0): Promise<any[]> {
    try {
      const filters = {
        period: '1h',
        query: '',
        isTable: true,
        offset,
        limit,
        index: 'instance',
        status,
        key: '',
      };
      
      const { results } = await this.requestWatcher['getIndexTableDataByInstanceSQL'](filters as any);
      
      return results;
    } catch (error) {
      console.error(error);
      return [];
    }
  }

  /**
   * Get details for a specific request
   */
  async getRequestDetails(requestId: string): Promise<any> {
    try {
      return await this.requestWatcher['handleViewSQL'](requestId);
    } catch (error) {
      console.error(error);
      return null;
    }
  }

  /**
   * Get related data for a specific request
   */
  async getRelatedData(requestId: string): Promise<any> {
    try {
      return await this.requestWatcher['handleRelatedDataSQL'](requestId);
    } catch (error) {
      console.error(error);
      return null;
    }
  }

  /**
   * Get graph data for requests
   */
  async getGraphData(period = '1h', status = 'all'): Promise<any> {
    try {
      const filters = {
        period,
        query: '',
        isTable: false,
        offset: 0,
        limit: 20,
        index: 'instance',
        status,
        key: '',
      };
      
      return await this.requestWatcher['getIndexGraphDataSQL'](filters as any);
    } catch (error) {
      console.error(error);
      return null;
    }
  }

  /**
   * Get group data for requests
   */
  async getGroupData(period = '24h', limit = 20, offset = 0): Promise<any> {
    try {
      const filters = {
        period,
        query: '',
        isTable: true,
        offset,
        limit,
        index: 'group',
        status: 'all',
        key: '',
      };
      
      return await this.requestWatcher['getIndexTableDataByGroupSQL'](filters as any);
    } catch (error) {
      console.error(error);
      return null;
    }
  }

  /**
   * Find a specific request in the results
   */
  findRequest(results: any[], criteria: { 
    method?: string, 
    route?: string, 
    statusCode?: number 
  }): any {
    return results.find((r) => {
      const content = r.content;
      let match = true;
      
      if (criteria.method && content.method !== criteria.method) {
        match = false;
      }
      
      if (criteria.route && content.route !== criteria.route) {
        match = false;
      }
      
      if (criteria.statusCode && content.statusCode !== criteria.statusCode) {
        match = false;
      }
      
      return match;
    });
  }

  /**
   * Validate request data
   */
  validateRequestData(data: any, options: {
    expectedMethod?: string;
    expectedRoute?: string;
    expectedStatusCode?: number;
  } = {}) {
    const { expect } = require('chai');
    
    // Required fields
    expect(data).to.have.property('content');
    
    const content = data.content;
    
    expect(content).to.have.property('method');
    expect(content).to.have.property('route');
    expect(content).to.have.property('statusCode');
    expect(content).to.have.property('duration');
    expect(content).to.have.property('responseSize');
    expect(content).to.have.property('package', 'express');
    
    // Check expected values if provided
    if (options.expectedMethod) {
      expect(content.method).to.equal(options.expectedMethod);
    }
    
    if (options.expectedRoute) {
      expect(content.route).to.equal(options.expectedRoute);
    }
    
    if (options.expectedStatusCode) {
      expect(content.statusCode).to.equal(options.expectedStatusCode);
    }
  }
} 