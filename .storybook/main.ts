import type { StorybookConfig } from '@storybook/react-vite';
import path from 'path';

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(js|jsx|ts|tsx)', '../src/**/*.mdx'],
  addons: [
    '@storybook/addon-links',
    '@storybook/addon-essentials',
    '@storybook/addon-interactions',
  ],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  docs: {
    autodocs: 'tag',
  },
  async viteFinal(config) {
    config.resolve = {
      ...config.resolve,
      alias: {
        ...((config.resolve?.alias as Record<string, string>) ?? {}),
        '@': path.resolve(__dirname, '../src'),
        'next/navigation': path.resolve(__dirname, 'mocks/next-navigation.ts'),
        'next/image': path.resolve(__dirname, 'mocks/next-image.tsx'),
      },
    };
    // feature flags read process.env, which only Next fills in: show the flagged UI
    config.define = {
      ...config.define,
      'process.env': JSON.stringify({ NEXT_PUBLIC_CVE_MAPPING_ENABLED: 'true', NEXT_PUBLIC_ENABLE_SBOM_UPLOAD: 'true' }),
    };
    return config;
  },
};

export default config;