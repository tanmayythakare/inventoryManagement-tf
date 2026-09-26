#!/usr/bin/env node
/**
 * Master E2E Automated Test Runner
 * Discovers and executes all test suites across Tiers 1-4.
 * Enforces zero-failure policy: exits with 0 on full pass, 1 on any failure.
 */

const path = require('path');
const fs = require('fs');
const { executeAll, globalContext } = require('./helpers/test-harness');

const E2E_ROOT = __dirname;

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    tier: null, // null means all tiers
    verbose: false
  };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--tier' && args[i + 1]) {
      options.tier = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i].startsWith('--tier=')) {
      options.tier = parseInt(args[i].split('=')[1], 10);
    } else if (args[i] === '--verbose' || args[i] === '-v') {
      options.verbose = true;
    } else if (args[i] === '--help' || args[i] === '-h') {
      console.log(`
Enterprise E2E Test Suite Runner
Usage:
  node tests/e2e/runner.js [options]

Options:
  --tier <1-4>   Run tests only for the specified tier (default: all)
  --verbose      Enable verbose output
  --help, -h     Show this help message
`);
      process.exit(0);
    }
  }

  return options;
}

function getTestFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...getTestFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.test.js')) {
      files.push(fullPath);
    }
  }

  return files.sort();
}

async function main() {
  const options = parseArgs();
  console.log(`[E2E Runner] Initializing test discovery...`);

  const tiers = [
    { id: 1, dir: path.join(E2E_ROOT, 'tier1_feature'), name: 'Tier 1 - Feature Coverage' },
    { id: 2, dir: path.join(E2E_ROOT, 'tier2_boundary'), name: 'Tier 2 - Boundary & Corner' },
    { id: 3, dir: path.join(E2E_ROOT, 'tier3_combination'), name: 'Tier 3 - Cross-Feature Pairwise' },
    { id: 4, dir: path.join(E2E_ROOT, 'tier4_workload'), name: 'Tier 4 - Real-World Application Workloads' }
  ];

  const selectedTiers = options.tier
    ? tiers.filter(t => t.id === options.tier)
    : tiers;

  if (selectedTiers.length === 0) {
    console.error(`[E2E Runner] Error: Invalid tier specified (${options.tier}). Valid values are 1, 2, 3, 4.`);
    process.exit(1);
  }

  let totalFilesDiscovered = 0;

  for (const tier of selectedTiers) {
    const testFiles = getTestFiles(tier.dir);
    totalFilesDiscovered += testFiles.length;
    console.log(`[E2E Runner] ${tier.name}: Discovered ${testFiles.length} test suite file(s)`);

    // Require and load test files into test context
    for (const file of testFiles) {
      try {
        require(file);
      } catch (err) {
        console.error(`[E2E Runner] Error loading test file ${file}:`, err);
        process.exit(1);
      }
    }
  }

  console.log(`[E2E Runner] Total test files loaded: ${totalFilesDiscovered}`);

  const results = await executeAll();

  if (results.failed > 0) {
    console.error(`\n[E2E Runner] FAILED: ${results.failed} test(s) failed out of ${results.total}. Exiting with code 1.`);
    process.exit(1);
  } else {
    console.log(`\n[E2E Runner] SUCCESS: All ${results.total} test(s) passed successfully! Exiting with code 0.`);
    process.exit(0);
  }
}

if (require.main === module) {
  main().catch(err => {
    console.error('[E2E Runner] Fatal error:', err);
    process.exit(1);
  });
}
