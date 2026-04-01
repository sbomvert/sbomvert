let fc: any;
try {
  fc = require('fast-check');
} catch (e) {
  test('fast-check not installed, skipping property‑based tests', () => {});
}

if (fc) {
  test('parseSbom is idempotent for generated JSON objects', () => {
    fc.assert(
      fc.property(fc.jsonObject(), (obj) => {
        const json = JSON.stringify(obj);
        const parsed = parseSbom(json);
        const roundTrip = JSON.stringify(parsed);
        expect(roundTrip).toBe(json);
      })
    );
  });
}
