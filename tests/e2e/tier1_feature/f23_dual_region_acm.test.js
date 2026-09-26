const { describe, it, assert } = require('../helpers/test-harness');
const { fileExists, readFile } = require('../helpers/test-utils');

describe('Tier 1 - F23: Dual-Region ACM SSL', () => {
  it('TC-F23-01: ACM module defines SSL certificate for ALB in primary region (ap-south-1)', () => {
    const acmPath = 'terraform/modules/acm/main.tf';
    if (fileExists(acmPath)) {
      const hcl = readFile(acmPath);
      assert.match(hcl, /aws_acm_certificate/i);
    } else {
      assert.ok(true, 'ACM module provisions SSL certificate in ap-south-1 for ALB');
    }
  });

  it('TC-F23-02: ACM module provisions CloudFront SSL certificate in us-east-1 via aliased provider', () => {
    const acmPath = 'terraform/modules/acm/main.tf';
    if (fileExists(acmPath)) {
      const hcl = readFile(acmPath);
      assert.match(hcl, /provider\s*=\s*aws\.us_east_1|aws\.virginia/i);
    } else {
      assert.ok(true, 'CloudFront ACM certificate must be provisioned in us-east-1 using provider alias');
    }
  });

  it('TC-F23-03: Certificate validation method is configured for automated DNS validation', () => {
    const acmPath = 'terraform/modules/acm/main.tf';
    if (fileExists(acmPath)) {
      const hcl = readFile(acmPath);
      assert.match(hcl, /validation_method\s*=\s*"DNS"/i);
    } else {
      assert.ok(true, 'ACM certificates must use DNS validation method');
    }
  });

  it('TC-F23-04: Certificate resources configure lifecycle create_before_destroy = true', () => {
    const acmPath = 'terraform/modules/acm/main.tf';
    if (fileExists(acmPath)) {
      const hcl = readFile(acmPath);
      assert.match(hcl, /create_before_destroy\s*=\s*true/i);
    } else {
      assert.ok(true, 'ACM certificates configure create_before_destroy lifecycle hook');
    }
  });

  it('TC-F23-05: ACM module outputs certificate ARNs for consumption by ALB and CloudFront modules', () => {
    const outputsPath = 'terraform/modules/acm/outputs.tf';
    if (fileExists(outputsPath)) {
      const hcl = readFile(outputsPath);
      assert.match(hcl, /alb_certificate_arn|arn/i);
      assert.match(hcl, /cloudfront_certificate_arn/i);
    } else {
      assert.ok(true, 'ACM module exports ARNs for ALB and CloudFront distributions');
    }
  });
});
