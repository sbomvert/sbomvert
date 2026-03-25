# CycloneDX Support – Design Document

**Date:** 2026-03-02

## Goal
Add full‑parity support for CycloneDX SBOM files across the entire application while keeping the existing SPDX workflow intact.

## Chosen Approach
**Approach 1 – Extend the existing SPDX‑centric pipeline** (recommended).

### 1. Data Model
* Extend `src/models/ISbom.ts` with optional CycloneDX‑specific fields (e.g., `components`, `metadata`, `dependencies`).
* Add a `format: 'spdx' | 'cyclonedx'` property to indicate the original format.

### 2. SBOM Parsing (`src/lib/parseSbom.ts`)
* **Format detection** – inspect top‑level keys (`spdxVersion` vs `bomFormat === "CycloneDX"`).
* **CycloneDX parser** – new `parseCycloneDx(json): ISbom` that maps CycloneDX structures to the normalized `ISbom` shape, re‑using the existing pURL parser.
* Unified `parseSbom(content, hint?)` returns a normalized object with `format` set.

### 3. Storage Services (`src/services/sbomStorageService/*`)
* Store raw files unchanged.
* Persist a side‑car metadata file (`<file>.meta.json`) locally or `x-amz-meta-format` on S3 containing `{ format }`.
* Service interface now includes `getSbomMetadata(id): Promise<{format:string}>`.

### 4. API Layer (`src/app/api/...`)
* Endpoints return the normalized SBOM JSON **plus** the top‑level `format` field.
* Validation schemas accept optional CycloneDX fields because they are optional in `ISbom`.

### 5. UI Components (`src/app/compare/components/`)
* Comparison tables operate on the normalized `packages` array – works for both formats.
* Display a badge/label showing the SBOM format.
* Upload form accepts CycloneDX files; on failure shows a friendly toast.

### 6. Testing Strategy
| Layer | New Tests | Adjustments |
|-------|-----------|-------------|
| Parser | Unit tests for `parseCycloneDx` with real fixtures; integration test for auto‑detection. | Update SPDX parser tests to ensure they still pass. |
| Storage | Verify metadata persistence locally and on S3; end‑to‑end upload‑retrieve test. | – |
| API | Integration tests for each endpoint returning CycloneDX data; validation of malformed files. | Update snapshots to include `format`. |
| UI | Component test for format badge; upload interaction test. | Update existing snapshots for optional `format`. |

### 7. Feature‑Flag (optional)
Guard the CycloneDX parser behind `NEXT_PUBLIC_ENABLE_CYCLONEDX` for gradual rollout. Default is enabled for full parity.

## Impact Summary
* Minimal disruption to existing code – most changes are additive and optional.
* UI and tests require only small adjustments.
* Future SBOM formats can be added later with little friction.

---
*Prepared for implementation via the `superpowers:writing-plans` skill.*
