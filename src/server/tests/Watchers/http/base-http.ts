import mysql2 from "mysql2/promise";
import { createClient } from "redis";
import {HttpRequestData } from "../../../../../types";
import express from "express";

import dotenv from "dotenv";
dotenv.config();

// Import logger and watchers
import { setupLogger, watchers } from "../../../lib/logger";
import HTTPClientWatcher from "../../../lib/watchers/HTTPClientWatcher";
import { extractHttpDisplayData } from "../../../lib/utils";
import Queue from "bull";

// Base class for HTTP client tests
export class BaseHTTPTest {
  app: express.Application;
  server: any;
  mysqlConnection: mysql2.Connection;
  redisClient: any;
  httpClientWatcher: HTTPClientWatcher;
  httpQueue: Queue.Queue;
  
  async setup() {
    // Create Express app first
    this.app = express();
    
    // Start the server before other setup
    this.server = this.app.listen(3001);
    
    // Now set up database connections
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

    this.httpClientWatcher = watchers.http;
    this.httpClientWatcher.setRefreshIntervalDuration(1000);
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
   * Get HTTP results using the standardized interface
   */
  async getHTTPResults(status: 'all' | '2xx' | '4xx' | '5xx' = 'all', limit = 20, offset = 0): Promise<HttpRequestData[]> {
    try {
      return await this.httpClientWatcher.getStandardizedRequests(limit, offset, { status });
    } catch (error) {
      console.error(error);
      return [];
    }
  }

  /**
   * Get details for a specific HTTP request
   */
  async getHTTPDetails(httpId: string): Promise<HttpRequestData> {
    // Use the public method to get HTTP details
    const requests = await this.httpClientWatcher.getStandardizedRequests(1, 0, {});
    const request = requests.find(req => req.uuid === httpId);
    
    if (!request) {
      throw new Error(`HTTP request with ID ${httpId} not found`);
    }
    
    return request;
  }

  /**
   * Get display-friendly data for HTTP requests
   */
  async getHTTPDisplayData(status: 'all' | '2xx' | '4xx' | '5xx' = 'all', limit = 20, offset = 0) {
    try {
      const requests = await this.getHTTPResults(status, limit, offset);
      return requests.map(extractHttpDisplayData);
    } catch (error) {
      console.error(error);
      return [];
    }
  }

  async getGraphData(period = '1h', status = 'all') {
    const filters = {
      period,
      status,
      index: 'instance',
      isTable: false
    };
    
    return await this.httpClientWatcher['getIndexGraphDataSQL'](filters as any);
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
    
    return await this.httpClientWatcher['getIndexTableDataByGroupSQL'](filters as any);
  }

  /**
   * Helper function to validate that an object conforms to the HttpRequestData interface
   * @param data The HTTP request data to validate
   * @param options Optional validation options
   */
  validateHttpRequestData(
    data: HttpRequestData, 
    options: {
      expectedMethod?: string;
      expectedStatusCode?: number;
      expectError?: boolean;
      expectedErrorType?: string | string[];
      expectMedia?: boolean;
      aborted?: boolean;
    } = {}
  ) {
    const { expect } = require('chai');
    
    // Required fields
    expect(data).to.have.property('method');
    expect(data).to.have.property('origin');
    expect(data).to.have.property('pathname');
    expect(data).to.have.property('protocol');
    expect(data).to.have.property('statusCode');
    expect(data).to.have.property('statusMessage');
    expect(data).to.have.property('duration');
    expect(data).to.have.property('aborted');
    expect(data).to.have.property('headers');
    expect(data).to.have.property('responseBody');
    expect(data).to.have.property('responseBodySize');
    expect(data).to.have.property('isMedia');
    expect(data).to.have.property('library');
    expect(data).to.have.property('file');
    expect(data).to.have.property('line');
    
    // Type checks
    expect(data.method).to.be.a('string');
    expect(data.origin).to.be.a('string');
    expect(data.pathname).to.be.a('string');
    expect(data.protocol).to.be.a('string');
    expect(data.statusCode).to.be.a('number');
    expect(data.statusMessage).to.be.a('string');
    expect(data.duration).to.be.a('number');
    expect(data.aborted).to.be.a('boolean');
    expect(data.headers).to.be.an('object');
    expect(data.responseBodySize).to.be.a('number');
    expect(data.isMedia).to.be.a('boolean');
    expect(data.library).to.be.a('string');
    expect(data.file).to.be.a('string');
    expect(data.line).to.be.a('string');
    
    // Check expected values if provided
    if (options.expectedMethod) {
      expect(data.method).to.equal(options.expectedMethod);
    }
    
    if (options.expectedStatusCode) {
      expect(data.statusCode).to.equal(options.expectedStatusCode);
    }
    
    if (options.expectError) {
      expect(data.error).to.exist;
      
      if (options.expectedErrorType) {
        if (Array.isArray(options.expectedErrorType)) {
          expect(options.expectedErrorType).to.include(data.error.name);
        } else {
          expect(data.error.name).to.equal(options.expectedErrorType);
        }
      }
    }
    
    if (options.expectMedia) {
      expect(data.isMedia).to.be.true;
    }
    
    if (options.aborted !== undefined) {
      expect(data.aborted).to.equal(options.aborted);
    }
    
    // Library-specific validation
    if (data.library === 'axios') {
      // Axios should have maxRedirects
      expect(data).to.have.property('maxRedirects');
    } else if (data.library === 'got') {
      // Got-specific validations if needed
      // For example, Got might have specific properties like isStream
      if (data.isStream) {
        expect(data.isStream).to.be.a('boolean');
      }
    } else if (data.library === 'http' || data.library === 'https') {
      // HTTP/HTTPS core module specific validations
      // For example, check for socket properties
      if (data.socket) {
        expect(data.socket).to.be.an('object');
      }
    } else if (data.library === 'needle') {
      // Needle-specific validations
      // For example, Needle might have specific properties like follow_max
      if (data.follow_max) {
        expect(data.follow_max).to.be.a('number');
      }
    } else if (data.library === 'node-fetch') {
      // Node-Fetch-specific validations
      // For example, Node-Fetch might have specific properties like redirect
      if (data.redirect) {
        expect(data.redirect).to.be.a('string');
      }
    } else if (data.library === 'phin') {
      // Phin-specific validations
      // For example, Phin might have specific properties like followRedirects
      if (data.followRedirects !== undefined) {
        expect(data.followRedirects).to.be.a('boolean');
      }
    } else if (data.library === 'superagent') {
      // Superagent-specific validations
      // For example, Superagent might have specific properties like redirects
      if (data.redirects !== undefined) {
        expect(data.redirects).to.be.a('number');
      }
      // Superagent might also have a timeout property
      if (data.timeout !== undefined) {
        expect(data.timeout).to.be.a('number');
      }
    } else if (data.library === 'undici' || data.library === 'undici-fetch') {
      // Undici-specific validations
      // For example, Undici might have specific properties like dispatcher
      if (data.dispatcher) {
        expect(data.dispatcher).to.be.an('object');
      }
      
      // Check for signal property if it's an aborted request
      if (data.aborted && data.signal) {
        expect(data.signal).to.be.an('object');
      }
      
      // Check for redirect property
      if (data.redirect) {
        expect(['follow', 'error', 'manual']).to.include(data.redirect);
      }
    }
  }
} 