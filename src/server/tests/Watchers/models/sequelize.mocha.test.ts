import { describe, it, before, after } from "mocha";
import { expect } from "chai";
import request from "supertest";

import { BaseModelTest } from "./base-model";
import { Sequelize, DataTypes } from "sequelize";

describe('Sequelize ORM Tests', function(this: any) {
  this.timeout(10000);
  
  const baseTest = new BaseModelTest();
  let sequelizeInstance: Sequelize;
  let userModel: any;
  
  before(async function() {
    await baseTest.setup();
    
    // Initialize Sequelize
    sequelizeInstance = new Sequelize('sqlite::memory:', {
      logging: false
    });
    
    // Define User model
    userModel = sequelizeInstance.define('User', {
      name: DataTypes.STRING,
      email: DataTypes.STRING
    });
    
    // Sync models with database
    await sequelizeInstance.sync();
    
    // Define test routes for Sequelize
    baseTest.app.get('/test-sequelize-create', async (req, res) => {
      try {
        const user = await userModel.create({
          name: 'Test User',
          email: 'test@example.com'
        });
        res.json(user);
      } catch (error) {
        res.status(500).json({ error: String(error) });
      }
    });
    
    baseTest.app.get('/test-sequelize-find', async (req, res) => {
      try {
        const users = await userModel.findAll();
        res.json(users);
      } catch (error) {
        res.status(500).json({ error: String(error) });
      }
    });
    
    baseTest.app.get('/test-sequelize-update', async (req, res) => {
      try {
        const user = await userModel.findOne();
        if (user) {
          user.name = 'Updated User';
          await user.save();
          res.json(user);
        } else {
          res.status(404).json({ error: 'User not found' });
        }
      } catch (error) {
        res.status(500).json({ error: String(error) });
      }
    });
    
    baseTest.app.get('/test-sequelize-delete', async (req, res) => {
      try {
        const user = await userModel.findOne();
        await userModel.destroy({ where: { id: user.id } });
        res.json({ success: true });
      } catch (error) {
        res.status(500).json({ error: String(error) });
      }
    });
    
    // Add route for Bull queue model test
    baseTest.app.get('/test-sequelize-bull-queue', async (req, res) => {
      // Add job to queue
      await baseTest.modelQueue.add('sequelize-operation', {
        operation: 'create',
        data: {
          name: 'Queue User',
          email: 'queue@example.com'
        }
      });
      
      res.send('Sequelize Bull queue job added');
    });
    
    // Process jobs in the queue
    baseTest.modelQueue.process('sequelize-operation', async (job) => {
      const { data } = job;
      if (data.operation === 'create') {
        return await userModel.create(data.data);
      } else if (data.operation === 'find') {
        return await userModel.findAll();
      }
      return { success: true };
    });
  });
  
  after(async function() {
    if (sequelizeInstance) {
      await sequelizeInstance.close();
    }
    
    await baseTest.teardown();
  });
  
  it('should track model create operations with Sequelize', async function() {
    await request(baseTest.app).get('/test-sequelize-create');
    
    await baseTest.waitForDataPersistence(2000);
    
    const results = await baseTest.getModelResults();
    
    const createOp = results.find((r: any) => 
      r.content.package === 'sequelize' && r.content.method === 'create'
    );
    
    expect(createOp).to.exist;
    expect(createOp.content.modelName).to.equal('User');
  });
  
  it('should track model find operations with Sequelize', async function() {
    await request(baseTest.app).get('/test-sequelize-find');
    
    await baseTest.waitForDataPersistence(2000);
    
    const results = await baseTest.getModelResults();
    
    const findOp = results.find((r: any) => 
      r.content.package === 'sequelize' && r.content.method === 'findAll'
    );
    
    expect(findOp).to.exist;
    expect(findOp.content.modelName).to.equal('User');
  });
  
  it('should track model update operations with Sequelize', async function() {
    await request(baseTest.app).get('/test-sequelize-create');
    await request(baseTest.app).get('/test-sequelize-update');
    
    await baseTest.waitForDataPersistence(2000);
    
    const results = await baseTest.getModelResults();
    
    const updateOp = results.find((r: any) => 
      r.content.package === 'sequelize' && r.content.method === 'findOne'
    );
    
    expect(updateOp).to.exist;
    expect(updateOp.content.modelName).to.equal('User');
  });
  
  it('should track model delete operations with Sequelize', async function() {
    await request(baseTest.app).get('/test-sequelize-create');
    await request(baseTest.app).get('/test-sequelize-delete');
    
    await baseTest.waitForDataPersistence(2000);
    
    const results = await baseTest.getModelResults();
    
    const deleteOp = results.find((r: any) => 
      r.content.package === 'sequelize' && r.content.method === 'destroy'
    );
    
    expect(deleteOp).to.exist;
    expect(deleteOp.content.modelName).to.equal('User');
  });
  
  it('should track model operations made through Bull queue with Sequelize', async function() {
    await request(baseTest.app).get('/test-sequelize-bull-queue');
    
    // Wait longer for the queue to process the job
    await baseTest.waitForDataPersistence(2000);
    
    const results = await baseTest.getModelResults();
    
    const queueOp = results.find((r: any) => 
      r.content.package === 'sequelize' &&
      r.content.method === 'create'
    );
    
    expect(queueOp).to.exist;
    expect(queueOp.job_id).to.exist;
    expect(queueOp.content.modelName).to.equal('User');
  });
  
  it('should retrieve model operation details', async function() {
    await request(baseTest.app).get('/test-sequelize-create');
    
    await baseTest.waitForDataPersistence(2000);
    
    const results = await baseTest.getModelResults();
    const modelId = results.find((r: any) => 
      r.content.package === 'sequelize'
    ).uuid;
    
    const modelData = await baseTest.getModelDetails(modelId);
    
    expect(modelData).to.have.property('model');
    expect(modelData.model[0].type).to.equal('model');
    expect(modelData.model[0].content).to.have.property('modelName');
    expect(modelData.model[0].content).to.have.property('method');
  });
  
  it('should get graph data for model operations', async function() {
    await request(baseTest.app).get('/test-sequelize-create');
    await request(baseTest.app).get('/test-sequelize-find');
    
    await baseTest.waitForDataPersistence(2000);
    
    const graphData = await baseTest.getGraphData();
    
    expect(graphData).to.have.property('countFormattedData');
    expect(graphData).to.have.property('durationFormattedData');
    expect(graphData).to.have.property('count');
  });
}); 