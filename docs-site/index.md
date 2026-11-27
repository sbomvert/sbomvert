---
layout: home
title: SBOMVert documentation
description: Documentation for SBOMVert, an open-source web app that compares and translates the SBOMs and CVE reports different tools produce for the same container image.

hero:
  name: SBOMVert
  text: SBOM & CVE comparison, made visible
  tagline: Compare and translate the SBOMs and CVE reports that Syft, Trivy, Docker Scout, Amazon Inspector, OSV-Scanner, cdxgen and Grype produce for the same container image.
  actions:
    - theme: brand
      text: Get started with SBOMVert
      link: /getting-started/quickstart
    - theme: alt
      text: Try it in your browser
      link: https://sbomvert.jackops.dev
    - theme: alt
      text: What is SBOMVert?
      link: /getting-started/
    - theme: alt
      text: View on GitHub
      link: https://github.com/sbomvert/sbomvert

features:
  - title: Compare SBOMs
    details: See which packages each generator found for an image, in SPDX and CycloneDX, and where they disagree.
    link: /guides/compare-sboms
  - title: Compare CVE reports
    details: Compare the vulnerabilities Trivy, Grype and Docker Scout report for the same image, package by package.
    link: /guides/compare-cves
  - title: Translate SBOMs
    details: Rewrite an SBOM the way another tool would have written it, or convert it between SPDX and CycloneDX.
    link: /guides/translate-sbom
  - title: Runs in your browser
    details: The static build analyzes and translates SBOMs with no server. Your SBOM never leaves the browser.
    link: /guides/static-build
  - title: Live scans
    details: Generate SBOMs and CVE reports for any container image on demand, from the UI or the HTTP API.
    link: /guides/live-scans
  - title: Self-hosted
    details: Run it locally or on Kubernetes with the Helm chart. Store reports on disk or in S3.
    link: /getting-started/installation
---

## Who SBOMVert is for

SBOM generators and vulnerability scanners rarely agree. Run two of them on the same
container image and you get different package lists and different CVEs. SBOMVert shows
you where and why, so you don't have to trust a single tool blindly.

- **Security and DevSecOps engineers** deciding which scanner findings are real.
- **Supply-chain and compliance teams** who must hand over an SBOM in a specific tool's format.
- **Researchers and tool authors** measuring how generators and scanners differ
  (SBOMVert grew out of [this research](https://arxiv.org/abs/2510.05798)).

## Find your way

| I want to… | Start here |
| --- | --- |
| Try SBOMVert in five minutes | [Quickstart](/getting-started/quickstart) |
| Understand SBOMs, SPDX, CycloneDX and pURLs | [Concepts](/concepts/sbom) |
| Load my own SBOMs and CVE reports | [Add your own reports](/guides/add-reports) |
| Scan an image on demand | [Run live scans](/guides/live-scans) |
| Deploy for my team | [Kubernetes (Helm)](/guides/kubernetes) · [Hardening checklist](/security/hardening) |
| Fix an error | [Troubleshooting](/guides/troubleshooting) |
