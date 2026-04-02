import { composeStories } from '@storybook/react';
import { render } from '@testing-library/react';
import * as Stories from './ContactModal.stories';

const { Open } = composeStories(Stories);

test('renders without crashing', () => {
  const { container } = render(<Open />);
  expect(container).toBeInTheDocument();
});
