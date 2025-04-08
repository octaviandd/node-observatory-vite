/** @format */
import { expect } from 'chai';
import { BaseExceptionTest } from './base-exceptions';

// Import the patcher to ensure it's loaded
import '../../../lib/patchers/patch-exceptions';

describe('Unhandled Promise Rejection Handler', () => {
  const baseTest = new BaseExceptionTest();
  
  before(async () => {
    // Set up the test environment
    await baseTest.setup();
  });
  
  it('should capture unhandled promise rejections', async function() {
    this.timeout(5000);
    
    // Create a promise that will be rejected but not caught
    new Promise<void>((_, reject) => {
      setTimeout(() => reject(new Error('Test unhandled rejection')), 10);
    });
    
    // Wait for the exception to be persisted
    await baseTest.waitForDataPersistence(2000);
    
    // Get the exceptions from the database
    const results = await baseTest.getExceptionResults();
    expect(results.length).to.be.at.least(1);
    
    // Find our error by message
    const testError = results.find((err: any) => 
      err.content && JSON.parse(err.content).message &&
      JSON.parse(err.content).message.includes('Test unhandled rejection')
    );
    expect(testError).to.exist;
    
    // Verify the error properties
    const content = JSON.parse(testError.content);
    expect(content.type).to.equal('unhandledRejection');
    expect(content.message).to.include('Test unhandled rejection');
    expect(content.stack).to.be.a('string');
    expect(content.file).to.be.a('string');
    expect(content.fullError).to.be.a('string');
  });
  
  it('should capture async/await rejections', async function() {
    this.timeout(5000);
    
    // Define an async function without try/catch
    const asyncFunctionWithoutCatch = async () => {
      // This will throw but won't be caught
      await Promise.reject(new Error('Async/await unhandled rejection'));
    };
    
    // Call without awaiting or catching
    asyncFunctionWithoutCatch();
    
    // Wait for the exception to be persisted
    await baseTest.waitForDataPersistence(2000);
    
    // Get the exceptions from the database
    const results = await baseTest.getExceptionResults();
    
    // Find our error by message
    const testError = results.find((err: any) => 
      err.content && JSON.parse(err.content).message &&
      JSON.parse(err.content).message.includes('Async/await unhandled rejection')
    );
    expect(testError).to.exist;
    
    // Verify error data
    const content = JSON.parse(testError.content);
    expect(content.type).to.equal('unhandledRejection');
    
    // Async stack traces should include our function name
    expect(content.stack).to.include('asyncFunctionWithoutCatch');
  });
  
  it('should capture detailed error properties', async function() {
    this.timeout(5000);
    
    // Create a custom error with properties
    const customError = new Error('Custom error with properties');
    (customError as any).code = 'TEST_ERROR_CODE';
    (customError as any).details = { important: true, reason: 'testing' };
    
    // Reject without catching
    new Promise<void>((_, reject) => {
      setTimeout(() => reject(customError), 10);
    });
    
    // Wait for the exception to be persisted
    await baseTest.waitForDataPersistence(2000);
    
    // Get the exceptions from the database
    const results = await baseTest.getExceptionResults();
    
    // Find our error by message
    const testError = results.find((err: any) => 
      err.content && JSON.parse(err.content).message &&
      JSON.parse(err.content).message.includes('Custom error with properties')
    );
    expect(testError).to.exist;
    
    // Custom properties should be included in fullError
    const content = JSON.parse(testError.content);
    expect(content.fullError).to.include('TEST_ERROR_CODE');
    expect(content.fullError).to.include('important');
    expect(content.fullError).to.include('testing');
  });
  
  it('should provide graph data for exceptions', async function() {
    this.timeout(5000);
    
    // Wait for previous exceptions to be persisted
    await baseTest.waitForDataPersistence(1000);
    
    // Get graph data for exceptions
    const graphData = await baseTest.getGraphData('1h');
    
    // Verify we have exception counts
    expect(graphData.count).to.be.a('string');
    expect(graphData).to.have.property('countFormattedData').that.is.an('array');
    
    // Should have counts for different exception types
    expect(graphData).to.have.property('indexCountOne');  // unhandledRejection
    expect(graphData).to.have.property('indexCountTwo');  // uncaughtException
  });
});
