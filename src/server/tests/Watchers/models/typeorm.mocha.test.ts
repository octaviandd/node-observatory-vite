import { describe, it, before, after } from "mocha";
import { expect } from "chai";
import request from "supertest";

import { BaseModelTest } from "./base-model";
import { Entity, PrimaryGeneratedColumn, Column, Repository, DataSource, ManyToOne, OneToMany, JoinColumn } from "typeorm";

describe('TypeORM Tests', function(this: any) {
  this.timeout(10000);
  
  const baseTest = new BaseModelTest();
  let dataSource: DataSource;
  let userRepository: Repository<any>;
  let postRepository: Repository<any>;
  let commentRepository: Repository<any>;
  
  // Define User entity
  @Entity()
  class User {
    @PrimaryGeneratedColumn()
    id: number;
    
    @Column()
    name: string;
    
    @Column()
    email: string;
    
    @Column({ nullable: true })
    age: number;
    
    @Column({ default: true })
    isActive: boolean;
    
    @OneToMany(() => Post, post => post.author)
    posts: Post[];
  }
  
  // Define Post entity
  @Entity()
  class Post {
    @PrimaryGeneratedColumn()
    id: number;
    
    @Column()
    title: string;
    
    @Column()
    content: string;
    
    @ManyToOne(() => User, user => user.posts)
    @JoinColumn()
    author: User;
    
    @Column({ default: false })
    published: boolean;
    
    @OneToMany(() => Comment, comment => comment.post)
    comments: Comment[];
  }
  
  // Define Comment entity
  @Entity()
  class Comment {
    @PrimaryGeneratedColumn()
    id: number;
    
    @Column()
    text: string;
    
    @ManyToOne(() => User)
    @JoinColumn()
    author: User;
    
    @ManyToOne(() => Post, post => post.comments)
    @JoinColumn()
    post: Post;
  }
  
  before(async function() {
    await baseTest.setup();
    
    // Initialize TypeORM
    try {
      dataSource = new DataSource({
        type: "sqlite",
        database: ":memory:",
        entities: [User, Post, Comment],
        synchronize: true,
        logging: false
      });
      
      await dataSource.initialize();
      userRepository = dataSource.getRepository(User);
      postRepository = dataSource.getRepository(Post);
      commentRepository = dataSource.getRepository(Comment);
    } catch (error) {
      console.error('TypeORM connection error:', error);
      this.skip();
    }
    
    // Define test routes for TypeORM
    baseTest.app.get('/test-typeorm-create', async (req, res) => {
      try {
        const user = userRepository.create({
          name: 'TypeORM User',
          email: 'typeorm@example.com',
          age: 30,
          isActive: true
        });
        
        const result = await userRepository.save(user);
        res.json(result);
      } catch (error) {
        res.status(500).json({ error: String(error) });
      }
    });
    
    baseTest.app.get('/test-typeorm-find', async (req, res) => {
      try {
        const users = await userRepository.find();
        res.json(users);
      } catch (error) {
        res.status(500).json({ error: String(error) });
      }
    });
    
    baseTest.app.get('/test-typeorm-update', async (req, res) => {
      try {
        const user = await userRepository.findOne({ where: {} });
        if (user) {
          user.name = 'Updated TypeORM User';
          const result = await userRepository.save(user);
          res.json(result);
        } else {
          res.status(404).json({ error: 'User not found' });
        }
      } catch (error) {
        res.status(500).json({ error: String(error) });
      }
    });
    
    baseTest.app.get('/test-typeorm-delete', async (req, res) => {
      try {
        const user = await userRepository.findOne({ where: {} });
        if (user) {
          const result = await userRepository.remove(user);
          res.json(result);
        } else {
          res.status(404).json({ error: 'User not found' });
        }
      } catch (error) {
        res.status(500).json({ error: String(error) });
      }
    });
    
    baseTest.app.get('/test-typeorm-error', async (req, res) => {
      try {
        // Force an error by querying a non-existent column
        await userRepository.findOne({ where: { nonexistent: 'value' } as any });
        res.json({ success: true });
      } catch (error) {
        res.status(500).json({ error: String(error) });
      }
    });
    
    // Routes for bulk operations
    baseTest.app.get('/test-typeorm-create-bulk', async (req, res) => {
      try {
        const users = [
          userRepository.create({ name: 'Bulk User 1', email: 'bulk1@example.com' }),
          userRepository.create({ name: 'Bulk User 2', email: 'bulk2@example.com' }),
          userRepository.create({ name: 'Bulk User 3', email: 'bulk3@example.com' })
        ];
        
        const result = await userRepository.save(users);
        res.json(result);
      } catch (error) {
        res.status(500).json({ error: String(error) });
      }
    });

    baseTest.app.get('/test-typeorm-update-bulk', async (req, res) => {
      try {
        const result = await userRepository.update(
          { isActive: true },
          { name: 'Bulk Updated User' }
        );
        res.json(result);
      } catch (error) {
        res.status(500).json({ error: String(error) });
      }
    });

    // // Route for complex queries
    // baseTest.app.get('/test-typeorm-complex-query', async (req, res) => {
    //   try {
    //     const result = await userRepository
    //       .createQueryBuilder('user')
    //       .where('user.age >= :minAge', { minAge: 18 })
    //       .andWhere('user.isActive = :active', { active: true })
    //       .orderBy('user.age', 'DESC')
    //       .limit(10)
    //       .getMany();
          
    //     res.json(result);
    //   } catch (error) {
    //     res.status(500).json({ error: String(error) });
    //   }
    // });
    
    // Route for relationships
    baseTest.app.get('/test-typeorm-relationships', async (req, res) => {
      try {
        // Create a user
        const user = userRepository.create({
          name: 'Relationship User',
          email: 'relation@example.com'
        });
        await userRepository.save(user);
        
        // Create a post by this user
        const post = postRepository.create({
          title: 'Relationship Post',
          content: 'This is a test post with relationships',
          author: user,
          published: true
        });
        await postRepository.save(post);
        
        // Create comments on the post
        const comments = [
          commentRepository.create({
            text: 'First comment on relationship',
            author: user,
            post: post
          }),
          commentRepository.create({
            text: 'Second comment on relationship',
            author: user,
            post: post
          })
        ];
        await commentRepository.save(comments);
        
        // Get post with relations
        const postWithRelations = await postRepository.findOne({
          where: { id: post.id },
          relations: {
            author: true,
            comments: true
          }
        });
        
        res.json(postWithRelations);
      } catch (error) {
        res.status(500).json({ error: String(error) });
      }
    });
    
    // Route for transactions
    // baseTest.app.get('/test-typeorm-transactions', async (req, res) => {
    //   const queryRunner = dataSource.createQueryRunner();
    //   await queryRunner.connect();
    //   await queryRunner.startTransaction();
      
    //   try {
    //     // Within a transaction, create a user and a post
    //     const user = queryRunner.manager.create(User, {
    //       name: 'Transaction User',
    //       email: 'transaction@example.com'
    //     });
    //     await queryRunner.manager.save(user);
        
    //     const post = queryRunner.manager.create(Post, {
    //       title: 'Transaction Post',
    //       content: 'Created in a transaction',
    //       author: user
    //     });
    //     await queryRunner.manager.save(post);
        
    //     await queryRunner.commitTransaction();
        
    //     res.json({ user, post });
    //   } catch (error) {
    //     await queryRunner.rollbackTransaction();
    //     res.status(500).json({ error: String(error) });
    //   } finally {
    //     await queryRunner.release();
    //   }
    // });
    
    // Route for upsert
    baseTest.app.get('/test-typeorm-upsert', async (req, res) => {
      try {
        const result = await userRepository.upsert(
          {
            name: 'Upsert User',
            email: 'upsert@example.com',
            age: 25
          },
          {
            conflictPaths: ['email'],
            skipUpdateIfNoValuesChanged: true
          }
        );
        
        const user = await userRepository.findOne({
          where: { email: 'upsert@example.com' }
        });
        
        res.json(user);
      } catch (error) {
        res.status(500).json({ error: String(error) });
      }
    });
    
    // Route for error with invalid value
    baseTest.app.get('/test-typeorm-error-invalid-id', async (req, res) => {
      try {
        // Force an error by using an invalid ID
        await userRepository.findOneOrFail({ where: { id: 9999 } });
        res.json({ success: true });
      } catch (error) {
        res.status(500).json({ error: String(error) });
      }
    });
    
    // Add route for Bull queue model test
    baseTest.app.get('/test-typeorm-bull-queue', async (req, res) => {
      // Add job to queue
      await baseTest.modelQueue.add('typeorm-operation', {
        operation: 'create',
        data: {
          name: 'Queue TypeORM User',
          email: 'typeorm-queue@example.com'
        }
      });
      
      res.send('TypeORM Bull queue job added');
    });
    
    // Process jobs in the queue
    baseTest.modelQueue.process('typeorm-operation', async (job) => {
      const { data } = job;
      if (data.operation === 'create') {
        const user = userRepository.create(data.data);
        return await userRepository.save(user);
      } else if (data.operation === 'find') {
        return await userRepository.find();
      }
      return { success: true };
    });
  });
  
  after(async function() {
    if (dataSource && dataSource.isInitialized) {
      await dataSource.destroy();
    }
    
    await baseTest.teardown();
  });
  
  it('should track model create operations with TypeORM', async function() {
    await request(baseTest.app).get('/test-typeorm-create');
    
    await baseTest.waitForDataPersistence(2000);
    
    const results = await baseTest.getModelResults();
    
    const createOp = results.find((r: any) => 
      r.content.package === 'typeorm' && r.content.method === 'save'
    );
    
    expect(createOp).to.exist;
    expect(createOp.content.modelName).to.equal('User');
  });
  
  it('should track model find operations with TypeORM', async function() {
    await request(baseTest.app).get('/test-typeorm-find');
    
    await baseTest.waitForDataPersistence(2000);
    
    const results = await baseTest.getModelResults();
    
    const findOp = results.find((r: any) => 
      r.content.package === 'typeorm' && r.content.method === 'find'
    );
    
    expect(findOp).to.exist;
    expect(findOp.content.modelName).to.equal('User');
  });
  
  it('should track model update operations with TypeORM', async function() {
    await request(baseTest.app).get('/test-typeorm-create');
    await request(baseTest.app).get('/test-typeorm-update');
    
    await baseTest.waitForDataPersistence(2000);
    
    const results = await baseTest.getModelResults();
    
    const updateOp = results.find((r: any) => 
      r.content.package === 'typeorm' && 
      r.content.method === 'save'
    );
    
    expect(updateOp).to.exist;
    expect(updateOp.content.modelName).to.equal('User');
  });
  
  it('should track model delete operations with TypeORM', async function() {
    await request(baseTest.app).get('/test-typeorm-create');
    await request(baseTest.app).get('/test-typeorm-delete');
    
    await baseTest.waitForDataPersistence(2000);
    
    const results = await baseTest.getModelResults();
    
    const deleteOp = results.find((r: any) => 
      r.content.package === 'typeorm' && r.content.method === 'remove'
    );
    
    expect(deleteOp).to.exist;
    expect(deleteOp.content.modelName).to.equal('User');
  });
  
  it('should track model error operations with TypeORM', async function() {
    await request(baseTest.app).get('/test-typeorm-error').expect(500);
    
    await baseTest.waitForDataPersistence(2000);
    
    const results = await baseTest.getModelResults();
    
    const errorOp = results.find((r: any) => 
      r.content.package === 'typeorm' && r.content.status === 'failed'
    );
    
    expect(errorOp).to.exist;
    expect(errorOp.content.error).to.exist;
  });
  
  it('should track model operations made through Bull queue with TypeORM', async function() {
    await request(baseTest.app).get('/test-typeorm-bull-queue');
    
    // Wait longer for the queue to process the job
    await baseTest.waitForDataPersistence(2000);
    
    const results = await baseTest.getModelResults();
    
    const queueOp = results.find((r: any) => 
      r.content.package === 'typeorm' && 
      r.content.method === 'save'
    );
    
    expect(queueOp).to.exist;
    expect(queueOp.content.modelName).to.equal('User');
  });
  
  it('should get group data for model operations', async function() {
    await request(baseTest.app).get('/test-typeorm-create');
    await request(baseTest.app).get('/test-typeorm-find');
    
    await baseTest.waitForDataPersistence(2000);
    
    const { results } = await baseTest.getGroupData();
    
    expect(results.length).to.be.at.least(1);
    expect(results[0]).to.have.property('modelName');
    expect(results[0]).to.have.property('total');
  });
  
  // Additional tests for complex operations
  it('should track bulk creation operations with TypeORM', async function() {
    await request(baseTest.app).get('/test-typeorm-create-bulk');
    
    await baseTest.waitForDataPersistence(2000);
    
    const results = await baseTest.getModelResults();
    
    const bulkCreateOp = results.find((r: any) => 
      r.content.package === 'typeorm' && 
      r.content.method === 'save' && 
      Array.isArray(r.content.result)
    );
    
    expect(bulkCreateOp).to.exist;
    expect(bulkCreateOp.content.modelName).to.equal('User');
    expect(bulkCreateOp.content.result).to.be.an('array').with.lengthOf(3);
  });
  
  it('should track bulk update operations with TypeORM', async function() {
    await request(baseTest.app).get('/test-typeorm-create');
    await request(baseTest.app).get('/test-typeorm-update-bulk');
    
    await baseTest.waitForDataPersistence(2000);
    
    const results = await baseTest.getModelResults();
    
    const bulkUpdateOp = results.find((r: any) => 
      r.content.package === 'typeorm' && 
      r.content.method === 'update'
    );
    
    expect(bulkUpdateOp).to.exist;
    expect(bulkUpdateOp.content.modelName).to.equal('User');
  });
  
  // it('should track complex query operations with TypeORM', async function() {
  //   await request(baseTest.app).get('/test-typeorm-create');
  //   await request(baseTest.app).get('/test-typeorm-complex-query');
    
  //   await baseTest.waitForDataPersistence(2000);
    
  //   const results = await baseTest.getModelResults();
    
  //   const complexQueryOp = results.find((r: any) => 
  //     r.content.package === 'typeorm' && 
  //     r.content.method === 'createQueryBuilder'
  //   );
    
  //   expect(complexQueryOp).to.exist;
  //   expect(complexQueryOp.content.modelName).to.equal('User');
  // });
  
  it('should track relationship operations with TypeORM', async function() {
    await request(baseTest.app).get('/test-typeorm-relationships');
    
    await baseTest.waitForDataPersistence(2000);
    
    const results = await baseTest.getModelResults();
    
    // Check for user creation
    const userCreateOp = results.find((r: any) => 
      r.content.package === 'typeorm' && 
      r.content.method === 'save' && 
      r.content.modelName === 'User' &&
      r.content.result?.email === 'relation@example.com'
    );
    
    expect(userCreateOp).to.exist;
    
    // Check for post creation with relation
    const postCreateOp = results.find((r: any) => 
      r.content.package === 'typeorm' && 
      r.content.method === 'save' && 
      r.content.modelName === 'Post'
    );
    
    expect(postCreateOp).to.exist;
    
    // Check for comment creation with relations
    const commentCreateOp = results.find((r: any) => 
      r.content.package === 'typeorm' && 
      r.content.method === 'save' && 
      r.content.modelName === 'Comment'
    );
    
    expect(commentCreateOp).to.exist;
    
    // Check for findOne with relations
    const findWithRelationsOp = results.find((r: any) => 
      r.content.package === 'typeorm' && 
      r.content.method === 'findOne' && 
      r.content.arguments?.[0]?.relations
    );
    
    expect(findWithRelationsOp).to.exist;
  });
  
  // it('should track transaction operations with TypeORM', async function() {
  //   await request(baseTest.app).get('/test-typeorm-transactions');
    
  //   await baseTest.waitForDataPersistence(2000);
    
  //   const results = await baseTest.getModelResults();
    
  //   // Check for transaction operations
  //   const transactionOps = results.filter((r: any) => 
  //     r.content.package === 'typeorm' && 
  //     (r.content.method === 'startTransaction' || 
  //      r.content.method === 'commitTransaction')
  //   );
    
  //   expect(transactionOps.length).to.be.at.least(1);
    
  //   // Check for user creation within transaction
  //   const userCreateInTxOp = results.find((r: any) => 
  //     r.content.package === 'typeorm' && 
  //     r.content.method === 'save' && 
  //     r.content.modelName === 'User' &&
  //     r.content.result?.email === 'transaction@example.com'
  //   );
    
  //   expect(userCreateInTxOp).to.exist;
  // });
  
  // it('should track upsert operations with TypeORM', async function() {
  //   await request(baseTest.app).get('/test-typeorm-upsert');
    
  //   await baseTest.waitForDataPersistence(2000);
    
  //   const results = await baseTest.getModelResults();
    
  //   const upsertOp = results.find((r: any) => 
  //     r.content.package === 'typeorm' && 
  //     r.content.method === 'upsert'
  //   );
    
  //   expect(upsertOp).to.exist;
  //   expect(upsertOp.content.modelName).to.equal('User');
  // });
  
  it('should track error operations with invalid ID in TypeORM', async function() {
    await request(baseTest.app).get('/test-typeorm-error-invalid-id').expect(500);
    
    await baseTest.waitForDataPersistence(2000);
    
    const results = await baseTest.getModelResults();
    
    const errorOp = results.find((r: any) => 
      r.content.package === 'typeorm' && 
      r.content.status === 'failed' && 
      r.content.method === 'findOneOrFail'
    );
    
    expect(errorOp).to.exist;
    expect(errorOp.content.error).to.exist;
  });
}); 