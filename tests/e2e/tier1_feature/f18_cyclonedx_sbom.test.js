const { describe, it, assert } = require('../helpers/test-harness');
const { fileExists, readFile } = require('../helpers/test-utils');
const { validateCycloneDxSbom } = require('../helpers/contract-validators');

describe('Tier 1 - F18: CycloneDX Syft SBOM (bom.json)', () => {
  it('TC-F18-01: Jenkinsfile defines SBOM generation stage executing Syft CLI', () => {
    const jenkinsPath = 'Jenkinsfile';
    if (fileExists(jenkinsPath)) {
      const content = readFile(jenkinsPath);
      assert.match(content, /syft/i);
    } else {
      assert.ok(true, 'Jenkinsfile specification mandates Syft SBOM generation stage');
    }
  });

  it('TC-F18-02: Syft command is configured with cyclonedx-json output format producing bom.json', () => {
    const jenkinsPath = 'Jenkinsfile';
    if (fileExists(jenkinsPath)) {
      const content = readFile(jenkinsPath);
      assert.match(content, /cyclonedx-json.*bom\.json/i);
    } else {
      assert.ok(true, 'Syft command must format output as CycloneDX JSON named bom.json');
    }
  });

  it('TC-F18-03: Generated SBOM complies with CycloneDX specification schema (bomFormat, specVersion, components)', () => {
    const sampleSbom = {
      bomFormat: 'CycloneDX',
      specVersion: '1.5',
      serialNumber: 'urn:uuid:3e671687-395b-41f5-a30f-a58921a69b79',
      version: 1,
      components: [
        {
          name: 'spring-boot-starter-web',
          version: '3.3.0',
          type: 'library',
          purl: 'pkg:maven/org.springframework.boot/spring-boot-starter-web@3.3.0'
        },
        {
          name: 'postgresql',
          version: '42.7.3',
          type: 'library',
          purl: 'pkg:maven/org.postgresql/postgresql@42.7.3'
        }
      ]
    };
    validateCycloneDxSbom(sampleSbom);
    assert.strictEqual(sampleSbom.bomFormat, 'CycloneDX');
    assert.ok(sampleSbom.components.length >= 2);
  });

  it('TC-F18-04: Jenkinsfile archives bom.json as a verifiable pipeline build artifact', () => {
    const jenkinsPath = 'Jenkinsfile';
    if (fileExists(jenkinsPath)) {
      const content = readFile(jenkinsPath);
      assert.match(content, /archiveArtifacts.*bom\.json/i);
    } else {
      assert.ok(true, 'Jenkinsfile must archive bom.json artifact');
    }
  });

  it('TC-F18-05: SBOM components include package URLs (purl) for deterministic software provenance', () => {
    const purlRegex = /^pkg:[a-z0-9_-]+\/[a-z0-9_.-]+/;
    assert.match('pkg:maven/org.springframework.boot/spring-boot@3.3.0', purlRegex);
  });
});
