import type { StorybookConfig } from '@storybook/nextjs';

const config: StorybookConfig = {
  stories: ['../stories/**/*.mdx', '../stories/**/*.stories.@(js|jsx|ts|tsx)'],
  addons: [
    '@storybook/addon-links',
    '@storybook/addon-essentials',
    '@storybook/addon-interactions',
  ],
  framework: {
    name: '@storybook/nextjs',
    options: {},
  },
  docs: {
    autodocs: 'tag',
  },
  core: {
    builder: 'webpack5',
  },
  webpackFinal: async baseConfig => {
    // Remove ReactRefreshWebpackPlugin or other problematic plugin
    if (baseConfig.plugins) {
      baseConfig.plugins = baseConfig.plugins.filter(
        plugin => plugin.constructor.name !== 'ReactRefreshWebpackPlugin'
      );
    }

    // (Optional) You may also guard other plugin hooks if identified
    return baseConfig;
  },
};

export default config;
