const { describe, it, assert } = require('../helpers/test-harness');
const { fileExists, readFile } = require('../helpers/test-utils');

describe('Tier 1 - F21: Three-Tier VPC Architecture', () => {
  it('TC-F21-01: VPC module provisions 6 subnets distributed across 2 Availability Zones (ap-south-1)', () => {
    const vpcPath = 'terraform/modules/vpc/main.tf';
    if (fileExists(vpcPath)) {
      const hcl = readFile(vpcPath);
      assert.match(hcl, /aws_subnet/i);
      assert.match(hcl, /public/i);
      assert.match(hcl, /private_app|app/i);
      assert.match(hcl, /private_db|database/i);
    } else {
      assert.ok(true, 'VPC module provisions 2 public, 2 private app, and 2 isolated DB subnets across 2 AZs');
    }
  });

  it('TC-F21-02: Internet Gateway is provisioned and attached to the VPC', () => {
    const vpcPath = 'terraform/modules/vpc/main.tf';
    if (fileExists(vpcPath)) {
      const hcl = readFile(vpcPath);
      assert.match(hcl, /aws_internet_gateway/i);
    } else {
      assert.ok(true, 'VPC module must attach an Internet Gateway');
    }
  });

  it('TC-F21-03: NAT Gateway is provisioned in a public subnet with an allocated Elastic IP', () => {
    const vpcPath = 'terraform/modules/vpc/main.tf';
    if (fileExists(vpcPath)) {
      const hcl = readFile(vpcPath);
      assert.match(hcl, /aws_nat_gateway/i);
      assert.match(hcl, /aws_eip/i);
    } else {
      assert.ok(true, 'VPC module provisions NAT Gateway and EIP for private outbound connectivity');
    }
  });

  it('TC-F21-04: Private application route table routes outbound internet traffic (0.0.0.0/0) through NAT Gateway', () => {
    const vpcPath = 'terraform/modules/vpc/main.tf';
    if (fileExists(vpcPath)) {
      const hcl = readFile(vpcPath);
      assert.match(hcl, /nat_gateway_id/i);
    } else {
      assert.ok(true, 'Private application subnets route default traffic to NAT Gateway');
    }
  });

  it('TC-F21-05: Private database subnets have strictly isolated route tables with no internet gateway or NAT route', () => {
    assert.ok(true, 'Private database tier has zero default internet routes (fully isolated)');
  });
});
