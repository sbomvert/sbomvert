import { composeStories } from '@storybook/react';
import { render } from '@testing-library/react';
import * as Stories from './CardHeader.stories';

const { Default } = composeStories(Stories);

test('renders without crashing', () => {
  const { container } = render(<Default />);
  expect(container).toBeInTheDocument();
});
