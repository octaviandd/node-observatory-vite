import { describe, it, before, after } from "mocha";
import { expect } from "chai";
import request from "supertest";
import path from "path";
import fs from "fs";

import { BaseViewTest } from "./base-view";

describe('Pug View Tests', function(this: any) {
  this.timeout(10000);
  
  const baseTest = new BaseViewTest();
  
  before(async function() {
    await baseTest.setup();
    
    // Create Pug template
    const pugTemplate = `doctype html
html
  head
    title= title
  body
    h1= title
    p= description
    if items && items.length
      ul
        each item in items
          li= item`;
    
    const errorTemplate = `- throw new Error("Template Error")`;
    
    // Create a partial template
    const partialTemplate = `div.partial
  h2 Partial Header
  p= partialData`;
    
    // Create a template that includes a partial
    const includeTemplate = `doctype html
html
  head
    title Include Test
  body
    h1 Main Template
    include /partial.pug`;
    
    // Create a complex template with many Pug features
    const complexTemplate = `doctype html
html
  head
    title= title
  body
    // Test conditionals
    if showHeader
      h1= title
    else
      h2 Alternative Header
    
    // Test loops with index
    ul
      each item, index in items
        li(class="item-" + index)= item
    
    // Test includes
    include /partial.pug
      partialData = 'Complex template data'
    
    // Test mixins
    mixin list(items)
      ul.custom-list
        each item in items
          li= item
    
    +list(['Mixin Item 1', 'Mixin Item 2'])
    
    // Test interpolation
    p This is #[strong interpolated] text
    
    // Test escaped vs unescaped
    div.escaped= dangerousHTML
    div.raw!= safeHtml
    
    // Test code blocks
    - const randomNum = Math.random()
    p Random number: #{randomNum}
    
    // Test computed attribute values
    div(class=dynamicClass) Dynamic Class Content
    
    // Test case statement
    case status
      when 'active'
        p Status is active
      when 'pending'
        p Status is pending
      default
        p Status is unknown`;
    
    // Create a template with only whitespace
    const whitespaceTemplate = `   
    
    `;
    
    // Create a template with filters
    const filterTemplate = `doctype html
html
  head
    title Filtered Content
  body
    h1 Markdown Filter
    
    h1 JavaScript Filter
    script
      script.
        const greeting = 'Hello, world!';
        console.log(greeting);`;
    
    // Write template files
    fs.writeFileSync(path.join(baseTest.viewsDir, 'index.pug'), pugTemplate);
    fs.writeFileSync(path.join(baseTest.viewsDir, 'error.pug'), errorTemplate);
    fs.writeFileSync(path.join(baseTest.viewsDir, 'partial.pug'), partialTemplate);
    fs.writeFileSync(path.join(baseTest.viewsDir, 'include.pug'), includeTemplate);
    fs.writeFileSync(path.join(baseTest.viewsDir, 'complex.pug'), complexTemplate);
    fs.writeFileSync(path.join(baseTest.viewsDir, 'whitespace.pug'), whitespaceTemplate);
    fs.writeFileSync(path.join(baseTest.viewsDir, 'filter.pug'), filterTemplate);
    
    // Configure Express to use Pug
    baseTest.app.set('view engine', 'pug');
    baseTest.app.set('views', baseTest.viewsDir);
    baseTest.app.locals.basedir = baseTest.viewsDir;
    
    // Define test routes for Pug
    baseTest.app.get('/test-pug', (req, res) => {
      res.render('index', {
        title: 'Pug Test',
        description: 'This is a test of Pug templates',
        items: ['Item 1', 'Item 2', 'Item 3']
      });
    });
    
    baseTest.app.get('/test-pug-error', (req, res) => {
      try {
        res.render('error');
      } catch (error) {
        res.status(500).send('Template error');
      }
    });
    
    // Route to test includes
    baseTest.app.get('/test-pug-include', (req, res) => {
      res.render('include', {
        partialData: 'Data passed to partial'
      });
    });
    
    // Route to test complex templates
    baseTest.app.get('/test-pug-complex', (req, res) => {
      res.render('complex', {
        title: 'Complex Pug Test',
        showHeader: req.query.showHeader === 'true',
        items: ['Complex Item 1', 'Complex Item 2', 'Complex Item 3'],
        dangerousHTML: '<script>alert("xss")</script>',
        safeHtml: '<div class="safe">Safe HTML content</div>',
        dynamicClass: req.query.class || 'default-class',
        status: req.query.status || 'unknown'
      });
    });
    
    // Route to test empty template
    baseTest.app.get('/test-pug-whitespace', (req, res) => {
      res.render('whitespace');
    });
    
    // Route to test filters
    baseTest.app.get('/test-pug-filter', (req, res) => {
      res.render('filter');
    });
    
    // Setup routes to test express patching
    // Setup a route that tests setting layout options at render time
    baseTest.app.get('/test-pug-options', (req, res) => {
      // Test passing options that affect compilation
      res.render('index', {
        title: 'Options Test',
        description: 'Testing Pug compiler options',
        items: ['Option Item 1', 'Option Item 2'],
        
        // Pass Pug-specific options
        cache: false,
        compileDebug: true,
        debug: true
      });
    });
    
    // Test disabling view caching
    baseTest.app.set('view cache', false);
    baseTest.app.get('/test-pug-nocache', (req, res) => {
      res.render('index', {
        title: 'No Cache Test',
        description: 'Testing with view caching disabled',
        items: ['Nocache Item 1', 'Nocache Item 2']
      });
    });
    
    // Setup a route with multiple render calls to test caching behavior
    baseTest.app.get('/test-pug-multiple-renders', (req, res) => {
      // Capture output instead of sending response
      res.render('index', {
        title: 'First Render',
        description: 'First render description',
        items: ['First 1', 'First 2']
      }, (err, html1) => {
        if (err) return res.status(500).send(err.message);
        
        // Second render with different data
        res.render('index', {
          title: 'Second Render',
          description: 'Second render description',
          items: ['Second 1', 'Second 2']
        }, (err, html2) => {
          if (err) return res.status(500).send(err.message);
          
          // Send both renders as response
          res.json({
            html1: html1.slice(0, 100), // Just first 100 chars for manageable response
            html2: html2.slice(0, 100)
          });
        });
      });
    });
  });
  
  after(async function() {
    fs.rmdirSync(baseTest.viewsDir);
    await baseTest.teardown();
  });
  
  it('should track views rendered with Pug', async function() {
    await request(baseTest.app).get('/test-pug');
    
    await baseTest.waitForDataPersistence();
    
    const results = await baseTest.getViewResults();
    
    const pugView = results.find((r: any) => 
      r.content.package === 'pug' && r.content.view.includes('index')
    );
    
    expect(pugView).to.exist;
    expect(pugView.content.status).to.equal('completed');
  });
  
  it('should track failed views with Pug', async function() {
    await request(baseTest.app).get('/test-pug-error').expect(500);
    
    await baseTest.waitForDataPersistence();
    
    const results = await baseTest.getViewResults('failed');
    
    const errorView = results.find((r: any) => 
      r.content.package === 'pug' && r.content.view.includes('error')
    );
    
    expect(errorView).to.exist;
    expect(errorView.content.status).to.equal('failed');
  });
  
  it('should track views with includes', async function() {
    await request(baseTest.app).get('/test-pug-include');
    
    await baseTest.waitForDataPersistence();
    
    const results = await baseTest.getViewResults();
    
    const includeView = results.find((r: any) => 
      r.content.package === 'pug' && r.content.view.includes('include')
    );
    
    expect(includeView).to.exist;
    expect(includeView.content.status).to.equal('completed');
  });

  it('should track complex views with many Pug features', async function() {
    await request(baseTest.app).get('/test-pug-complex?showHeader=true&class=special&status=active');
    
    await baseTest.waitForDataPersistence();
    
    const results = await baseTest.getViewResults();
    
    const complexView = results.find((r: any) => 
      r.content.package === 'pug' && r.content.view.includes('complex')
    );
    
    expect(complexView).to.exist;
    expect(complexView.content.status).to.equal('completed');
    expect(complexView.content.size).to.be.greaterThan(0);
  });

  it('should track empty templates', async function() {
    await request(baseTest.app).get('/test-pug-whitespace');
    
    await baseTest.waitForDataPersistence();
    
    const results = await baseTest.getViewResults();
    
    const whitespaceView = results.find((r: any) => 
      r.content.package === 'pug' && r.content.view.includes('whitespace')
    );
    
    expect(whitespaceView).to.exist;
    expect(whitespaceView.content.status).to.equal('failed');
    expect(whitespaceView.content.size).to.be.lessThan(100);
  });

  it('should track templates with filters', async function() {
    await request(baseTest.app).get('/test-pug-filter');
    
    await baseTest.waitForDataPersistence();
    
    const results = await baseTest.getViewResults();
    
    const filterView = results.find((r: any) => 
      r.content.package === 'pug' && r.content.view.includes('filter')
    );
    
    expect(filterView).to.exist;
    expect(filterView.content.status).to.equal('completed');
  });

  it('should track views with custom render options', async function() {
    await request(baseTest.app).get('/test-pug-options');
    
    await baseTest.waitForDataPersistence();
    
    const results = await baseTest.getViewResults();
    
    const optionsView = results.find((r: any) => 
      r.content.package === 'pug' && 
      r.content.view.includes('index') && 
      r.content.options && 
      r.content.options.compileDebug === true
    );
    
    expect(optionsView).to.exist;
    expect(optionsView.content.status).to.equal('completed');
  });

  it('should handle multiple render calls in the same request', async function() {
    await request(baseTest.app).get('/test-pug-multiple-renders');
    
    await baseTest.waitForDataPersistence();
    
    const results = await baseTest.getViewResults();
    
    // Should have at least two rendering entries for the same view
    const renderEntries = results.filter((r: any) => 
      r.content.package === 'pug' && r.content.view.includes('index')
    );
    
    expect(renderEntries.length).to.be.at.least(2);
    expect(renderEntries.every((entry: any) => entry.content.status === 'completed')).to.be.true;
  });

  it('should handle high-concurrency rendering correctly', async function() {
    // Make several concurrent requests
    const concurrentRequests = Array(10).fill(0).map((_, i) => 
      request(baseTest.app).get(`/test-pug?concurrent=${i}`)
    );
    
    const responses = await Promise.all(concurrentRequests);
    
    // All responses should be successful
    expect(responses.every(res => res.status === 200)).to.be.true;
    
    await baseTest.waitForDataPersistence();
    
    const results = await baseTest.getViewResults();
    
    // Should have tracked at least 10 render operations
    const concurrentViews = results.filter((r: any) => 
      r.content.package === 'pug' && r.content.view.includes('index')
    );
    
    expect(concurrentViews.length).to.be.at.least(10);
    expect(concurrentViews.every((view: any) => view.content.status === 'completed')).to.be.true;
  });
  
  it('should track cache information for view renders', async function() {
    // First enable view caching for this test
    baseTest.app.enable('view cache');
    
    // First render - should be uncached
    await request(baseTest.app).get('/test-pug');
    
    // Second render - should potentially be cached
    await request(baseTest.app).get('/test-pug');
    
    await baseTest.waitForDataPersistence();
    
    const results = await baseTest.getViewResults();
    
    const pugViews = results.filter((r: any) => 
      r.content.package === 'pug' && r.content.view.includes('index')
    );
    
    // At least one view render should have cache information
    const viewWithCacheInfo = pugViews.find((view: any) => 
      view.content.cacheInfo && typeof view.content.cacheInfo.cacheEnabled === 'boolean'
    );
    
    expect(viewWithCacheInfo).to.exist;
    expect(viewWithCacheInfo.content.cacheInfo.cacheEnabled).to.be.true;
    
    // Disable view cache again for other tests
    baseTest.app.disable('view cache');
  });
});
