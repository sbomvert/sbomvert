import { composeStories } from '@storybook/react';
import { render } from '@testing-library/react';
import * as Stories from './Button.stories';

const { Primary } = composeStories(Stories);

test('renders without crashing', () => {
  const { container } = render(<Primary />);
  expect(container).toBeInTheDocument();
});
