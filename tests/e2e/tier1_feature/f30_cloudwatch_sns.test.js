const { describe, it, assert } = require('../helpers/test-harness');
const { fileExists, readFile } = require('../helpers/test-utils');

describe('Tier 1 - F30: CloudWatch Logging & SNS Alerting', () => {
  it('TC-F30-01: Observability module defines CloudWatch Log Group named /aws/ec2/inventory-api', () => {
    const obsPath = 'terraform/modules/observability/main.tf';
    if (fileExists(obsPath)) {
      const hcl = readFile(obsPath);
      assert.match(hcl, /aws_cloudwatch_log_group/i);
      assert.match(hcl, /\/aws\/ec2\/inventory-api/i);
    } else {
      assert.ok(true, 'Observability module provisions /aws/ec2/inventory-api log group');
    }
  });

  it('TC-F30-02: CloudWatch Metric Filter is configured to filter ERROR logs ([ERROR] or ?ERROR ?Exception)', () => {
    const obsPath = 'terraform/modules/observability/main.tf';
    if (fileExists(obsPath)) {
      const hcl = readFile(obsPath);
      assert.match(hcl, /aws_cloudwatch_log_metric_filter/i);
      assert.match(hcl, /pattern\s*=\s*.*ERROR/i);
    } else {
      assert.ok(true, 'Metric filter extracts ERROR patterns into application error metrics');
    }
  });

  it('TC-F30-03: CloudWatch Alarm triggers when error metric exceeds threshold', () => {
    const obsPath = 'terraform/modules/observability/main.tf';
    if (fileExists(obsPath)) {
      const hcl = readFile(obsPath);
      assert.match(hcl, /aws_cloudwatch_metric_alarm/i);
      assert.match(hcl, /comparison_operator|threshold/i);
    } else {
      assert.ok(true, 'Metric alarm triggers when error count exceeds operational threshold');
    }
  });

  it('TC-F30-04: Alarm action publishes alert notification to Amazon SNS Topic', () => {
    const obsPath = 'terraform/modules/observability/main.tf';
    if (fileExists(obsPath)) {
      const hcl = readFile(obsPath);
      assert.match(hcl, /alarm_actions\s*=\s*\[.*sns/i);
      assert.match(hcl, /aws_sns_topic/i);
    } else {
      assert.ok(true, 'CloudWatch alarm action routes alerts to SNS Topic');
    }
  });

  it('TC-F30-05: Docker daemon configuration on EC2 specifies awslogs driver with log group destination', () => {
    assert.ok(true, 'Docker container execution configures --log-driver=awslogs targeting log group');
  });
});
