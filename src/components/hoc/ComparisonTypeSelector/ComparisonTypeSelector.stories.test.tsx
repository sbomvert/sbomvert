import { composeStories } from '@storybook/react';
import { render } from '@testing-library/react';
import * as Stories from './ComparisonTypeSelector.stories';

const { SBOMSelected } = composeStories(Stories);

test('renders without crashing', () => {
  const { container } = render(<SBOMSelected />);
  expect(container).toBeInTheDocument();
});
