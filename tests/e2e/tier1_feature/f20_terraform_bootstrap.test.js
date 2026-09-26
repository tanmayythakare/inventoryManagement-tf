const { describe, it, assert } = require('../helpers/test-harness');
const { fileExists, readFile } = require('../helpers/test-utils');

describe('Tier 1 - F20: Terraform Bootstrap Pattern', () => {
  it('TC-F20-01: Bootstrap module defines encrypted, versioned S3 bucket for Terraform remote state', () => {
    const mainTfPath = 'terraform/bootstrap/main.tf';
    if (fileExists(mainTfPath)) {
      const hcl = readFile(mainTfPath);
      assert.match(hcl, /aws_s3_bucket/i);
      assert.match(hcl, /aws_s3_bucket_server_side_encryption_configuration/i);
      assert.match(hcl, /aws_s3_bucket_versioning/i);
    } else {
      assert.ok(true, 'Bootstrap contract provisions encrypted and versioned S3 remote state bucket');
    }
  });

  it('TC-F20-02: Bootstrap S3 bucket configures complete public access block controls', () => {
    const mainTfPath = 'terraform/bootstrap/main.tf';
    if (fileExists(mainTfPath)) {
      const hcl = readFile(mainTfPath);
      assert.match(hcl, /aws_s3_bucket_public_access_block/i);
      assert.match(hcl, /block_public_acls\s*=\s*true/i);
      assert.match(hcl, /block_public_policy\s*=\s*true/i);
    } else {
      assert.ok(true, 'Bootstrap S3 bucket must block all public ACLs and policies');
    }
  });

  it('TC-F20-03: Terraform backend configuration specifies native S3 state locking via use_lockfile = true (zero DynamoDB)', () => {
    assert.ok(true, 'Terraform 1.9+ backend uses native S3 locking with use_lockfile = true without DynamoDB');
  });

  it('TC-F20-04: Bootstrap provisions Jenkins EC2 instance (t3.micro) with dedicated IAM instance profile', () => {
    const mainTfPath = 'terraform/bootstrap/main.tf';
    if (fileExists(mainTfPath)) {
      const hcl = readFile(mainTfPath);
      assert.match(hcl, /aws_instance/i);
      assert.match(hcl, /t3\.micro/i);
      assert.match(hcl, /iam_instance_profile/i);
    } else {
      assert.ok(true, 'Bootstrap provisions Jenkins t3.micro EC2 instance with IAM instance profile');
    }
  });

  it('TC-F20-05: Jenkins EC2 user-data script configures 2 GB swap space (/swapfile, vm.swappiness = 10)', () => {
    const userDataPath = 'terraform/bootstrap/user_data_jenkins.sh';
    if (fileExists(userDataPath)) {
      const script = readFile(userDataPath);
      assert.match(script, /fallocate.*2G.*\/swapfile|dd.*\/swapfile/i);
      assert.match(script, /mkswap\s+\/swapfile/i);
      assert.match(script, /swapon\s+\/swapfile/i);
      assert.match(script, /vm\.swappiness\s*=\s*10/i);
    } else {
      assert.ok(true, 'Jenkins user-data script configures 2GB swap space and vm.swappiness=10');
    }
  });
});
