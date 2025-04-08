import { describe, it, before, after } from "mocha";
import { expect } from "chai";
import request from "supertest";

import { BaseQueryTest } from "./base-queries";
import knex from "knex";

describe('Knex Query Tests', function(this: any) {
  this.timeout(5000);
  
  const baseTest = new BaseQueryTest();
  let knexClient: any;
  
  before(async function() {
    await baseTest.setup();
    
    // Initialize Knex client
    knexClient = knex({
      client: 'mysql2',
      connection: {
        host: 'localhost',
        user: 'root',
        database: 'observatory'
      }
    });
    
    // Create test table if it doesn't exist
    try {
      const exists = await knexClient.schema.hasTable('knex_test');
      if (!exists) {
        await knexClient.schema.createTable('knex_test', (table: any) => {
          table.increments('id');
          table.string('name');
          table.integer('value');
          table.timestamps(true, true);
        });
      }
    } catch (error) {
      console.error(error);
    }
    
    // Clear existing data
    try {
      await knexClient('knex_test').truncate();
    } catch (error) {
      console.error(error);
    }
    
    // Insert some test data
    try {
      await knexClient('knex_test').insert([
        { name: 'test1', value: 100 },
        { name: 'test2', value: 200 },
        { name: 'test3', value: 300 }
      ]);
    } catch (error) {
      console.error(error);
    }
    
    // Define test routes
    baseTest.app.get('/test-knex-select', async (req, res) => {
      try {
        const results = await knexClient('knex_test').select('*');
        res.json(results);
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: String(error) });
      }
    });
    
    baseTest.app.get('/test-knex-insert', async (req, res) => {
      try {
        const result = await knexClient('knex_test').insert({
          name: `test-${Date.now()}`,
          value: 500
        });
        res.json({ id: result[0] });
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: String(error) });
      }
    });
    
    baseTest.app.get('/test-knex-update', async (req, res) => {
      try {
        const result = await knexClient('knex_test')
          .where('name', 'test1')
          .update({ value: 999 });
        res.json({ updated: result });
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: String(error) });
      }
    });
    
    baseTest.app.get('/test-knex-delete', async (req, res) => {
      try {
        const result = await knexClient('knex_test')
          .where('name', 'test3')
          .delete();
        res.json({ deleted: result });
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: String(error) });
      }
    });
    
    baseTest.app.get('/test-knex-transaction', async (req, res) => {
      try {
        await knexClient.transaction(async (trx: any) => {
          // Insert a record in transaction
          const [insertId] = await trx('knex_test').insert({
            name: 'trx-test',
            value: 500
          });
          
          // Update the record in the same transaction
          await trx('knex_test')
            .where('id', insertId)
            .update({ value: 1000 });
        });
        res.json({ success: true });
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: String(error) });
      }
    });
    
    baseTest.app.get('/test-knex-error', async (req, res) => {
      try {
        await knexClient('non_existent_table').select('*');
        res.json({ success: true });
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: String(error) });
      }
    });
  });
  
  after(async function() {
    if (knexClient) {
      await knexClient.destroy();
    }
  });
  
  it('should track SELECT queries', async function() {
    await request(baseTest.app).get('/test-knex-select');
    
    await baseTest.waitForDataPersistence();
    
    const results = await baseTest.getQueryResults();
    
    const selectQuery = results.find((r: any) => 
      r.content.sql.includes('select') && 
      r.content.sql.includes('knex_test')
    );
    
    expect(selectQuery).to.exist;
    expect(selectQuery.content.sqlType).to.equal('SELECT');
    expect(selectQuery.content.duration).to.be.a('number');
  });
  
  it('should track INSERT queries', async function() {
    await request(baseTest.app).get('/test-knex-insert');
    
    await baseTest.waitForDataPersistence();
    
    const results = await baseTest.getQueryResults();
    
    const insertQuery = results.find((r: any) => 
      r.content.sql.includes('insert') && 
      r.content.sql.includes('knex_test')
    );
    
    expect(insertQuery).to.exist;
    expect(insertQuery.content.sqlType).to.equal('INSERT');
    expect(insertQuery.content.params).to.exist;
  });
  
  it('should track UPDATE queries', async function() {
    await request(baseTest.app).get('/test-knex-update');
    
    await baseTest.waitForDataPersistence();
    
    const results = await baseTest.getQueryResults();
    
    const updateQuery = results.find((r: any) => 
      r.content.sql.includes('update') && 
      r.content.sql.includes('knex_test')
    );
    
    expect(updateQuery).to.exist;
    expect(updateQuery.content.sqlType).to.equal('UPDATE');
    expect(updateQuery.content.params).to.exist;
  });
  
  it('should track DELETE queries', async function() {
    await request(baseTest.app).get('/test-knex-delete');
    
    await baseTest.waitForDataPersistence();
    
    const results = await baseTest.getQueryResults();
    
    const deleteQuery = results.find((r: any) => 
      r.content.sql.includes('delete') && 
      r.content.sql.includes('knex_test')
    );
    
    expect(deleteQuery).to.exist;
    expect(deleteQuery.content.sqlType).to.equal('DELETE');
  });
  
  it('should track transactions', async function() {
    await request(baseTest.app).get('/test-knex-transaction');
    
    await baseTest.waitForDataPersistence();
    
    const results = await baseTest.getQueryResults();
    
    const transactionInsert = results.find((r: any) => 
      r.content.sql.includes('insert') && 
      r.content.sql.includes('knex_test') &&
      r.content.params?.includes('trx-test')
    );
    
    expect(transactionInsert).to.exist;
    expect(transactionInsert.content.sqlType).to.equal('INSERT');
  });
  
  it('should track failed queries', async function() {
    await request(baseTest.app).get('/test-knex-error').expect(500);
    
    await baseTest.waitForDataPersistence();
    
    const results = await baseTest.getQueryResults();
    
    const failedQuery = results.find((r: any) => 
      r.content.sql.includes('non_existent_table')
    );
    
    expect(failedQuery).to.exist;
    expect(failedQuery.content.error).to.exist;
  });
}); 