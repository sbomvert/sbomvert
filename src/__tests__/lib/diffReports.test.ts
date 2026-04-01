let fc: any;
try {
  fc = require('fast-check');
} catch (e) {
  test('fast-check not installed, skipping property‑based tests', () => {});
}

if (fc) {
  // Generate minimal SBOMs for property‑based testing
  const sbomArb = fc.record({
    tool: fc.string(),
    toolInfo: fc.record({ name: fc.string() }),
    imageId: fc.string(),
    packages: fc.array(
      fc.record({
        name: fc.string(),
        version: fc.string(),
        packageType: fc.string(),
        supplier: fc.oneof(fc.string(), fc.constant(undefined)),
        license: fc.oneof(fc.string(), fc.constant(undefined)),
        hash: fc.oneof(fc.string(), fc.constant(undefined)),
        purl: fc.oneof(fc.string(), fc.constant(undefined)),
        cpe: fc.oneof(fc.string(), fc.constant(undefined)),
      })
    ),
  });

  test('compareMultipleTools is deterministic for identical inputs', () => {
    fc.assert(
      fc.property(fc.array(sbomArb, { minLength: 1, maxLength: 3 }), (sboms) => {
        const result1 = compareMultipleTools(sboms as unknown as ISbom[]);
        const result2 = compareMultipleTools(sboms as unknown as ISbom[]);
        expect(result1).toEqual(result2);
      })
    );
  });
}
