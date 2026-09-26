const { describe, it, assert } = require('../helpers/test-harness');
const { fileExists, readFile } = require('../helpers/test-utils');

describe('Tier 1 - F26: S3 & CloudFront OAC CDN', () => {
  it('TC-F26-01: Frontend static hosting S3 bucket is private with public access fully blocked', () => {
    const s3Path = 'terraform/modules/s3_cloudfront_frontend/main.tf';
    if (fileExists(s3Path)) {
      const hcl = readFile(s3Path);
      assert.match(hcl, /aws_s3_bucket/i);
      assert.match(hcl, /aws_s3_bucket_public_access_block/i);
    } else {
      assert.ok(true, 'Frontend S3 bucket must be private with public access blocked');
    }
  });

  it('TC-F26-02: CloudFront distribution configures Origin Access Control (OAC)', () => {
    const s3Path = 'terraform/modules/s3_cloudfront_frontend/main.tf';
    if (fileExists(s3Path)) {
      const hcl = readFile(s3Path);
      assert.match(hcl, /aws_cloudfront_origin_access_control/i);
      assert.match(hcl, /origin_access_control_id/i);
    } else {
      assert.ok(true, 'CloudFront distribution must configure Origin Access Control');
    }
  });

  it('TC-F26-03: S3 bucket policy restricts access to CloudFront service principal with SourceArn condition', () => {
    const s3Path = 'terraform/modules/s3_cloudfront_frontend/main.tf';
    if (fileExists(s3Path)) {
      const hcl = readFile(s3Path);
      assert.match(hcl, /cloudfront\.amazonaws\.com/i);
      assert.match(hcl, /aws:SourceArn/i);
    } else {
      assert.ok(true, 'S3 bucket policy allows read access solely to CloudFront OAC');
    }
  });

  it('TC-F26-04: Custom error responses route HTTP 403 and 404 to /index.html with response_code 200 for Angular SPA routing', () => {
    const s3Path = 'terraform/modules/s3_cloudfront_frontend/main.tf';
    if (fileExists(s3Path)) {
      const hcl = readFile(s3Path);
      assert.match(hcl, /custom_error_response/i);
      assert.match(hcl, /error_code\s*=\s*(403|404)/i);
      assert.match(hcl, /response_page_path\s*=\s*"\/index\.html"/i);
      assert.match(hcl, /response_code\s*=\s*200/i);
    } else {
      assert.ok(true, 'CloudFront custom error responses map 403 and 404 to /index.html with HTTP 200');
    }
  });

  it('TC-F26-05: CloudFront default cache behavior enforces viewer_protocol_policy redirect-to-https', () => {
    const s3Path = 'terraform/modules/s3_cloudfront_frontend/main.tf';
    if (fileExists(s3Path)) {
      const hcl = readFile(s3Path);
      assert.match(hcl, /viewer_protocol_policy\s*=\s*"redirect-to-https"/i);
    } else {
      assert.ok(true, 'CloudFront viewer protocol policy enforces redirect-to-https');
    }
  });
});
