import { describe, it, before, after } from "mocha";
import { expect } from "chai";
import request from "supertest";
import path from "path";
import fs from "fs";

import { BaseViewTest } from "./base-view";
import { engine } from 'express-handlebars';

describe('Handlebars View Tests', function(this: any) {
  this.timeout(10000);
  
  const baseTest = new BaseViewTest();
  
  before(async function() {
    await baseTest.setup();
    
    // Create Handlebars template
    const handlebarsTemplate = `
    <!DOCTYPE html>
    <html>
      <head><title>{{title}}</title></head>
      <body>
        <h1>{{title}}</h1>
        <p>{{description}}</p>
        {{#if items.length}}
          <ul>
            {{#each items}}
              <li>{{this}}</li>
            {{/each}}
          </ul>
        {{/if}}
      </body>
    </html>`;
    
    const errorTemplate = `{{#if throwError}}{{/with}}`;
    
    // Create a partial template
    const partialTemplate = `<div class="partial">
      <h2>Partial Header</h2>
      <p>{{partialData}}</p>
    </div>`;
    
    // Create template that uses a partial
    const includeTemplate = `
    <!DOCTYPE html>
    <html>
      <head><title>Include Test</title></head>
      <body>
        <h1>Main Template</h1>
        {{> partial partialData="Data passed to partial"}}
      </body>
    </html>`;
    
    // Create template with helpers and block helpers
    const complexTemplate = `
    <!DOCTYPE html>
    <html>
      <head><title>{{title}}</title></head>
      <body>
        <!-- Test conditionals -->
        {{#if showHeader}}
          <h1>{{title}}</h1>
        {{else}}
          <h2>Alternative Header</h2>
        {{/if}}
        
        <!-- Test loops with context variables -->
        <ul>
          {{#each items as |item index|}}
            <li class="item-{{index}}">{{item}}</li>
          {{/each}}
        </ul>
        
        <!-- Test partials with context -->
        {{> partial partialData="Complex template data"}}
        
        <!-- Test helpers -->
        <p>Formatted date: {{formatDate date}}</p>
        
        <!-- Test raw HTML -->
        <div class="escaped">{{dangerousHTML}}</div>
        <div class="raw">{{{safeHtml}}}</div>
        
        <!-- Test block helpers -->
        {{#bold}}
          <p>This text should be bold</p>
        {{/bold}}
      </body>
    </html>`;
    
    // Create a template with only whitespace
    const whitespaceTemplate = `   
    
    `;
    
    // Write template files
    fs.writeFileSync(path.join(baseTest.viewsDir, 'index.handlebars'), handlebarsTemplate);
    fs.writeFileSync(path.join(baseTest.viewsDir, 'error.handlebars'), errorTemplate);
    fs.writeFileSync(path.join(baseTest.viewsDir, 'partial.handlebars'), partialTemplate);
    fs.writeFileSync(path.join(baseTest.viewsDir, 'include.handlebars'), includeTemplate);
    fs.writeFileSync(path.join(baseTest.viewsDir, 'complex.handlebars'), complexTemplate);
    fs.writeFileSync(path.join(baseTest.viewsDir, 'whitespace.handlebars'), whitespaceTemplate);
    
    // Configure Express to use Handlebars with helpers
    baseTest.app.engine('handlebars', engine({
      defaultLayout: false,  // This is critical to prevent looking for layouts/main.handlebars
      partialsDir: baseTest.viewsDir,
      helpers: {
        formatDate: (date: Date) => date.toLocaleDateString(),
        bold: function(options: any) {
          return '<strong>' + options.fn(this) + '</strong>';
        }
      }
    }));
    baseTest.app.set('view engine', 'handlebars');
    baseTest.app.set('views', baseTest.viewsDir);
    
    // Define test routes for Handlebars
    baseTest.app.get('/test-handlebars', (req, res) => {
      res.render('index', {
        title: 'Handlebars Test',
        description: 'This is a test of Handlebars templates',
        items: ['Item 1', 'Item 2', 'Item 3']
      });
    });
    
    baseTest.app.get('/test-handlebars-error', (req, res) => {
      try {
        res.render('error', { throwError: true });
      } catch (error) {
        res.status(500).send('Template error');
      }
    });
    
    // Route to test partials
    baseTest.app.get('/test-handlebars-include', (req, res) => {
      res.render('include');
    });
    
    // Route to test complex template
    baseTest.app.get('/test-handlebars-complex', (req, res) => {
      res.render('complex', {
        title: 'Complex Handlebars Test',
        showHeader: req.query.showHeader === 'true',
        items: ['Complex Item 1', 'Complex Item 2', 'Complex Item 3'],
        date: new Date(),
        dangerousHTML: '<script>alert("xss")</script>',
        safeHtml: '<div class="safe">Safe HTML content</div>'
      });
    });
    
    // Route to test empty template
    baseTest.app.get('/test-handlebars-whitespace', (req, res) => {
      res.render('whitespace');
    });
    
    // Setup a route that uses both Handlebars and another template engine
    // baseTest.setupMultipleViewEnginesRoute({
    //   'handlebars': engine({ defaultLayout: false })
    // });
  });
  
  after(async function () {
    fs.rmdirSync(baseTest.viewsDir);
    await baseTest.teardown();
  });
  
  it('should track views rendered with Handlebars', async function() {
    await request(baseTest.app).get('/test-handlebars');
    
    await baseTest.waitForDataPersistence();
    
    const results = await baseTest.getViewResults();
    
    const handlebarsView = results.find((r: any) => 
      r.content.package === 'handlebars' && r.content.view.includes('index')
    );
    
    expect(handlebarsView).to.exist;
    expect(handlebarsView.content.status).to.equal('completed');
  });
  
  it('should track failed views with Handlebars', async function() {
    await request(baseTest.app).get('/test-handlebars-error').expect(500);
    
    await baseTest.waitForDataPersistence();
    
    const results = await baseTest.getViewResults('failed');
    
    const errorView = results.find((r: any) => 
      r.content.package === 'handlebars' && r.content.view.includes('error')
    );
    
    expect(errorView).to.exist;
    expect(errorView.content.status).to.equal('failed');
  });
  
  it('should track views with partials', async function() {
    await request(baseTest.app).get('/test-handlebars-include');
    
    await baseTest.waitForDataPersistence();
    
    const results = await baseTest.getViewResults();
    
    const includeView = results.find((r: any) => 
      r.content.package === 'handlebars' && r.content.view.includes('include')
    );
    
    expect(includeView).to.exist;
    expect(includeView.content.status).to.equal('completed');
  });

  it('should track complex views with helpers and block helpers', async function() {
    await request(baseTest.app).get('/test-handlebars-complex?showHeader=true');
    
    await baseTest.waitForDataPersistence();
    
    const results = await baseTest.getViewResults();
    
    const complexView = results.find((r: any) => 
      r.content.package === 'handlebars' && r.content.view.includes('complex')
    );
    
    expect(complexView).to.exist;
    expect(complexView.content.status).to.equal('completed');
    expect(complexView.content.size).to.be.greaterThan(0);
  });

  it('should track empty templates', async function() {
    await request(baseTest.app).get('/test-handlebars-whitespace');
    
    await baseTest.waitForDataPersistence();
    
    const results = await baseTest.getViewResults();
    
    const whitespaceView = results.find((r: any) => 
      r.content.package === 'handlebars' && r.content.view.includes('whitespace')
    );
    
    expect(whitespaceView).to.exist;
    expect(whitespaceView.content.status).to.equal('completed');
    // Empty templates should have minimal size
    expect(whitespaceView.content.size).to.be.lessThan(100);
  });

  it('should handle multiple render calls in the same request', async function() {
    // Setup a route with multiple render calls to test caching behavior
    baseTest.app.get('/test-handlebars-multiple-renders', (req, res) => {
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

    await request(baseTest.app).get('/test-handlebars-multiple-renders');
    
    await baseTest.waitForDataPersistence();
    
    const results = await baseTest.getViewResults();
    
    // Should have at least two rendering entries for the same view
    const renderEntries = results.filter((r: any) => 
      r.content.package === 'handlebars' && r.content.view.includes('index')
    );
    
    expect(renderEntries.length).to.be.at.least(2);
    expect(renderEntries.every((entry: any) => entry.content.status === 'completed')).to.be.true;
  });

  it('should handle high-concurrency rendering correctly', async function() {
    // Make several concurrent requests
    const concurrentRequests = Array(10).fill(0).map((_, i) => 
      request(baseTest.app).get(`/test-handlebars?concurrent=${i}`)
    );
    
    const responses = await Promise.all(concurrentRequests);
    
    // All responses should be successful
    expect(responses.every(res => res.status === 200)).to.be.true;
    
    await baseTest.waitForDataPersistence();
    
    const results = await baseTest.getViewResults();
    
    // Should have tracked at least 10 render operations
    const concurrentViews = results.filter((r: any) => 
      r.content.package === 'handlebars' && r.content.view.includes('index')
    );
    
    expect(concurrentViews.length).to.be.at.least(10);
    expect(concurrentViews.every((view: any) => view.content.status === 'completed')).to.be.true;
  });

  it('should track views with custom render options', async function() {
    // Setup a route that tests setting layout options at render time
    baseTest.app.get('/test-handlebars-options', (req, res) => {
      // Test passing options that affect compilation
      res.render('index', {
        title: 'Options Test',
        description: 'Testing Handlebars compiler options',
        items: ['Option Item 1', 'Option Item 2'],
        
        // Pass Handlebars-specific options
        allowProtoPropertiesByDefault: true,
        allowProtoMethodsByDefault: false
      });
    });

    await request(baseTest.app).get('/test-handlebars-options');
    
    await baseTest.waitForDataPersistence();
    
    const results = await baseTest.getViewResults();
    
    const optionsView = results.find((r: any) => 
      r.content.package === 'handlebars' && 
      r.content.view.includes('index') && 
      r.content.options && 
      r.content.options.allowProtoPropertiesByDefault === true
    );
    
    expect(optionsView).to.exist;
    expect(optionsView.content.status).to.equal('completed');
  });
  
  it('should track cache information for view renders', async function() {
    // First enable view caching for this test
    baseTest.app.enable('view cache');
    
    // First render - should be uncached
    await request(baseTest.app).get('/test-handlebars');
    
    // Second render - should potentially be cached
    await request(baseTest.app).get('/test-handlebars');
    
    await baseTest.waitForDataPersistence();
    
    const results = await baseTest.getViewResults();
    
    const handlebarsViews = results.filter((r: any) => 
      r.content.package === 'handlebars' && r.content.view.includes('index')
    );
    
    // At least one view render should have cache information
    const viewWithCacheInfo = handlebarsViews.find((view: any) => 
      view.content.cacheInfo && typeof view.content.cacheInfo.cacheEnabled === 'boolean'
    );
    
    expect(viewWithCacheInfo).to.exist;
    expect(viewWithCacheInfo.content.cacheInfo.cacheEnabled).to.be.true;
    
    // Disable view cache again for other tests
    baseTest.app.disable('view cache');
  });

  it('should setup middleware chain route', async function() {
    // Add middleware chain route test
    baseTest.app.get('/test-handlebars-middleware-chain', 
      // First middleware
      (req, res, next) => {
        (req as any).middlewareData = { step: 1 };
        next();
      },
      // Second middleware
      (req, res, next) => {
        (req as any).middlewareData.step = 2;
        next();
      },
      // Final handler
      (req, res) => {
        res.render('index', {
          title: 'Middleware Chain Test',
          description: `Middleware step: ${(req as any).middlewareData.step}`,
          items: ['Middleware test']
        });
      }
    );

    await request(baseTest.app).get('/test-handlebars-middleware-chain');
    
    await baseTest.waitForDataPersistence();
    
    const results = await baseTest.getViewResults();
    
    const middlewareView = results.find((r: any) => 
      r.content.package === 'handlebars' && 
      r.content.view.includes('index')
    );
    
    expect(middlewareView).to.exist;
    expect(middlewareView.content.status).to.equal('completed');
  });
});
