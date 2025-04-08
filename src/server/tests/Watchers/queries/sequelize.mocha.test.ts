import { describe, it, before, after } from "mocha";
import { expect } from "chai";
import request from "supertest";

import { BaseQueryTest } from "./base-queries";
import { Sequelize, DataTypes } from "sequelize";

describe('Sequelize Query Tests', function(this: any) {
  this.timeout(5000);
  
  const baseTest = new BaseQueryTest();
  let sequelize: Sequelize;
  let TestModel: any;
  
  before(async function() {
    await baseTest.setup();
    
    sequelize = new Sequelize({
      dialect: "sqlite",
      storage: "observatory.db",
      database: "observatory",
      username: "root",
      password: "password",
      host: "localhost",
      port: 3306,
    });
    
    // Define test model
    TestModel = sequelize.define('SequelizeTest', {
      name: {
        type: DataTypes.STRING,
        allowNull: false
      },
      value: {
        type: DataTypes.INTEGER,
        defaultValue: 0
      }
    });
    
    // Sync model with database
    await TestModel.sync({ force: true });
    
    // Insert some test data
    await TestModel.bulkCreate([
      { name: 'test1', value: 100 },
      { name: 'test2', value: 200 },
      { name: 'test3', value: 300 }
    ]);
    
    // Define test routes
    baseTest.app.get('/test-sequelize-findall', async (req, res) => {
      try {
        const results = await TestModel.findAll();
        res.json(results);
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: String(error) });
      }
    });
    
    baseTest.app.get('/test-sequelize-create', async (req, res) => {
      try {
        const result = await TestModel.create({
          name: `test-${Date.now()}`,
          value: Math.floor(Math.random() * 1000)
        });
        res.json(result);
      } catch (error) {
        res.status(500).json({ error: String(error) });
      }
    });
    
    baseTest.app.get('/test-sequelize-update', async (req, res) => {
      try {
        const result = await TestModel.update(
          { value: 999 },
          { where: { name: 'test1' } }
        );
        res.json({ updated: result[0] });
      } catch (error) {
        res.status(500).json({ error: String(error) });
      }
    });
    
    baseTest.app.get('/test-sequelize-delete', async (req, res) => {
      try {
        // First create a record to delete
        const newRecord = await TestModel.create({
          name: `to-delete-${Date.now()}`,
          value: 1
        });
        
        const result = await TestModel.destroy({
          where: { id: newRecord.id }
        });
        
        res.json({ deleted: result });
      } catch (error) {
        res.status(500).json({ error: String(error) });
      }
    });
    
    baseTest.app.get('/test-sequelize-transaction', async (req, res) => {
      try {
        const result = await sequelize.transaction(async (t) => {
          const record = await TestModel.create({
            name: `trx-`,
            value: 500
          }, { transaction: t });
          
          await TestModel.update(
            { value: 1000 },
            { 
              where: { id: record.id },
              transaction: t
            }
          );
          
          return record;
        });
        
        res.json(result);
      } catch (error) {
        res.status(500).json({ error: String(error) });
      }
    });
    
    baseTest.app.get('/test-sequelize-error', async (req, res) => {
      try {
        // Try to create a record with invalid data
        await TestModel.create({
          // Missing required 'name' field
          value: 123
        });
        
        res.json({ success: true });
      } catch (error) {
        // We expect this to fail
        console.error(error);
        res.status(500).json({ error: String(error) });
      }
    });
  });
  
  after(async function() {
  });
  
  it('should track findAll queries', async function() {
    await request(baseTest.app).get('/test-sequelize-findall').expect(200);
    
    await baseTest.waitForDataPersistence();
    
    const results = await baseTest.getQueryResults();
    
    const findQuery = results.find((r: any) => 
      r.content.sql.includes('SELECT') && 
      r.content.sql.includes('SequelizeTests')
    );
    
    expect(findQuery).to.exist;
    expect(findQuery.content.package).to.equal('sequelize');
    expect(findQuery.content.status).to.equal('completed');
  });
  
  it('should track create queries', async function() {
    await request(baseTest.app).get('/test-sequelize-create').expect(200);
    
    await baseTest.waitForDataPersistence();
    
    const results = await baseTest.getQueryResults();
    
    const createQuery = results.find((r: any) => 
      r.content.sql.includes('INSERT') && 
      r.content.sql.includes('SequelizeTests')
    );
    
    expect(createQuery).to.exist;
    expect(createQuery.content.package).to.equal('sequelize');
    expect(createQuery.content.status).to.equal('completed');
  });
  
  it('should track update queries', async function() {
    await request(baseTest.app).get('/test-sequelize-update').expect(200);
    
    await baseTest.waitForDataPersistence();
    
    const results = await baseTest.getQueryResults();
    
    const updateQuery = results.find((r: any) => 
      r.content.sql.includes('UPDATE') && 
      r.content.sql.includes('SequelizeTests') &&
      r.content.params.includes(999)
    );
    
    expect(updateQuery).to.exist;
    expect(updateQuery.content.package).to.equal('sequelize');
    expect(updateQuery.content.status).to.equal('completed');
  });
  
  it('should track delete queries', async function() {
    await request(baseTest.app).get('/test-sequelize-delete').expect(200);
    
    await baseTest.waitForDataPersistence();
    
    const results = await baseTest.getQueryResults();
    
    const deleteQuery = results.find((r: any) => 
      r.content.sql.includes('DELETE') && 
      r.content.sql.includes('SequelizeTests')
    );
    
    expect(deleteQuery).to.exist;
    expect(deleteQuery.content.package).to.equal('sequelize');
    expect(deleteQuery.content.status).to.equal('completed');
  });
  
  it('should track transaction queries', async function() {
    await request(baseTest.app).get('/test-sequelize-transaction').expect(200);
    
    await baseTest.waitForDataPersistence();
    
    const results = await baseTest.getQueryResults();
    
    // Find both the INSERT and UPDATE in the transaction
    const transactionInsert = results.find((r: any) => 
      r.content.sql.includes('INSERT') && 
      r.content.params.includes('trx-')
    );
    
    const transactionUpdate = results.find((r: any) => 
      r.content.sql.includes('UPDATE') && 
      r.content.params.includes(1000)
    );
    
    expect(transactionInsert).to.exist;
    expect(transactionUpdate).to.exist;
  });
  
  it('should track failed queries', async function() {
    await request(baseTest.app).get('/test-sequelize-error').expect(500);
    
    await baseTest.waitForDataPersistence();
    
    const results = await baseTest.getQueryResults();
    
    const failedQuery = results.find((r: any) => 
      r.content.error &&
      r.content.error.includes('notNull')
    );
    
    expect(failedQuery).to.exist;
  });
}); 