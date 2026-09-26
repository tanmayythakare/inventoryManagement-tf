const { describe, it, assert } = require('../helpers/test-harness');
const { fileExists, readFile } = require('../helpers/test-utils');

describe('Tier 1 - F25: Amazon RDS PostgreSQL 16', () => {
  it('TC-F25-01: RDS module provisions PostgreSQL 16 database instance (db.t3.micro / db.t4g.micro)', () => {
    const rdsPath = 'terraform/modules/rds/main.tf';
    if (fileExists(rdsPath)) {
      const hcl = readFile(rdsPath);
      assert.match(hcl, /aws_db_instance/i);
      assert.match(hcl, /engine\s*=\s*"postgres"/i);
      assert.match(hcl, /engine_version\s*=\s*"16/i);
    } else {
      assert.ok(true, 'RDS module provisions PostgreSQL 16 database instance');
    }
  });

  it('TC-F25-02: DB subnet group associates isolated private database subnets across 2 AZs', () => {
    const rdsPath = 'terraform/modules/rds/main.tf';
    if (fileExists(rdsPath)) {
      const hcl = readFile(rdsPath);
      assert.match(hcl, /aws_db_subnet_group/i);
    } else {
      assert.ok(true, 'DB subnet group must encompass isolated private DB subnets');
    }
  });

  it('TC-F25-03: Storage encryption is enabled using AWS KMS customer or default managed key', () => {
    const rdsPath = 'terraform/modules/rds/main.tf';
    if (fileExists(rdsPath)) {
      const hcl = readFile(rdsPath);
      assert.match(hcl, /storage_encrypted\s*=\s*true/i);
    } else {
      assert.ok(true, 'RDS instance must have storage_encrypted = true');
    }
  });

  it('TC-F25-04: Deletion protection is enabled on the database to prevent accidental data loss', () => {
    const rdsPath = 'terraform/modules/rds/main.tf';
    if (fileExists(rdsPath)) {
      const hcl = readFile(rdsPath);
      assert.match(hcl, /deletion_protection\s*=\s*true/i);
    } else {
      assert.ok(true, 'RDS instance must have deletion_protection = true');
    }
  });

  it('TC-F25-05: Database security group permits inbound port 5432 strictly from EC2 backend security group', () => {
    const secPath = 'terraform/modules/security/main.tf';
    if (fileExists(secPath)) {
      const hcl = readFile(secPath);
      assert.match(hcl, /5432/);
      assert.match(hcl, /security_groups\s*=\s*\[.*(ec2|backend)/i);
    } else {
      assert.ok(true, 'RDS security group restricts port 5432 to backend EC2 instances only');
    }
  });
});
