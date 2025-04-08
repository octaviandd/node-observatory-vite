import http from 'k6/http';
import { check, sleep } from 'k6';
import { randomSeed } from 'k6';

// Load test configuration
export const options = {
  stages: [
    { duration: '10s', target: 10 },  // Ramp up to 10 users
    { duration: '30s', target: 50 },  // Ramp up to 50 users
    { duration: '1m', target: 50 },   // Stay at 50 users for 1 minute
    { duration: '20s', target: 0 },   // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests should be below 500ms
    http_req_failed: ['rate<0.1'],    // Less than 10% of requests should fail
  },
  // Ensure requests don't share connections
  noConnectionReuse: true,
};

// Base URL for the test server
const BASE_URL = 'http://localhost:3343';

// Benchmark mode - can be set via environment variable
// Example: k6 run -e BENCHMARK_MODE=true requests.js
const BENCHMARK_MODE = __ENV.BENCHMARK_MODE === 'true';
const BENCHMARK_ITERATIONS = parseInt(__ENV.BENCHMARK_ITERATIONS || '5');
const BENCHMARK_ENDPOINTS = ((__ENV.BENCHMARK_ENDPOINTS || '').split(','))
  .filter(endpoint => endpoint.trim() !== '');

// Helper function to get a random item from an array (since k6 doesn't provide this)
function randomItem(array) {
  return array[Math.floor(Math.random() * array.length)];
}

// Helper function to generate random query parameters
function getRandomSearchParams() {
  const queries = ['product', 'service', 'support', 'contact', 'pricing', 'features'];
  const limits = [5, 10, 20, 50];
  
  return {
    q: randomItem(queries),
    limit: randomItem(limits)
  };
}

// Helper function to generate random user data for POST requests
function getRandomUserData() {
  const names = ['Alice', 'Bob', 'Charlie', 'David', 'Emma', 'Frank', 'Grace', 'Hannah'];
  const roles = ['admin', 'user', 'editor', 'viewer'];
  
  return {
    name: randomItem(names),
    email: `${randomItem(names).toLowerCase()}@example.com`,
    role: randomItem(roles),
    active: Math.random() > 0.2, // 80% chance of being active
    preferences: {
      theme: randomItem(['light', 'dark', 'system']),
      notifications: Math.random() > 0.5
    }
  };
}

// Helper function to generate random email data
function getRandomEmailData() {
  const subjects = [
    'Welcome to our service', 
    'Your account update', 
    'Important notification',
    'Monthly newsletter',
    'Security alert'
  ];
  
  return {
    to: `user${Math.floor(Math.random() * 1000)}@example.com`,
    subject: randomItem(subjects),
    text: `This is a test email sent at ${new Date().toISOString()}`
  };
}

// Helper function to generate random schedule data
function getRandomScheduleData() {
  return {
    seconds: Math.floor(Math.random() * 30) + 1 // 1-30 seconds
  };
}

// Main test function
export default function () {
  // If in benchmark mode, run the benchmark test
  if (BENCHMARK_MODE) {
    runBenchmarkTest();
    return;
  }

  // Regular test continues below
  // Ensure each VU (virtual user) has its own random seed
  randomSeed(__VU * 1000 + __ITER);
  
  // Add a unique identifier for each virtual user and iteration
  const requestId = `k6-${__VU}-${__ITER}-${Date.now()}`;
  const commonHeaders = {
    'X-Request-ID': requestId,
    'Content-Type': 'application/json'
  };
  
  // Select a random endpoint to test
  const endpoints = [
    'basic',
    'delayed',
    'payload',
    'http-clients',
    'database',
    'cache',
    'email',
    // 'schedule',
    'render',
    'cpu-intensive',
    'flaky',
    'search',
    'submit',
    'authenticated',
    'api-versioning',
    'multi-handler',
    'conditional',
    'error-routes',
    'status-codes',
    'products',
    // New endpoints
    'queue',
    'agenda',
    'prisma',
    'postgres',
    'sqlite',
    'sequelize',
    'undici',
    'ses',
    'pusher',
    'superagent',
    'loglevel',
    // Exception testing endpoints
    'mongoose',
    'knex',
    'node-cron',
    'typeorm',
    'ably',
    'uncaught-exception',
    'unhandled-rejection',
    'custom-error'
  ];
  
  // Test the selected endpoints
  for (const endpoint of endpoints) {
    switch (endpoint) {
      case 'basic':
        testBasicEndpoint(commonHeaders);
        break;
      case 'delayed':
        testDelayedEndpoint(commonHeaders);
        break;
      case 'payload':
        testPayloadEndpoint(commonHeaders);
        break;
      case 'http-clients':
        testHttpClientsEndpoint(commonHeaders);
        break;
      case 'database':
        testDatabaseEndpoint(commonHeaders);
        break;
      case 'cache':
        testCacheEndpoint(commonHeaders);
        break;
      case 'email':
        testEmailEndpoint(commonHeaders);
        break;
      case 'schedule':
        testScheduleEndpoint(commonHeaders);
        break;
      case 'render':
        testRenderEndpoint(commonHeaders);
        break;
      case 'cpu-intensive':
        testCpuIntensiveEndpoint(commonHeaders);
        break;
      case 'flaky':
        testFlakyEndpoint(commonHeaders);
        break;
      case 'search':
        testSearchEndpoint(commonHeaders);
        break;
      case 'submit':
        testSubmitEndpoint(commonHeaders);
        break;
      case 'authenticated':
        testAuthenticatedEndpoint(commonHeaders);
        break;
      // New endpoints
      case 'api-versioning':
        testApiVersioningEndpoints(commonHeaders);
        break;
      case 'multi-handler':
        testMultiHandlerEndpoint(commonHeaders);
        break;
      case 'conditional':
        testConditionalEndpoint(commonHeaders);
        break;
      case 'error-routes':
        testErrorRoutes(commonHeaders);
        break;
      case 'status-codes':
        testStatusCodesEndpoint(commonHeaders);
        break;
      case 'products':
        testProductsEndpoints(commonHeaders);
        break;
      case 'queue':
        testQueueEndpoint(commonHeaders);
        break;
      case 'agenda':
        testAgendaEndpoint(commonHeaders);
        break;
      case 'prisma':
        testPrismaEndpoint(commonHeaders);
        break;
      case 'postgres':
        testPostgresEndpoint(commonHeaders);
        break;
      case 'sqlite':
        testSqliteEndpoint(commonHeaders);
        break;
      case 'sequelize':
        testSequelizeEndpoint(commonHeaders);
        break;
      case 'undici':
        testUndiciEndpoint(commonHeaders);
        break;
      case 'ses':
        testSesEndpoint(commonHeaders);
        break;
      case 'pusher':
        testPusherEndpoint(commonHeaders);
        break;
      case 'superagent':
        testSuperagentEndpoint(commonHeaders);
        break;
      case 'loglevel':
        testLoglevelEndpoint(commonHeaders);
        break;
      case 'mongoose':
        testMongooseEndpoint(commonHeaders);
        break;
      case 'knex':
        testKnexEndpoint(commonHeaders);
        break;
      case 'node-cron':
        testNodeCronEndpoint(commonHeaders);
        break;
      case 'typeorm':
        testTypeormEndpoint(commonHeaders);
        break;
      case 'ably':
        testAblyEndpoint(commonHeaders);
        break;
      case 'uncaught-exception':
        testUncaughtExceptionEndpoint(commonHeaders);
        break;
      case 'unhandled-rejection':
        testUnhandledRejectionEndpoint(commonHeaders);
        break;
      case 'custom-error':
        testCustomErrorEndpoint(commonHeaders);
        break;
    }
    
    // Add a small random pause between endpoint tests
    sleep(Math.random() * 1 + 0.5); // 0.5-1.5 second pause
  }
  
  // Add a random pause between iterations to simulate real user behavior
  sleep(Math.random() * 2 + 1); // 1-3 second pause
}

// Test functions for each endpoint

function testBasicEndpoint(headers) {
  const response = http.get(`${BASE_URL}/api/basic`, { headers });
  
  check(response, {
    'basic endpoint returns 200': (r) => r.status === 200,
    'basic endpoint has correct structure': (r) => r.json('message') !== undefined
  });
}

function testDelayedEndpoint(headers) {
  const response = http.get(`${BASE_URL}/api/delayed`, { headers });
  
  check(response, {
    'delayed endpoint returns 200': (r) => r.status === 200,
    'delayed endpoint response time is reasonable': (r) => r.timings.duration < 300
  });
}

function testPayloadEndpoint(headers) {
  const sizes = ['small', 'medium', 'large'];
  const size = randomItem(sizes);
  
  const response = http.get(`${BASE_URL}/api/payload/${size}`, { headers });
  
  check(response, {
    'payload endpoint returns 200': (r) => r.status === 200,
    'payload has correct size indicator': (r) => {
      if (size === 'small') return !r.json('data');
      return Array.isArray(r.json('data'));
    }
  });
}

function testHttpClientsEndpoint(headers) {
  const clients = ['axios', 'got', 'https'];
  const client = randomItem(clients);
  
  const response = http.get(`${BASE_URL}/api/http-clients?client=${client}`, { headers });
  
  check(response, {
    'http-clients endpoint returns 200': (r) => r.status === 200,
    'http-clients response contains data': (r) => r.json('data') !== undefined,
    'http-clients used correct client': (r) => r.json('message').includes(client)
  });
}

function testDatabaseEndpoint(headers) {
  const response = http.get(`${BASE_URL}/api/database`, { headers });
  
  check(response, {
    'database endpoint returns 200': (r) => r.status === 200,
    'database response contains result': (r) => r.json('result') !== undefined
  });
}

function testCacheEndpoint(headers) {
  const key = `test-key-${Math.floor(Math.random() * 10)}`;
  const response = http.get(`${BASE_URL}/api/cache?key=${key}`, { headers });
  
  check(response, {
    'cache endpoint returns 200': (r) => r.status === 200,
    'cache response contains key': (r) => r.json('key') === key
  });
}

function testEmailEndpoint(headers) {
  const emailData = getRandomEmailData();
  const response = http.post(
    `${BASE_URL}/api/email`,
    JSON.stringify(emailData),
    { headers }
  );
  
  check(response, {
    'email endpoint returns 200': (r) => r.status === 200,
    'email response contains info': (r) => r.json('info') !== undefined
  });
}

function testScheduleEndpoint(headers) {
  const scheduleData = getRandomScheduleData();
  const response = http.post(
    `${BASE_URL}/api/schedule`,
    JSON.stringify(scheduleData),
    { headers }
  );
  
  check(response, {
    'schedule endpoint returns 200': (r) => r.status === 200,
    'schedule response contains scheduledTime': (r) => r.json('scheduledTime') !== undefined
  });
}

function testRenderEndpoint(headers) {
  const engines = ['ejs', 'pug', 'none'];
  const engine = randomItem(engines);
  
  const response = http.get(`${BASE_URL}/api/render?engine=${engine}`, { headers });
  
  check(response, {
    'render endpoint returns 200': (r) => r.status === 200,
    'render response is HTML': (r) => r.body.includes('<html') || r.body.includes('<!DOCTYPE')
  });
}

function testCpuIntensiveEndpoint(headers) {
  const response = http.get(`${BASE_URL}/api/cpu-intensive`, { headers });
  
  check(response, {
    'cpu-intensive endpoint returns 200': (r) => r.status === 200,
    'cpu-intensive endpoint includes duration': (r) => r.json('duration') !== undefined
  });
}

function testFlakyEndpoint(headers) {
  const response = http.get(`${BASE_URL}/api/flaky`, { headers });
  
  // We expect this to sometimes fail, so we don't check status
  check(response, {
    'flaky endpoint responded': (r) => r.status !== 0,
  });
}

function testSearchEndpoint(headers) {
  const params = getRandomSearchParams();
  const response = http.get(`${BASE_URL}/api/search?q=${params.q}&limit=${params.limit}`, { headers });
  
  check(response, {
    'search endpoint returns 200': (r) => r.status === 200,
    'search results match requested limit': (r) => r.json('results').length === params.limit,
    'search query is echoed back': (r) => r.json('query') === params.q
  });
}

function testSubmitEndpoint(headers) {
  const userData = getRandomUserData();
  const response = http.post(
    `${BASE_URL}/api/submit`,
    JSON.stringify(userData),
    { headers }
  );
  
  check(response, {
    'submit endpoint returns 201': (r) => r.status === 201,
    'submit returns created ID': (r) => typeof r.json('id') === 'string',
    'submit echoes back data': (r) => r.json('receivedData.name') === userData.name
  });
}

function testAuthenticatedEndpoint(headers) {
  // 50% of the time send valid auth, 50% invalid
  const validAuth = Math.random() > 0.5;
  
  // Create a new headers object with authorization
  // Using Object.assign instead of spread operator for k6 compatibility
  const authHeaders = Object.assign({}, headers);
  authHeaders['Authorization'] = validAuth ? 'Bearer valid-token-123' : '';
  
  const response = http.get(`${BASE_URL}/api/authenticated`, { headers: authHeaders });
  
  check(response, {
    'auth endpoint returns expected status': (r) => {
      return validAuth ? r.status === 200 : r.status === 401;
    },
    'auth endpoint returns user data when authenticated': (r) => {
      return !validAuth || (r.json('user') !== undefined);
    }
  });
}

// New test functions

function testApiVersioningEndpoints(headers) {
  // Test v1 API
  const v1Response = http.get(`${BASE_URL}/api/v1/info`, { headers });
  
  check(v1Response, {
    'v1 API returns 200': (r) => r.status === 200,
    'v1 API returns correct version': (r) => r.json('version') === 'v1',
    'v1 API has correct header': (r) => r.json('apiVersion') === 'v1'
  });
  
  // Test v2 API
  const v2Response = http.get(`${BASE_URL}/api/v2/info`, { headers });
  
  check(v2Response, {
    'v2 API returns 200': (r) => r.status === 200,
    'v2 API returns correct version': (r) => r.json('version') === 'v2',
    'v2 API has correct header': (r) => r.json('apiVersion') === 'v2',
    'v2 API includes features': (r) => Array.isArray(r.json('features'))
  });
}

function testMultiHandlerEndpoint(headers) {
  const response = http.get(`${BASE_URL}/api/multi-handler`, { headers });
  
  check(response, {
    'multi-handler endpoint returns 200': (r) => r.status === 200,
    'multi-handler processed correctly': (r) => r.json('handler') === '2'
  });
}

function testConditionalEndpoint(headers) {
  // Test with pass=true
  const passResponse = http.get(
    `${BASE_URL}/api/conditional?pass=true`, 
    { headers }
  );
  
  check(passResponse, {
    'conditional endpoint with pass returns 200': (r) => r.status === 200,
    'conditional endpoint with pass shows correct message': (r) => r.json('message') === 'Access granted'
  });
  
  // Test with pass=false
  const failResponse = http.get(
    `${BASE_URL}/api/conditional?pass=false`, 
    { headers }
  );
  
  check(failResponse, {
    'conditional endpoint without pass returns 403': (r) => r.status === 403,
    'conditional endpoint without pass shows correct message': (r) => r.json('message') === 'Access denied'
  });
}

function testErrorRoutes(headers) {
  // Test error route
  const errorResponse = http.get(
    `${BASE_URL}/api/error`, 
    { headers }
  );
  
  check(errorResponse, {
    'error route returns 500': (r) => r.status === 500,
    'error route includes error message': (r) => r.json('error') === 'Intentional error for testing'
  });
  
  // Test async error route
  const asyncErrorResponse = http.get(
    `${BASE_URL}/api/async-error`, 
    { headers }
  );
  
  check(asyncErrorResponse, {
    'async error route returns 500': (r) => r.status === 500,
    'async error route includes error message': (r) => r.json('error') === 'Async operation failed'
  });
}

function testStatusCodesEndpoint(headers) {
  const statusCodes = [200, 201, 400, 401, 403, 404, 500];
  const statusCode = randomItem(statusCodes);
  
  const response = http.get(
    `${BASE_URL}/api/status/${statusCode}`, 
    { headers }
  );
  
  check(response, {
    'status endpoint returns requested status code': (r) => r.status === statusCode
  });
}

function testProductsEndpoints(headers) {
  // Test products list
  const listResponse = http.get(
    `${BASE_URL}/api/products`, 
    { headers }
  );
  
  check(listResponse, {
    'products list returns 200': (r) => r.status === 200,
    'products list contains products array': (r) => Array.isArray(r.json('products')),
    'products list has expected length': (r) => r.json('products').length === 5
  });
  
  // Test product detail
  const productId = Math.floor(Math.random() * 100) + 1;
  const detailResponse = http.get(
    `${BASE_URL}/api/products/${productId}`, 
    { headers }
  );
  
  check(detailResponse, {
    'product detail returns 200': (r) => r.status === 200,
    'product detail returns correct ID': (r) => r.json('id') == productId,
    'product detail includes name': (r) => r.json('name') !== undefined
  });
}

// Helper function to generate random job data for queue
function getRandomJobData() {
  const jobTypes = ['email', 'notification', 'report', 'cleanup', 'sync'];
  
  return {
    jobType: randomItem(jobTypes),
    data: {
      priority: Math.floor(Math.random() * 3) + 1,
      description: `Test job created at ${new Date().toISOString()}`
    }
  };
}

// Helper function to generate random agenda job data
function getRandomAgendaData() {
  const jobNames = ['send-newsletter', 'generate-report', 'cleanup-database', 'sync-users'];
  const whenOptions = ['in 5 minutes', 'in 1 hour', 'tomorrow at 9am'];
  
  return {
    jobName: randomItem(jobNames),
    when: randomItem(whenOptions)
  };
}

// Helper function to generate random SES email data
function getRandomSesData() {
  const subjects = [
    'SES Test Email', 
    'AWS SES Notification',
    'Important SES Message'
  ];
  
  return {
    to: `user${Math.floor(Math.random() * 1000)}@example.com`,
    subject: randomItem(subjects),
    text: `This is a test SES email sent at ${new Date().toISOString()}`
  };
}

// Helper function to generate random Pusher event data
function getRandomPusherData() {
  const channels = ['notifications', 'updates', 'chat'];
  const events = ['new-message', 'status-update', 'user-activity'];
  
  return {
    channel: randomItem(channels),
    event: randomItem(events),
    data: {
      message: `Test message at ${new Date().toISOString()}`,
      importance: Math.floor(Math.random() * 3) + 1
    }
  };
}

// New test functions for the added endpoints

function testQueueEndpoint(headers) {
  const jobData = getRandomJobData();
  const response = http.post(
    `${BASE_URL}/api/queue`,
    JSON.stringify(jobData),
    { headers }
  );
  
  check(response, {
    'queue endpoint returns 200': (r) => r.status === 200,
    'queue response contains job info': (r) => r.json('jobId') !== undefined || r.json('simulatedJobId') !== undefined
  });
}

function testAgendaEndpoint(headers) {
  const agendaData = getRandomAgendaData();
  const response = http.post(
    `${BASE_URL}/api/agenda`,
    JSON.stringify(agendaData),
    { headers }
  );
  
  check(response, {
    'agenda endpoint returns 200': (r) => r.status === 200,
    'agenda response contains job info': (r) => r.json('jobId') !== undefined || r.json('simulatedJobId') !== undefined
  });
}

function testPrismaEndpoint(headers) {
  const response = http.get(`${BASE_URL}/api/prisma`, { headers });
  
  check(response, {
    'prisma endpoint returns 200': (r) => r.status === 200,
    'prisma response contains result': (r) => r.json('result') !== undefined || r.json('simulatedResult') !== undefined
  });
}

function testPostgresEndpoint(headers) {
  const response = http.get(`${BASE_URL}/api/postgres`, { headers });
  
  check(response, {
    'postgres endpoint returns 200': (r) => r.status === 200,
    'postgres response contains result': (r) => r.json('result') !== undefined || r.json('simulatedResult') !== undefined
  });
}

function testSqliteEndpoint(headers) {
  const response = http.get(`${BASE_URL}/api/sqlite`, { headers });
  
  check(response, {
    'sqlite endpoint returns 200': (r) => r.status === 200,
    'sqlite response contains result': (r) => r.json('result') !== undefined || r.json('error') !== undefined
  });
}

function testSequelizeEndpoint(headers) {
  const response = http.get(`${BASE_URL}/api/sequelize`, { headers });
  
  check(response, {
    'sequelize endpoint returns 200': (r) => r.status === 200,
    'sequelize response contains result': (r) => r.json('result') !== undefined || r.json('error') !== undefined
  });
}

function testUndiciEndpoint(headers) {
  const response = http.get(`${BASE_URL}/api/undici`, { headers });
  
  check(response, {
    'undici endpoint returns 200': (r) => r.status === 200,
    'undici response contains data': (r) => r.json('data') !== undefined
  });
}

function testSesEndpoint(headers) {
  const sesData = getRandomSesData();
  const response = http.post(
    `${BASE_URL}/api/ses`,
    JSON.stringify(sesData),
    { headers }
  );
  
  check(response, {
    'ses endpoint returns 200': (r) => r.status === 200,
    'ses response contains message info': (r) => r.json('messageId') !== undefined || r.json('simulatedMessageId') !== undefined
  });
}

function testPusherEndpoint(headers) {
  const pusherData = getRandomPusherData();
  const response = http.post(
    `${BASE_URL}/api/pusher`,
    JSON.stringify(pusherData),
    { headers }
  );
  
  check(response, {
    'pusher endpoint returns 200': (r) => r.status === 200,
    'pusher response contains event info': (r) => r.json('channel') !== undefined && r.json('event') !== undefined
  });
}

function testSuperagentEndpoint(headers) {
  const response = http.get(`${BASE_URL}/api/superagent`, { headers });
  
  check(response, {
    'superagent endpoint returns 200': (r) => r.status === 200,
    'superagent response contains data': (r) => r.json('data') !== undefined
  });
}

function testLoglevelEndpoint(headers) {
  const levels = ['trace', 'debug', 'info', 'warn', 'error'];
  const level = randomItem(levels);
  
  const response = http.get(`${BASE_URL}/api/loglevel?level=${level}`, { headers });
  
  check(response, {
    'loglevel endpoint returns 200': (r) => r.status === 200,
    'loglevel response contains level info': (r) => r.json('level') === level
  });
}

// Benchmark-specific functions
function runBenchmarkTest() {
  const requestId = `benchmark-${__VU}-${__ITER}-${Date.now()}`;
  const commonHeaders = {
    'X-Request-ID': requestId,
    'Content-Type': 'application/json'
  };
  
  // First iteration: reset metrics
  if (__ITER === 0) {
    http.post(`${BASE_URL}/benchmark/reset`, {}, { headers: commonHeaders });
    console.log('Benchmark metrics reset');
  }
  
  // Run tests with patchers enabled
  if (__ITER < BENCHMARK_ITERATIONS) {
    // Ensure patchers are enabled
    http.get(`${BASE_URL}/benchmark/toggle-patchers`, { headers: commonHeaders });
    console.log('Running benchmark with patchers enabled');
    runSelectedEndpoints(commonHeaders);
  } 
  // Then run tests with patchers disabled
  else if (__ITER < BENCHMARK_ITERATIONS * 2) {
    // Disable patchers
    if (__ITER === BENCHMARK_ITERATIONS) {
      http.get(`${BASE_URL}/benchmark/toggle-patchers`, { headers: commonHeaders });
      console.log('Running benchmark with patchers disabled');
    }
    runSelectedEndpoints(commonHeaders);
  } 
  // Finally, get and display the results
  else if (__ITER === BENCHMARK_ITERATIONS * 2) {
    const response = http.get(`${BASE_URL}/benchmark/metrics`, { headers: commonHeaders });
    console.log('Benchmark results:');
    console.log(JSON.stringify(response.json(), null, 2));
  }
  
  // Add a pause between iterations
  sleep(1);
}

function runSelectedEndpoints(headers) {
  // If specific endpoints are specified for benchmarking, use those
  // Otherwise, use a default set of endpoints that cover different types of operations
  const endpointsToTest = BENCHMARK_ENDPOINTS.length > 0 
    ? BENCHMARK_ENDPOINTS 
    : ['basic', 'http-clients', 'database', 'cache', 'cpu-intensive', 'undici', 'superagent', 
       'mongoose', 'knex', 'typeorm', 'custom-error'];
  
  for (const endpoint of endpointsToTest) {
    switch (endpoint) {
      case 'basic':
        testBasicEndpoint(headers);
        break;
      case 'delayed':
        testDelayedEndpoint(headers);
        break;
      case 'payload':
        testPayloadEndpoint(headers);
        break;
      case 'http-clients':
        testHttpClientsEndpoint(headers);
        break;
      case 'database':
        testDatabaseEndpoint(headers);
        break;
      case 'cache':
        testCacheEndpoint(headers);
        break;
      case 'email':
        testEmailEndpoint(headers);
        break;
      case 'schedule':
        testScheduleEndpoint(headers);
        break;
      case 'render':
        testRenderEndpoint(headers);
        break;
      case 'cpu-intensive':
        testCpuIntensiveEndpoint(headers);
        break;
      case 'flaky':
        testFlakyEndpoint(headers);
        break;
      case 'search':
        testSearchEndpoint(headers);
        break;
      case 'submit':
        testSubmitEndpoint(headers);
        break;
      case 'authenticated':
        testAuthenticatedEndpoint(headers);
        break;
      case 'api-versioning':
        testApiVersioningEndpoints(headers);
        break;
      case 'multi-handler':
        testMultiHandlerEndpoint(headers);
        break;
      case 'conditional':
        testConditionalEndpoint(headers);
        break;
      case 'error-routes':
        testErrorRoutes(headers);
        break;
      case 'status-codes':
        testStatusCodesEndpoint(headers);
        break;
      case 'products':
        testProductsEndpoints(headers);
        break;
      case 'queue':
        testQueueEndpoint(headers);
        break;
      case 'agenda':
        testAgendaEndpoint(headers);
        break;
      case 'prisma':
        testPrismaEndpoint(headers);
        break;
      case 'postgres':
        testPostgresEndpoint(headers);
        break;
      case 'sqlite':
        testSqliteEndpoint(headers);
        break;
      case 'sequelize':
        testSequelizeEndpoint(headers);
        break;
      case 'undici':
        testUndiciEndpoint(headers);
        break;
      case 'ses':
        testSesEndpoint(headers);
        break;
      case 'pusher':
        testPusherEndpoint(headers);
        break;
      case 'superagent':
        testSuperagentEndpoint(headers);
        break;
      case 'loglevel':
        testLoglevelEndpoint(headers);
        break;
      case 'mongoose':
        testMongooseEndpoint(headers);
        break;
      case 'knex':
        testKnexEndpoint(headers);
        break;
      case 'node-cron':
        testNodeCronEndpoint(headers);
        break;
      case 'typeorm':
        testTypeormEndpoint(headers);
        break;
      case 'ably':
        testAblyEndpoint(headers);
        break;
      case 'uncaught-exception':
        testUncaughtExceptionEndpoint(headers);
        break;
      case 'unhandled-rejection':
        testUnhandledRejectionEndpoint(headers);
        break;
      case 'custom-error':
        testCustomErrorEndpoint(headers);
        break;
    }
    
    // Add a small pause between endpoint tests
    sleep(0.2);
  }
}

// Add these new test functions for exception testing:

function testMongooseEndpoint(headers) {
  // 80% normal operation, 20% error cases
  const shouldThrow = Math.random() < 0.2;
  // When throwing, 50% should be caught, 50% uncaught
  const shouldCatch = shouldThrow && Math.random() < 0.5;
  
  const url = `${BASE_URL}/api/mongoose?throw=${shouldThrow}&catch=${shouldCatch}`;
  const response = http.get(url, { headers });
  
  check(response, {
    'mongoose endpoint responded': (r) => r.status !== 0,
    'mongoose success or expected error': (r) => {
      if (!shouldThrow) return r.status === 200;
      if (shouldCatch) return r.status === 400;
      // If throwing and not catching, we don't check status as it might crash
      return true;
    }
  });
}

function testKnexEndpoint(headers) {
  // 80% normal operation, 20% error cases
  const shouldThrow = Math.random() < 0.2;
  // When throwing, 50% should be caught, 50% uncaught
  const shouldCatch = shouldThrow && Math.random() < 0.5;
  
  const url = `${BASE_URL}/api/knex?throw=${shouldThrow}&catch=${shouldCatch}`;
  const response = http.get(url, { headers });
  
  check(response, {
    'knex endpoint responded': (r) => r.status !== 0,
    'knex success or expected error': (r) => {
      if (!shouldThrow) return r.status === 200;
      if (shouldCatch) return r.status === 400;
      // If throwing and not catching, we don't check status as it might crash
      return true;
    }
  });
}

function testNodeCronEndpoint(headers) {
  // 80% normal operation, 20% error cases
  const shouldThrow = Math.random() < 0.2;
  // When throwing, 50% should be caught, 50% uncaught
  const shouldCatch = shouldThrow && Math.random() < 0.5;
  
  const url = `${BASE_URL}/api/cron?throw=${shouldThrow}&catch=${shouldCatch}`;
  const response = http.get(url, { headers });
  
  check(response, {
    'node-cron endpoint responded': (r) => r.status !== 0,
    'node-cron success or expected error': (r) => {
      if (!shouldThrow) return r.status === 200;
      if (shouldCatch) return r.status === 400;
      // If throwing and not catching, we don't check status as it might crash
      return true;
    }
  });
}

function testTypeormEndpoint(headers) {
  // 80% normal operation, 20% error cases
  const shouldThrow = Math.random() < 0.2;
  // When throwing, 50% should be caught, 50% uncaught
  const shouldCatch = shouldThrow && Math.random() < 0.5;
  
  const url = `${BASE_URL}/api/typeorm?throw=${shouldThrow}&catch=${shouldCatch}`;
  const response = http.get(url, { headers });
  
  check(response, {
    'typeorm endpoint responded': (r) => r.status !== 0,
    'typeorm success or expected error': (r) => {
      if (!shouldThrow) return r.status === 200;
      if (shouldCatch) return r.status === 400;
      // If throwing and not catching, we don't check status as it might crash
      return true;
    }
  });
}

function testAblyEndpoint(headers) {
  // 80% normal operation, 20% error cases
  const shouldThrow = Math.random() < 0.2;
  // When throwing, 50% should be caught, 50% uncaught
  const shouldCatch = shouldThrow && Math.random() < 0.5;
  
  const url = `${BASE_URL}/api/ably?throw=${shouldThrow}&catch=${shouldCatch}`;
  const response = http.get(url, { headers });
  
  check(response, {
    'ably endpoint responded': (r) => r.status !== 0,
    'ably success or expected error': (r) => {
      if (!shouldThrow) return r.status === 200;
      if (shouldCatch) return r.status === 400;
      // If throwing and not catching, we don't check status as it might crash
      return true;
    }
  });
}

function testUncaughtExceptionEndpoint(headers) {
  // Only call this occasionally to avoid too many crashes
  if (Math.random() > 0.1) return;
  
  const errorTypes = ['standard', 'reference', 'type', 'range'];
  const type = errorTypes[Math.floor(Math.random() * errorTypes.length)];
  
  const url = `${BASE_URL}/api/uncaught-exception?type=${type}`;
  const response = http.get(url, { headers });
  
  check(response, {
    'uncaught exception endpoint responded': (r) => r.status === 200,
    'uncaught exception message is correct': (r) => r.json('message') === 'Uncaught exception will be triggered shortly'
  });
}

function testUnhandledRejectionEndpoint(headers) {
  // Only call this occasionally to avoid too many rejections
  if (Math.random() > 0.1) return;
  
  const rejectionTypes = ['standard', 'async', 'immediate', 'chain'];
  const type = rejectionTypes[Math.floor(Math.random() * rejectionTypes.length)];
  
  const url = `${BASE_URL}/api/unhandled-rejection?type=${type}`;
  const response = http.get(url, { headers });
  
  check(response, {
    'unhandled rejection endpoint responded': (r) => r.status === 200,
    'unhandled rejection message is correct': (r) => r.json('message') === 'Unhandled rejection will be triggered shortly'
  });
}

function testCustomErrorEndpoint(headers) {
  // 50% caught, 50% uncaught
  const shouldCatch = Math.random() < 0.5;
  
  const url = `${BASE_URL}/api/custom-error?catch=${shouldCatch}`;
  const response = http.get(url, { headers });
  
  check(response, {
    'custom error endpoint responded': (r) => r.status !== 0,
    'custom error success or expected error': (r) => {
      if (shouldCatch) return r.status === 400;
      // If not catching, we don't check status as it might crash
      return true;
    }
  });
} 