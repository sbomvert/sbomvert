# SBOM Tests Design (2026-04-01)

## 1️⃣ Test Scope & Placement
- **Modules**: `src/lib/sbom/purl/converter.ts` and `src/lib/sbom/spdx/parser.ts`
- **Test files**: `src/lib/sbom/purl/converter.test.ts` and `src/lib/sbom/spdx/parser.test.ts`
- **Framework**: Jest with existing `ts-jest` configuration.

## 2️⃣ Core Test Cases for `converter.ts`
| Case | Description |
|------|-------------|
| ✅ **Valid pURL conversion** | Provide a well‑formed package URL and assert the correct object fields (`type`, `namespace`, `name`, `version`, etc.). |
| ❌ **Missing fields** | Omit optional parts (e.g., no namespace) and verify defaults / graceful handling. |
| ❌ **Malformed pURL** | Pass an invalid string and expect the function to throw a specific error or return `null` (as implemented). |
| 🧪 **Edge‑case characters** | Test URL‑encoded characters, uppercase/lowercase variations, and special symbols in the name/namespace. |

## 3️⃣ Core Test Cases for `parser.ts` (SPDX)
| Case | Description |
|------|-------------|
| ✅ **Full SPDX document** | Load a small, realistic SPDX JSON fixture (valid `spdxVersion`, `packages`, `relationships`, etc.) and assert that the parser returns the expected `ISbom` structure. |
| ❌ **Missing required fields** | Remove `spdxVersion` or `packages` from the fixture and verify that the parser throws / returns an error. |
| ❌ **Empty packages array** | Ensure the parser handles an empty `packages` list without crashing. |
| 🧪 **Extra unknown fields** | Include unknown top‑level keys and confirm they are ignored (or cause a controlled warning). |
| 🧪 **Version differences** | Provide a fixture with an older SPDX version to verify compatibility handling. |

## 4️⃣ Fixtures & Helpers
- Store JSON fixtures under `test/fixtures/spdx/` and `test/fixtures/purl/`.
- Helper `loadJsonFixture` reads a fixture file (via `fs.readFileSync` or direct import) and returns parsed JSON.
- Keep each fixture minimal but representative; aim for < 200 lines.

## 5️⃣ Test Utilities & Setup
- Leverage the existing Jest config – no additional configuration required.
- Add a `beforeEach` that clears any module cache if needed (unlikely for pure functions).
- Ensure `npm test` runs all existing tests plus the new ones without a noticeable slowdown.

## 6️⃣ Documentation & Commit
- This design spec is saved at `docs/superpowers/specs/2026-04-01-sbom-tests-design.md`.
- Once approved, the file will be committed with a concise message and the required Co‑Authored‑By line.
