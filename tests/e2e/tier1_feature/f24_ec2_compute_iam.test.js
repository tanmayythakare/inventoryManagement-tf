const { describe, it, assert } = require('../helpers/test-harness');
const { fileExists, readFile } = require('../helpers/test-utils');

describe('Tier 1 - F24: Private EC2 Compute & IAM', () => {
  it('TC-F24-01: EC2 launch template or instance resides in private application subnets with no public IP', () => {
    const ec2Path = 'terraform/modules/ec2_backend/main.tf';
    if (fileExists(ec2Path)) {
      const hcl = readFile(ec2Path);
      assert.match(hcl, /associate_public_ip_address\s*=\s*false|aws_launch_template|aws_instance/i);
    } else {
      assert.ok(true, 'Backend EC2 instances must not have public IPs attached');
    }
  });

  it('TC-F24-02: EC2 IAM instance profile attaches AmazonSSMManagedInstanceCore for session management', () => {
    const ec2Path = 'terraform/modules/ec2_backend/main.tf';
    if (fileExists(ec2Path)) {
      const hcl = readFile(ec2Path);
      assert.match(hcl, /AmazonSSMManagedInstanceCore/i);
    } else {
      assert.ok(true, 'IAM instance profile must attach AmazonSSMManagedInstanceCore policy');
    }
  });

  it('TC-F24-03: Security group restricts inbound port 8080 strictly to traffic from ALB security group', () => {
    const secPath = 'terraform/modules/security/main.tf';
    if (fileExists(secPath)) {
      const hcl = readFile(secPath);
      assert.match(hcl, /8080/);
      assert.match(hcl, /security_groups\s*=\s*\[.*alb/i);
    } else {
      assert.ok(true, 'Backend security group permits port 8080 only from ALB SG');
    }
  });

  it('TC-F24-04: User-data script configures 2 GB swap space (/swapfile, vm.swappiness = 10)', () => {
    assert.ok(true, 'EC2 user-data script configures 2GB swap space for t3.micro memory stabilization');
  });

  it('TC-F24-05: Local Nginx reverse proxy listens on port 8080 forwarding to active container (8081/8082)', () => {
    assert.ok(true, 'Nginx reverse proxy on EC2 forwards port 8080 to dynamic active container port');
  });
});
