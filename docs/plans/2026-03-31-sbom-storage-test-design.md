# SBOM Storage Service Test Design (Hybrid Approach)

**Date:** 2026-03-31

## Goal
Increase overall test coverage of the SBOM storage services to **≈ 80 %** while ensuring realistic execution of file‑system code and safe mocking of S3 interactions.

## Scope
- `src/services/sbomStorageService/localSbomService.ts`
- `src/services/sbomStorageService/sbomServiceS3.ts`
- `src/services/sbomStorageService/sbomStorageService.ts` (service selector)

## Testing Strategy (Hybrid)
1. **Local File‑System Service**
   - Create a temporary directory for each test (using `fs.mkdtempSync`).
   - Populate it with a realistic hierarchy of container folders and JSON SBOM files.
   - Run the service against this real directory to verify:
     - Directory creation \u0026 existence checks.
     - Pagination logic (`listSboms`).
     - File listing per container (`listFiles`).
     - Content retrieval (`getFileContent`).
     - Error handling for missing containers/files.
   - Clean up the temporary directory after each test.
2. **S3 Service**
   - Use **`aws-sdk-client-mock`** to stub S3 client commands (`ListObjectsV2Command`, `GetObjectCommand`, `PutObjectCommand`).
   - Define mock responses that mimic realistic bucket structures, pagination, and error scenarios.
   - Test the same public methods as the local service, focusing on:
     - Correct construction of S3 keys/prefixes.
     - Proper handling of pagination and filtering.
     - Error handling when S3 returns failures.
3. **Service Selector (`sbomStorageService.ts`)**
   - Verify that the correct implementation is instantiated based on `NODE_ENV`.
   - Mock `process.env` values to force each branch.

## Test Layout
```
src/__tests__/services/
├─ localSbomService.test.ts      # hybrid tests for LocalSbomService
├─ sbomServiceS3.test.ts        # mocked S3 tests for S3SbomService
├─ sbomStorageService.test.ts   # selector tests
```

## Required Dev Dependencies
- `jest`, `ts-jest`, `@types/jest`
- `mock-fs` – for in‑memory filesystem mocking (used only for edge‑case unit tests, not the main hybrid tests).
- `aws-sdk-client-mock` – to mock AWS SDK v3 commands.
- `tmp` or Node’s `fs.mkdtempSync` for temporary directories.

## CI Integration
- Ensure the test command `npm test` runs the new suites.
- No external services required; all tests run in isolation.

## Acceptance Criteria
- Overall coverage for the three service files ≥ 80 % (branches ≥ 70 %).
- All new tests pass locally and in CI.
- No test introduces flaky behavior (e.g., leftover temp files).

---
*Generated with Claude Code*