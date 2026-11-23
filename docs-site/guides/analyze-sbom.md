---
title: Analyze an SBOM
description: Open a stored SBOM or load your own SPDX or CycloneDX file in SBOMVert's SBOM Analysis page and browse its packages, licenses and metadata.
---

# Analyze an SBOM

The **SBOM Analysis** page shows the content of a single SBOM: who made it, how many packages it lists, what licenses and package types they have, and every package's metadata. Use it to inspect an SBOM before you compare or translate it.

It reads SPDX and CycloneDX SBOMs in JSON. To analyze your own SBOM without installing anything, use [sbomvert.jackops.dev/compare/analyze](https://sbomvert.jackops.dev/compare/analyze/).

## Ways to open an SBOM

| Option | Where | Needs a server |
| --- | --- | --- |
| A stored SBOM | `/compare/analyze`, pick an image and a file | Yes |
| Load from your computer or paste JSON | **Load SBOM** button on `/compare/analyze` | No; the SBOM is parsed in your browser |
| Static build | `/compare/analyze` in the [static build](/guides/static-build) | No server at all |

### Open a stored SBOM

1. Click **SBOM Analysis** in the sidebar.
   **Expected result:** the **Analyze SBOM** page lists one row per stored image, with the number of SBOMs available.
2. Type in **Filter artifacts…** to narrow the list.
3. Click an image row.
   **Expected result:** a list of its SBOM files, labelled by tool and format, for example `syft · SPDX`.
4. Click a file.
   **Expected result:** the analysis page for that SBOM, at `/compare/analyze/<image>/<file>`, for example `/compare/analyze/alpinetwodots3.20/syft.spdx.json`.

The server loads the stored file through its own API at `NEXT_PUBLIC_BASE_URL`. If that variable is not set to the app's address, the page fails to load. See [Environment variables](https://github.com/sbomvert/sbomvert#environment-variables).

### Load an SBOM from your computer, or paste it

1. On `/compare/analyze`, click **Load SBOM**.
2. Fill in **SBOM Name** and **Container Name** (for example `alpine:3.24`). Both are required; they are only used as the page's title and subtitle.
3. Choose the source:
   - **Paste JSON** (selected first): paste the SBOM into **SBOM (JSON)**.
   - **File from my computer**: choose a JSON file.
4. Check what the form detected:
   - **Format**, for example `SPDX 2.3` or `CycloneDX 1.6`.
   - **Tool**, read from the SBOM's creators (SPDX) or tools (CycloneDX). If it shows "Not detected: enter it", type the tool name; it is required.
   - **Vendor**, or "Not stated".
5. Click **Load SBOM**.
   **Expected result:** the analysis page at `/compare/analyze/local`.

If the input is not valid JSON, the form says "Not valid JSON"; if it is JSON but neither SPDX nor CycloneDX, "Not an SPDX or CycloneDX SBOM".

The loaded SBOM is kept in the browser's memory only. It is not sent to the server and is not added to the stored SBOMs. Reloading `/compare/analyze/local` sends you back to `/compare/analyze`. To add an SBOM to the stored dataset, use [Upload SBOM](/guides/add-reports#upload-an-sbom-in-the-app).

::: tip In the static build
The static build has no stored SBOMs, so `/compare/analyze` shows the form directly, without the name fields. The page title becomes the subject the SBOM declares (its CycloneDX `metadata.component`, or the SPDX document name), or "Local SBOM".
:::

## What the analysis page shows

### SBOM information

Four cards at the top:

- **Tool & Version**: the generator and its version.
- **Format**: SPDX or CycloneDX and the specification version.
- **Created**: the SBOM's creation timestamp, in your local time.
- **Packages**: the number of packages.

### Charts

- **License information**: how many packages have a **License declared**, a **License detected**, or an **Unknown License**. Hover a slice for its count.
- **Package Information**: the number of packages per package type.

If the SBOM has a document namespace (SPDX), it is shown with a copy button.

### Package table

- **Search packages…** filters by name, version, pURL or license. Press `Ctrl+K` (`⌘K` on macOS) to jump to the search box.
- The filter pills, **All** and one per package type with its count, narrow the table to one type. Click an active pill again to clear it.
- The counter shows how many packages match out of the total.
- Each row shows the name, version, type, license, supplier (or originator), and the number of files attributed to the package.

### Package details

Click a row to open a side panel with the package's details. Sections without data are hidden:

- The package description, when the SBOM has one.
- **Name**, **Version**, **Source Ref**, **Hash** and **Source**.
- **Supplier**, **Originator**, **Download**, **Homepage** and **Copyright**.
- **License**.
- **Package URL**, with a copy button.
- **CPEs**, each with a copy button, and a **Search NVD** link.
- **Layer** IDs, when the SBOM records the image layer the package came from.
- The **files** attributed to the package. Close it with the close button, by clicking outside it, or with `Esc`.

## Related

- [SBOMs, SPDX and CycloneDX](/concepts/sbom)
- [Compare SBOMs](/guides/compare-sboms)
- [Translate an SBOM](/guides/translate-sbom)
- [Static build](/guides/static-build)
