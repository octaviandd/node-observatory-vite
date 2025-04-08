/** @format */
import { expect } from 'chai';
import { BaseExceptionTest } from './base-exceptions';

// Import the patcher to ensure it's loaded
import '../../../lib/patchers/patch-exceptions';

describe('Uncaught Exception Handler', () => {
  // We need special handling for uncaught exceptions to prevent test process exit
  let originalExit: typeof process.exit;
  const baseTest = new BaseExceptionTest();
  
  before(async () => {
    // Set up the test environment
    await baseTest.setup();
    
    // Save original exit function
    originalExit = process.exit;
    
    // Replace process.exit to prevent test termination
    process.exit = (code?: number) => {
      console.log(`Test prevented process exit with code: ${code}`);
      return undefined as never;
    };
  });
  
  after(() => {
    // Restore original process.exit
    process.exit = originalExit;
  });
  
  it('should capture uncaught exceptions with all required data', async function() {
    this.timeout(5000);
    
    // Generate an uncaught exception
    setTimeout(() => {
      process.nextTick(() => {
        throw new Error('Test uncaught exception');
      });
    }, 1000);
    
    // Wait for the exception to be persisted
    await baseTest.waitForDataPersistence(2000);
    
    console.log('hit')
    // Get the exceptions from the database
    const results = await baseTest.getExceptionResults();
    expect(results.length).to.be.at.least(1);
    
    // Find our error by message
    const testError = results.find((err: any) => 
      err.content.message.includes('Test uncaught exception')
    );
    expect(testError).to.exist;
    
    // Verify the error has all required properties
    expect(testError.content.type).to.equal('uncaughtException');
    expect(testError.content.message).to.be.a('string');
    expect(testError.content.stack).to.be.a('string');
    expect(testError.content.file).to.be.a('string');
    expect(testError.content.fullError).to.be.a('string');
  });
  
  it('should include stack trace information', async function() {
    this.timeout(5000);
    
    // Function with a descriptive name to find in stack trace
    const throwUncaughtForTesting = () => {
      throw new Error('Stack trace test error');
    };
    
    // Force an uncaught exception
    setTimeout(() => {
      process.nextTick(throwUncaughtForTesting);
    }, 10);
    
    // Wait for the exception to be persisted
    await baseTest.waitForDataPersistence(2000);
    
    // Get the exceptions from the database
    const results = await baseTest.getExceptionResults();
    
    // Find our error by message
    const testError = results.find((err: any) => 
      err.content && JSON.parse(err.content).message &&
      JSON.parse(err.content).message.includes('Stack trace test error')
    );
    expect(testError).to.exist;
    
    // Stack should include our function name
    const content = JSON.parse(testError.content);
    expect(content.stack).to.include('throwUncaughtForTesting');
  });
  
  it('should be queryable via the group view', async function() {
    this.timeout(5000);
    
    // Generate another exception for our group
    setTimeout(() => {
      process.nextTick(() => {
        throw new Error('Group test exception');
      });
    }, 10);
    
    // Wait for the exception to be persisted
    await baseTest.waitForDataPersistence(2000);
    
    // Get the grouped exceptions
    const groupData = await baseTest.getGroupData();
    expect(groupData.results.length).to.be.at.least(1);
    
    // Verify we have a count of exceptions
    expect(groupData.count).to.be.a('string');
  });
});
