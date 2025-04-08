import { describe, it, before, after } from "mocha";
import { expect } from "chai";
import request from "supertest";

import { BaseQueryTest } from "./base-queries";
import mysql2 from "mysql2/promise";

describe('MySQL2 Query Tests', function(this: any) {
  this.timeout(5000);
  
  const baseTest = new BaseQueryTest();
  let connection: mysql2.Connection;
  
  before(async function() {
    await baseTest.setup();
    
    // Initialize MySQL2 connection
    connection = await mysql2.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });

    // Create test table if it doesn't exist
    try {
      const [result] = await connection.execute(`
        CREATE TABLE IF NOT EXISTS mysql2_test (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          value INT DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
    } catch (error) {
      console.error(error);
    }
    
    // Clear existing data
    try {
      await connection.execute('TRUNCATE TABLE mysql2_test');
    } catch (error) {
      console.error(error);
    }
    
    // Insert some test data
    try {
      const [result] = await connection.execute(`
        INSERT INTO mysql2_test (name, value) VALUES 
        ('test1', 100),
        ('test2', 200),
        ('test3', 300)
      `);
    } catch (error) {
      console.error(error);
    }
    
    // Define test routes
    baseTest.app.get('/test-mysql2-select', async (req, res) => {
      try {
        const [rows] = await connection.execute('SELECT * FROM mysql2_test');
        res.json(rows);
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: String(error) });
      }
    });
    
    baseTest.app.get('/test-mysql2-insert', async (req, res) => {
      try {
        const name = `test-${Date.now()}`;
        const value = Math.floor(Math.random() * 1000);
        
        const [result] = await connection.execute(
          'INSERT INTO mysql2_test (name, value) VALUES (?, ?)',
          [name, value]
        );
        res.json(result);
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: String(error) });
      }
    });
    
    baseTest.app.get('/test-mysql2-update', async (req, res) => {
      try {
        const [result] = await connection.execute(
          'UPDATE mysql2_test SET value = value + 100 WHERE name = ?',
          ['test1']
        );
        res.json(result);
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: String(error) });
      }
    });
    
    baseTest.app.get('/test-mysql2-delete', async (req, res) => {
      try {
        const [result] = await connection.execute(
          'DELETE FROM mysql2_test WHERE name = ?',
          ['test3']
        );
        res.json(result);
      } catch (error) {
        res.status(500).json({ error: String(error) });
      }
    });
    
    baseTest.app.get('/test-mysql2-transaction', async (req, res) => {
      try {
        await connection.beginTransaction();
        
        const name = `trx-`;
        await connection.execute(
          'INSERT INTO mysql2_test (name, value) VALUES (?, ?)',
          [name, 500]
        );
        
        await connection.execute(
          'UPDATE mysql2_test SET value = ? WHERE name = ?',
          [1000, name]
        );
        
        await connection.commit();
        res.json({ success: true });
      } catch (error) {
        await connection.rollback();
        res.status(500).json({ error: String(error) });
      }
    });
    
    baseTest.app.get('/test-mysql2-error', async (req, res) => {
      try {
        await connection.execute('SELECT * FROM non_existent_table');
        res.json({ success: true });
      } catch (error) {
        res.status(500).json({ error: String(error) });
      }
    });
    
    baseTest.app.get('/test-mysql2-prepared', async (req, res) => {
      try {
        const [rows] = await connection.execute(
          'SELECT * FROM mysql2_test WHERE value > ?',
          [150]
        );
        res.json(rows);
      } catch (error) {
        res.status(500).json({ error: String(error) });
      }
    });
  });
  
  after(async function() {
    if (connection) {
      await connection.execute('DROP TABLE IF EXISTS mysql2_test');
      await connection.end();
    }
    await baseTest.teardown();
  });
  
  it('should track SELECT queries', async function() {
    await request(baseTest.app).get('/test-mysql2-select');
    
    await baseTest.waitForDataPersistence();
    
    const results = await baseTest.getQueryResults();
    
    const selectQuery = results.find((r: any) => 
      r.content.sql.includes('SELECT') && 
      r.content.sql.includes('mysql2_test')
    );
    
    expect(selectQuery).to.exist;
    expect(selectQuery.content.sqlType).to.equal('SELECT');
    expect(selectQuery.content.duration).to.be.a('number');
    expect(selectQuery.content.status).to.equal('completed');
  });
  
  it('should track INSERT queries', async function() {
    await request(baseTest.app).get('/test-mysql2-insert');
    
    await baseTest.waitForDataPersistence();
    
    const results = await baseTest.getQueryResults();
    
    const insertQuery = results.find((r: any) =>
      r.content.sql.includes('INSERT') &&
      r.content.sql.includes('mysql2_test')
    );
    
    expect(insertQuery).to.exist;
    expect(insertQuery.content.sqlType).to.equal('INSERT');
  });
  
  it('should track UPDATE queries', async function() {
    await request(baseTest.app).get('/test-mysql2-update');
    
    await baseTest.waitForDataPersistence();
    
    const results = await baseTest.getQueryResults();
    
    const updateQuery = results.find((r: any) => 
      r.content.sql.includes('UPDATE') && 
      r.content.sql.includes('mysql2_test')
    );
    
    expect(updateQuery).to.exist;
    expect(updateQuery.content.sqlType).to.equal('UPDATE');
  });
  
  it('should track DELETE queries', async function() {
    await request(baseTest.app).get('/test-mysql2-delete');
    
    await baseTest.waitForDataPersistence();
    
    const results = await baseTest.getQueryResults();
    
    const deleteQuery = results.find((r: any) => 
      r.content.sql.includes('DELETE') && 
      r.content.sql.includes('mysql2_test')
    );
    
    expect(deleteQuery).to.exist;
    expect(deleteQuery.content.sqlType).to.equal('DELETE');
  });
  
  it('should track transactions', async function () {
    await request(baseTest.app).get('/test-mysql2-transaction');

    await baseTest.waitForDataPersistence();

    const results = await baseTest.getQueryResults('insert');

    const transactionInsert = results.find((r: any) => {
      return r.content.sql.includes('INSERT') &&
      r.content.sqlType === 'INSERT' &&
      r.content?.params?.includes('trx-')
    });

    expect(transactionInsert).to.exist;
  });

  it('should track failed queries', async function() {
    await request(baseTest.app).get('/test-mysql2-error').expect(500);
    
    await baseTest.waitForDataPersistence();
    
    const results = await baseTest.getQueryResults();
    
    const failedQuery = results.find((r: any) => 
      r.content.sql.includes('non_existent_table')
    );
    
    expect(failedQuery).to.exist;
    expect(failedQuery.content.error).to.exist;
  });
  
  it('should track prepared statements', async function() {
    await request(baseTest.app).get('/test-mysql2-prepared').expect(200);
    
    await baseTest.waitForDataPersistence();
    
    const results = await baseTest.getQueryResults();
    
    const preparedQuery = results.find((r: any) => 
      r.content.sql.includes('SELECT') && 
      r.content.sql.includes('mysql2_test') &&
      r.content.sql.includes('value > ?')
    );
    
    expect(preparedQuery).to.exist;
    expect(preparedQuery.content.params).to.deep.include(150);
  });
}); 