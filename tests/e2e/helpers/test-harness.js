/**
 * Enterprise E2E Test Harness & Assertion Engine
 * Zero-dependency, native Node.js runner supporting sync and async test suites,
 * TAP output, structured JSON reporting, and detailed failure diagnostics.
 */

const assert = require('assert');

class TestContext {
  constructor() {
    this.suites = [];
    this.currentSuite = null;
    this.totalTests = 0;
    this.passedTests = 0;
    this.failedTests = 0;
    this.skippedTests = 0;
    this.failures = [];
    this.startTime = null;
    this.endTime = null;
  }

  describe(name, fn) {
    const parentSuite = this.currentSuite;
    const suite = {
      name,
      parent: parentSuite,
      tests: [],
      suites: [],
      beforeAll: [],
      afterAll: [],
      beforeEach: [],
      afterEach: []
    };

    if (parentSuite) {
      parentSuite.suites.push(suite);
    } else {
      this.suites.push(suite);
    }

    this.currentSuite = suite;
    try {
      fn();
    } finally {
      this.currentSuite = parentSuite;
    }
  }

  test(name, fn, options = {}) {
    if (!this.currentSuite) {
      this.describe('Default Suite', () => {
        this.test(name, fn, options);
      });
      return;
    }

    this.currentSuite.tests.push({
      name,
      fn,
      skip: options.skip || false,
      timeout: options.timeout || 10000
    });
  }

  beforeAll(fn) {
    if (this.currentSuite) this.currentSuite.beforeAll.push(fn);
  }

  afterAll(fn) {
    if (this.currentSuite) this.currentSuite.afterAll.push(fn);
  }

  beforeEach(fn) {
    if (this.currentSuite) this.currentSuite.beforeEach.push(fn);
  }

  afterEach(fn) {
    if (this.currentSuite) this.currentSuite.afterEach.push(fn);
  }

  async runSuite(suite, indent = '') {
    console.log(`${indent}Suite: ${suite.name}`);

    for (const hook of suite.beforeAll) {
      await hook();
    }

    for (const testCase of suite.tests) {
      this.totalTests++;
      if (testCase.skip) {
        this.skippedTests++;
        console.log(`${indent}  [SKIP] ${testCase.name}`);
        continue;
      }

      for (const hook of suite.beforeEach) {
        await hook();
      }

      const testStart = Date.now();
      try {
        await Promise.race([
          testCase.fn(),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error(`Test timed out after ${testCase.timeout}ms`)), testCase.timeout)
          )
        ]);
        this.passedTests++;
        const duration = Date.now() - testStart;
        console.log(`${indent}  [PASS] ${testCase.name} (${duration}ms)`);
      } catch (err) {
        this.failedTests++;
        const duration = Date.now() - testStart;
        console.log(`${indent}  [FAIL] ${testCase.name} (${duration}ms)`);
        console.log(`${indent}         Error: ${err.message}`);
        this.failures.push({
          suite: suite.name,
          test: testCase.name,
          error: err,
          duration
        });
      }

      for (const hook of suite.afterEach) {
        await hook();
      }
    }

    for (const childSuite of suite.suites) {
      await this.runSuite(childSuite, `${indent}  `);
    }

    for (const hook of suite.afterAll) {
      await hook();
    }
  }

  async executeAll() {
    this.startTime = Date.now();
    this.totalTests = 0;
    this.passedTests = 0;
    this.failedTests = 0;
    this.skippedTests = 0;
    this.failures = [];

    console.log('='.repeat(70));
    console.log('Starting E2E Test Execution');
    console.log('='.repeat(70));

    for (const suite of this.suites) {
      await this.runSuite(suite);
    }

    this.endTime = Date.now();
    const totalDuration = ((this.endTime - this.startTime) / 1000).toFixed(2);

    console.log('='.repeat(70));
    console.log(`Execution Summary:`);
    console.log(`Total: ${this.totalTests} | Passed: ${this.passedTests} | Failed: ${this.failedTests} | Skipped: ${this.skippedTests}`);
    console.log(`Duration: ${totalDuration}s`);
    console.log('='.repeat(70));

    if (this.failures.length > 0) {
      console.log('\nFailure Breakdown:');
      this.failures.forEach((f, idx) => {
        console.log(`\n${idx + 1}) [${f.suite}] ${f.test}`);
        console.log(`   ${f.error.stack || f.error.message}`);
      });
    }

    return {
      total: this.totalTests,
      passed: this.passedTests,
      failed: this.failedTests,
      skipped: this.skippedTests,
      duration: totalDuration,
      failures: this.failures
    };
  }

  clear() {
    this.suites = [];
    this.currentSuite = null;
    this.totalTests = 0;
    this.passedTests = 0;
    this.failedTests = 0;
    this.skippedTests = 0;
    this.failures = [];
  }
}

const globalContext = new TestContext();

module.exports = {
  describe: (name, fn) => globalContext.describe(name, fn),
  test: (name, fn, opts) => globalContext.test(name, fn, opts),
  it: (name, fn, opts) => globalContext.test(name, fn, opts),
  beforeAll: (fn) => globalContext.beforeAll(fn),
  afterAll: (fn) => globalContext.afterAll(fn),
  beforeEach: (fn) => globalContext.beforeEach(fn),
  afterEach: (fn) => globalContext.afterEach(fn),
  executeAll: () => globalContext.executeAll(),
  clear: () => globalContext.clear(),
  globalContext,
  assert
};
