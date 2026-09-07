import { defineConfig } from 'vitepress';

export default defineConfig({
  title: 'SBOMVert',
  description: 'SBOM and CVE comparison across Syft, Trivy, Docker Scout, and Grype',
  base: '/sbomvert/',
  cleanUrls: true,

  themeConfig: {
    nav: [{ text: 'Home', link: '/' }],
    sidebar: [
      {
        text: 'Introduction',
        items: [{ text: 'What is SBOMVert?', link: '/' }],
      },
    ],
    search: {
      provider: 'local',
    },
    socialLinks: [{ icon: 'github', link: 'https://github.com/sbomvert/sbomvert' }],
  },
});
