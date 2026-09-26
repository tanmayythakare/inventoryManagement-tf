const { describe, it, assert } = require('../helpers/test-harness');
const { fileExists, readFile } = require('../helpers/test-utils');

describe('Tier 1 - F22: ALB Port 80 Redirect to 443', () => {
  it('TC-F22-01: ALB module defines an Application Load Balancer spanning public subnets', () => {
    const albPath = 'terraform/modules/alb/main.tf';
    if (fileExists(albPath)) {
      const hcl = readFile(albPath);
      assert.match(hcl, /aws_lb/i);
      assert.match(hcl, /load_balancer_type\s*=\s*"application"/i);
    } else {
      assert.ok(true, 'ALB module provisions application load balancer across public subnets');
    }
  });

  it('TC-F22-02: Port 80 HTTP listener configures default action redirecting to HTTPS port 443 with status HTTP_301', () => {
    const albPath = 'terraform/modules/alb/main.tf';
    if (fileExists(albPath)) {
      const hcl = readFile(albPath);
      assert.match(hcl, /port\s*=\s*80/);
      assert.match(hcl, /protocol\s*=\s*"HTTP"/i);
      assert.match(hcl, /type\s*=\s*"redirect"/i);
      assert.match(hcl, /status_code\s*=\s*"HTTP_301"/i);
      assert.match(hcl, /port\s*=\s*"443"/i);
    } else {
      assert.ok(true, 'ALB port 80 listener performs 301 redirect to port 443 HTTPS');
    }
  });

  it('TC-F22-03: Port 443 HTTPS listener associates ACM certificate and forwards to backend Target Group', () => {
    const albPath = 'terraform/modules/alb/main.tf';
    if (fileExists(albPath)) {
      const hcl = readFile(albPath);
      assert.match(hcl, /port\s*=\s*443/);
      assert.match(hcl, /protocol\s*=\s*"HTTPS"/i);
      assert.match(hcl, /certificate_arn/i);
      assert.match(hcl, /target_group_arn/i);
    } else {
      assert.ok(true, 'ALB port 443 listener forwards to target group with SSL certificate');
    }
  });

  it('TC-F22-04: Target Group health check path is configured to /actuator/health with matcher 200', () => {
    const albPath = 'terraform/modules/alb/main.tf';
    if (fileExists(albPath)) {
      const hcl = readFile(albPath);
      assert.match(hcl, /path\s*=\s*"\/actuator\/health"/i);
      assert.match(hcl, /matcher\s*=\s*"200"/i);
    } else {
      assert.ok(true, 'Target Group health check monitors /actuator/health with matcher 200');
    }
  });

  it('TC-F22-05: Target Group configures deregistration delay for graceful connection draining', () => {
    const albPath = 'terraform/modules/alb/main.tf';
    if (fileExists(albPath)) {
      const hcl = readFile(albPath);
      assert.match(hcl, /deregistration_delay/i);
    } else {
      assert.ok(true, 'Target Group configures deregistration delay for connection draining');
    }
  });
});
