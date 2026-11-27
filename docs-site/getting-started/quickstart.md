---
title: Quickstart
description: Run SBOMVert with the sample dataset and see your first SBOM comparison in a few minutes, or translate an SBOM by pasting it.
---

# Quickstart

This page gets you to a first result as fast as possible. There are two paths:

- **Path A: compare tools** with the sample dataset. Needs a copy of the repository and Node.js.
- **Path B: analyze or translate one SBOM** by pasting it. Needs a running SBOMVert but no dataset.

For other ways to install SBOMVert (from source or Helm), see [Installation](/getting-started/installation).

## Path A: compare tools with the sample dataset

### 1. Download the sample dataset

Download the archive from [box.roc.cnam.fr](https://box.roc.cnam.fr/index.php/s/XQRa9dXz7bpWGRf) and extract it into a new folder:

```bash
mkdir sbomvert-data
unzip <downloaded-archive>.zip -d sbomvert-data
ls sbomvert-data
```

**Expected result:** an `sbom/` folder and a `cve/` folder. Each holds one sub-folder per container image, and each image folder holds one JSON file per tool and format. The layout looks like this (which tools are present varies per image):

```text
sbomvert-data/
├── sbom/
│   └── alpinetwodots3.20/
│       ├── syft.spdx.json
│       ├── syft.cdx.json
│       └── trivy.spdx.json
└── cve/
    └── alpinetwodots3.20/
        ├── grype.spdx.json
        └── trivy.spdx.json
```

Image names are encoded in folder names: `:` is written `twodots` and `/` is written `slash`, so `alpinetwodots3.20` is `alpine:3.20`.

::: tip
If the archive extracts into an extra top-level folder, use the `sbom/` and `cve/` folders inside it in the next step.
:::

### 2. Start the app with your data

Point SBOMVert at the two folders. Put these settings in `.env.local` at the root of the repository, using absolute paths:

```bash
ARTIFACT_BACKEND_TYPE=local
SBOM_DIR=/absolute/path/to/sbomvert-data/sbom
CVE_DIR=/absolute/path/to/sbomvert-data/cve
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

Then start the development server from the repository root:

```bash
npm run dev
```

What the settings do:

- `ARTIFACT_BACKEND_TYPE=local` reads reports from local folders instead of S3.
- `SBOM_DIR` and `CVE_DIR` point at the folders you extracted. Set `CVE_DIR` explicitly: its default is `./public/cves`, not `./public/cve`.
- `NEXT_PUBLIC_BASE_URL` is the address the server uses to fetch a stored SBOM when you open it on the SBOM Analysis page.

**Expected result:** the server logs show the app listening on port 3000.

### 3. Open the comparison page

Open [http://localhost:3000/compare](http://localhost:3000/compare).

**Expected result:** a **Compare artifacts** page with a **Select Comparison Type** section, a search bar and one card per image. Each card shows how many SBOMs and CVE reports are available. Cards with fewer than two SBOMs are greyed out with "(minimum 2 required)".

### 4. Compare the SBOMs of one image

1. Make sure **SBOM Comparison** is selected.
2. Click an image card that is not greyed out.

**Expected result:** the **SBOM Comparison** page for that image, with one card per tool, a strip with **Total packages**, **Packages with conflicts** and **Common packages**, and charts of package distribution and similarity between tools.

### 5. Compare the CVE reports

Click **CVE Comparison** in the sidebar, then click the same image.

**Expected result:** the **CVE Comparison** page, with one stat card per scanner and the number of vulnerable packages that only one scanner reported.

The [first comparison tutorial](/getting-started/first-comparison) explains what each part of these pages means.

::: warning Where data is written
Reports stay in the folders you point to. If you enable uploads, uploaded SBOMs are written to `SBOM_DIR` on your machine.
:::

## Path B: analyze or translate one SBOM by pasting it

You do not need a dataset, or an installation, to look at a single SBOM: use the hosted static build at [sbomvert.jackops.dev](https://sbomvert.jackops.dev). The steps below link to it. To run it yourself instead, start SBOMVert as described in [Installation](/getting-started/installation) and replace `https://sbomvert.jackops.dev` with `http://localhost:3000`.

### Translate an SBOM

1. Open [sbomvert.jackops.dev/translate](https://sbomvert.jackops.dev/translate/). **Paste JSON** is selected.
2. Paste an SPDX or CycloneDX JSON SBOM into the **SBOM** box.
   **Expected result:** the **From** field fills in with the tool that made the SBOM, with the note "Tool detected". If the tool is not detected, choose it yourself.
3. Choose a target in **Translate to**, for example `Trivy · CycloneDX`.
4. Click **Translate**.
   **Expected result:** the translated SBOM appears in the **Translation** box, with a **Copy** button.

### Analyze an SBOM

1. Open [sbomvert.jackops.dev/compare/analyze](https://sbomvert.jackops.dev/compare/analyze/) and click **Load SBOM**.
2. Fill in **SBOM Name** and **Container Name**, keep **Paste JSON**, and paste the SBOM.
   **Expected result:** the form shows the detected **Format**, **Tool** and **Vendor**.
3. Click **Load SBOM**.
   **Expected result:** a page with the SBOM's tool, format, creation date and package count, license and package-type charts, and a searchable package table. Click a package to open its details.

The SBOM is parsed in your browser and is not uploaded anywhere.

## Related

- [Tutorial: your first comparison](/getting-started/first-comparison)
- [Installation](/getting-started/installation)
- [Translate an SBOM](/guides/translate-sbom)
- [Analyze an SBOM](/guides/analyze-sbom)
