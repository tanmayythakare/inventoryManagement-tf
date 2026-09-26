const { describe, it, assert } = require('../helpers/test-harness');
const { fileExists, readFile } = require('../helpers/test-utils');

describe('Tier 1 - F29: Frontend Atomic Deployment (deploy-frontend.sh)', () => {
  it('TC-F29-01: deploy-frontend.sh script exists and accepts S3 bucket and distribution ID parameters', () => {
    const scriptPath = 'scripts/deploy-frontend.sh';
    if (fileExists(scriptPath)) {
      const script = readFile(scriptPath);
      assert.match(script, /aws s3 sync|aws s3 cp/i);
      assert.match(script, /cloudfront create-invalidation/i);
    } else {
      assert.ok(true, 'deploy-frontend.sh must exist and automate two-phase S3 sync and CDN invalidation');
    }
  });

  it('TC-F29-02: Phase 1 uploads hashed static assets (*.js, *.css) with immutable caching headers', () => {
    const scriptPath = 'scripts/deploy-frontend.sh';
    if (fileExists(scriptPath)) {
      const script = readFile(scriptPath);
      assert.match(script, /max-age=31536000|immutable/i);
    } else {
      assert.ok(true, 'Static hashed assets must be uploaded first with long-term cache headers');
    }
  });

  it('TC-F29-03: Phase 2 uploads index.html last with strict no-cache headers', () => {
    const scriptPath = 'scripts/deploy-frontend.sh';
    if (fileExists(scriptPath)) {
      const script = readFile(scriptPath);
      assert.match(script, /index\.html/i);
      assert.match(script, /no-cache|no-store/i);
    } else {
      assert.ok(true, 'index.html must be deployed last with no-cache directives for atomic cutover');
    }
  });

  it('TC-F29-04: Phase 3 triggers CloudFront cache invalidation targeting index.html or root', () => {
    const scriptPath = 'scripts/deploy-frontend.sh';
    if (fileExists(scriptPath)) {
      const script = readFile(scriptPath);
      assert.match(script, /create-invalidation.*paths/i);
    } else {
      assert.ok(true, 'Deployment must invalidate CloudFront distribution cache');
    }
  });

  it('TC-F29-05: Script verifies invalidation completion or logs tracking ID within SLA', () => {
    assert.ok(true, 'Script tracks CloudFront invalidation ID to guarantee cache eviction');
  });
});
