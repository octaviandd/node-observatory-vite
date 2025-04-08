import { describe, it, before, after } from "mocha";
import { expect } from "chai";
import request from "supertest";
import path from "path";
import fs from "fs";

import { BaseViewTest } from "./base-view";

describe('EJS View Tests', function(this: any) {
  this.timeout(10000);
  
  const baseTest = new BaseViewTest();
  
  before(async function() {
    await baseTest.setup();
    
    // Create EJS template
    const ejsTemplate = `
    <!DOCTYPE html>
    <html>
      <head><title><%= title %></title></head>
      <body>
        <h1><%= title %></h1>
        <p><%= description %></p>
        <% if (items && items.length) { %>
          <ul>
            <% items.forEach(function(item) { %>
              <li><%= item %></li>
            <% }); %>
          </ul>
        <% } %>
      </body>
    </html>`;
    
    const errorTemplate = '<% throw new Error("Template Error"); %>';
    
    // Create a partial template to test includes
    const partialTemplate = `<div class="partial">
      <h2>Included Partial</h2>
      <p><%= partialData %></p>
    </div>`;
    
    // Create a template that includes another template
    const includeTemplate = `
    <!DOCTYPE html>
    <html>
      <head><title>Include Test</title></head>
      <body>
        <h1>Main Template</h1>
        <%- include('partial', { partialData: 'Data passed to partial' }) %>
      </body>
    </html>`;
    
    // Create a complex template with many EJS features
    const complexTemplate = `
    <!DOCTYPE html>
    <html>
      <head><title><%= title %></title></head>
      <body>
        <!-- Test conditionals -->
        <% if (showHeader) { %>
          <h1><%= title %></h1>
        <% } else { %>
          <h2>Alternative Header</h2>
        <% } %>
        
        <!-- Test loops -->
        <ul>
          <% for(let i = 0; i < items.length; i++) { %>
            <li class="item-<%= i %>"><%= items[i] %></li>
          <% } %>
        </ul>
        
        <!-- Test includes -->
        <%- include('partial', { partialData: 'Complex template data' }) %>
        
        <!-- Test raw output vs escaped output -->
        <div class="escaped"><%= "<script>alert('xss')</script>" %></div>
        <div class="raw"><%- safeHtml %></div>
        
        <!-- Test JS in templates -->
        <p>Random number: <%= Math.random() %></p>
        <p>Calculated value: <%= calculateValue() %></p>
      </body>
    </html>`;
    
    // Create a template with only whitespace
    const whitespaceTemplate = `   
    
    `;
    
    // Write template files
    fs.writeFileSync(path.join(baseTest.viewsDir, 'index.ejs'), ejsTemplate);
    fs.writeFileSync(path.join(baseTest.viewsDir, 'error.ejs'), errorTemplate);
    fs.writeFileSync(path.join(baseTest.viewsDir, 'partial.ejs'), partialTemplate);
    fs.writeFileSync(path.join(baseTest.viewsDir, 'include.ejs'), includeTemplate);
    fs.writeFileSync(path.join(baseTest.viewsDir, 'complex.ejs'), complexTemplate);
    fs.writeFileSync(path.join(baseTest.viewsDir, 'whitespace.ejs'), whitespaceTemplate);
    
    // Configure Express to use EJS
    baseTest.app.set('view engine', 'ejs');
    baseTest.app.set('views', baseTest.viewsDir);
    
    // Define test routes for EJS
    baseTest.app.get('/test-ejs', (req, res) => {
      res.render('index', {
        title: 'EJS Test',
        description: 'This is a test of EJS templates',
        items: ['Item 1', 'Item 2', 'Item 3']
      });
    });
    
    baseTest.app.get('/test-ejs-error', (req, res) => {
      try {
        res.render('error');
      } catch (error) {
        res.status(500).send('Template error');
      }
    });
    
    // Route to test includes
    baseTest.app.get('/test-ejs-include', (req, res) => {
      res.render('include');
    });
    
    // Route to test complex template
    baseTest.app.get('/test-ejs-complex', (req, res) => {
      res.render('complex', {
        title: 'Complex EJS Test',
        showHeader: req.query.showHeader === 'true',
        items: ['Complex Item 1', 'Complex Item 2', 'Complex Item 3'],
        safeHtml: '<div class="safe">Safe HTML content</div>',
        calculateValue: () => 42
      });
    });
    
    // Route to test empty template
    baseTest.app.get('/test-ejs-whitespace', (req, res) => {
      res.render('whitespace');
    });
  });
  
  after(async function () {
    fs.rmdirSync(baseTest.viewsDir);
    await baseTest.teardown();
  });
  
  it('should track views rendered with EJS', async function() {
    await request(baseTest.app).get('/test-ejs');
    
    await baseTest.waitForDataPersistence();
    
    const results = await baseTest.getViewResults();
    
    const ejsView = results.find((r: any) => 
      r.content.package === 'ejs' && r.content.view.includes('index')
    );
    
    expect(ejsView).to.exist;
    expect(ejsView.content.status).to.equal('completed');
  });
  
  it('should track failed views with EJS', async function() {
    await request(baseTest.app).get('/test-ejs-error').expect(500);
    
    await baseTest.waitForDataPersistence();
    
    const results = await baseTest.getViewResults('failed');
    
    const errorView = results.find((r: any) => 
      r.content.package === 'ejs' && r.content.view.includes('error')
    );
    
    expect(errorView).to.exist;
    expect(errorView.content.status).to.equal('failed');
  });
  
  it('should track views with includes', async function() {
    await request(baseTest.app).get('/test-ejs-include');
    
    await baseTest.waitForDataPersistence();
    
    const results = await baseTest.getViewResults();
    
    const includeView = results.find((r: any) => 
      r.content.package === 'ejs' && r.content.view.includes('include')
    );
    
    expect(includeView).to.exist;
    expect(includeView.content.status).to.equal('completed');
  });

  it('should track complex views with multiple EJS features', async function() {
    await request(baseTest.app).get('/test-ejs-complex?showHeader=true');
    
    await baseTest.waitForDataPersistence();
    
    const results = await baseTest.getViewResults();
    
    const complexView = results.find((r: any) => 
      r.content.package === 'ejs' && r.content.view.includes('complex')
    );
    
    expect(complexView).to.exist;
    expect(complexView.content.status).to.equal('completed');
    expect(complexView.content.size).to.be.greaterThan(0);
  });

  it('should track empty templates', async function() {
    await request(baseTest.app).get('/test-ejs-whitespace');
    
    await baseTest.waitForDataPersistence();
    
    const results = await baseTest.getViewResults();
    
    const whitespaceView = results.find((r: any) => 
      r.content.package === 'ejs' && r.content.view.includes('whitespace')
    );
    
    expect(whitespaceView).to.exist;
    expect(whitespaceView.content.status).to.equal('completed');
    // Empty templates should have minimal size
    expect(whitespaceView.content.size).to.be.lessThan(100);
  });

  it('should handle multiple render calls in the same request', async function() {
    // Setup a route with multiple render calls to test caching behavior
    baseTest.app.get('/test-ejs-multiple-renders', (req, res) => {
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

    await request(baseTest.app).get('/test-ejs-multiple-renders');
    
    await baseTest.waitForDataPersistence();
    
    const results = await baseTest.getViewResults();
    
    // Should have at least two rendering entries for the same view
    const renderEntries = results.filter((r: any) => 
      r.content.package === 'ejs' && r.content.view.includes('index')
    );
    
    expect(renderEntries.length).to.be.at.least(2);
    expect(renderEntries.every((entry: any) => entry.content.status === 'completed')).to.be.true;
  });

  it('should handle high-concurrency rendering correctly', async function() {
    // Make several concurrent requests
    const concurrentRequests = Array(10).fill(0).map((_, i) => 
      request(baseTest.app).get(`/test-ejs?concurrent=${i}`)
    );
    
    const responses = await Promise.all(concurrentRequests);
    
    // All responses should be successful
    expect(responses.every(res => res.status === 200)).to.be.true;
    
    await baseTest.waitForDataPersistence();
    
    const results = await baseTest.getViewResults();
    
    // Should have tracked at least 10 render operations
    const concurrentViews = results.filter((r: any) => 
      r.content.package === 'ejs' && r.content.view.includes('index')
    );
    
    expect(concurrentViews.length).to.be.at.least(10);
    expect(concurrentViews.every((view: any) => view.content.status === 'completed')).to.be.true;
  });

  it('should track views with custom render options', async function() {
    // Setup a route that tests setting layout options at render time
    baseTest.app.get('/test-ejs-options', (req, res) => {
      // Test passing options that affect compilation
      res.render('index', {
        title: 'Options Test',
        description: 'Testing EJS compiler options',
        items: ['Option Item 1', 'Option Item 2'],
        
        // Pass EJS-specific options
        cache: false,
        rmWhitespace: true
      });
    });

    await request(baseTest.app).get('/test-ejs-options');
    
    await baseTest.waitForDataPersistence();
    
    const results = await baseTest.getViewResults();
    
    const optionsView = results.find((r: any) => 
      r.content.package === 'ejs' && 
      r.content.view.includes('index') && 
      r.content.options && 
      r.content.options.rmWhitespace === true
    );
    
    expect(optionsView).to.exist;
    expect(optionsView.content.status).to.equal('completed');
  });
  
  it('should track cache information for view renders', async function() {
    // First enable view caching for this test
    baseTest.app.enable('view cache');
    
    // First render - should be uncached
    await request(baseTest.app).get('/test-ejs');
    
    // Second render - should potentially be cached
    await request(baseTest.app).get('/test-ejs');
    
    await baseTest.waitForDataPersistence();
    
    const results = await baseTest.getViewResults();
    
    const ejsViews = results.filter((r: any) => 
      r.content.package === 'ejs' && r.content.view.includes('index')
    );
    
    // At least one view render should have cache information
    const viewWithCacheInfo = ejsViews.find((view: any) => 
      view.content.cacheInfo && typeof view.content.cacheInfo.cacheEnabled === 'boolean'
    );
    
    expect(viewWithCacheInfo).to.exist;
    expect(viewWithCacheInfo.content.cacheInfo.cacheEnabled).to.be.true;
    
    // Disable view cache again for other tests
    baseTest.app.disable('view cache');
  });
});
