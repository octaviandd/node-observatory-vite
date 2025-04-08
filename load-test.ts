/**
 * Express Test Server for k6 Load Testing
 * 
 * This server provides various test endpoints that simulate different types of
 * API behaviors for load testing with k6, incorporating various packages to test
 * the observatory's ability to track them within requests.
 */

import { setupLogger } from "./src/server/lib/logger";
import axios from 'axios';
import got from 'got';
import winston from 'winston';
import pino from 'pino';
import nodemailer from 'nodemailer';
import schedule from 'node-schedule';
import { v4 as uuidv4 } from 'uuid';
import { createClient } from 'redis';
import mysql2 from 'mysql2/promise';
import express, { Router, Request, Response, NextFunction } from 'express';
import { spawn } from "child_process";
import nodeCache from 'node-cache';
import path from 'path';
import Pusher from "pusher";
import Queue from "bull";
import superagent from "superagent";
import LogLevel from "loglevel";
import { Agenda } from "agenda";
import { PrismaClient } from "@prisma/client";
// import { Client } from "pg";
import sqlite3 from "sqlite3";
import { Sequelize, DataTypes } from 'sequelize';
import { fetch as undiciFetch } from 'undici';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { Entity, PrimaryGeneratedColumn, Column, Repository, DataSource, ManyToOne, OneToMany, JoinColumn } from "typeorm";
import * as Ably from "ably";
import mongoose from "mongoose";
import knex from "knex";
import cron from "node-cron";


const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID,
  key: process.env.PUSHER_KEY,
  secret: process.env.PUSHER_SECRET,
  cluster: process.env.PUSHER_CLUSTER,
});

const nodeCacheInstance = new nodeCache();
const PORT = 3343;

// Create a single Bull queue instance that will be reused
const jobQueue = new Queue('test-queue', {
  redis: { port: 6379, host: 'localhost' }
});

// Set up the processor for the queue
jobQueue.process('*', async (job) => {
  await new Promise(resolve => setTimeout(resolve, 100));
  
  return { processed: true, jobId: job.id, timestamp: Date.now() };
});

// Handle job completion
jobQueue.on('completed', (job, result) => {
});

// Handle job failure
jobQueue.on('failed', (job, error) => {
});

// Create a single Agenda instance
const agenda = new Agenda({
  db: { address: 'mongodb+srv://octaviandavidd:Newtavi.25@cluster0.8f9ai.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0' },
});

// Start Agenda when server starts
const startAgenda = async () => {
  try {
    await agenda.start();
    console.log('Agenda started successfully');
  } catch (error) {
    console.error('Failed to start Agenda:', error);
  }
};

const app = express();

let redisConnection: any;
let mysql2Connection: any;

async function initDatabase() {
  mysql2Connection = await mysql2.createConnection({
    host: "localhost",
    user: "root",
    password: "Database.123",
    database: "observatory",
    timezone: "UTC"
  });

  redisConnection = createClient();
  await redisConnection.connect();
}

// Setup loggers
const winstonLogger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [new winston.transports.Console()]
});

const pinoLogger = pino();

// Setup mock email transporter
const transporter = nodemailer.createTransport({
  host: "smtp.ethereal.email",
  port: 587,
  secure: false, // true for port 465, false for other ports
  auth: {
    user: "maddison53@ethereal.email",
    pass: "jn7jnAPss4f63QBp6D",
  },
});

// Setup Redis client (will fail gracefully if Redis is not available)

let server: any;

// Middleware to parse JSON bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Set up view engines
app.set('view engine', 'ejs');
app.set('views', __dirname + '/views');

// Ensure views directory exists with basic templates
const fs = require('fs');
const viewsDir = path.join(__dirname, 'views');
if (!fs.existsSync(viewsDir)) {
  fs.mkdirSync(viewsDir, { recursive: true });
  
  // Create a basic EJS template
  fs.writeFileSync(path.join(viewsDir, 'index.ejs'), 
    '<html><body><h1><%= title %></h1><p><%= message %></p></body></html>');
  
  // Create a basic Pug template
  fs.writeFileSync(path.join(viewsDir, 'index.pug'), 
    'html\n  body\n    h1= title\n    p= message');
}

// Middleware to add artificial delay (simulates processing time)
const addDelay = (min: number, max: number) => (req: any, res: any, next: any) => {
  const delay = Math.floor(Math.random() * (max - min + 1) + min);
  setTimeout(next, delay);
};

// Add request ID middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  req.headers['x-request-id'] = req.headers['x-request-id'] || uuidv4();
  next();
});

// Add custom response time tracking middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    winstonLogger.info(`Request to ${req.path} completed in ${duration}ms with status ${res.statusCode}`);
  });
  next();
});

// Basic route with minimal processing
app.get('/api/basic', (req: any, res: any) => {
  res.json({ message: 'Basic endpoint response', timestamp: Date.now() });
});

// Route with simulated processing delay (50-150ms)
app.get('/api/delayed', addDelay(50, 150), (req: any, res: any) => {
  res.json({ 
    message: 'Response after processing delay', 
    processingTime: 'medium',
    timestamp: Date.now() 
  });
});

// Route that returns different sized payloads
app.get('/api/payload/:size', (req: any, res: any) => {
  const size = req.params.size || 'small';
  
  // Define payload with proper type to allow for data property
  let payload: { message: string; timestamp: number; data?: any[] } = { 
    message: 'Small payload response', 
    timestamp: Date.now() 
  };
  
  if (size === 'medium') {
    // Generate medium-sized payload (~10KB)
    payload.data = Array(100).fill(null).map((_, i) => ({
      id: i,
      value: `Item ${i} with some additional text to increase payload size`
    }));
  } 
  else if (size === 'large') {
    // Generate large payload (~100KB)
    payload.data = Array(1000).fill(null).map((_, i) => ({
      id: i,
      value: `Item ${i} with some additional text to increase payload size`,
      metadata: {
        created: new Date().toISOString(),
        modified: new Date().toISOString(),
        tags: ['tag1', 'tag2', 'tag3', 'tag4', 'tag5'],
        description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nullam auctor, nisl eget ultricies aliquam.'
      }
    }));
  }
  
  res.json(payload);
});

// Route that uses HTTP client libraries
app.get('/api/http-clients', async (req: any, res: any) => {
  const clientType = req.query.client || 'axios';
  const requestId = uuidv4();
  
  try {
    let result;
    
    switch (clientType) {
      case 'axios':
        result = await axios.get('https://jsonplaceholder.typicode.com/todos/1');
        break;
      case 'got':
        result = await got.get('https://jsonplaceholder.typicode.com/todos/1').json();
        break;
      default:
        // Use node's built-in https
        result = await new Promise((resolve, reject) => {
          const https = require('https');
          https.get('https://jsonplaceholder.typicode.com/todos/1', (resp: any) => {
            let data = '';
            resp.on('data', (chunk: any) => { data += chunk; });
            resp.on('end', () => { resolve({ data: JSON.parse(data) }); });
          }).on('error', reject);
        });
    }
    
    res.json({
      message: `HTTP client (${clientType}) request successful`,
      requestId,
      data: (result as any).data,
      timestamp: Date.now()
    });
  } catch (error: any) {
    res.status(500).json({
      error: `Error with ${clientType} request`,
      message: error.message,
      requestId,
      timestamp: Date.now()
    });
  }
});

// Route that uses database operations
app.get('/api/database', async (req: any, res: any) => {
  const requestId = uuidv4();
  
  try {
    // Perform a simple query
    const [rows] = await mysql2Connection.query('SELECT NOW() as now');
    
    res.json({
      message: 'Database query successful',
      requestId,
      timestamp: Date.now(),
      result: rows
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Database query failed',
      message: error.message,
      requestId,
      timestamp: Date.now()
    });
  }
});

// Route that uses node-cache operations
app.get('/api/cache', async (req: any, res: any) => {
  const key = req.query.key || 'test-key';
  const requestId = uuidv4();
  
  try {
    // Get current count for this key
    let count = nodeCacheInstance.get(`counter:${key}`);
    if (count === undefined) {
      count = 0;
    }
    
    // Increment counter
    if(count !== undefined && typeof count === 'number') {
      count++;
    }
    nodeCacheInstance.set(`counter:${key}`, count);

    // Store access time
    nodeCacheInstance.set(`lastAccess:${key}`, Date.now().toString());
    
    res.json({
      message: 'Cache operation successful',
      requestId,
      key,
      count,
      timestamp: Date.now()
    });
  } catch (error: any) {
    const simulatedCount = Math.floor(Math.random() * 100);
    
    res.json({
      message: 'Cache operation simulated (Cache unavailable)',
      requestId,
      key,
      simulatedCount,
      error: error.message,
      timestamp: Date.now()
    });
  }
});

// Route that uses email sending
app.post('/api/email', async (req: any, res: any) => {
  const { to, subject, text } = req.body;
  const requestId = uuidv4();
  
  if (!to || !subject || !text) {
    return res.status(400).json({
      error: 'Missing required fields',
      message: 'Please provide to, subject, and text fields',
      requestId,
      timestamp: Date.now()
    });
  }
  
  try {
    // We won't actually send emails in the test environment
    // but we'll simulate the operation
   const info = await transporter.sendMail({
    from: '"Maddison Foo Koch 👻" <maddison53@ethereal.email>', // sender address
    to: "bar@example.com, baz@example.com", // list of receivers
    subject: "Hello ✔", // Subject line
    text: "Hello world?", // plain text body
    html: "<b>Hello world?</b>", // html body
  });
    
    res.json({
      message: 'Email sent successfully (simulated)',
      requestId,
      info,
      timestamp: Date.now()
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Email sending failed',
      message: error.message,
      requestId,
      timestamp: Date.now()
    });
  }
});

// Route that uses scheduled jobs
app.post('/api/schedule', (req: any, res: any) => {
  const { seconds } = req.body;
  const requestId = uuidv4();
  
  if (!seconds || isNaN(seconds) || seconds < 1 || seconds > 60) {
    return res.status(400).json({
      error: 'Invalid seconds parameter',
      message: 'Please provide a seconds value between 1 and 60',
      requestId,
      timestamp: Date.now()
    });
  }
  
  const jobTime = new Date(Date.now() + seconds * 1000);
  
  // Schedule a job (it won't actually do anything in this test)
  const job = schedule.scheduleJob(jobTime, function() {
    winstonLogger.info('Scheduled job executed', { requestId });
  });
  
  res.json({
    message: `Job scheduled to run in ${seconds} seconds`,
    requestId,
    scheduledTime: jobTime.toISOString(),
    timestamp: Date.now()
  });
});

// Route that uses Bull queue
app.post('/api/queue', async (req: any, res: any) => {
  const { jobType, data } = req.body;
  const requestId = uuidv4();
  
  if (!jobType) {
    return res.status(400).json({
      error: 'Missing job type',
      message: 'Please provide a jobType field',
      requestId,
      timestamp: Date.now()
    });
  }
  
  try {
    // Use the existing queue instance instead of creating a new one
    const job = await jobQueue.add(jobType, {
      ...data,
      requestId,
      timestamp: Date.now()
    }, {
      attempts: 3,
      removeOnComplete: true
    });
    
    winstonLogger.info('Job added to queue', { requestId, jobType, jobId: job.id });
    
    res.json({
      message: 'Job added to queue',
      requestId,
      jobId: job.id,
      timestamp: Date.now()
    });
  } catch (error: any) {
    // If Redis is not available, simulate the operation
    pinoLogger.error({ err: error }, 'Failed to add job to queue');
    
    res.json({
      message: 'Job queuing simulated (Queue unavailable)',
      requestId,
      simulatedJobId: uuidv4(),
      error: error.message,
      timestamp: Date.now()
    });
  }
});

// Route that uses Agenda
app.post('/api/agenda', async (req: any, res: any) => {
  const { jobName, when } = req.body;
  const requestId = uuidv4();
  
  if (!jobName || !when) {
    return res.status(400).json({
      error: 'Missing required fields',
      message: 'Please provide jobName and when fields',
      requestId,
      timestamp: Date.now()
    });
  }
  
  try {
    // Check if job is already defined
    const jobDefinitions = agenda._definitions;
    if (!jobDefinitions[jobName]) {
      // Define the job if it's not already defined
      agenda.define(jobName, (job: any) => {
        winstonLogger.info(`Executing agenda job: ${jobName}`, { 
          requestId: job.attrs.data.requestId 
        });
      });
    }
    
    // Schedule the job using the shared agenda instance
    const job = await agenda.schedule(when, jobName, { requestId });
    
    res.json({
      message: `Agenda job scheduled: ${jobName}`,
      requestId,
      jobId: job.attrs._id.toString(),
      scheduledTime: job.attrs.nextRunAt,
      timestamp: Date.now()
    });
  } catch (error: any) {
    // If MongoDB is not available, simulate the operation
    LogLevel.error(`Failed to schedule agenda job: ${error.message}`);
    
    res.json({
      message: 'Agenda job scheduling simulated (MongoDB unavailable)',
      requestId,
      simulatedJobId: uuidv4(),
      error: error.message,
      timestamp: Date.now()
    });
  }
});

// Route that uses Prisma
app.get('/api/prisma', async (req: any, res: any) => {
  const requestId = uuidv4();
  
  try {
    // Create a Prisma client
    const prisma = new PrismaClient();
    
    // Simulate a query (this will fail if the database is not set up)
    // We're just demonstrating the use of the package
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    await prisma.$disconnect();
    
    res.json({
      message: 'Prisma query successful',
      requestId,
      result,
      timestamp: Date.now()
    });
  } catch (error: any) {
    // If Prisma is not set up, simulate the operation
    pinoLogger.error({ err: error }, 'Prisma query failed');
    
    res.json({
      message: 'Prisma query simulated (Prisma not configured)',
      requestId,
      simulatedResult: [{ test: 1 }],
      error: error.message,
      timestamp: Date.now()
    });
  }
});

// Route that uses PostgreSQL
app.get('/api/postgres', async (req: any, res: any) => {
  const requestId = uuidv4();
  
  // try {
  //   // Create a PostgreSQL client
  //   const pgClient = new Client({
  //     host: 'localhost',
  //     port: 5432,
  //     user: 'postgres',
  //     password: 'postgres',
  //     database: 'postgres'
  //   });
    
  //   await pgClient.connect();
  //   const result = await pgClient.query('SELECT NOW() as now');
  //   await pgClient.end();
    
  //   res.json({
  //     message: 'PostgreSQL query successful',
  //     requestId,
  //     result: result.rows,
  //     timestamp: Date.now()
  //   });
  // } catch (error: any) {
  //   // If PostgreSQL is not available, simulate the operation
  //   winstonLogger.error('PostgreSQL query failed:', error);
    
  //   res.json({
  //     message: 'PostgreSQL query simulated (PostgreSQL unavailable)',
  //     requestId,
  //     simulatedResult: [{ now: new Date() }],
  //     error: error.message,
  //     timestamp: Date.now()
  //   });
  // }
});

// Route that uses SQLite
app.get('/api/sqlite', async (req: any, res: any) => {
  const requestId = uuidv4();
  
  try {
    // Create an in-memory SQLite database
    const db = new sqlite3.Database(':memory:');
    
    // Execute a query
    const result = await new Promise((resolve, reject) => {
      db.serialize(() => {
        db.run('CREATE TABLE test (id INTEGER PRIMARY KEY, name TEXT)');
        db.run('INSERT INTO test (name) VALUES (?)', ['Test Item']);
        db.all('SELECT * FROM test', (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      });
      
      db.close();
    });
    
    res.json({
      message: 'SQLite query successful',
      requestId,
      result,
      timestamp: Date.now()
    });
  } catch (error: any) {
    // If there's an error, log it
    LogLevel.error(`SQLite query failed: ${error.message}`);
    
    res.json({
      message: 'SQLite query failed',
      requestId,
      error: error.message,
      timestamp: Date.now()
    });
  }
});

// Route that uses Sequelize
app.get('/api/sequelize', async (req: any, res: any) => {
  const requestId = uuidv4();
  
  try {
    // Create a Sequelize instance with SQLite (in-memory)

    const sequelizeInstance = new Sequelize('sqlite::memory:');
    
    // Define a model
    const User = sequelizeInstance.define('User', {
      name: DataTypes.STRING,
      email: DataTypes.STRING
    });
    
    // Sync the model and create a record
    await sequelizeInstance.sync();
    const user = await User.create({
      name: 'Test User',
      email: 'test@example.com'
    });
    
    // Find the record
    const foundUser = await User.findByPk((user as any).id);
    
    res.json({
      message: 'Sequelize operation successful',
      requestId,
      result: foundUser?.toJSON(),
      timestamp: Date.now()
    });
  } catch (error: any) {
    // If there's an error, log it
    pinoLogger.error({ err: error }, 'Sequelize operation failed');
    
    res.json({
      message: 'Sequelize operation failed',
      requestId,
      error: error.message,
      timestamp: Date.now()
    });
  }
});

// Route that uses Undici fetch
app.get('/api/undici', async (req: any, res: any) => {
  const requestId = uuidv4();
  
  try {
    // Make a request using Undici fetch
    const response = await undiciFetch('https://jsonplaceholder.typicode.com/todos/1');
    const data = await response.json();
    
    res.json({
      message: 'Undici fetch successful',
      requestId,
      data,
      timestamp: Date.now()
    });
  } catch (error: any) {
    // If there's an error, log it
    winstonLogger.error('Undici fetch failed:', error);
    
    res.status(500).json({
      error: 'Undici fetch failed',
      message: error.message,
      requestId,
      timestamp: Date.now()
    });
  }
});

// Route that uses AWS SES
app.post('/api/ses', async (req: any, res: any) => {
  const { to, subject, text } = req.body;
  const requestId = uuidv4();
  
  if (!to || !subject || !text) {
    return res.status(400).json({
      error: 'Missing required fields',
      message: 'Please provide to, subject, and text fields',
      requestId,
      timestamp: Date.now()
    });
  }
  
  try {
    // Create SES client (will fail without proper AWS credentials)
    const sesClient = new SESClient({ region: 'us-east-1' });
    
    // Create send email command
    const command = new SendEmailCommand({
      Source: 'test@example.com',
      Destination: {
        ToAddresses: [to]
      },
      Message: {
        Subject: {
          Data: subject
        },
        Body: {
          Text: {
            Data: text
          }
        }
      }
    });
    
    // Send email
    const result = await sesClient.send(command);
    
    res.json({
      message: 'SES email sent successfully',
      requestId,
      messageId: result.MessageId,
      timestamp: Date.now()
    });
  } catch (error: any) {
    // If SES is not configured, simulate the operation
    LogLevel.error(`SES email sending failed: ${error.message}`);
    
    res.json({
      message: 'SES email sending simulated (SES not configured)',
      requestId,
      simulatedMessageId: `sim-${uuidv4()}`,
      error: error.message,
      timestamp: Date.now()
    });
  }
});

// Route that uses Pusher
app.post('/api/pusher', async (req: any, res: any) => {
  const { channel, event, data } = req.body;
  const requestId = uuidv4();
  
  if (!channel || !event) {
    return res.status(400).json({
      error: 'Missing required fields',
      message: 'Please provide channel and event fields',
      requestId,
      timestamp: Date.now()
    });
  }
  
  try {
    // Trigger a Pusher event
    await pusher.trigger(channel, event, {
      ...data,
      requestId,
      timestamp: Date.now()
    });
    
    res.json({
      message: 'Pusher event triggered successfully',
      requestId,
      channel,
      event,
      timestamp: Date.now()
    });
  } catch (error: any) {
    // If Pusher fails, log the error
    pinoLogger.error({ err: error }, 'Pusher event triggering failed');
    
    res.status(500).json({
      error: 'Pusher event triggering failed',
      message: error.message,
      requestId,
      timestamp: Date.now()
    });
  }
});

// Route that uses Superagent
app.get('/api/superagent', async (req: any, res: any) => {
  const requestId = uuidv4();
  
  try {
    // Make a request using Superagent
    const response = await superagent.get('https://jsonplaceholder.typicode.com/todos/1');
    
    res.json({
      message: 'Superagent request successful',
      requestId,
      data: response.body,
      timestamp: Date.now()
    });
  } catch (error: any) {
    // If there's an error, log it
    winstonLogger.error('Superagent request failed:', error);
    
    res.status(500).json({
      error: 'Superagent request failed',
      message: error.message,
      requestId,
      timestamp: Date.now()
    });
  }
});

// Route that uses LogLevel
app.get('/api/loglevel', (req: any, res: any) => {
  const requestId = uuidv4();
  const level = req.query.level || 'info';
  
  // Configure LogLevel
  LogLevel.setLevel(level as any);
  
  // Log messages at different levels
  LogLevel.trace(`Trace message with requestId: ${requestId}`);
  LogLevel.debug(`Debug message with requestId: ${requestId}`);
  LogLevel.info(`Info message with requestId: ${requestId}`);
  LogLevel.warn(`Warning message with requestId: ${requestId}`);
  LogLevel.error(`Error message with requestId: ${requestId}`);
  
  res.json({
    message: 'LogLevel messages logged',
    requestId,
    level,
    timestamp: Date.now()
  });
});

// Route that renders a template
app.get('/api/render', (req: any, res: any) => {
  const engine = req.query.engine || 'ejs';
  const requestId = uuidv4();
  
  try {
    const data = {
      title: 'Template Rendering Test',
      message: `This template was rendered with ${engine} at ${new Date().toISOString()}`,
      description: 'This is a description',
      items: ['item1', 'item2', 'item3'],
      requestId
    };
    
    if (engine === 'ejs') {
      res.render('index.ejs', data);
    } else if (engine === 'pug') {
      res.render('index.pug', data);
    } else {
      // Fallback to direct rendering
      const html = `<html><body><h1>${data.title}</h1><p>${data.message}</p></body></html>`;
      res.send(html);
    }
    
  } catch (error) {
    res.status(500).json({
      error: 'Template rendering failed',
      message: (error as any).message,
      engine,
      requestId,
      timestamp: Date.now()
    });
  }
});

// Route that simulates CPU-intensive operation
app.get('/api/cpu-intensive', (req: any, res: any) => {
  const start = Date.now();
  
  // Simulate CPU-intensive operation
  let result = 0;
  for (let i = 0; i < 1000000; i++) {
    result += Math.sqrt(i);
  }
  
  const duration = Date.now() - start;
  
  res.json({ 
    message: 'CPU-intensive operation completed', 
    duration: `${duration}ms`,
    timestamp: Date.now() 
  });
});

// Route that simulates errors (randomly returns 500 error ~10% of the time)
app.get('/api/flaky', (req: any, res: any) => {
  if (Math.random() < 0.1) {
    winstonLogger.error('Random error in flaky endpoint');
    return res.status(500).json({ 
      error: 'Random server error occurred',
      timestamp: Date.now()
    });
  }
  
  winstonLogger.info('Flaky endpoint succeeded');
  res.json({ 
    message: 'Flaky endpoint responded successfully this time',
    timestamp: Date.now() 
  });
});

// Route with query parameter handling
app.get('/api/search', (req: any, res: any) => {
  const query = req.query.q || '';
  const limit = parseInt(req.query.limit) || 10;
  
  
  // Simulate search results
  const results = Array(limit).fill(null).map((_, i) => ({  
    id: i,
    title: `Result ${i} for "${query}"`,
    relevance: Math.random().toFixed(2)
  }));
  
  res.json({
    query,
    limit,
    results,
    timestamp: Date.now()
  });
});

// POST endpoint that accepts JSON data
app.post('/api/submit', (req: any, res: any) => {
  const data = req.body;
  
  // Simulate validation
  if (!data || !data.name) {
    return res.status(400).json({ 
      error: 'Missing required field: name',
      timestamp: Date.now()
    });
  }
  
  // Simulate processing delay
  setTimeout(() => {
    res.status(201).json({
      message: 'Data successfully submitted',
      id: Date.now().toString(36) + Math.random().toString(36).substr(2),
      timestamp: Date.now(),
      receivedData: data
    });
  }, 100);
});

// Chain of middleware (simulates authentication + processing)
app.get('/api/authenticated', 
  // Auth check middleware
  (req: any, res: any, next: any) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      winstonLogger.warn('Authentication failed - missing or invalid token');
      return res.status(401).json({ 
        error: 'Authentication required',
        timestamp: Date.now()
      });
    }
    // Simulate token validation
    req.user = { id: 123, role: 'user' };
    next();
  },
  // Processing middleware
  addDelay(20, 80),
  // Final handler
  (req: any, res: any ) => {
    res.json({
      message: 'Authenticated endpoint response',
      user: req.user,
      timestamp: Date.now()
    });
  }
);

// ==========================================
// Additional Route Patterns for Testing
// ==========================================

// Create a router for API versioning
const v1Router = Router();
const v2Router = Router();

// Router middleware
v1Router.use((req: Request, res: Response, next: NextFunction) => {
  req.headers['x-api-version'] = 'v1';
  next();
});

v2Router.use((req: Request, res: Response, next: NextFunction) => {
  req.headers['x-api-version'] = 'v2';
  next();
});

// Router routes
v1Router.get('/info', (req: Request, res: Response) => {
  res.json({ 
    version: 'v1',
    apiVersion: req.headers['x-api-version'],
    timestamp: Date.now()
  });
});

v2Router.get('/info', (req: Request, res: Response) => {
  res.json({ 
    version: 'v2',
    apiVersion: req.headers['x-api-version'],
    features: ['improved-performance', 'new-endpoints'],
    timestamp: Date.now()
  });
});

// Mount routers
app.use('/api/v1', v1Router);
app.use('/api/v2', v2Router);

// Route with multiple handlers in array
app.get('/api/multi-handler', [
  (req: Request, res: Response, next: NextFunction) => {
    req.headers['x-handler'] = '1';
    next();
  },
  (req: Request, res: Response, next: NextFunction) => {
    req.headers['x-handler'] = '2';
    next();
  },
  (req: Request, res: Response) => {
    res.json({ 
      message: 'Multiple handlers processed', 
      handler: req.headers['x-handler'],
      timestamp: Date.now()
    });
  }
]);

// Route with conditional next()
app.get('/api/conditional', 
  (req: Request, res: Response, next: NextFunction) => {
    if (req.query.pass === 'true') {
      next();
    } else {
      res.status(403).json({ 
        message: 'Access denied',
        timestamp: Date.now()
      });
    }
  },
  (req: Request, res: Response) => {
    res.json({ 
      message: 'Access granted',
      timestamp: Date.now()
    });
  }
);

// Route with error throwing
app.get('/api/error', (req: Request, res: Response) => {
  throw new Error('Intentional error for testing');
});

// Route with async handler and try/catch
app.get('/api/async-error', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Simulate async operation that fails
    await new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Async operation failed')), 10)
    );
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// Route that returns different status codes
app.get('/api/status/:code', (req: Request, res: Response) => {
  const statusCode = parseInt(req.params.code);
  res.status(statusCode).json({ 
    message: `Returned status code ${statusCode}`,
    timestamp: Date.now()
  });
});

// Nested router for products
const productsRouter = Router();

productsRouter.get('/', (req: Request, res: Response) => {
  res.json({ 
    products: Array(5).fill(null).map((_, i) => ({
      id: i + 1,
      name: `Product ${i + 1}`,
      price: Math.floor(Math.random() * 100) + 10
    })),
    timestamp: Date.now()
  });
});

productsRouter.get('/:productId', (req: Request, res: Response) => {
  const { productId } = req.params;
  res.json({ 
    id: productId,
    name: `Product ${productId}`,
    price: Math.floor(Math.random() * 100) + 10,
    description: 'Product description goes here',
    timestamp: Date.now()
  });
});

// Mount products router
app.use('/api/products', productsRouter);

// Error handler middleware (must have 4 parameters)
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ 
    message: 'Internal Server Error', 
    error: err.message,
    timestamp: Date.now()
  });
});

// ==========================================
// Exception Testing Routes for Unused Packages
// ==========================================

// MongoDB (mongoose) exception testing
app.get('/api/mongoose', async (req: Request, res: Response) => {
  const requestId = uuidv4();
  const shouldThrow = req.query.throw === 'true';
  const shouldCatch = req.query.catch === 'true';
  
  try {
    // Connect to MongoDB
    await mongoose.connect('mongodb+srv://octaviandavidd:Newtavi.25@cluster0.8f9ai.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0');
    
    // Define a schema and model
    const Schema = mongoose.Schema;
    const TestSchema = new Schema({
      name: { type: String, required: true },
      created: { type: Date, default: Date.now }
    });
    const TestModel = mongoose.model('Test', TestSchema);
    
    if (shouldThrow) {
      // Intentionally cause validation error by not providing required field
      await new TestModel({}).save();
    } else {
      // Normal operation
      const result = await TestModel.create({ name: 'Test Item' });
      res.json({
        message: 'Mongoose operation successful',
        requestId,
        result: result.toJSON(),
        timestamp: Date.now()
      });
    }
  } catch (error: any) {
    if (shouldCatch) {
      // Handled exception
      winstonLogger.error('Mongoose error (handled):', error);
      res.status(400).json({
        error: 'Mongoose operation failed (handled exception)',
        message: error.message,
        requestId,
        timestamp: Date.now()
      });
    } else {
      // Re-throw for uncaught exception
      throw error;
    }
  }
});

// Knex exception testing
app.get('/api/knex', async (req: Request, res: Response) => {
  const requestId = uuidv4();
  const shouldThrow = req.query.throw === 'true';
  const shouldCatch = req.query.catch === 'true';
  
  try {
    // Initialize Knex
    const knexInstance = knex({
      client: 'sqlite3',
      connection: {
        filename: ':memory:'
      },
      useNullAsDefault: true
    });
    
    // Create a table
    await knexInstance.schema.createTable('test_items', table => {
      table.increments('id');
      table.string('name').notNullable();
      table.timestamp('created_at').defaultTo(knexInstance.fn.now());
    });
    
    if (shouldThrow) {
      // Intentionally cause SQL error with invalid query
      if (shouldCatch) {
        // This will be caught
        await knexInstance.raw('SELECT * FROM non_existent_table');
      } else {
        // Force a schema error that might bypass the normal catch
        await knexInstance.schema.createTable('test_items', table => {
          table.increments('id');
        });
      }
    } else {
      // Normal operation
      const result = await knexInstance('test_items').insert({ name: 'Test Item' });
      res.json({
        message: 'Knex operation successful',
        requestId,
        result,
        timestamp: Date.now()
      });
    }
  } catch (error: any) {
    if (shouldCatch) {
      // Handled exception
      pinoLogger.error({ err: error }, 'Knex error (handled)');
      res.status(400).json({
        error: 'Knex operation failed (handled exception)',
        message: error.message,
        requestId,
        timestamp: Date.now()
      });
    } else {
      // Re-throw for uncaught exception
      throw error;
    }
  } finally {
    // Close connection
  }
});

// Node-cron exception testing
app.get('/api/cron', (req: Request, res: Response) => {
  const requestId = uuidv4();
  const shouldThrow = req.query.throw === 'true';
  const shouldCatch = req.query.catch === 'true';
  
  try {
    // Set up a cron job that runs immediately (* * * * * *)
    const task = cron.schedule('* * * * * *', () => {
      winstonLogger.info('Cron job executed', { requestId });
      
      if (shouldThrow) {
        // Throw an error in the cron job
        throw new Error('Intentional error in cron job');
      }
    });
    
    // Start the task
    task.start();
    
    // Stop after a short time to prevent continuous execution
    setTimeout(() => {
      task.stop();
    }, 1500);
    
    res.json({
      message: 'Cron job scheduled',
      requestId,
      timestamp: Date.now()
    });
  } catch (error: any) {
    if (shouldCatch) {
      // Handled exception (note: this won't catch errors in the cron callback)
      LogLevel.error(`Cron scheduling error (handled): ${error.message}`);
      res.status(400).json({
        error: 'Cron scheduling failed (handled exception)',
        message: error.message,
        requestId,
        timestamp: Date.now()
      });
    } else {
      // Re-throw for uncaught exception
      throw error;
    }
  }
});

// TypeORM exception testing
app.get('/api/typeorm', async (req: Request, res: Response) => {
  const requestId = uuidv4();
  const shouldThrow = req.query.throw === 'true';
  const shouldCatch = req.query.catch === 'true';
  
  try {
    // Define entities
    @Entity()
    class User {
      @PrimaryGeneratedColumn()
      id!: number;
      
      @Column()
      name!: string;
      
      @Column({ nullable: true })
      email!: string;
    }
    
    @Entity()
    class Post {
      @PrimaryGeneratedColumn()
      id!: number;
      
      @Column()
      title!: string;
      
      @Column()
      content!: string;
      
      @ManyToOne(() => User, user => user.id)
      @JoinColumn()
      author!: User;
    }
    
    // Create a connection
    const dataSource = new DataSource({
      type: 'sqlite',
      database: ':memory:',
      entities: [User, Post],
      synchronize: true,
      logging: false
    });
    
    await dataSource.initialize();
    
    // Create repositories
    const userRepository = dataSource.getRepository(User);
    const postRepository = dataSource.getRepository(Post);
    
    if (shouldThrow) {
      // Intentionally cause an error
      if (shouldCatch) {
        // This will be caught - FK constraint error
        const post = new Post();
        post.title = 'Test Post';
        post.content = 'Test Content';
        await postRepository.save(post); // Missing author relation
      } else {
        // Force a more severe error
        throw new Error('Intentional TypeORM error');
      }
    } else {
      // Normal operation
      const user = new User();
      user.name = 'Test User';
      user.email = 'test@example.com';
      await userRepository.save(user);
      
      res.json({
        message: 'TypeORM operation successful',
        requestId,
        result: { id: user.id, name: user.name },
        timestamp: Date.now()
      });
    }
  } catch (error: any) {
    if (shouldCatch) {
      // Handled exception
      winstonLogger.error('TypeORM error (handled):', error);
      res.status(400).json({
        error: 'TypeORM operation failed (handled exception)',
        message: error.message,
        requestId,
        timestamp: Date.now()
      });
    } else {
      // Re-throw for uncaught exception
      throw error;
    }
  }
});

// Ably exception testing
app.get('/api/ably', async (req: Request, res: Response) => {
  const requestId = uuidv4();
  const shouldThrow = req.query.throw === 'true';
  const shouldCatch = req.query.catch === 'true';
  
  try {
    // Initialize Ably with an invalid key to cause authentication errors
    // when shouldThrow is true
    const apiKey = shouldThrow ? 'invalid.key:secret' : 'WWF-Wg.BrAQ3g:oLfuxaZ3VhHC_0IYVP3aN-lSLSyxNe279ahwYHUQkFc';
    const ably = new Ably.Realtime({ key: apiKey });
    
    ably.connection.on('connected', () => {
      const channel = ably.channels.get('test-channel');
      
      channel.publish('test-event', { 
        message: 'Test message',
        requestId,
        timestamp: Date.now()
      });
      
      res.json({
        message: 'Ably message published',
        requestId,
        timestamp: Date.now()
      });
      
      // Close the connection after publishing
      ably.close();
    });
    
    ably.connection.on('failed', (err) => {
      if (shouldCatch) {
        // Handled exception
        pinoLogger.error({ err }, 'Ably connection failed (handled)');
        res.status(400).json({
          error: 'Ably connection failed (handled exception)',
          message: (err as any).message,
          requestId,
          timestamp: Date.now()
        });
      } else {
        // Uncaught exception
        throw err;
      }
    });
  } catch (error: any) {
    if (shouldCatch) {
      // Handled exception
      LogLevel.error(`Ably error (handled): ${error.message}`);
      res.status(400).json({
        error: 'Ably operation failed (handled exception)',
        message: error.message,
        requestId,
        timestamp: Date.now()
      });
    } else {
      // Re-throw for uncaught exception
      throw error;
    }
  }
});

// General uncaught exception generation endpoint
app.get('/api/uncaught-exception', (req: Request, res: Response) => {
  const type = req.query.type || 'standard';
  
  // This route will throw an error that should be caught by the 
  // uncaught exception handler
  setTimeout(() => {
    switch (type) {
      case 'reference':
        // ReferenceError
        // @ts-ignore
        nonExistentFunction();
        break;
      case 'type':
        // TypeError
        const x: any = null;
        x.property = 1;
        break;
      case 'syntax':
        // SyntaxError - won't be caught at runtime
        eval('this is not valid JavaScript');
        break;
      case 'range':
        // RangeError
        const arr = new Array(-1);
        break;
      default:
        // Standard Error
        throw new Error('Intentional uncaught exception');
    }
  }, 100);
  
  // This response will be sent, but the error will still occur
  // because it's in a setTimeout
  res.json({
    message: 'Uncaught exception will be triggered shortly',
    type,
    timestamp: Date.now()
  });
});

// Unhandled promise rejection endpoint
app.get('/api/unhandled-rejection', (req: Request, res: Response) => {
  const type = req.query.type || 'standard';
  
  // This route will create an unhandled promise rejection
  // that should be caught by the unhandled rejection handler
  setTimeout(() => {
    switch (type) {
      case 'async':
        // Using async without await or catch
        (async () => {
          throw new Error('Async function error without catch');
        })();
        break;
      case 'immediate':
        // Immediate promise rejection
        Promise.reject(new Error('Immediate promise rejection'));
        break;
      case 'chain':
        // Promise chain with missing catch
        Promise.resolve()
          .then(() => {
            throw new Error('Error in promise chain');
          })
          .then(() => {
            console.log('This will not run');
          });
        break;
      default:
        // Standard delayed rejection
        new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Delayed promise rejection')), 100);
        });
    }
  }, 100);
  
  // This response will be sent, but the rejection will still occur
  res.json({
    message: 'Unhandled rejection will be triggered shortly',
    type,
    timestamp: Date.now()
  });
});

// Custom error object test
app.get('/api/custom-error', (req: Request, res: Response) => {
  const shouldCatch = req.query.catch === 'true';
  
  try {
    // Create a custom error with additional properties
    const customError = new Error('Custom error with properties');
    (customError as any).code = 'CUSTOM_ERROR_CODE';
    (customError as any).details = {
      component: 'test-server',
      context: 'custom-error-route',
      userId: 12345,
      metadata: {
        important: true,
        level: 'critical',
        tags: ['test', 'custom', 'error']
      }
    };
    
    throw customError;
  } catch (error) {
    if (shouldCatch) {
      // Handled exception
      winstonLogger.error('Custom error caught:', error);
      res.status(400).json({
        message: 'Custom error was caught',
        error: (error as Error).message,
        timestamp: Date.now()
      });
    } else {
      // Re-throw for uncaught exception
      throw error;
    }
  }
});

const startServer = async () => {
  await initDatabase();
  await setupLogger("mysql2", mysql2Connection, redisConnection);
  
  // Start agenda before starting the server
  await startAgenda();
  
  server = app.listen(PORT, () => {
    console.log(`Test server running on port ${PORT}`);
  });

  const k6Process = spawn('k6', ['run', path.join(__dirname, 'requests.js')], {
    stdio: 'inherit'
  });
  
  // Handle k6 process completion
  k6Process.on('close', (code: any) => {
    console.log(`k6 load test completed with exit code ${code}`);
    // Add a delay before closing the server to ensure all requests complete
    setTimeout(() => {
      server.close(() => {
        console.log('Test server stopped');
        process.exit(0);
      });
    }, 2000); // 2 second delay
  });
  
  // Handle errors
  k6Process.on('error', (err: any) => {
    console.error('Failed to start k6:', err);
    server.close(() => {
      console.log('Test server stopped due to error');
      process.exit(1);
    });
  });
}

startServer();

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

export { server };