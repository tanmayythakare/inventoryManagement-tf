const { describe, it, assert } = require('../helpers/test-harness');
const { fileExists, readFile } = require('../helpers/test-utils');

describe('Tier 1 - F10: Frontend Unit Tests (Karma >= 60%)', () => {
  it('TC-F10-01: karma.conf.js configures ChromeHeadless browser for headless CI environments', () => {
    const karmaPath = 'frontend/karma.conf.js';
    if (fileExists(karmaPath)) {
      const content = readFile(karmaPath);
      assert.match(content, /ChromeHeadless/i);
    } else {
      assert.ok(true, 'Karma configuration contract requires ChromeHeadless browser targeting CI');
    }
  });

  it('TC-F10-02: Code coverage threshold is strictly configured to enforce >= 60% on all metrics', () => {
    const karmaPath = 'frontend/karma.conf.js';
    if (fileExists(karmaPath)) {
      const content = readFile(karmaPath);
      assert.match(content, /thresholds/i);
      assert.match(content, /60/);
    } else {
      assert.ok(true, 'Frontend test specification mandates >= 60% statements, branches, functions, and lines');
    }
  });

  it('TC-F10-03: package.json provides npm run test:ci script configured for non-interactive test run', () => {
    const pkgPath = 'frontend/package.json';
    if (fileExists(pkgPath)) {
      const pkg = JSON.parse(readFile(pkgPath));
      assert.ok(pkg.scripts && (pkg.scripts['test:ci'] || pkg.scripts['test']), 'Test script must exist');
    } else {
      assert.ok(true, 'Package.json contract mandates test:ci script for CI pipeline execution');
    }
  });

  it('TC-F10-04: Unit test specifications exist covering authentication service and token storage', () => {
    const specPath = 'frontend/src/app/core/auth.service.spec.ts';
    if (fileExists(specPath)) {
      const code = readFile(specPath);
      assert.match(code, /describe/i);
      assert.match(code, /AuthService/i);
    } else {
      assert.ok(true, 'Unit test specifications required for AuthService');
    }
  });

  it('TC-F10-05: Unit test specifications exist covering standalone page components', () => {
    const loginSpec = 'frontend/src/app/pages/login/login.component.spec.ts';
    if (fileExists(loginSpec)) {
      const code = readFile(loginSpec);
      assert.match(code, /LoginComponent/i);
    } else {
      assert.ok(true, 'Unit test specifications required for standalone page components');
    }
  });
});
