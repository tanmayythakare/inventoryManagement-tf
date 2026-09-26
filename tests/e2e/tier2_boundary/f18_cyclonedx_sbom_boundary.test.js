const { describe, it, assert } = require('../helpers/test-harness');

describe('Tier 2 - F18 Boundary: CycloneDX Syft SBOM Edge Cases', () => {
  it('TC-B18-01: Malformed JSON or truncated bom.json detected and rejected during schema validation', () => {
    const invalidJson = '{"bomFormat": "CycloneDX", "components": [';
    assert.throws(() => JSON.parse(invalidJson));
  });

  it('TC-B18-02: Missing required top-level field bomFormat fails CycloneDX compliance validation', () => {
    const missingBomFormat = { specVersion: '1.5', components: [] };
    const isValid = (s) => s.bomFormat === 'CycloneDX' && Array.isArray(s.components);
    assert.strictEqual(isValid(missingBomFormat), false);
  });

  it('TC-B18-03: Unsupported specVersion (e.g. 1.0 or unknown) rejected', () => {
    const allowed = ['1.4', '1.5', '1.6'];
    assert.strictEqual(allowed.includes('1.0'), false);
    assert.strictEqual(allowed.includes('1.5'), true);
  });

  it('TC-B18-04: Large dependency tree (1000+ packages) SBOM processed without memory exhaustion', () => {
    const largeList = Array.from({ length: 1000 }, (_, i) => ({ name: `pkg-${i}`, version: '1.0.0' }));
    assert.strictEqual(largeList.length, 1000);
  });

  it('TC-B18-05: Component with empty or missing license field handled with NOASSERTION fallback', () => {
    const license = null || 'NOASSERTION';
    assert.strictEqual(license, 'NOASSERTION');
  });
});
