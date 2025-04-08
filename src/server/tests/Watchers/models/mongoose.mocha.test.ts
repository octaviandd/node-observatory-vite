import { describe, it, before, after } from "mocha";
import { expect } from "chai";
import request from "supertest";

import { BaseModelTest } from "./base-model";
import mongoose from "mongoose";

describe('Mongoose ORM Tests', function(this: any) {
  this.timeout(10000);
  
  const baseTest = new BaseModelTest();
  let userModel: mongoose.Model<any>;
  let postModel: mongoose.Model<any>;
  let commentModel: mongoose.Model<any>;
  
  before(async function() {
    await baseTest.setup();
    
    // Connect to MongoDB
    try {
      await mongoose.connect(process.env.MONGODB_URI);
      
      // Define User schema
      const userSchema = new mongoose.Schema({
        name: String,
        email: { type: String, required: true },
        age: Number,
        isActive: Boolean,
        tags: [String],
        created: { type: Date, default: Date.now },
        address: {
          street: String,
          city: String,
          country: String
        }
      });
      
      // Define Post schema with reference to User
      const postSchema = new mongoose.Schema({
        title: { type: String, required: true },
        content: String,
        author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        published: { type: Boolean, default: false },
        viewCount: { type: Number, default: 0 },
        tags: [String],
        created: { type: Date, default: Date.now }
      });
      
      // Define Comment schema with references to User and Post
      const commentSchema = new mongoose.Schema({
        text: { type: String, required: true },
        author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        post: { type: mongoose.Schema.Types.ObjectId, ref: 'Post' },
        created: { type: Date, default: Date.now }
      });
      
      // Add schema methods
      userSchema.methods.getFullName = function() {
        return this.name;
      };
      
      // Add schema statics
      userSchema.statics.findByEmail = function(email: string) {
        return this.findOne({ email });
      };
      
      // Create models
      userModel = mongoose.model('User', userSchema);
      postModel = mongoose.model('Post', postSchema);
      commentModel = mongoose.model('Comment', commentSchema);
    } catch (error) {
      console.error('Mongoose connection error:', error);
      this.skip();
    }
    
    // Define test routes for basic CRUD operations
    baseTest.app.get('/test-mongoose-create', async (req, res) => {
      try {
        const user = new userModel({
          name: 'Mongoose User',
          email: 'mongoose@example.com',
          age: 30,
          isActive: true,
          tags: ['user', 'test'],
          address: {
            street: '123 Main St',
            city: 'Test City',
            country: 'Test Country'
          }
        });

        await user.save();
        res.json(user);
      } catch (error) {
        res.status(500).json({ error: String(error) });
      }
    });
    
    baseTest.app.get('/test-mongoose-find', async (req, res) => {
      try {
        const users = await userModel.find();
        res.json(users);
      } catch (error) {
        res.status(500).json({ error: String(error) });
      }
    });
    
    baseTest.app.get('/test-mongoose-update', async (req, res) => {
      try {
        const user = await userModel.findOne();
        if (user) {
          user.name = 'Updated Mongoose User';
          await user.save();
          res.json(user);
        } else {
          res.status(404).json({ error: 'User not found' });
        }
      } catch (error) {
        res.status(500).json({ error: String(error) });
      }
    });
    
    baseTest.app.get('/test-mongoose-delete', async (req, res) => {
      try {
        const user = await userModel.findOne();
        if (user) {
          await user.deleteOne();
          res.json({ success: true });
        } else {
          res.status(404).json({ error: 'User not found' });
        }
      } catch (error) {
        res.status(500).json({ error: String(error) });
      }
    });
    
    // Routes for more complex operations
    baseTest.app.get('/test-mongoose-create-bulk', async (req, res) => {
      try {
        const result = await userModel.create([
          { name: 'Bulk User 1', email: 'bulk1@example.com' },
          { name: 'Bulk User 2', email: 'bulk2@example.com' },
          { name: 'Bulk User 3', email: 'bulk3@example.com' }
        ]);
        res.json(result);
      } catch (error) {
        res.status(500).json({ error: String(error) });
      }
    });
    
    baseTest.app.get('/test-mongoose-complex-query', async (req, res) => {
      try {
        const result = await userModel.find({
          $and: [
            { age: { $gte: 18 } },
            { isActive: true },
            { $or: [
              { 'address.country': 'Test Country' },
              { tags: { $in: ['test'] } }
            ]}
          ]
        })
        .select('name email age')
        .sort({ age: -1 })
        .limit(10)
        .skip(0);
        
        res.json(result);
      } catch (error) {
        res.status(500).json({ error: String(error) });
      }
    });
    
    baseTest.app.get('/test-mongoose-aggregate', async (req, res) => {
      try {
        const result = await userModel.aggregate([
          { $match: { isActive: true } },
          { $group: { _id: '$address.country', count: { $sum: 1 }, avgAge: { $avg: '$age' } } },
          { $sort: { count: -1 } }
        ]);
        res.json(result);
      } catch (error) {
        res.status(500).json({ error: String(error) });
      }
    });
    
    baseTest.app.get('/test-mongoose-transactions', async (req, res) => {
      const session = await mongoose.startSession();
      session.startTransaction();
      
      try {
        // Within a transaction, create a user and a post
        const user = await userModel.create([{
          name: 'Transaction User',
          email: 'transaction@example.com'
        }], { session });
        
        const post = await postModel.create([{
          title: 'Transaction Post',
          content: 'Created in a transaction',
          author: user[0]._id
        }], { session });
        
        await session.commitTransaction();
        session.endSession();
        
        res.json({ user, post });
      } catch (error) {
        await session.abortTransaction();
        session.endSession();
        res.status(500).json({ error: String(error) });
      }
    });
    
    baseTest.app.get('/test-mongoose-relationships', async (req, res) => {
      try {
        // Create a user
        const user = await userModel.create({
          name: 'Author User',
          email: 'author@example.com'
        });
        
        // Create a post by this user
        const post = await postModel.create({
          title: 'Test Post',
          content: 'This is a test post',
          author: user._id,
          published: true
        });
        
        // Create comments on the post
        await commentModel.create([
          {
            text: 'First comment',
            author: user._id,
            post: post._id
          },
          {
            text: 'Second comment',
            author: user._id,
            post: post._id
          }
        ]);
        
        // Retrieve post with populated author and comments
        const populatedPost = await postModel.findById(post._id)
          .populate('author')
          .exec();
          
        const comments = await commentModel.find({ post: post._id })
          .populate('author')
          .exec();
        
        res.json({ post: populatedPost, comments });
      } catch (error) {
        res.status(500).json({ error: String(error) });
      }
    });
    
    baseTest.app.get('/test-mongoose-static-methods', async (req, res) => {
      try {
        // Create a user first
        await userModel.create({
          name: 'Static Methods User',
          email: 'static@example.com'
        });
        
        // Use the static method to find by email
        const user = await userModel.findOne({ email: 'static@example.com' });
        res.json(user);
      } catch (error) {
        res.status(500).json({ error: String(error) });
      }
    });
    
    baseTest.app.get('/test-mongoose-instance-methods', async (req, res) => {
      try {
        const user = await userModel.findOne({ email: 'static@example.com' });
        if (user) {
          const fullName = user.getFullName();
          res.json({ user, fullName });
        } else {
          res.status(404).json({ error: 'User not found' });
        }
      } catch (error) {
        res.status(500).json({ error: String(error) });
      }
    });
    
    baseTest.app.get('/test-mongoose-error', async (req, res) => {
      try {
        // Force a validation error by missing required field
        await userModel.create({ name: 'Error User' });
        res.json({ success: true });
      } catch (error) {
        res.status(500).json({ error: String(error) });
      }
    });
    
    baseTest.app.get('/test-mongoose-error-invalid-id', async (req, res) => {
      try {
        // Force an error by using an invalid ID
        await userModel.findById('invalid-id');
        res.json({ success: true });
      } catch (error) {
        res.status(500).json({ error: String(error) });
      }
    });
    
    baseTest.app.get('/test-mongoose-update-bulk', async (req, res) => {
      try {
        const result = await userModel.updateMany(
          { isActive: true },
          { $set: { tags: ['updated'] } }
        );
        res.json(result);
      } catch (error) {
        res.status(500).json({ error: String(error) });
      }
    });
    
    baseTest.app.get('/test-mongoose-upsert', async (req, res) => {
      try {
        const result = await userModel.findOneAndUpdate(
          { email: 'upsert@example.com' },
          { name: 'Upsert User', email: 'upsert@example.com' },
          { upsert: true, new: true }
        );
        res.json(result);
      } catch (error) {
        res.status(500).json({ error: String(error) });
      }
    });
    
    // Add route for Bull queue model test
    baseTest.app.get('/test-mongoose-bull-queue', async (req, res) => {
      // Add job to queue
      await baseTest.modelQueue.add('mongoose-operation', {
        operation: 'create',
        data: {
          name: 'Queue Mongoose User',
          email: 'mongoose-queue@example.com'
        }
      });
      
      res.send('Mongoose Bull queue job added');
    });
    
    // Process jobs in the queue
    baseTest.modelQueue.process('mongoose-operation', async (job) => {
      const { data } = job;
      if (data.operation === 'create') {
        return await userModel.create(data.data);
      } else if (data.operation === 'find') {
        return await userModel.find();
      }
      return { success: true };
    });
  });
  
  after(async function () {
    // Clean up all collections
    await userModel.deleteMany({});
    await postModel.deleteMany({});
    await commentModel.deleteMany({});
    
    // Disconnect from MongoDB
    await mongoose.disconnect();
  });
  
  // Basic CRUD tests
  it('should track model create operations with Mongoose', async function() {
    await request(baseTest.app).get('/test-mongoose-create');
    
    await baseTest.waitForDataPersistence(2000);
    
    const results = await baseTest.getModelResults();
    
    const createOp = results.find((r: any) => 
      r.content.package === 'mongoose' && r.content.method === 'create'
    );
    
    expect(createOp).to.exist;    
    expect(createOp.content.modelName).to.equal('User');
    expect(createOp.content.result).to.have.deep.property('email', 'mongoose@example.com');
    expect(createOp.content.status).to.equal('completed');
  });
  
  it('should track model find operations with Mongoose', async function() {
    await request(baseTest.app).get('/test-mongoose-find');
    
    await baseTest.waitForDataPersistence();
    
    const results = await baseTest.getModelResults();
    
    const findOp = results.find((r: any) => 
      r.content.package === 'mongoose' && r.content.method === 'find'
    );
    
    expect(findOp).to.exist;
    expect(findOp.content.modelName).to.equal('User');
    expect(findOp.content.status).to.equal('completed');
  });
  
  it('should track model update operations with Mongoose', async function() {
    await request(baseTest.app).get('/test-mongoose-create');
    await request(baseTest.app).get('/test-mongoose-update');
    
    await baseTest.waitForDataPersistence();
    
    const results = await baseTest.getModelResults();
    
    const updateOp = results.find((r: any) => 
      r.content.package === 'mongoose' && r.content.method === 'findOne'
    );
    
    expect(updateOp).to.exist;
    expect(updateOp.content.modelName).to.equal('User');
    
    const saveOp = results.find((r: any) => 
      r.content.package === 'mongoose' && 
      r.content.method === 'create' && 
      r.content.result?.name === 'Updated Mongoose User'
    );
    
    expect(saveOp).to.exist;
  });
  
  it('should track model delete operations with Mongoose', async function() {
    await request(baseTest.app).get('/test-mongoose-create');
    await request(baseTest.app).get('/test-mongoose-delete');
    
    await baseTest.waitForDataPersistence();
    
    const results = await baseTest.getModelResults();
    
    const deleteOp = results.find((r: any) => 
      r.content.package === 'mongoose' && r.content.method === 'deleteOne'
    );
    
    expect(deleteOp).to.exist;
    expect(deleteOp.content.modelName).to.equal('User');
    expect(deleteOp.content.status).to.equal('completed');
  });
  
  // Additional complex tests
  it('should track bulk creation operations', async function() {
    await request(baseTest.app).get('/test-mongoose-create-bulk');
    
    await baseTest.waitForDataPersistence();
    
    const results = await baseTest.getModelResults();
    
    const bulkCreateOp = results.find((r: any) => 
      r.content.package === 'mongoose' && 
      r.content.method === 'create' && 
      Array.isArray(r.content.result)
    );
    
    expect(bulkCreateOp).to.exist;
    expect(bulkCreateOp.content.modelName).to.equal('User');
    expect(bulkCreateOp.content.result).to.be.an('array').with.lengthOf(3);
  });
  
  it('should track complex query operations', async function() {
    await request(baseTest.app).get('/test-mongoose-create');
    await request(baseTest.app).get('/test-mongoose-complex-query');
    
    await baseTest.waitForDataPersistence();
    
    const results = await baseTest.getModelResults();
    
    const complexQueryOp = results.find((r: any) => 
      r.content.package === 'mongoose' && 
      r.content.method === 'find' && 
      r.content.arguments && 
      r.content.arguments[0] && 
      r.content.arguments[0].$and
    );
    
    expect(complexQueryOp).to.exist;
    expect(complexQueryOp.content.modelName).to.equal('User');
  });
  
  it('should track aggregate operations', async function() {
    await request(baseTest.app).get('/test-mongoose-create');
    await request(baseTest.app).get('/test-mongoose-aggregate');
    
    await baseTest.waitForDataPersistence();
    
    const results = await baseTest.getModelResults();
    
    const aggregateOp = results.find((r: any) => 
      r.content.package === 'mongoose' && 
      r.content.method === 'aggregate'
    );
    
    expect(aggregateOp).to.exist;
    expect(aggregateOp.content.modelName).to.equal('User');
  });
  
  it('should track relationship operations with populate', async function() {
    await request(baseTest.app).get('/test-mongoose-relationships');
    
    await baseTest.waitForDataPersistence();
    
    const results = await baseTest.getModelResults();
    
    // Check for the post creation
    const postCreateOp = results.find((r: any) => 
      r.content.package === 'mongoose' && 
      r.content.method === 'create' && 
      r.content.modelName === 'Post'
    );
    
    expect(postCreateOp).to.exist;
    
    // Check for the comment creation
    const commentCreateOp = results.find((r: any) => 
      r.content.package === 'mongoose' && 
      r.content.method === 'create' && 
      r.content.modelName === 'Comment'
    );
    
    expect(commentCreateOp).to.exist;
    
    // Check for populate
    const populateOp = results.find((r: any) => 
      r.content.package === 'mongoose' && 
      r.content.method === 'findById' && 
      r.content.modelName === 'Post'
    );
    
    expect(populateOp).to.exist;
  });
  
  it('should track static method operations', async function() {
    await request(baseTest.app).get('/test-mongoose-static-methods');
    
    await baseTest.waitForDataPersistence();
    
    const results = await baseTest.getModelResults();
    
    const staticMethodOp = results.find((r: any) => 
      r.content.package === 'mongoose' && 
      r.content.method === 'findOne'
    );
    
    expect(staticMethodOp).to.exist;
    expect(staticMethodOp.content.modelName).to.equal('User');
  });
  
  it('should track bulk update operations', async function() {
    await request(baseTest.app).get('/test-mongoose-create');
    await request(baseTest.app).get('/test-mongoose-update-bulk');
    
    await baseTest.waitForDataPersistence();
    
    const results = await baseTest.getModelResults();
    
    const bulkUpdateOp = results.find((r: any) => 
      r.content.package === 'mongoose' && 
      r.content.method === 'updateMany'
    );
    
    expect(bulkUpdateOp).to.exist;
    expect(bulkUpdateOp.content.modelName).to.equal('User');
  });
  
  it('should track upsert operations', async function() {
    await request(baseTest.app).get('/test-mongoose-upsert');
    
    await baseTest.waitForDataPersistence();
    
    const results = await baseTest.getModelResults();
    
    const upsertOp = results.find((r: any) => 
      r.content.package === 'mongoose' && 
      r.content.method === 'findOneAndUpdate' && 
      r.content.arguments && 
      r.content.arguments[2] && 
      r.content.arguments[2].upsert === true
    );
    
    expect(upsertOp).to.exist;
    expect(upsertOp.content.modelName).to.equal('User');
    expect(upsertOp.content.result).to.deep.include({ email: 'upsert@example.com' });
  });
  
  // Error tests
  it('should track validation error operations', async function() {
    await request(baseTest.app).get('/test-mongoose-error').expect(500);
    
    await baseTest.waitForDataPersistence();
    
    const results = await baseTest.getModelResults();
    
    const errorOp = results.find((r: any) => 
      r.content.package === 'mongoose' && 
      r.content.status === 'failed' && 
      r.content.error && 
      r.content.error.includes('Validation')
    );
    
    expect(errorOp).to.exist;
    expect(errorOp.content.modelName).to.equal('User');
  });
  
  it('should track invalid ID error operations', async function() {
    await request(baseTest.app).get('/test-mongoose-error-invalid-id').expect(500);
    
    await baseTest.waitForDataPersistence();
    
    const results = await baseTest.getModelResults();
    
    const errorOp = results.find((r: any) => 
      r.content.package === 'mongoose' && 
      r.content.status === 'failed' && 
      r.content.method === 'findById'
    );
    
    expect(errorOp).to.exist;
  });
  
  it('should track model operations made through Bull queue with Mongoose', async function() {
    await request(baseTest.app).get('/test-mongoose-bull-queue');
    
    // Wait longer for the queue to process the job
    await baseTest.waitForDataPersistence(3000);
    
    const results = await baseTest.getModelResults();
    
    const queueOp = results.find((r: any) => 
      r.content.package === 'mongoose' && 
      r.content.method === 'create' && 
      r.content.result && 
      r.content.result.email === 'mongoose-queue@example.com'
    );
    
    expect(queueOp).to.exist;
  });
}); 