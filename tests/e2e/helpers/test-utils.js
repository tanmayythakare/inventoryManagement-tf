/**
 * Test Utilities and File/Contract Inspection Engine
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { SimulatedPlatformEngine } = require('./simulated-platform');

const ROOT_DIR = path.resolve(__dirname, '../../..');

/**
 * Returns absolute path from project root
 */
function resolvePath(relPath) {
  return path.resolve(ROOT_DIR, relPath);
}

/**
 * Checks if a file exists relative to project root
 */
function fileExists(relPath) {
  return fs.existsSync(resolvePath(relPath));
}

/**
 * Reads file content relative to project root
 */
function readFile(relPath) {
  const absPath = resolvePath(relPath);
  if (!fs.existsSync(absPath)) {
    return null;
  }
  return fs.readFileSync(absPath, 'utf8');
}

/**
 * Asserts that a file contains an expected string or pattern
 */
function assertFileContains(relPath, expected, message) {
  const content = readFile(relPath);
  assert.ok(content !== null, `File not found: ${relPath}`);
  if (expected instanceof RegExp) {
    assert.match(content, expected, message || `File ${relPath} did not match pattern ${expected}`);
  } else {
    assert.ok(content.includes(expected), message || `File ${relPath} does not contain: "${expected}"`);
  }
}

/**
 * Live / Simulated unified test client
 */
class TestClient {
  constructor() {
    this.simulated = new SimulatedPlatformEngine();
    this.isLive = process.env.LIVE_TEST === 'true';
    this.baseUrl = process.env.BACKEND_URL || 'http://localhost:8080';
  }

  reset() {
    this.simulated.reset();
  }

  async login(username, password) {
    if (this.isLive) {
      // Live HTTP call can be added if live server is running
      throw new Error('Live mode not configured yet');
    }
    return this.simulated.login(username, password);
  }

  async refresh(refreshToken) {
    if (this.isLive) {
      throw new Error('Live mode not configured yet');
    }
    return this.simulated.refresh(refreshToken);
  }

  async getProducts() {
    if (this.isLive) {
      throw new Error('Live mode not configured yet');
    }
    return this.simulated.getProducts();
  }

  async getProductById(id) {
    if (this.isLive) {
      throw new Error('Live mode not configured yet');
    }
    return this.simulated.getProductById(id);
  }

  async confirmOrder(orderId) {
    if (this.isLive) {
      throw new Error('Live mode not configured yet');
    }
    return this.simulated.confirmOrder(orderId);
  }

  async getHealth() {
    if (this.isLive) {
      throw new Error('Live mode not configured yet');
    }
    return this.simulated.getHealth();
  }

  setDbHealth(status) {
    this.simulated.setDbHealth(status);
  }

  async executeRollingDeployment(instanceId, tag) {
    return this.simulated.executeRollingDeployment(instanceId, tag);
  }

  async executeRollback(instanceId) {
    return this.simulated.executeRollback(instanceId);
  }

  pushEcrImage(tag) {
    return this.simulated.pushEcrImage(tag);
  }
}

const defaultClient = new TestClient();

module.exports = {
  ROOT_DIR,
  resolvePath,
  fileExists,
  readFile,
  assertFileContains,
  TestClient,
  client: defaultClient
};
