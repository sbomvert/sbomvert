const { getJestConfig } = require('@storybook/test-runner');

module.exports = {
  ...getJestConfig(),
  reporters: [
    'default',
  ],
};
