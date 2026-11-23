import { defineConfig } from 'vitepress';
import { withMermaid } from 'vitepress-plugin-mermaid';

const SITE = 'https://sbomvert.github.io/sbomvert/';

// withMermaid renders ```mermaid code blocks as diagrams
export default withMermaid(defineConfig({
  title: 'SBOMVert',
  description: 'Compare and translate SBOMs and CVE reports across tools',
  lang: 'en-US',
  base: '/sbomvert/',
  cleanUrls: true,
  // pages link to the app running locally (http://localhost:3000)
  ignoreDeadLinks: 'localhostLinks',
  lastUpdated: true,
  sitemap: { hostname: SITE },
  head: [
    ['link', { rel: 'icon', href: '/sbomvert/favicon.ico' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:site_name', content: 'SBOMVert' }],
  ],
  // per-page canonical URL and Open Graph title/description, from each page's frontmatter
  transformPageData(page) {
    const path = page.relativePath.replace(/(^|\/)index\.md$/, '$1').replace(/\.md$/, '');
    const title = page.frontmatter.title ?? page.title ?? 'SBOMVert';
    const description = page.frontmatter.description ?? page.description ?? '';
    page.frontmatter.head ??= [];
    page.frontmatter.head.push(
      ['link', { rel: 'canonical', href: SITE + path }],
      ['meta', { property: 'og:url', content: SITE + path }],
      ['meta', { property: 'og:title', content: `${title} | SBOMVert` }],
      ['meta', { property: 'og:description', content: description }],
    );
  },
  themeConfig: {
    nav: [
      { text: 'Get started', link: '/getting-started/', activeMatch: '/getting-started/' },
      { text: 'Guides', link: '/guides/compare-sboms', activeMatch: '/guides/' },
      { text: 'Concepts', link: '/concepts/sbom', activeMatch: '/concepts/' },
      { text: 'Security', link: '/security/', activeMatch: '/security/' },
    ],
    sidebar: [
      {
        text: 'Getting started',
        items: [
          { text: 'What is SBOMVert?', link: '/getting-started/' },
          { text: 'Quickstart', link: '/getting-started/quickstart' },
          { text: 'Installation', link: '/getting-started/installation' },
          { text: 'Tutorial: first comparison', link: '/getting-started/first-comparison' },
        ],
      },
      {
        text: 'Concepts',
        collapsed: false,
        items: [
          { text: 'SBOMs, SPDX and CycloneDX', link: '/concepts/sbom' },
          { text: 'Package URLs (pURL)', link: '/concepts/purl' },
          { text: 'Why tools disagree', link: '/concepts/tool-disagreement' },
          { text: 'Vulnerabilities and CVE reports', link: '/concepts/vulnerabilities' },
          { text: 'SBOM translation', link: '/concepts/translation' },
        ],
      },
      {
        text: 'Using SBOMVert',
        collapsed: false,
        items: [
          { text: 'Analyze an SBOM', link: '/guides/analyze-sbom' },
          { text: 'Compare SBOMs', link: '/guides/compare-sboms' },
          { text: 'Compare CVE reports', link: '/guides/compare-cves' },
          { text: 'Translate an SBOM', link: '/guides/translate-sbom' },
          { text: 'Add your own reports', link: '/guides/add-reports' },
        ],
      },
      {
        text: 'Scanning',
        collapsed: false,
        items: [
          { text: 'Run live scans', link: '/guides/live-scans' },
        ],
      },
      {
        text: 'Deployment and operations',
        collapsed: false,
        items: [
          { text: 'Static build', link: '/guides/static-build' },
          { text: 'S3 storage', link: '/guides/s3-storage' },
          { text: 'Kubernetes (Helm)', link: '/guides/kubernetes' },
          { text: 'Authentication and API keys', link: '/guides/authentication' },
          { text: 'Troubleshooting', link: '/guides/troubleshooting' },
        ],
      },
      {
        text: 'Architecture',
        collapsed: true,
        items: [
          { text: 'Overview', link: '/architecture/' },
          { text: 'Scan pipeline', link: '/architecture/scan-pipeline' },
          { text: 'Storage', link: '/architecture/storage' },
        ],
      },
      {
        text: 'Security',
        collapsed: true,
        items: [
          { text: 'Security model', link: '/security/' },
          { text: 'Hardening checklist', link: '/security/hardening' },
        ],
      },
    ],
    outline: { level: [2, 3], label: 'On this page' },
    editLink: {
      pattern: 'https://github.com/sbomvert/sbomvert/edit/main/docs-site/:path',
      text: 'Edit this page on GitHub',
    },
    lastUpdated: { text: 'Last updated' },
    search: {
      provider: 'local',
      options: {
        detailedView: true,
        miniSearch: {
          // typo-tolerant prefix search, so "cyclone", "validat" or "x-api" still find pages
          searchOptions: { fuzzy: 0.2, prefix: true, boost: { title: 4, text: 2, titles: 1 } },
        },
      },
    },
    socialLinks: [{ icon: 'github', link: 'https://github.com/sbomvert/sbomvert' }],
    footer: {
      message: 'Released under the Apache 2.0 License. Sponsored by NLnet.',
    },
  },
}));
