import { composeStories } from '@storybook/react';
import { render } from '@testing-library/react';
import * as Stories from './ToolSelector.stories';

const { AllSelected } = composeStories(Stories);

test('renders without crashing', () => {
  const { container } = render(<AllSelected />);
  expect(container).toBeInTheDocument();
});
